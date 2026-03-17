

## Plano: Redesign da Página de Evolução

### Mudanças

**1. Layout coluna única (`EvolutionPage.tsx`)**
- Remover `grid grid-cols-1 lg:grid-cols-2` → usar coluna única `max-w-3xl mx-auto`
- `EvolutionOutput` renderiza abaixo do `EvolutionInput` (só aparece quando há conteúdo ou está gerando)
- Eliminar o empty state com ícone placeholder — sem conteúdo, simplesmente não renderiza o output

**2. Textarea maior (`EvolutionInput.tsx`)**
- Trocar `Textarea` por `AutoTextarea` (já existe no projeto) com `minRows={8}` (~200px) e `maxRows={20}`
- Auto-resize conforme o texto cresce

**3. Grid dos 3 campos de sessão (`EvolutionInput.tsx`)**
- Manter `grid grid-cols-1 sm:grid-cols-3 gap-4`
- Adicionar `min-w-0` nos containers filhos para evitar overflow
- Usar labels mais curtos: "Nº sessão", "Duração", "Tipo"

**4. "Sem paciente cadastrado" como Switch (`EvolutionInput.tsx`)**
- Substituir o link de texto por um `Switch` do shadcn + label "Sem paciente cadastrado"
- Quando ativo, mostra o campo de iniciais; quando desativado, mostra o `PatientSelector`
- Mais visível e claro que um link azul

**5. Renomear "Evolução Clínica" → "Evolução" no output**
- Atualizar títulos em `EvolutionOutput.tsx`
- Atualizar texto do botão "Gerar Evolução Clínica" → "Gerar Evolução"

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/app/EvolutionPage.tsx` | Layout coluna única, output condicional |
| `src/components/evolution/EvolutionInput.tsx` | AutoTextarea, labels curtos, Switch para modo avulso, renomear botão |
| `src/components/evolution/EvolutionOutput.tsx` | Remover empty state, renomear títulos |

