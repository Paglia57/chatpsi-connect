

## Tela Inicial do App (Dashboard) com atalhos, sugestões e foco em Evolução

Atualmente, `/app` redireciona direto para `/app/evolucao`. A proposta é criar uma página inicial (Home/Dashboard) que funcione como hub de acesso rápido, com destaque para a funcionalidade principal (Evolução) e o programa de indicação.

### Nova página: `src/pages/app/HomePage.tsx`

**Estrutura da tela:**

1. **Saudação personalizada** — "Olá, {nickname || primeiro nome}! 👋" com subtítulo "O que vamos fazer hoje?"

2. **Card principal destaque — Nova Evolução** (ocupa largura total, fundo com gradiente `bg-hero` ou `primary`):
   - Ícone `FileText`, título "Gerar Evolução Clínica", descrição curta "Transforme suas anotações de sessão em documentação clínica completa com IA"
   - Botão CTA `variant="cta"` → navega para `/app/evolucao`

3. **Grid de atalhos rápidos** (3 colunas desktop, 1 mobile) — cards clicáveis:
   - **Chat Clínico** (`MessageCircle`) → `/chat` — "Consulte protocolos e abordagens terapêuticas"
   - **Buscar Artigos** (`BookOpen`) → `/busca-artigos` — "Encontre evidências científicas para suas intervenções"
   - **Buscar Plano** (`Target`) → `/busca-plano` — "Monte planos terapêuticos com apoio de IA"

4. **Seção "Dicas de uso"** — 2-3 sugestões rápidas em formato compacto:
   - "Grave o áudio da sessão e gere a evolução automaticamente"
   - "Cadastre seus pacientes para manter o histórico organizado"
   - "Use o Chat Clínico para discutir casos complexos com a IA"

5. **Card Indique e Ganhe** — reutiliza o componente `ReferralCard` existente, posicionado na lateral (desktop) ou abaixo (mobile), com wrapper que adiciona título de seção "Indique e Ganhe"

### Alterações no roteamento: `src/App.tsx`

- Importar `HomePage`
- Trocar `<Route index element={<Navigate to="/app/evolucao" replace />} />` por `<Route index element={<HomePage />} />`

### Alterações na sidebar: `src/components/chat/ChatSidebar.tsx`

- Adicionar item "Início" (`Home` icon) no topo do menu, apontando para `/app`

### Layout responsivo

- Desktop: grid 2 colunas — conteúdo principal (col-span-8) + lateral com ReferralCard (col-span-4)
- Mobile: tudo empilhado em coluna única

### Arquivo criado

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/app/HomePage.tsx` | Nova tela inicial com saudação, CTA de evolução, atalhos, dicas e referral |

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/App.tsx` | Importar HomePage, trocar Navigate por HomePage na rota index do `/app` |
| `src/components/chat/ChatSidebar.tsx` | Adicionar item "Início" no menu |

