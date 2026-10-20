-- =============================================================================
-- Notificação de mensagem: clique abre a conversa no chat (não a página do lead).
-- ref_id continua sendo o lead (anti-spam e "lida ao abrir o lead").
-- =============================================================================

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
    v_corpo := coalesce(left(nullif(trim(new.content), ''), 120), 'Nova mensagem');
    v_url := '/chat?conversation=' || new.conversation_id;

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

revoke execute on function public.notify_mensagem_recebida() from public, anon, authenticated;
