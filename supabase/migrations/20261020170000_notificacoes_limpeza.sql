-- =============================================================================
-- Notificações — limpeza automática (retenção de 30 dias)
--
-- Roda diariamente às 06:00 UTC (03:00 de Brasília) via pg_cron.
-- =============================================================================

select cron.unschedule('notificacoes_limpeza')
where exists (select 1 from cron.job where jobname = 'notificacoes_limpeza');

select cron.schedule(
  'notificacoes_limpeza',
  '0 6 * * *',
  $$delete from public.notificacoes where created_at < now() - interval '30 days'$$
);
