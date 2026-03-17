

## Trial Limitado para Usuários Não-Assinantes — IMPLEMENTADO ✅

### Limites por feature
| Feature | Limite mensal | Tabela |
|---------|-------------|--------|
| Evolução Clínica | 2 | `evolutions` |
| IA de Marketing | 2 | `marketing_texts` |
| Planos de Ação | 3 | `plano_chat_history` |
| Artigos Científicos | 3 | `artigos_chat_history` |

### Arquivos criados
- `src/hooks/useTrialLimit.ts`
- `src/components/ui/TrialLimitBanner.tsx`

### Arquivos modificados
- `src/pages/app/EvolutionPage.tsx`
- `src/components/evolution/EvolutionInput.tsx`
- `src/components/marketing/MarketingInterface.tsx`
- `src/components/busca-plano/BuscaPlanoInterface.tsx`
- `src/components/busca-artigos/BuscaArtigosInterface.tsx`
