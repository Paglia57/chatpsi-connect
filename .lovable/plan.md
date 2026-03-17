

## Plano: Corrigir busca_plano_dispatch — dois bugs identificados nos logs

### Problemas encontrados

Os logs mostram dois erros distintos:

1. **`requires_action` infinito → timeout**: O assistant `asst_esHKfSJcaMNF99QVrILGu6pW` tem tools (function calling) configuradas. Quando o run entra em `requires_action`, o código atual não trata esse status — fica em loop de polling por 90s e dá timeout.

2. **"Can't add messages while a run is active"**: Quando o timeout acontece, o run anterior fica ativo na thread. Na próxima requisição, tentar adicionar mensagem falha com erro 400.

### Correções

Alterar `supabase/functions/busca_plano_dispatch/index.ts`:

**A. Tratar `requires_action`**: Quando o run pedir function calling, cancelar o run (já que não temos como executar as tools do assistant neste contexto) e retornar erro amigável. Ou, melhor ainda: submeter tool outputs vazios/dummy para que o assistant continue sem a tool.

A abordagem mais robusta: **cancelar o run** com `POST /threads/{threadId}/runs/{runId}/cancel` e criar um novo run com `additional_instructions` pedindo para responder sem usar tools.

**B. Verificar runs ativos antes de adicionar mensagem**: Antes de enviar nova mensagem na thread, verificar se há runs ativos (`GET /threads/{threadId}/runs?limit=1`) e cancelá-los se existirem.

### Arquivo alterado

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/busca_plano_dispatch/index.ts` | Adicionar cancelamento de runs ativos antes de enviar mensagem; tratar status `requires_action` no polling |

