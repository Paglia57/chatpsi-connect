

## Plano: Migrar Marketing e Plano de Ação de n8n/webhook para OpenAI Assistants API direta

### Resumo
Mesmo padrão usado no Chat Clínico: eliminar webhooks intermediários e chamar a OpenAI Assistants API diretamente nas edge functions.

### 1. `supabase/functions/marketing_ai_dispatch/index.ts`

**Assistant:** `asst_RmdTDmgUPmKNSoXoQ4FMHip1`

Reescrever para:
- Autenticar usuário (manter lógica atual)
- Buscar/criar thread no perfil — novo campo `threads_marketing` na tabela `profiles`
- Enviar mensagem na thread com o `prompt`
- Criar run com o assistant_id, poll até completar (timeout 90s, intervalo 1.5s)
- Extrair resposta do assistant
- Retornar `{ success: true, generated_text: "..." }` — contrato com frontend se mantém idêntico

**Remover:** toda lógica de `MARKETING_AI_WEBHOOK_URL` e fetch ao webhook

### 2. `supabase/functions/busca_plano_dispatch/index.ts`

**Assistant:** `asst_esHKfSJcaMNF99QVrILGu6pW`

Reescrever para:
- Autenticar usuário (manter lógica atual)
- Usar `threads_plano` já existente no perfil (criar thread se não existir)
- Enviar `input_text` como mensagem na thread
- Criar run, poll até completar
- Salvar no `plano_chat_history` (manter registro como hoje)
- Retornar `{ success: true, response: { output: "..." } }` — contrato com frontend se mantém

**Remover:** fetch ao webhook `https://webhook.seconsult.com.br/webhook/buscaplano` e lógica de API key

### 3. Migration SQL

Adicionar coluna `threads_marketing` (text, nullable) na tabela `profiles` para persistir a thread do módulo de marketing.

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/marketing_ai_dispatch/index.ts` | Reescrever: webhook → OpenAI Assistants API direta |
| `supabase/functions/busca_plano_dispatch/index.ts` | Reescrever: webhook → OpenAI Assistants API direta |
| Migration SQL | Adicionar `threads_marketing` na tabela `profiles` |

### Sem alterações no frontend
Ambos os frontends (`MarketingInterface.tsx` e `BuscaPlanoInterface.tsx`) mantêm seus contratos de chamada e resposta inalterados.

