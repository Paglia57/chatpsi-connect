// Envio do Manual do WhatsApp (PDF) para usuários, disparado pelo admin do webapp.
// Estratégia de MENOR CUSTO (playbook whatsapp-api):
//   - Se a janela de 24h do usuário está ABERTA (ele mandou msg nas últimas 24h) →
//     manda o PDF como DOCUMENTO LIVRE = GRÁTIS.
//   - Se está FECHADA → manda um TEMPLATE utility (~US$0,0068 ≈ R$0,035/entrega).
// Idempotência: no máximo 1 envio por (telefone, versão do manual), salvo `force`.
// Apenas admin (is_admin). Nada é enviado sem o clique explícito no admin.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { sendDocument, sendTemplate } from "../_shared/wa/messaging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Config (pode sobrescrever por env). O PDF é servido pelo jsDelivr (CDN do GitHub,
// content-type application/pdf), independente do deploy do frontend. O arquivo-fonte
// fica em public/manual-whatsapp-chatpsi.pdf no repo.
const MANUAL_URL = Deno.env.get("MANUAL_URL") ?? "https://cdn.jsdelivr.net/gh/Paglia57/chatpsi-connect@main/public/manual-whatsapp-chatpsi.pdf";
const MANUAL_FILENAME = Deno.env.get("MANUAL_FILENAME") ?? "Manual do WhatsApp - ChatPsi.pdf";
const MANUAL_VERSION = Deno.env.get("MANUAL_VERSION") ?? "whatsapp-2026-07";
const TEMPLATE_NAME = Deno.env.get("MANUAL_TEMPLATE_NAME") ?? "manual_whatsapp";
const TEMPLATE_LANG = Deno.env.get("MANUAL_TEMPLATE_LANG") ?? "pt_BR";
const WINDOW_MS = 24 * 60 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Só dígitos; se vier número BR local (10–11 dígitos), prefixa 55. */
function normalizePhone(raw: string | null | undefined): string {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10 || d.length === 11) return "55" + d;
  return d;
}

function firstNameOf(p: { nickname?: string | null; full_name?: string | null }): string {
  const base = (p.nickname || p.full_name || "").trim();
  return base ? base.split(/\s+/)[0] : "tudo bem";
}

async function windowOpen(admin: any, phone: string): Promise<boolean> {
  const { data } = await admin
    .from("wa_messages")
    .select("created_at")
    .eq("phone", phone)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.created_at) return false;
  return Date.now() - new Date(data.created_at).getTime() < WINDOW_MS;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

interface Recipient {
  user_id: string | null;
  phone: string;
  first_name: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Autorização: só admin.
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdmin, error: roleErr } = await userClient.rpc("is_admin");
    if (roleErr || isAdmin !== true) {
      return json({ error: "Acesso negado. Apenas administradores." }, 403);
    }

    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const mode = (body?.mode as string) ?? "all_active"; // 'all_active' | 'test' | 'selected'
    const force = body?.force === true;                    // ignora idempotência
    const dryRun = body?.dry_run === true;                 // só simula (não envia)

    // ---- monta a lista de destinatários ----
    let recipients: Recipient[] = [];

    if (mode === "test") {
      const phone = normalizePhone(body?.test_phone);
      if (!phone) return json({ error: "Informe test_phone." }, 400);
      recipients = [{ user_id: null, phone, first_name: String(body?.test_name ?? "você") }];
    } else {
      let q = admin
        .from("profiles")
        .select("user_id, full_name, nickname, whatsapp, subscription_active")
        .not("whatsapp", "is", null);
      if (mode === "all_active") q = q.eq("subscription_active", true);
      if (mode === "selected") {
        const ids = Array.isArray(body?.user_ids) ? body.user_ids : [];
        if (ids.length === 0) return json({ error: "user_ids vazio." }, 400);
        q = q.in("user_id", ids);
      }
      const { data: profiles, error } = await q;
      if (error) return json({ error: error.message }, 500);
      recipients = (profiles ?? [])
        .map((p: any) => ({ user_id: p.user_id, phone: normalizePhone(p.whatsapp), first_name: firstNameOf(p) }))
        .filter((r: Recipient) => r.phone.length >= 12);
    }

    if (recipients.length === 0) return json({ ok: true, summary: { total: 0 }, message: "Nenhum destinatário elegível." });

    // Idempotência: telefones que já receberam esta versão (a menos de force/test).
    const alreadySent = new Set<string>();
    if (!force && mode !== "test") {
      const phones = recipients.map((r) => r.phone);
      const { data: sent } = await admin
        .from("manual_sends")
        .select("phone")
        .eq("manual_version", MANUAL_VERSION)
        .in("phone", phones)
        .in("status", ["sent", "delivered", "read"]);
      for (const s of sent ?? []) alreadySent.add(s.phone);
    }

    const caption = "";
    const results = await mapWithConcurrency(recipients, 5, async (r): Promise<any> => {
      if (alreadySent.has(r.phone)) return { phone: r.phone, channel: "skipped", reason: "already_sent" };

      const open = await windowOpen(admin, r.phone);
      const channel = open ? "free_document" : "template";

      if (dryRun) return { phone: r.phone, channel, dry_run: true };

      let ok = false;
      let error: string | null = null;
      try {
        if (open) {
          const cap = `Olá, ${r.first_name}! 📄 Aqui está o guia rápido do ChatPsi no WhatsApp — Antes, Durante e Depois da sua prática clínica. Qualquer dúvida, é só responder por aqui.`;
          ok = await sendDocument(r.phone, { link: MANUAL_URL, filename: MANUAL_FILENAME, caption: cap });
        } else {
          ok = await sendTemplate(r.phone, TEMPLATE_NAME, TEMPLATE_LANG, [r.first_name], {
            link: MANUAL_URL, filename: MANUAL_FILENAME,
          });
        }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }

      // Auditoria/idempotência (upsert por phone+version). Modo teste não registra
      // (é um disparo de verificação, não uma entrega real a rastrear).
      if (mode !== "test") {
        await admin.from("manual_sends").upsert({
          phone: r.phone,
          user_id: r.user_id,
          manual_version: MANUAL_VERSION,
          channel,
          status: ok ? "sent" : "failed",
          error,
          updated_at: new Date().toISOString(),
        }, { onConflict: "phone,manual_version" });
      }

      return { phone: r.phone, channel, ok, error };
    });

    const summary = {
      total: recipients.length,
      sent_free: results.filter((r) => r.ok && r.channel === "free_document").length,
      sent_template: results.filter((r) => r.ok && r.channel === "template").length,
      skipped: results.filter((r) => r.channel === "skipped").length,
      failed: results.filter((r) => r.error || (r.ok === false && !r.dry_run)).length,
      dry_run: dryRun,
    };
    // Custo estimado só do que foi por template (utility BR ≈ R$0,035/entrega).
    const est_cost_brl = Number((summary.sent_template * 0.035).toFixed(2));

    return json({ ok: true, summary, est_cost_brl, manual_version: MANUAL_VERSION, results });
  } catch (e) {
    console.error("admin-send-manual error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
