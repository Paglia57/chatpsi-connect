

## Fix: Botões "Finalizar" e "Anterior" não funcionam no tour

### Problema identificado

No `handleCallback`, quando o usuário clica "Finalizar" no último step, o Joyride dispara `STEP_AFTER` com `index = 8`. O código calcula `nextIndex = 9`, que é `>= tourSteps.length (9)`, e faz `return` sem fazer nada. O `STATUS.FINISHED` nunca é atingido porque o código aborta antes.

### Solução

Em `src/components/ui/GuidedTour.tsx`, na linha 282, em vez de simplesmente `return` quando `nextIndex >= tourSteps.length`, finalizar o tour:

```typescript
if (nextIndex >= tourSteps.length) {
  setInternalRun(false);
  navigate('/app');
  onFinish();
  return;
}
if (nextIndex < 0) return;
```

Isso garante que clicar "Finalizar" no último step encerra o tour corretamente.

### Arquivo a alterar
- `src/components/ui/GuidedTour.tsx` — linha 282

