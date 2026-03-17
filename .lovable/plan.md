

## Tour guiado com popups por módulo

### Conceito
Substituir os guias inline (`FirstTimeGuide`) por um sistema de **tour guiado interativo** usando tooltips/popovers que apontam para elementos específicos da sidebar e da interface, conduzindo o usuário passo a passo pelos módulos.

### Abordagem: React Joyride
Usar a biblioteca [react-joyride](https://github.com/gilbarbara/react-joyride) — a mais popular para tours guiados em React. Ela:
- Renderiza tooltips posicionados em elementos do DOM via seletores CSS
- Suporta navegação passo a passo (próximo/anterior/pular)
- Inclui overlay com spotlight no elemento alvo
- É customizável visualmente (cores, botões, textos)
- Suporta callback para saber quando o tour terminou

### Implementação

**1. Instalar dependência**
```
npm install react-joyride
```

**2. Criar componente `GuidedTour.tsx`**
- Componente wrapper que recebe o estado `run` (ativo/inativo) e `onFinish`
- Define os steps do tour, cada um apontando para um seletor CSS na sidebar/página:
  - Step 1: Sidebar item "Início" → "Aqui é seu painel principal com estatísticas"
  - Step 2: Grupo "Evolução" → "Crie evoluções clínicas com IA aqui"
  - Step 3: "Pacientes" → "Gerencie seus pacientes e fichas"
  - Step 4: "Chat Clínico" → "Consulte protocolos e tire dúvidas clínicas"
  - Step 5: "Buscar Artigos" → "Encontre evidências científicas"
  - Step 6: "Planos de Ação" → "Monte planos terapêuticos"
  - Step 7: "Marketing" → "Crie conteúdo para redes sociais"
  - Step 8: "Suporte" → "Aqui você pode revisitar este tour quando quiser"
- Tooltip customizado com estilo do app (cores, fontes, border-radius)
- Textos dos botões em português: "Próximo", "Anterior", "Pular", "Finalizar"

**3. Adicionar `data-tour` attributes nos itens da sidebar**
- No `ChatSidebar.tsx`, adicionar atributos como `data-tour="nav-inicio"`, `data-tour="nav-evolucao"`, etc. nos NavLinks e seções para que o Joyride encontre os elementos.

**4. Integrar o tour no `AppLayout.tsx`**
- Importar `GuidedTour`
- Controlar estado `run` baseado em `profile?.seen_guides?.tour !== true`
- Ao finalizar, salvar `seen_guides: { ...current, tour: true }` no Supabase

**5. Atualizar "Revisitar orientações" no `ChatSidebar.tsx`**
- `handleResetGuides` já reseta `seen_guides: {}` — o tour será reativado automaticamente ao navegar para `/app`

**6. Remover `FirstTimeGuide` das interfaces**
- Remover o componente dos 3 arquivos: `ChatInterface.tsx`, `BuscaArtigosInterface.tsx`, `BuscaPlanoInterface.tsx`
- O `FirstTimeGuide.tsx` pode ser mantido ou removido conforme preferência

### Arquivos alterados
- `package.json` — adicionar `react-joyride`
- `src/components/ui/GuidedTour.tsx` — novo componente
- `src/components/chat/ChatSidebar.tsx` — adicionar `data-tour` nos elementos de navegação
- `src/components/app/AppLayout.tsx` — integrar o tour
- `src/components/chat/ChatInterface.tsx` — remover FirstTimeGuide
- `src/components/busca-artigos/BuscaArtigosInterface.tsx` — remover FirstTimeGuide
- `src/components/busca-plano/BuscaPlanoInterface.tsx` — remover FirstTimeGuide

