# ChatPsi Connect — Mapeamento Completo

> Documento de referência técnico e funcional do aplicativo **ChatPsi Connect**.
> Escrito para servir de contexto a outra IA/LLM: descreve **o que o produto é, o que faz e como está construído**, de forma autossuficiente (não exige acesso ao repositório para ser entendido).
>
> **Estado dos dados:** validado ao vivo no banco de produção (Supabase, projeto `rrdvivxdasezvhfbetra`) em junho/2026.
> **Tratamento de segredos:** nomes de variáveis, IDs de assistant OpenAI, URLs de webhook e o ref do projeto Supabase são reais; chaves/tokens estão mascarados (`eyJ...`, `sbp_***`).

---

## 1. TL;DR para IA

**ChatPsi Connect** é uma **plataforma SaaS de produtividade clínica para psicólogos brasileiros**. O profissional fala ou escreve o que aconteceu na sessão e a IA gera uma **evolução clínica estruturada** (prontuário). Em torno disso, oferece prontuário de pacientes, chat clínico com IA, busca de artigos científicos, estruturação de planos terapêuticos, gerador de copy de marketing e uma calculadora tributária PF×PJ. Tudo em português, com foco em LGPD/CFP.

| Fato | Valor |
|------|-------|
| Tipo | SaaS web (SPA), single-tenant por psicólogo |
| Público | Psicólogos/profissionais de saúde mental no Brasil (CRP) |
| Idioma | Português (pt-BR) |
| Frontend | React 18 + TypeScript + Vite 5 (SWC), React Router 6, TanStack Query 5, shadcn/ui + Tailwind 3 |
| Backend | Supabase (Postgres + Auth + Storage + Realtime + Edge Functions Deno) |
| IA | OpenAI (Assistants API v2, GPT-4.1-mini, Whisper, Vision) + workflows n8n |
| Origem do código | Projeto gerado/gerido via **Lovable** |
| Gerenciador de pacotes | Bun (com fallback npm) |
| Modelo de negócio | Freemium: trial de 2–3 usos/mês por feature; assinatura libera uso ilimitado |
| **Métricas de produção (jun/2026)** | **328 perfis** · **147 assinantes ativos** · 61 pacientes · 54 evoluções · 2.034 mensagens de chat · 28 textos de marketing · 0 resgates de referral |

**Como o produto se conecta (visão de 1 linha):**
`Frontend React (SPA)` → `Supabase (Auth/DB/Storage/Realtime)` → `Edge Functions Deno` → `OpenAI` e/ou `webhooks n8n (seconsult.com.br)`.

---

## 2. Proposta de valor

### Problema
Psicólogos gastam muito tempo com tarefas administrativas e de documentação: redigir evoluções/prontuários, organizar pacientes, buscar evidências científicas, produzir conteúdo de divulgação e entender a própria tributação. Esse trabalho consome tempo clínico e é propenso a inconsistência.

### Solução
Concentrar, num único app, ferramentas de IA especializadas no fluxo do psicólogo — com destaque para a **geração automática de evolução clínica** a partir de áudio ou texto da sessão.

### Diferenciais
- **Multimodal:** entrada por texto **ou áudio** (transcrição automática via Whisper, pt-BR).
- **Contexto persistente por paciente:** cada paciente recebe um **OpenAI Assistant + Thread** dedicados, mantendo continuidade entre sessões.
- **Modo avulso:** permite gerar evolução sem vincular a um paciente cadastrado (casos pontuais).
- **Privacidade por design:** prontuário usa **iniciais** em vez de nome completo; RLS por usuário; soft-delete; pensado para LGPD/CFP.
- **Freemium por feature:** cada ferramenta tem um limite mensal gratuito; assinatura remove os limites.

### Público-alvo
Psicólogos brasileiros com CRP, majoritariamente de consultório/clínica privada, dispostos a usar IA no fluxo clínico e atentos a sigilo profissional.

