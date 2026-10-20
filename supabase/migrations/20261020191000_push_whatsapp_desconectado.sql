-- =============================================================================
-- Notificação: WhatsApp desconectado.
-- Dispara na transição conectado (connected/open) → desconectado (disconnected/close).
-- Destinatários: gestores (is_admin) + usuários com permissão na instância.
-- Também generaliza o anti-spam de criar_notificacao (janela por tipo).
-- =============================================================================

insert into public.notificacao_tipos (tipo, nome, descricao, ativo_padrao, editavel_usuario) values
  ('whatsapp_desconectado', 'WhatsApp desconectado',
   'Quando um número de WhatsApp da empresa desconecta (gestores e quem usa o número)', true, true)
on conflict (tipo) do nothing;

-- -----------------------------------------------------------------------------
-- criar_notificacao: mesma regra, com janela de anti-spam por tipo.
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
  v_janela interval;
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

  -- 3. Anti-spam: mesma referência não lida dentro da janela atualiza a existente (sem novo push).
  v_janela := case p_tipo
                when 'mensagem' then interval '5 minutes'
                when 'whatsapp_desconectado' then interval '30 minutes'
              end;

  if v_janela is not null and p_ref_id is not null then
    select n.id into v_existente
    from public.notificacoes n
    where n.user_id = p_user_id
      and n.tipo = p_tipo
      and n.ref_id = p_ref_id
      and n.lida_em is null
      and n.created_at > now() - v_janela
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

-- -----------------------------------------------------------------------------
-- Trigger
-- -----------------------------------------------------------------------------
create or replace function public.notify_whatsapp_desconectado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_corpo text;
  r record;
begin
  begin
    -- Único ponto de montagem do corpo.
    v_corpo := coalesce(nullif(trim(new.display_name), ''), new.name)
      || coalesce(' (' || nullif(trim(new.phone_number), '') || ')', '')
      || ' desconectou. Reconecte para não perder mensagens.';

    for r in
      select p.uuid as user_id, bool_or(p.is_admin) as is_admin
      from public.profiles p
      where p.empresa_id = new.empresa_id
        and (
          p.is_admin
          or exists (
            select 1 from public.user_instance_permissions uip
            where uip.instance_id = new.id
              and uip.user_id = p.uuid
              and uip.granted
          )
        )
      group by p.uuid
    loop
      perform public.criar_notificacao(
        new.empresa_id, r.user_id, 'whatsapp_desconectado', 'WhatsApp desconectado', v_corpo,
        case when r.is_admin then '/admin?tab=whatsapps' else '/chat' end,
        new.id
      );
    end loop;
  exception when others then
    raise warning 'notify_whatsapp_desconectado falhou (instância %): %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists trg_notify_whatsapp_desconectado on public.whatsapp_instances;
create trigger trg_notify_whatsapp_desconectado
  after update of status on public.whatsapp_instances
  for each row
  when (old.status in ('connected', 'open') and new.status in ('disconnected', 'close'))
  execute function public.notify_whatsapp_desconectado();

revoke execute on function public.notify_whatsapp_desconectado() from public, anon, authenticated;
