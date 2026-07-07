#!/usr/bin/env node
/**
 * Cria/submete o template "manual_whatsapp" (categoria UTILITY, pt_BR) na WABA do ChatPsi,
 * com HEADER de DOCUMENTO (o PDF nativo), corpo com {{1}} = primeiro nome e um botão de URL
 * para o painel web. Casa com sendTemplate(..., headerDocument) em _shared/wa/messaging.ts.
 *
 * A Meta exige um EXEMPLO do documento no header na hora de criar o template. Isso é feito
 * pela Resumable Upload API (nível de App), que devolve um "header_handle". Este script faz:
 *   1) upload do PDF de exemplo  -> header_handle
 *   2) criação do template com esse handle
 *
 * Requer Node 18+ (fetch nativo) e as variáveis de ambiente:
 *   WA_APP_ID           -> ID do App Meta (para a Resumable Upload API)
 *   WABA_ID             -> ID da WhatsApp Business Account
 *   WA_MGMT_TOKEN       -> token com whatsapp_business_management (system user token)
 *   MANUAL_PDF_PATH     -> caminho local do PDF (default: public/manual-whatsapp-chatpsi.pdf)
 *
 * Uso:  node scripts/wa-create-manual-template.mjs
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const V = 'v21.0';
const APP_ID = process.env.WA_APP_ID;
const WABA_ID = process.env.WABA_ID;
const TOKEN = process.env.WA_MGMT_TOKEN;
const PDF_PATH = process.env.MANUAL_PDF_PATH || 'public/manual-whatsapp-chatpsi.pdf';
const TEMPLATE_NAME = process.env.MANUAL_TEMPLATE_NAME || 'manual_whatsapp';
const WEBAPP_URL = 'https://app.chatpsi.com.br/';

function must(name, val) { if (!val) { console.error(`✗ Falta a env ${name}`); process.exit(1); } return val; }
must('WA_APP_ID', APP_ID); must('WABA_ID', WABA_ID); must('WA_MGMT_TOKEN', TOKEN);

async function uploadExample() {
  const bytes = await readFile(path.resolve(PDF_PATH));
  const fileName = path.basename(PDF_PATH);
  // 1) abre sessão de upload
  const startUrl = `https://graph.facebook.com/${V}/${APP_ID}/uploads?file_name=${encodeURIComponent(fileName)}&file_length=${bytes.length}&file_type=application/pdf`;
  const startRes = await fetch(startUrl, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` } });
  const start = await startRes.json();
  if (!start.id) { console.error('✗ Falha ao abrir upload:', JSON.stringify(start)); process.exit(1); }
  // 2) envia os bytes
  const upRes = await fetch(`https://graph.facebook.com/${V}/${start.id}`, {
    method: 'POST',
    headers: { Authorization: `OAuth ${TOKEN}`, file_offset: '0' },
    body: bytes,
  });
  const up = await upRes.json();
  if (!up.h) { console.error('✗ Falha no upload dos bytes:', JSON.stringify(up)); process.exit(1); }
  console.log('✓ Exemplo enviado. header_handle obtido.');
  return up.h;
}

async function createTemplate(headerHandle) {
  const payload = {
    name: TEMPLATE_NAME,
    language: 'pt_BR',
    category: 'UTILITY',
    components: [
      {
        type: 'HEADER',
        format: 'DOCUMENT',
        example: { header_handle: [headerHandle] },
      },
      {
        type: 'BODY',
        text:
          'Olá, {{1}}! Este é o seu guia de uso do ChatPsi no WhatsApp — como planejar, ' +
          'conversar e registrar a evolução direto por aqui, em toda a sua prática clínica. ' +
          'Toque no documento acima para abrir. Qualquer dúvida, é só responder nesta conversa.',
        example: { body_text: [['Marcio']] },
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Abrir painel web', url: WEBAPP_URL },
        ],
      },
    ],
  };
  const res = await fetch(`https://graph.facebook.com/${V}/${WABA_ID}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const out = await res.json();
  if (!res.ok) { console.error('✗ Falha ao criar template:', JSON.stringify(out, null, 2)); process.exit(1); }
  console.log('✓ Template submetido para aprovação:', JSON.stringify(out));
  console.log('  Acompanhe o status em WhatsApp Manager > Modelos de mensagem (aprovação ~24–48h).');
}

const handle = await uploadExample();
await createTemplate(handle);
