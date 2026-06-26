-- Catálogo próprio de "planos de ação" em pgvector (substitui o assistant + vector store
-- da OpenAI). Etapa ADITIVA: cria extensão/tabela/função novas; nada existente é alterado.
-- Leitura pelas Edge Functions via service_role; leitura no dashboard só admin (is_admin).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.planos_de_acao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text,
  resumo text,
  link text,
  arquivo_origem text,
  hash text UNIQUE,                 -- SHA-256 do conteúdo do PDF (dedupe / upsert)
  embedding vector(1536),           -- text-embedding-3-small
  revisado boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Índice de similaridade (cosseno). HNSW: boa recall, sem etapa de treino, ok para ~125 itens.
CREATE INDEX idx_planos_de_acao_embedding
  ON public.planos_de_acao USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_planos_de_acao_revisado ON public.planos_de_acao (revisado);

ALTER TABLE public.planos_de_acao ENABLE ROW LEVEL SECURITY;

-- Dashboard: só admin lê. Edge Functions usam service_role (bypassa RLS).
CREATE POLICY "Admins can view planos_de_acao"
  ON public.planos_de_acao FOR SELECT TO authenticated
  USING (public.is_admin());
-- Escrita só via Edge Function planos-acao-admin (service_role, após validar is_admin).

-- Busca por similaridade. Chamada via service_role pela tool plano_de_acao e pela tela de teste.
CREATE OR REPLACE FUNCTION public.match_planos_de_acao(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (id uuid, titulo text, resumo text, link text, similarity float)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.titulo,
    p.resumo,
    p.link,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM public.planos_de_acao p
  WHERE p.ativo = true
    AND p.link IS NOT NULL
    AND p.link <> ''
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) >= match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;
