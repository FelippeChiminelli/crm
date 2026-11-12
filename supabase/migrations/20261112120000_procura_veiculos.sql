-- Procura de veículo: o vendedor registra no lead o que o cliente procura e o
-- sistema avisa quando entra no estoque um carro compatível.
--
-- Os carros chegam via n8n em dois padrões: (A) apaga tudo e reinsere a cada
-- sync, (B) diff por placa com update in place. Em ambos o external_id é o id
-- do veículo no sistema de gestão e é estável, então o "já avisado" é chaveado
-- por (procura_id, vehicle_external_id) — nunca pelo vehicle_id, que muda no
-- padrão A. Assim o reinsert periódico nunca gera aviso repetido.

-- ---------------------------------------------------------------------------
-- 1. Normalização (funções IMMUTABLE, usadas em colunas geradas)
-- ---------------------------------------------------------------------------

-- minúsculas, sem acento, hífen removido (HR-V = HRV, S-10 = S10), demais
-- símbolos viram espaço.
create or replace function public.procura_norm(t text)
returns text
language sql
immutable
parallel safe
as $$
  select trim(regexp_replace(
           regexp_replace(
             lower(translate(coalesce(t, ''),
               'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
               'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn')),
             '-', '', 'g'),
           '[^a-z0-9]+', ' ', 'g'))
$$;

create or replace function public.procura_tokens(t text)
returns text[]
language sql
immutable
parallel safe
as $$
  select case when public.procura_norm(t) = '' then '{}'::text[]
              else string_to_array(public.procura_norm(t), ' ') end
$$;

-- Apelidos e grafias vistas no estoque real.
create or replace function public.procura_marca_canonica(t text)
returns text
language sql
immutable
parallel safe
as $$
  select case n
           when 'vw' then 'volkswagen'
           when 'volks' then 'volkswagen'
           when 'volkwagen' then 'volkswagen'
           when 'vw volkswagen' then 'volkswagen'
           when 'volkswagen vw' then 'volkswagen'
           when 'gm' then 'chevrolet'
           when 'gm chevrolet' then 'chevrolet'
           when 'chevrolet gm' then 'chevrolet'
           when 'mercedes' then 'mercedesbenz'
           when 'mercedes benz' then 'mercedesbenz'
           when 'mb' then 'mercedesbenz'
           when 'kia motors' then 'kia'
           when 'caoa chery' then 'chery'
           when 'chery caoa' then 'chery'
           when 'cherry' then 'chery'
           when 'great wall' then 'gwm'
           when 'hyundai caoa' then 'hyundai'
           when 'caoa hyundai' then 'hyundai'
           when 'citroen ds' then 'citroen'
           else n
         end
  from (select public.procura_norm(t) as n) s
$$;

create or replace function public.procura_cambio_cat(t text)
returns text
language sql
immutable
parallel safe
as $$
  select case
           when n ~ 'manual' then 'manual'
           when n ~ '(auto|cvt|sequencial)' then 'automatico'
           else null
         end
  from (select public.procura_norm(t) as n) s
$$;

create or replace function public.procura_combustivel_cat(t text)
returns text
language sql
immutable
parallel safe
as $$
  select case
           when n ~ 'diesel' then 'diesel'
           when n ~ 'eletric' then 'eletrico'
           when n ~ '(flex|alcool|etanol|bi ?combust)' then 'flex'
           when n ~ 'gasolina' then 'gasolina'
           else null
         end
  from (select public.procura_norm(t) as n) s
$$;

-- ---------------------------------------------------------------------------
-- 2. Tabelas
-- ---------------------------------------------------------------------------

