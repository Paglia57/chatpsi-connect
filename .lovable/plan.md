

## Adicionar RedeemBanner na HomePage

### Alteração

**Arquivo: `src/pages/app/HomePage.tsx`**

- Importar `RedeemBanner` de `@/components/referral/RedeemBanner`
- Renderizar `<RedeemBanner />` logo após o greeting (antes dos stats), para máxima visibilidade

**Arquivo: `src/components/referral/RedeemBanner.tsx`**

- Alterar a lógica de eligibilidade: em vez de checar apenas conta < 7 dias, checar **conta < 7 dias OU assinatura ativada há < 7 dias** (`profile.subscribed_at` existe e `now - subscribed_at < 7 dias`)
- Isso garante que usuários que assinaram recentemente também vejam o banner de resgate por 7 dias após a assinatura

### Lógica de elegibilidade atualizada
```
eligible = não resgatou ainda E (
  conta criada há < 7 dias OU
  subscribed_at existe E subscribed_at há < 7 dias
)
```

### Arquivos a modificar
- `src/pages/app/HomePage.tsx` — adicionar import e renderização do RedeemBanner
- `src/components/referral/RedeemBanner.tsx` — expandir lógica de elegibilidade para incluir assinatura recente

