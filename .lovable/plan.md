

## Plano: Melhorar Empty States de Planos de Ação e Artigos Científicos

### Mudanças em ambas as interfaces

**1. Empty state com sugestões clicáveis (`BuscaPlanoInterface.tsx` e `BuscaArtigosInterface.tsx`)**

Substituir o empty state atual (ícone + título + 1 linha de texto) por:

- Ícone maior com fundo circular `bg-primary/10`
- Título e descrição mais orientadores
- **Grid de sugestões clicáveis** (2 colunas, 4-6 sugestões) — cada sugestão é um botão `variant="outline"` com ícone pequeno que, ao clicar, preenche o textarea e envia automaticamente

**Sugestões para Plano de Ação:**
- "Plano de ação para depressão em adolescentes"
- "Intervenções para ansiedade generalizada"
- "Estratégias para TDAH em adultos"
- "Plano terapêutico para luto complicado"
- "Manejo de crise em ideação suicida"
- "Intervenções para transtorno alimentar"

**Sugestões para Artigos Científicos:**
- "Eficácia da TCC para TEPT"
- "Mindfulness e redução de ansiedade"
- "Neuroplasticidade e psicoterapia"
- "Terapia de esquemas para transtornos de personalidade"
- "Psicoterapia online vs presencial"
- "Intervenções baseadas em evidências para depressão"

**2. Diferenciação visual entre as duas páginas**

- **Plano de Ação**: manter ícone `Sparkles`, cor accent `bg-amber-500/10 text-amber-600` nas sugestões
- **Artigos**: manter ícone `BookOpen`, cor accent `bg-blue-500/10 text-blue-600` nas sugestões

Isso cria identidade visual distinta para cada ferramenta.

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/busca-plano/BuscaPlanoInterface.tsx` | Empty state rico com sugestões clicáveis temáticas |
| `src/components/busca-artigos/BuscaArtigosInterface.tsx` | Empty state rico com sugestões clicáveis temáticas |

