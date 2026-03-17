

## Correção: "Pular configuração" não funciona

### Problema

Quando o usuário clica "Pular configuração" no step 0 (Boas-vindas), o `handleSkip` salva `onboarding_step: 0`. Na HomePage, a lógica verifica:

```
if (step === 0) → showOnboarding = true  // reabre o wizard!
```

Isso cria um loop infinito — o wizard sempre reabre.

### Solução

No `handleSkip` do `OnboardingWizard.tsx`, salvar `onboarding_step` como `Math.max(currentStep, 1)` para garantir que o step nunca fique em 0 após pular. Assim a HomePage entra no branch do banner de retomada em vez de reabrir o wizard.

**Arquivo:** `src/components/onboarding/OnboardingWizard.tsx` — linha 31, trocar `currentStep` por `Math.max(currentStep, 1)`.

