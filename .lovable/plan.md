

## Tornar cards de features clicáveis no StepCelebration

### Mudança

No `src/components/onboarding/StepCelebration.tsx`:

1. Adicionar rota a cada feature:
```typescript
const features = [
  { ..., route: '/chat' },
  { ..., route: '/busca-artigos' },
  { ..., route: '/busca-plano' },
  { ..., route: '/marketing' },
];
```

2. Aceitar `onFinish` como callback que completa o onboarding (já existe). Adicionar uma nova prop `onNavigate` ou usar `useNavigate` diretamente.

3. Ao clicar num card: completar o onboarding (mesma lógica do `onFinish`) e depois navegar para a rota correspondente via `useNavigate`.

4. Adicionar estilo hover nos cards (`hover:border-primary/40 cursor-pointer transition-colors`) para indicar que são clicáveis.

**Arquivo:** `src/components/onboarding/StepCelebration.tsx` — adicionar `useNavigate`, rotas nos features, handler de clique que chama `onFinish()` e navega.

No `OnboardingWizard.tsx`, o `handleFinish` já salva `has_completed_onboarding: true` e chama `onComplete`. O StepCelebration precisa receber uma versão que permita navegar para uma rota específica após finalizar. A forma mais simples: passar `onFinishAndNavigate(route)` como prop adicional, ou fazer o StepCelebration chamar `onFinish()` e depois `navigate(route)` internamente.

