// Disparo de uma Comunicação salva para um público (ativos/inativos/todos), pelo super admin.
// Menor custo (playbook whatsapp-api), decidido POR destinatário:
//   janela 24h ABERTA  -> mensagem livre (texto/documento/imagem/vídeo) = GRÁTIS
//   janela FECHADA      -> template aprovado (se a comunicação tiver um) = pago
//                          (utility ~R$0,035; marketing ~R$0,32); sem template -> pula.
// Idempotência por (communication_id, phone) quando a comunicação é dedupe. Apenas admin.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { sendDocument, sendImage, sendTemplate, sendText, sendVideo } from "../_shared/wa/messaging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const WINDOW_MS = 24 * 60 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
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
  const { data } = await admin.from("wa_messages").select("created_at")
    .eq("phone", phone).eq("role", "user").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data?.created_at) return false;
  return Date.now() - new Date(data.created_at).getTime() < WINDOW_MS;
}
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker() { while (i < items.length) { const idx = i++; results[idx] = await fn(items[idx]); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

interface Recipient { user_id: string | null; phone: string; first_name: string; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdmin, error: roleErr } = await userClient.rpc("is_admin");
    if (roleErr || isAdmin !== true) return json({ error: "Acesso negado. Apenas administradores." }, 403);

    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const communicationId = body?.communication_id as string;
    const audience = (body?.audience as string) ?? "active"; // 'active'|'inactive'|'all'
    const mode = (body?.mode as string) ?? "send";            // 'send'|'test'|'dry_run'
    const force = body?.force === true;
    if (!communicationId) return json({ error: "communication_id ausente." }, 400);

    const { data: comm, error: cErr } = await admin.from("communications").select("*").eq("id", communicationId).maybeSingle();
    if (cErr || !comm) return json({ error: "Comunicação não encontrada." }, 404);

    const kind = comm.kind as "text" | "document" | "image" | "video";
    const personalize = (t: string, name: string) => (t ?? "").replace(/\{\{\s*nome\s*\}\}/gi, name);

    // ---- destinatários ----
    let recipients: Recipient[] = [];
    if (mode === "test") {
      const phone = normalizePhone(body?.test_phone);
      if (!phone) return json({ error: "Informe test_phone." }, 400);
      recipients = [{ user_id: null, phone, first_name: String(body?.test_name ?? "você") }];
    } else {
      let q = admin.from("profiles").select("user_id, full_name, nickname, whatsapp, subscription_active").not("whatsapp", "is", null);
      if (audience === "active") q = q.eq("subscription_active", true);
      if (audience === "inactive") q = q.eq("subscription_active", false);
      const { data: profiles, error } = await q;
      if (error) return json({ error: error.message }, 500);
      recipients = (profiles ?? [])
        .map((p: any) => ({ user_id: p.user_id, phone: normalizePhone(p.whatsapp), first_name: firstNameOf(p) }))
        .filter((r: Recipient) => r.phone.length >= 12);
    }
    if (recipients.length === 0) return json({ ok: true, summary: { total: 0 }, message: "Nenhum destinatário elegível." });

    // idempotência (dedupe) — telefones que já receberam esta comunicação
    const alreadySent = new Set<string>();
    if (comm.dedupe && !force && mode !== "test") {
      const phones = recipients.map((r) => r.phone);
      const { data: sent } = await admin.from("communication_sends").select("phone")
        .eq("communication_id", communicationId).in("phone", phones).in("status", ["sent", "delivered", "read"]);
      for (const s of sent ?? []) alreadySent.add(s.phone);
    }

    const dryRun = mode === "dry_run";
    const results = await mapWithConcurrency(recipients, 5, async (r): Promise<any> => {
      if (alreadySent.has(r.phone)) return { phone: r.phone, channel: "skipped", reason: "already_sent" };
      const open = await windowOpen(admin, r.phone);

      // decide canal
      let channel: string;
      if (open) channel = kind === "text" ? "free_text" : "free_media";
      else if (comm.template_name) channel = "template";
      else return { phone: r.phone, channel: "skipped", reason: "out_of_window_no_template" };

      if (dryRun) return { phone: r.phone, channel, dry_run: true };

      let ok = false; let error: string | null = null;
      try {
        if (open) {
          const caption = personalize(comm.body_text ?? "", r.first_name);
          if (kind === "text") { await sendText(r.phone, caption); ok = true; }
          else if (kind === "document") ok = await sendDocument(r.phone, { link: comm.media_url, filename: comm.media_filename ?? "arquivo.pdf", caption });
          else if (kind === "image") ok = await sendImage(r.phone, { link: comm.media_url, caption });
          else ok = await sendVideo(r.phone, { link: comm.media_url, caption });
        } else {
          const header = kind === "text" || !comm.media_url ? undefined
            : { kind, link: comm.media_url, filename: comm.media_filename ?? undefined };
          ok = await sendTemplate(r.phone, comm.template_name, comm.template_lang ?? "pt_BR", [r.first_name], header as any);
        }
      } catch (e) { error = e instanceof Error ? e.message : String(e); }

      if (mode !== "test") {
        await admin.from("communication_sends").upsert({
          communication_id: communicationId, phone: r.phone, user_id: r.user_id,
          channel, status: ok ? "sent" : "failed", error, updated_at: new Date().toISOString(),
        }, { onConflict: "communication_id,phone" });
      }
      return { phone: r.phone, channel, ok, error };
    });

    const templatesSent = results.filter((r) => r.ok && r.channel === "template").length;
    const unit = comm.category === "marketing" ? 0.32 : 0.035;
    const summary = {
      total: recipients.length,
      sent_free: results.filter((r) => r.ok && (r.channel === "free_text" || r.channel === "free_media")).length,
      sent_template: templatesSent,
      skipped_no_template: results.filter((r) => r.reason === "out_of_window_no_template").length,
      skipped_dedupe: results.filter((r) => r.reason === "already_sent").length,
      failed: results.filter((r) => r.error || (r.ok === false && !r.dry_run)).length,
      dry_run: dryRun,
    };
    const est_cost_brl = Number((templatesSent * unit).toFixed(2));
    // custo estimado no dry_run (quantos iriam por template)
    const would_template = results.filter((r) => r.channel === "template").length;
    const est_cost_brl_dry = Number((would_template * unit).toFixed(2));

    return json({ ok: true, summary, est_cost_brl: dryRun ? est_cost_brl_dry : est_cost_brl, category: comm.category, results });
  } catch (e) {
    console.error("admin-send-communication error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
