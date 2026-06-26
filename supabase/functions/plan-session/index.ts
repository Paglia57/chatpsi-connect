// Geração do plano de sessão para o web app. Autentica o usuário, transcreve áudio de
// direcionamento (se houver) e retorna os campos do plano. NÃO grava (o front salva via RLS).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { generateSessionPlan } from "../_shared/planning/generate.ts";
import { audioToText } from "../_shared/media/toText.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function mimeFromName(name: string): string {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  const map: Record<string, string> = {
    mp3: "audio/mpeg", m4a: "audio/mp4", ogg: "audio/ogg", wav: "audio/wav", webm: "audio/webm",
  };
  return map[ext] ?? "audio/webm";
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
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { patient_id, direction, audio_base64, audio_filename } = await req.json();
    if (!patient_id) {
      return new Response(JSON.stringify({ error: "patient_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let finalDirection: string | undefined = (direction ?? "").trim() || undefined;
    if (audio_base64) {
      try {
        const transcript = await audioToText(b64ToBytes(String(audio_base64)), mimeFromName(String(audio_filename ?? "audio.webm")));
        finalDirection = [finalDirection, transcript].filter(Boolean).join("\n").trim() || undefined;
      } catch (e) {
        console.error("Transcrição do direcionamento falhou:", e instanceof Error ? e.message : e);
      }
    }

    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const fields = await generateSessionPlan(admin, user.id, patient_id, finalDirection);

    return new Response(JSON.stringify({ ...fields, direction: finalDirection ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("plan-session error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
