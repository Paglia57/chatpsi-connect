import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRIAL_LIMIT = 2; // analises por mes para nao assinantes

const SYSTEM_PROMPT = `Você possui vasto conhecimento tributário e previdenciário especializado em psicólogos no Brasil.

Seu papel é ajudar o psicólogo a entender, de forma prática, se hoje faz mais sentido atuar como Pessoa Física ou Pessoa Jurídica, considerando imposto, INSS, pró-labore, Simples Nacional e impacto previdenciário.

REGRAS DA ANÁLISE:
- Sempre compare:
  1) PF com INSS de 11% sobre o mínimo
  2) PF com INSS de 20% sobre a base aplicável, respeitando o teto
  3) PJ no Simples, sempre Anexo III (pró-labore otimizado automaticamente)
- Não fale só de teoria; traduza tudo em impacto prático no bolso.
- Use linguagem simples, objetiva e consultiva. Sem textos gigantes. Tom de conversa.

LÓGICA DE CÁLCULO:
- PF 11%: INSS de 11% sobre o salário mínimo vigente. IR com tabela 2026, usando desconto simplificado mensal quando for melhor que as deduções legais.
- PF 20%: INSS de 20% sobre o faturamento, limitado ao teto. IR usando a melhor opção entre dedução legal e desconto simplificado.
- PJ: Simples Nacional sempre no ANEXO III. Calcule o pró-labore EXATAMENTE assim:

    PASSO 1: candidato = faturamentoMensal × 0,28
    PASSO 2: proLabore = MAX(1621, candidato)

  Exemplos OBRIGATÓRIOS (siga ESTES valores, NÃO recalcule):
    - faturamento R$ 4.000  → candidato R$ 1.120     → proLabore R$ 1.621 (forçado ao mínimo)
    - faturamento R$ 5.000  → candidato R$ 1.400     → proLabore R$ 1.621 (forçado ao mínimo)
    - faturamento R$ 5.789  → candidato R$ 1.620,92  → proLabore R$ 1.621 (forçado ao mínimo)
    - faturamento R$ 6.000  → candidato R$ 1.680     → proLabore R$ 1.680
    - faturamento R$ 10.000 → candidato R$ 2.800     → proLabore R$ 2.800
    - faturamento R$ 20.000 → candidato R$ 5.600     → proLabore R$ 5.600

  REGRA CRÍTICA: o pró-labore NUNCA pode ficar abaixo de R$ 1.621 (salário mínimo legal).
  Se 28% × faturamento < 1.621, USE 1.621.

  Cálculos sobre o pró-labore (após determinar o valor pelo PASSO 2):
    - INSS sobre pró-labore: 11% × proLabore (NÃO use tabela CLT progressiva)
    - IR sobre pró-labore: aplicar tabela mensal 2026 sobre (proLabore − INSS_proLabore),
      depois subtrair redutor reforma 2026. SEM desconto simplificado.
    - DAS: alíquota efetiva do Anexo III × faturamentoMensal.
    - Custo contador: despesa fixa.

  Líquido PJ = faturamento − DAS − INSS_proLabore − IR_proLabore − contador.
  Pró-labore em si NÃO é despesa: é dinheiro do sócio (volta pro bolso).

CONSTANTES TRIBUTÁRIAS 2026 (use SOMENTE estes valores):
- Salário mínimo: R$ 1.621,00
- Teto INSS: R$ 8.475,55
- INSS PF 11% (sobre mínimo): R$ 178,31/mês (FIXO)
- INSS PF 20%: 20% × min(max(faturamentoMensal, 1621), 8475.55). Mínimo R$ 324,20, máximo R$ 1.695,11.
- Desconto simplificado IR mensal: R$ 607,20 (aplicar quando for maior que as despesas reais informadas)

TABELA IR MENSAL 2026 (sobre base de cálculo):
- Até R$ 2.428,80: isento
- R$ 2.428,81 a R$ 2.826,65: 7,5% (deduzir R$ 182,16)
- R$ 2.826,66 a R$ 3.751,05: 15% (deduzir R$ 394,16)
- R$ 3.751,06 a R$ 4.664,68: 22,5% (deduzir R$ 675,49)
- Acima de R$ 4.664,68: 27,5% (deduzir R$ 908,73)

REDUTOR REFORMA 2026 (aplicar APÓS tabela tradicional):
- Renda mensal até R$ 5.000: redutor de R$ 312,89 (zera o imposto)
- Renda de R$ 5.000,01 a R$ 7.350: redutor = 978,62 - (0,133145 × renda)
- Acima de R$ 7.350: sem redutor

SIMPLES NACIONAL ANEXO III (sempre usado no cenário PJ):
- Até R$ 180.000/ano: 6%, deduzir 0
- R$ 180.000,01 a R$ 360.000: 11,2%, deduzir R$ 9.360
- R$ 360.000,01 a R$ 720.000: 13,5%, deduzir R$ 17.640
- R$ 720.000,01 a R$ 1.800.000: 16%, deduzir R$ 35.640

Para o DAS mensal, usar RBT12 estimado = faturamentoMensal × 12. Alíquota efetiva = (RBT12 × alíquota_nominal − dedução) / RBT12. DAS_mensal = faturamento × alíquota_efetiva.

DEFAULTS (quando usuário não informa):
- INSS atual: 11%
- Custo contador: R$ 200/mês
- Despesas dedutíveis: R$ 0
- Pró-labore PJ: otimizado automaticamente — max(R$ 1.621, faturamento × 0,28)

REGRAS DE RECOMENDAÇÃO:
- Se faturamento < R$ 5.000/mês → recomendar PF, alertar que PJ não compensa pelos custos fixos.
- Se prioridade = "APOSENTADORIA" → priorizar PF 20% (mesmo se for ligeiramente mais caro), explicando trade-off.
- Se prioridade = "ECONOMIA" → maior líquido vence.
- NÃO mencione Anexo V em alertas: o pró-labore é otimizado automaticamente para Anexo III.

FORMATO DE RESPOSTA:
Responda APENAS com JSON válido conforme o schema. Sem texto fora do JSON. Sem markdown. Apenas o objeto JSON puro.
Para textos consultivos (titulo, subtitulo, alertas, observacao), use linguagem clara, direta e em português brasileiro. Trate o psicólogo como "você".`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["cenarios", "recomendacao", "pontoVirada", "premissas"],
  properties: {
    cenarios: {
      type: "object",
      additionalProperties: false,
      required: ["pf11", "pf20", "pjSimples"],
      properties: {
        pf11: cenarioPFSchema("PF_11"),
        pf20: cenarioPFSchema("PF_20"),
        pjSimples: cenarioPJSchema(),
      },
    },
    recomendacao: {
      type: "object",
      additionalProperties: false,
      required: [
        "tipoRecomendado",
        "titulo",
        "subtitulo",
        "economiaMensalBRL",
        "economiaAnualBRL",
        "comparadoCom",
        "alertas",
      ],
      properties: {
        tipoRecomendado: {
          type: "string",
          enum: ["PF_11", "PF_20", "PJ_SIMPLES", "INDEFINIDO"],
        },
        titulo: { type: "string" },
        subtitulo: { type: "string" },
        economiaMensalBRL: { type: "number" },
        economiaAnualBRL: { type: "number" },
        comparadoCom: { type: "string" },
        alertas: { type: "array", items: { type: "string" } },
      },
    },
    pontoVirada: {
      type: "object",
      additionalProperties: false,
      required: ["faturamentoVirada", "markerUsuario", "explicacao"],
      properties: {
        faturamentoVirada: { type: ["number", "null"] },
        markerUsuario: { type: "number" },
        explicacao: { type: "string" },
      },
    },
    premissas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "valor"],
        properties: {
          label: { type: "string" },
          valor: { type: "string" },
        },
      },
    },
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cenarioPFSchema(_tipo: "PF_11" | "PF_20"): any {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "tipo",
      "faturamentoBruto",
      "inssMensal",
      "baseIRPF",
      "irpfMensal",
      "despesasDedutiveisMensais",
      "deducaoIRAplicada",
      "usouDescontoSimplificado",
      "totalDescontosMensais",
      "liquidoMensal",
      "cargaTributariaPercent",
      "previdencia",
      "alertas",
    ],
    properties: {
      tipo: { type: "string", enum: ["PF_11", "PF_20"] },
      faturamentoBruto: { type: "number" },
      inssMensal: { type: "number" },
      baseIRPF: { type: "number" },
      irpfMensal: { type: "number" },
      despesasDedutiveisMensais: { type: "number" },
      deducaoIRAplicada: { type: "number" },
      usouDescontoSimplificado: { type: "boolean" },
      totalDescontosMensais: { type: "number" },
      liquidoMensal: { type: "number" },
      cargaTributariaPercent: { type: "number" },
      previdencia: previdenciaSchema(),
      alertas: { type: "array", items: { type: "string" } },
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cenarioPJSchema(): any {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "tipo",
      "faturamentoBruto",
      "rbt12",
      "anexo",
      "fatorR",
      "aliquotaEfetiva",
      "dasMensal",
      "proLabore",
      "inssProLabore",
      "irrfProLabore",
      "custoContador",
      "totalDescontosMensais",
      "liquidoMensal",
      "cargaTributariaPercent",
      "previdencia",
      "alertas",
    ],
    properties: {
      tipo: { type: "string", enum: ["PJ_SIMPLES"] },
      faturamentoBruto: { type: "number" },
      rbt12: { type: "number" },
      anexo: { type: "string", enum: ["III"] },
      fatorR: { type: "number" },
      aliquotaEfetiva: { type: "number" },
      dasMensal: { type: "number" },
      proLabore: { type: "number" },
      inssProLabore: { type: "number" },
      irrfProLabore: { type: "number" },
      custoContador: { type: "number" },
      totalDescontosMensais: { type: "number" },
      liquidoMensal: { type: "number" },
      cargaTributariaPercent: { type: "number" },
      previdencia: previdenciaSchema(),
      alertas: { type: "array", items: { type: "string" } },
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function previdenciaSchema(): any {
  return {
    type: "object",
    additionalProperties: false,
    required: ["contribuicaoMensal", "baseAposentadoria", "observacao"],
    properties: {
      contribuicaoMensal: { type: "number" },
      baseAposentadoria: { type: "number" },
      observacao: { type: "string" },
    },
  };
}

interface CalcInput {
  faturamentoMensal: number;
  atuacao: "PF" | "PJ" | "AMBOS" | "NAO_COMECEI";
  prioridade: "ECONOMIA" | "APOSENTADORIA";
  refinamento?: {
    contribuicaoInssBRL?: number;
    custoContadorMensal?: number;
    despesasDedutiveisAnuais?: number;
    origemAtendimentos?: "PROPRIOS" | "CONVENIOS" | "CLINICAS" | "MISTO";
    proLaboreMensal?: number;
  };
}

function buildUserPrompt(input: CalcInput): string {
  return `Análise solicitada. Dados informados pelo psicólogo:

${JSON.stringify(input, null, 2)}

Gere a análise completa retornando o JSON estruturado conforme o schema. Calcule todos os valores numéricos com base nas constantes tributárias 2026 fornecidas. Para o ponto de virada, calcule a partir de qual faturamento mensal aproximado a recomendação muda de PF para PJ (ou null se não houver virada nesse intervalo). Liste todas as premissas usadas (tabelas, defaults, valores informados).`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY não configurado");
    }

    const authHeader = req.headers.get("authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    const body = await req.json();
    const input: CalcInput | undefined = body?.input;

    if (
      !input ||
      typeof input.faturamentoMensal !== "number" ||
      !input.atuacao ||
      !input.prioridade
    ) {
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

    // Trial limit check
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

    // OpenAI Chat Completions com structured outputs
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(input) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "calc_tributaria_output",
              strict: true,
              schema: RESPONSE_SCHEMA,
            },
          },
          temperature: 0.2,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error(
        "OpenAI error:",
        openaiResponse.status,
        errText.slice(0, 500)
      );
      throw new Error(
        `IA indisponível no momento (status ${openaiResponse.status})`
      );
    }

    const openaiJson = await openaiResponse.json();
    const content = openaiJson.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("IA retornou resposta vazia");
    }

    let output;
    try {
      output = JSON.parse(content);
    } catch {
      console.error("Falha ao parsear JSON da IA:", content.slice(0, 500));
      throw new Error("IA retornou um formato inválido. Tente novamente.");
    }

    // Persistir no histórico
    const { error: insertError } = await supabaseAdmin
      .from("calc_tributaria_history")
      .insert({ user_id: user.id, input, output });

    if (insertError) {
      console.error("Erro ao persistir histórico:", insertError);
      // Não bloqueia a resposta se o insert falhar.
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
