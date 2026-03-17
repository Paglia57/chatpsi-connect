

## Dois elementos complementares ao onboarding

### 1. Banner de retomar onboarding (HomePage)

**Arquivo:** `src/pages/app/HomePage.tsx`

O banner já existe parcialmente (linhas 130-140), mas precisa ser atualizado:
- Trocar estilo de `bg-primary/10 border-primary/20` para `bg-amber-50 border-amber-200`
- Trocar texto para "⚡ Você ainda não completou a configuração inicial. Complete agora para personalizar a IA."
- Trocar lógica de contagem: atualmente incrementa `onboarding_banner_views` ao **mostrar** o banner — deve incrementar apenas ao **fechar** (clicar no X)
- Adicionar botão "Retomar →" estilizado como `Button variant="outline" size="sm"` à direita, junto ao X

### 2. Tooltip de boas-vindas na sidebar (pós-onboarding)

**Arquivo:** `src/pages/app/HomePage.tsx`

Adicionar um popover/tooltip flutuante que aparece quando `has_completed_onboarding` acabou de ser marcado como `true` (primeira visita pós-onboarding):
- State `showSidebarTooltip` controlado por `localStorage` key `has_seen_sidebar_tooltip`
- Renderizar um `div` com posição `fixed` no lado esquerdo da tela (ao lado da sidebar), estilo `bg-primary text-primary-foreground rounded-xl p-4 shadow-xl` com seta CSS apontando para a esquerda
- Texto explicativo sobre a organização da sidebar
- Auto-dismiss após 8s via `setTimeout` + dismiss ao clicar em qualquer lugar via event listener
- Após dismiss, setar `localStorage` flag para nunca mais mostrar

### Mudanças por arquivo

| Arquivo | Mudança |
|---------|---------|
| `src/pages/app/HomePage.tsx` | Atualizar banner (estilo amber, lógica de dismiss por clique no X, texto novo). Adicionar tooltip pós-onboarding com auto-dismiss de 8s e flag localStorage. |

Nenhum arquivo novo necessário. Nenhuma mudança de banco.

