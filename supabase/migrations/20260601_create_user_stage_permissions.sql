-- Permissões de estágio por usuário (Kanban)
-- Espelha user_pipeline_permissions e user_instance_permissions

create table if not exists public.user_stage_permissions (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid not null references public.profiles(uuid) on delete cascade,
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  stage_id uuid not null references public.stages(id) on delete cascade,
  granted boolean not null default true,
  granted_by uuid references public.profiles(uuid),
  created_at timestamptz not null default now(),
  unique (empresa_id, user_id, pipeline_id, stage_id)
);

alter table public.user_stage_permissions enable row level security;

create policy read_own_company on public.user_stage_permissions
  for select using (
    empresa_id in (select empresa_id from profiles where uuid = auth.uid())
  );

create policy admin_manage_own_company on public.user_stage_permissions
  for all using (
    (select is_admin from profiles where uuid = auth.uid()) = true
    and empresa_id in (select empresa_id from profiles where uuid = auth.uid())
  );

create index if not exists idx_user_stage_permissions_lookup
  on public.user_stage_permissions (user_id, empresa_id, pipeline_id)
  where granted = true;
