

## Corrigir exibição e adicionar reset no Planos de Ação

### Problemas identificados

**1. Resposta exibida como JSON bruto**
O frontend tenta acessar `response_json.response` mas a edge function salva como `response_json.output`. Como `.response` é `undefined`, cai no fallback `JSON.stringify` — exibindo `{ "output": "..." }` ao invés do texto limpo.

**2. Assistant recusa repetir temas**
A thread persistente acumula todo o histórico. Quando o usuário pede algo similar, o assistant responde "já enviei anteriormente". O usuário quer manter memória mas ter opção de resetar.

### Solução

**Arquivo: `src/components/busca-plano/BuscaPlanoInterface.tsx`**

1. Corrigir a extração do texto da resposta: trocar `response_json?.response` por `response_json?.output` (linha 246)
2. Adicionar botão "Nova conversa" no header que:
   - Limpa `threads_plano` no perfil via Supabase update (usando service role ou admin function)
   - Limpa o histórico local de mensagens
   - Permite que a próxima mensagem crie uma thread nova

**Arquivo: `supabase/functions/busca_plano_dispatch/index.ts`**

3. Adicionar suporte a um parâmetro opcional `reset_thread: true` no body:
   - Se presente, limpar `threads_plano` do perfil antes de processar
   - Criar nova thread e prosseguir normalmente
   - Isso evita a necessidade de uma edge function separada ou de expor o campo `threads_plano` ao client

### Fluxo do reset
```text
User clica "Nova conversa"
  → Frontend envia próxima msg com { reset_thread: true }
  → Edge function limpa threads_plano, cria thread nova
  → Frontend limpa histórico visual (messages state)
```

### Arquivos a modificar
- `src/components/busca-plano/BuscaPlanoInterface.tsx` — fix display + botão reset
- `supabase/functions/busca_plano_dispatch/index.ts` — suporte a reset_thread

