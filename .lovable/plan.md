

## Adicionar suporte a áudio no StepEvolution do onboarding

### Problema
Atualmente o step de evolução no onboarding só aceita texto. O módulo principal (`EvolutionInput`) já suporta upload de áudio e gravação, mas o onboarding não oferece essa opção.

### Solução

Adicionar tabs "Texto" / "Áudio" no `StepEvolution.tsx`, replicando a lógica de upload de áudio do `EvolutionInput`:

**Arquivo: `src/components/onboarding/StepEvolution.tsx`**

1. Adicionar estados para `activeTab`, `audioFile`, `isDragging`, e ref para file input
2. Adicionar `Tabs` (Texto / Áudio) envolvendo o campo de anotações atual e uma nova área de upload de áudio (drag-and-drop + seleção de arquivo + preview com player)
3. Atualizar `handleGenerate`:
   - Se áudio: converter arquivo para base64, enviar com `input_type: 'audio'`, `audio_base64`, `audio_filename`
   - Se texto: manter lógica atual
4. Atualizar validação `canSubmit`: aceitar texto com 10+ chars OU arquivo de áudio selecionado
5. Salvar `input_type` corretamente no insert da evolução

### Componentes reutilizados
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (já existentes no projeto)
- Mesmos ícones: `Mic`, `Upload`, `X`
- Mesmo estilo de drag-and-drop e preview de áudio do `EvolutionInput`

### Escopo
- Apenas `src/components/onboarding/StepEvolution.tsx` será alterado

