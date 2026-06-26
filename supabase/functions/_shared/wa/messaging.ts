// Emissor de mensagens para a WhatsApp Cloud API: texto (com normalização e split),
// botões de resposta (máx 3) e lista interativa (até 10 linhas). Componentes
// interativos só funcionam dentro da janela de 24h — ok, pois o canal é reativo.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const GRAPH_API_VERSION = 'v21.0';
const MAX_CHUNK = 3500;

/** Registra falha de envio em webhook_events (para depuração visível no banco). */
async function logSendFailure(status: number, errText: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return;
    const sb = createClient(url, key);
    await sb.from('webhook_events').insert({
      direction: 'outbound',
      status_code: status,
      error: errText,
      payload: { to: payload.to ?? null, type: payload.type ?? null },
    });
  } catch (_e) { /* não derruba o fluxo */ }
}

function creds(): { token: string; phoneNumberId: string } | null {
  const token = Deno.env.get('WHATSAPP_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  if (!token || !phoneNumberId) {
    console.error('Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID');
    return null;
  }
  return { token, phoneNumberId };
}

async function postMessage(payload: Record<string, unknown>): Promise<boolean> {
  const c = creds();
  if (!c) return false;
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${c.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${c.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    },
  );
  if (!res.ok) {
    const errText = await res.text();
    console.error(`WhatsApp send failed (${res.status}):`, errText);
    await logSendFailure(res.status, errText, payload);
    return false;
  }
  return true;
}

/** Ajusta markdown para o WhatsApp: ** -> *, remove cabeçalhos #/##/###. */
export function normalizeForWhatsApp(text: string): string {
  return text
    .replace(/\*\*/g, '*')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/#{2,3}/g, '');
}

/** Divide texto em pedaços de até maxLen, preferindo quebrar em parágrafos (\n\n). */
export function splitMessage(text: string, maxLen = MAX_CHUNK): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  const paragraphs = text.split('\n\n');
  let current = '';
  const flush = () => {
    if (current.trim().length > 0) chunks.push(current.trim());
    current = '';
  };
  for (const para of paragraphs) {
    if (para.length > maxLen) {
      flush();
      for (let i = 0; i < para.length; i += maxLen) chunks.push(para.slice(i, i + maxLen));
      continue;
    }
    if ((current ? current.length + 2 : 0) + para.length > maxLen) flush();
    current = current ? `${current}\n\n${para}` : para;
  }
  flush();
  return chunks.length > 0 ? chunks : [text.slice(0, maxLen)];
}

/** Envia texto, normalizando e dividindo em pedaços enviados em ordem. */
export async function sendText(to: string, body: string): Promise<void> {
  const chunks = splitMessage(normalizeForWhatsApp(body));
  for (const chunk of chunks) {
    await postMessage({ to, type: 'text', text: { body: chunk } });
  }
}

export interface ReplyButton {
  id: string;
  title: string; // máx 20 chars
}

/** Envia até 3 botões de resposta. */
export async function sendButtons(to: string, body: string, buttons: ReplyButton[]): Promise<void> {
  const action = {
    buttons: buttons.slice(0, 3).map((b) => ({
      type: 'reply',
      reply: { id: b.id, title: b.title.slice(0, 20) },
    })),
  };
  await postMessage({
    to,
    type: 'interactive',
    interactive: { type: 'button', body: { text: body.slice(0, 1024) }, action },
  });
}

export interface ListRow {
  id: string;
  title: string;        // máx 24 chars
  description?: string; // máx 72 chars
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

/** Envia uma lista interativa com VÁRIAS seções (até 10 linhas no total). */
export async function sendSectionedList(
  to: string,
  body: string,
  buttonLabel: string,
  sections: ListSection[],
): Promise<void> {
  let remaining = 10;
  const builtSections = [];
  for (const s of sections) {
    if (remaining <= 0) break;
    const rows = s.rows.slice(0, remaining).map((r) => ({
      id: r.id.slice(0, 200),
      title: r.title.slice(0, 24),
      ...(r.description ? { description: r.description.slice(0, 72) } : {}),
    }));
    remaining -= rows.length;
    if (rows.length) builtSections.push({ title: s.title.slice(0, 24), rows });
  }
  await postMessage({
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: body.slice(0, 1024) },
      action: { button: buttonLabel.slice(0, 20), sections: builtSections },
    },
  });
}

/** Envia uma lista interativa (uma seção, até 10 linhas). */
export async function sendList(
  to: string,
  body: string,
  buttonLabel: string,
  rows: ListRow[],
  sectionTitle = 'Pacientes',
): Promise<void> {
  const action = {
    button: buttonLabel.slice(0, 20),
    sections: [
      {
        title: sectionTitle.slice(0, 24),
        rows: rows.slice(0, 10).map((r) => ({
          id: r.id.slice(0, 200),
          title: r.title.slice(0, 24),
          ...(r.description ? { description: r.description.slice(0, 72) } : {}),
        })),
      },
    ],
  };
  await postMessage({
    to,
    type: 'interactive',
    interactive: { type: 'list', body: { text: body.slice(0, 1024) }, action },
  });
}
