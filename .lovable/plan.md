

## Plano: Redesign da Página de Histórico

### 1. Cards de evolução redesenhados (`HistoryPage.tsx`)

**Melhorias visuais nos cards da lista:**
- Iniciais do paciente em avatar circular (2 letras, bg-primary/10, text-primary) à esquerda
- Nome (initials) em `font-semibold text-base` com destaque
- Data formatada em destaque: dia numérico grande + mês abreviado (ex: "17 Mar")
- Metadata inline: sessão nº, duração, tipo — em chips/badges pequenos
- Tag de abordagem com cor de fundo `bg-primary/10 text-primary` em vez de `bg-accent`
- Preview do conteúdo: extrair primeira linha significativa (ignorando headers em CAPS e linhas vazias), exibir em `line-clamp-2` com `text-muted-foreground`
- Manter botão de delete no canto

### 2. Modal de detalhe formatado (`HistoryPage.tsx`)

**Conteúdo formatado com seções estilizadas (reutilizar a mesma lógica de parsing do `EvolutionOutput`):**
- Linhas em CAPS LOCK → `<h3>` com `font-display font-semibold uppercase tracking-wide` + `Separator` abaixo
- Linhas "Data:" / "Paciente:" → metadata estilizada em `text-muted-foreground`
- Texto normal → parágrafos com `leading-relaxed`
- Linhas `---` → `<Separator />`
- Usar `Collapsible` do shadcn para cada seção (header clicável que expande/colapsa o conteúdo daquela seção)

**Botões de ação adicionais:**
- Manter "Editar" e "Copiar"
- Adicionar "Exportar PDF" (reutilizar a mesma lógica de `handleExportPdf` do `EvolutionOutput`)

### 3. Helper de parsing compartilhado

Extrair a lógica de parsing de linhas (detectar headers CAPS, separadores, metadata) para uma função utilitária `parseEvolutionContent(content: string)` que retorna um array de `{ type: 'heading' | 'metadata' | 'separator' | 'text', content: string }`. Usar tanto no `EvolutionOutput` quanto no modal do `HistoryPage`.

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/evolutionParser.ts` | Novo — função de parsing compartilhada |
| `src/pages/app/HistoryPage.tsx` | Redesign cards + modal formatado com seções colapsáveis + exportar PDF |
| `src/components/evolution/EvolutionOutput.tsx` | Refatorar para usar parser compartilhado |

