

## Plano: Processamento real de arquivos no Chat Clínico

### Problema
Hoje, arquivos enviados no chat chegam ao Assistant como texto `[Áudio enviado: URL]`. O Assistant não acessa URLs — ele ignora completamente o conteúdo real.

### Solução: Pré-processar na Edge Function

Alterar `supabase/functions/dispatch-message/index.ts` para processar cada tipo de arquivo antes de enviar ao Assistant:

**A. Áudio → Whisper (transcrição)**
- Baixar o arquivo da signed URL do Supabase
- Enviar para `POST /v1/audio/transcriptions` (modelo `whisper-1`)
- Usar `FormData` com o arquivo binário
- Enviar a transcrição como texto na mensagem: `"[Transcrição do áudio do paciente]: {texto}"`
- O assistant recebe texto puro e pode interpretar o conteúdo

**B. Imagens → Vision via content blocks**
- Baixar a imagem da signed URL
- Converter para base64
- Enviar na mensagem como content block `image_url` com `data:image/{ext};base64,...`
- O Assistant com GPT-4o já suporta visão nativamente nos Assistants v2

**C. Documentos (PDF, DOCX) → OpenAI Files API**
- Baixar o arquivo da signed URL
- Upload para `POST /v1/files` com `purpose: "assistants"`
- Na mensagem, enviar como attachment com `file_id` para que o assistant possa ler via file_search
- Requer que o assistant tenha a tool `file_search` habilitada (se não tiver, fallback: extrair texto e enviar como texto)

### Fluxo atualizado

```text
Frontend envia: { message, fileUrl, messageType }
                         │
              ┌──────────┼──────────┐
              │          │          │
           audio      image     document
              │          │          │
         Whisper     base64    Files API
         transc.     encode     upload
              │          │          │
              └──────────┼──────────┘
                         │
                 Mensagem enriquecida
                 enviada ao Thread
                         │
                    Run + Poll
                         │
                    Resposta
```

### Arquivo alterado

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/dispatch-message/index.ts` | Adicionar funções `transcribeAudio()`, `processImage()`, `processDocument()` e chamar antes de montar o conteúdo da mensagem |

### Detalhes técnicos
- Whisper aceita até 25MB mas o limite prático é ~15MB por causa do overhead da Edge Function
- Para imagens base64, o content block usa formato `[{ type: "image_url", image_url: { url: "data:image/png;base64,..." } }]`
- Para documentos, o attachment usa `[{ file_id: "file-xxx", tools: [{ type: "file_search" }] }]`
- Fallback: se qualquer processamento falhar, envia como texto descritivo com a URL original (comportamento atual)

