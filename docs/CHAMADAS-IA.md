# Chamadas de IA do ChatPsi

Referência técnica de **onde**, **em quais situações** e **como** o ChatPsi usa Inteligência Artificial.

> A pasta `C:\Projetos\Chatpsi` contém dois subprojetos:
>
> - **`chatpsi-connect`** — app atual (React + Vite no frontend; Supabase **Edge Functions** em Deno/TypeScript no backend). É o código vivo, alvo da nova arquitetura.
> - **`migração api oficial e openai`** — workflows **n8n** legados + documentação da migração para a **WhatsApp Cloud API oficial**. Representa o fluxo antigo que está sendo substituído pelas Edge Functions.
>
> Regra de não-regressão durante a migração: **não tocar no n8n** enquanto ele roda em paralelo com as Edge Functions.

---

## 1. Visão geral

### Stack
- **Frontend:** React 18 + TypeScript + Vite.
- **Backend (novo):** Supabase Edge Functions (runtime **Deno**) + Postgres + Auth + Storage.
- **Orquestração (legada):** n8n (workflows em JSON).
- **Canal WhatsApp:** Cloud API **oficial** da Meta (novo) — antes via **uazapi** (legado/n8n).

### Providers de IA
| Provider | Usado para | Onde |
|---|---|---|
| **OpenAI — Assistants API v2** | Chat clínico, vendas, marketing, plano de ação | Edge Functions + n8n |
| **OpenAI — Chat Completions** | Geração/refino de prontuário, descrição de imagem (Vision) | Edge Functions + n8n |
| **OpenAI — Whisper (`whisper-1`)** | Transcrição de áudio (pt) | Edge Functions + n8n |
| **OpenAI — Responses API** | Leitura nativa de PDF (`input_file`) | n8n |
| **OpenAI — Files API** | Upload de documentos para o assistant | Edge Functions |
| **Perplexity (`sonar`)** | Busca de artigos científicos | Edge Functions + n8n |
| **Webhooks n8n** (`webhook.seconsult.com.br`) | Busca de artigos/planos delegada | Edge Functions chamam o webhook |

### Fluxo (alto nível)
```
  Frontend (React)        WhatsApp (Cloud API oficial)
        │                          │
        ▼                          ▼
 ┌─────────────────────────────────────────────┐
 │      Supabase Edge Functions (Deno)          │
 │  dispatch-message · generate/improve-evolution│
 │  create-patient-thread · marketing_ai_dispatch│
 │  whatsapp-webhook (máquina de estado)         │
 │  _shared/llm · _shared/media · _shared/tools  │
 └───────┬───────────────┬──────────────┬───────┘
         ▼               ▼              ▼
     OpenAI         Perplexity      n8n webhooks
 (Assistants/Chat/   (sonar)     (buscaartigos/
  Whisper/Vision/                  buscaplano)
  Files)                              │
         │                            ▼
         └──────────────► Postgres (Supabase)
```

### Assistants OpenAI em uso
| Assistant ID | Papel | Onde é referenciado |
|---|---|---|
| `asst_ghTrVWfzgh5vtW28qDs5MnRB` | Clínico (WhatsApp) | `_shared/wa/state.ts:59`, n8n |
| `asst_4sei53DAsGVYUhyZzp3BsLJZ` | Clínico (chat web) | `dispatch-message/index.ts:11` |
| `asst_TjXksuG8kL3Gp6xLb1QIQALE` | Vendas / leads | `whatsapp-webhook/index.ts:17`, n8n |
| `asst_RmdTDmgUPmKNSoXoQ4FMHip1` | Marketing | `marketing_ai_dispatch/index.ts:10` |
| `asst_esHKfSJcaMNF99QVrILGu6pW` | Plano de ação (tool) | `_shared/tools/planoDeAcao.ts:7`, n8n |
| (dinâmico) `ChatPsi - <iniciais>` | Assistant por paciente | criado em `create-patient-thread/index.ts:104` |

---

## 2. Tabela-resumo de todas as chamadas

