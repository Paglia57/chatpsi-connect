

## Problema

O dialog de detalhes no Histórico mostra o conteúdo da evolução como somente leitura, sem opção de editar e salvar alterações.

## Solução

Adicionar modo de edição inline no dialog de detalhes da evolução no `HistoryPage.tsx`, similar ao que já existe no `EvolutionOutput.tsx`.

### Mudanças em `src/pages/app/HistoryPage.tsx`

1. Adicionar estados `isEditing` e `editedContent`
2. No dialog de detalhes, alternar entre exibição de texto e `Textarea` editável
3. Adicionar botões "Editar" e "Salvar" (além do "Copiar" existente)
4. No "Salvar", fazer `UPDATE` na tabela `evolutions` (coluna `output_content`) via Supabase client e atualizar o estado local
5. Importar `Textarea` e ícones `Pencil`, `Save`, `Check`

### Fluxo do usuário

- Abre o dialog de uma evolução salva
- Clica em "Editar" → conteúdo vira editável em um Textarea
- Faz alterações → clica em "Salvar" → atualiza no banco e no estado local
- Pode cancelar a edição voltando ao modo leitura

### Segurança

A RLS policy `Users can update own evolutions` já existe e permite que o usuário autenticado atualize suas próprias evoluções. Nenhuma mudança no banco necessária.

