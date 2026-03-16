

## Diagnóstico

O módulo de Evolução Clínica existe em `/app/evolucao`, mas **não há link para ele** na sidebar do Chat (onde o usuário navega). A sidebar do Chat (`ChatSidebar.tsx`) lista Chat, Busca Plano, Busca Artigos, IA de Marketing, etc. — mas não inclui "Evolução Clínica".

O usuário está em `/chat` e não tem como chegar ao módulo novo.

## Correção

Adicionar um item **"Evolução Clínica"** no menu da `ChatSidebar.tsx`, com ícone `FileCheck` ou `ClipboardPlus`, apontando para `/app/evolucao`. Posicionar como primeiro item do menu (já que é a funcionalidade central).

### Arquivo a modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/chat/ChatSidebar.tsx` | Adicionar item "Evolução Clínica" (`/app/evolucao`) no array `menuItems`, como primeiro item, com ícone `FileCheck` e descrição "Gerar evolução por IA" |

Apenas 1 linha de adição no array de menu items — nenhuma outra mudança necessária.

