

## Onboarding Wizard para Novos Usuários

### Visão geral
Criar um fluxo de onboarding em 5 steps (0-4) que aparece fullscreen no primeiro login, substituindo o dashboard. Inclui perfil, cadastro de paciente, geração de evolução e celebração com confetti.

### 1. Migração de banco de dados

Adicionar duas colunas à tabela `profiles`:

```sql
ALTER TABLE public.profiles
  ADD COLUMN has_completed_onboarding boolean NOT NULL DEFAULT false,
  ADD COLUMN onboarding_step integer NOT NULL DEFAULT 0;
```

A RLS de UPDATE existente já permite o usuário atualizar campos básicos do próprio perfil. Porém, a política de WITH CHECK atual bloqueia mudanças em campos sensíveis (subscription, tokens, threads). Os campos `has_completed_onboarding` e `onboarding_step` **não estão na lista de bloqueio**, então o UPDATE via client-side funcionará sem alteração de políticas.

### 2. Arquivos a criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/onboarding/OnboardingWizard.tsx` | Componente principal do wizard com lógica de steps, progress bar e navegação |
| `src/components/onboarding/StepWelcome.tsx` | Step 0 — Boas-vindas |
| `src/components/onboarding/StepProfile.tsx` | Step 1 — Perfil (nickname, abordagem, especialidades) |
| `src/components/onboarding/StepPatient.tsx` | Step 2 — Cadastro do primeiro paciente |
| `src/components/onboarding/StepEvolution.tsx` | Step 3 — Gerar primeira evolução (reutiliza lógica do EvolutionPage) |
| `src/components/onboarding/StepCelebration.tsx` | Step 4 — Confetti + resultado + mini-cards de features |

### 3. Arquivo a alterar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/app/HomePage.tsx` | Verificar `profile.has_completed_onboarding`. Se `false` e `onboarding_step === 0`, renderizar `<OnboardingWizard />`. Se `onboarding_step > 0` e `has_completed_onboarding === false`, mostrar banner "Retomar configuração →" (com dismiss via localStorage após 3 visitas). Se `true`, dashboard normal. |
| `src/components/auth/AuthProvider.tsx` | Adicionar `has_completed_onboarding` e `onboarding_step` à interface `Profile` |
| `package.json` | Adicionar dependência `canvas-confetti` |

### 4. Detalhes de cada step

**OnboardingWizard (container):**
- Fullscreen absoluto (`fixed inset-0 z-50 bg-white`) — esconde sidebar/layout
- Logo ChatPsi centralizado no topo
- Progress bar customizada (div com `bg-primary` e `transition-all duration-500`)
- Indicador "Passo X de 4"
- Transições entre steps via CSS (`opacity` + `translateX`, 300ms)
- Botão "Pular configuração" em todos os steps — salva `onboarding_step` atual, marca `has_completed_onboarding = false`, redireciona para dashboard
- Estado compartilhado: `selectedApproach`, `selectedSpecialties`, `createdPatient`, `generatedEvolution` passados via props/state entre steps

**Step 0 — Boas-vindas:** Texto de boas-vindas com nome do usuário. CTA "Vamos começar →".

**Step 1 — Perfil:** Formulário com nickname, abordagem (dropdown com mesmas opções de `ProfilePage`: TCC, Psicanálise, etc.), especialidades (checkboxes). Texto dinâmico "✓ A IA vai priorizar..." quando seleções feitas. Salva no `profiles` via Supabase update + atualiza `onboarding_step = 1`.

**Step 2 — Paciente:** Formulário simplificado (nome/iniciais + abordagem pré-selecionada do Step 1). Insert na tabela `patients` + chamada ao edge function `create-patient-thread`. Link "Pular, cadastro depois" avança sem criar. Atualiza `onboarding_step = 2`.

**Step 3 — Evolução:** Reutiliza a lógica de `EvolutionPage`/`EvolutionInput` (fetch para `generate-evolution`). Se paciente criado no Step 2, pré-preenche. Textarea de anotações + campos de sessão. Loading com textos progressivos a cada 3s. Ao concluir geração com sucesso, avança automaticamente para Step 4. Atualiza `onboarding_step = 3`.

**Step 4 — Celebração:** Dispara `canvas-confetti`. Mostra evolução gerada em card com scroll (max-h-[300px]). Botões Copiar/Editar. Grid 2x2 com mini-cards de features. Botão "Explorar o ChatPsi →" que marca `has_completed_onboarding = true`, `onboarding_step = 4` e navega para `/app`.

### 5. Banner de retomada (HomePage)

Se `has_completed_onboarding === false` e `onboarding_step > 0`:
- Banner fixo no topo: "Você ainda não completou a configuração inicial. Retomar →"
- Controle de dismissal via `localStorage` key `onboarding_banner_views` — incrementa a cada visita, esconde após ≥ 3
- Click no banner seta o wizard no step salvo

### 6. Dependências

- `canvas-confetti` (npm) — para animação de confetti no Step 4
- Todas as outras dependências já existem no projeto (shadcn/ui, tanstack-query, supabase client)

### 7. Estilo visual

Seguindo o design system existente:
- Cores primárias do CSS vars (`--primary`, `--cta`)
- Componentes shadcn/ui (Card, Button variant="cta", Select, Checkbox, Input, Progress)
- Tipografia: `font-playfair` para títulos, `text-foreground`/`text-muted-foreground`
- Espaçamento generoso (`py-8`, `gap-6`)
- Cards com `rounded-2xl shadow-sm border`

