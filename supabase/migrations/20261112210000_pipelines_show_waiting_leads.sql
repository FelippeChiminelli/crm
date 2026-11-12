-- Configuração do funil: mostrar sempre no Kanban os leads aguardando veículo
-- (procura ativa), como já existe para vendidos e perdidos.
alter table public.pipelines
  add column if not exists show_waiting_leads boolean not null default false;
