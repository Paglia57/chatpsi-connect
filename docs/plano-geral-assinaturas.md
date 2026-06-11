# Plano geral — Assinaturas (Guru) no WhatsApp oficial + app

> **Tipo:** documento de **referência e decisão** (deixe em `docs/`).
> **Objetivo:** migrar a gestão de assinaturas do n8n para uma Edge Function (`guru-webhook`) dentro do app, na API oficial do WhatsApp — recebendo o webhook do Guru, ativando/desativando o acesso e notificando o psicólogo.
> **Fonte do comportamento atual:** workflow `guru` do n8n (em `docs/n8n-reference/guru.json`).

---

## 1. Como funciona hoje (n8n)

O Guru (Digital Manager Guru) envia um webhook a cada evento de assinatura. O fluxo atual:

1. Recebe o POST do Guru.
2. **Normaliza** os dados: e-mail, nome, apelido (primeiro nome), telefone (`phone_local_code` + `phone_number`), `subscription_id` (= `body.id`) e a senha (`doc` do CPF, 6 primeiros dígitos + `@Chatpsi`).
3. **Busca o psicólogo** em `profiles` pelo e-mail.
4. Se **não existe**, cria o usuário no Supabase Auth (signup) e preenche o `profiles` (full_name, whatsapp, subscription_id, nickname).
5. **Roteia pelo status** (`body.last_status`) e age: ativa, mantém, ou desativa o acesso, e envia a mensagem correspondente no WhatsApp.

Tabelas tocadas hoje: `profiles` (a que importa) e uma planilha do Google (log de acessos) + uma tabela legada `usuarios` (do app antigo — **não existe mais no app novo**, será descartada).

---

## 2. Os status do Guru e o que cada um faz

O campo decisivo é `body.last_status`. Comportamento a preservar:

| Status | O que significa | Ação no `profiles` | Mensagem |
|---|---|---|---|
| **active** | pagamento aprovado | `subscription_active = true`, grava `subscription_id`, `plan = 'active'` | **boas-vindas** (template + Manual PDF) — exceto se vinha de trial (aí só atualiza, sem reenviar) |
| **trial** | período de teste | `subscription_active = true`, `plan = 'trial'` | boas-vindas |
| **pastdue** | pagamento atrasado | **mantém o acesso** (grace) — `subscription_active` continua `true` | **pagamento pendente** (aviso, sem cortar) |
| **canceled** | assinatura cancelada | `subscription_active = false`, `plan = vazio` | **cancelamento** |
| outros | desconhecido | nenhuma | nenhuma (só log) |

> **Decisão herdada (confirmar):** hoje o `pastdue` **não corta o acesso** — só avisa. Só o `canceled` desativa. Isso combina com a decisão que você já tomou no canal WhatsApp (assinatura inativa → caminho de renovação): quem cai em `canceled` vira `subscription_active=false` e, ao escrever no bot, entra na renovação. Mantenho assim, salvo sua orientação.

---

## 3. Para onde vai

Uma Edge Function **`guru-webhook`** no Supabase, que substitui o workflow. Fluxo:

1. Recebe o POST do Guru na URL da função.
2. **Valida autenticidade** — o Guru envia `body.api_token`; a função confere contra um secret `GURU_API_TOKEN` e rejeita o que não bater (o n8n não validava — vamos validar).
3. Processa só `body.webhook_type == "subscription"`.
4. Normaliza os mesmos campos de hoje.
5. **Provisiona o usuário** (cria no Auth se não existir, via Admin API com service role) e faz upsert no `profiles`.
6. **Roteia pelo status** (tabela acima), atualizando `profiles` e enviando o **template** correto via Cloud API.
7. **Loga** o evento (em `webhook_events` e/ou numa tabela `subscription_events`).
8. **Inscreve no onboarding** quando ativa — com a regra de "primeira vez" abaixo (não a cada `active`).

### Inscrição no onboarding: primeira vez ≠ renovação ≠ reativação
O Guru manda `active` em **vários momentos**: na primeira assinatura, a cada **renovação de ciclo** e quando alguém **reativa** uma assinatura cancelada. Inscrever a cada `active` faria um cliente antigo receber "boas-vindas, dia 1" de novo. Então a inscrição distingue três casos:

| Caso | Como detectar | Onboarding |
|---|---|---|
| **Primeira vez** | usuário foi criado agora (não existia no Auth/`profiles`) **e** nunca teve enrollment | sequência **completa** ("Onboarding 7 dias") |
| **Reativação** | usuário já existia, estava com `subscription_active=false`, e volta a `active`/`trial` | sequência **"bem-vindo de volta"** (curta) |
| **Renovação de ciclo** | usuário já existia e já estava ativo | **nada** (não inscreve) |

A inscrição é **idempotente**: nunca cria dois enrollments ativos para o mesmo psicólogo na mesma sequência. Decisão de produto: reativação recebe uma sequência reduzida de "bem-vindo de volta", não o onboarding do zero.

