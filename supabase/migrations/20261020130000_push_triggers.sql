-- =============================================================================
-- Web Push Notifications — gatilhos de negócio (MVP: lead_novo e mensagem)
--
-- Requer 20261020120000_push_notifications.sql.
-- As funções só chamam criar_notificacao(); destinatário é resolvido aqui.
-- Falhas de notificação NUNCA podem abortar o INSERT/UPDATE de negócio
-- (ex.: mensagens gravadas pelo n8n), por isso cada chamada é isolada.
--
-- Remoção de usuário (delete_empresa_user) apaga de auth.users e o
-- ON DELETE CASCADE de push_subscriptions.user_id limpa as inscrições.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- lead_novo: lead atribuído (INSERT com responsável ou troca de responsável)
-- -----------------------------------------------------------------------------
create or replace function public.notify_lead_atribuido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.criar_notificacao(
      new.empresa_id,
      new.responsible_uuid,
      'lead_novo',
      'Novo lead atribuído',
      coalesce(nullif(trim(new.name), ''), 'Lead sem nome'),
      '/leads/' || new.id,
      new.id
    );
  exception when others then
    raise warning 'notify_lead_atribuido falhou (lead %): %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists trg_notify_lead_atribuido_insert on public.leads;
create trigger trg_notify_lead_atribuido_insert
  after insert on public.leads
  for each row
  when (new.responsible_uuid is not null)
  execute function public.notify_lead_atribuido();

drop trigger if exists trg_notify_lead_atribuido_update on public.leads;
create trigger trg_notify_lead_atribuido_update
  after update of responsible_uuid on public.leads
  for each row
  when (new.responsible_uuid is not null and new.responsible_uuid is distinct from old.responsible_uuid)
  execute function public.notify_lead_atribuido();

-- -----------------------------------------------------------------------------
-- mensagem: mensagem recebida do cliente (direction = 'inbound')
-- Destinatário: responsável do lead; sem responsável → admins da empresa.
-- Conversas sem lead são ignoradas.
-- -----------------------------------------------------------------------------
create or replace function public.notify_mensagem_recebida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead record;
  v_titulo text;
  v_corpo text;
  v_url text;
  v_destinatario uuid;
begin
  begin
    select l.id, l.empresa_id, l.responsible_uuid, l.name
      into v_lead
    from public.chat_conversations c
    join public.leads l on l.id = c.lead_id
    where c.id = new.conversation_id;

    if v_lead.id is null then
      return null;
    end if;

    v_titulo := coalesce(nullif(trim(v_lead.name), ''), 'Lead') || ' enviou uma mensagem';
    -- Único ponto de montagem do corpo (prévia na tela de bloqueio).
    -- Futuro: opção por empresa de "ocultar conteúdo" entra aqui.
    v_corpo := coalesce(left(nullif(trim(new.content), ''), 120), 'Nova mensagem');
    v_url := '/leads/' || v_lead.id;

    if v_lead.responsible_uuid is not null then
      perform public.criar_notificacao(
        v_lead.empresa_id, v_lead.responsible_uuid, 'mensagem', v_titulo, v_corpo, v_url, v_lead.id
      );
    else
      for v_destinatario in
        select p.uuid
        from public.profiles p
        where p.empresa_id = v_lead.empresa_id
          and p.is_admin
      loop
        perform public.criar_notificacao(
          v_lead.empresa_id, v_destinatario, 'mensagem', v_titulo, v_corpo, v_url, v_lead.id
        );
      end loop;
    end if;
  exception when others then
    raise warning 'notify_mensagem_recebida falhou (mensagem %): %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists trg_notify_mensagem_recebida on public.chat_messages;
create trigger trg_notify_mensagem_recebida
  after insert on public.chat_messages
  for each row
  when (new.direction = 'inbound')
  execute function public.notify_mensagem_recebida();

-- Funções de trigger não devem ser chamadas diretamente pelo client.
revoke execute on function public.notify_lead_atribuido() from public, anon, authenticated;
revoke execute on function public.notify_mensagem_recebida() from public, anon, authenticated;
