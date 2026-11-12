-- Quando chega um carro compatível com a procura, além da notificação cria uma
-- tarefa para o vendedor oferecer o carro. Uma tarefa aberta por procura: novos
-- carros que chegarem enquanto ela estiver aberta entram na descrição dela.

alter table public.lead_procura_matches
  add column if not exists task_id uuid references public.tasks(id) on delete set null;

create index if not exists lead_procura_matches_task_idx
  on public.lead_procura_matches (task_id) where task_id is not null;

-- A tarefa criada aqui não precisa do aviso genérico "Nova tarefa para você":
-- o aviso "Chegou um carro para ..." já vai junto. Mesmo corpo de antes + o
-- desvio pela flag de transação aucta.skip_notif_tarefa.
create or replace function public.notify_tarefa_atribuida()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  begin
    if coalesce(current_setting('aucta.skip_notif_tarefa', true), '') = 'on' then
      return null;
    end if;

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

-- Cria ou atualiza a tarefa "Oferecer carro" de uma procura. Retorna o id da tarefa.
create or replace function public.procura_criar_tarefa(
  p public.lead_procuras,
  v public.vehicles,
  p_responsavel uuid
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
    'Chegou no estoque um carro compatível com a procura do cliente ('
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

revoke all on function public.procura_criar_tarefa(public.lead_procuras, public.vehicles, uuid)
  from public, anon, authenticated;

-- Mesmo fluxo de antes + a tarefa.
create or replace function public.procura_processar_veiculo(v public.vehicles, p_notificar boolean)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  p public.lead_procuras;
  v_match_id uuid;
  v_novo boolean;
  v_total integer := 0;
  v_lead record;
  v_preco numeric;
  v_corpo text;
  v_responsavel uuid;
  v_task_id uuid;
begin
  if v.status_veiculo <> 'disponivel' or v.external_id is null then
    return 0;
  end if;

  for p in
    select * from public.lead_procuras lp
    where lp.empresa_id = v.empresa_id
      and lp.status = 'ativa'
      and lp.expira_em >= current_date
  loop
    if not public.procura_combina(p, v) then
      continue;
    end if;

    insert into public.lead_procura_matches
      (empresa_id, procura_id, lead_id, vehicle_external_id, vehicle_id, origem)
    values
      (v.empresa_id, p.id, p.lead_id, v.external_id, v.id,
       case when p_notificar then 'entrada_estoque' else 'estoque_existente' end)
    on conflict (procura_id, vehicle_external_id)
      do update set vehicle_id = excluded.vehicle_id
    returning id, (xmax = 0) into v_match_id, v_novo;

    if not v_novo then
      continue;
    end if;
    v_total := v_total + 1;

    if p_notificar then
      select l.name, l.responsible_uuid into v_lead from public.leads l where l.id = p.lead_id;
      v_responsavel := coalesce(v_lead.responsible_uuid, p.created_by);
      v_preco := coalesce(nullif(v.promotion_price, 0), v.price_veiculo);
      v_corpo := trim(both ' ·' from concat_ws(' · ',
        coalesce(nullif(trim(v.titulo_veiculo), ''), trim(concat_ws(' ', v.marca_veiculo, v.modelo_veiculo))),
        v.ano_veiculo::text,
        case when v_preco is not null
             then 'R$ ' || replace(to_char(v_preco, 'FM999G999G999'), ',', '.') end));

      perform public.criar_notificacao(
        v.empresa_id,
        v_responsavel,
        'procura_veiculo',
        'Chegou um carro para ' || coalesce(v_lead.name, 'seu lead'),
        v_corpo,
        '/leads/' || p.lead_id,
        p.lead_id);

      v_task_id := public.procura_criar_tarefa(p, v, v_responsavel);
      if v_task_id is not null then
        update public.lead_procura_matches set task_id = v_task_id where id = v_match_id;
      end if;
    end if;
  end loop;

  return v_total;
end;
$$;

revoke all on function public.procura_processar_veiculo(public.vehicles, boolean) from public, anon, authenticated;
