-- Filtro de leads por responsável nas campanhas de WhatsApp.
-- NULL = todos os vendedores (comportamento anterior); preenchido = só leads
-- cujo leads.responsible_uuid seja esse usuário.
ALTER TABLE public.whatsapp_campaigns
  ADD COLUMN IF NOT EXISTS lead_responsible_uuid uuid NULL;

COMMENT ON COLUMN public.whatsapp_campaigns.lead_responsible_uuid IS
  'Filtra os leads da campanha pelo responsável (leads.responsible_uuid). NULL = todos.';
