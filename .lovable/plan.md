

# Plano de Refinamento Visual — Identidade Clínica Profissional

## Diagnóstico atual

Após revisão dos arquivos, identifiquei os seguintes problemas visuais:

1. **Neutros frios**: `--muted`, `--border`, `--input` usam `0 0% X%` (cinza puro). Falta warmth.
2. **Botões pesados**: default `h-12`, lg `h-14`, `shadow-md/lg`, `hover:scale`, `btn-hover-lift` em tudo — excessivo.
3. **CTA magenta agressivo**: `322 100% 58%` com `shadow-lg hover:shadow-xl hover:scale-[1.02]` — muito chamativo.
4. **Headings genéricos no CSS base**: `h1 text-4xl lg:text-5xl`, `h2 text-3xl lg:text-4xl` — enormes para app clínico.
5. **Sidebar copy inconsistente**: "Planos de Ação" (deveria ser "Planos Terapêuticos"), fallback "Usuário".
6. **`font-playfair` referenciado** no HomePage mas não existe no sistema — usar `font-display` (Inter).
7. **Cards com `hover:shadow-lg hover:-translate-y-0.5`** — elevação exagerada.
8. **`card-decorated::before`** com barra gradiente magenta→azul no topo — decoração sem função.

---

## Mudanças propostas

### 1. Design Tokens (`src/index.css` — `:root`)

**Neutros quentes** (undertone azul-quente em vez de cinza puro):
- `--muted: 0 0% 96%` → `220 14% 96%`
- `--muted-foreground: 0 0% 45%` → `220 9% 46%`
- `--border: 0 0% 90%` → `220 13% 91%`
- `--input: 0 0% 90%` → `220 13% 91%`

**CTA menos saturado**:
- `--cta: 322 100% 58%` → `322 85% 46%` (magenta mais sóbrio, ainda distinto)
- `--cta-hover: 322 100% 50%` → `322 85% 40%`

**Headings base** — reduzir tamanhos globais (app, não landing page):
- `h1: text-4xl lg:text-5xl` → `text-2xl lg:text-3xl`
- `h2: text-3xl lg:text-4xl` → `text-xl lg:text-2xl`
- `h3: text-2xl lg:text-3xl` → `text-lg lg:text-xl`

**Remover decorações sem função**:
- `.card-decorated::before` (barra gradiente topo) — remover
- `.bg-hero::before` e `::after` (dots e circle) — remover

### 2. Botões (`src/components/ui/button.tsx`)

Reduzir peso visual mantendo toque profissional:

- Base: `rounded-xl` → `rounded-lg`
- Default size: `h-12 px-6 py-3` → `h-10 px-5 py-2`
- SM: `h-10` → `h-9`
- LG: `h-14 px-8` → `h-11 px-6`
- Icon: `h-12 w-12` → `h-10 w-10`
- Variant `default`: remover `shadow-md hover:shadow-lg btn-hover-lift` → `shadow-sm hover:shadow-md`
- Variant `cta`: remover `shadow-lg hover:shadow-xl hover:scale-[1.02] btn-hover-lift` → `shadow-sm hover:shadow-md`
- Variant `outline`: `border-2 border-cta text-cta` → `border border-input text-foreground hover:bg-accent hover:text-accent-foreground` (outline neutro, não magenta)
- Variant `destructive`: remover `shadow-md hover:shadow-lg`

### 3. Cards — reduzir elevação

**`src/index.css`**: `.card-hover` reduzir de `hover:shadow-lg hover:-translate-y-1` para `hover:shadow-md hover:-translate-y-px`

**`src/pages/app/HomePage.tsx`**: Shortcut cards `hover:shadow-lg hover:-translate-y-0.5` → `hover:shadow-md`

### 4. Sidebar (`src/components/chat/ChatSidebar.tsx`)

Copy clínico:
- Linha 218: "Planos de Ação" → "Planos Terapêuticos"
- Linha 349: "Planos de Ação" (collapsed title) → "Planos Terapêuticos"
- Linha 154: fallback "Usuário" → "Profissional"

### 5. HomePage (`src/pages/app/HomePage.tsx`)

- Remover `font-playfair` das linhas 188 e 227 — usar classe padrão `font-display`
- Hero card: trocar `border-0` por `border border-primary/20` para consistência

### 6. Input focus ring

**`src/components/ui/input.tsx`**: Já usa `focus-visible:ring-ring` que aponta para primary. OK, sem mudança.

---

## Arquivos a modificar

| Arquivo | Mudanças |
|---|---|
| `src/index.css` | Tokens de cor neutros, CTA, headings, remover decorações |
| `src/components/ui/button.tsx` | Tamanhos, sombras, border-radius, outline variant |
| `src/pages/app/HomePage.tsx` | font-playfair → font-display, card hover, hero border |
| `src/components/chat/ChatSidebar.tsx` | "Planos de Ação" → "Planos Terapêuticos", "Usuário" → "Profissional" |

Nenhuma lógica de negócio alterada. Apenas tokens visuais, tamanhos e copy de navegação.

