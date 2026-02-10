-- Tabela para variáveis reutilizáveis em cálculos de analytics
CREATE TABLE dashboard_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_dashboard_variables_empresa ON dashboard_variables(empresa_id);

-- Habilitar RLS
ALTER TABLE dashboard_variables ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver variáveis da sua empresa
CREATE POLICY "Usuarios podem ver variaveis da empresa"
  ON dashboard_variables
  FOR SELECT
  USING (
    empresa_id IN (
      SELECT p.empresa_id FROM profiles p WHERE p.uuid = auth.uid()
    )
  );

-- Política: usuários podem criar variáveis na sua empresa
CREATE POLICY "Usuarios podem criar variaveis"
  ON dashboard_variables
  FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT p.empresa_id FROM profiles p WHERE p.uuid = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Política: usuários podem atualizar suas próprias variáveis
CREATE POLICY "Usuarios podem atualizar suas variaveis"
  ON dashboard_variables
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Política: usuários podem deletar suas próprias variáveis
CREATE POLICY "Usuarios podem deletar suas variaveis"
  ON dashboard_variables
  FOR DELETE
  USING (created_by = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER trigger_dashboard_variables_updated_at
  BEFORE UPDATE ON dashboard_variables
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_calculations_updated_at();
