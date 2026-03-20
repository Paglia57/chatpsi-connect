

## Simplificar busca_plano_dispatch: usar webhook n8n

### Estratégia

Substituir toda a lógica de OpenAI Assistant (threads, polling, tool calls, vector store search) por uma chamada simples ao webhook n8n `https://webhook.seconsult.com.br/webhook/buscaplano`. O n8n já resolve tudo internamente e retorna a resposta pronta com links reais.

### Arquivo: `supabase/functions/busca_plano_dispatch/index.ts`

Reescrever para:
1. Autenticar o usuário (manter lógica existente)
2. Validar `input_text`
3. Enviar POST para `https://webhook.seconsult.com.br/webhook/buscaplano` com `{ input: input_text, user_id: userId }`
4. Receber resposta do n8n (array com `output` e `threadId`)
5. Salvar no `plano_chat_history` e retornar ao frontend

Remover: toda lógica de OpenAI (threads, runs, polling, tool calls, vector store search, `cancelActiveRuns`, `handleToolCalls`, `searchVectorStore`, `getAssistantVectorStoreId`, `openaiRequest`).

### Arquivo: `src/components/busca-plano/BuscaPlanoInterface.tsx`

Sem mudanças — o frontend já lê `response_json.output` corretamente.

### Fluxo

```text
Frontend envia input_text
  → Edge function autentica usuário
  → POST webhook n8n com { input, user_id }
  → n8n processa (OpenAI Assistant + vector store internamente)
  → Retorna [{ output: "...", threadId: "..." }]
  → Edge function salva no plano_chat_history
  → Retorna { success: true, response: { output } } ao frontend
```

### Observações
- O `reset_thread` não será mais gerenciado pela edge function (o n8n cria threads próprias)
- O botão "Nova conversa" no frontend limpará apenas o histórico visual local
- A URL do webhook pode ser armazenada como secret (`N8N_BUSCA_PLANO_URL`) ou hardcoded

