

## Problema: Edge function expira antes do n8n terminar

### Diagnóstico

- A edge function recebeu o request (log confirma)
- Mas nunca logou "Plano gerado com sucesso" — indica que o fetch ao n8n expirou ou retornou vazio
- O frontend mostra `{ "output": "" }` — o webhook respondeu com output vazio
- O n8n processou corretamente (o usuário confirmou que a execution teve resposta)

**Causa provável**: Supabase edge functions têm timeout padrão de ~60s. O n8n precisa de mais tempo para rodar o OpenAI Assistant (criar thread, executar run, aguardar resposta). A edge function expira antes do n8n terminar, ou o n8n está respondendo imediatamente (modo "Respond Immediately") antes de processar.

### Solução em 2 partes

**1. Edge function — aumentar resiliência e logging**

Arquivo: `supabase/functions/busca_plano_dispatch/index.ts`

- Adicionar `AbortController` com timeout de 120s no fetch ao n8n
- Adicionar logs detalhados: antes do fetch, status da resposta, tamanho do output, e caso de output vazio
- Logar o responseText bruto para diagnóstico

**2. Verificação do lado do n8n (recomendação ao usuário)**

O webhook do n8n pode estar configurado em modo **"Respond Immediately"** — ele retorna `{}` ou `""` de imediato e processa em background. O correto é usar **"Respond to Webhook"** no nó final do workflow, para que o n8n só responda depois de ter o output do assistant.

### Mudanças no código

```text
// Adicionar ao fetch:
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s

const webhookResponse = await fetch(webhookUrl, {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({ input: input_text, user_id: userId }),
  signal: controller.signal,
});
clearTimeout(timeoutId);

// Adicionar logs:
console.log('Webhook response status:', statusCode);
console.log('Response text raw:', responseText.substring(0, 500));
console.log('Extracted output length:', outputText.length);
```

### Arquivos a modificar
- `supabase/functions/busca_plano_dispatch/index.ts` — timeout + logging + redeploy

### Nota importante para o usuário
Verificar no n8n se o workflow usa **"Respond to Webhook"** no final (não "Respond Immediately" no webhook trigger). Se estiver em modo imediato, o n8n responde vazio antes de processar.

