-- Tabela de histórico de análises da Calculadora Tributária PF vs PJ.
-- Usada para controle de trial limit (2/mês para não assinantes) e auditoria.
CREATE TABLE calc_tributaria_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_calc_tributaria_history_user_id ON calc_tributaria_history(user_id);
CREATE INDEX idx_calc_tributaria_history_created_at ON calc_tributaria_history(created_at DESC);

ALTER TABLE calc_tributaria_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calc tributaria history"
  ON calc_tributaria_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calc tributaria history"
  ON calc_tributaria_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calc tributaria history"
  ON calc_tributaria_history FOR DELETE
  USING (auth.uid() = user_id);
