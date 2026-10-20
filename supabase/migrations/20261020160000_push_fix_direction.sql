-- =============================================================================
-- Web Push Notifications — correção da direção da mensagem
--
-- Neste sistema, chat_messages.direction = 'outbound' é a mensagem VINDA DO
-- CLIENTE e 'inbound' é a enviada pela loja (ver isConversationUnread em
-- crm/src/utils/chatConversationGroups.ts). A trigger criada em
-- 20261020130000_push_triggers.sql filtrava 'inbound' (invertido).
-- =============================================================================

drop trigger if exists trg_notify_mensagem_recebida on public.chat_messages;
create trigger trg_notify_mensagem_recebida
  after insert on public.chat_messages
  for each row
  when (new.direction = 'outbound')
  execute function public.notify_mensagem_recebida();

comment on function public.notify_mensagem_recebida() is
  'Push de mensagem do cliente (chat_messages.direction = ''outbound'' neste sistema).';
