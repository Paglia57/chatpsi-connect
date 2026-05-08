import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

import { calcularAnalise } from "../_shared/calc-tributaria/index.ts";
import type { CalcInput } from "../_shared/calc-tributaria/types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRIAL_LIMIT = 2;

function isValidInput(value: unknown): value is CalcInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.faturamentoMensal === "number" &&
    typeof v.atuacao === "string" &&
    typeof v.prioridade === "string"
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    const body = await req.json();
    const input = body?.input;

    if (!isValidInput(input)) {
      return new Response(
        JSON.stringify({ error: 'Campo "input" inválido' }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Calc tributaria request from user:", user.id);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_active")
      .eq("user_id", user.id)
      .single();

    const isSubscribed = profile?.subscription_active === true;

    if (!isSubscribed) {
      const startOfMonth = new Date();
      startOfMonth.setUTCDate(1);
      startOfMonth.setUTCHours(0, 0, 0, 0);

      const { count } = await supabaseAdmin
        .from("calc_tributaria_history")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString());

      if ((count ?? 0) >= TRIAL_LIMIT) {
        return new Response(
          JSON.stringify({
            error: `Limite gratuito de ${TRIAL_LIMIT} análises por mês atingido. Assine para análises ilimitadas.`,
            code: "TRIAL_LIMIT_REACHED",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Cálculo determinístico local — substitui a chamada à IA, que retornava
    // valores numéricos inconsistentes (carga tributária 100x maior, pró-labore
    // copiando exemplos do prompt em vez de aplicar 28% × faturamento).
    const output = calcularAnalise(input);

    const { error: insertError } = await supabaseAdmin
      .from("calc_tributaria_history")
      .insert({ user_id: user.id, input, output });

    if (insertError) {
      console.error("Erro ao persistir histórico:", insertError);
    }

    return new Response(JSON.stringify({ success: true, output }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error in calc_tributaria_dispatch:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Erro ao processar análise",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
