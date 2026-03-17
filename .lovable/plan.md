

## Problema: Guias não aparecem após reset

Os guias (`FirstTimeGuide`) só são renderizados quando `messages.length === 0`. Se o usuário já tem histórico de conversas em qualquer ferramenta, o guia nunca é exibido — mesmo após resetar `seen_guides`.

Isso afeta: **ChatInterface**, **BuscaArtigosInterface**, **BuscaPlanoInterface**. O **MarketingInterface** usa condição diferente (`prompt === ''`) e funciona corretamente.

## Solução

Exibir o guia **antes** das mensagens (não como alternativa), quando `seen_guides` for falso. O guia aparece no topo da lista de mensagens e desaparece após o usuário interagir.

### Arquivos a alterar:

**1. `src/components/chat/ChatInterface.tsx` (~linha 491)**
- Mover o `FirstTimeGuide` para **fora** do ternário `messages.length === 0 ? ... : ...`
- Renderizar o guia **antes** do bloco de mensagens/empty state:
```tsx
{!profile?.seen_guides?.chat && canSendMessage && (
  <FirstTimeGuide ... />
)}
{messages.length === 0 ? (
  <div>...empty state...</div>
) : (
  messages.map(...)
)}
```

**2. `src/components/busca-artigos/BuscaArtigosInterface.tsx` (~linha 139)**
- Mesmo padrão: mover `FirstTimeGuide` para fora do ternário, renderizar antes do conteúdo.

**3. `src/components/busca-plano/BuscaPlanoInterface.tsx` (~linha 141)**
- Mesmo padrão.

Isso garante que após reset dos guias, o usuário veja as orientações ao visitar a ferramenta, independentemente de ter histórico.