| Situação / Funcionalidade | Provider | Modelo / Assistant | Parâmetros-chave | Arquivo:linha | Status |
|---|---|---|---|---|---|
| Gateway provider-agnóstico `chat()` | OpenAI Assistants v2 | (assistant do chamador) | polling 90s / 1,5s; resolve tool calls | `_shared/llm/index.ts` | Produção |
| Chat clínico (web) | OpenAI Assistants v2 + Whisper + Vision + Files | `asst_4sei53DAsGVYUhyZzp3BsLJZ`, `whisper-1`, Vision, Files API | thread por usuário; áudio→pt; doc→`purpose: assistants` | `dispatch-message/index.ts:11` | Produção |
| Geração de prontuário | OpenAI Assistants v2 **ou** Chat Completions + Whisper | `gpt-4.1-mini` | `stream: true`; system prompt clínico; `whisper-1` pt | `generate-evolution/index.ts:358` | Produção |
| Refino de prontuário | OpenAI Chat Completions + Whisper | `gpt-4.1-mini` | `stream: true`; tee p/ persistir revisão | `improve-evolution/index.ts:172` | Produção |
| Criar Assistant+Thread por paciente | OpenAI Assistants v2 | cria assistant `gpt-4.1-mini` | system prompt clínico | `create-patient-thread/index.ts:106` | Produção |
| Conteúdo de marketing | OpenAI Assistants v2 | `asst_RmdTDmgUPmKNSoXoQ4FMHip1` | thread de marketing reutilizada; polling 90s | `marketing_ai_dispatch/index.ts:10` | Produção |
| WhatsApp — máquina de estado (clínico/vendas) | OpenAI Assistants v2 | clínico `asst_ghTr...` / vendas `asst_TjXk...` | tools `plano_de_acao`, `buscar_artigos` | `whatsapp-webhook/index.ts:17`, `_shared/wa/state.ts:59` | Produção |
| Tool: plano de ação | OpenAI Assistants v2 | `asst_esHKfSJcaMNF99QVrILGu6pW` | sem thread (execução nova) | `_shared/tools/planoDeAcao.ts:7` | Produção |
| Tool: buscar artigos | Perplexity | `sonar` | temp 0.2, top_p 0.9, freq_penalty 1, search_context_size low | `_shared/tools/buscarArtigos.ts:37` | Produção |
| Áudio → texto | OpenAI Whisper | `whisper-1` | `language: pt` | `_shared/media/toText.ts:67` | Produção |
| Imagem → texto (Vision) | OpenAI Chat Completions | `gpt-4o-mini` | prompt de descrição em pt | `_shared/media/toText.ts:18,97` | Produção |
| PDF → texto | `unpdf` + OCR fallback (Vision) | `gpt-4o-mini` (fallback) | máx. 10 páginas OCR; teto 100k chars | `_shared/media/toText.ts:15-18` | Produção |
| Busca de artigos (delegada) | Webhook n8n | — | `webhook.seconsult.com.br/webhook/buscaartigos` | `busca_artigos_dispatch/index.ts` | Produção |
| Busca de plano (delegada) | Webhook n8n | — | `.../buscaplano`; timeout 120s | `busca_plano_dispatch/index.ts` | Produção |
| **[n8n legado]** Chat clínico/vendas | OpenAI Assistants v2 | mesmos assistant IDs | nós `@n8n/...langchain.openAi` | `n8n/ChatPsi - WhatsApp.json` | Migração |
| **[n8n legado]** Transcrição áudio | OpenAI Whisper | `whisper-1` | `POST /v1/audio/transcriptions` | `n8n/[GLOBAL] Buffer de mensagens.json:434` | Migração |
| **[n8n legado]** Descrição de imagem | OpenAI Vision | `gpt-4o-mini` | `POST /v1/chat/completions` | `n8n/[GLOBAL] Buffer de mensagens.json:571` | Migração |
| **[n8n legado]** Leitura de PDF | OpenAI Responses API | `gpt-4.1-nano` | `POST /v1/responses`, `input_file` | `n8n/[GLOBAL] Buffer de mensagens.json:903` | Migração |
| **[n8n legado]** Artigos científicos | Perplexity + Agent LangChain | `sonar` + `gpt-4o-mini` | ⚠️ API key hardcoded | `n8n/Buscar artigos científicos - Perplexity V2.json` | Migração |
| **[n8n legado]** Plano de ação | OpenAI Assistants v2 | `asst_esHKfSJcaMNF99QVrILGu6pW` | — | `n8n/Busca plano de acao.json` | Migração |

---

## 3. Detalhe das chamadas — `chatpsi-connect` (Edge Functions)

