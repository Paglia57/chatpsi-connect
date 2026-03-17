

## Trial Limitado para Usuários Não-Assinantes

### Resumo
Implementar um sistema de trial que permite usos gratuitos limitados por mês para usuários sem assinatura ativa. Após atingir o limite, o botão de ação vira paywall.

### Limites por feature
| Feature | Limite mensal | Tabela de contagem |
|---------|--------------|-------------------|
| Evolução Clínica | 2 | `evolutions` |
| IA de Marketing | 2 | `marketing_texts` |
| Planos de Ação | 3 | `plano_chat_history` |
| Artigos Científicos | 3 | `artigos_chat_history` |

### Abordagem técnica

**1. Hook compartilhado `useTrialLimit`**

Criar `src/hooks/useTrialLimit.ts` — um hook reutilizável que:
- Recebe o nome da tabela e o limite mensal
- Consulta a contagem de registros do usuário no mês atual (`created_at >= início do mês`)
- Retorna `{ usageCount, limit, hasReachedLimit, isLoading }`
- Apenas aplica o limite quando `profile.subscription_active === false`

```typescript
// Exemplo de uso
const { hasReachedLimit, usageCount, limit } = useTrialLimit('evolutions', 2);
```

**2. Componente `TrialLimitBanner`**

Criar `src/components/ui/TrialLimitBanner.tsx` — banner informativo que:
- Mostra "Você usou X de Y gratuitos este mês" quando ainda tem usos
- Mostra paywall "Assine para continuar" quando atingiu o limite
- Inclui botão de CTA para assinatura

**3. Alterações por feature**

**Evolução (`EvolutionInput.tsx` + `EvolutionPage.tsx`)**:
- Adicionar `useTrialLimit('evolutions', 2)`
- Mostrar `TrialLimitBanner` acima do formulário
- Quando `hasReachedLimit`: desabilitar botão "Gerar Evolução" e trocar texto para "Assinar para continuar gerando"

**Marketing (`MarketingInterface.tsx`)**:
- Adicionar `useTrialLimit('marketing_texts', 2)`
- Mostrar banner no tab "novo"
- Quando `hasReachedLimit`: desabilitar botão "Gerar com IA" e trocar texto

**Planos de Ação (`BuscaPlanoInterface.tsx`)**:
- Substituir check atual `if (!profile?.subscription_active)` por lógica de trial
- Usar `useTrialLimit('plano_chat_history', 3)`
- Quando `hasReachedLimit`: desabilitar input e botão de envio

**Artigos Científicos (`BuscaArtigosInterface.tsx`)**:
- Mesma lógica do Planos de Ação
- Usar `useTrialLimit('artigos_chat_history', 3)`

### Notas
- A contagem é feita client-side via query Supabase (as RLS policies já filtram por `user_id`)
- Usuários com `subscription_active = true` nunca veem limites
- O hook recarrega a contagem após cada geração bem-sucedida via callback `refetch`
- Nenhuma migração de banco necessária — as tabelas já existem com `created_at`

### Arquivos a criar
- `src/hooks/useTrialLimit.ts`
- `src/components/ui/TrialLimitBanner.tsx`

### Arquivos a modificar
- `src/pages/app/EvolutionPage.tsx`
- `src/components/evolution/EvolutionInput.tsx`
- `src/components/marketing/MarketingInterface.tsx`
- `src/components/busca-plano/BuscaPlanoInterface.tsx`
- `src/components/busca-artigos/BuscaArtigosInterface.tsx`

