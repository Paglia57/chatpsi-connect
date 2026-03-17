

## Tour Guiado com Navegação entre Módulos

### Conceito
Transformar o tour atual (que apenas aponta para itens da sidebar) em um tour **navegacional**: a cada passo, o usuário é levado até a página do módulo correspondente e vê um popup contextual explicando as funcionalidades daquela tela. Ao clicar "Próximo", navega automaticamente para o próximo módulo.

### Fluxo do Tour (9 passos)

```text
Step 1: /app           → Destaca área de atalhos/stats  → "Seu painel principal"
Step 2: /app/evolucao  → Destaca formulário de evolução  → "Crie evoluções com IA"
Step 3: /app/pacientes → Destaca lista de pacientes      → "Gerencie seus pacientes"
Step 4: /chat          → Destaca área do chat             → "Tire dúvidas clínicas"
Step 5: /busca-plano   → Destaca interface de busca       → "Monte planos terapêuticos"
Step 6: /busca-artigos → Destaca interface de artigos     → "Encontre evidências científicas"
Step 7: /marketing     → Destaca interface de marketing   → "Crie conteúdo para redes sociais"
Step 8: /app/indicacoes→ Destaca card de indicação        → "Indique colegas e ganhe"
Step 9: Sidebar suporte→ Destaca botão de suporte         → "Revisitar tour aqui"
```

### Implementação Técnica

**1. Reescrever `GuidedTour.tsx` com modo controlado**
- Usar Joyride em modo `controlled` (`stepIndex` gerenciado manualmente)
- Cada step terá metadado extra `route` indicando para onde navegar
- No callback `STEP_BEFORE`, navegar para a rota correspondente via `useNavigate`
- Aguardar um breve delay (300ms) após navegação para o DOM renderizar antes de posicionar o tooltip
- Receber `navigate` como prop do AppLayout

**2. Adicionar `data-tour` nos conteúdos de cada página**
- `HomePage.tsx`: `data-tour="page-home"` no container de atalhos
- `EvolutionPage.tsx`: `data-tour="page-evolution"` no formulário
- `PatientsPage.tsx`: `data-tour="page-patients"` no card principal
- `ChatInterface.tsx`: `data-tour="page-chat"` na área de mensagens
- `BuscaPlanoInterface.tsx`: `data-tour="page-plano"` no container
- `BuscaArtigosInterface.tsx`: `data-tour="page-artigos"` no container
- `MarketingInterface.tsx`: `data-tour="page-marketing"` no container
- `ReferralsPage.tsx`: `data-tour="page-indicacoes"` no card principal

**3. Atualizar `AppLayout.tsx`**
- Passar `navigate` para o GuidedTour
- Ao finalizar, navegar de volta para `/app`

**4. Lógica de navegação no callback**
```typescript
const handleStepChange = (data: CallBackProps) => {
  if (data.action === 'next' || data.action === 'prev') {
    const targetRoute = steps[data.index].data?.route;
    if (targetRoute && location.pathname !== targetRoute) {
      navigate(targetRoute);
      // delay para DOM renderizar
      setTimeout(() => setStepIndex(data.index), 400);
      return;
    }
  }
};
```

### Arquivos alterados
- `src/components/ui/GuidedTour.tsx` — reescrever com navegação controlada
- `src/components/app/AppLayout.tsx` — passar navigate
- `src/pages/app/HomePage.tsx` — adicionar `data-tour="page-home"`
- `src/pages/app/EvolutionPage.tsx` — adicionar `data-tour="page-evolution"`
- `src/pages/app/PatientsPage.tsx` — adicionar `data-tour="page-patients"`
- `src/components/chat/ChatInterface.tsx` — adicionar `data-tour="page-chat"`
- `src/components/busca-plano/BuscaPlanoInterface.tsx` — adicionar `data-tour="page-plano"`
- `src/components/busca-artigos/BuscaArtigosInterface.tsx` — adicionar `data-tour="page-artigos"`
- `src/components/marketing/MarketingInterface.tsx` — adicionar `data-tour="page-marketing"`
- `src/pages/app/ReferralsPage.tsx` — adicionar `data-tour="page-indicacoes"`

