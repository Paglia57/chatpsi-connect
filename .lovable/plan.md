

## Informações sobre limites do Whisper

- O limite da API Whisper da OpenAI é **25MB por arquivo**, não 200MB.
- O Supabase Edge Functions também tem limite de payload (~20MB para request body). Como o áudio é enviado em Base64 (que aumenta ~33% o tamanho), o limite prático é de aproximadamente **15MB de áudio original**.
- Para áudios maiores, seria necessário implementar upload direto ao bucket e chunking, mas isso é uma mudança significativa.

## Plano: Trocar modelo de geração para GPT-4.1-mini

Atualmente a geração de evolução usa o **Lovable AI Gateway** com `google/gemini-2.5-pro`. O modelo `gpt-4.1-mini` não está disponível no gateway, mas como já existe `OPENAI_API_KEY` configurada, podemos chamar a API da OpenAI diretamente.

### Mudança

| Arquivo | O que muda |
|---------|------------|
| `supabase/functions/generate-evolution/index.ts` | Trocar a chamada do Lovable AI Gateway (`ai.gateway.lovable.dev`) pela API OpenAI direta (`api.openai.com/v1/chat/completions`), usando `OPENAI_API_KEY` e modelo `gpt-4.1-mini`. Remover dependência do `LOVABLE_API_KEY` para esta função. |

### Detalhe técnico

A seção de geração (linhas 183-205) será alterada de:
- Gateway: `ai.gateway.lovable.dev` com `LOVABLE_API_KEY` e modelo `google/gemini-2.5-pro`

Para:
- OpenAI direto: `api.openai.com/v1/chat/completions` com `OPENAI_API_KEY` e modelo `gpt-4.1-mini`

O formato de request/response é idêntico (OpenAI-compatible), então o streaming no frontend continua funcionando sem mudanças.

