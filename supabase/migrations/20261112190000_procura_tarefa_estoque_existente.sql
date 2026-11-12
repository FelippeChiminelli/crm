-- Carros que já estão no estoque quando a procura é criada (ou editada) também
-- geram a tarefa "Oferecer carro" — sem notificação, porque quem cadastrou está
-- vendo a tela. Continua uma tarefa aberta por procura.

-- A assinatura ganha p_origem (muda o texto da tarefa). Remove a versão de 3
-- argumentos para não ficar ambígua com o default.
drop function if exists public.procura_criar_tarefa(public.lead_procuras, public.vehicles, uuid);

create or replace function public.procura_criar_tarefa(
  p public.lead_procuras,
  v public.vehicles,
  p_responsavel uuid,
  p_origem text default 'entrada_estoque'
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_lead record;
  v_task_id uuid;
  v_qtd integer;
  v_carro text;
  v_linha text;
  v_preco numeric;
  v_agora timestamp := now() at time zone 'America/Sao_Paulo';
  v_data date;
  v_hora time;
  v_tipo uuid;
begin
  if p_responsavel is null then
    return null;
  end if;

  select l.name, l.pipeline_id into v_lead from public.leads l where l.id = p.lead_id;

  v_carro := coalesce(nullif(trim(v.titulo_veiculo), ''), trim(concat_ws(' ', v.marca_veiculo, v.modelo_veiculo)));
  v_preco := coalesce(nullif(v.promotion_price, 0), v.price_veiculo);
  v_linha := '• ' || concat_ws(' · ',
    v_carro,
    v.ano_veiculo::text,
    case when v_preco is not null then 'R$ ' || replace(to_char(v_preco, 'FM999G999G999'), ',', '.') end,
    case when v.quilometragem_veiculo is not null
         then replace(to_char(v.quilometragem_veiculo, 'FM999G999G999'), ',', '.') || ' km' end,
    nullif(trim(v.plate_veiculo), ''));

  -- Já existe tarefa aberta desta procura? Acrescenta o carro nela.
  select t.id into v_task_id
  from public.tasks t
  where t.id in (select m.task_id from public.lead_procura_matches m
                 where m.procura_id = p.id and m.task_id is not null)
    and t.status in ('pendente', 'em_andamento', 'atrasada')
  order by t.created_at desc
  limit 1;

  if v_task_id is not null then
    select count(*) + 1 into v_qtd from public.lead_procura_matches m where m.task_id = v_task_id;
    update public.tasks
       set title = left('Oferecer ' || v_qtd || ' carros para ' || coalesce(v_lead.name, 'o cliente'), 200),
           description = coalesce(description, '') || E'\n' || v_linha
     where id = v_task_id;
    return v_task_id;
  end if;

  -- Prazo: 3h a partir de agora; depois das 17h, 10h do dia seguinte (horário de Brasília).
  if v_agora::time < time '17:00' then
    v_data := v_agora::date;
    v_hora := date_trunc('minute', v_agora + interval '3 hours')::time;
  else
    v_data := v_agora::date + 1;
    v_hora := time '10:00';
  end if;

  select tt.id into v_tipo
  from public.task_types tt
  where tt.empresa_id = p.empresa_id and tt.active and tt.name = 'Follow-up'
  limit 1;

  perform set_config('aucta.skip_notif_tarefa', 'on', true);

  insert into public.tasks (
    title, description, empresa_id, assigned_to, created_by, lead_id, pipeline_id,
    task_type_id, status, priority, due_date, due_time, tags)
  values (
    left('Oferecer ' || v_carro || ' para ' || coalesce(v_lead.name, 'o cliente'), 200),
    case when p_origem = 'estoque_existente'
         then 'Há no estoque um carro compatível com a procura do cliente ('
         else 'Chegou no estoque um carro compatível com a procura do cliente (' end
      || concat_ws(' ', p.marca, p.modelo) || ').'
      || coalesce(E'\nObservação da procura: ' || nullif(trim(p.observacao), ''), '')
      || E'\n\nCarros:\n' || v_linha,
    p.empresa_id, p_responsavel, coalesce(p.created_by, p_responsavel), p.lead_id, v_lead.pipeline_id,
    v_tipo, 'pendente', 'alta',
    -- due_date é guardado como a data à meia-noite UTC (ver tarefa_data_local)
    (v_data::timestamp at time zone 'UTC'), v_hora, array['procura_veiculo'])
  returning id into v_task_id;

  perform set_config('aucta.skip_notif_tarefa', 'off', true);

  return v_task_id;
exception when others then
  perform set_config('aucta.skip_notif_tarefa', 'off', true);
  raise warning 'procura_criar_tarefa falhou (procura %): %', p.id, sqlerrm;
  return null;
end;
$$;

revoke all on function public.procura_criar_tarefa(public.lead_procuras, public.vehicles, uuid, text)
  from public, anon, authenticated;

-- Busca no estoque atual (ao criar/editar a procura): agora também cria a tarefa
-- para os carros encontrados pela primeira vez. Sem notificação.
create or replace function public.procura_buscar_estoque(p_procura_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  p public.lead_procuras;
  v public.vehicles;
  v_total integer := 0;
  v_match_id uuid;
  v_novo boolean;
  v_responsavel uuid;
  v_task_id uuid;
begin
  select lp.* into p
  from public.lead_procuras lp
  where lp.id = p_procura_id
    and lp.empresa_id = (select pr.empresa_id from public.profiles pr where pr.uuid = auth.uid() limit 1);

  if p.id is null then
    raise exception 'Procura não encontrada';
  end if;

  if p.status <> 'ativa' then
    return 0;
  end if;

  select coalesce(l.responsible_uuid, p.created_by) into v_responsavel
  from public.leads l where l.id = p.lead_id;

  for v in
    select * from public.vehicles
    where empresa_id = p.empresa_id and status_veiculo = 'disponivel'
  loop
    if not public.procura_combina(p, v) then
      continue;
    end if;

    insert into public.lead_procura_matches
      (empresa_id, procura_id, lead_id, vehicle_external_id, vehicle_id, origem)
    values (p.empresa_id, p.id, p.lead_id, v.external_id, v.id, 'estoque_existente')
    on conflict (procura_id, vehicle_external_id) do update set vehicle_id = excluded.vehicle_id
    returning id, (xmax = 0) into v_match_id, v_novo;

    v_total := v_total + 1;

    if v_novo then
      v_task_id := public.procura_criar_tarefa(p, v, v_responsavel, 'estoque_existente');
      if v_task_id is not null then
        update public.lead_procura_matches set task_id = v_task_id where id = v_match_id;
      end if;
    end if;
  end loop;

  return v_total;
end;
$$;

grant execute on function public.procura_buscar_estoque(uuid) to authenticated;

-- Backfill: procuras ativas com carros ainda em estoque e sem tarefa (ex.: as
-- criadas antes desta migration) ganham a tarefa agora.
do $$
declare
  r record;
  p public.lead_procuras;
  v public.vehicles;
  v_task_id uuid;
begin
  for r in
    select distinct on (m.created_at, m.id) m.id as match_id, m.procura_id, v2.id as vehicle_id,
           coalesce(l.responsible_uuid, lp.created_by) as responsavel
    from public.lead_procura_matches m
    join public.lead_procuras lp on lp.id = m.procura_id
    join public.leads l on l.id = m.lead_id
    join public.vehicles v2 on v2.empresa_id = m.empresa_id
                           and v2.external_id = m.vehicle_external_id
                           and v2.status_veiculo = 'disponivel'
    where m.task_id is null
      and m.status = 'novo'
      and lp.status = 'ativa'
      and lp.expira_em >= current_date
    order by m.created_at
  loop
    select * into p from public.lead_procuras where id = r.procura_id;
    select * into v from public.vehicles where id = r.vehicle_id;
    v_task_id := public.procura_criar_tarefa(p, v, r.responsavel, 'estoque_existente');
    if v_task_id is not null then
      update public.lead_procura_matches set task_id = v_task_id where id = r.match_id;
    end if;
  end loop;
end
$$;
