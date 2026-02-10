-- Adiciona suporte a variáveis periódicas (valores que mudam conforme a data)

-- Novo campo na tabela existente para distinguir variáveis fixas de periódicas
ALTER TABLE dashboard_variables
ADD COLUMN IF NOT EXISTS value_type text NOT NULL DEFAULT 'fixed'
CHECK (value_type IN ('fixed', 'periodic'));

-- Nova tabela para armazenar os períodos e seus valores
CREATE TABLE IF NOT EXISTS dashboard_variable_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variable_id uuid NOT NULL REFERENCES dashboard_variables(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  value numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(variable_id, start_date, end_date),
  CHECK (end_date >= start_date)
);

-- RLS
ALTER TABLE dashboard_variable_periods ENABLE ROW LEVEL SECURITY;

-- SELECT: via empresa do usuário (usando profiles como as demais tabelas)
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

-- Índice para busca rápida por variable_id
CREATE INDEX IF NOT EXISTS idx_variable_periods_variable_id
  ON dashboard_variable_periods(variable_id);
