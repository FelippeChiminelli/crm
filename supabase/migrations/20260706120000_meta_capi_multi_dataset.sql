-- Meta CAPI: suporte a múltiplos datasets/pixels por empresa

-- 1) Identificação amigável do pixel
ALTER TABLE public.meta_capi_config
  ADD COLUMN IF NOT EXISTS name TEXT;

UPDATE public.meta_capi_config
SET name = COALESCE(name, 'Pixel ' || LEFT(dataset_id, 8))
WHERE name IS NULL;

ALTER TABLE public.meta_capi_config
  ALTER COLUMN name SET NOT NULL;

-- 2) Permite N configs por empresa; impede dataset duplicado na mesma empresa
ALTER TABLE public.meta_capi_config
  DROP CONSTRAINT IF EXISTS meta_capi_config_empresa_id_key;

ALTER TABLE public.meta_capi_config
  DROP CONSTRAINT IF EXISTS meta_capi_config_empresa_dataset_unique;

ALTER TABLE public.meta_capi_config
  ADD CONSTRAINT meta_capi_config_empresa_dataset_unique
  UNIQUE (empresa_id, dataset_id);

CREATE INDEX IF NOT EXISTS idx_meta_capi_config_empresa_id
  ON public.meta_capi_config (empresa_id);

-- 3) Rastrear qual pixel recebeu cada evento
ALTER TABLE public.meta_capi_events
  ADD COLUMN IF NOT EXISTS config_id UUID
  REFERENCES public.meta_capi_config(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meta_capi_events_config_id
  ON public.meta_capi_events (config_id);
