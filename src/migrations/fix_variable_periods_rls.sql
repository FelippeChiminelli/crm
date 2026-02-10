-- Corrige RLS da tabela dashboard_variable_periods
-- A política anterior usava auth.jwt() ->> 'empresa_id' que não existe no JWT
-- Corrige para usar profiles -> auth.uid() como as demais tabelas

-- Remove política incorreta
DROP POLICY IF EXISTS "periods_via_variable_empresa" ON dashboard_variable_periods;

-- SELECT: via empresa do usuário
CREATE POLICY "Usuarios podem ver periodos da empresa"
  ON dashboard_variable_periods FOR SELECT
  USING (
    variable_id IN (
      SELECT dv.id FROM dashboard_variables dv
      WHERE dv.empresa_id IN (
        SELECT p.empresa_id FROM profiles p WHERE p.uuid = auth.uid()
      )
    )
  );

-- INSERT: da mesma empresa
CREATE POLICY "Usuarios podem criar periodos"
  ON dashboard_variable_periods FOR INSERT
  WITH CHECK (
    variable_id IN (
      SELECT dv.id FROM dashboard_variables dv
      WHERE dv.empresa_id IN (
        SELECT p.empresa_id FROM profiles p WHERE p.uuid = auth.uid()
      )
    )
  );

-- UPDATE: dono da variável
CREATE POLICY "Usuarios podem atualizar periodos"
  ON dashboard_variable_periods FOR UPDATE
  USING (
    variable_id IN (
      SELECT dv.id FROM dashboard_variables dv
      WHERE dv.created_by = auth.uid()
    )
  );

-- DELETE: dono da variável
CREATE POLICY "Usuarios podem deletar periodos"
  ON dashboard_variable_periods FOR DELETE
  USING (
    variable_id IN (
      SELECT dv.id FROM dashboard_variables dv
      WHERE dv.created_by = auth.uid()
    )
  );
