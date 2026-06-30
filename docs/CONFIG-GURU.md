# Configuração — Webhook do Guru (passo a passo)

Guia para configurar o webhook de assinaturas do **Digital Manager Guru** ligado à
Edge Function `guru-webhook`. Cobre Supabase (secrets, migração, deploy, URL), o painel
do Guru, o mapa status→ação e o teste de ponta a ponta.

- **Função:** `guru-webhook` (`supabase/functions/guru-webhook/index.ts`)
- **Project ref:** `rrdvivxdasezvhfbetra`
- **URL pública do webhook:** `https://rrdvivxdasezvhfbetra.supabase.co/functions/v1/guru-webhook`

---

## 1. Supabase

### 1.1 Secrets (Dashboard → Project Settings → Edge Functions → Secrets, ou CLI)

| Secret | Obrigatório | Para quê |
|---|---|---|
| `WHATSAPP_TOKEN` | Sim | Token da WhatsApp Cloud API (já usado pelo `whatsapp-webhook`). |
| `WHATSAPP_PHONE_NUMBER_ID` | Sim | ID do número da Cloud API (já existente). |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Sim | Plataforma (geralmente já presentes). |
| `GURU_API_TOKEN` | Não (inerte) | A validação de origem por `api_token` foi **desativada em produção** (decisão de produto). O secret não é mais lido; pode existir ou não. |
| `WA_TEST_ALLOWLIST` | Não (inerte) | A allowlist de teste foi **removida em produção**. Não bloqueia mais ninguém; sua ausência não quebra nada. |

> **Produção:** o webhook do Guru processa qualquer assinante **sem exigir `api_token`**
> e a `WA_TEST_ALLOWLIST` não restringe mais o atendimento. Para voltar a exigir o token,
> reativar a validação em `guru-webhook/index.ts` (há comentário marcando o ponto).

### 1.2 Migração

Aplicar a migração pendente (cria `subscription_events`, `subscription_settings`,
coluna `webhook_events.source` e o bucket `public-assets`):
```bash
supabase db push
```

### 1.3 Deploy da função
```bash
supabase functions deploy guru-webhook
```
A função usa `verify_jwt = false` (o Guru não envia JWT) — já configurado em
`supabase/config.toml`.

### 1.4 Manual de Uso (opcional, mas recomendado)
No app, como admin, acesse **/admin/assinaturas**, suba o PDF do Manual e salve. A URL é
gravada em `subscription_settings.manual_pdf_url` e usada no cabeçalho do template de
boas-vindas. Sem isso, o template é enviado **sem** o anexo.

---

## 2. Guru (painel)

1. Acesse **Configurações → Webhooks → Adicionar**.
2. Crie um webhook de **ASSINATURA** apontando para a URL:
   `https://rrdvivxdasezvhfbetra.supabase.co/functions/v1/guru-webhook`
3. Token: **não é exigido** (a validação por `api_token` está desativada). Se o painel
   pedir um valor obrigatório, pode preencher qualquer um — o webhook não confere.
4. **Selecione os status** que disparam o webhook (ver o mapa na seção 3).
5. Deixe o webhook **Ativo** e salve.
6. (Opcional) Se houver **venda avulsa**, repita criando um webhook de **VENDA** na mesma
   URL. Hoje o código **ignora** `webhook_type` ≠ `subscription` (responde 200 sem agir);
   só configure se/quando o tratamento de venda for implementado.
7. **Conferência:** na **Auditoria** da assinatura/venda, cada entrega aparece com ícone
   **azul = sucesso (200)** ou **vermelho = erro**.

---

## 3. Mapa STATUS DO GURU → AÇÃO DO SISTEMA

Conforme o código real de `guru-webhook` (já com a correção C1):

| Status (`last_status`) | Ação no ChatPsi |
|---|---|
| `active` (não vindo de trial) | Libera acesso (`subscription_active=true`, `plan='active'`); envia boas-vindas + onboarding conforme o caso (primeira vez / reativação; **renovação não reenvia**). |
| `active` (vindo de trial) | Só atualiza `plan='active'`; **não** reenvia boas-vindas. |
| `trial` | Libera acesso (`plan='trial'`); mesma regra de onboarding. |
| `pastdue` | **Mantém** o acesso (grace); envia aviso de **pagamento pendente**. |
| `canceled` / `expired` / `suspended` / `inactive` | **Desativa** acesso (`subscription_active=false`, `plan=''`); envia **cancelamento**. O psicólogo passa a cair na renovação dentro do bot. |
| Qualquer outro | Só registra (`ignorou`) e responde 200. |

### Quais status marcar no painel
Marque, no webhook de assinatura, os gatilhos equivalentes a: **assinatura ativa/aprovada**,
**período de teste (trial)**, **pagamento atrasado (pastdue)** e **cancelamento/expiração/
suspensão**. 

> ⚠️ **Verificar:** os nomes dos status no painel do Guru podem diferir das strings que o
> código espera (`active`, `trial`, `pastdue`, `canceled`, `expired`, `suspended`,
> `inactive`). Se o Guru usar um rótulo terminal sem equivalente claro (ex.: só
> "cancelada" e não "expirada"), confirme no teste real qual `last_status` chega e ajuste
> a lista `TERMINAL` em `guru-webhook/index.ts` se necessário.

---

## 4. Teste de ponta a ponta

1. Faça uma **assinatura/pagamento de teste** no Guru (ou reenvie um evento pela Auditoria).
   Em produção não há mais allowlist — qualquer assinante é processado.
2. Confira que o evento chegou e foi processado:
   - **Guru → Auditoria**: ícone **azul** (200).
   - **Supabase → `webhook_events`**: linha `direction='inbound'`, `source='guru'`.
   - **Supabase → `subscription_events`**: uma linha com a `action` esperada
     (`ativou`/`avisou`/`cancelou`/`ignorou`) e o `onboarding_case` quando aplicável.
   - **Supabase → `profiles`**: `subscription_active` / `plan` / `subscription_id`
     atualizados para o e-mail de teste.
   - **WhatsApp**: chegada do template correspondente (boas-vindas com link de senha +
     Manual, aviso de pagamento, ou cancelamento).
3. **Se não chegar:** veja o ícone vermelho na Auditoria do Guru (erro de entrega), os
   **logs da função** (Supabase → Edge Functions → `guru-webhook` → Logs) e as tabelas
   `webhook_events` / `subscription_events`. Causa comum: template ainda não aprovado na
   Meta (o envio falha, mas o `profile` é atualizado mesmo assim).

---

## Checklist rápido

- [ ] `WHATSAPP_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID` presentes.
- [ ] Migração aplicada (`supabase db push`).
- [ ] Função publicada (`supabase functions deploy guru-webhook`).
- [ ] Templates `assinatura_ativada`, `pagamento_pendente`, `assinatura_cancelada`
      aprovados na Meta (pt_BR).
- [ ] Manual de Uso enviado em **/admin/assinaturas** (opcional).
- [ ] Webhook de assinatura criado e **Ativo** no Guru, apontando para a URL.
- [ ] Teste de ponta a ponta validado.
- [ ] **No cutover:** desligar o webhook do n8n (token/allowlist já desativados no código).
- [ ] (Opcional/segurança) reativar a validação de `api_token` quando for endurecer a segurança.
