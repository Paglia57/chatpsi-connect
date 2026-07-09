// Consulta e criação de templates de mensagem na WABA (WhatsApp Business Management API).
// Usa WHATSAPP_TOKEN + WHATSAPP_WABA_ID do ambiente das edge functions — é o único lugar
// onde o token existe, então a gestão de template precisa acontecer aqui dentro.

const GRAPH_API_VERSION = 'v21.0';

function creds(): { token: string; wabaId: string } | null {
  const token = Deno.env.get('WHATSAPP_TOKEN');
  const wabaId = Deno.env.get('WHATSAPP_WABA_ID');
  if (!token || !wabaId) return null;
  return { token, wabaId };
}

export interface TemplateInfo {
  found: boolean;
  /** APPROVED | PENDING | REJECTED | ... | 'UNKNOWN' quando a consulta à Meta falhou */
  status: string;
  category: string | null;
  rejectedReason: string | null;
  /** maior {{n}} do corpo (0 = template sem variável) */
  bodyParamCount: number;
  /** DOCUMENT | IMAGE | VIDEO | TEXT | null (sem header) */
  headerFormat: string | null;
}

const UNKNOWN: TemplateInfo = {
  found: false, status: 'UNKNOWN', category: null, rejectedReason: null, bodyParamCount: 1, headerFormat: null,
};

/** Busca um template por nome+idioma na WABA. status 'UNKNOWN' quando a própria consulta falha. */
export async function fetchTemplateInfo(name: string, lang: string): Promise<TemplateInfo> {
  const c = creds();
  if (!c) return UNKNOWN;
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${c.wabaId}/message_templates` +
      `?name=${encodeURIComponent(name)}&fields=name,language,status,category,rejected_reason,components&limit=100`,
      { headers: { Authorization: `Bearer ${c.token}` } },
    );
    if (!res.ok) {
      console.error('fetchTemplateInfo failed:', res.status, await res.text());
      return UNKNOWN;
    }
    const out = await res.json();
    // deno-lint-ignore no-explicit-any
    const tpl = (out?.data ?? []).find((t: any) => t.name === name && t.language === lang);
    if (!tpl) return { ...UNKNOWN, status: 'NOT_FOUND' };
    // deno-lint-ignore no-explicit-any
    const body = (tpl.components ?? []).find((cp: any) => cp.type === 'BODY');
    const nums = [...String(body?.text ?? '').matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
    // deno-lint-ignore no-explicit-any
    const header = (tpl.components ?? []).find((cp: any) => cp.type === 'HEADER');
    return {
      found: true,
      status: tpl.status ?? 'UNKNOWN',
      category: tpl.category ?? null,
      rejectedReason: tpl.rejected_reason ?? null,
      bodyParamCount: nums.length ? Math.max(...nums) : 0,
      headerFormat: header?.format ?? null,
    };
  } catch (e) {
    console.error('fetchTemplateInfo error:', e);
    return UNKNOWN;
  }
}

/** Lista todos os templates da WABA (nome, idioma, status, categoria). */
// deno-lint-ignore no-explicit-any
export async function listTemplates(): Promise<any[]> {
  const c = creds();
  if (!c) throw new Error('WHATSAPP_TOKEN/WHATSAPP_WABA_ID ausentes no ambiente.');
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${c.wabaId}/message_templates` +
    `?fields=name,language,status,category,rejected_reason&limit=100`,
    { headers: { Authorization: `Bearer ${c.token}` } },
  );
  const out = await res.json();
  if (!res.ok) throw new Error(`Meta recusou a listagem: ${JSON.stringify(out)}`);
  return out?.data ?? [];
}

/** Descobre o App ID do token via /debug_token (necessário pra Resumable Upload API). */
async function fetchAppId(token: string): Promise<string> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/debug_token?input_token=${encodeURIComponent(token)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const out = await res.json();
  const appId = out?.data?.app_id;
  if (!appId) throw new Error(`Não consegui descobrir o App ID do token: ${JSON.stringify(out)}`);
  return String(appId);
}

/**
 * Sobe uma mídia de EXEMPLO pela Resumable Upload API e devolve o header_handle
 * exigido pela Meta ao criar template com header de mídia.
 */
async function uploadExampleMedia(token: string, mediaUrl: string, filename: string, mime: string): Promise<string> {
  const dl = await fetch(mediaUrl);
  if (!dl.ok) throw new Error(`Não consegui baixar a mídia da comunicação (${dl.status}). URL pública? ${mediaUrl}`);
  const bytes = new Uint8Array(await dl.arrayBuffer());
  const appId = await fetchAppId(token);
  const startRes = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${appId}/uploads` +
    `?file_name=${encodeURIComponent(filename)}&file_length=${bytes.length}&file_type=${encodeURIComponent(mime)}`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
  );
  const start = await startRes.json();
  if (!start?.id) throw new Error(`Falha ao abrir sessão de upload do exemplo: ${JSON.stringify(start)}`);
  const upRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${start.id}`, {
    method: 'POST',
    headers: { Authorization: `OAuth ${token}`, file_offset: '0' },
    body: bytes,
  });
  const up = await upRes.json();
  if (!up?.h) throw new Error(`Falha no upload dos bytes do exemplo: ${JSON.stringify(up)}`);
  return up.h as string;
}

export interface CreateTemplateInput {
  name: string;                 // [a-z0-9_]
  lang: string;                 // ex.: pt_BR
  category: 'UTILITY' | 'MARKETING';
  bodyText: string;             // já com {{1}} no lugar de {{nome}}
  hasNameVar: boolean;          // corpo usa {{1}} = primeiro nome
  header?: { kind: 'document' | 'image' | 'video'; mediaUrl: string; filename: string };
}

/** Submete um template pra aprovação da Meta. Retorna a resposta da Graph API. */
// deno-lint-ignore no-explicit-any
export async function createTemplate(input: CreateTemplateInput): Promise<any> {
  const c = creds();
  if (!c) throw new Error('WHATSAPP_TOKEN/WHATSAPP_WABA_ID ausentes no ambiente.');
  const components: Record<string, unknown>[] = [];
  if (input.header) {
    const mime = input.header.kind === 'document' ? 'application/pdf'
      : input.header.kind === 'image' ? 'image/jpeg' : 'video/mp4';
    const handle = await uploadExampleMedia(c.token, input.header.mediaUrl, input.header.filename, mime);
    components.push({
      type: 'HEADER',
      format: input.header.kind.toUpperCase(),
      example: { header_handle: [handle] },
    });
  }
  components.push({
    type: 'BODY',
    text: input.bodyText,
    ...(input.hasNameVar ? { example: { body_text: [['Marcio']] } } : {}),
  });
  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${c.wabaId}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name,
      language: input.lang,
      category: input.category,
      allow_category_change: true, // Meta reclassifica em vez de rejeitar
      components,
    }),
  });
  const out = await res.json();
  if (!res.ok) {
    const msg = out?.error?.error_user_msg || out?.error?.message || JSON.stringify(out);
    throw new Error(`Meta recusou o template: ${msg}`);
  }
  return out;
}
