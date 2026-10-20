-- =============================================================================
-- Notificações de tarefas: atribuída, vencendo (1h antes) e atrasada.
--
-- Prazo efetivo (igual ao front, utils/date.ts): data de due_date (em UTC) +
-- due_time no fuso America/Sao_Paulo; sem horário = fim do dia.
-- Tarefas sem horário: "vencendo" às 08:00 do dia, "atrasada" às 08:00 do dia seguinte.
-- =============================================================================

insert into public.notificacao_tipos (tipo, nome, descricao, ativo_padrao, editavel_usuario) values
  ('tarefa_nova',      'Nova tarefa',      'Quando uma tarefa é atribuída a você por outra pessoa ou automação', true, true),
  ('tarefa_vencendo',  'Tarefa vencendo',  'Uma hora antes do prazo da tarefa',                                   true, true),
  ('tarefa_atrasada',  'Tarefa atrasada',  'Quando a tarefa passa do prazo (responsável e criador)',              true, true)
on conflict (tipo) do nothing;

-- -----------------------------------------------------------------------------
-- Controle de envio dos lembretes agendados: um envio por tarefa, tipo e prazo.
-- Reagendar muda o prazo e libera um novo aviso.
-- -----------------------------------------------------------------------------
create table if not exists public.notificacao_tarefa_envios (
  task_id uuid not null references public.tasks(id) on delete cascade,
  tipo text not null,
  prazo timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (task_id, tipo, prazo)
);

alter table public.notificacao_tarefa_envios enable row level security;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.tarefa_data_local(p_due_date timestamptz)
returns date
language sql
immutable
as $$ select (p_due_date at time zone 'UTC')::date $$;

create or replace function public.tarefa_prazo(p_due_date timestamptz, p_due_time time)
returns timestamptz
language sql
stable
as $$
  select (public.tarefa_data_local(p_due_date) + coalesce(p_due_time, time '23:59:59'))
         at time zone 'America/Sao_Paulo'
$$;

-- Único ponto de montagem do corpo das notificações de tarefa.
create or replace function public.tarefa_notificacao_corpo(p_task public.tasks)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lead_nome text;
  v_prazo text;
begin
  if p_task.lead_id is not null then
    select nullif(trim(l.name), '') into v_lead_nome from public.leads l where l.id = p_task.lead_id;
  end if;

  if p_task.due_date is not null then
    v_prazo := 'vence ' || to_char(public.tarefa_data_local(p_task.due_date), 'DD/MM')
      || coalesce(' às ' || to_char(p_task.due_time, 'HH24:MI'), '');
  end if;

  return concat_ws(' · ', left(p_task.title, 100), v_lead_nome, v_prazo);
end;
$$;

create or replace function public.tarefa_notificacao_url(p_task public.tasks)
returns text
language sql
immutable
as $$ select case when p_task.lead_id is not null then '/leads/' || p_task.lead_id else '/tasks' end $$;

-- -----------------------------------------------------------------------------
-- tarefa_nova: atribuída por outra pessoa ou por automação (auth.uid() nulo).
-- -----------------------------------------------------------------------------
create or replace function public.notify_tarefa_atribuida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if new.assigned_to is null
       or new.status in ('concluida', 'cancelada')
       or new.assigned_to is not distinct from auth.uid() then
      return null;
    end if;

    if tg_op = 'UPDATE' and old.assigned_to is not distinct from new.assigned_to then
      return null;
    end if;

    perform public.criar_notificacao(
      new.empresa_id, new.assigned_to, 'tarefa_nova', 'Nova tarefa para você',
      public.tarefa_notificacao_corpo(new), public.tarefa_notificacao_url(new), new.id
    );
  exception when others then
    raise warning 'notify_tarefa_atribuida falhou (tarefa %): %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists trg_notify_tarefa_atribuida_insert on public.tasks;
create trigger trg_notify_tarefa_atribuida_insert
  after insert on public.tasks
  for each row
  execute function public.notify_tarefa_atribuida();

drop trigger if exists trg_notify_tarefa_atribuida_update on public.tasks;
create trigger trg_notify_tarefa_atribuida_update
  after update of assigned_to on public.tasks
  for each row
  execute function public.notify_tarefa_atribuida();

-- -----------------------------------------------------------------------------
-- tarefa_vencendo / tarefa_atrasada: job a cada 5 minutos.
-- -----------------------------------------------------------------------------
create or replace function public.processar_lembretes_tarefas()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_destinatario uuid;
  v_novo integer;
begin
  for r in
    with base as (
      select t,
             t.id,
             t.empresa_id,
             t.assigned_to,
             t.created_by,
             public.tarefa_prazo(t.due_date, t.due_time) as prazo,
             case when t.due_time is null
               then (public.tarefa_data_local(t.due_date) + time '08:00') at time zone 'America/Sao_Paulo'
               else public.tarefa_prazo(t.due_date, t.due_time) - interval '1 hour'
             end as aviso_vencendo,
             case when t.due_time is null
               then (public.tarefa_data_local(t.due_date) + 1 + time '08:00') at time zone 'America/Sao_Paulo'
               else public.tarefa_prazo(t.due_date, t.due_time)
             end as aviso_atrasada
      from public.tasks t
      where t.due_date between now() - interval '3 days' and now() + interval '2 days'
        and t.status in ('pendente', 'em_andamento', 'atrasada')
    ),
    pendentes as (
      select b.*, 'tarefa_vencendo'::text as tipo
      from base b
      where now() >= b.aviso_vencendo and now() < b.prazo
      union all
      select b.*, 'tarefa_atrasada'::text
      from base b
      where now() >= b.aviso_atrasada and now() < b.aviso_atrasada + interval '1 day'
    )
    select p.*
    from pendentes p
    where not exists (
      select 1 from public.notificacao_tarefa_envios e
      where e.task_id = p.id and e.tipo = p.tipo and e.prazo = p.prazo
    )
  loop
    begin
      insert into public.notificacao_tarefa_envios (task_id, tipo, prazo)
      values (r.id, r.tipo, r.prazo)
      on conflict do nothing;
      get diagnostics v_novo = row_count;
      continue when v_novo = 0;

      for v_destinatario in
        select distinct u
        from unnest(case when r.tipo = 'tarefa_atrasada'
                      then array[r.assigned_to, r.created_by]
                      else array[r.assigned_to] end) as u
        where u is not null
      loop
        perform public.criar_notificacao(
          r.empresa_id, v_destinatario, r.tipo,
          case when r.tipo = 'tarefa_atrasada' then 'Tarefa atrasada' else 'Tarefa vence em breve' end,
          public.tarefa_notificacao_corpo(r.t), public.tarefa_notificacao_url(r.t), r.id
        );
      end loop;
    exception when others then
      raise warning 'processar_lembretes_tarefas falhou (tarefa %): %', r.id, sqlerrm;
    end;
  end loop;

  delete from public.notificacao_tarefa_envios where created_at < now() - interval '30 days';
end;
$$;

revoke execute on function public.notify_tarefa_atribuida() from public, anon, authenticated;
revoke execute on function public.processar_lembretes_tarefas() from public, anon, authenticated;
revoke execute on function public.tarefa_notificacao_corpo(public.tasks) from public, anon, authenticated;

select cron.unschedule('notificacoes_tarefas')
where exists (select 1 from cron.job where jobname = 'notificacoes_tarefas');

select cron.schedule('notificacoes_tarefas', '*/5 * * * *', $$select public.processar_lembretes_tarefas()$$);
