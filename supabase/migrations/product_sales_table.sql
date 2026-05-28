-- ============================================================================
-- Migration: Criar tabela product_sales (histórico de vendas de produtos)
-- ============================================================================
-- Permite análises temporais: vendas por período, top vendidos, ticket médio,
-- evolução no tempo, ranking por vendedor, etc.
--
-- Como executar (manualmente no SQL Editor do Supabase):
--   1. Abra o painel do Supabase do projeto
--   2. SQL Editor > New query
--   3. Cole este arquivo e clique em "Run"
-- ============================================================================

-- Tabela principal
create table if not exists public.product_sales (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  responsible_uuid uuid references public.profiles(uuid) on delete set null,
  quantidade_vendida numeric not null default 1,
  sold_value numeric,
  unit_price numeric,
  sold_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

-- Índices para performance no analytics
create index if not exists idx_product_sales_empresa_sold_at
  on public.product_sales(empresa_id, sold_at desc);
create index if not exists idx_product_sales_product
  on public.product_sales(product_id);
create index if not exists idx_product_sales_lead
  on public.product_sales(lead_id) where lead_id is not null;
create index if not exists idx_product_sales_responsible
  on public.product_sales(responsible_uuid) where responsible_uuid is not null;

-- RLS (isolamento multi-tenant - mesmo padrão da tabela products)
alter table public.product_sales enable row level security;

drop policy if exists "product_sales_select_policy" on public.product_sales;
create policy "product_sales_select_policy" on public.product_sales
  for select
  using (empresa_id in (select profiles.empresa_id from profiles where profiles.uuid = auth.uid()));

drop policy if exists "product_sales_insert_policy" on public.product_sales;
create policy "product_sales_insert_policy" on public.product_sales
  for insert
  with check (empresa_id in (select profiles.empresa_id from profiles where profiles.uuid = auth.uid()));

drop policy if exists "product_sales_update_policy" on public.product_sales;
create policy "product_sales_update_policy" on public.product_sales
  for update
  using (empresa_id in (select profiles.empresa_id from profiles where profiles.uuid = auth.uid()));

drop policy if exists "product_sales_delete_policy" on public.product_sales;
create policy "product_sales_delete_policy" on public.product_sales
  for delete
  using (empresa_id in (select profiles.empresa_id from profiles where profiles.uuid = auth.uid()));

-- Comentários para documentação
comment on table public.product_sales is 'Histórico de vendas de produtos/serviços para análises temporais';
comment on column public.product_sales.quantidade_vendida is 'Quantidade vendida nesta operação (para serviços geralmente 1)';
comment on column public.product_sales.sold_value is 'Valor TOTAL desta venda (quantidade_vendida * unit_price)';
comment on column public.product_sales.unit_price is 'Preço unitário no momento da venda (snapshot de preco/preco_promocional)';
