-- Visibilidade das campanhas de WhatsApp por vendedor.
-- Admin da empresa vê/edita/apaga todas; vendedor só as que criou
-- (created_by) ou pelas quais é responsável (responsible_uuid).
-- O n8n usa service_role e não é afetado por RLS.

DROP POLICY IF EXISTS "Empresas podem ver suas próprias campanhas" ON public.whatsapp_campaigns;
DROP POLICY IF EXISTS "Empresas podem atualizar suas campanhas" ON public.whatsapp_campaigns;
DROP POLICY IF EXISTS "Empresas podem deletar suas campanhas" ON public.whatsapp_campaigns;

CREATE POLICY "Campanhas visíveis para admin ou dono"
  ON public.whatsapp_campaigns FOR SELECT
  USING (
    empresa_id = public.get_user_empresa_id()
    AND (
      public.is_admin_company(empresa_id)
      OR created_by = auth.uid()
      OR responsible_uuid = auth.uid()
    )
  );

CREATE POLICY "Campanhas editáveis por admin ou dono"
  ON public.whatsapp_campaigns FOR UPDATE
  USING (
    empresa_id = public.get_user_empresa_id()
    AND (
      public.is_admin_company(empresa_id)
      OR created_by = auth.uid()
      OR responsible_uuid = auth.uid()
    )
  )
  WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Campanhas removíveis por admin ou dono"
  ON public.whatsapp_campaigns FOR DELETE
  USING (
    empresa_id = public.get_user_empresa_id()
    AND (
      public.is_admin_company(empresa_id)
      OR created_by = auth.uid()
      OR responsible_uuid = auth.uid()
    )
  );

-- Logs só das campanhas que o usuário enxerga (o subselect já passa pelo RLS acima)
DROP POLICY IF EXISTS "Empresas podem ver seus próprios logs" ON public.whatsapp_campaign_logs;

CREATE POLICY "Logs das campanhas visíveis"
  ON public.whatsapp_campaign_logs FOR SELECT
  USING (
    empresa_id = public.get_user_empresa_id()
    AND campaign_id IN (SELECT id FROM public.whatsapp_campaigns)
  );
