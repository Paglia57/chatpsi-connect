

## Plano: Loading, Breadcrumbs e Botões Consistentes (Cross-cutting)

### Escopo Total: ~15 arquivos

---

### 1. LOADING — Barra de progresso + Skeletons + Spinners

**A. Barra de progresso no topo (route transitions)**
- Criar `src/components/ui/RouteProgressBar.tsx` — barra fina 2px `bg-cta` no topo, animada com `useNavigation` do react-router (ou `useEffect` no `AppLayout` observando mudança de `location`)
- Inserir no `AppLayout.tsx` acima do `<Outlet />`

**B. Skeletons nas páginas com dados assíncronos**

Substituir spinners/pulse simples por `Skeleton` do shadcn:

| Página | Estado atual | Mudança |
|--------|-------------|---------|
| `PatientsPage` | `div.animate-pulse` | Skeleton cards (avatar + linhas) |
| `HistoryPage` | `Card.animate-pulse` | Skeleton cards com avatar + badge + linhas |
| `ProfilePage` | `Loader2 spinner` | Skeleton form (inputs + avatar) |
| `ChatInterface` | `fetchingMessages` spinner | Skeleton message bubbles |
| `MarketingInterface` | `isLoadingHistory` | Skeleton cards no tab Histórico |
| `AdminPage` | `loading` state | Skeleton table rows |
| `AdminReferralsPage` | Verificar | Skeleton table rows |
| `ReferralsPage` | `loading` state | Skeleton card |
| `PatientDetailPage` | `Loader2` | Skeleton header + sections |
| `BuscaPlanoInterface` | `fetchingHistory` | Skeleton messages |
| `BuscaArtigosInterface` | Similar | Skeleton messages |

Todos com `animate-fade-in` no conteúdo real ao substituir skeleton.

**C. Botões async com spinner**

Garantir padrão: `<Loader2 className="h-4 w-4 animate-spin" />` + texto de loading + `disabled` em TODOS os botões que disparam ações async. Auditar:
- `EvolutionInput` → "Gerar Evolução" → já tem `isLoading`; confirmar spinner + texto "Gerando..."
- `EvolutionOutput` → "Salvar" → já tem `isSaving`; confirmar spinner + texto "Salvando..."
- `ProfilePage` → "Salvar alterações" → já tem spinner ✓
- `MarketingInterface` → "Gerar com IA" e "Salvar" → confirmar spinner + texto
- `PatientFormDialog` → "Cadastrar Paciente" → já tem spinner ✓
- `HistoryPage` → "Salvar" (edição) → adicionar spinner
- `AdminPage` → botões de ação → confirmar spinners
- `ChatInterface` → envio → já tem `isAssistantTyping`
- `BuscaPlano/Artigos` → envio → confirmar

---

### 2. BREADCRUMBS — Componente reutilizável

**A. Criar `src/components/ui/AppBreadcrumb.tsx`**

Componente que recebe array de `{ label, href? }`. Usa o `Breadcrumb` já existente do shadcn (`src/components/ui/breadcrumb.tsx`). Separador `ChevronRight`. Items anteriores: `text-sm text-muted-foreground` clicáveis com `Link`. Último item: `text-foreground font-medium`, não clicável.

**B. Adicionar breadcrumbs em CADA página**

| Página | Breadcrumb |
|--------|-----------|
| `EvolutionPage` | Clínica > Evolução > Nova Evolução |
| `HistoryPage` | Clínica > Evolução > Histórico |
| `PatientsPage` | Clínica > Pacientes |
| `PatientDetailPage` | Clínica > Pacientes > [Nome] |
| `ChatPage` | Ferramentas IA > Chat Clínico |
| `BuscaPlanoPage` | Ferramentas IA > Planos de Ação |
| `BuscaArtigosPage` | Ferramentas IA > Artigos Científicos |
| `MarketingPage` | Marketing > IA de Marketing |
| `ProfilePage` | Meu Perfil |
| `ReferralsPage` | Indique e Ganhe |
| `AdminPage` | Administração |
| `AdminReferralsPage` | Administração > Validar Indicações |

---

### 3. BOTÕES CONSISTENTES — Padronizar variantes

**Regra:**
- CTA primário → `variant="cta"` (cor cta do design system)
- Secundário → `variant="outline"`
- Terciário → `variant="ghost"`
- Destrutivo → `variant="destructive"`

**Botões a corrigir:**
- `HistoryPage` linha 339: `variant="default"` → `variant="cta"` (Salvar edição)
- `ChatInterface` linhas 486, 590, 645: `variant="default"` → verificar contexto (Ativar Assinatura → `variant="cta"`, Parar gravação → `variant="outline"`)
- `BuscaPlano/BuscaArtigos`: botão Send → garantir `variant="cta"`
- `MarketingInterface`: "Gerar com IA" → garantir `variant="cta"`, "Salvar" → `variant="cta"`

Eliminar qualquer uso de cores `pink`, `rose` hardcoded ou classes `bg-primary` em botões (usar variantes).

---

### Arquivos modificados (estimativa)

| Arquivo | Mudanças |
|---------|---------|
| `src/components/ui/AppBreadcrumb.tsx` | **NOVO** — componente breadcrumb reutilizável |
| `src/components/ui/RouteProgressBar.tsx` | **NOVO** — barra de progresso de navegação |
| `src/components/app/AppLayout.tsx` | Inserir RouteProgressBar |
| `src/pages/app/EvolutionPage.tsx` | Breadcrumb |
| `src/pages/app/HistoryPage.tsx` | Breadcrumb + skeleton + botão cta |
| `src/pages/app/PatientsPage.tsx` | Breadcrumb + skeleton melhorado |
| `src/pages/app/PatientDetailPage.tsx` | Breadcrumb + skeleton |
| `src/pages/app/ProfilePage.tsx` | Breadcrumb + skeleton |
| `src/pages/app/ReferralsPage.tsx` | Breadcrumb + skeleton |
| `src/pages/ChatPage.tsx` | Breadcrumb |
| `src/pages/BuscaPlanoPage.tsx` | Breadcrumb |
| `src/pages/BuscaArtigosPage.tsx` | Breadcrumb |
| `src/pages/MarketingPage.tsx` | Breadcrumb |
| `src/pages/AdminPage.tsx` | Breadcrumb + skeleton |
| `src/pages/AdminReferralsPage.tsx` | Breadcrumb + skeleton |
| `src/components/chat/ChatInterface.tsx` | Skeleton + botões corrigidos |
| `src/components/marketing/MarketingInterface.tsx` | Skeleton + botões cta |
| `src/components/evolution/EvolutionInput.tsx` | Spinner + texto loading |
| `src/components/evolution/EvolutionOutput.tsx` | Spinner + texto loading |
| `src/components/busca-plano/BuscaPlanoInterface.tsx` | Skeleton + botão cta |
| `src/components/busca-artigos/BuscaArtigosInterface.tsx` | Skeleton + botão cta |

