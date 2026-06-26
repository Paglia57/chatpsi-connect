# Migração do gateway `chat()`: Assistants → Responses API

A OpenAI **Assistants API é desligada em ago/2026**. Esta etapa troca a implementação
interna do gateway `_shared/llm` de Assistants v2 para a **Responses API**, mantendo a
**mesma interface `chat()`**. A troca é por env (`LLM_BACKEND`), com modo sombra para
validar paridade antes de virar a chave.

## Como ligar/desligar (rollback de 1 linha)
Supabase secrets:
- `LLM_BACKEND` = `assistants` (default) | `responses`
- `LLM_DEFAULT_MODEL` = `gpt-4.1-mini` (modelo da Responses)
- `LLM_SHADOW` = `false` | `true`
- `LLM_SHADOW_ALLOWLIST` = CSV de telefones/user_ids de teste (vazio = ninguém é sombreado)

> **Pré-requisito para `LLM_BACKEND=responses`:** as personas `clinico_web`,
> `clinico_whatsapp`, `vendas`, `marketing`, `plano_acao` precisam estar **preenchidas
> com o texto real** (hoje são placeholder). Sob `responses`, as instruções vêm do banco
> (`getPersona`); placeholder ⇒ instrução inválida. Preencha em `/admin/personas` antes.

## Arquitetura
- `_shared/llm/types.ts` — tipos públicos (`ChatOptions`, `ChatResult`, `ChatTool`, `ChatContentPart`).
- `_shared/llm/config.ts` — `getBackend()`, `PERSONA_ASSISTANT_MAP` (IDs antes hardcoded),
  `defaultModel()`, helpers de sombra.
- `_shared/llm/index.ts` — `chat()`: resolve instruções (persona) + assistant, escolhe o
  backend e dispara a sombra. Implementa o backend **Assistants** (reproduz o comportamento atual,
  com suporte a conteúdo rico: texto, imagem, arquivo).
- `_shared/llm/responses.ts` — backend **Responses**: `chatViaOpenAIResponses` (tool loop via
  `function_call_output`, estado por `previous_response_id`) e `chatStreamViaResponses`
  (SSE convertido para o formato Chat-Completions que o frontend já consome).
- `_shared/llm/shadow.ts` — roda a Responses em paralelo (best-effort) e grava em `llm_shadow_log`.
- `_shared/llm/toolrunner.ts` — execução compartilhada de tool handlers.

### Estado da conversa
`ChatResult.threadId` carrega o **thread id** (Assistants) ou o **previous_response_id**
(Responses). Os chamadores persistem esse valor no mesmo lugar de sempre
(`wa_sessions.thread_id`, `profiles.openai_thread_id`, `profiles.threads_marketing`,
`patients.openai_thread_id`) — sem mudar a lógica de persistência.

### Tools
`plano_de_acao` e `buscar_artigos` agora declaram `description` + `parameters` (JSON Schema),
exigidos pela Responses. Sob Assistants, o schema vive no Assistant e esses campos são ignorados.

## Chamadores migrados (todos via `chat()` com `personaSlug`)
| Função | persona | observação |
|---|---|---|
| `whatsapp-webhook` (vendas) | `vendas` | estado em `wa_sessions.thread_id` |
| `_shared/wa/state.ts` (clínico: evolução + livre) | `clinico_whatsapp` | tools clínicas + shadowKey=telefone |
| `_shared/tools/planoDeAcao.ts` | `plano_acao` | sem estado |
| `dispatch-message` (clínico web) | `clinico_web` | mídia → ChatContentPart[]; estado em `profiles.openai_thread_id` |
| `marketing_ai_dispatch` | `marketing` | estado em `profiles.threads_marketing` |

### Assistant por paciente (`create-patient-thread` + `generate-evolution`)
- Sob **assistants**: comportamento atual (cria Assistant+Thread por paciente; track 1 com streaming).
- Sob **responses**: `create-patient-thread` **não cria Assistant** (retorna ids nulos);
  `generate-evolution` monta o contexto a partir do histórico (`evolutions`) e encadeia via
  `previous_response_id` guardado em `patients.openai_thread_id`, com streaming Responses.

## Modo sombra (validação de paridade)
Com `LLM_SHADOW=true` e o `shadowKey` na allowlist, cada chamada (backend ativo = assistants)
roda também a Responses em paralelo — **sem entregar ao usuário** — e grava entrada/saídas,
latências e divergência em `llm_shadow_log` (visível só ao admin). Limitação: a run de sombra
roda sem `previous_response_id` (estado ativo é thread Assistants, incompatível), então a
comparação é mais fiel em turnos isolados.

## Diferença consciente de comportamento
- `dispatch-message` (web) **não** habilita as tools clínicas (igual ao comportamento atual,
  onde o assistant web não usava handlers locais). Pode ser ligado depois, se desejado.

## Fora de escopo
Roteamento multi-provedor (Gemini/Claude); pgvector do plano de ação; desligar o n8n;
histórico-próprio total (store:false / replay completo).

## Validação recomendada antes do flip
1. Preencher as 5 personas reais em `/admin/personas`.
2. `LLM_SHADOW=true` + allowlist de teste; gerar tráfego; comparar `llm_shadow_log`.
3. Em teste, `LLM_BACKEND=responses`; conferir tool loop, encadeamento e streaming.
4. Rollback = `LLM_BACKEND=assistants`.
