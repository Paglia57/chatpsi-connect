

## Mostrar FirstTimeGuide quando tour ativo OU módulo vazio

### Problema
Atualmente o `FirstTimeGuide` só aparece quando `!seen_guides?.X` E o módulo está vazio. Se o usuário já dismissou o guide mas depois ativa o tour (via "Revisitar orientações"), as orientações não aparecem.

### Solução

1. **Compartilhar estado do tour via Outlet context** — Em `AppLayout.tsx`, passar `runTour` via `<Outlet context={{ tourActive: runTour }} />`.

2. **Consumir nos módulos** — Em cada módulo (Chat, Plano, Artigos, Evolução, Marketing), usar `useOutletContext()` para obter `tourActive` e mudar a condição de exibição do `FirstTimeGuide`:
   - **De**: `messages.length === 0 && !seen_guides?.X`
   - **Para**: `messages.length === 0 && (!seen_guides?.X || tourActive)`
   - Para Evolução (sem messages): `(!seen_guides?.evolution || tourActive) && !guideDismissed`

3. **Não persistir dismiss durante tour** — Quando o tour está ativo, o `onDismiss` do FirstTimeGuide NÃO deve gravar `seen_guides` (para não marcar como visto permanentemente durante o tour). Apenas setar o state local `guideDismissed`.

### Arquivos a alterar
- `src/components/app/AppLayout.tsx` — adicionar `context` ao `<Outlet>`
- `src/components/chat/ChatInterface.tsx` — consumir `tourActive`, ajustar condição
- `src/components/busca-plano/BuscaPlanoInterface.tsx` — idem
- `src/components/busca-artigos/BuscaArtigosInterface.tsx` — idem
- `src/pages/app/EvolutionPage.tsx` — idem
- `src/components/marketing/MarketingInterface.tsx` — idem (se aplicável)

