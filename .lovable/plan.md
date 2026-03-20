

## Problema: Tool `plano_de_acao` recebe resposta vazia no backend

### Diagnóstico

No n8n, o nó do OpenAI Assistant executa a tool `plano_de_acao` **internamente** — ele faz a busca na vector store do assistant e retorna os resultados reais. Por isso os links do Google Drive são reais.

No app, a edge function `busca_plano_dispatch` intercepta o tool call `plano_de_acao` e retorna:
```json
{"status": "ok", "message": "Tool execution acknowledged by backend."}
```

O assistant recebe isso como resultado da busca, interpreta como "nenhum dado encontrado", e inventa links fictícios.

### Solução

Implementar a busca real na vector store do OpenAI dentro da `handleToolCalls`. Quando o tool call for `plano_de_acao`:

1. Buscar os `vector_store_ids` do assistant via `GET /assistants/{ASSISTANT_ID}`
2. Fazer uma busca via `POST /vector_stores/{id}/search` com o `user_query` dos argumentos
3. Retornar os resultados reais como output da tool

**Arquivo: `supabase/functions/busca_plano_dispatch/index.ts`**

```text
Fluxo corrigido:

Assistant chama plano_de_acao({"user_query": "ansiedade"})
  → Backend extrai user_query dos argumentos
  → Chama GET /assistants/{id} para obter vector_store_ids
  → Chama POST /vector_stores/{vs_id}/search com a query
  → Retorna os chunks de texto encontrados como tool output
  → Assistant formata resposta com dados reais (links do Drive, etc.)
```

### Mudanças no código

1. **Nova função `getAssistantVectorStoreId`**: busca o ID da vector store configurada no assistant
2. **Nova função `searchVectorStore`**: executa a busca e retorna os resultados formatados
3. **Alterar `handleToolCalls`**: quando o tool é `plano_de_acao`, executar a busca real em vez de retornar acknowledgment genérico

### Arquivos a modificar
- `supabase/functions/busca_plano_dispatch/index.ts` — implementar busca na vector store + redeploy

