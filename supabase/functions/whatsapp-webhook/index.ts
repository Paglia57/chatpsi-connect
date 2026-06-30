import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { chat } from "../_shared/llm/index.ts";
import { fetchWhatsappMedia } from "../_shared/media/whatsappMedia.ts";
import { audioToText, documentToText, imageToText } from "../_shared/media/toText.ts";
import { sendText } from "../_shared/wa/messaging.ts";
import { getSession, logWaMessage, patchSession } from "../_shared/wa/repo.ts";
import { type ConversationInput, handleConversation } from "../_shared/wa/state.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Persona de vendas (não cadastrados). O clínico vive na máquina de estado.
const VENDAS_PERSONA = 'vendas';

// --- Signature validation (X-Hub-Signature-256) ---

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function isValidSignature(appSecret: string, header: string | null, rawBody: string): Promise<boolean> {
  if (!header) return false;
  const expected = `sha256=${await hmacSha256Hex(appSecret, rawBody)}`;
  return timingSafeEqual(expected, header);
}

// --- Inbound parsing ---

type MessageKind = 'text' | 'audio' | 'image' | 'document' | 'interactive';

interface IncomingMessage {
  from: string;
  senderName: string;
  type: MessageKind;
  body?: string;     // text
  mediaId?: string;  // audio/image/document
  caption?: string;  // image/document
  replyId?: string;  // interactive (button/list reply id)
}

/** Extract received messages (text, mídia e respostas interativas). Status events são ignorados. */
function extractMessages(payload: any): IncomingMessage[] {
  const out: IncomingMessage[] = [];
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value;
      const nameByWaId = new Map<string, string>();
      const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
      for (const c of contacts) {
        if (c?.wa_id) nameByWaId.set(String(c.wa_id), String(c?.profile?.name ?? ''));
      }
      const messages = Array.isArray(value?.messages) ? value.messages : [];
      for (const msg of messages) {
        if (!msg?.from) continue;
        const from = String(msg.from);
        const senderName = nameByWaId.get(from) ?? '';

        if (msg.type === 'text' && msg?.text?.body) {
          out.push({ from, senderName, type: 'text', body: String(msg.text.body) });
        } else if (msg.type === 'audio') {
          const mediaId = msg.audio?.id ?? msg.voice?.id;
          if (mediaId) out.push({ from, senderName, type: 'audio', mediaId: String(mediaId) });
        } else if (msg.type === 'image' && msg.image?.id) {
          out.push({
            from, senderName, type: 'image',
            mediaId: String(msg.image.id),
            caption: msg.image.caption ? String(msg.image.caption) : undefined,
          });
        } else if (msg.type === 'document' && msg.document?.id) {
          out.push({
            from, senderName, type: 'document',
            mediaId: String(msg.document.id),
            caption: msg.document.caption ? String(msg.document.caption) : undefined,
          });
        } else if (msg.type === 'interactive') {
          const it = msg.interactive;
          const replyId = it?.button_reply?.id ?? it?.list_reply?.id;
          if (replyId) out.push({ from, senderName, type: 'interactive', replyId: String(replyId) });
        }
        // Demais tipos (status, etc.) são ignorados.
      }
    }
  }
  return out;
}

// --- Identidade: normalização do 9º dígito brasileiro ---

/** Formas plausíveis de um número BR para casar com profiles.whatsapp (com e sem o 9). */
function candidatesFor(from: string): string[] {
  const digits = from.replace(/\D/g, '');
  const forms = new Set<string>();
  forms.add(digits);
  if (digits.length >= 4 && digits[4] !== '9') forms.add(digits.slice(0, 4) + '9' + digits.slice(4));
  if (digits.length >= 5 && digits[4] === '9') forms.add(digits.slice(0, 4) + digits.slice(5));
  for (const f of Array.from(forms)) forms.add('+' + f);
  return Array.from(forms);
}

// --- Resolução de mídia em texto (mantém os bytes do áudio p/ upload) ---

async function resolveMedia(msg: IncomingMessage): Promise<{ text: string; audio?: { bytes: Uint8Array; mimeType: string } }> {
  if (msg.type === 'text') return { text: msg.body ?? '' };
  const { bytes, mimeType } = await fetchWhatsappMedia(msg.mediaId!);
  const caption = msg.caption ? `${msg.caption}\n\n` : '';
  if (msg.type === 'audio') return { text: await audioToText(bytes, mimeType), audio: { bytes, mimeType } };
  if (msg.type === 'image') return { text: caption + (await imageToText(bytes, mimeType)) };
  if (msg.type === 'document') return { text: caption + (await documentToText(bytes, mimeType)) };
  return { text: '' };
}

// --- Fluxos por identidade ---

