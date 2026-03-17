

## Sugestões temporárias acima do input (Chat Clínico e Plano de Ação)

Adicionar chips de sugestão compactos entre a área de mensagens e o input, visíveis apenas quando o usuário ainda não interagiu na sessão atual. Desaparecem após a primeira mensagem enviada.

### Comportamento
- Aparecem ao carregar a página, logo acima do composer (input)
- Desaparecem permanentemente ao enviar a primeira mensagem (ou ao clicar numa sugestão)
- Não dependem do histórico estar vazio — sempre aparecem na primeira visita da sessão
- Estilo: chips horizontais compactos com scroll horizontal, sem ocupar muito espaço vertical

### Mudanças

**1. `src/components/chat/ChatInterface.tsx`**

- Novo estado: `const [showSuggestions, setShowSuggestions] = useState(true)`
- Setar `setShowSuggestions(false)` dentro de `handleSendMessage` (antes do envio)
- Renderizar entre o `ScrollArea` e o composer (dentro de `composer-container`, antes do form):
  - 2-3 sugestões em chips horizontais (ex: "Sugira técnicas de TCC para ansiedade", "Me ajude com uma evolução de sessão")
  - Ao clicar: preenche o input e submete automaticamente
  - Animação de fade-out ao desaparecer
- Manter as sugestões do empty state como estão (são para quando não há histórico)

**2. `src/components/busca-plano/BuscaPlanoInterface.tsx`**

- Mesmo padrão: estado `showSuggestions`, setar false no `handleSendMessage`
- 2-3 sugestões relevantes (ex: "Manejo de crise suicida", "Plano para TDAH em adultos")
- Renderizar acima do form no composer

### Estilo visual
- Chips com `variant="outline"`, tamanho pequeno, `gap-2`, scroll horizontal (`flex overflow-x-auto`)
- Ícone `Sparkles` ou `MessageCircle` de 3.5px antes do texto
- Animação `animate-fade-in` ao aparecer, transição suave ao sumir

