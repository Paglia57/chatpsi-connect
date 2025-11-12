-- Criar tabela para textos de marketing
CREATE TABLE marketing_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  prompt text NOT NULL,
  generated_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_marketing_texts_user_id ON marketing_texts(user_id);
CREATE INDEX idx_marketing_texts_created_at ON marketing_texts(created_at DESC);

-- Habilitar RLS
ALTER TABLE marketing_texts ENABLE ROW LEVEL SECURITY;

-- Policies: usuários podem ver apenas seus próprios textos
CREATE POLICY "Users can view own marketing texts"
  ON marketing_texts FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem inserir seus próprios textos
CREATE POLICY "Users can insert own marketing texts"
  ON marketing_texts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus próprios textos
CREATE POLICY "Users can update own marketing texts"
  ON marketing_texts FOR UPDATE
  USING (auth.uid() = user_id);

-- Usuários podem deletar seus próprios textos
CREATE POLICY "Users can delete own marketing texts"
  ON marketing_texts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_marketing_texts_updated_at
  BEFORE UPDATE ON marketing_texts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();