create table if not exists public.lead_procuras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_by uuid default auth.uid(),
  marca text not null check (length(trim(marca)) > 0),
  modelo text,
  ano_min integer,
  ano_max integer,
  preco_max numeric,
  km_max integer,
  cambio text check (cambio in ('automatico', 'manual')),
  combustivel text check (combustivel in ('flex', 'diesel', 'eletrico')),
  observacao text,
  status text not null default 'ativa' check (status in ('ativa', 'atendida', 'cancelada')),
  expira_em date not null default (current_date + 90),
  marca_norm text generated always as (public.procura_marca_canonica(marca)) stored,
  modelo_tokens text[] generated always as (public.procura_tokens(modelo)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_procuras_lead_idx on public.lead_procuras (lead_id);
create index if not exists lead_procuras_ativas_idx
  on public.lead_procuras (empresa_id, marca_norm) where status = 'ativa';

create table if not exists public.lead_procura_matches (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  procura_id uuid not null references public.lead_procuras(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  vehicle_external_id bigint not null,
  -- Último id conhecido; sem FK porque o sync apaga e recria os veículos.
  vehicle_id uuid,
  origem text not null check (origem in ('entrada_estoque', 'estoque_existente')),
  status text not null default 'novo' check (status in ('novo', 'oferecido', 'descartado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (procura_id, vehicle_external_id)
);

create index if not exists lead_procura_matches_lead_idx on public.lead_procura_matches (lead_id);

drop trigger if exists lead_procuras_updated_at on public.lead_procuras;
create trigger lead_procuras_updated_at
  before update on public.lead_procuras
  for each row execute function public.update_updated_at_column();

drop trigger if exists lead_procura_matches_updated_at on public.lead_procura_matches;
create trigger lead_procura_matches_updated_at
  before update on public.lead_procura_matches
  for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 3. RLS (mesmo isolamento por empresa das demais tabelas)
-- ---------------------------------------------------------------------------

alter table public.lead_procuras enable row level security;
alter table public.lead_procura_matches enable row level security;

drop policy if exists lead_procuras_empresa on public.lead_procuras;
create policy lead_procuras_empresa on public.lead_procuras
  for all to authenticated
  using (empresa_id = (select p.empresa_id from public.profiles p where p.uuid = auth.uid() limit 1))
  with check (empresa_id = (select p.empresa_id from public.profiles p where p.uuid = auth.uid() limit 1));

-- Matches são criados só pelas funções (security definer); o usuário lê e muda o status.
drop policy if exists lead_procura_matches_select on public.lead_procura_matches;
create policy lead_procura_matches_select on public.lead_procura_matches
  for select to authenticated
  using (empresa_id = (select p.empresa_id from public.profiles p where p.uuid = auth.uid() limit 1));

drop policy if exists lead_procura_matches_update on public.lead_procura_matches;
create policy lead_procura_matches_update on public.lead_procura_matches
  for update to authenticated
  using (empresa_id = (select p.empresa_id from public.profiles p where p.uuid = auth.uid() limit 1))
  with check (empresa_id = (select p.empresa_id from public.profiles p where p.uuid = auth.uid() limit 1));

-- ---------------------------------------------------------------------------
-- 4. Regra de match
-- ---------------------------------------------------------------------------

create or replace function public.procura_combina(p public.lead_procuras, v public.vehicles)
returns boolean
language plpgsql
stable
as $$
declare
  v_marca text := public.procura_marca_canonica(v.marca_veiculo);
  v_toks text[] := public.procura_tokens(
    coalesce(v.marca_veiculo, '') || ' ' || coalesce(v.modelo_veiculo, '') || ' ' || coalesce(v.titulo_veiculo, ''));
  v_preco numeric := coalesce(nullif(v.promotion_price, 0), v.price_veiculo);
  v_cambio text := public.procura_cambio_cat(v.cambio_veiculo);
  v_comb text := public.procura_combustivel_cat(v.combustivel_veiculo);
begin
  -- Marca: canônica igual; se o veículo veio sem marca, procura no texto.
  if not (v_marca = p.marca_norm
          or (v_marca = '' and v_toks @> public.procura_tokens(p.marca))) then
    return false;
  end if;

  -- Modelo: todas as palavras procuradas aparecem (palavra inteira) no modelo/título.
  if cardinality(p.modelo_tokens) > 0 and not (v_toks @> p.modelo_tokens) then
    return false;
  end if;

  -- Filtros numéricos: dado ausente no veículo não elimina (melhor um falso positivo).
  if p.ano_min is not null and v.ano_veiculo is not null and v.ano_veiculo < p.ano_min then return false; end if;
  if p.ano_max is not null and v.ano_veiculo is not null and v.ano_veiculo > p.ano_max then return false; end if;
  if p.preco_max is not null and v_preco is not null and v_preco > p.preco_max then return false; end if;
  if p.km_max is not null and v.quilometragem_veiculo is not null and v.quilometragem_veiculo > p.km_max then return false; end if;
  if p.cambio is not null and v_cambio is not null and v_cambio <> p.cambio then return false; end if;
  if p.combustivel is not null and v_comb is not null and v_comb <> p.combustivel then return false; end if;

  return true;
end;
$$;

-- Cruza um veículo com as procuras ativas da empresa. Retorna quantos matches novos.
-- p_notificar = false para a busca no estoque atual (o vendedor está vendo a tela).
create or replace function public.procura_processar_veiculo(v public.vehicles, p_notificar boolean)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  p public.lead_procuras;
  v_novo boolean;
  v_total integer := 0;
  v_lead record;
  v_preco numeric;
  v_corpo text;
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
    returning (xmax = 0) into v_novo;

    if not v_novo then
      continue;
    end if;
    v_total := v_total + 1;

    if p_notificar then
      select l.name, l.responsible_uuid into v_lead from public.leads l where l.id = p.lead_id;
      v_preco := coalesce(nullif(v.promotion_price, 0), v.price_veiculo);
      v_corpo := trim(both ' ·' from concat_ws(' · ',
        coalesce(nullif(trim(v.titulo_veiculo), ''), trim(concat_ws(' ', v.marca_veiculo, v.modelo_veiculo))),
        v.ano_veiculo::text,
        case when v_preco is not null
             then 'R$ ' || replace(to_char(v_preco, 'FM999G999G999'), ',', '.') end));

      perform public.criar_notificacao(
        v.empresa_id,
        coalesce(v_lead.responsible_uuid, p.created_by),
        'procura_veiculo',
        'Chegou um carro para ' || coalesce(v_lead.name, 'seu lead'),
        v_corpo,
        '/leads/' || p.lead_id,
        p.lead_id);
    end if;
  end loop;

  return v_total;
end;
$$;

revoke all on function public.procura_processar_veiculo(public.vehicles, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Trigger em vehicles
-- ---------------------------------------------------------------------------

create or replace function public.tg_vehicles_procura()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.status_veiculo <> 'disponivel' then
    return null;
  end if;

  if tg_op = 'UPDATE' and not (
       old.status_veiculo is distinct from new.status_veiculo
    or old.price_veiculo is distinct from new.price_veiculo
    or old.promotion_price is distinct from new.promotion_price
    or old.marca_veiculo is distinct from new.marca_veiculo
    or old.modelo_veiculo is distinct from new.modelo_veiculo
    or old.titulo_veiculo is distinct from new.titulo_veiculo
    or old.ano_veiculo is distinct from new.ano_veiculo
    or old.quilometragem_veiculo is distinct from new.quilometragem_veiculo
    or old.cambio_veiculo is distinct from new.cambio_veiculo
    or old.combustivel_veiculo is distinct from new.combustivel_veiculo) then
    return null;
  end if;

  -- Caminho rápido: empresa sem procura ativa não paga nada no sync.
  if not exists (
    select 1 from public.lead_procuras
    where empresa_id = new.empresa_id and status = 'ativa' and expira_em >= current_date
  ) then
    return null;
  end if;

  perform public.procura_processar_veiculo(new, true);
  return null;
exception when others then
  -- Nunca quebrar o sync do estoque por causa do aviso.
  raise warning 'tg_vehicles_procura falhou para veículo %: %', new.id, sqlerrm;
  return null;
end;
$$;

drop trigger if exists vehicles_procura on public.vehicles;
create trigger vehicles_procura
  after insert or update on public.vehicles
  for each row execute function public.tg_vehicles_procura();

-- ---------------------------------------------------------------------------
-- 6. RPCs para o frontend
-- ---------------------------------------------------------------------------

-- Cruza uma procura com o estoque atual, sem notificar. Retorna quantos matches novos.
create or replace function public.procura_buscar_estoque(p_procura_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_empresa uuid;
  v public.vehicles;
  v_total integer := 0;
begin
  select lp.empresa_id into v_empresa
  from public.lead_procuras lp
  where lp.id = p_procura_id
    and lp.empresa_id = (select pr.empresa_id from public.profiles pr where pr.uuid = auth.uid() limit 1);

  if v_empresa is null then
    raise exception 'Procura não encontrada';
  end if;

  for v in
    select * from public.vehicles
    where empresa_id = v_empresa and status_veiculo = 'disponivel'
  loop
    -- processar_veiculo olha todas as procuras da empresa; o on conflict torna isso
    -- idempotente, mas aqui só interessa a procura pedida.
    if exists (select 1 from public.lead_procuras lp
               where lp.id = p_procura_id and lp.status = 'ativa'
                 and public.procura_combina(lp, v)) then
      insert into public.lead_procura_matches
        (empresa_id, procura_id, lead_id, vehicle_external_id, vehicle_id, origem)
      select v_empresa, lp.id, lp.lead_id, v.external_id, v.id, 'estoque_existente'
      from public.lead_procuras lp where lp.id = p_procura_id
      on conflict (procura_id, vehicle_external_id) do update set vehicle_id = excluded.vehicle_id;
      v_total := v_total + 1;
    end if;
  end loop;

  return v_total;
end;
$$;

grant execute on function public.procura_buscar_estoque(uuid) to authenticated;

-- Sugestões de marca/modelo a partir do estoque da própria empresa (RLS de vehicles).
-- Modelo = primeira palavra do modelo_veiculo (o feed repete o modelo e soma a versão).
create or replace function public.procura_sugestoes(p_campo text, p_marca text default null)
returns table (valor text, qtd integer)
language sql
stable
security invoker
set search_path to 'public'
as $$
  with base as (
    select
      procura_marca_canonica(marca_veiculo) as marca_c,
      trim(marca_veiculo) as marca_txt,
      split_part(trim(regexp_replace(coalesce(modelo_veiculo, ''), '\s+', ' ', 'g')), ' ', 1) as modelo_txt
    from vehicles
    where coalesce(trim(marca_veiculo), '') <> ''
  )
  select mode() within group (order by
           case when p_campo = 'marca' then marca_txt else modelo_txt end) as valor,
         count(*)::integer as qtd
  from base
  where p_campo = 'marca'
     or (p_campo = 'modelo' and modelo_txt <> ''
         and (p_marca is null or marca_c = procura_marca_canonica(p_marca)))
  group by case when p_campo = 'marca' then marca_c else procura_norm(modelo_txt) end
  order by qtd desc
  limit 200
$$;

grant execute on function public.procura_sugestoes(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Tipo de notificação (desligável em Empresa → Notificações)
-- ---------------------------------------------------------------------------

insert into public.notificacao_tipos (tipo, nome, descricao, ativo_padrao, editavel_usuario)
values ('procura_veiculo', 'Veículo procurado chegou',
        'Quando entra no estoque um carro compatível com a procura de um lead seu', true, true)
on conflict (tipo) do nothing;
