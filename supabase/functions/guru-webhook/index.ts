// guru-webhook — recebe o webhook de assinaturas do Digital Manager Guru,
// provisiona o psicólogo, ativa/desativa o acesso (profiles.subscription_active)
// e notifica por TEMPLATE oficial da Meta (Cloud API).
//
// Migra o comportamento do n8n para dentro do app. Roda EM PARALELO ao n8n na
// fase de teste: só processa/envia para telefones na allowlist WA_TEST_ALLOWLIST
// (evita mensagem duplicada e provisionamento indevido em produção).
//
// Não toca no n8n; não usa a tabela legada "usuarios". Segredos só via Deno.env.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { sendTemplate } from "../_shared/wa/messaging.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// --- Helpers de normalização ---

function onlyDigits(s: unknown): string {
  return String(s ?? '').replace(/\D/g, '');
}

function firstName(full: unknown): string {
  return String(full ?? '').trim().split(/\s+/)[0] ?? '';
}

/** Garante DDI 55 para números BR (DDD+número, 10–11 dígitos) sem código de país. */
function toE164BR(raw: string): string {
  const d = onlyDigits(raw);
  if (!d) return d;
  if (d.startsWith('55') && d.length >= 12) return d;       // já tem DDI
  if (d.length === 10 || d.length === 11) return '55' + d;  // DDD + número
  return d;                                                 // formato inesperado: não força
}

/** Formas plausíveis de um número BR (com/sem 55, com/sem 9º dígito) para casar telefones. */
function phoneForms(raw: string): Set<string> {
  const d = onlyDigits(raw);
  const forms = new Set<string>();
  if (!d) return forms;
  const noCc = d.startsWith('55') && d.length > 11 ? d.slice(2) : d;
  for (const base of new Set([d, noCc])) {
    forms.add(base);
    if (base.length >= 3 && base[2] !== '9') forms.add(base.slice(0, 2) + '9' + base.slice(2));
    if (base.length >= 3 && base[2] === '9') forms.add(base.slice(0, 2) + base.slice(3));
  }
  return forms;
}

/**
 * Allowlist da fase de teste. Vazia/ausente => NÃO processa nada (segurança:
 * o n8n ainda está em produção). No cutover, relaxar/remover este gate.
 */
function phoneMatchesAllowlist(whats: string): boolean {
  const raw = Deno.env.get('WA_TEST_ALLOWLIST') ?? '';
  const entries = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (entries.length === 0) return false;
  const want = phoneForms(whats);
  for (const e of entries) {
    for (const f of phoneForms(e)) {
      if (want.has(f)) return true;
    }
  }
  return false;
}

// --- Log de assinatura (auditoria + idempotência) ---

type SubAction = 'ativou' | 'manteve' | 'avisou' | 'cancelou' | 'ignorou';
type OnboardingCase = 'first_time' | 'reactivation' | 'renewal';

async function logSubEvent(
  supabase: any,
  row: {
    subscription_id: string | null;
    email: string | null;
    status: string | null;
    action: SubAction;
    onboarding_case?: OnboardingCase | null;
    message_sent?: boolean;
  },
): Promise<void> {
  const { error } = await supabase.from('subscription_events').insert({
    subscription_id: row.subscription_id,
    email: row.email,
    status: row.status,
    action: row.action,
    onboarding_case: row.onboarding_case ?? null,
    message_sent: row.message_sent ?? false,
  });
  if (error) console.error('[guru-webhook] erro ao logar subscription_event:', error.message);
}

