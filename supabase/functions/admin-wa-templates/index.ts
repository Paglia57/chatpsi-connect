// Gestão de templates da Meta pelo super admin: listar templates da WABA,
// consultar o status de um template e CRIAR um template a partir de uma
// Comunicação salva (header de mídia + corpo com {{1}} = primeiro nome).
// O WHATSAPP_TOKEN só existe no runtime das functions, então a criação de
// template acontece aqui dentro (não dá pra fazer "de fora"). Apenas admin.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { createTemplate, fetchTemplateInfo, listTemplates } from "../_shared/wa/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/** Slug válido de template Meta a partir de um nome livre. */
function slugify(name: string): string {
  const ascii = name.normalize("NFD").replace(/[^ -~]/g, "");
  return ascii.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100) || "comunicacao";
}

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

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action === "list") {
      return json({ ok: true, templates: await listTemplates() });
    }

    if (action === "status") {
      const name = String(body?.name ?? "").trim();
      const lang = String(body?.lang ?? "pt_BR").trim() || "pt_BR";
      if (!name) return json({ error: "Informe name." }, 400);
      const info = await fetchTemplateInfo(name, lang);
      return json({ ok: true, name, lang, ...info });
    }

    if (action === "create_from_communication") {
      const communicationId = body?.communication_id as string;
      if (!communicationId) return json({ error: "communication_id ausente." }, 400);
      const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: comm, error: cErr } = await admin.from("communications").select("*").eq("id", communicationId).maybeSingle();
      if (cErr || !comm) return json({ error: "Comunicação não encontrada." }, 404);

      const name = (comm.template_name?.trim() || slugify(comm.name)).toLowerCase();
      if (!/^[a-z0-9_]{1,512}$/.test(name)) {
        return json({ error: `Nome de template inválido: "${name}". Use só letras minúsculas, números e _.` }, 400);
      }
      const lang = comm.template_lang?.trim() || "pt_BR";

      const raw = String(comm.body_text ?? "").trim();
      if (!raw) return json({ error: "A comunicação precisa de um texto (corpo do template)." }, 400);
      const hasNameVar = /\{\{\s*nome\s*\}\}/i.test(raw);
      const bodyText = raw.replace(/\{\{\s*nome\s*\}\}/gi, "{{1}}");
      if (bodyText.length > 1024) return json({ error: `Corpo com ${bodyText.length} caracteres; o máximo do template é 1024.` }, 400);
      if (/^\{\{1\}\}|\{\{1\}\}$/.test(bodyText)) {
        return json({ error: "A Meta não aceita template começando ou terminando com a variável {{nome}}. Ajuste o texto." }, 400);
      }

      // já existe nesse idioma? não recria (Meta rejeita duplicado)
      const existing = await fetchTemplateInfo(name, lang);
      if (existing.found) {
        return json({ ok: true, already_exists: true, name, lang, status: existing.status, rejected_reason: existing.rejectedReason });
      }

      const kind = comm.kind as "text" | "document" | "image" | "video";
      const header = kind !== "text" && comm.media_url
        ? { kind, mediaUrl: comm.media_url as string, filename: (comm.media_filename as string) ?? "arquivo" }
        : undefined;

      const created = await createTemplate({
        name, lang, category: comm.category === "marketing" ? "MARKETING" : "UTILITY",
        bodyText, hasNameVar, header,
      });

      // garante que a comunicação aponta pro template criado
      if (comm.template_name !== name || comm.template_lang !== lang) {
        await admin.from("communications").update({ template_name: name, template_lang: lang, updated_at: new Date().toISOString() }).eq("id", communicationId);
      }
      return json({ ok: true, created: true, name, lang, meta: created });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (e) {
    console.error("admin-wa-templates error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
