

## Micro-interações no Onboarding

### 1. Loading state melhorado — `StepEvolution.tsx`

Substituir o loading atual (spinner + texto simples) por um card centralizado com:
- Ícones rotativos: `Search`, `FileText`, `CheckCircle` emparelhados com os 3 textos
- Transição fade entre textos (usando `key` + `animate-fade-in`)
- Progress bar indeterminada abaixo (CSS animation `@keyframes` com barra que desliza infinitamente)
- Esconder o formulário inteiro durante geração, mostrando apenas o card de loading

### 2. Animação nos checkboxes — `StepProfile.tsx`

- Envolver cada label de especialidade em um `div` com classes de transição: `transition-all duration-200`
- Quando selecionado, aplicar `bg-teal-50 border border-teal-200 rounded-lg scale-[1.02]`
- Quando não selecionado, fundo transparente e borda transparente
- Adicionar `transform` transition para o efeito de scale sutil no toggle

### 3. Transição entre steps — `OnboardingWizard.tsx`

Adicionar estado `direction` (forward/back) e `isTransitioning`. Ao mudar step:
- Conteúdo atual recebe classe `animate-fade-out` + `translate-x` negativo
- Após 200ms (via setTimeout), trocar o step e aplicar `animate-fade-in` + `translate-x` positivo
- A progress bar já tem `transition-all duration-500` — sem mudança necessária

Alternativa mais simples (e suficiente): adicionar keyframes `slide-in-from-right` no tailwind config e usar `key={currentStep}` com a nova animação. Vou usar essa abordagem para manter simples.

### 4. Confetti customizado — `StepCelebration.tsx`

Atualizar chamada do `confetti()` para usar as cores da marca:
```js
confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, colors: ['#0d9488', '#ec4899', '#f59e0b'] });
```

### Arquivos a alterar

| Arquivo | Mudança |
|---------|---------|
| `src/components/onboarding/StepEvolution.tsx` | Loading card com ícones rotativos + progress bar indeterminada |
| `src/components/onboarding/StepProfile.tsx` | Estilo animado nos checkboxes de especialidades |
| `src/components/onboarding/OnboardingWizard.tsx` | Keyframe slide-in para transição entre steps |
| `src/components/onboarding/StepCelebration.tsx` | Cores customizadas no confetti |
| `tailwind.config.ts` | Adicionar keyframe `slide-in-right-fade` para transições de step |