/** Retry do Guru? Mesmo subscription_id+status processado nas últimas 6h => duplicado. */
async function isDuplicateEvent(supabase: any, subscriptionId: string | null, status: string | null): Promise<boolean> {
  if (!subscriptionId || !status) return false;
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('subscription_events')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .eq('status', status)
    .neq('action', 'ignorou')
    .gte('created_at', sixHoursAgo)
    .limit(1);
  if (error) {
    console.error('[guru-webhook] erro ao checar duplicidade:', error.message);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

// --- Onboarding (motor ainda não existe; inscrição fica como TODO) ---

/**
 * TODO: o motor de onboarding ainda não existe. Quando existir, inscrever o
 * psicólogo de forma idempotente (nunca dois enrollments ativos na mesma sequência).
 * Por ora só registra a intenção; a DECISÃO dos 3 casos já é tomada no roteamento.
 */
async function enrollPsychologist(userId: string, sequence: string): Promise<void> {
  console.log(`[guru-webhook] TODO enrollPsychologist user=${userId} sequence="${sequence}"`);
}

// --- Configuração (templates + manual) lida de subscription_settings ---

interface SubSettings {
  manual_pdf_url: string | null;
  manual_pdf_filename: string | null;
  tpl_ativada_name: string;
  tpl_pendente_name: string;
  tpl_cancelada_name: string;
  tpl_lang: string;
}

async function getSettings(supabase: any): Promise<SubSettings> {
  const fallback: SubSettings = {
    manual_pdf_url: null,
    manual_pdf_filename: 'Manual-de-Uso-ChatPsi.pdf',
    tpl_ativada_name: 'assinatura_ativada',
    tpl_pendente_name: 'pagamento_pendente',
    tpl_cancelada_name: 'assinatura_cancelada',
    tpl_lang: 'pt_BR',
  };
  const { data, error } = await supabase
    .from('subscription_settings')
    .select('manual_pdf_url, manual_pdf_filename, tpl_ativada_name, tpl_pendente_name, tpl_cancelada_name, tpl_lang')
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error('[guru-webhook] erro lendo subscription_settings:', error.message);
    return fallback;
  }
  return { ...fallback, ...data };
}

// --- Provisionamento ---

interface Normalized {
  email: string;
  nome: string;
  apelido: string;
  whatsapp: string;
  subscription_id: string;
  status: string;
}

interface ProvisionResult {
  userId: string;
  wasCreatedNow: boolean;
  prevSubscriptionActive: boolean;
  prevPlan: string | null;
}

/**
 * Garante o usuário no Auth e a linha em profiles. Captura o estado ANTERIOR
 * (criado agora? estava ativo?) necessário para distinguir os 3 casos de onboarding.
 * Retorna null se não foi possível resolver (erro logado).
 */
async function provisionUser(supabase: any, n: Normalized): Promise<ProvisionResult | null> {
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('user_id, subscription_active, plan')
    .eq('email', n.email)
    .maybeSingle();
  if (profErr) console.error('[guru-webhook] erro buscando profile:', profErr.message);

  let userId: string;
  let wasCreatedNow = false;
  let prevSubscriptionActive = false;
  let prevPlan: string | null = null;

  if (profile?.user_id) {
    userId = profile.user_id;
    prevSubscriptionActive = profile.subscription_active === true;
    prevPlan = profile.plan ?? null;
  } else {
    // Cria no Auth (sem senha em texto). O trigger handle_new_user cria a linha em profiles.
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: n.email,
      email_confirm: true,
    });
    if (createErr || !created?.user?.id) {
      // TODO: caso raro (usuário existe no Auth mas não em profiles) — exigiria lookup por email.
      console.error('[guru-webhook] falha ao criar usuário no Auth:', createErr?.message);
      return null;
    }
    userId = created.user.id;
    wasCreatedNow = true;
  }

  // Upsert dos dados do perfil por user_id (linha já existe via trigger ou cadastro prévio).
  const { error: updErr } = await supabase
    .from('profiles')
    .update({
      email: n.email,
      full_name: n.nome,
      nickname: n.apelido,
      whatsapp: n.whatsapp,
      subscription_id: n.subscription_id,
    })
    .eq('user_id', userId);
  if (updErr) console.error('[guru-webhook] erro atualizando profile:', updErr.message);

  return { userId, wasCreatedNow, prevSubscriptionActive, prevPlan };
}