### 3.1 Gateway LLM provider-agnóstico — `_shared/llm/index.ts`
- **Situação:** ponto único pelo qual todo chat com assistant passa (clínico, vendas, marketing, plano de ação). Esconde a OpenAI atrás da função `chat()` para permitir trocar de provider no futuro mexendo só neste arquivo.
- **Como funciona:** garante/reaproveita uma thread → adiciona mensagem do usuário → cria run → **polling** (`POLL_TIMEOUT_MS = 90s`, `POLL_INTERVAL_MS = 1,5s`) → em `requires_action`, executa os **handlers locais das tools** e envia `submit_tool_outputs` → lê a última mensagem do assistant e o `usage` de tokens.
- **Provider/Modelo:** OpenAI **Assistants API v2** (`https://api.openai.com/v1`, header `OpenAI-Beta: assistants=v2`). O modelo fica configurado no próprio assistant na OpenAI.
- **Prompt:** nenhum aqui — o system prompt vive no assistant na OpenAI.
- **Chave:** `OPENAI_API_KEY` via `Deno.env.get()`.

### 3.2 Chat clínico web — `dispatch-message/index.ts`
- **Situação:** o profissional conversa em tempo real com a IA clínica pela interface web (`src/components/chat/ChatInterface.tsx`). Aceita texto, áudio, imagem, documento e vídeo.
- **Como funciona:** valida JWT e assinatura ativa → processa o anexo → cria/reutiliza a thread da OpenAI (salva em `profiles.openai_thread_id`) → envia a mensagem → cria run → polling até concluir → salva a resposta na tabela `messages`.
- **Processamento de mídia:**
  - **Áudio:** `transcribeAudio()` → Whisper `whisper-1`, `language: pt`.
  - **Imagem:** download → base64 → bloco `image_url` (Vision).
  - **Documento:** upload via **Files API** (`purpose: assistants`) e anexa o `file_id`.
