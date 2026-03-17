

## Plano: Reorganização Completa da Sidebar

### Resumo do problema

- Páginas como `/chat`, `/busca-plano`, `/busca-artigos`, `/marketing`, `/admin` renderizam suas **próprias** instâncias de `SidebarProvider + ChatSidebar` (ou nenhuma sidebar), causando inconsistência
- Todos os itens de navegação estão no mesmo nível sem hierarquia
- Widget de indicações polui a sidebar
- Não existe página dedicada de indicações

---

### Etapa 1: Unificar rotas no AppLayout

Mover **todas** as rotas autenticadas para dentro do `<AppLayout />`, eliminando sidebar duplicada em cada page.

**`src/App.tsx`** — reestruturar rotas:
```
<Route path="/" element={<Index />} />
<Route path="/auth" element={<AuthPage />} />
<Route path="/auth/callback" element={<AuthCallbackPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />

{/* Todas as rotas autenticadas sob AppLayout */}
<Route element={<AppLayout />}>
  <Route path="/app" >
    <Route index element={<Navigate to="/app/evolucao" />} />
    <Route path="evolucao" element={<EvolutionPage />} />
    <Route path="pacientes" element={<PatientsPage />} />
    <Route path="pacientes/:id" element={<PatientDetailPage />} />
    <Route path="historico" element={<HistoryPage />} />
    <Route path="perfil" element={<ProfilePage />} />
    <Route path="indicacoes" element={<ReferralsPage />} />
  </Route>
  <Route path="/chat" element={<ChatPage />} />
  <Route path="/busca-plano" element={<BuscaPlanoPage />} />
  <Route path="/busca-artigos" element={<BuscaArtigosPage />} />
  <Route path="/marketing" element={<MarketingPage />} />
  <Route path="/admin" element={<AdminPage />} />
  <Route path="/admin/referrals" element={<AdminReferralsPage />} />
</Route>
```

**`src/components/app/AppLayout.tsx`** — adicionar auth guard (redirect to `/auth` se não logado).

---

### Etapa 2: Simplificar páginas que tinham sidebar própria

Remover `SidebarProvider`, `ChatSidebar`, e wrapper layout de:
- `ChatPage.tsx` — renderizar apenas `<ChatInterface />`
- `BuscaPlanoPage.tsx` — renderizar apenas `<BuscaPlanoInterface />`
- `BuscaArtigosPage.tsx` — renderizar apenas `<BuscaArtigosInterface />`
- `MarketingPage.tsx` — já simples, manter
- `AdminPage.tsx` — remover botão "Voltar" se existir
- `AdminReferralsPage.tsx` — remover botão "Voltar" se existir

---

### Etapa 3: Reescrever ChatSidebar com nova estrutura hierárquica

**`src/components/chat/ChatSidebar.tsx`** — reescrita completa:

**Cabeçalho (topo fixo):**
- Logo ChatPsi + nome profissional + badge plano (Premium/Free)

**Grupo CLÍNICA:**
- "Evolução" (ClipboardList) — `Collapsible` do shadcn, expandido por padrão e quando rota ativa é `/app/evolucao` ou `/app/historico`
  - Sub-item "Nova Evolução" (Plus) → `/app/evolucao`
  - Sub-item "Histórico" (History) → `/app/historico`
- "Pacientes" (Users) → `/app/pacientes`

**Grupo FERRAMENTAS IA:**
- "Chat Clínico" (MessageCircle) → `/chat`
- "Planos de Ação" (Target) → `/busca-plano`
- "Artigos Científicos" (BookOpen) → `/busca-artigos`

**Grupo MARKETING:**
- "IA de Marketing" (PenTool) → `/marketing`

**Grupo ADMINISTRAÇÃO** (condicional `isAdmin`):
- "Administração" (Settings) → `/admin`
- "Indicações" (Gift) → `/app/indicacoes`

**Rodapé (mt-auto, sempre visível):**
- Separator
- "Meu Perfil" (User) → `/app/perfil`
- "Suporte" (HelpCircle) → abre WhatsApp
- "Sair" (LogOut)
- Estilo discreto: text-sm, muted-foreground

**Remover:** ReferralCard, RedeemBanner, Dialog de perfil inline (perfil agora é página).

**Mobile:** Manter Sheet que desliza da esquerda, com a mesma estrutura. Fechar ao navegar.

**Estado ativo:** `useLocation` para highlight. Sub-itens com `sidebar-accent` bg quando ativos. Grupo Evolução auto-expande quando sub-rota ativa.

---

### Etapa 4: Criar página de Indicações

**`src/pages/app/ReferralsPage.tsx`** — nova página com:
- Card com título "Programa de Indicações"
- Código de indicação copiável (Input readonly + botão Copy)
- Botão compartilhar
- Estatísticas de indicações
- Migrar conteúdo do `ReferralCard` para cá

---

### Etapa 5: Renomeações

Em toda a interface:
- "Evolução Clínica" → "Evolução"
- "Busca Plano" → "Planos de Ação"
- "Busca Artigos" → "Artigos Científicos"

---

### Arquivos modificados

| Arquivo | Ação |
|---------|------|
| `src/App.tsx` | Reestruturar rotas sob AppLayout único |
| `src/components/app/AppLayout.tsx` | Adicionar auth guard |
| `src/components/chat/ChatSidebar.tsx` | Reescrita completa com grupos, Collapsible, rodapé fixo |
| `src/pages/ChatPage.tsx` | Remover sidebar/layout wrapper |
| `src/pages/BuscaPlanoPage.tsx` | Remover sidebar/layout wrapper |
| `src/pages/BuscaArtigosPage.tsx` | Remover sidebar/layout wrapper |
| `src/pages/MarketingPage.tsx` | Remover auth guard (AppLayout cuida) |
| `src/pages/AdminPage.tsx` | Remover botão "Voltar" |
| `src/pages/AdminReferralsPage.tsx` | Remover botão "Voltar" |
| `src/pages/app/ReferralsPage.tsx` | **Novo** — página de indicações |

