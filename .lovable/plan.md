
## Correção proposta: mapeamento robusto da resposta do webhook n8n

### Diagnóstico confirmado
Pelos logs da edge function, o problema é de mapeamento interno:

- `Response text raw: {"response":"Aqui estão os planos..."}`
- `Extracted output length: 0`

Hoje o código extrai apenas:
- `responseData[0].output` (quando array)
- `responseData.output` (quando objeto)

Quando o n8n responde com `response` (não `output`), a função considera vazio e devolve erro ao frontend, mesmo com conteúdo válido.

### O que implementar

#### 1) Normalizar resposta do n8n em um único extrator
Arquivo: `supabase/functions/busca_plano_dispatch/index.ts`

Criar lógica única de extração com fallback em múltiplos formatos, nesta ordem:

1. Array:
   - `item.output`
   - `item.response`
   - `item.body?.output`
   - `item.body?.response`

2. Objeto:
   - `responseData.output`
   - `responseData.response`
   - `responseData.body?.output`
   - `responseData.body?.response`
   - `responseData.data?.output`
   - `responseData.data?.response`

3. Se `responseData` for string não vazia, usar como texto final.

4. Se JSON falhar, usar `responseText` bruto como output (fallback defensivo).

Também mapear `threadId` com fallback:
- `threadId`, `thread_id`, `body.threadId`, `data.threadId`.

#### 2) Ajustar critério de sucesso
Considerar sucesso quando:
- `webhookResponse.ok === true`
- `outputText.trim().length > 0`

Se vier 200 sem campo reconhecível, retornar erro explícito:
- `"Resposta do webhook sem campo de texto (output/response)"`

#### 3) Melhorar logging de diagnóstico
Adicionar logs objetivos:
- formato detectado (array/objeto/string)
- chave usada para extrair texto (`output`, `response`, etc.)
- tamanho final do texto
- status HTTP

Isso evita “falso timeout” quando na verdade é incompatibilidade de payload.

#### 4) Persistência no histórico
Salvar em `plano_chat_history.response_json` o texto normalizado em `output` (como já esperado pelo frontend), opcionalmente com metadado de origem (`source_field`) para troubleshooting futuro.

### Frontend
Sem alterações obrigatórias em `src/components/busca-plano/BuscaPlanoInterface.tsx` (ele já renderiza `response_json.output` e também fallback para `response`).

### Fluxo após correção
```text
Edge Function recebe resposta do n8n
  → Normaliza payload (output/response/variações)
  → Se houver texto: salva no histórico + retorna success true
  → Frontend recarrega histórico e exibe conteúdo normalmente
```

### Validação (obrigatória)
1. Teste E2E no `/busca-plano` com uma pergunta real.
2. Confirmar que não aparece mais “Erro ao processar requisição”.
3. Confirmar exibição do texto completo no chat.
4. Conferir logs: chave detectada deve aparecer (ex.: `response`).
5. Testar 2 formatos de payload:
   - objeto com `response`
   - array com `output`
