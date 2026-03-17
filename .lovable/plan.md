

## Add FirstTimeGuide orientations to all AI modules

Currently only the Marketing module has the rich `FirstTimeGuide` component (with icon, title, tips, example suggestions, and CTA). The other modules (Chat Clínico, Busca Plano, Busca Artigos, Evolução) have basic empty states without the guided orientation format. During the tour, users should see these orientations on each module page.

### What changes

**Add `FirstTimeGuide` to 4 modules**, following the same pattern as Marketing (using `seen_guides` from profile to track dismissal):

1. **`ChatInterface.tsx`** — Add FirstTimeGuide above the empty state, shown when `!profile?.seen_guides?.chat` and no messages exist. Tips about sending text/audio, asking clinical questions, consulting protocols. Examples: "Quais técnicas de TCC para ansiedade?", "Sugira atividades para um paciente com depressão", "Critérios diagnósticos do TDAH no DSM-5".

2. **`BuscaPlanoInterface.tsx`** — Add FirstTimeGuide shown when `!profile?.seen_guides?.plano` and no messages. Tips about describing clinical cases, getting personalized plans. Examples: "Plano de ação para depressão em adolescentes", "Intervenções para ansiedade generalizada", "Estratégias para TDAH em adultos".

3. **`BuscaArtigosInterface.tsx`** — Add FirstTimeGuide shown when `!profile?.seen_guides?.artigos` and no messages. Tips about searching by topic/technique, using references in reports. Examples: "Artigos sobre eficácia da TCC para TOC", "Evidências sobre mindfulness na ansiedade", "Estudos recentes sobre EMDR".

4. **`EvolutionPage.tsx`** (or `EvolutionInput.tsx`) — Add FirstTimeGuide shown when `!profile?.seen_guides?.evolution`. Tips about text/audio input, selecting patient for context, editing the generated output. Examples won't apply here since it's a form, so the CTA will dismiss and reveal the form.

### Why this works with the tour

The tour navigates to each page. New users won't have `seen_guides` set, so the `FirstTimeGuide` will naturally be visible when the tour arrives at each module — no special tour integration needed. Each guide dismisses independently via the CTA button or example click, persisting to `seen_guides` in the profile.

### Files to modify
- `src/components/chat/ChatInterface.tsx`
- `src/components/busca-plano/BuscaPlanoInterface.tsx`
- `src/components/busca-artigos/BuscaArtigosInterface.tsx`
- `src/pages/app/EvolutionPage.tsx` (or `src/components/evolution/EvolutionInput.tsx`)

