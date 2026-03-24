

# Plano de Hierarquia Visual e Consistência de Interface

## Diagnóstico

Após revisão completa, o app já tem boa base: breadcrumbs, skeleton loaders, design tokens, sidebar funcional. Os problemas restantes são de **consistência** e **refinamento**:

1. **FirstTimeGuide**: `rounded-2xl` (deveria ser `rounded-xl`), CTA com emoji `✨` (deveria ser ícone Lucide), `text-2xl` no título (excessivo para guide inline)
2. **Mobile header**: sem bottom nav — apenas hamburger menu (dificulta navegação entre sessões)
3. **Card inconsistências**: alguns cards usam `shadow-sm`, outros não. PatientDetail evolutions não usam `bg-card`
4. **Sidebar collapsed icons**: touch targets `p-2` (32px) — abaixo do mínimo 44px
5. **EvolutionOutput**: título genérico "Evolução" sem contexto do paciente
6. **Heading weights**: inconsistente — alguns `font-bold`, outros `font-semibold`
7. **Spacing**: maioria OK com system, mas HistoryPage usa `space-y-6` no root com `space-y-3` nos cards (inconsistente com PatientsPage que usa `space-y-2`)

---

## Mudanças propostas

### 1. FirstTimeGuide — consistência premium

**Arquivo: `src/components/ui/FirstTimeGuide.tsx`**
- `rounded-2xl` → `rounded-xl` (consistente com cards do sistema)
- Título: `text-xl sm:text-2xl font-bold` → `text-lg sm:text-xl font-semibold` (hierarquia: guide < page title)
- CTA: remover `✨` emoji hardcoded, manter apenas texto
- CTA: remover `rounded-xl` inline (herda do button component `rounded-lg`)
- Example buttons: `rounded-xl` → `rounded-lg`

### 2. Bottom navigation mobile

**Arquivo: `src/components/chat/ChatSidebar.tsx`**
- Adicionar bottom nav fixo no mobile com 5 itens: Início, Evolução, Pacientes, Chat, Mais (abre sheet)
- Touch targets 44px (h-11 w-11 mínimo)
- Ícones 20px (h-5 w-5) com label 10px abaixo
- Active state: `text-primary font-medium`, inactive: `text-muted-foreground`
- Background: `bg-background border-t border-border`
- "Mais" abre o Sheet existente para acesso completo

**Arquivo: `src/components/app/AppLayout.tsx`**
- Adicionar `pb-16` no main quando mobile (espaço para bottom nav)

### 3. Sidebar collapsed — touch targets

**Arquivo: `src/components/chat/ChatSidebar.tsx`**
- Collapsed nav icons: `p-2` → `p-2.5` (40px) + `min-h-[44px] min-w-[44px]` para garantir 44px touch target
- Footer icons collapsed: mesmo tratamento

### 4. Card consistency audit

**Arquivo: `src/pages/app/PatientDetailPage.tsx`**
- Evolution items: adicionar `bg-card` explícito (já tem `border border-border`)
- AI context card: já tem `shadow-sm` — OK

**Arquivo: `src/pages/app/HistoryPage.tsx`**
- Card list: `space-y-3` → `space-y-2` (consistente com PatientsPage)

**Arquivo: `src/components/marketing/MarketingInterface.tsx`**
- Verificar se cards de histórico usam `shadow-sm border-border bg-card` consistentemente

### 5. Heading weight standardization

Regra: `font-semibold` em todo o app. Nunca `font-bold` em headings internos (reservado para métricas numéricas).

**Arquivos afetados:**
- `src/pages/app/HomePage.tsx` linha 188: `font-bold` → `font-semibold`
- `src/components/ui/FirstTimeGuide.tsx` linha 66: `font-bold` → `font-semibold`

### 6. EvolutionOutput — título contextual

**Arquivo: `src/components/evolution/EvolutionOutput.tsx`**
- Título "Evolução" → "Evolução Clínica" (mais claro, alinhado com o breadcrumb)

### 7. Mobile spacing refinement

**Arquivo: `src/components/app/AppLayout.tsx`**
- Main padding: `p-4 md:p-6 lg:p-8` — OK, mantém mobile-first
- Adicionar `pb-20` no mobile para bottom nav clearance

---

## Arquivos a modificar

| Arquivo | Mudanças |
|---|---|
| `src/components/ui/FirstTimeGuide.tsx` | rounded, heading size/weight, emoji CTA |
| `src/components/chat/ChatSidebar.tsx` | Bottom nav mobile, touch targets collapsed |
| `src/components/app/AppLayout.tsx` | Bottom padding mobile |
| `src/pages/app/HomePage.tsx` | Heading weight |
| `src/pages/app/HistoryPage.tsx` | Card spacing |
| `src/pages/app/PatientDetailPage.tsx` | Card bg consistency |
| `src/components/evolution/EvolutionOutput.tsx` | Título contextual |

Nenhuma lógica de negócio alterada. Apenas CSS, layout e hierarquia visual.

