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
| **Validação `api_token`** | ✅ OK | Compara `body.api_token` com `Deno.env.get('GURU_API_TOKEN')`; se faltar o secret ou divergir, responde **401** e não processa. Sem hardcode. |
| **Resposta HTTP 200** | ✅ OK | 200 imediato + processamento em background (`EdgeRuntime.waitUntil`). 200 também para JSON malformado, `webhook_type` ≠ `subscription`, status ignorado e telefone fora da allowlist — evita retentativa do Guru à toa. |
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
(10–11 dígitos) vem sem DDI; aplicado ao construir `n.whatsapp`. O gate de allowlist
(`phoneForms`) já normaliza removendo o `55`, então continua casando.

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

## Observação para o go-live

A `WA_TEST_ALLOWLIST` é **fail-closed**: vazia/ausente → **nada é processado** (só log).
Isso protege a produção enquanto o n8n ainda roda. **Na virada (cutover)** é preciso
popular a allowlist com os números reais **ou remover o gate** em `phoneMatchesAllowlist`,
senão nenhum evento de produção será processado.

Da mesma forma, se `GURU_API_TOKEN` não estiver configurado, **todos** os eventos são
rejeitados com 401 (fail-closed) — cadastrar o secret é pré-requisito.