### Detalhe crítico do provisionamento
Ao criar o usuário, o `profiles.user_id` aponta para `auth.users(id)`. As tabelas clínicas (`patients`, `evolutions`) usam esse `user_id`. Então: criar no Auth → obter o `user_id` → upsert no `profiles` com esse `user_id`. (Se houver trigger que cria o `profiles` no signup, fazer upsert por e-mail/user_id em vez de insert duplicado.)

---

## 4. Campos do `profiles` que a função escreve

- `subscription_active` (bool) — a chave de acesso.
- `subscription_id` — id da assinatura no Guru (`body.id`).
- `plan` — o `last_status` (ou vazio no cancelamento).
- Na criação: `full_name`, `nickname`, `whatsapp`, `email`.

Nada além disso. Não toca em dado clínico.

---

## 5. As mensagens viram TEMPLATES da Meta

As três mensagens são proativas → **templates utility aprovados pela Meta**. Rascunhos prontos para submeter (categoria *utility*, idioma pt-BR):

**`assinatura_ativada`** — cabeçalho do tipo Documento (o Manual de Uso PDF) + corpo:
> Seja bem-vindo(a), {{1}}! Sua assinatura do ChatPsi está ativa. 🎉 Para acessar a plataforma web, defina sua senha aqui: {{2}}. Em anexo, o Manual de Uso para aproveitar todas as funções. Qualquer dúvida, é só chamar por aqui. 💙
> ({{1}} = apelido · {{2}} = link de definição de senha)

**`pagamento_pendente`** — corpo:
> Olá, {{1}}! 👋 Não identificamos o pagamento da sua assinatura do ChatPsi. Precisa de ajuda para regularizar? Estamos por aqui. 💙
> ({{1}} = apelido)

**`assinatura_cancelada`** — corpo:
> Olá, {{1}}! 👋 Sua assinatura do ChatPsi foi cancelada. Se quiser reativar, é só nos avisar por aqui — será um prazer te ajudar de novo. 💙
> ({{1}} = apelido)

> **Por que utility:** são atualizações de conta/assinatura, não marketing — categoria mais barata e de aprovação mais tranquila. Mantenha o texto factual (sem promoção) para não ser reclassificado como marketing pela Meta.
> **Prazo:** a aprovação leva alguns dias. Submeta os três **assim que possível**, em paralelo à construção.

---

## 6. O bug da senha (corrigir na migração)

Hoje a mensagem de boas-vindas exibe uma senha **aleatória** que não corresponde à senha realmente criada — o psicólogo recebe uma senha que não funciona. Na migração:

- **Recomendado:** não enviar senha em texto. Gerar um **link de definição/recuperação de senha** (Supabase Admin: `generateLink` tipo recovery/invite) e enviar esse link no template (`{{2}}`). Mais seguro para um produto clínico e elimina o bug.
- **Alternativa (se quiser manter senha):** enviar a senha **real** que foi criada (`doc` 6 dígitos + `@Chatpsi`) — nunca uma aleatória. Menos seguro; só se houver razão de negócio.

Decisão sua. O prompt assume o **link de senha** por padrão.

---

## 7. Decisões a confirmar

1. **`pastdue` mantém acesso (grace) ou corta?** Padrão: mantém e só avisa (como hoje).
2. **Senha:** link de definição de senha (padrão) ou senha em texto?
3. **Trial:** envia o mesmo template de boas-vindas? Padrão: sim.

---

## 8. Segurança

- Validar `body.api_token` contra `GURU_API_TOKEN` (rejeitar forjados).
- Segredos só em env do Supabase: `GURU_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` (já existe), `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.
- Não logar dados sensíveis (CPF, telefone) em texto claro além do necessário.
- Idempotência: o Guru pode reenviar o mesmo evento; não duplicar provisionamento nem reenviar boas-vindas duas vezes (controlar por `subscription_id` + status já processado).

---

## 9. Não-regressão (roda em paralelo ao n8n)

Enquanto o n8n estiver no ar, **os dois podem receber o webhook do Guru ao mesmo tempo** — e isso é um ponto de atenção: se ambos escreverem em `profiles`, não há conflito (mesma fonte de verdade, last-write-wins), mas **as mensagens podem sair duplicadas** (n8n manda pelo uazapi, a função manda pelo oficial). Por isso, no teste, aponte o webhook do Guru para a função nova **só para uma assinatura de teste** (ou use o disparo de teste), e só troque o webhook de produção do n8n para a função na virada definitiva. Até lá, a função processa e responde **apenas para telefones de teste** (allowlist `WA_TEST_ALLOWLIST`), igual ao resto do canal novo.

---

## 10. Ordem de execução

1. Submeter os 3 templates na Meta (começa o relógio de aprovação).
2. Rodar o **prompt do `guru-webhook`** no Claude Code.
3. Configurar o secret `GURU_API_TOKEN` e apontar um webhook de teste do Guru para a função.
4. Testar com uma assinatura de teste (allowlist): ativa → boas-vindas + acesso; cancela → renovação + aviso.
5. Na virada definitiva: trocar o webhook de produção do Guru para a função e desligar o do n8n.