/** Gera link de definição/recuperação de senha (não envia senha em texto). */
async function generatePasswordLink(supabase: any, email: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.generateLink({ type: 'recovery', email });
  if (error) {
    console.error('[guru-webhook] erro gerando link de senha:', error.message);
    return null;
  }
  return data?.properties?.action_link ?? null;
}

// --- Roteamento por status ---

// Status que encerram a assinatura → desativam o acesso. O Guru pode usar
// qualquer um destes em vez de 'canceled' (confirmar no teste real / painel).
const TERMINAL = ['canceled', 'cancelled', 'expired', 'suspended', 'inactive'];

async function handleEvent(supabase: any, n: Normalized): Promise<void> {
  const status = n.status.toLowerCase();
  const cfg = await getSettings(supabase);

  // Status que não mexe em assinatura / desconhecido: só loga.
  const known = ['active', 'trial', 'pastdue', ...TERMINAL];
  if (!known.includes(status)) {
    await logSubEvent(supabase, {
      subscription_id: n.subscription_id, email: n.email, status: n.status, action: 'ignorou',
    });
    return;
  }

  // Idempotência: retry do Guru com mesmo subscription_id+status nas últimas 6h.
  if (await isDuplicateEvent(supabase, n.subscription_id, n.status)) {
    console.log(`[guru-webhook] evento duplicado ignorado (sub=${n.subscription_id} status=${status})`);
    await logSubEvent(supabase, {
      subscription_id: n.subscription_id, email: n.email, status: n.status, action: 'manteve', message_sent: false,
    });
    return;
  }

  // --- terminais (canceled/expired/suspended/inactive): desativa e avisa ---
  if (TERMINAL.includes(status)) {
    const prov = await provisionUser(supabase, n);
    if (!prov) return;
    await supabase.from('profiles').update({ subscription_active: false, plan: '' }).eq('user_id', prov.userId);
    const sent = await sendTemplate(n.whatsapp, cfg.tpl_cancelada_name, cfg.tpl_lang, [n.apelido]);
    await logSubEvent(supabase, {
      subscription_id: n.subscription_id, email: n.email, status: n.status, action: 'cancelou', message_sent: sent,
    });
    return;
  }

  // --- pastdue: MANTÉM acesso (grace), só avisa ---
  if (status === 'pastdue') {
    const prov = await provisionUser(supabase, n);
    if (!prov) return;
    // não altera subscription_active
    const sent = await sendTemplate(n.whatsapp, cfg.tpl_pendente_name, cfg.tpl_lang, [n.apelido]);
    await logSubEvent(supabase, {
      subscription_id: n.subscription_id, email: n.email, status: n.status, action: 'avisou', message_sent: sent,
    });
    return;
  }

  // --- active / trial: ativa acesso ---
  const prov = await provisionUser(supabase, n);
  if (!prov) return;

  const isTrial = status === 'trial';
  const cameFromTrial = prov.prevPlan === 'trial';

  // active vindo de trial: só atualiza plan, NÃO reenvia boas-vindas.
  if (status === 'active' && cameFromTrial) {
    await supabase.from('profiles').update({ subscription_active: true, plan: 'active' }).eq('user_id', prov.userId);
    await logSubEvent(supabase, {
      subscription_id: n.subscription_id, email: n.email, status: n.status, action: 'manteve', message_sent: false,
    });
    return;
  }

  // Decisão dos 3 casos de onboarding (capturados ANTES do update).
  let onboardingCase: OnboardingCase;
  if (prov.wasCreatedNow) {
    onboardingCase = 'first_time';        // usuário novo e sem enrollment (motor inexistente)
  } else if (prov.prevSubscriptionActive === false) {
    onboardingCase = 'reactivation';      // existia, estava inativo, voltou
  } else {
    onboardingCase = 'renewal';           // já estava ativo => renovação de ciclo
  }

  await supabase
    .from('profiles')
    .update({ subscription_active: true, plan: isTrial ? 'trial' : 'active' })
    .eq('user_id', prov.userId);

  // Boas-vindas + inscrição só em first_time / reactivation. Renovação não reenvia nem inscreve.
  if (onboardingCase === 'renewal') {
    await logSubEvent(supabase, {
      subscription_id: n.subscription_id, email: n.email, status: n.status,
      action: 'manteve', onboarding_case: onboardingCase, message_sent: false,
    });
    return;
  }

  const link = await generatePasswordLink(supabase, n.email);
  const header = cfg.manual_pdf_url
    ? { link: cfg.manual_pdf_url, filename: cfg.manual_pdf_filename ?? 'Manual-de-Uso-ChatPsi.pdf' }
    : undefined;
  const sent = await sendTemplate(
    n.whatsapp,
    cfg.tpl_ativada_name,
    cfg.tpl_lang,
    [n.apelido, link ?? ''],
    header,
  );

  await enrollPsychologist(
    prov.userId,
    onboardingCase === 'first_time' ? 'Onboarding 7 dias' : 'Bem-vindo de volta',
  );

  await logSubEvent(supabase, {
    subscription_id: n.subscription_id, email: n.email, status: n.status,
    action: 'ativou', onboarding_case: onboardingCase, message_sent: sent,
  });
}

