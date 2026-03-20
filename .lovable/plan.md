

## Corrigir links falsos no módulo Planos de Ação

### Problema
O assistant `asst_esHKfSJcaMNF99QVrILGu6pW` possui ferramentas (tools) configuradas que permitem buscar links reais. Porém, a edge function `busca_plano_dispatch` envia instruções explícitas para **não usar ferramentas** e cancela runs que tentam usá-las (`requires_action`). Isso força o assistant a inventar links fictícios como `https://example.com/plano-tdah-adultos`.

### Solução

**Arquivo: `supabase/functions/busca_plano_dispatch/index.ts`**

1. **Remover as `additional_instructions`** que bloqueiam o uso de tools — deixar o assistant usar suas ferramentas naturalmente
2. **Tratar `requires_action` corretamente**: em vez de cancelar o run, extrair os tool calls e submeter os resultados de volta via `submit_tool_outputs`, permitindo que o assistant complete a resposta com dados reais
3. Para function calls cujo comportamento não conhecemos no backend, submeter um output genérico de reconhecimento para que o run prossiga sem travar

### Fluxo corrigido
```text
User msg → Create run (sem additional_instructions bloqueando tools)
  → Poll status
  → Se requires_action:
      → Ler tool_calls do run
      → Submeter tool_outputs (resultados ou acknowledgement)
      → Continuar polling
  → Se completed: extrair resposta normalmente
```

### Impacto
- Apenas a edge function é alterada
- O frontend (`BuscaPlanoInterface.tsx`) não precisa de mudanças — já renderiza o texto da resposta com `formatMessageContent`

