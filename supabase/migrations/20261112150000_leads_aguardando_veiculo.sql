-- Lead com procura de veículo ativa fica oculto no Kanban (como perdido/vendido).
-- A flag em leads é mantida pelo banco: trigger em lead_procuras + job diário
-- para as procuras que expiram. Os triggers existentes em leads só reagem a
-- stage/responsável/sold_at/phone, então atualizar esta coluna não dispara nada.

alter table public.leads
  add column if not exists aguardando_veiculo boolean not null default false;

create index if not exists leads_aguardando_veiculo_idx
  on public.leads (empresa_id) where aguardando_veiculo;

create or replace function public.lead_recalcular_aguardando_veiculo(p_lead_id uuid)
returns void
language sql
security definer
set search_path to 'public'
as $$
  update public.leads l
     set aguardando_veiculo = s.aguardando
    from (
      select exists (
        select 1 from public.lead_procuras lp
        where lp.lead_id = p_lead_id
          and lp.status = 'ativa'
          and lp.expira_em >= current_date
      ) as aguardando
    ) s
   where l.id = p_lead_id
     and l.aguardando_veiculo is distinct from s.aguardando
$$;

revoke all on function public.lead_recalcular_aguardando_veiculo(uuid) from public, anon, authenticated;

create or replace function public.tg_lead_procuras_aguardando()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.lead_recalcular_aguardando_veiculo(new.lead_id);
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.lead_id is distinct from new.lead_id) then
    perform public.lead_recalcular_aguardando_veiculo(old.lead_id);
  end if;
  return null;
end;
$$;

drop trigger if exists lead_procuras_aguardando on public.lead_procuras;
create trigger lead_procuras_aguardando
  after insert or update of status, expira_em, lead_id or delete on public.lead_procuras
  for each row execute function public.tg_lead_procuras_aguardando();

-- Procuras que venceram: o lead volta a aparecer no Kanban.
create or replace function public.leads_liberar_procuras_expiradas()
returns integer
language sql
security definer
set search_path to 'public'
as $$
  with liberados as (
    update public.leads l
       set aguardando_veiculo = false
     where l.aguardando_veiculo
       and not exists (
         select 1 from public.lead_procuras lp
         where lp.lead_id = l.id
           and lp.status = 'ativa'
           and lp.expira_em >= current_date)
    returning 1
  )
  select count(*)::integer from liberados
$$;

revoke all on function public.leads_liberar_procuras_expiradas() from public, anon, authenticated;

select cron.schedule('leads-liberar-procuras-expiradas', '15 3 * * *',
  'select public.leads_liberar_procuras_expiradas()');

-- Backfill das procuras já cadastradas.
update public.leads l
   set aguardando_veiculo = true
 where exists (
   select 1 from public.lead_procuras lp
   where lp.lead_id = l.id and lp.status = 'ativa' and lp.expira_em >= current_date);
