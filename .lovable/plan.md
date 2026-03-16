

## Plano: 3 ajustes

### 1. Usar ChatSidebar na tela de Evolução (em vez do AppSidebar simplificado)

O `/app/*` atualmente usa `AppLayout` com `AppSidebar` (sidebar minimalista com 3 itens). O usuário quer ver o sidebar principal (`ChatSidebar`) que tem todos os links, perfil, referral, etc.

**Solução:** Modificar `AppLayout.tsx` para usar `ChatSidebar` no lugar de `AppSidebar`, seguindo o mesmo padrão do `ChatPage.tsx`.

| Arquivo | Mudança |
|---------|---------|
| `src/components/app/AppLayout.tsx` | Trocar `AppSidebar` por `ChatSidebar`. Remover header com SidebarTrigger (ChatSidebar já tem trigger próprio) |

### 2. App já inicia na tela de evolução

`Index.tsx` já redireciona para `/app` que redireciona para `/app/evolucao`. Nenhuma mudança necessária.

### 3. Adicionar OPENAI_API_KEY para transcrição de áudio

O edge function `generate-evolution` já usa Lovable AI Gateway para geração de texto. Para transcrição de áudio via Whisper, precisa de `OPENAI_API_KEY`.

**Ação:** Solicitar ao usuário que forneça a chave via ferramenta de secrets, e atualizar o edge function para usar OpenAI Whisper quando `input_type === "audio"`.

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/generate-evolution/index.ts` | Adicionar lógica de transcrição: baixar áudio do bucket, enviar para `api.openai.com/v1/audio/transcriptions` (Whisper), usar transcrição como input para geração |

