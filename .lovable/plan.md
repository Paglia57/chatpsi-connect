

## Plano: Módulo de Programa de Indicação

Este é um módulo grande com 3 camadas: banco de dados, lógica de negócio (DB functions + RLS), e UI (área do usuário + admin).

---

### 1. Migração de Banco de Dados

Criar as 3 tabelas novas e funções auxiliares via migration:

**Tabelas:**
- `referral_codes` (id, user_id, code TEXT UNIQUE, created_at, total_redeemed INT DEFAULT 0)
- `referral_redemptions` (id, referrer_id, redeemed_by, code_used, status TEXT DEFAULT 'pending', created_at, validated_at, validated_by)
- `notifications` (id, user_id, type TEXT, message TEXT, seen BOOLEAN DEFAULT false, created_at)

**RLS Policies:**
- `referral_codes`: users SELECT own; anyone SELECT by code (para resgate); INSERT via function
- `referral_redemptions`: users SELECT own (as referrer or redeemed_by); INSERT own; admin SELECT/UPDATE all
- `notifications`: users SELECT/UPDATE own (para marcar seen)

**Database Functions (SECURITY DEFINER):**

1. `generate_referral_code(p_user_id uuid)` — gera código PSI-XXXX único com retry, chamada quando subscription_active muda para true
2. `redeem_referral_code(p_code text)` — valida elegibilidade (conta < 7 dias, não resgatou antes, não auto-indicação, código existe), cria redemption pending
3. `admin_approve_referral(p_redemption_id uuid)` — admin aprova, atualiza status/validated_at/validated_by, incrementa total_redeemed, cria 2 notifications
4. `admin_reject_referral(p_redemption_id uuid)` — admin rejeita, atualiza status

**Trigger:** on `profiles` UPDATE — quando `subscription_active` muda de false para true, chamar `generate_referral_code`

---

### 2. Novos Componentes de UI (Área do Usuário)

**A) `src/components/referral/ReferralCard.tsx`**
- Card mostrando o código PSI-XXXX do usuário com botão copiar
- Contador de indicações aprovadas
- Botão "Compartilhar código" (Web Share API ou copiar link)
- Busca código via `supabase.from('referral_codes').select().eq('user_id', user.id)`

**B) `src/components/referral/RedeemBanner.tsx`**
- Mostrado apenas se conta < 7 dias e não resgatou antes
- Input para digitar código + botão "Resgatar"
- Chama `supabase.rpc('redeem_referral_code', { p_code })`
- Estados: form, success ("Aguarde validação"), erros

**C) `src/components/referral/ReferralNotificationPoller.tsx`**
- Componente global (no App.tsx ou ChatPage)
- Polling a cada 30s: busca notifications com `type = 'referral_reward'` e `seen = false`
- Exibe toast celebratório, marca como seen ao fechar/timeout 8s

**Integração:** Adicionar ReferralCard e RedeemBanner na ChatSidebar ou ChatPage. Adicionar ReferralNotificationPoller no layout principal.

---

### 3. Painel Admin — Módulo de Indicações

**`src/pages/AdminReferralsPage.tsx`** (nova rota `/admin/referrals`)

Usa `AdminGuard` e `Tabs` com 3 abas:

- **Aba 1 — Fila de Validação:** lista redemptions pending com botões Aprovar/Rejeitar. Chama `supabase.rpc('admin_approve_referral')` ou `admin_reject_referral`
- **Aba 2 — Histórico:** tabela com todas redemptions, filtro por status, badges coloridos
- **Aba 3 — Ranking:** usuários ordenados por total_redeemed desc, top 3 destacado com visual diferenciado (ícone troféu/medalha)

**Navegação:** Adicionar link "Indicações" no AdminPage ou ChatSidebar (quando isAdmin).

---

### 4. Roteamento

Adicionar em `App.tsx`:
```
<Route path="/admin/referrals" element={<AdminReferralsPage />} />
```

---

### Arquivos a criar/modificar

| Ação | Arquivo |
|------|---------|
| Criar | Migration SQL (tabelas + functions + trigger + RLS) |
| Criar | `src/components/referral/ReferralCard.tsx` |
| Criar | `src/components/referral/RedeemBanner.tsx` |
| Criar | `src/components/referral/ReferralNotificationPoller.tsx` |
| Criar | `src/pages/AdminReferralsPage.tsx` |
| Modificar | `src/App.tsx` — nova rota |
| Modificar | `src/components/chat/ChatSidebar.tsx` — link admin indicações + referral card/banner |
| Modificar | `src/pages/ChatPage.tsx` — adicionar notification poller |