/** Não cadastrado: rota de vendas + lead. */
async function salesFlow(supabase: any, msg: IncomingMessage, text: string): Promise<void> {
  await supabase.from('wa_leads').upsert({ phone: msg.from, name: msg.senderName || null }, { onConflict: 'phone' });
  await logWaMessage(supabase, msg.from, 'user', msg.type === 'interactive' ? `[opção] ${msg.replyId ?? ''}` : (text || '(vazio)'));
  const session = await getSession(supabase, msg.from);
  const result = await chat({
    task: 'vendas', personaSlug: VENDAS_PERSONA, userText: text || 'Olá',
    threadId: session?.thread_id ?? undefined, shadowKey: msg.from,
  });
  if (result.threadId && result.threadId !== session?.thread_id) {
    await patchSession(supabase, msg.from, { kind: 'vendas', thread_id: result.threadId });
  }
  await sendText(msg.from, result.text);
  await logWaMessage(supabase, msg.from, 'ai', result.text, result.usage);
}

/** Cadastrado e inativo: caminho de renovação (bloqueia uso clínico). */
async function renovacaoFlow(supabase: any, msg: IncomingMessage, profile: any, text: string): Promise<void> {
  await logWaMessage(supabase, msg.from, 'user', msg.type === 'interactive' ? `[opção] ${msg.replyId ?? ''}` : (text || '(vazio)'));
  await patchSession(supabase, msg.from, { mode: 'renovacao', kind: 'clinico' });
  const name = profile?.nickname || profile?.name || '';
  const message =
    `Olá${name ? ', ' + name : ''}! Sua assinatura do ChatPsi está inativa no momento, então o uso clínico ` +
    `está pausado. Para reativar e voltar a ditar evoluções e usar as ferramentas, é só renovar sua assinatura ` +
    `no painel web do ChatPsi (acesse sua conta e atualize o plano).`;
  await sendText(msg.from, message);
  await logWaMessage(supabase, msg.from, 'ai', message);
}

// --- Processamento de uma mensagem (roda em background) ---

async function processMessage(supabase: any, msg: IncomingMessage): Promise<void> {
  // 1. Resolver conteúdo (mídia → texto). Interactive não tem mídia.
  let derived: { text: string; audio?: { bytes: Uint8Array; mimeType: string } } = { text: '' };
  if (msg.type !== 'interactive') {
    try {
      derived = await resolveMedia(msg);
    } catch (mediaErr) {
      console.error('Error resolving media:', mediaErr instanceof Error ? mediaErr.message : mediaErr);
      await sendText(msg.from, 'Não consegui processar sua mídia. Pode reenviar em texto, por favor?');
      return;
    }
  }

  // 2. Identidade — SOMENTE LEITURA em profiles. Nunca usar openai_thread_id.
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('nickname, name, user_id, subscription_active, whatsapp')
    .in('whatsapp', candidatesFor(msg.from))
    .limit(1)
    .maybeSingle();
  if (error) console.error('Error reading profiles:', error.message);

  // 3. Gating por identidade.
  if (!profile) {
    await salesFlow(supabase, msg, derived.text);
    return;
  }
  if (!profile.subscription_active) {
    await renovacaoFlow(supabase, msg, profile, derived.text);
    return;
  }

  // 4. Psicólogo ativo → máquina de estado WhatsApp-first.
  const input: ConversationInput = {
    kind: msg.type,
    text: derived.text,
    replyId: msg.replyId,
    audio: derived.audio,
  };
  await handleConversation({
    supabase,
    phone: msg.from,
    userId: profile.user_id,
    displayName: profile.nickname || profile.name || '',
    // Allowlist de teste removida para produção — acesso clínico segue protegido por identidade (profiles.whatsapp) + assinatura.
    allowed: true,
    input,
  });
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // --- (a) GET: Meta webhook verification ---
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const verifyToken = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const expectedToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && expectedToken && verifyToken === expectedToken && challenge) {
      return new Response(challenge, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } });
    }
    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }

  // --- (b) POST: incoming webhook ---
  if (req.method === 'POST') {
    const raw = await req.text();

    const appSecret = Deno.env.get('WHATSAPP_APP_SECRET');
    if (appSecret) {
      const signature = req.headers.get('x-hub-signature-256');
      if (!(await isValidSignature(appSecret, signature, raw))) {
        console.error('Invalid X-Hub-Signature-256');
        return new Response('Invalid signature', { status: 401, headers: corsHeaders });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch (_e) {
      console.error('Failed to parse webhook body as JSON');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const incomingMessages = extractMessages(payload);

    // Responde 200 imediato; processa em background (Meta não reenvia por timeout).
    const work = (async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY; skipping processing');
        return;
      }
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: inboundError } = await supabase
        .from('webhook_events')
        .insert({ direction: 'inbound', payload });
      if (inboundError) console.error('Error logging inbound webhook event:', inboundError.message);

      for (const msg of incomingMessages) {
        try {
          await processMessage(supabase, msg);
        } catch (err) {
          console.error('Error processing message:', err instanceof Error ? err.message : err);
          await supabase.from('webhook_events').insert({
            direction: 'outbound',
            payload: { to: msg.from },
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();

    // @ts-ignore EdgeRuntime is provided by the Supabase Deno runtime.
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(work);
    } else {
      work.catch((e) => console.error('Background work error:', e));
    }

    return new Response('OK', { status: 200, headers: corsHeaders });
  }

  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
});