### Modelo de negócio
Freemium. O campo `profiles.subscription_active` decide se o usuário tem uso ilimitado. Os limites do plano gratuito são contados **por mês corrente, por feature** (hook `useTrialLimit`). A ativação de assinatura é refletida no banco — **o gateway de pagamento em si não está no repositório** (presumivelmente integrado por webhook externo que atualiza o perfil).

---

## 3. Visão de produto — Funcionalidades

O app tem **13 áreas funcionais**. Limites de trial referem-se a usuários sem assinatura ativa.

| # | Feature | Rota | O que faz | Limite trial |
|---|---------|------|-----------|--------------|
| 1 | **Painel inicial** | `/app` | Saudação personalizada, KPIs do mês, hero CTA dinâmico por estágio, atalhos, tour guiado, banner de onboarding/resgate | — |
| 2 | **Onboarding (5 passos)** | `/app` (wizard) | Prepara o psicólogo: boas-vindas → abordagem → 1º paciente → 1ª evolução → celebração (confetti) | — |
| 3 | **Evolução clínica IA** | `/app/evolucao` | Gera prontuário estruturado a partir de texto/áudio da sessão; editar, regenerar, melhorar via chat, exportar PDF, salvar | 2/mês |
| 4 | **Prontuário de pacientes** | `/app/pacientes`, `/app/pacientes/:id` | Lista com busca/filtros; ficha clínica completa (CID-10, DSM-5, queixa, medicação, config de sessão); histórico de evoluções | — |
| 5 | **Histórico de evoluções** | `/app/historico` | Lista cronológica de todas as evoluções com busca, filtros, visualização detalhada e ações (copiar/editar/PDF) | — |
| 6 | **Chat clínico IA** | `/chat` | Conversa em tempo real com Assistant clínico para dúvidas de manejo/diagnóstico; aceita anexos (imagem, áudio, PDF, vídeo) | — |
| 7 | **Busca de planos terapêuticos** | `/busca-plano` | Estrutura objetivos/intervenções a partir de descrição clínica (via workflow n8n) | 2/mês |
| 8 | **Busca de artigos científicos** | `/busca-artigos` | Pesquisa evidências/protocolos científicos (via workflow n8n) | 3/mês |
| 9 | **Marketing IA** | `/marketing` | Gera copy para redes sociais/divulgação do consultório; salva textos | 2/mês |
| 10 | **Calculadora tributária PF×PJ** | `/app/calculadora-tributaria` | Compara cenários PF (11%/20%) vs PJ (Simples Anexo III) com constantes 2026; refino por IA; cards de recomendação/ponto de virada/previdência | 2/mês |
| 11 | **Programa de indicação (referral)** | `/app/indicacoes`, `/admin/referrals` | Gera código único, compartilha, resgate por novos usuários, validação por admin, notificação em tempo real | — |
| 12 | **Perfil do psicólogo** | `/app/perfil` | Edita nome, apelido, CRP, WhatsApp internacional, abordagem, especialidades, avatar | — |
| 13 | **Painel Admin** | `/admin`, `/admin/referrals` | Gestão de perfis (editar/limpar thread/excluir), ranking de uso, validação de referrals, config de banner | — |

**Recursos transversais:** banner de limite de trial (`TrialLimitBanner`), tours por feature (`react-joyride` + `FirstTimeGuide`/`GuidedTour`), breadcrumb hierárquico, input de telefone internacional, player de áudio customizado, banner de cookies (LGPD), soft-delete de mensagens.

---

## 4. Arquitetura técnica

