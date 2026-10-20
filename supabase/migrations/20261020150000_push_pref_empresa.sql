-- =============================================================================
-- Web Push Notifications — preferência por empresa ("a empresa manda")
--
-- Requer 20261020120000_push_notifications.sql.
-- O admin define, por tipo editável, se a loja inteira recebe ou não.
-- Resolução em criar_notificacao():
--   tipo não editável           → ativo_padrao (ex.: lead_novo, sempre ativo)
--   linha da empresa existe     → valor da empresa (vale para todos)
--   senão, preferência usuário  → valor do usuário
--   senão                       → ativo_padrao
-- =============================================================================

create table if not exists public.notificacao_pref_empresa (
  empresa_id uuid not null references public.empresas on delete cascade,
  tipo text not null references public.notificacao_tipos on delete cascade,
  ativo boolean not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null,
  primary key (empresa_id, tipo)
);

alter table public.notificacao_pref_empresa enable row level security;

-- Todos da empresa podem ler (a tela mostra o que vale para a loja).
drop policy if exists notificacao_pref_empresa_select on public.notificacao_pref_empresa;
create policy notificacao_pref_empresa_select on public.notificacao_pref_empresa
  for select to authenticated
  using (empresa_id = public.get_user_empresa_id());

-- Só admins da própria empresa escrevem, e só tipos editáveis.
drop policy if exists notificacao_pref_empresa_write on public.notificacao_pref_empresa;
create policy notificacao_pref_empresa_write on public.notificacao_pref_empresa
  for all to authenticated
  using (public.is_admin_company(empresa_id))
  with check (
    public.is_admin_company(empresa_id)
    and exists (
      select 1 from public.notificacao_tipos t
      where t.tipo = notificacao_pref_empresa.tipo and t.editavel_usuario
    )
  );

revoke all on public.notificacao_pref_empresa from anon, authenticated;
grant select, insert, update, delete on public.notificacao_pref_empresa to authenticated;

-- -----------------------------------------------------------------------------
-- criar_notificacao: passo 2 passa a considerar a preferência da empresa
-- -----------------------------------------------------------------------------
create or replace function public.criar_notificacao(
  p_empresa_id uuid,
  p_user_id uuid,
  p_tipo text,
  p_titulo text,
  p_corpo text,
  p_url text,
  p_ref_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ativo boolean;
  v_existente uuid;
begin
  -- 1. Destinatário precisa pertencer à empresa e a empresa estar ativa.
  if not exists (
    select 1
    from public.profiles p
    join public.empresas e on e.id = p.empresa_id
    where p.uuid = p_user_id
      and p.empresa_id = p_empresa_id
      and e.ativo
  ) then
    return;
  end if;

  -- 2. Tipo fixo → padrão; senão empresa > usuário > padrão.
  select case
           when not t.editavel_usuario then t.ativo_padrao
           else coalesce(pe.ativo, pu.ativo, t.ativo_padrao)
         end
    into v_ativo
  from public.notificacao_tipos t
  left join public.notificacao_pref_empresa pe
    on pe.empresa_id = p_empresa_id and pe.tipo = t.tipo
  left join public.notificacao_pref_usuario pu
    on pu.user_id = p_user_id and pu.tipo = t.tipo
  where t.tipo = p_tipo;

  if not coalesce(v_ativo, false) then
    return;
  end if;

  -- 3. Anti-spam: mensagens do mesmo lead em < 5 min atualizam a não lida (sem novo push).
  if p_tipo = 'mensagem' and p_ref_id is not null then
    select n.id into v_existente
    from public.notificacoes n
    where n.user_id = p_user_id
      and n.tipo = p_tipo
      and n.ref_id = p_ref_id
      and n.lida_em is null
      and n.created_at > now() - interval '5 minutes'
    order by n.created_at desc
    limit 1;

    if v_existente is not null then
      update public.notificacoes
         set corpo = p_corpo,
             created_at = now()
       where id = v_existente;
      return;
    end if;
  end if;

  -- 4. Nova notificação (dispara o Database Webhook de INSERT).
  insert into public.notificacoes (empresa_id, user_id, tipo, titulo, corpo, url, ref_id)
  values (p_empresa_id, p_user_id, p_tipo, p_titulo, p_corpo, p_url, p_ref_id);
end;
$$;

revoke execute on function public.criar_notificacao(uuid, uuid, text, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.criar_notificacao(uuid, uuid, text, text, text, text, uuid)
  to service_role;
