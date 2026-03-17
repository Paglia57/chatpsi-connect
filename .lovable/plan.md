

## Plano: Tabela Admin Responsiva + Helper Text no Perfil

### 1. Tabela de Administração responsiva (`src/pages/AdminPage.tsx`)

**Problema:** 8 colunas cortadas sem scroll horizontal visível.

**Solução:**
- Envolver a `Table` num container com `overflow-x-auto` explícito (o wrapper do componente Table já tem `overflow-auto`, mas o `div.border.rounded-lg.overflow-hidden` na linha 232 está mascarando o scroll)
- Trocar `overflow-hidden` por `overflow-x-auto` no container externo (linha 232)
- Adicionar `min-w-[900px]` na `Table` para forçar scroll horizontal em telas menores ao invés de comprimir
- Aplicar `whitespace-nowrap` nas células de Email e WhatsApp para evitar quebra
- Reduzir texto "Limpar Histórico" para ícone `RotateCcw` + tooltip em telas pequenas (já importado)

### 2. Helper text no Perfil (`src/pages/app/ProfilePage.tsx`)

**Problema:** Campos sem contexto de como serão usados no app.

**Solução — adicionar `<p className="text-xs text-muted-foreground">` abaixo de cada campo:**

| Campo | Helper text |
|-------|------------|
| Nome completo | "Usado no cabeçalho das evoluções clínicas" |
| CRP | "Formato: UF/número (ex: 06/123456). Aparece nas evoluções geradas" |
| Abordagem principal | "Será pré-selecionada ao criar novas evoluções" |
| Especialidades | "Ajudam a IA a personalizar sugestões e planos de ação" |

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/pages/AdminPage.tsx` | Container com scroll horizontal + min-width na tabela + nowrap em colunas longas + ícone no botão Limpar |
| `src/pages/app/ProfilePage.tsx` | Helper text descritivo abaixo de cada campo do formulário |

