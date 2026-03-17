

## Plano: Reestruturar Layout da IA de Marketing

### Problemas
1. "Voltar para o Chat" é incorreto — sidebar principal já provê navegação
2. Segundo painel lateral (histórico) compete com a sidebar principal do app

### Solução

Eliminar o painel lateral de histórico e reestruturar o conteúdo como **tabs** dentro do conteúdo principal:

**Tab "Novo Texto"** (default): formulário atual (prompt + texto gerado + botões)
**Tab "Histórico"**: lista de textos salvos em cards; ao clicar num card, muda para tab "Novo Texto" com os dados preenchidos

### Mudanças em `MarketingInterface.tsx`

- Remover o `SidebarContent` lateral (desktop) e o `Sheet` (mobile)
- Remover botão "Voltar para o Chat" e import de `ArrowLeft`, `Menu`, `Sheet`
- Remover `useNavigate`, `useIsMobile`, `sidebarOpen`
- Usar `Tabs` do shadcn com duas tabs: "Novo Texto" e "Histórico"
- Header simplificado: título "IA de Marketing" + descrição + botão "Novo" (quando em tab Histórico ou quando editando um texto existente)
- Layout `div` simples sem `min-h-screen` (já está dentro do `AppLayout`)
- Na tab Histórico: grid de cards (1 col mobile, 2 cols desktop) com título, data, preview e delete
- Ao selecionar um card do histórico: mudar `activeTab` para "novo" e preencher prompt/generatedText

### Arquivo

| Arquivo | Mudança |
|---------|---------|
| `src/components/marketing/MarketingInterface.tsx` | Substituir layout dual-sidebar por tabs inline |

