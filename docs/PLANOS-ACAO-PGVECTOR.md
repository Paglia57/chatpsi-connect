# Planos de ação em pgvector (catálogo próprio)

Substitui o assistant + vector store da OpenAI para o "plano de ação" por um **catálogo
próprio em pgvector**. O admin sobe os PDFs de ficha; o sistema extrai **título + resumo +
link** do conteúdo do PDF, gera **embedding** (`text-embedding-3-small`) e indexa. A tool
`plano_de_acao` busca por similaridade e devolve resumo + link no formato exato.

> **Sem Google Drive:** o link é apenas TEXTO copiado de dentro do PDF, repassado ao
> psicólogo para ele mesmo abrir.

## Transição (com fallback)
A tool `plano_de_acao` (`_shared/tools/planoDeAcao.ts`):
- **Catálogo vazio** (nenhuma ficha ativa) → usa o **assistant atual da OpenAI** (fallback,
  zero regressão).
- **Catálogo populado** → busca pgvector; retorna até K fichas no formato exato, ou
  "não encontrei" se nada passar do limiar. O link vem **sempre** da tabela.

## Componentes
| Camada | Arquivo |
|---|---|
| Migration (extensão vector, tabela, índice hnsw, RPC) | `supabase/migrations/20260626120000_planos_de_acao_pgvector.sql` |
| Embeddings/complete | `supabase/functions/_shared/llm/embeddings.ts` |
| Admin (ingest/update/reindex/search) | `supabase/functions/planos-acao-admin/index.ts` |
| Tool de busca | `supabase/functions/_shared/tools/planoDeAcao.ts` |
| Painel admin | `src/pages/AdminPlanosAcaoPage.tsx` → rota `/admin/planos-acao` |

### Tabela `planos_de_acao`
`titulo`, `resumo`, `link`, `arquivo_origem`, `hash` (UNIQUE, dedupe), `embedding vector(1536)`,
`revisado`, `ativo`, `criado_em`, `atualizado_em`. RLS: SELECT só `is_admin()`; escrita só via
a Edge Function (service_role após validar `is_admin`). Busca via `match_planos_de_acao(query_embedding, threshold, count)`.

### Parsing do PDF (ingest)
- **Título** = primeira linha não vazia.
- **Link** = primeira URL `https://drive.google.com/...` (fallback: primeira `https://`).
- **Resumo** = texto entre o título e o link (limpo). Se vazio ou muito longo → gera/condensa
  via `complete()` e marca `revisado=false`.
- **Dedupe** por `hash` (SHA-256 do texto): re-subir o mesmo PDF **atualiza**, não duplica.
- `revisado=true` só quando a extração veio limpa (título + resumo + link, sem fallback).

## Tela de admin (`/admin/planos-acao`, só admin)
- **Upload múltiplo** (arrastar vários PDFs): 1 chamada por arquivo; ao final, relatório
  (X novos, Y atualizados, Z com problema).
- **Lista/editar**: título, resumo, link, ativo. Salvar regenera o embedding e marca `revisado=true`.
- **Filtro "precisam de revisão"** (`revisado=false` ou sem link).
- **Reindexar embeddings** (botão).
- **Busca de teste**: digita uma consulta e vê as fichas com `score` para calibrar o limiar.

## Config (Supabase secrets, opcionais)
- `PLANO_MATCH_THRESHOLD` (default `0.35`) — similaridade mínima (cosseno) para retornar.
- `PLANO_MATCH_COUNT` (default `3`) — máximo de fichas retornadas.

## Formato de retorno (exato)
```
{nome}, aqui estão {N} planos de ação para {tema} que podem ajudar na sua prática clínica:

1. {titulo}
{resumo}
Link: {link}

2. ...
```
(Sem nome do psicólogo, começa por "Aqui estão...". Links em texto puro, sem markdown.)

## Fora de escopo
Acesso/integração ao Google Drive; geração de plano por IA; cópia de PDFs para Storage;
roteamento de embeddings para outro provedor.
