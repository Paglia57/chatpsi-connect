# Envio do Manual do WhatsApp (admin) — setup, custo e verificação

Recurso para o admin/super-admin **hospedar e enviar** o Manual do WhatsApp (PDF) aos usuários,
com **o menor custo possível** na API oficial da Meta (Cloud API). Implementado seguindo a skill
`whatsapp-api` (playbook de custos).

## Como funciona (arquitetura)

- **PDF hospedado no próprio webapp:** `public/manual-whatsapp-chatpsi.pdf` → servido em
  `https://app.chatpsi.com.br/manual-whatsapp-chatpsi.pdf` (URL pública, sem depender de Storage).
- **UI:** card **“Manual do WhatsApp”** em `AdminPage` (`src/components/admin/ManualSendCard.tsx`),
  sob `AdminGuard` (`is_admin`). Botões: **Simular (ativos)**, **Enviar para todos os ativos** e
  **Enviar teste** (para um número).
- **Backend:** edge function `admin-send-manual`. Para cada destinatário decide o canal de **menor custo**:
  - **Janela de 24h ABERTA** (usuário mandou msg nas últimas 24h, visto em `wa_messages`) →
    **documento livre = GRÁTIS**.
  - **Janela FECHADA** → **template utility** (`manual_whatsapp`, ~US$ 0,0068 ≈ **R$ 0,035**/entrega).
- **Idempotência/auditoria:** tabela `manual_sends` (migration `20260707120000_manual_sends.sql`),
  índice único `(phone, manual_version)`. Ninguém recebe a mesma versão duas vezes (salvo `force`).

## Estratégia de custo (recap)

| Caminho | Quando | Custo/entrega |
|---|---|---|
| Documento livre | janela 24h aberta | **R$ 0** |
| Template utility | fora da janela | ~R$ 0,035 |
| Template marketing | (não usar) | ~R$ 0,32 (≈9x) |

O botão **Simular (ativos)** roda um `dry_run`: mostra quantos iriam por grátis vs template e o
**custo estimado** — sem enviar nada. Rode antes do envio real.

## Variáveis de ambiente (Supabase Edge Functions)

Já usadas pelo canal (devem existir): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Opcionais (têm default no código):
- `MANUAL_URL` (default `https://app.chatpsi.com.br/manual-whatsapp-chatpsi.pdf`)
- `MANUAL_FILENAME` (default `Manual do WhatsApp - ChatPsi.pdf`)
- `MANUAL_VERSION` (default `whatsapp-2026-07`) — troque ao publicar uma nova versão do manual (permite reenviar).
- `MANUAL_TEMPLATE_NAME` (default `manual_whatsapp`), `MANUAL_TEMPLATE_LANG` (default `pt_BR`)

## Passos para colocar no ar (dependem do seu ambiente)

1. **Deploy do PDF:** publicar o webapp (o PDF em `public/` já sobe junto). Confirmar que a URL abre no navegador.
2. **Migration:** aplicar `20260707120000_manual_sends.sql` (`supabase db push` ou o fluxo de deploy do projeto).
3. **Deploy da function:** `supabase functions deploy admin-send-manual`.
4. **Template Meta (só para o caminho fora da janela):** criar/submeter o template utility.
   - Automático: `node scripts/wa-create-manual-template.mjs` com as envs `WA_APP_ID`, `WABA_ID`,
     `WA_MGMT_TOKEN` (system user com `whatsapp_business_management`), `MANUAL_PDF_PATH`.
   - Ou manual: WhatsApp Manager → Modelos → criar `manual_whatsapp`, categoria **Utility**, idioma
     **pt_BR**, header **Documento** (anexar o PDF de exemplo), corpo com `{{1}}` (primeiro nome) e
     botão de URL para `https://app.chatpsi.com.br/`.
   - Aprovação da Meta: ~24–48h. **O caminho grátis (janela aberta) já funciona sem esperar o template.**
   - **Precisa ser feito por você:** o `WHATSAPP_TOKEN` fica mascarado na Management API do Supabase
     (só existe em runtime dentro das functions), então o template não pode ser criado "de fora".
     Caminho mais fácil: **WhatsApp Manager UI** (ele faz o upload do PDF de exemplo pra você).
     O template deve se chamar **`manual_whatsapp`**, idioma **pt_BR**, categoria **Utility**,
     **header = Documento** (anexe o PDF), **corpo com {{1}}** (primeiro nome) e um botão de URL
     opcional — exatamente o formato que a function `admin-send-manual` já envia.

## Verificação (fazer antes de liberar para a base)

1. No admin, **Enviar teste** para o seu próprio número (com a janela **aberta** — mande uma msg ao bot antes):
   deve chegar o **PDF nativo** com a legenda. Confirma o caminho grátis e a URL do PDF.
2. **Simular (ativos):** conferir os números (grátis vs template) e o custo estimado.
3. Depois do template aprovado, testar o caminho **fora da janela** (um número que não falou com o bot há >24h).
4. Conferir a tabela `manual_sends` (canal, status) e, no futuro, o `pricing` no webhook de status.

## Conformidade (LGPD/Meta)

- **Opt-in:** os destinatários são clientes ativos que já usam o canal — relação estabelecida.
- **Categoria correta:** enquadrado como **utility** (guia de uso do serviço que o cliente assina).
  Se a Meta reclassificar como marketing, o custo continua irrisório neste volume; não “disfarçar”.
- **Opt-out (próximo passo recomendado):** honrar “sair/parar” e uma flag de opt-out por contato antes
  de disparos recorrentes. Para este envio único de manual a clientes ativos, o risco é baixo.
- **Auditar entrega/custo:** evoluir o webhook de status para gravar `is_billable`/`pricing_category`
  em `manual_sends` por `wamid` (campos já existem na tabela).
