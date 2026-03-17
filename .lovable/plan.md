

## Problema: "Revisitar orientações" reseta o onboarding inteiro

Atualmente, o botão "Revisitar orientações" (em Suporte, no rodapé da sidebar) executa `handleResetOnboarding` que:
1. Define `has_completed_onboarding: false` e `onboarding_step: 0` — forçando o wizard completo novamente
2. Reseta `seen_guides: {}` — para reexibir os guias de primeira vez
3. Recarrega a página inteira

O usuário quer apenas **rever os guias** das ferramentas, sem refazer todo o onboarding.

## Solução

Separar as duas ações no popover de Suporte:

### 1. Alterar "Revisitar orientações" para resetar apenas os guias
- Atualizar `seen_guides: {}` no banco **sem** alterar `has_completed_onboarding` nem `onboarding_step`
- Navegar para `/app` sem recarregar a página
- Mostrar um toast de confirmação: "Guias reativados! Visite cada ferramenta para revê-los."

### 2. Adicionar opção separada "Refazer onboarding" (opcional)
- Manter a lógica atual de reset completo como opção secundária, caso o usuário realmente queira refazer o onboarding

### Arquivo: `src/components/chat/ChatSidebar.tsx`
- Criar `handleResetGuides` que faz apenas `update({ seen_guides: {} })`
- Alterar o botão "Revisitar orientações" para chamar `handleResetGuides`
- Adicionar um novo botão "Refazer onboarding" com a lógica atual de `handleResetOnboarding`

