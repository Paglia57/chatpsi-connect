

## Problema

O item "Pacientes" não está no `menuItems` do `ChatSidebar.tsx`. O `AppSidebar.tsx` tem o item, mas o layout usa `ChatSidebar` (via `AppLayout.tsx`), então o item nunca aparece.

## Solução

Adicionar o item "Pacientes" no array `menuItems` do `ChatSidebar.tsx`, entre "Evolução Clínica" e "Histórico". Importar o ícone `Users` do lucide-react.

| Arquivo | Mudança |
|---------|---------|
| `src/components/chat/ChatSidebar.tsx` | Adicionar `Users` ao import do lucide-react. Inserir `{ title: "Pacientes", url: "/app/pacientes", icon: Users, description: "Gestão de pacientes", gradient: "from-primary to-cta" }` no array `menuItems`, após "Evolução Clínica" e antes de "Histórico". |

Uma única mudança em um arquivo.

