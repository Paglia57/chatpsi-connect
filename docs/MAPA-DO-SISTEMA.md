# Mapa do Sistema — ChatPsi

> Documento fiel ao código em `chatpsi-connect` (web app React + Supabase Edge Functions Deno/TS).
> Descreve o que existe **hoje**. Itens previstos mas não implementados estão marcados como
> **(planejado, ainda não disponível)**.

---

## 1. Panorama

O **ChatPsi** é um assistente clínico para psicólogos, com **dois canais** que compartilham o
mesmo banco de dados (Supabase/Postgres):

- **Web app** (React/Vite) — painel completo: pacientes, evolução clínica por IA, agenda,
  planejamento de sessão, chat clínico, busca de artigos/planos, marketing, perfil e admin.
- **WhatsApp** (API oficial / Cloud API) — o mesmo psicólogo opera por mensagens: escolher
  paciente, ditar/escrever evolução, agendar, planejar, consultar ficha e histórico, e
  conversar em "modo livre". **Em fase de testes** (com allowlist).

Os dois canais convergem nas mesmas tabelas: uma evolução salva no WhatsApp aparece no
histórico da web, e vice-versa, porque ambos gravam em `evolutions`/`appointments`/
`session_plans` isolados por `user_id`.

```
        ┌──────────────┐         ┌──────────────────────┐
        │   Web app     │        │  WhatsApp (oficial)   │
        │  (React/Vite) │        │  webhook + state.ts   │
        └──────┬───────┘         └──────────┬───────────┘
               │                            │
               └──────────┬─────────────────┘
                          ▼
              ┌──────────────────────────┐
              │  Supabase (Postgres+RLS) │
              │  Edge Functions (Deno)   │
              │  Gateway de IA (OpenAI)  │
              └──────────────────────────┘
```

---

## 2. Mapa de funcionalidades (por canal)

| Funcionalidade | Web | WhatsApp | Observações |
|---|:---:|:---:|---|
| Cadastro/ficha de paciente | ✅ | ✅ | Web tem ficha completa; WhatsApp cadastra 4 campos (nome, iniciais, abordagem, queixa) |
| Editar paciente | ✅ | ✅ | WhatsApp edita nome/iniciais/abordagem/queixa |
| Gerar evolução clínica (IA) | ✅ | ✅ | Texto ou áudio; web também aceita melhorar via chat |
| Ver/editar/excluir evolução | ✅ | parcial | WhatsApp mostra histórico recente (até 5); edição/exclusão completas só na web |
| Exportar evolução em PDF | ✅ | — | Só web |
| Agenda (criar/listar/status) | ✅ | ✅ | WhatsApp: agendar/remarcar/cancelar/colar link por conversa |
| Planejamento de sessão (IA) | ✅ | ✅ | Gera rascunho (objetivo/roteiro/técnicas/atenção/perguntas) |
| Plano de ação (catálogo pgvector) | ✅ | ✅ | Busca semântica + fallback no assistant legado |
| Chat clínico / modo livre | ✅ | ✅ | Consulta protocolos, dúvidas (com tools de artigos e planos) |
| Busca de artigos científicos | ✅ | via tool | Web tem tela; WhatsApp usa a tool no chat |
| IA de Marketing | ✅ | — | Só web |
| Calculadora Tributária (BETA) | ✅ | — | Só web |
| Perfil/preferências do psicólogo | ✅ | — | Abordagem padrão, especialidades, CRP, foto |
| Admin: usuários | ✅ | — | Só admin |
| Admin: personas da IA (versionadas) | ✅ | — | Só admin |
| Admin: planos de ação (catálogo) | ✅ | — | Só admin |
| Indique e Ganhe (referral) | ✅ | — | Quando habilitado nas configurações |
| Onboarding guiado (web) | ✅ | parcial | Web tem wizard; WhatsApp tem fluxo de cadastro |
| Assinaturas (Guru) | parcial | — | Estrutura pronta; webhook de cobrança **(planejado)** |
| Templates proativos (lembretes) | — | — | **(planejado, ainda não disponível)** |

---

## 3. Modelo de dados (tabelas principais)

Isolamento multi‑tenant: as tabelas clínicas têm `user_id` e RLS `auth.uid() = user_id`.
A ligação clínica é sempre por `user_id` (= `profiles.user_id`) + `patient_id`.

```
auth.users
   │
   ├─ profiles            perfil do psicólogo: nome, nickname, crp, whatsapp,
   │                      main_approach, specialties[], subscription_active,
   │                      default_thread_id, has_completed_onboarding…
   │
   ├─ patients            ficha: full_name, initials, approach, main_complaint,
   │     │                cid_10, dsm_5, medication, status, total_sessions,
   │     │                openai_thread_id (contexto clínico acumulado)…
   │     │
   │     ├─ evolutions    prontuário gerado: session_number, approach,
   │     │                input_type/content, output_content, audio_url,
   │     │                revision_history (jsonb)…
   │     │
   │     ├─ appointments  agenda: starts_at, duration_min, modality,
   │     │                meeting_link, status(agendado/realizado/cancelado/faltou)
   │     │
   │     └─ session_plans planejamento: objetivo, roteiro, tecnicas, atencao,
   │                      perguntas, livre, status(rascunho/salvo/usado),
   │                      used_in_evolution_id, appointment_id…
   │
   ├─ wa_sessions  estado do WhatsApp por telefone: kind(clinico/vendas),
   │               thread_id, locked_patient_id, mode, flow_step, flow_data(jsonb)
   ├─ wa_messages  histórico de mensagens do WhatsApp (role user/ai, usage)
   ├─ wa_leads     prospectos não cadastrados (phone, name)
   │
   ├─ ai_personas / ai_persona_versions   prompts versionados e editáveis (admin)
   ├─ planos_de_acao    catálogo pgvector (embedding 1536, match por cosseno)
   ├─ llm_shadow_log    auditoria do modo sombra (Assistants × Responses)
   │
   ├─ referral_codes / referral_redemptions / referral_settings   indicações
   ├─ notifications
   └─ calc_tributaria_history
```

