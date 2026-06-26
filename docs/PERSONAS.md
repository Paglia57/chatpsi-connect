# Sistema de Personas (prompts no banco)

Esta feature move os system prompts da IA para o **banco (Supabase)**, versionados,
editáveis pelo **admin** (sem deploy), com **histórico + rollback** e **fallback de
cópia-base no código**. É **aditiva e sem regressão**: o comportamento clínico atual
começa idêntico ao de antes.

> Etapa fundadora da migração agnóstica de provider. **Não** migra ainda o `chat()`
> para Responses, **não** toca no n8n.

## Componentes

| Camada | Arquivo |
|---|---|
| Migration (tabelas, RLS, RPCs, seed) | `supabase/migrations/20260625120000_ai_personas_system.sql` |
| Cópia-base / fallback | `supabase/functions/_shared/personas/baseline.ts` |
| Resolução + cache (60s) | `supabase/functions/_shared/personas/resolve.ts` (`getPersona(slug)`) |
| Painel admin | `src/pages/AdminPersonasPage.tsx` → rota `/admin/personas` |

### Tabelas
- `ai_personas` — `slug` (único), `nome`, `descricao`, `active_version_id`, `model_hint`, `updated_at`.
- `ai_persona_versions` — `persona_id`, `version`, `content`, `created_by`, `note`, `created_at`. **Imutáveis.**

### RPCs (SECURITY DEFINER, só `is_admin()`)
- `admin_save_persona_version(p_persona_id, p_content, p_note)` — cria versão nova e a ativa.
- `admin_rollback_persona(p_persona_id, p_target_version_id)` — histórico linear: cria nova versão copiando o conteúdo da versão alvo e a ativa.

## As 8 personas

| slug | origem da v1 | ligada ao código agora? |
|---|---|---|
| `prontuario_gerar` | baseline (generate-evolution) | ✅ Chat Completions lê via `getPersona` |
| `prontuario_refinar` | baseline (improve-evolution) | ✅ |
| `paciente_thread` | baseline (create-patient-thread) | ✅ (instruções do Assistant por paciente) |
| `clinico_web` | **placeholder** | ❌ continua no Assistant `asst_4sei…` |
| `clinico_whatsapp` | **placeholder** | ❌ continua no Assistant `asst_ghTr…` |
| `vendas` | **placeholder** | ❌ continua no Assistant `asst_TjXk…` |
| `marketing` | **placeholder** | ❌ continua no Assistant `asst_Rmd…` |
| `plano_acao` | **placeholder** | ❌ continua no Assistant `asst_esHK…` |

## ⚠️ Tarefa manual (necessária para completar as 5 personas de Assistant)

Os prompts das personas de Assistant vivem **dentro da OpenAI** e não podem ser
extraídos por código. É preciso copiá-los manualmente:

1. Abrir cada Assistant na plataforma da OpenAI e copiar o texto de **Instructions**:
   - `clinico_web` → `asst_4sei53DAsGVYUhyZzp3BsLJZ`
   - `clinico_whatsapp` → `asst_ghTrVWfzgh5vtW28qDs5MnRB`
   - `vendas` → `asst_TjXksuG8kL3Gp6xLb1QIQALE`
   - `marketing` → `asst_RmdTDmgUPmKNSoXoQ4FMHip1`
   - `plano_acao` → `asst_esHKfSJcaMNF99QVrILGu6pW`
2. Em `/admin/personas`, **editar** a persona correspondente e colar o texto
   (substituindo o placeholder). Isso cria a v2 e remove o badge "usando fallback".

> Enquanto o placeholder não for preenchido, a persona aparece com o badge
> **"usando fallback"**. **Importante:** editar essas 5 personas **ainda não altera o
> atendimento** — elas continuam chamando o Assistant. A troca efetiva (mandar o prompt
> do banco em vez de usar o Assistant) acontece no próximo passo (migração para Responses).

## Fallback (resolve.ts)
`getPersona(slug)` retorna a versão ativa do banco; se ausente, vazia, com menos de 30
caracteres ou começando com `[[PLACEHOLDER]]`, cai no `baseline.ts` e loga um `warn`.
Cache em memória de 60s por slug (sem invalidação cross-instância; o TTL é o mecanismo).

## Deploy / aplicação
1. Aplicar a migration: `supabase db push` (ou colar o SQL no SQL Editor do dashboard).
2. Redeploy das Edge Functions alteradas:
   `supabase functions deploy generate-evolution improve-evolution create-patient-thread`
3. (Opcional) Regenerar os tipos do frontend para tipar as novas tabelas/RPCs:
   `supabase gen types typescript --project-id rrdvivxdasezvhfbetra > src/integrations/supabase/types.ts`
   — enquanto não regenerado, `AdminPersonasPage` usa um cast `any` no boundary do supabase-js.

## Não-regressão
- As 3 personas clínicas começam com `content` idêntico ao prompt hardcoded original
  (seed == `baseline.ts` == constante removida do código), então o resultado não muda.
- n8n não é tocado; as 5 personas de Assistant continuam respondendo pelo Assistant.
