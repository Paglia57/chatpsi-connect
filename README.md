# ChatPsi Connect

Plataforma SaaS para psicólogos que combina ferramentas clínicas, prontuário digital e assistentes de IA especializados em saúde mental, marketing e tributação. Desenvolvida em **React + TypeScript + Vite** com backend serverless no **Supabase** (Auth, Postgres, Storage, Realtime e Edge Functions).

> Projeto bootstrapped via Lovable: <https://lovable.dev/projects/76ba47cc-98a3-465d-9d4a-44ffa34188f7>

---

## Sumário

- [Visão Geral](#visão-geral)
- [Stack Técnica](#stack-técnica)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Modelo de Dados](#modelo-de-dados-supabase)
- [Edge Functions](#edge-functions)
- [Rotas da Aplicação](#rotas-da-aplicação)
- [Setup e Instalação](#setup-e-instalação)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Modelo de Trial / Assinatura](#modelo-de-trial--assinatura)
- [Programa de Indicação](#programa-de-indicação)
- [Deploy](#deploy)

---

## Visão Geral

O **ChatPsi Connect** é o app voltado ao psicólogo brasileiro, com o objetivo de:

- **Documentar sessões** com IA (texto ou áudio → evolução clínica estruturada por abordagem).
- **Gerenciar prontuários** dos pacientes (ficha clínica, histórico, CID-10, DSM-5, medicação, abordagem).
- **Consultar IA clínica especializada** (chat, busca em artigos científicos, planos terapêuticos).
- **Apoiar a gestão do consultório** (calculadora tributária PF×PJ, gerador de conteúdo de marketing).
- **Crescer via indicação** (sistema de referral codes com painel administrativo).

Toda a inteligência roda em **Edge Functions Deno** consumindo a API da OpenAI (Assistants API + Whisper + Chat Completions com streaming) e workflows externos hospedados em **n8n**.

---

## Stack Técnica

### Frontend

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 (plugin SWC) |
| Roteamento | React Router DOM 6 |
| State / Cache | TanStack Query 5 |
| Estilo | Tailwind CSS 3 + tailwindcss-animate + tailwind-typography |
| Componentes | shadcn/ui (Radix UI primitives) — 50+ componentes em `src/components/ui/` |
| Formulários | React Hook Form + Zod |
| Ícones | lucide-react |
| Notificações | sonner + radix toast |
| PDF / Exportação | utilitário próprio em `lib/evolutionParser.ts` |
| Onboarding tour | react-joyride |
| Confetti | canvas-confetti (celebração no fim do onboarding) |
| Tema | next-themes |

### Backend / Plataforma

| Componente | Provedor |
|---|---|
| Banco | Supabase Postgres (com RLS em todas as tabelas) |
| Autenticação | Supabase Auth (email/senha, recovery via callback) |
| Storage | Supabase Storage (buckets para áudio, mídia e avatares) |
| Realtime | Supabase Realtime (canais por `thread_id` no chat) |
| Funções serverless | Supabase Edge Functions (Deno) |
| IA Generativa | OpenAI Assistants API + Chat Completions (`gpt-4.1-mini`) + Whisper |
| Workflows externos | n8n (`webhook.seconsult.com.br`) para Busca de Planos e Artigos |

---

## Funcionalidades

### 1. Painel Inicial (`/app`)
- Saudação personalizada (apelido / primeiro nome).
- KPIs do mês: evoluções geradas e pacientes em acompanhamento.
- Hero CTA dinâmico (muda conforme o estágio do usuário: sem paciente → cadastrar; com paciente → gerar evolução).
- Atalhos para todos os módulos.
- Tour guiado (react-joyride) na primeira sessão e tooltip contextual da sidebar.

### 2. Onboarding em 5 passos (`OnboardingWizard`)
1. **Boas-vindas** — apresentação.
2. **Perfil clínico** — abordagem principal e especialidades.
3. **Primeiro paciente** — cadastro guiado.
4. **Primeira evolução** — gera uma evolução real para o paciente recém-criado.
5. **Celebração** — confetti + resumo, marca `has_completed_onboarding = true`.

Permite **pular** com persistência do passo (`onboarding_step`) e exibe banner de retomada (até 3 dispensas).

### 3. Evolução Clínica com IA (`/app/evolucao`)
- Entrada por **texto** ou **upload/gravação de áudio** (Whisper transcreve em pt-BR).
- Seleção de paciente, abordagem (TCC, Psicanálise, Humanista, Comportamental, Sistêmica, Gestalt, Psicodrama, Outra), número da sessão, duração e modalidade.
- Geração via **streaming SSE** da edge function `generate-evolution` (modelo `gpt-4.1-mini`).
- Estrutura padronizada: Identificação, Queixa, Relato, Estado Mental, Intervenções, Análise Clínica, Conduta, Planejamento.
- Adaptação automática da terminologia conforme abordagem.
- Edição inline e salvamento no prontuário do paciente.
- Exportação em **PDF** com layout próprio.
- **Limite trial:** 2 evoluções/mês para não-assinantes.

### 4. Prontuário de Pacientes (`/app/pacientes` e `/app/pacientes/:id`)
- Lista com busca, filtros (abordagem, status: ativo/pausado) e ordenação (nome, última sessão, total de sessões).
- Avatar com iniciais, badges e quick stats.
- Ficha clínica completa: nome, iniciais, gênero, data nascimento, CID-10, DSM-5, queixa principal, medicação, notas, abordagem, frequência, dia/horário, tipo e duração padrão da sessão.
- Cada paciente possui seu próprio **OpenAI Assistant + Thread** (`openai_assistant_id`, `openai_thread_id`) para contexto persistente nas evoluções.
- Histórico de evoluções vinculadas (FK `evolutions.patient_id → patients.id`).

### 5. Histórico de Evoluções (`/app/historico`)
- Lista cronológica com busca e filtros.
- Visualização detalhada com seções colapsáveis (parser próprio em `evolutionParser.ts`).
- Ações: copiar, editar, deletar, exportar PDF.
- Preview compacto por evolução.

### 6. Chat Clínico (`/chat`)
- Conversa via **OpenAI Assistant** (`asst_4sei53DAsGVYUhyZzp3BsLJZ`) para dúvidas clínicas, CID-10, protocolos, manejo de casos.
- Suporte a **anexos**: imagem, áudio (transcrito), PDF, DOCX, vídeo.
- **Realtime** via Supabase Channels (sincroniza mensagens entre abas).
- Indicador de status de conexão (connected/disconnected/reconnecting), retry automático.
- Sugestões iniciais e indicador "está digitando".
- Histórico persistente em `messages` (com soft-delete via `is_deleted`).

### 7. Busca de Planos Terapêuticos (`/busca-plano`)
- Estrutura objetivos e intervenções terapêuticas com IA.
- Backend: edge function `busca_plano_dispatch` → workflow n8n (`webhook.seconsult.com.br/webhook/buscaplano`), timeout 120s.
- Histórico individual em `plano_chat_history` (input/output/erro/HTTP status).
- **Limite trial:** 2 análises/mês.

### 8. Busca de Artigos Científicos (`/busca-artigos`)
- Pesquisa de evidências científicas para hipóteses diagnósticas e protocolos.
- Backend: edge function `busca_artigos_dispatch` → workflow n8n (`webhook.seconsult.com.br/webhook/buscaartigos`).
- Histórico em `artigos_chat_history`.
- **Limite trial:** 3 buscas/mês.

### 9. IA de Marketing (`/marketing`)
- Geração de copy para redes sociais e divulgação do consultório.
- Backend: edge function `marketing_ai_dispatch` (OpenAI Assistant `asst_RmdTDmgUPmKNSoXoQ4FMHip1`).
- Salvamento de textos em `marketing_texts` (título, prompt, texto gerado).
- **Limite trial:** 2 textos/mês.

### 10. Calculadora Tributária PF × PJ (`/app/calculadora-tributaria`)
- Compara três cenários (PF 11% sobre mínimo, PF 20%, PJ Simples Anexo III) com **constantes tributárias 2026**.
- Cálculo determinístico no frontend (`src/lib/calc-tributaria/`): IRPF, INSS, Simples Nacional, ponto de virada PF×PJ, recomendação personalizada.
- Refinamento por IA via edge function `calc_tributaria_dispatch` (modelo `gpt-4.1-mini` com prompt sistêmico extenso e validações rígidas — sem invenções).
- Cards: hero result, cenários comparativos, ponto de virada, premissas, previdência, disclaimer.
- Persistência do último input em localStorage + histórico em `calc_tributaria_history`.
- **Limite trial:** 2 análises/mês.

### 11. Programa de Indicação (`/app/indicacoes`)
- Cada usuário recebe um **código único** (RPC `generate_referral_code`).
- Compartilhamento nativo (Web Share API) + cópia.
- Resgate por novos usuários através de banner (`RedeemBanner`).
- Painel administrativo de validação (`/admin/referrals`): aprovar/rejeitar, ranking de indicadores, configurações do banner.
- Notificações em tempo real via `ReferralNotificationPoller` e tabela `notifications`.
- Toggle global `enabled` em `referral_settings`.

### 12. Perfil (`/app/perfil`)
- Dados pessoais (nome completo, apelido, CRP, WhatsApp internacional).
- Abordagem principal + especialidades (multi-select com opção "Outra").
- Avatar com upload para Supabase Storage.
- RPC `update_profile_basic_info` para atualizações sensíveis.

### 13. Painel Admin (`/admin` e `/admin/referrals`)
- Protegido por `AdminGuard` (RPC `is_admin`, role `admin` em `user_roles`).
- Listagem de perfis com busca, ordenação por TokenCount.
- Edição de profile (RPC `admin_update_profile`).
- Limpeza de threads OpenAI (RPC `admin_clear_thread`).
- Deleção de perfis (RPC `admin_delete_profile`).
- Aprovação/rejeição de redemptions (RPCs `admin_approve_referral`, `admin_reject_referral`).

### Recursos Transversais
- **TrialLimitBanner** — mostra quota gratuita restante por feature; após o limite, pede assinatura.
- **FirstTimeGuide** — onboarding de primeira visita por feature, persistido em `profiles.seen_guides`.
- **GuidedTour** — tour visual que destaca elementos via `data-tour="..."`.
- **AppBreadcrumb** — navegação hierárquica (Clínica / Ferramentas IA / Marketing / Admin).
- **InternationalPhoneInput** — entrada de telefone com seleção de país.
- **AudioPlayer** — player customizado para mensagens de voz.
- **Soft-delete** em mensagens, RLS em todas as tabelas, validação MIME via RPC `validate_file_type`.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (Vite SPA)                   │
│  React Router → AppLayout (auth-guard) → Páginas            │
│  └─ AuthProvider (Supabase JS) ── TanStack Query            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Supabase (BaaS)                       │
│  ┌─ Auth (JWT + storage no localStorage)                    │
│  ├─ Postgres + RLS por user_id (auth.uid())                 │
│  ├─ Storage (áudios, mídia, avatares)                       │
│  ├─ Realtime (canal por thread_id no chat)                  │
│  └─ Edge Functions (Deno) ──┐                               │
└─────────────────────────────┼───────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
          OpenAI API     n8n Webhooks   Outros (PDF, etc.)
       (Assistants v2,  (planos /
        Whisper, Chat   artigos)
        Completions
        com SSE)
```

**Padrão das Edge Functions:**
1. Valida `Authorization: Bearer <jwt>`.
2. Identifica usuário via `supabaseUser.auth.getUser(jwt)`.
3. Cria cliente admin com `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS quando necessário.
4. Executa a chamada (OpenAI ou n8n).
5. Persiste histórico (input, output, status, erro).
6. Retorna JSON ou stream SSE.

---

## Estrutura de Pastas

```
chatpsi-connect/
├── public/                          # Assets estáticos (logo.png, etc.)
├── src/
│   ├── App.tsx                      # Configuração de rotas + providers globais
│   ├── main.tsx                     # Entry point Vite
│   ├── index.css / App.css          # Estilos globais e variáveis Tailwind
│   ├── components/
│   │   ├── admin/                   # AdminGuard
│   │   ├── app/                     # AppLayout, AppSidebar (shell autenticado)
│   │   ├── auth/                    # AuthProvider, AuthPage, ForgotPasswordModal
│   │   ├── busca-artigos/           # BuscaArtigosInterface
│   │   ├── busca-plano/             # BuscaPlanoInterface
│   │   ├── calc-tributaria/         # 9 componentes (cenários, hero, ponto-virada, etc.)
│   │   ├── chat/                    # ChatInterface, ChatSidebar
│   │   ├── evolution/               # EvolutionInput, EvolutionOutput
│   │   ├── marketing/               # MarketingInterface
│   │   ├── onboarding/              # OnboardingWizard + 5 steps
│   │   ├── patients/                # PatientFormDialog, PatientSelector
│   │   ├── referral/                # ReferralCard, RedeemBanner, NotificationPoller
│   │   └── ui/                      # 58 componentes shadcn/ui + customs
│   ├── hooks/
│   │   ├── useAudioRecording.ts     # MediaRecorder API
│   │   ├── useFileUpload.ts         # Upload para Supabase Storage
│   │   ├── useInternationalPhone.ts
│   │   ├── useReferralSettings.ts
│   │   ├── useResponsive.ts
│   │   ├── useTrialLimit.ts         # Conta uso por mês por tabela
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── integrations/supabase/
│   │   ├── client.ts                # Singleton supabase
│   │   └── types.ts                 # Tipos gerados (Database)
│   ├── lib/
│   │   ├── calc-tributaria/         # Lógica determinística PF/PJ
│   │   │   ├── cenarioPJ.ts, cenariosPF.ts
│   │   │   ├── inss.ts, irpf.ts, simples.ts
│   │   │   ├── pontoVirada.ts, premissas.ts, recomendacao.ts
│   │   │   ├── constantes.ts (tributação 2026), format.ts, storage.ts
│   │   │   └── types.ts, index.ts
│   │   ├── countries.ts             # Lista para phone input
│   │   ├── evolutionParser.ts       # Parser + export PDF
│   │   ├── logger.ts                # Wrapper de log com mensagens genéricas
│   │   └── utils.ts                 # cn() e helpers
│   └── pages/
│       ├── Index.tsx                # Redirect baseado em auth
│       ├── AuthCallbackPage.tsx     # OAuth/recovery callback
│       ├── ResetPasswordPage.tsx
│       ├── AdminPage.tsx            # /admin
│       ├── AdminReferralsPage.tsx   # /admin/referrals
│       ├── ChatPage.tsx             # /chat
│       ├── BuscaPlanoPage.tsx       # /busca-plano
│       ├── BuscaArtigosPage.tsx     # /busca-artigos
│       ├── MarketingPage.tsx        # /marketing
│       ├── NotFound.tsx             # 404
│       └── app/                     # Rotas autenticadas /app/*
│           ├── HomePage.tsx
│           ├── EvolutionPage.tsx
│           ├── PatientsPage.tsx
│           ├── PatientDetailPage.tsx
│           ├── HistoryPage.tsx
│           ├── ProfilePage.tsx
│           ├── ReferralsPage.tsx
│           └── CalcTributariaPage.tsx
└── supabase/
    ├── config.toml                  # Configuração Supabase local
    ├── functions/                   # 8 Edge Functions Deno
    │   ├── busca_artigos_dispatch/
    │   ├── busca_plano_dispatch/
    │   ├── calc_tributaria_dispatch/
    │   ├── create-patient-thread/
    │   ├── dispatch-message/
    │   ├── dispatch_message/
    │   ├── generate-evolution/
    │   └── marketing_ai_dispatch/
    └── migrations/                  # 50+ migrations SQL
```

---

## Modelo de Dados (Supabase)

Schema `public`. Todas as tabelas com **RLS** habilitado e políticas baseadas em `auth.uid() = user_id`.

| Tabela | Descrição |
|---|---|
| `profiles` | Perfil do usuário (1:1 com `auth.users`). Campos: `email`, `full_name`, `nickname`, `crp`, `whatsapp`, `avatar_url`, `main_approach`, `specialties[]`, `subscription_active`, `subscription_tier`, `subscribed_at`, `subscription_end`, `current_period_end`, `subscription_id`, `plan`, `has_completed_onboarding`, `onboarding_step`, `seen_guides` (jsonb), `openai_thread_id`, `threads_artigos`, `threads_plano`, `threads_marketing`, `TokenCount`. |
| `patients` | Pacientes do psicólogo. `full_name`, `initials`, `date_of_birth`, `gender`, `cid_10`, `dsm_5`, `main_complaint`, `medication`, `notes`, `approach`, `session_frequency`, `session_day_time`, `default_session_type`, `default_session_duration`, `status`, `total_sessions`, `last_session_at`, `openai_assistant_id`, `openai_thread_id`. |
| `evolutions` | Evoluções clínicas. FK para `patients`. `input_type` (audio/text), `input_content`, `output_content`, `audio_url`, `approach`, `patient_initials`, `session_number`, `session_type`, `session_duration`. |
| `messages` | Mensagens do Chat Clínico. `thread_id`, `sender` (user/ai), `content`, `type`, `media_url`, `metadata` (jsonb), `is_deleted`. |
| `plano_chat_history` | Histórico do módulo Busca de Planos. `input_text`, `response_json`, `thread_sent`, `http_status`, `error_message`. |
| `artigos_chat_history` | Histórico do módulo Busca de Artigos (mesmo schema do anterior). |
| `marketing_texts` | Textos de marketing salvos. `title`, `prompt`, `generated_text`. |
| `calc_tributaria_history` | Histórico de análises tributárias. `input` (jsonb), `output` (jsonb). |
| `notifications` | Notificações in-app. `type`, `message`, `seen`. |
| `referral_codes` | Código único por usuário. `code`, `total_redeemed`. |
| `referral_redemptions` | Resgates feitos. `code_used`, `redeemed_by`, `referrer_id`, `status` (pending/approved/rejected), `validated_by`, `validated_at`. |
| `referral_settings` | Configuração global do programa. `enabled`, `banner_title`, `banner_description`, `banner_button_text`. |
| `user_roles` | Atribuição de roles. `role: app_role` (`'admin' | 'user'`). |
| `userinativos` | Tracking de leads inativos via WhatsApp (`whatsapp`, `nome`, `thread`). |
| `webhook_events` | Auditoria de eventos webhook. `direction`, `payload`, `status_code`, `error`. |

### Funções (RPCs) principais

- `is_admin()` → `boolean`
- `has_role(p_user_id, p_role)` → `boolean`
- `generate_referral_code(p_user_id)` → `string`
- `redeem_referral_code(p_code)` → `Json`
- `admin_approve_referral`, `admin_reject_referral`
- `admin_update_profile`, `admin_delete_profile`, `admin_clear_thread`
- `update_profile_basic_info`
- `validate_file_type(filename)` → `boolean`

### Enums

- `app_role`: `'admin' | 'user'`

---

## Edge Functions

Todas em **Deno** (`supabase/functions/`), deployadas via Supabase CLI.

| Função | JWT | Descrição |
|---|---|---|
| `dispatch-message` | ✅ | Chat Clínico — Whisper + OpenAI Assistant `asst_4sei53DAsGVYUhyZzp3BsLJZ`. Suporta upload de imagem/áudio/PDF/DOCX. |
| `dispatch_message` | ✅ | Variante com webhook externo (`WEBHOOK_ENDPOINT_URL`). |
| `busca_plano_dispatch` | ✅ | Encaminha input para n8n (`/webhook/buscaplano`), timeout 120s, persiste em `plano_chat_history`. |
| `busca_artigos_dispatch` | ✅ | Idem, mas para `/webhook/buscaartigos` e `artigos_chat_history`. |
| `marketing_ai_dispatch` | ✅ | OpenAI Assistant `asst_RmdTDmgUPmKNSoXoQ4FMHip1` para textos de marketing. |
| `calc_tributaria_dispatch` | ✅ | `gpt-4.1-mini` com prompt sistêmico das constantes 2026; valida trial (2/mês) e persiste em `calc_tributaria_history`. |
| `generate-evolution` | ❌ | Streaming SSE (`gpt-4.1-mini`) com prompt clínico estruturado por abordagem. Whisper para áudio. |
| `create-patient-thread` | ❌ | Cria Assistant + Thread OpenAI dedicado para o paciente. |

---

## Rotas da Aplicação

### Públicas
- `/` — redireciona para `/app` ou `/auth` conforme sessão.
- `/auth` — login / cadastro.
- `/auth/callback` — callback OAuth / recovery.
- `/reset-password` — fluxo de redefinição.

### Autenticadas (sob `<AppLayout>` com sidebar persistente)

| Rota | Página |
|---|---|
| `/app` | HomePage (painel + onboarding) |
| `/app/evolucao` | EvolutionPage |
| `/app/pacientes` | PatientsPage |
| `/app/pacientes/:id` | PatientDetailPage |
| `/app/historico` | HistoryPage |
| `/app/perfil` | ProfilePage |
| `/app/indicacoes` | ReferralsPage |
| `/app/calculadora-tributaria` | CalcTributariaPage |
| `/chat` | ChatPage |
| `/busca-plano` | BuscaPlanoPage |
| `/busca-artigos` | BuscaArtigosPage |
| `/marketing` | MarketingPage |
| `/admin` | AdminPage (AdminGuard) |
| `/admin/referrals` | AdminReferralsPage (AdminGuard) |
| `*` | NotFound |

---

## Setup e Instalação

### Pré-requisitos
- **Node.js 18+** (recomendado 20+)
- Gerenciador de pacotes — o projeto possui `bun.lockb`, `bun.lock` e `package-lock.json` (Bun ou npm funcionam)
- Supabase CLI (apenas para deploy/local-dev de funções e migrations)

### Passos

```bash
# 1. Clonar
git clone <YOUR_GIT_URL>
cd chatpsi-connect

# 2. Instalar dependências
npm install        # ou: bun install

# 3. Configurar variáveis de ambiente (ver seção abaixo)
cp .env.example .env   # se existir; caso contrário, crie manualmente

# 4. Iniciar dev server (porta 8080)
npm run dev
```

A app sobe em `http://localhost:8080` (configurado em `vite.config.ts`).

### Supabase Local (opcional)

```bash
supabase start                      # sobe stack local (porta 54321/api, 54322/db)
supabase db reset                   # aplica todas as migrations
supabase functions serve <fn-name>  # roda função localmente
supabase functions deploy <fn-name> # deploy
```

---

## Variáveis de Ambiente

### Frontend (`.env`)
```env
VITE_SUPABASE_URL=https://<project>.supabase.co
```
> ⚠️ O cliente Supabase está atualmente **hardcoded** em `src/integrations/supabase/client.ts` (URL e anon key do projeto `rrdvivxdasezvhfbetra`). O `EvolutionPage` usa `import.meta.env.VITE_SUPABASE_URL` para chamar a edge function diretamente. Configure essa variável para apontar ao seu projeto.

### Edge Functions (Supabase Secrets)
Defina via `supabase secrets set` ou no painel Supabase → Project Settings → Edge Functions:

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
OPENAI_API_KEY=<sua-api-key-openai>
WEBHOOK_ENDPOINT_URL=<url-webhook-n8n-opcional>     # usado por dispatch_message
```

> Os endpoints n8n (`webhook.seconsult.com.br/webhook/buscaplano` e `/buscaartigos`) e os IDs de Assistants OpenAI estão **hardcoded** nas edge functions. Para outro ambiente, edite os arquivos em `supabase/functions/` antes do deploy.

---

## Scripts Disponíveis

| Script | Descrição |
|---|---|
| `npm run dev` | Vite dev server em `http://localhost:8080` |
| `npm run build` | Build de produção (`dist/`) |
| `npm run build:dev` | Build em modo development (com componentTagger do Lovable) |
| `npm run preview` | Preview do build |
| `npm run lint` | ESLint sobre todo o projeto |

---

## Modelo de Trial / Assinatura

O hook `useTrialLimit(table, limit)` (`src/hooks/useTrialLimit.ts`) conta inserções na tabela alvo no mês corrente para o `user_id` autenticado:

| Feature | Tabela contada | Limite mensal grátis |
|---|---|---|
| Evoluções | `evolutions` | 2 |
| Marketing | `marketing_texts` | 2 |
| Busca Planos | `plano_chat_history` | 2 |
| Busca Artigos | `artigos_chat_history` | 3 |
| Calculadora Tributária | `calc_tributaria_history` | 2 |

Quando `profile.subscription_active = true`, o limite é ignorado. Antes de bloquear, a UI mostra `<TrialLimitBanner />` com o uso atual.

> A integração com gateway de pagamento (Hotmart/Stripe/etc.) **não está incluída no repo** — o flag `subscription_active` é atualizado externamente (provavelmente via webhook do gateway gravando em `profiles`).

---

## Programa de Indicação

1. Usuário acessa `/app/indicacoes` → backend cria/recupera código via `generate_referral_code`.
2. Compartilha código (Web Share API ou cópia).
3. Novo usuário vê `<RedeemBanner />` no `/app` e digita o código.
4. RPC `redeem_referral_code` cria entrada em `referral_redemptions` com `status = 'pending'`.
5. Admin valida em `/admin/referrals` (`admin_approve_referral` / `admin_reject_referral`).
6. `ReferralNotificationPoller` (no `AppLayout`) sinaliza ao indicador via tabela `notifications`.

Toggle global `enabled` em `referral_settings` desativa todo o programa quando `false`.

---

## Deploy

### Frontend
- **Lovable:** abra o projeto em <https://lovable.dev/projects/76ba47cc-98a3-465d-9d4a-44ffa34188f7> → **Share → Publish**.
- **Self-hosted:** `npm run build` gera `dist/` — sirva em qualquer host estático (Vercel, Netlify, Cloudflare Pages, S3+CloudFront, etc.).

### Backend
```bash
supabase link --project-ref <ref>
supabase db push                                          # aplica migrations
supabase functions deploy generate-evolution
supabase functions deploy dispatch-message
# ... (repita para cada função)
```

### Domínio Customizado
No Lovable: **Project → Settings → Domains → Connect Domain**. Detalhes: <https://docs.lovable.dev/tips-tricks/custom-domain>.

---

## Notas Adicionais

- **Mobile-first:** layout adaptativo com `useResponsive()` e classes utilitárias `min-h-screen-mobile`, `pb-20` para bottom nav.
- **Acessibilidade:** todos os componentes shadcn/ui são baseados em Radix (foco, ARIA, keyboard nav).
- **Logger:** `lib/logger.ts` centraliza erros e expõe `GENERIC_ERROR_MESSAGES` para mensagens amigáveis ao usuário.
- **Soft-delete** em `messages.is_deleted` para permitir auditoria.
- **Validação de upload:** RPC `validate_file_type` checa extensão antes de aceitar arquivo.
- **Threads OpenAI por escopo:** `profiles` carrega threads separadas para `chat`, `artigos`, `plano`, `marketing` — evita poluição de contexto entre features.

---

## Licença

Projeto privado — direitos reservados.
