

## Plano: Melhorias UX do Chat Clínico

### 1. Áudio com erro — botão de retentar (`AudioPlayer.tsx`)

**Problema:** Estado de erro mostra apenas "Erro ao carregar áudio" sem ação possível.

**Solução:** No estado `hasError`, adicionar botão "Tentar novamente" que reseta o estado e recarrega o áudio (`audioRef.current.load()`). Também exibir texto explicativo curto ("O link pode ter expirado").

### 2. Links do Google Drive como cards (`src/lib/utils.ts`)

**Problema:** URLs cruas de Google Drive (e outros serviços) aparecem como texto longo e assustador.

**Solução:** Na função `formatMessageContent`, detectar URLs de domínios conhecidos (docs.google.com, drive.google.com, etc.) e renderizar como mini-card inline ao invés de link cru:

- Card com ícone do serviço (FileText para Google Docs, File para Drive genérico, ExternalLink para outros)
- Título amigável extraído da URL (ex: "Documento Google Docs", "Arquivo Google Drive")
- URL truncada como subtexto
- Fundo `bg-muted/50`, borda, `rounded-lg`, `hover:bg-muted`
- Clicável abrindo em nova aba

Domínios detectados: `docs.google.com`, `drive.google.com`, `sheets.google.com`, `slides.google.com`

Para markdown links `[Acessar Link](url)` que apontam para esses domínios, aplicar o mesmo tratamento de card.

### 3. Sugestões de prompts no chat vazio (`ChatInterface.tsx`)

**Problema:** Input genérico "Digite sua mensagem..." sem orientação para novos usuários.

**Solução:** Quando `messages.length === 0` e `canSendMessage`, exibir grid de 4 sugestões clicáveis abaixo da mensagem de boas-vindas (antes do composer):

```
"Como estruturar uma evolução de sessão?"
"Sugira técnicas de TCC para ansiedade"
"Me ajude a montar um plano terapêutico"
"Quais registros devo manter do paciente?"
```

Cada sugestão é um `Button variant="outline"` com ícone `MessageCircle`. Ao clicar, preenche `setNewMessage` com o texto e dispara envio automático.

Grid: 1 coluna mobile, 2 colunas desktop. Estilo: `text-left text-sm`, `hover:bg-muted`.

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/components/ui/AudioPlayer.tsx` | Botão "Tentar novamente" no estado de erro |
| `src/lib/utils.ts` | Renderizar URLs de Google Drive/Docs como cards com ícone |
| `src/components/chat/ChatInterface.tsx` | Sugestões de prompts clicáveis no chat vazio |