### Diagrama lógico (texto)

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend — React 18 SPA (Vite, porta 8080)                  │
│  • React Router 6 (rotas públicas + /app/* autenticadas)     │
│  • TanStack Query 5 (cache/data fetching)                    │
│  • AuthProvider (Context) sobre Supabase Auth                │
│  • shadcn/ui + Tailwind 3                                     │
└───────────────┬──────────────────────────────────────────────┘
                │ supabase-js (JWT no localStorage)
                ▼
┌──────────────────────────────────────────────────────────────┐
│  Supabase (projeto rrdvivxdasezvhfbetra)                     │
│  • Auth (email/senha, JWT 1h)                                │
│  • Postgres (15 tabelas, RLS por auth.uid())                 │
│  • Storage (buckets: avatars, chat-uploads, session-audios)  │
│  • Realtime (canais por thread_id no chat)                   │
│  • Edge Functions (Deno) ── ponte para serviços externos     │
└───────────────┬───────────────────────────┬──────────────────┘
                │                            │
                ▼                            ▼
   ┌────────────────────────┐   ┌──────────────────────────────┐
   │ OpenAI                 │   │ n8n (webhook.seconsult.com.br)│
   │ • Assistants API v2    │   │ • /webhook/buscaplano         │
   │ • GPT-4.1-mini         │   │ • /webhook/buscaartigos       │
   │ • Whisper (transcrição)│   └──────────────────────────────┘
   │ • Vision (imagens)     │
   └────────────────────────┘
```

### Stack detalhado (com versões)

**Core/build**
- React `18.3.1`, React DOM `18.3.1`, TypeScript `5.8.3`
- Vite `5.4.19` + `@vitejs/plugin-react-swc 3.11.0` (compilação SWC)
- `lovable-tagger 1.1.9` (apenas em dev — tagging de componentes do Lovable)
- Dev server na porta **8080**; alias `@` → `./src`

**Roteamento e dados**
- `react-router-dom 6.30.1`
- `@tanstack/react-query 5.83.0` (QueryClient global em `App.tsx`)

**UI**
- **shadcn/ui** (58 componentes em `src/components/ui/`) baseados em **Radix UI**
- `tailwindcss 3.4.17` (dark mode por classe, cores HSL via CSS vars), `tailwindcss-animate`, `@tailwindcss/typography`
- `lucide-react` (ícones), `sonner` (toasts), `next-themes` (tema), fontes Inter + Montserrat

**Formulários/validação**
- `react-hook-form 7.61.1` + `@hookform/resolvers 3.10.0` + `zod 3.25.76`

**Utilitários notáveis**
- `date-fns`, `recharts` (gráficos da calculadora), `canvas-confetti` (onboarding), `react-joyride` (tours), `embla-carousel-react`, `react-day-picker`, `input-otp`, `vaul`

**Backend client**
- `@supabase/supabase-js 2.55.0`

### Padrões arquiteturais
- **Autenticação:** `AuthProvider` (Context API) encapsula `supabase.auth`; sessão persistida em `localStorage` com auto-refresh de JWT. Rotas autenticadas vivem sob `<AppLayout>`; `/admin/*` é protegida adicionalmente por `AdminGuard` (RPC `is_admin()`).
- **Data fetching:** TanStack Query para cache/invalidação; chamadas diretas via `supabase.from(...)` e `supabase.functions.invoke(...)`.
- **Realtime:** chat usa canais Supabase por `thread_id` para sincronizar mensagens entre abas (com estados connected/reconnecting).
- **Persistência local:** `localStorage` para preferências, último input da calculadora e dismissals de banners.
- **Streaming:** geração/melhoria de evolução usa **SSE (Server-Sent Events)** a partir das Edge Functions.
- **Config TypeScript permissiva:** `strict: false`, `noImplicitAny: false`, `allowJs: true` — priorizando velocidade de iteração (típico de projeto Lovable).

---

## 5. Estrutura de pastas

```
chatpsi-connect/
├── src/
│   ├── App.tsx                 # Rotas + providers globais (QueryClient, Tooltip, Auth)
│   ├── main.tsx                # Entry point (render em #root)
│   ├── index.css / App.css     # Estilos globais + CSS vars do Tailwind
│   │
│   ├── pages/                  # Páginas por rota
│   │   ├── Index.tsx           # "/" — redirect condicional (auth ? /app : /auth)
│   │   ├── AuthCallbackPage.tsx, ResetPasswordPage.tsx
│   │   ├── ChatPage.tsx, BuscaPlanoPage.tsx, BuscaArtigosPage.tsx, MarketingPage.tsx
│   │   ├── AdminPage.tsx, AdminReferralsPage.tsx, NotFound.tsx
│   │   ├── app/                # Rotas autenticadas /app/*
│   │   │   ├── HomePage.tsx, EvolutionPage.tsx
│   │   │   ├── PatientsPage.tsx, PatientDetailPage.tsx
│   │   │   ├── HistoryPage.tsx, ProfilePage.tsx
│   │   │   ├── ReferralsPage.tsx, CalcTributariaPage.tsx
│   │   └── legal/              # PrivacyPolicy, Terms, CookiePreferences
│   │
│   ├── components/
│   │   ├── admin/ app/ auth/   # AdminGuard; AppLayout/AppSidebar; AuthProvider/AuthPage
│   │   ├── evolution/ chat/    # Input/Output/ImprovementChat; ChatInterface/ChatSidebar
│   │   ├── patients/ onboarding/ referral/
│   │   ├── busca-artigos/ busca-plano/ marketing/
│   │   ├── calc-tributaria/    # 9 componentes (form, output, cards, refino)
│   │   ├── cookies/ legal/
│   │   └── ui/                 # 58 componentes shadcn/ui + customizados
│   │
│   ├── hooks/                  # useAudioRecording, useFileUpload, useTrialLimit,
│   │                          # useReferralSettings, useResponsive, useInternationalPhone, ...
│   ├── lib/
│   │   ├── calc-tributaria/    # Lógica de cálculo PF/PJ 2026 (inss, irpf, simples,
│   │   │                       # cenarioPJ, cenariosPF, pontoVirada, recomendacao, ...)
│   │   ├── evolutionParser.ts  # Parse estruturado + export PDF
│   │   ├── countries.ts, logger.ts, utils.ts
│   │
│   └── integrations/supabase/
│       ├── client.ts           # Singleton supabase (URL + anon key)
│       └── types.ts            # Tipos gerados do schema (Database)
│
├── supabase/
│   ├── config.toml             # Config local + verify_jwt por function
│   ├── functions/              # Edge Functions Deno (ver §7)
│   │   └── _shared/calc-tributaria/   # Lógica tributária compartilhada com o front
│   └── migrations/             # ~51 migrations SQL (idempotentes)
│
├── public/                     # logo.png, logofavcon.png
├── docs/                       # Documentação (este arquivo)
├── README.md                   # ~27 KB
├── LGPD-IMPLEMENTATION-PLAN.md # ~34 KB (auditoria + plano LGPD)
├── package.json, vite.config.ts, tailwind.config.ts, tsconfig*.json
└── .env                        # VITE_SUPABASE_* (ver §12)
```

---

## 6. Modelo de dados (Postgres / Supabase)

**15 tabelas** no schema `public` (contagens de colunas confirmadas no banco ao vivo). Todas as tabelas de dados do usuário têm **RLS habilitado**, baseado em `auth.uid() = user_id`.

### Tabelas principais

**`profiles`** (28 colunas) — perfil do psicólogo (1:1 com `auth.users` via `user_id`)
`id, user_id, email, full_name, name, nickname, whatsapp, avatar_url, crp, main_approach, specialties[], subscription_active, subscription_tier, plan, subscription_id, subscribed_at, subscription_end, current_period_end, openai_thread_id, threads_plano, threads_artigos, threads_marketing, TokenCount, has_completed_onboarding, onboarding_step, seen_guides(jsonb), created_at, updated_at`
- Campos de assinatura e threads OpenAI são **protegidos**: o usuário não pode alterá-los por UPDATE direto (RLS restritiva); só via RPC `SECURITY DEFINER`/Edge Function.

**`patients`** (23 colunas) — pacientes do psicólogo
`id, user_id, full_name, initials, date_of_birth, gender, approach, main_complaint, cid_10, dsm_5, medication, notes, default_session_duration, default_session_type, session_day_time, session_frequency, status, openai_thread_id, openai_assistant_id, total_sessions, last_session_at, created_at, updated_at`
- Cada paciente tem **Assistant + Thread OpenAI próprios** (criados por Edge Function ao cadastrar).

**`evolutions`** (15 colunas) — evoluções clínicas geradas
`id, user_id, patient_id(FK patients), patient_initials, session_number, session_duration, session_type, approach, input_type(text|audio), input_content, output_content, audio_url, revision_history(jsonb), created_at, updated_at`

**`messages`** (10 colunas) — histórico do chat clínico
`id, user_id, thread_id, sender(user|assistant), content, type(text/Áudio/Imagem/...), media_url, metadata(jsonb), is_deleted, created_at`
- **Soft-delete** via `is_deleted`. Realtime do chat sincroniza por `thread_id`.

### Tabelas de histórico/suporte

| Tabela | Col. | Função |
|--------|------|--------|
| `artigos_chat_history` | 8 | Log das buscas de artigos (input, thread, http_status, response_json, error_message). Insert só por service_role. |
| `plano_chat_history` | 8 | Log das buscas de planos terapêuticos (mesma estrutura). |
| `marketing_texts` | 7 | Textos de marketing salvos (title, prompt, generated_text). |
| `calc_tributaria_history` | 5 | Histórico da calculadora (input jsonb, output jsonb). |
| `notifications` | 6 | Notificações in-app (type, message, seen). |
| `referral_codes` | 5 | Código único por usuário (code `PSI-XXXX`, total_redeemed). |
| `referral_redemptions` | 8 | Resgates (referrer_id, redeemed_by, code_used, status pending/approved/rejected, validated_by/at). Insert só via RPC. |
| `referral_settings` | 7 | Config global do programa (enabled, banner_title/description/button_text). |
| `user_roles` | 5 | Roles por usuário (enum `app_role`). |
| `userinativos` | 4 | Leads inativos (whatsapp, nome, thread). |
| `webhook_events` | 6 | Auditoria de webhooks (direction, payload, status_code, error). service_role apenas. |

### Enum
- `app_role`: `admin` | `user`

### Storage buckets (confirmados ao vivo)
- `avatars` — **público** (fotos de perfil)
- `chat-uploads` — **privado** (anexos do chat: áudio/imagem/documento; validação de MIME)
- `session-audios` — **privado** (áudios das sessões clínicas)

### Funções RPC (14 confirmadas no banco)
| RPC | Assinatura | Uso |
|-----|-----------|-----|
| `is_admin()` | — | Atalho `has_role(auth.uid(),'admin')` |
| `has_role(_user_id, _role app_role)` | | Verifica role |
| `generate_referral_code(p_user_id)` | uuid | Cria código único |
| `redeem_referral_code(p_code)` | text | Resgata código (validações) |
| `admin_approve_referral(p_redemption_id)` | uuid | Admin aprova resgate |
| `admin_reject_referral(p_redemption_id)` | uuid | Admin rejeita resgate |
| `admin_update_profile(p_user_id, p_email?, p_full_name?, p_whatsapp?, p_nickname?, p_subscription_active?)` | | Admin edita perfil |
| `admin_clear_thread(p_user_id)` | uuid | Limpa thread OpenAI |
| `admin_delete_profile(p_user_id)` | uuid | Exclui perfil (cascata) |
| `update_profile_basic_info(...)` | 2 overloads | Usuário edita dados básicos |
| `validate_file_type(filename)` | text | Valida tipo de arquivo |
| `handle_new_user()` | trigger | Cria perfil no signup |
| `on_subscription_activated()` | trigger | Gera referral ao ativar assinatura |
| `update_updated_at_column()` | trigger | Mantém `updated_at` |

### Triggers
- `on_auth_user_created` → `handle_new_user()` (cria `profiles` no cadastro)
- `update_updated_at_column()` em UPDATE das tabelas com `updated_at`
- `trigger_generate_referral_on_subscription` → `on_subscription_activated()`

---

## 7. Backend — Edge Functions (Deno)

**10 Edge Functions ATIVAS** no projeto (versões/`verify_jwt` confirmados via Management API). A coluna "Fonte" indica se o código está no repositório local.

| Function | verify_jwt | Versão | Fonte no repo | Propósito |
|----------|:---------:|:------:|:-------------:|-----------|
| `dispatch-message` | ✅ | v51 | ✅ | Chat clínico: salva mensagem, gerencia thread OpenAI, processa anexos (Whisper/Vision/Files), roda Assistant, salva resposta |
| `dispatch_message` | ✅ | v55 | ✅ | Variante de dispatch (caminho com webhook) — **duplicação** com a anterior |
| `receive-webhook-response` | ✅ | v9 | ⚠️ **ausente** | Recebe respostas assíncronas de webhook externo (n8n) — deployada mas **sem fonte no repositório local** |
| `busca_plano_dispatch` | ✅ | v40 | ✅ | Encaminha input para n8n `/webhook/buscaplano` (timeout 120s); persiste em `plano_chat_history` |
| `busca_artigos_dispatch` | ✅ | v29 | ✅ | Encaminha para n8n `/webhook/buscaartigos`; persiste em `artigos_chat_history` |
| `marketing_ai_dispatch` | ✅ | v28 | ✅ | Gera copy de marketing via Assistant `asst_RmdTDmgUPmKNSoXoQ4FMHip1`; salva em `marketing_texts` |
| `generate-evolution` | ❌* | v31 | ✅ | Gera evolução clínica (Whisper p/ áudio + GPT-4.1-mini); resposta em streaming SSE |
| `improve-evolution` | ❌* | v2 | ✅ | Refina evolução existente por prompt/áudio; streaming SSE |
| `create-patient-thread` | ❌* | v20 | ✅ | Cria Assistant + Thread OpenAI dedicados ao paciente, com contexto clínico inicial |
| `calc_tributaria_dispatch` | ❌* | v6 | ✅ | Refino por IA dos cálculos tributários (GPT-4.1-mini); usa lógica em `_shared/calc-tributaria/` |

> *As funções com `verify_jwt = false` validam a identidade **manualmente** (Bearer JWT no header → `supabase.auth.getUser`), em vez de delegar ao gateway. Usam `SUPABASE_SERVICE_ROLE_KEY` para operações privilegiadas.

**Observações de profundidade (resumo, sem transcrever prompts):**
- Os prompts de sistema das funções de IA impõem **estrutura clínica obrigatória**, adaptação de terminologia por abordagem (TCC, Psicanálise, Humanista, Sistêmica, Gestalt, Psicodrama, etc.) e regra explícita de **não inventar dados**, usando apenas **iniciais** do paciente (sigilo).
- O `calc_tributaria_dispatch` carrega constantes tributárias de 2026 e validações rígidas para evitar "alucinação" de números.

---

## 8. Integrações de IA e externas

### OpenAI
- **Assistants API v2** — contexto persistente por thread:
  - Chat clínico: Assistant `asst_4sei53DAsGVYUhyZzp3BsLJZ`
  - Marketing: Assistant `asst_RmdTDmgUPmKNSoXoQ4FMHip1`
  - **Por paciente:** cada paciente tem Assistant + Thread próprios (`patients.openai_assistant_id` / `openai_thread_id`), criados por `create-patient-thread`.
  - Threads por módulo no perfil: `profiles.openai_thread_id`, `threads_plano`, `threads_artigos`, `threads_marketing`.
- **GPT-4.1-mini** — geração/refino de evolução e refino tributário.
- **Whisper** — transcrição de áudio (pt-BR) em chat e evolução.
- **Vision** — análise de imagens anexadas ao chat (base64).
- **Files API** — anexos de documento no chat (file_search).

### n8n (workflows externos)
- Host: `https://webhook.seconsult.com.br`
- `/webhook/buscaplano` — estruturação de plano terapêutico (timeout estendido 120s; header `X-App-Source: lovable`).
- `/webhook/buscaartigos` — busca de artigos científicos.
- Respostas podem retornar de forma assíncrona via `receive-webhook-response`.

### Notificações/Realtime
- Notificações in-app na tabela `notifications`, com poller (`ReferralNotificationPoller`) no `AppLayout`.
- Realtime do Supabase no chat (canais por `thread_id`).

---

## 9. Fluxos de usuário (jornadas)

**A. Novo psicólogo → onboarding**
1. Cadastro em `/auth` (email/senha) → trigger `handle_new_user` cria `profiles`.
2. `/app` detecta `has_completed_onboarding = false` → abre `OnboardingWizard`.
3. Passos: boas-vindas → abordagem → cadastrar 1º paciente (cria Assistant/Thread) → gerar 1ª evolução → celebração (confetti).
4. Marca `has_completed_onboarding = true`; pode pular a qualquer passo (persiste `onboarding_step`).

**B. Gerar evolução (fluxo central)**
1. `/app/evolucao` → escolhe paciente (ou modo avulso) + abordagem + nº sessão + duração + modalidade.
2. Entrada por texto **ou** áudio (upload ou gravação via MediaRecorder).
3. `generate-evolution` (SSE): se áudio, transcreve com Whisper; gera evolução estruturada com GPT-4.1-mini.
4. Ações: editar inline, copiar, regenerar, **melhorar via chat** (`improve-evolution`), exportar PDF, salvar em `evolutions`.
5. Trial: 2 evoluções/mês para não-assinantes.

**C. Chat clínico**
1. `/chat` conecta Realtime. Usuário pergunta e pode anexar imagem/áudio/PDF/vídeo.
2. `dispatch-message` salva a mensagem, processa anexo (Whisper/Vision/Files), roda o Assistant e salva a resposta.
3. Histórico em `messages` (soft-delete), sincronizado entre abas.

**D. Referral**
1. Indicador gera código (`generate_referral_code`) em `/app/indicacoes` e compartilha.
2. Novo usuário resgata via `RedeemBanner` → `redeem_referral_code` cria resgate `pending`.
3. Admin valida em `/admin/referrals` (`admin_approve_referral`/`reject`); indicador é notificado.

**E. Admin**
1. `/admin` (protegido por `AdminGuard`/`is_admin()`): lista perfis, ranking por `TokenCount`, editar/limpar thread/excluir perfil.
2. `/admin/referrals`: validação de resgates e config de banner.

### Tipos de usuário
| Tipo | Descrição | Rotas |
|------|-----------|-------|
| Psicólogo (padrão) | Profissional de saúde mental | `/app/*`, `/chat`, `/busca-*`, `/marketing` |
| Admin | Gestão da plataforma | `/admin`, `/admin/referrals` |

---

## 10. Segurança e LGPD

- **RLS** habilitado em todas as tabelas de usuário (`auth.uid() = user_id`); tabelas de log (`artigos/plano_chat_history`, `webhook_events`) só aceitam insert por `service_role`.
- **Campos sensíveis protegidos** em `profiles` (assinatura, threads, TokenCount): não alteráveis por UPDATE direto do usuário.
- **JWT** (expiry 1h) no `localStorage` com auto-refresh; Edge Functions validam identidade (gateway ou manualmente).
- **Validação de upload** via `validate_file_type` e policies de Storage por `auth.uid()`/foldername; buckets privados para conteúdo clínico.
- **Privacidade por design:** uso de iniciais no prontuário, soft-delete em `messages`, banner de cookies (LGPD).
- **Conformidade documentada** em `LGPD-IMPLEMENTATION-PLAN.md`, com bases legais (Art. 7º V; Art. 11 II "a" — tutela da saúde; consentimento p/ marketing/cookies) e retenção (prontuário 20 anos — Res. CFP 001/2009).
- **Achados críticos registrados no plano LGPD** (pontos de atenção, não necessariamente resolvidos): transferência internacional de dados clínicos para OpenAI (EUA) sem cláusulas contratuais padrão formalizadas; publicação/contato de DPO; DPA formal com operadores (Supabase/OpenAI). Operadora declarada: **SECONSULT TECNOLOGIA E SAÚDE LTDA**.

---

## 11. Estado de produção (jun/2026)

Números reais coletados do banco de produção:

| Métrica | Valor | Leitura |
|---------|------:|---------|
| Perfis (psicólogos) | **328** | Base de usuários cadastrados |
| Assinantes ativos | **147** | ~45% de conversão para pago |
| Pacientes cadastrados | 61 | Prontuário em adoção inicial |
| Evoluções geradas | 54 | Feature central ainda em ramp-up |
| Mensagens de chat | 2.034 | Chat clínico é o recurso mais usado |
| Textos de marketing | 28 | Uso moderado |
| Resgates de referral | 0 | Programa ativo, porém sem tração ainda |

**Observações:**
- Produto **em produção real e monetizado** (147 assinantes), com forte uso do **chat** e adoção crescente das demais ferramentas.
- O **gateway de pagamento não está no repositório** — a assinatura é refletida em `profiles.subscription_active`, presumivelmente via webhook externo.
- O **programa de referral** está implementado de ponta a ponta mas ainda sem resgates.

---

## 12. Como rodar e fazer deploy

### Scripts (`package.json`)
| Script | Ação |
|--------|------|
| `npm run dev` / `bun dev` | Dev server em `http://localhost:8080` |
| `npm run build` | Build de produção (`dist/`) |
| `npm run build:dev` | Build com `lovable-tagger` |
| `npm run preview` | Preview do build |
| `npm run lint` | ESLint |

### Variáveis de ambiente

**Frontend (`.env`)** — *anon key é pública por design, mas está mascarada aqui:*
```
VITE_SUPABASE_PROJECT_ID="rrdvivxdasezvhfbetra"
VITE_SUPABASE_URL="https://rrdvivxdasezvhfbetra.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ...(anon key)"
```
> Observação: `src/integrations/supabase/client.ts` também traz URL e anon key **hardcoded** (padrão de projetos Lovable).

**Edge Functions (secrets no Supabase, via `Deno.env.get`)**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY     # mascarado
SUPABASE_ANON_KEY             # mascarado
OPENAI_API_KEY                # mascarado
BUSCA_ARTIGOS_API_KEY         # chave do webhook n8n — mascarado
```

### Deploy
- **Frontend:** via **Lovable** (Share → Publish) ou qualquer host estático (Vercel/Netlify/Cloudflare/S3). Não há `vercel.json`/`netlify.toml` no repo.
- **Edge Functions:** Supabase CLI — `supabase link --project-ref rrdvivxdasezvhfbetra` e `supabase functions deploy <nome>`.
- **Banco:** migrations em `supabase/migrations/` (idempotentes).

---

## 13. Gaps e observações para a outra IA

Pontos de atenção ao raciocinar sobre este código:

1. **Pagamento fora do repositório.** A monetização existe (147 assinantes), mas o gateway/checkout não está no código — `subscription_active` é a fonte de verdade, atualizada externamente.
2. **`receive-webhook-response` sem fonte local.** A function está ATIVA (v9) no Supabase mas seu código não está no repositório local — provável drift entre o deploy e o repo.
3. **Duplicação `dispatch-message` vs `dispatch_message`.** Duas funções com propósito semelhante; confirmar qual está em uso pelo frontend antes de alterar.
4. **Segredos hardcoded.** URL e anon key do Supabase aparecem fixos em `client.ts` além do `.env` (padrão Lovable). A anon key é pública, mas vale ter ciência.
5. **TypeScript permissivo.** `strict: false`, `noImplicitAny: false`, `no-unused-vars: off` — o compilador não pegará muitos erros de tipo; revisar com cuidado extra.
6. **Origem Lovable.** Código gerado/gerido por Lovable (`lovable-tagger`, `.lovable/plan.md`). Mudanças manuais podem conflitar com o fluxo do Lovable.
7. **Achados LGPD em aberto.** Ver `LGPD-IMPLEMENTATION-PLAN.md` — transferência internacional p/ OpenAI, DPO e DPAs são itens sinalizados como críticos.
8. **Constantes tributárias 2026.** A calculadora depende de constantes fiscais com data — precisam de manutenção anual; lógica vive em `src/lib/calc-tributaria/` e espelhada em `supabase/functions/_shared/calc-tributaria/`.

---

*Documento gerado a partir de exploração do repositório `chatpsi-connect` + validação ao vivo do banco de produção Supabase (`rrdvivxdasezvhfbetra`). Métricas refletem o estado em junho/2026.*
