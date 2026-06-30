# Auditoria — Webhook do Guru (`guru-webhook`)

Auditoria da Edge Function `supabase/functions/guru-webhook/index.ts` contra a
documentação oficial do **Digital Manager Guru**. Foco: validação de `api_token`,
resposta HTTP 200, idempotência, status tratados, resolução do psicólogo e robustez.

> **Sem acesso a painéis externos.** Esta auditoria lê apenas o código. A confirmação
> dos nomes exatos de status e do formato do payload depende de um POST real do Guru
> (o `docs/n8n-reference/guru.json` não existe no repositório).

---

## Veredito por critério

| Critério | Status | Evidência (código) |
|---|---|---|
| **Validação `api_token`** | ⚠️ Desativada (produção) | A verificação foi **removida por decisão de produto** — o webhook processa sem exigir `api_token` (há comentário no código marcando onde reativar). Trade-off: aberto a chamadas forjadas. Ver "Observação para o go-live". |
| **Resposta HTTP 200** | ✅ OK | 200 imediato + processamento em background (`EdgeRuntime.waitUntil`). 200 também para JSON malformado, `webhook_type` ≠ `subscription` e status ignorado — evita retentativa do Guru à toa. |
| **Idempotência** | ✅ OK | `isDuplicateEvent` deduplica `subscription_id`+`status` nas últimas 6h; a regra dos 3 casos de onboarding impede reenvio de boas-vindas/re-inscrição; updates em `profiles` são idempotentes. |
| **Status tratados** | 🔧 Ajustado | Antes só `canceled` desativava. Agora status terminais (`canceled`/`cancelled`/`expired`/`suspended`/`inactive`) desativam o acesso (ver C1). |
| **Resolução do psicólogo** | ✅ OK | Busca `profiles` por **e-mail**; grava por **`user_id`** (= `auth.users.id`). Provisiona via `auth.admin.createUser` quando não existe. Não sobrescreve dados clínicos. |
| **Robustez** | 🔧 Ajustado | `JSON.parse` em try/catch (200 em erro); payload sem email/status → loga `ignorou`; erros de background capturados em `webhook_events`. Telefone normalizado para E.164 (ver C2). |

Legenda: ✅ OK = já conforme · 🔧 Ajustado = correção aplicada nesta auditoria.

---

## Correções aplicadas

### C1 — Status terminais desativam o acesso
**Problema:** apenas `canceled` desativava. Se o Guru enviar `expired`, `suspended` ou
`inactive` em vez de `canceled`, o evento caía em "desconhecido → só loga" e o psicólogo
**manteria acesso indevidamente**.

**Correção:** constante `TERMINAL = ['canceled','cancelled','expired','suspended','inactive']`
incluída na lista de status conhecidos; o branch de cancelamento passou a usar
`TERMINAL.includes(status)`. Ação preservada: `subscription_active=false`, `plan=''`,
template de cancelamento, ação `'cancelou'`.

### C2 — Telefone em E.164 com DDI 55
**Problema:** o número era montado como `phone_local_code (DDD) + phone_number`, **sem o
código do país `55`**. A WhatsApp Cloud API exige E.164 (ex.: `5511999998888`), então o
envio poderia falhar ou ir para o número errado.

**Correção:** novo helper `toE164BR()` prefixa `55` defensivamente quando o número BR
(10–11 dígitos) vem sem DDI; aplicado ao construir `n.whatsapp`.

---

## Pontos a confirmar no teste real

1. **Nomes exatos dos status** do Guru para assinatura (`last_status`). O código cobre
   `active`, `trial`, `pastdue` e os terminais acima; confirmar se o Guru usa de fato
   `expired`/`suspended`/`inactive` ou apenas `canceled`.
2. **Formato do telefone**: confirmar se `subscriber.phone_local_code` vem sem o `55`
   (premissa da correção C2).
3. **`webhook_type`**: confirmar que o valor é exatamente `"subscription"` (o código
   ignora os demais respondendo 200).

---

## Observação para o go-live (produção)

Duas travas de fase de teste foram **removidas** para produção:

- **`api_token`**: a validação de origem foi **desativada** — o webhook não exige mais o
  token. ⚠️ Isso deixa o endpoint **aberto a chamadas forjadas** (um POST malicioso poderia
  provisionar/alterar acesso por e-mail). Decisão consciente de produto; para endurecer,
  reativar a validação no ponto comentado de `guru-webhook/index.ts`.
- **`WA_TEST_ALLOWLIST`**: removida — o `guru-webhook` agora processa/envia para **qualquer
  assinante**, e o canal WhatsApp libera a gravação clínica para todo psicólogo ativo. Os
  gates reais permanecem: identidade (`profiles.whatsapp`) + assinatura (`subscription_active`).

Na virada, basta **desligar o webhook do n8n** (os secrets `GURU_API_TOKEN`/`WA_TEST_ALLOWLIST`
ficam inertes — podem existir ou não, não afetam o comportamento).
