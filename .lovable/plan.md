

## Problema

O menu lateral (`ChatSidebar`) não possui um item de navegação para o **Histórico de Evoluções** (`/app/historico`). A página existe mas é inacessível pela interface.

## Solução

Adicionar um item "Histórico" no array `menuItems` do `ChatSidebar.tsx`, logo após "Evolução Clínica", usando o ícone `ClipboardList` (já importado no `HistoryPage`).

| Arquivo | Mudança |
|---------|---------|
| `src/components/chat/ChatSidebar.tsx` | Adicionar item `{ title: "Histórico", url: "/app/historico", icon: ClipboardList, description: "Evoluções salvas", gradient: "from-primary to-cta" }` no array `menuItems`, após "Evolução Clínica". Importar `ClipboardList` do lucide-react. |

Mudança mínima — uma linha de import e ~5 linhas no array.