- **Provider/Modelo:** Assistants v2 — `ASSISTANT_ID = asst_4sei53DAsGVYUhyZzp3BsLJZ` (`:11`); `whisper-1` (`:76`).
- **Chaves:** `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### 3.3 Geração de prontuário — `generate-evolution/index.ts`
- **Situação:** gera a **evolução clínica** estruturada a partir do relato (texto ou áudio) da sessão. Disparada em `src/pages/app/EvolutionPage.tsx`; salva em `evolutions`.
- **Como funciona (duas rotas):**
  - **Com `patient.openai_thread_id`:** adiciona mensagem à thread do paciente, cria run com `stream: true`, processa eventos SSE (`thread.message.delta`) e os converte para o formato Chat Completions esperado pelo cliente.
  - **Sem thread (avulso):** **Chat Completions** `gpt-4.1-mini` com `stream: true` (`:358`).
  - **Áudio:** transcrito antes via Whisper `whisper-1`, `language: pt` (`:141-145`).
- **Prompt:** `SYSTEM_PROMPT` (`:8-59`) — "especialista em saúde mental clínica"; regras de sigilo (só iniciais, nunca inventar dados); **estrutura obrigatória** de 8 seções (IDENTIFICAÇÃO, QUEIXA, RELATO, ESTADO MENTAL, INTERVENÇÕES, EVOLUÇÃO E ANÁLISE, CONDUTA, PLANEJAMENTO); **adaptação por abordagem** (TCC, Psicanálise, Humanista, Fenomenologia Existencial, Comportamental, Sistêmica, Gestalt, Psicodrama).
- **Chave:** `OPENAI_API_KEY`.

### 3.4 Refino de prontuário — `improve-evolution/index.ts`
- **Situação:** melhora uma evolução já gerada a partir de um pedido (texto ou áudio) do profissional. Hook `src/hooks/useEvolutionImprovement.ts`.
- **Como funciona:** valida evolução + pedido → transcreve áudio se houver (Whisper) → Chat Completions `gpt-4.1-mini` com `stream: true` (`:172`) → **tee** da stream: uma branch vai ao cliente, a outra agrega e **persiste a revisão** em `evolutions.revision_history` via `EdgeRuntime.waitUntil()` (não bloqueia a resposta).
- **Prompt:** `SYSTEM_PROMPT` (`:8-34`) — refinador que **preserva a estrutura** e os cabeçalhos, não inventa dados, devolve só o prontuário reescrito.
- **Chave:** `OPENAI_API_KEY`.

### 3.5 Criar Assistant + Thread por paciente — `create-patient-thread/index.ts`
- **Situação:** ao cadastrar um paciente, cria um **Assistant dedicado** e uma **thread** na OpenAI para manter continuidade entre sessões. Salva `openai_assistant_id` e `openai_thread_id` em `patients`.
- **Como funciona:** `POST /assistants` (com instruções clínicas, modelo `gpt-4.1-mini`, `:106`) → `POST /threads` → `POST /threads/{id}/messages` com o contexto inicial (iniciais, abordagem, queixa, CID-10, DSM-5, medicação).
- **Prompt:** `CLINICAL_SYSTEM_PROMPT` (`:8-34`) — assistente clínico que acompanha a evolução e gera prontuário em 8 seções.
- **Chave:** `OPENAI_API_KEY`.

### 3.6 Conteúdo de marketing — `marketing_ai_dispatch/index.ts`
- **Situação:** gera textos/conteúdo de marketing assistidos por IA.
- **Como funciona:** autentica → obtém/cria thread de marketing (`profiles.threads_marketing`) → envia prompt → cria run → polling 90s → retorna o texto.
- **Provider/Modelo:** Assistants v2 — `ASSISTANT_ID = asst_RmdTDmgUPmKNSoXoQ4FMHip1` (`:10`).
- **Chave:** `OPENAI_API_KEY`.

### 3.7 WhatsApp-first — `whatsapp-webhook/index.ts` + `_shared/wa/state.ts`
- **Situação:** atendimento via WhatsApp (Cloud API oficial da Meta) com **máquina de estado**. Recebe texto, áudio, imagem, documento e botões interativos.
- **Como funciona:** webhook valida assinatura da Meta → extrai mensagens → normaliza o número e resolve identidade → **gating por status de assinatura** → roteia:
  - **Não cadastrado →** fluxo de **vendas** (`SALES_ASSISTANT_ID = asst_TjXksuG8kL3Gp6xLb1QIQALE`, `:17`).
  - **Inativo →** fluxo de renovação.
  - **Ativo →** **máquina de estado clínica** (`_shared/wa/state.ts`).
- **Máquina de estado (`state.ts`):** assistant clínico `CLINICAL_ASSISTANT_ID = asst_ghTrVWfzgh5vtW28qDs5MnRB` (`:59`); regras de ouro: **comando vence estado** e **nada grava sem prévia/confirmação** (rascunho → prévia → confirmação); isolamento por psicólogo (LGPD). Tools disponíveis ao assistant: `plano_de_acao` e `buscar_artigos`.
- **Mídia:** resolvida por `_shared/media/toText.ts` (áudio→Whisper, imagem→Vision, PDF→unpdf/OCR).

### 3.8 Tools do assistant — `_shared/tools/`
- **`planoDeAcao.ts`** — acionada quando o assistant clínico decide gerar um plano. Chama `chat()` com `asst_esHKfSJcaMNF99QVrILGu6pW` (`:7`), **sem thread** (execução nova a cada chamada); a vector store / `file_search` já está configurada nesse assistant na OpenAI.
- **`buscarArtigos.ts`** — busca de artigos científicos via **Perplexity**:
  - Endpoint `https://api.perplexity.ai/chat/completions`, modelo `sonar` (`:37`).
  - Parâmetros: `temperature 0.2`, `top_p 0.9`, `top_k 0`, `presence_penalty 0`, `frequency_penalty 1`, `stream false`, `return_images false`, `return_related_questions false`, `web_search_options.search_context_size: 'low'`.
  - Mensagens: system `"Be precise and concise."` + user pedindo artigos de psicologia com título/autores/ano/resumo/link, **priorizando conteúdo em português do Brasil**.
  - Saída: conteúdo + lista de **links das citações** em texto puro.
  - Chave: `PERPLEXITY_API_KEY`.

### 3.9 Extração de mídia — `_shared/media/toText.ts`
- **Situação:** módulo compartilhado que converte mídia em texto (usado pelo WhatsApp e afins).
- **Áudio → texto:** `audioToText()` — Whisper `whisper-1`, `language: pt` (`:67`).
- **Imagem → texto:** `imageToText()` — Vision `gpt-4o-mini` (`VISION_MODEL`, `:18`) com `IMAGE_PROMPT` ("Descreva de forma objetiva e em português... incluindo qualquer texto visível").
- **PDF → texto:** `documentToText()` — extrai texto real com **`unpdf`**; se for PDF escaneado (média `< MIN_CHARS_PER_PAGE = 20` chars/página), faz **OCR de fallback** renderizando páginas como imagem e mandando para o Vision. Limites: `MAX_OCR_PAGES = 10`, `MAX_TEXT_CHARS = 100_000`.

### 3.10 Buscas delegadas a webhooks n8n
- **`busca_artigos_dispatch/index.ts`** — encaminha a query para `https://webhook.seconsult.com.br/webhook/buscaartigos` (headers `X-App-Source: lovable`, opcional `X-API-Key: BUSCA_ARTIGOS_API_KEY`); salva em `artigos_chat_history`. A IA roda dentro do n8n, fora do controle direto deste código.
- **`busca_plano_dispatch/index.ts`** — encaminha para `.../webhook/buscaplano` (timeout 120s); salva em `plano_chat_history`.

