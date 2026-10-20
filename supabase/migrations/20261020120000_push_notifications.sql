-- =============================================================================
-- Web Push Notifications — schema base
--
-- Fluxo: evento de negócio → criar_notificacao() → INSERT em notificacoes
--        → Database Webhook (INSERT) → api_crm /internal/push/dispatch.
--
-- Nada faz INSERT direto em notificacoes: tudo passa por criar_notificacao().
--
-- Fase futura (NÃO implementada): tabela notificacao_pref_empresa para o gestor
-- desligar tipos para a loja inteira. Quando existir, entra como passo extra
-- dentro de criar_notificacao(), antes da preferência do usuário.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Catálogo fixo de tipos
-- -----------------------------------------------------------------------------
create table if not exists public.notificacao_tipos (
  tipo text primary key,
  nome text not null,
  descricao text,
  ativo_padrao boolean not null default true,
  editavel_usuario boolean not null default true
);

alter table public.notificacao_tipos enable row level security;

drop policy if exists notificacao_tipos_select on public.notificacao_tipos;
create policy notificacao_tipos_select on public.notificacao_tipos
  for select to authenticated using (true);

revoke all on public.notificacao_tipos from anon, authenticated;
grant select on public.notificacao_tipos to authenticated;

insert into public.notificacao_tipos (tipo, nome, descricao, ativo_padrao, editavel_usuario) values
  ('lead_novo',      'Lead atribuído a mim',     'Quando um lead passa a ser seu',                  true,  false),
  ('mensagem',       'Mensagem de lead',         'Quando um lead seu envia mensagem no WhatsApp',   true,  true),
  ('lead_parado',    'Lead sem contato',         'Lembrete de leads sem contato recente',           true,  true),
  ('etapa_alterada', 'Mudança de etapa',         'Quando um lead seu muda de etapa',                false, true),
  ('venda_fechada',  'Venda fechada (gestores)', 'Quando uma venda é fechada na loja',              true,  true)
on conflict (tipo) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  ativo_padrao = excluded.ativo_padrao,
  editavel_usuario = excluded.editavel_usuario;

-- -----------------------------------------------------------------------------
-- Preferência por usuário (só existe linha quando o usuário altera o padrão)
-- -----------------------------------------------------------------------------
create table if not exists public.notificacao_pref_usuario (
  user_id uuid not null references auth.users on delete cascade,
  tipo text not null references public.notificacao_tipos on delete cascade,
  ativo boolean not null,
  primary key (user_id, tipo)
);

alter table public.notificacao_pref_usuario enable row level security;

drop policy if exists notificacao_pref_usuario_own on public.notificacao_pref_usuario;
create policy notificacao_pref_usuario_own on public.notificacao_pref_usuario
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.notificacao_pref_usuario from anon, authenticated;
grant select, insert, update, delete on public.notificacao_pref_usuario to authenticated;

-- -----------------------------------------------------------------------------
-- Inscrições de push (uma por aparelho/navegador)
-- -----------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  empresa_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

-- empresa_id precisa ser a do próprio perfil: o client não escolhe o tenant.
drop policy if exists push_subscriptions_insert on public.push_subscriptions;
create policy push_subscriptions_insert on public.push_subscriptions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and empresa_id = (select p.empresa_id from public.profiles p where p.uuid = auth.uid())
  );

-- Necessária para o upsert (INSERT ... ON CONFLICT (endpoint) DO UPDATE).
drop policy if exists push_subscriptions_update on public.push_subscriptions;
create policy push_subscriptions_update on public.push_subscriptions
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and empresa_id = (select p.empresa_id from public.profiles p where p.uuid = auth.uid())
  );

drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- -----------------------------------------------------------------------------
-- Notificações (1 linha por destinatário)
-- -----------------------------------------------------------------------------
create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  user_id uuid not null references auth.users on delete cascade,
  tipo text not null references public.notificacao_tipos,
  titulo text not null,
  corpo text,
  url text,
  ref_id uuid,
  lida_em timestamptz,
  enviada_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notificacoes_nao_lidas
  on public.notificacoes (user_id, created_at desc) where lida_em is null;

create index if not exists idx_notificacoes_antispam
  on public.notificacoes (user_id, tipo, ref_id) where lida_em is null;

alter table public.notificacoes enable row level security;

drop policy if exists notificacoes_select on public.notificacoes;
create policy notificacoes_select on public.notificacoes
  for select to authenticated using (user_id = auth.uid());

drop policy if exists notificacoes_update on public.notificacoes;
create policy notificacoes_update on public.notificacoes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Sem INSERT/DELETE pelo client; UPDATE só da coluna lida_em.
revoke all on public.notificacoes from anon, authenticated;
grant select on public.notificacoes to authenticated;
grant update (lida_em) on public.notificacoes to authenticated;

-- -----------------------------------------------------------------------------
-- Única porta de entrada para criar notificações
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

  -- 2. Preferência do usuário (só para tipos editáveis); senão, o padrão.
  select case
           when t.editavel_usuario then coalesce(pref.ativo, t.ativo_padrao)
           else t.ativo_padrao
         end
    into v_ativo
  from public.notificacao_tipos t
  left join public.notificacao_pref_usuario pref
    on pref.user_id = p_user_id and pref.tipo = t.tipo
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