// --- HTTP handler ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const raw = await req.text();
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch (_e) {
    console.error('[guru-webhook] corpo não é JSON válido');
    return new Response('OK', { status: 200, headers: corsHeaders });
  }

  // Validação de autenticidade: api_token do Guru.
  const expectedToken = Deno.env.get('GURU_API_TOKEN');
  if (!expectedToken || body?.api_token !== expectedToken) {
    console.error('[guru-webhook] api_token inválido');
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  // Só eventos de assinatura.
  if (body?.webhook_type !== 'subscription') {
    return new Response('OK', { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // Processa em background; responde 200 imediato.
  const work = (async () => {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[guru-webhook] faltam SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY');
      return;
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log do evento bruto.
    const { error: logErr } = await supabase
      .from('webhook_events')
      .insert({ direction: 'inbound', source: 'guru', payload: body });
    if (logErr) console.error('[guru-webhook] erro logando webhook_event:', logErr.message);

    // Normalização (espelha o n8n, defensiva).
    const n: Normalized = {
      email: String(body?.subscriber?.email ?? '').trim().toLowerCase(),
      nome: String(body?.subscriber?.name ?? '').trim(),
      apelido: firstName(body?.subscriber?.name),
      whatsapp: toE164BR((body?.subscriber?.phone_local_code ?? '') + (body?.subscriber?.phone_number ?? '')),
      subscription_id: String(body?.id ?? ''),
      status: String(body?.last_status ?? ''),
    };

    if (!n.email || !n.status) {
      console.error('[guru-webhook] payload sem email/last_status — ignorado');
      await logSubEvent(supabase, {
        subscription_id: n.subscription_id || null, email: n.email || null, status: n.status || null, action: 'ignorou',
      });
      return;
    }

    // Gate de allowlist da fase de teste: fora da lista => não provisiona, não envia, só loga.
    if (!phoneMatchesAllowlist(n.whatsapp)) {
      console.log(`[guru-webhook] telefone fora da allowlist — apenas log (sub=${n.subscription_id})`);
      await logSubEvent(supabase, {
        subscription_id: n.subscription_id, email: n.email, status: n.status, action: 'ignorou', message_sent: false,
      });
      return;
    }

    try {
      await handleEvent(supabase, n);
    } catch (err) {
      console.error('[guru-webhook] erro processando evento:', err instanceof Error ? err.message : err);
      await supabase.from('webhook_events').insert({
        direction: 'outbound', source: 'guru',
        payload: { subscription_id: n.subscription_id, email: n.email },
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();

  // @ts-ignore EdgeRuntime é provido pelo runtime Deno do Supabase.
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(work);
  } else {
    work.catch((e) => console.error('[guru-webhook] erro background:', e));
  }

  return new Response('OK', { status: 200, headers: corsHeaders });
});