---

## 4. Detalhe das chamadas — migração / n8n (legado)

Workflows JSON na pasta `migração api oficial e openai/n8n/`. A maioria dos system prompts é gerenciada nos **Assistants da OpenAI** (não está inline nos JSONs). Credencial OpenAI no n8n: "OpenAi account".

- **Chat clínico e vendas** — `ChatPsi - WhatsApp.json`: nós `@n8n/n8n-nodes-langchain.openAi`, memory por `threadId`, mesmos assistant IDs (clínico `asst_ghTr...`, vendas `asst_TjXk...`). Tools `plano_de_acao` e `buscar_artigos` via tool loop.
- **Criação de threads** — `ChatPsi - WhatsApp.json` (nós "[OpenAI] Criar Thread"): `POST https://api.openai.com/v1/threads`, header `OpenAI-Beta: assistants=v2`, retry com 5s entre tentativas.
- **Transcrição de áudio** — `[GLOBAL] Buffer de mensagens.json:434`: `POST /v1/audio/transcriptions`, `whisper-1`, multipart.
- **Descrição de imagem** — `[GLOBAL] Buffer de mensagens.json:571`: `POST /v1/chat/completions`, `gpt-4o-mini`, conteúdo multimodal (texto "Descreva essa imagem" + `image_url` base64).
- **Leitura de PDF** — `[GLOBAL] Buffer de mensagens.json:903`: `POST /v1/responses` (**Responses API**), `gpt-4.1-nano`, com bloco `input_file` (PDF em base64) + `input_text`. **Nota:** isto é uso **válido** da OpenAI (a Responses API e o modelo `gpt-4.1-nano` existem; `input_file` é o mecanismo nativo de leitura de PDF) — não é um erro de endpoint/modelo.
- **Artigos científicos** — `Buscar artigos científicos - Perplexity V2.json`: `POST https://api.perplexity.ai/chat/completions`, `sonar`, mesmos parâmetros das Edge Functions; em seguida um **Agent LangChain** com `gpt-4o-mini` organiza/formata os links (plain text, sem `[]`/`()`). ⚠️ **API key da Perplexity hardcoded no JSON** (`:122`).
- **Plano de ação** — `Busca plano de acao.json`: nó OpenAI Assistant `asst_esHKfSJcaMNF99QVrILGu6pW` ("ChatPSI - V2 - Plano de ação").

---

## 5. Configuração de chaves (env / secrets)

Edge Functions leem via `Deno.env.get()`. No n8n, as chaves OpenAI usam a credencial "OpenAi account".

| Variável | Usada por |
|---|---|
| `OPENAI_API_KEY` | Todas as chamadas OpenAI (Edge Functions) |
| `PERPLEXITY_API_KEY` | `buscarArtigos.ts` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` | Auth, storage, acesso admin |
| `WHATSAPP_VERIFY_TOKEN` / `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_APP_SECRET` | WhatsApp Cloud API |
| `WA_TEST_ALLOWLIST` | Inerte (allowlist de teste removida em produção — não bloqueia mais ninguém) |
| `BUSCA_ARTIGOS_API_KEY` | (opcional) header do webhook n8n de busca de artigos |

No frontend, variáveis públicas via `import.meta.env.VITE_*` (Vite).

---

## 6. Observações e riscos

- ⚠️ **Chave da Perplexity hardcoded** em `migração api oficial e openai/n8n/Buscar artigos científicos - Perplexity V2.json:122` (`Authorization: Bearer pplx-...`). Deve ser movida para credencial/secret e a chave **rotacionada**.
- **Modelos em uso** (todos atuais/válidos): `gpt-4.1-mini` (prontuários / assistant por paciente), `gpt-4.1-nano` (leitura de PDF no n8n), `gpt-4o-mini` (Vision e organização de links), `whisper-1` (áudio), Perplexity `sonar` (artigos).
- **Threads fragmentadas** por canal/usuário (web em `profiles.openai_thread_id`, WhatsApp em `wa_sessions.thread_id`): atenção a contexto duplicado/perdido durante a migração.
- **Migração em andamento:** o objetivo é desligar o paralelo do n8n e migrar o número oficial para as Edge Functions; até lá, **não alterar os workflows n8n**.

---

*Documento gerado a partir da leitura do código em 2026-06-25. Caminhos relativos à raiz de cada subprojeto.*
