// Upload de mídia das Comunicações (admin). Recebe o arquivo em base64, grava no bucket
// público 'public-assets' sob o prefixo 'comunicacoes/' (via service role, sem RLS) e
// devolve a URL pública. Apenas admin (is_admin).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const BUCKET = "public-assets";
const PREFIX = "comunicacoes";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function slug(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 60) || "arquivo";
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
  return `${base}.${ext}`;
}
function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
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
    const filename = String(body?.filename ?? "arquivo.bin");
    const contentType = String(body?.content_type ?? "application/octet-stream");
    if (!body?.data_base64) return json({ error: "data_base64 ausente." }, 400);
    const bytes = b64ToBytes(String(body.data_base64));
    if (bytes.length > 80 * 1024 * 1024) return json({ error: "Arquivo acima de 80MB." }, 400);

    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const path = `${PREFIX}/${Date.now()}-${slug(filename)}`;
    const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
    if (error) return json({ error: "Falha no upload: " + error.message }, 500);

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    return json({ ok: true, url: publicUrl, path, filename });
  } catch (e) {
    console.error("admin-upload-media error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
