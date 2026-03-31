

# Plano — Configurações Admin do Programa de Indicação

## Resumo

Criar uma tabela `referral_settings` com uma única linha que controla: ativo/inativo, textos do banner. Os componentes de referral leem essa config e se ocultam quando desativado. O painel admin ganha uma nova aba "Configurações" com toggle, campos de texto e preview ao vivo.

## 1. Nova tabela `referral_settings`

```sql
CREATE TABLE public.referral_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  banner_title text NOT NULL DEFAULT 'Foi indicado por alguém?',
  banner_description text NOT NULL DEFAULT 'Insira o código de quem te indicou e resgate seu prêmio.',
  banner_button_text text NOT NULL DEFAULT 'Resgatar',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Seed com valores padrão
INSERT INTO referral_settings (id) VALUES (gen_random_uuid());

-- RLS
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;

-- Todos authenticated podem ler (necessário para exibir o banner)
CREATE POLICY "Anyone can read referral settings"
  ON public.referral_settings FOR SELECT TO authenticated
  USING (true);

-- Apenas admins podem atualizar
CREATE POLICY "Admins can update referral settings"
  ON public.referral_settings FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

## 2. Hook `useReferralSettings`

Novo arquivo `src/hooks/useReferralSettings.ts`:
- Busca a única linha de `referral_settings` via `supabase.from('referral_settings').select('*').single()`
- Usa `useQuery` do React Query com staleTime longo (5 min) para cache
- Retorna `{ enabled, bannerTitle, bannerDescription, bannerButtonText, loading }`

## 3. Componentes de referral — respeitar `enabled`

**`RedeemBanner.tsx`**: Consumir `useReferralSettings`. Se `enabled === false`, retornar `null`. Usar os textos dinâmicos (`bannerTitle`, `bannerDescription`, `bannerButtonText`) em vez dos hardcoded.

**`ReferralCard.tsx`**: Consumir `useReferralSettings`. Se `enabled === false`, retornar `null`.

**`ReferralNotificationPoller.tsx`**: Consumir `useReferralSettings`. Se `enabled === false`, não fazer polling.

**`ReferralsPage.tsx`**: Consumir `useReferralSettings`. Se `enabled === false`, mostrar mensagem "Programa de indicações temporariamente desativado".

**`ChatSidebar.tsx`**: Consumir `useReferralSettings`. Se `enabled === false`, ocultar o item "Indique e Ganhe" da sidebar (tanto expandida quanto collapsed).

## 4. Painel admin — nova aba "Configurações"

**`AdminReferralsPage.tsx`**: Adicionar 4a tab "Configurações" nas `Tabs` existentes:
- Toggle Switch para ligar/desligar o programa
- Campos Input para título, descrição e texto do botão
- Preview ao vivo do banner (renderiza `RedeemBanner` em modo preview com os textos digitados, sem lógica de eligibilidade)
- Botão "Salvar" que faz `supabase.from('referral_settings').update(...)` e invalida o cache do React Query

## Arquivos a modificar

| Arquivo | Mudanças |
|---|---|
| Migration SQL | Criar tabela `referral_settings` + seed + RLS |
| `src/hooks/useReferralSettings.ts` | Novo hook |
| `src/components/referral/RedeemBanner.tsx` | Ler settings, textos dinâmicos, prop `preview` |
| `src/components/referral/ReferralCard.tsx` | Ler `enabled`, ocultar se false |
| `src/components/referral/ReferralNotificationPoller.tsx` | Ler `enabled`, parar polling se false |
| `src/pages/app/ReferralsPage.tsx` | Ler `enabled`, empty state se false |
| `src/components/chat/ChatSidebar.tsx` | Ler `enabled`, ocultar menu item |
| `src/pages/AdminReferralsPage.tsx` | Nova aba Configurações com toggle, inputs e preview |