**Ligações‑chave**
- `evolutions.patient_id`, `appointments.patient_id`, `session_plans.patient_id` → `patients.id`.
- `session_plans.used_in_evolution_id` → `evolutions.id` (rastreia plano "usado" numa evolução).
- `session_plans.appointment_id` → `appointments.id` (plano vinculado a um compromisso).
- `wa_sessions.locked_patient_id` → `patients.id` (paciente "travado" no WhatsApp).

**RLS (resumo)**
- Tabelas clínicas (`profiles`, `patients`, `evolutions`, `appointments`, `session_plans`,
  `messages`, referral/notifications): cada usuário só acessa as próprias linhas.
- `wa_*`: somente `service_role` (o webhook grava sem usuário autenticado).
- `ai_personas`, `ai_persona_versions`, `planos_de_acao`, `llm_shadow_log`: leitura só de admin;
  escrita por RPC `SECURITY DEFINER` (personas) ou edge function de serviço (catálogo).

---

## 4. Fluxo de uma mensagem no WhatsApp

```
mensagem/áudio/imagem do psicólogo
        │
        ▼
whatsapp-webhook  ── valida assinatura (HMAC) ── extrai conteúdo
        │
        ├─ mídia? → áudio→texto (Whisper) | imagem→texto (Vision) | PDF→texto (extract/OCR)
        │
        ▼
identidade (telefone → profiles / wa_sessions)
        ├─ não cadastrado → fluxo de vendas (persona 'vendas') + wa_leads
        ├─ assinante inativo → mensagem de renovação (uso clínico pausado)
        └─ assinante ativo → handleConversation (máquina de estado)
                                  │
                                  ▼
                    estado em wa_sessions (mode/flow_step/flow_data/locked_patient_id)
                                  │
                    roteia por: botão/lista (reply id) · comando de texto · contexto
                                  │
                                  ▼
                    ação (evolução, agenda, plano, etc.) → grava em Postgres
                                  │
                                  ▼
                    resposta (sendText/sendButtons/sendList) — sempre com próximo passo/saída
```

**Equivalente na web:** o psicólogo autentica (`/auth`), navega pelas telas (`/app/*`),
e cada ação chama Edge Functions / RPCs do Supabase que gravam nas mesmas tabelas.

---

## 5. Integrações e IA

### Gateway de capacidades (`_shared/llm/`)
Camada provider‑agnóstica. A função `chat()` seleciona o backend pela env **`LLM_BACKEND`**:
- **`assistants`** (padrão de produção): OpenAI **Assistants API v2** — usa `thread_id` persistido
  por `profiles.default_thread_id` / `patients.openai_thread_id` / `wa_sessions.thread_id`.
- **`responses`** (transição): OpenAI **Responses API** — encadeia por `previous_response_id`.

**Modo sombra** (`LLM_SHADOW`, padrão **desligado**): quando ligado, roda o Responses em paralelo
ao Assistants e grava as duas saídas em `llm_shadow_log` para comparação (não bloqueia o fluxo
nem afeta o usuário). Limitação consciente: o Responses roda sem estado anterior do thread.

### Personas no banco (`_shared/personas/` + `ai_personas`)
Prompts de sistema versionados e editáveis pelo admin (cada save = nova versão; há histórico e
rollback). Em runtime, `getPersona(slug)` lê a versão ativa; se faltar/for placeholder, cai para
um **baseline** versionado no código (nunca fica sem prompt). Personas completas hoje:
`prontuario_gerar`, `prontuario_refinar`, `paciente_thread`, `planejamento_sessao`. As demais
(`clinico_web`, `clinico_whatsapp`, `vendas`, `marketing`, `plano_acao`) seguem como
**placeholder no banco**, usando o assistant da OpenAI até a migração concluir.

### Plano de ação em pgvector (`planos_de_acao` + tool `planoDeAcao`)
Catálogo próprio com embeddings (`text-embedding-3-small`, 1536 dims, índice HNSW cosseno).
A tool gera o embedding da consulta e chama `match_planos_de_acao` (threshold 0.35, top 3).
**Fallback:** catálogo vazio ou sem match → cai para o assistant `plano_acao` legado.

### Tools do chat
- **`buscarArtigos`** — busca artigos científicos (via Perplexity), retorna conteúdo + links.
- **`planoDeAcao`** — busca semântica no catálogo (acima).

### Proativo / assinaturas
- **Assinaturas (Guru):** estrutura de dados pronta (`profiles.subscription_active/…`) e trigger
  que gera código de indicação ao ativar; o **webhook de cobrança da Guru é (planejado, ainda
  não disponível)**.
- **Onboarding/reativação:** web tem wizard; WhatsApp tem fluxo de cadastro de paciente. O modo
  `renovacao` existe como estado, com a validação de renovação **(planejada)**.
- **Templates proativos (lembretes de sessão, etc.):** **(planejado, ainda não disponível)**.

---

## 6. Documentos relacionados
- **`MANUAL-WEB-APP.md`** — passo a passo das telas do web app.
- **`MANUAL-WHATSAPP.md`** — guia de telas do WhatsApp (mensagens e botões reais).
- **`AUDITORIA-NAVEGACAO.md`** — inventário de saídas/botões do WhatsApp.
