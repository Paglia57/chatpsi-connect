

## Correção: EvolutionInput não está sendo renderizado

### Problema
O componente `EvolutionInput` é importado na linha 2 do `EvolutionPage.tsx`, mas nunca é incluído no JSX de retorno. A página só renderiza o breadcrumb e o output condicional — por isso aparece em branco.

### Correção
Adicionar `<EvolutionInput onGenerate={handleGenerate} />` no JSX, entre o breadcrumb e o output condicional.

### Arquivo alterado

| Arquivo | Mudança |
|---------|---------|
| `src/pages/app/EvolutionPage.tsx` | Adicionar `<EvolutionInput onGenerate={handleGenerate} />` no return, logo após o `AppBreadcrumb` |

