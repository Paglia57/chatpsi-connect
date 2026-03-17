

## Plano: Migrar Chat Clínico do n8n para OpenAI Assistants API direto

### Contexto atual
A edge function `dispatch-message` salva a mensagem do usuário no banco, envia um webhook para o n8n (`N8N_WEBHOOK_URL`), que por sua vez chama a OpenAI Assistants API, e retorna a resposta. O fluxo é: **Frontend → Edge Function → n8n → OpenAI → n8n → Edge Function → DB**.

### Novo fluxo
**Frontend → Edge Function → OpenAI Assistants API → DB**. Chamada direta ao Assistant `asst_ghTrVWfzgh5vtW28qDs5MnRB`, eliminando o n8n como intermediário.

### Mudança: `supabase/functions/dispatch-message/index.ts`

Substituir toda a lógica de webhook por chamadas diretas à OpenAI Assistants API (v2):

1. **Manter**: Validação de userId, verificação de assinatura, salvamento da mensagem do usuário no banco
2. **Remover**: Toda a lógica de webhook/n8n (payload, fetch para `n8nWebhookUrl`)
3. **Adicionar**:
   - Usar `OPENAI_API_KEY` (já existe nos secrets) com header `OpenAI-Beta: assistants=v2`
   - Usar o Assistant ID fixo: `asst_ghTrVWfzgh5vtW28qDs5MnRB`
   - Buscar/criar Thread do usuário no campo `openai_thread_id` do perfil:
     - Se o perfil já tem `openai_thread_id`, usar esse
     - Se não tem, criar uma nova Thread via `POST /v1/threads` e salvar no perfil
   - Enviar mensagem na thread: `POST /v1/threads/{thread_id}/messages`
   - Criar run: `POST /v1/threads/{thread_id}/runs` com o assistant_id
   - Poll do run até `status === 'completed'` (com timeout de 90s e intervalo de 1.5s)
   - Buscar última mensagem do assistant: `GET /v1/threads/{thread_id}/messages?limit=1&order=desc`
   - Salvar resposta no banco como mensagem `assistant`
4. **Para arquivos** (áudio, imagem, etc.): Enviar a URL do arquivo como parte do conteúdo textual da mensagem na thread

### Sem alterações no frontend
O `ChatInterface.tsx` já chama `supabase.functions.invoke('dispatch-message', ...)` e espera `{ success, response }` — a interface do contrato se mantém idêntica.

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/dispatch-message/index.ts` | Reescrever: trocar webhook n8n por chamadas diretas à OpenAI Assistants API |

### Detalhes técnicos

- **N8N_WEBHOOK_URL** não será mais necessário por esta function (mas mantido nos secrets para outras functions que possam usar)
- O polling do run usa `while` com sleep de 1.5s e timeout de 90s
- Estados terminais do run: `completed`, `failed`, `cancelled`, `expired`, `incomplete`
- Se o run falhar, retorna erro amigável ao usuário

