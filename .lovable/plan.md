

## Ajustes no Tour Guiado

### 1. Remover o ponto vermelho (beacon)

O ponto rosa/vermelho pulsante é o **beacon** padrão do `react-joyride`. Ele aparece nos steps que não têm `disableBeacon: true`. Atualmente só o primeiro step tem essa configuração. A solução é adicionar `disableBeacon: true` em **todos** os steps do tour.

### 2. Enriquecer os tooltips com orientações de uso

Atualmente os tooltips têm apenas uma frase descritiva. Vamos expandir o conteúdo de cada step para incluir **dicas práticas** (como os antigos `FirstTimeGuide` tinham com tips e exemplos), de forma condensada para caber no tooltip. Cada step terá:
- Descrição principal (1-2 frases)
- 2-3 dicas curtas como lista com bullets dentro do tooltip

O componente `CustomTooltip` será ajustado para renderizar conteúdo JSX (React nodes) no campo `content`, permitindo listas formatadas dentro do popup.

### Arquivos a alterar

**`src/components/ui/GuidedTour.tsx`**:
- Adicionar `disableBeacon: true` em todos os 9 steps
- Trocar o `content` de string para JSX com descrição + dicas práticas por módulo:
  - **Início**: Estatísticas, atalhos rápidos
  - **Evolução**: Envie texto ou áudio, receba evolução estruturada, selecione paciente
  - **Pacientes**: Cadastre pacientes, adicione diagnósticos, contexto para IA
  - **Chat Clínico**: Pergunte sobre protocolos, peça sugestões de intervenção
  - **Planos de Ação**: Busque planos terapêuticos por quadro clínico
  - **Artigos**: Encontre evidências científicas para intervenções
  - **Marketing**: Crie posts, carrosseis, textos educativos
  - **Indicações**: Compartilhe código, ganhe benefícios
  - **Suporte**: Revisitar tour, falar com suporte
- Ajustar `CustomTooltip` para renderizar `step.content` como ReactNode (já suportado pelo Joyride)

