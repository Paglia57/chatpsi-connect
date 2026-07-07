// Planejamento de sessão no WhatsApp. Paciente travado → gera o plano (a partir do
// histórico + direção opcional), mostra PRÉVIA + [Salvar · Ajustar · Cancelar] (regra de
// ouro), e salva em session_plans. Reaproveita generateSessionPlan.

import { sendButtons, sendList, sendText } from "./messaging.ts";
import { getPatientById, type Patient, patchSession } from "./repo.ts";
import { numberedList, type PickItem, resolvePick } from "./pickList.ts";
import { generateSessionPlan } from "../planning/generate.ts";

export const PL_SAVE = "pl_save";
export const PL_ADJUST = "pl_adjust";
export const PL_CANCEL = "pl_cancel";
export const PL_NEXT_AGENDA = "pl_next_agenda";   // "Agendar esta sessão" / "Ver agenda do paciente"
export const PL_NEXT_PATIENT = "pl_next_patient";  // "Voltar ao paciente"
// Etapa de contexto antes de gerar.
export const PL_ADD_CONTEXT = "pl_addctx";
export const PL_GEN_NOW = "pl_gennow";
export const PL_GENERATE = "pl_generate";
// Recuperar planos salvos.
export const PL_GET_PREFIX = "pl_get:";
export const PL_VIEW = "pl_view";
export const PL_EDIT_PLAN = "pl_editplan";
export const PL_USE_EVO = "pl_useevo";

export type PlanningReplyResult = {
  handled: boolean;
  action?: "agendar" | "patient_agenda" | "patient_menu" | "use_plan_in_evo";
  patient?: Patient | null;
  planId?: string;
};

type PlInput = { kind: string; text: string; replyId?: string };
type Session = { mode?: string | null; flow_step?: string | null; flow_data?: Record<string, unknown> | null } | null;

export interface PlanningCtx {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  phone: string;
  userId: string;
  displayName: string;
  session: Session;
  input: PlInput;
}

interface PendingPlan {
  patient_id: string;
  patient_name: string;
  objetivo: string;
  roteiro: string;
  tecnicas: string;
  atencao: string;
  perguntas: string;
  direction: string | null;
  input_type: "texto" | "audio" | null;
  editing_plan_id?: string | null;
}

/** Prompt de input + saída (Cancelar). */
async function plAsk(ctx: PlanningCtx, body: string): Promise<void> {
  await sendButtons(ctx.phone, body, [{ id: PL_CANCEL, title: "Cancelar" }]);
}
/** Informativo/erro + saída (Menu). */
async function plInfo(ctx: PlanningCtx, body: string): Promise<void> {
  await sendButtons(ctx.phone, body, [{ id: "ctx_exit", title: "Menu" }]);
}
/** Prompt do rascunho de direcionamento (acumular) + botões gerar/cancelar. */
async function plCapturePrompt(ctx: PlanningCtx, body: string): Promise<void> {
  await sendButtons(ctx.phone, body, [
    { id: PL_GENERATE, title: "Gerar planejamento" },
    { id: PL_CANCEL, title: "Cancelar" },
  ]);
}
/** "YYYY-MM-DD..." → "dd/mm". */
function fmtDate(iso: string | null | undefined): string {
  const d = (iso ?? "").slice(0, 10).split("-");
  return d.length === 3 ? `${d[2]}/${d[1]}` : (iso ?? "").slice(0, 10);
}

function previewText(p: PendingPlan): string {
  return [
    `*Plano da próxima sessão — ${p.patient_name}*`,
    "",
    `*Objetivo:* ${p.objetivo || "—"}`,
    "",
    `*Roteiro:* ${p.roteiro || "—"}`,
    "",
    `*Técnicas/materiais:* ${p.tecnicas || "—"}`,
    "",
    `*Atenção:* ${p.atencao || "—"}`,
    "",
    `*Perguntas:* ${p.perguntas || "—"}`,
  ].join("\n");
}

async function runAndPreview(
  ctx: PlanningCtx, patientId: string, patientName: string, direction: string | null,
  inputType: "texto" | "audio" | null, editingPlanId?: string | null,
) {
  await sendText(ctx.phone, "Gerando o plano da próxima sessão… um instante. 📝");
  // Ao editar um plano existente, dá o plano atual como contexto da regeneração.
  let genDirection = direction;
  if (editingPlanId) {
    const { data: cur } = await ctx.supabase
      .from("session_plans").select("objetivo, roteiro, tecnicas, atencao, perguntas")
      .eq("id", editingPlanId).eq("user_id", ctx.userId).maybeSingle();
    if (cur) {
      genDirection = `PLANO ATUAL (revise a partir dele):\nObjetivo: ${cur.objetivo ?? ""}\n` +
        `Roteiro: ${cur.roteiro ?? ""}\nTécnicas: ${cur.tecnicas ?? ""}\nAtenção: ${cur.atencao ?? ""}\n` +
        `Perguntas: ${cur.perguntas ?? ""}\n\nAJUSTE PEDIDO: ${direction ?? "(refinar)"}`;
    }
  }
  let fields;
  try {
    fields = await generateSessionPlan(ctx.supabase, ctx.userId, patientId, genDirection ?? undefined);
  } catch (e) {
    console.error("Erro ao gerar plano (WA):", e instanceof Error ? e.message : e);
    await plInfo(ctx, "Não consegui gerar o plano agora. Tente novamente em instantes.");
    return;
  }
  const pending: PendingPlan = {
    patient_id: patientId, patient_name: patientName,
    objetivo: fields.objetivo, roteiro: fields.roteiro, tecnicas: fields.tecnicas,
    atencao: fields.atencao, perguntas: fields.perguntas,
    direction: direction ?? null, input_type: inputType,
    editing_plan_id: editingPlanId ?? null,
  };
  await patchSession(ctx.supabase, ctx.phone, { mode: "planning", flow_step: "preview", flow_data: pending as unknown as Record<string, unknown> });
  await sendText(ctx.phone, previewText(pending));
  await sendText(ctx.phone, "_Sugestão de rascunho — você revisa e edita. A responsabilidade clínica é sua._");
  await sendButtons(ctx.phone, "Salvar este plano?", [
    { id: PL_SAVE, title: "Salvar" },
    { id: PL_ADJUST, title: "Ajustar" },
    { id: PL_CANCEL, title: "Cancelar" },
  ]);
}

/** Etapa de escolha antes de gerar: dar mais contexto ou gerar agora. */
export async function offerPlanningChoice(ctx: PlanningCtx, patient: Patient): Promise<void> {
  await patchSession(ctx.supabase, ctx.phone, {
    mode: "planning", flow_step: "choose",
    flow_data: { patient_id: patient.id, patient_name: patient.full_name },
  });
  await sendButtons(ctx.phone, `Vamos planejar a sessão de *${patient.full_name}*. Como prefere?`, [
    { id: PL_ADD_CONTEXT, title: "Quero dar contexto" },
    { id: PL_GEN_NOW, title: "Gerar agora" },
    { id: "ctx_exit", title: "Menu" },
  ]);
}

/** Inicia o planejamento direto (texto/áudio de direcionamento opcional) — gera já. */
export async function startPlanning(ctx: PlanningCtx, patient: Patient, rawText?: string): Promise<void> {
  const inputType: "texto" | "audio" | null = ctx.input.kind === "audio" ? "audio" : (rawText ? "texto" : null);
  // Remove o verbo de comando para deixar só o direcionamento.
  const direction = (rawText ?? "")
    .replace(/^\s*(planeja(r)?)\b/i, "")
    .replace(/\ba pr[oó]xima sess[aã]o\b/i, "")
    .replace(/\bsess[aã]o\b/i, "")
    .trim() || null;
  await runAndPreview(ctx, patient.id, patient.full_name, direction, inputType);
}

/** Lista os planejamentos salvos do paciente (recuperar). */
export async function showPlansList(ctx: PlanningCtx, patient: Patient): Promise<void> {
  const { data: plans } = await ctx.supabase
    .from("session_plans").select("id, objetivo, status, criado_em")
    .eq("user_id", ctx.userId).eq("patient_id", patient.id)
    .in("status", ["salvo", "usado"])
    .order("criado_em", { ascending: false }).limit(50);

  if (!plans || plans.length === 0) {
    await sendButtons(ctx.phone, `Ainda não há planejamentos salvos para *${patient.full_name}*.`, [
      { id: "pt_planejar", title: "Planejar sessão" },
      { id: "ctx_exit", title: "Menu" },
    ]);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowTitle = (p: any) => `${fmtDate(p.criado_em)}${p.status === "usado" ? " · usado" : ""}`;
  if (plans.length <= 10) {
    await sendList(
      ctx.phone, `Planejamentos de *${patient.full_name}*:`, "Ver planejamentos",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      plans.map((p: any) => ({ id: `${PL_GET_PREFIX}${p.id}`, title: rowTitle(p), description: (p.objetivo ?? "").slice(0, 72) })),
      "Planejamentos",
    );
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: PickItem[] = plans.map((p: any) => ({ id: p.id, name: fmtDate(p.criado_em), sub: (p.objetivo ?? "").slice(0, 40) }));
  await patchSession(ctx.supabase, ctx.phone, {
    mode: "planning", flow_step: "plan_pick",
    flow_data: { pick_items: items, patient_id: patient.id, patient_name: patient.full_name },
  });
  await sendText(ctx.phone, numberedList(items, "planejamentos"));
}

function planFullText(p: any): string {
  return [
    `*Planejamento — ${fmtDate(p.criado_em)}*`,
    "",
    `*Objetivo:* ${p.objetivo || "—"}`,
    "",
    `*Roteiro:* ${p.roteiro || "—"}`,
    "",
    `*Técnicas/materiais:* ${p.tecnicas || "—"}`,
    "",
    `*Atenção:* ${p.atencao || "—"}`,
    "",
    `*Perguntas:* ${p.perguntas || "—"}`,
    ...(p.livre ? ["", `*Espaço livre:* ${p.livre}`] : []),
  ].join("\n");
}

/** Gera a prévia a partir do direcionamento acumulado no rascunho (pl_capture). */
async function generateFromCapture(ctx: PlanningCtx, data: Record<string, any>): Promise<void> {
  const parts = Array.isArray(data.dir_parts) ? (data.dir_parts as string[]) : [];
  const direction = parts.join("\n").trim() || null;
  if (!direction) {
    await plCapturePrompt(ctx, "Ainda não recebi o direcionamento. Pode ditar (enviar Áudio) ou escrever o foco do planejamento.");
    return;
  }
  const inputType: "texto" | "audio" | null = data.input_type === "audio" ? "audio" : "texto";
  await runAndPreview(ctx, data.patient_id, data.patient_name ?? "", direction, inputType, data.editing_plan_id ?? null);
}

/** Abre as opções de um planejamento salvo (Ver/Editar/Usar). */
async function openPlanOptions(ctx: PlanningCtx, planId: string): Promise<void> {
  const { data: plan } = await ctx.supabase
    .from("session_plans").select("id, criado_em, patient_id")
    .eq("id", planId).eq("user_id", ctx.userId).maybeSingle();
  if (!plan) { await plInfo(ctx, "Não encontrei esse planejamento."); return; }
  const patient = await getPatientById(ctx.supabase, ctx.userId, plan.patient_id);
  await patchSession(ctx.supabase, ctx.phone, {
    mode: "planning", flow_step: "plan_opts",
    flow_data: { sel_plan_id: planId, patient_id: plan.patient_id, patient_name: patient?.full_name ?? "" },
  });
  await sendList(ctx.phone, `Planejamento de ${fmtDate(plan.criado_em)}. O que deseja?`, "Opções", [
    { id: PL_VIEW, title: "Ver completo" },
    { id: PL_EDIT_PLAN, title: "Editar" },
    { id: PL_USE_EVO, title: "Usar na evolução" },
    { id: "ctx_exit", title: "Menu" },
  ], "Planejamento");
}

/** Continua um planejamento em andamento (mode==='planning'). Retorna true se tratou. */
export async function continuePlanning(ctx: PlanningCtx): Promise<boolean> {
  const step = ctx.session?.flow_step ?? null;
  const data = (ctx.session?.flow_data ?? {}) as Record<string, any>;
  if (step === "adjust" && data.patient_id) {
    const inputType: "texto" | "audio" | null = ctx.input.kind === "audio" ? "audio" : "texto";
    await runAndPreview(ctx, data.patient_id, data.patient_name ?? "", (ctx.input.text ?? "").trim() || null, inputType, data.editing_plan_id ?? null);
    return true;
  }
  // Rascunho de direcionamento: acumula sem gerar; "pronto" dispara a geração.
  if (step === "pl_capture" && data.patient_id) {
    if ((ctx.input.text ?? "").trim().toLowerCase() === "pronto") {
      await generateFromCapture(ctx, data);
      return true;
    }
    const parts = Array.isArray(data.dir_parts) ? (data.dir_parts as string[]).slice() : [];
    const text = (ctx.input.text ?? "").trim();
    if (text) parts.push(text);
    const newData: Record<string, any> = { ...data, dir_parts: parts };
    if (ctx.input.kind === "audio") newData.input_type = "audio";
    await patchSession(ctx.supabase, ctx.phone, { flow_data: newData });
    return true; // acúmulo silencioso
  }
  // Escolha de um planejamento da lista grande (por número ou data).
  if (step === "plan_pick" && Array.isArray(data.pick_items)) {
    const pick = resolvePick(ctx.input.text ?? "", data.pick_items as PickItem[]);
    if (pick && "id" in pick) { await openPlanOptions(ctx, pick.id); return true; }
    if (pick && "ambiguous" in pick) {
      await sendList(ctx.phone, "Encontrei mais de um. Selecione:", "Ver planejamentos",
        pick.ambiguous.map((p) => ({ id: `${PL_GET_PREFIX}${p.id}`, title: p.name, description: p.sub })), "Planejamentos");
      return true;
    }
    await plInfo(ctx, "Não encontrei. Responda com o número da lista ou a data.");
    return true;
  }
  return false;
}

/** Trata os botões do planejamento. */
export async function handlePlanningReply(ctx: PlanningCtx, replyId: string): Promise<PlanningReplyResult> {
  const fd = (ctx.session?.flow_data ?? {}) as Record<string, any>;
  const data = fd as unknown as PendingPlan;

  // --- Etapa de contexto (escolha + rascunho de direcionamento) ---
  if (replyId === PL_GEN_NOW) {
    const patient = fd.patient_id ? await getPatientById(ctx.supabase, ctx.userId, fd.patient_id) : null;
    if (!patient) { await plInfo(ctx, "Não identifiquei o paciente."); return { handled: true }; }
    await runAndPreview(ctx, patient.id, patient.full_name, null, null);
    return { handled: true };
  }
  if (replyId === PL_ADD_CONTEXT) {
    await patchSession(ctx.supabase, ctx.phone, {
      mode: "planning", flow_step: "pl_capture",
      flow_data: { patient_id: fd.patient_id, patient_name: fd.patient_name, dir_parts: [] },
    });
    await plCapturePrompt(ctx,
      `Pode ditar (enviar Áudio) ou escrever o foco do planejamento de *${fd.patient_name ?? ""}* ` +
        `(em quantas mensagens quiser). Quando terminar, toque em *Gerar planejamento*.`);
    return { handled: true };
  }
  if (replyId === PL_GENERATE) {
    await generateFromCapture(ctx, fd);
    return { handled: true };
  }

  // --- Recuperar planos salvos ---
  if (replyId.startsWith(PL_GET_PREFIX)) {
    await openPlanOptions(ctx, replyId.slice(PL_GET_PREFIX.length));
    return { handled: true };
  }
  if (replyId === PL_VIEW) {
    if (!fd.sel_plan_id) { await plInfo(ctx, "Não há planejamento selecionado."); return { handled: true }; }
    const { data: plan } = await ctx.supabase
      .from("session_plans").select("*").eq("id", fd.sel_plan_id).eq("user_id", ctx.userId).maybeSingle();
    if (!plan) { await plInfo(ctx, "Não encontrei esse planejamento."); return { handled: true }; }
    await sendText(ctx.phone, planFullText(plan));
    await sendList(ctx.phone, "O que deseja?", "Opções", [
      { id: PL_EDIT_PLAN, title: "Editar" },
      { id: PL_USE_EVO, title: "Usar na evolução" },
      { id: "ctx_exit", title: "Menu" },
    ], "Planejamento");
    return { handled: true };
  }
  if (replyId === PL_EDIT_PLAN) {
    if (!fd.sel_plan_id) { await plInfo(ctx, "Não há planejamento selecionado."); return { handled: true }; }
    await patchSession(ctx.supabase, ctx.phone, {
      mode: "planning", flow_step: "pl_capture",
      flow_data: { patient_id: fd.patient_id, patient_name: fd.patient_name, dir_parts: [], editing_plan_id: fd.sel_plan_id },
    });
    await plCapturePrompt(ctx,
      "O que você quer ajustar neste planejamento? Pode ditar (enviar Áudio) ou escrever; depois toque em *Gerar planejamento*.");
    return { handled: true };
  }
  if (replyId === PL_USE_EVO) {
    if (!fd.sel_plan_id || !fd.patient_id) { await plInfo(ctx, "Não há planejamento selecionado."); return { handled: true }; }
    const patient = await getPatientById(ctx.supabase, ctx.userId, fd.patient_id);
    return { handled: true, action: "use_plan_in_evo", patient, planId: fd.sel_plan_id };
  }

  if (replyId === PL_ADJUST) {
    await patchSession(ctx.supabase, ctx.phone, { mode: "planning", flow_step: "adjust", flow_data: data as unknown as Record<string, unknown> });
    await plAsk(ctx, "O que você quer ajustar? (ex.: \"foca na ansiedade no trabalho\" ou mande um áudio)");
    return { handled: true };
  }
  if (replyId === PL_CANCEL) {
    await patchSession(ctx.supabase, ctx.phone, { mode: "paciente", flow_step: null, flow_data: null });
    await sendText(ctx.phone, "Plano descartado. Nada foi salvo.");
    const patient = data?.patient_id ? await getPatientById(ctx.supabase, ctx.userId, data.patient_id) : null;
    return { handled: true, action: "patient_menu", patient };
  }
  if (replyId === PL_SAVE) {
    if (!data?.patient_id) { await plInfo(ctx, "Não há plano pendente para salvar."); return { handled: true }; }
    const editingId = data.editing_plan_id ?? null;
    const fields = {
      objetivo: data.objetivo, roteiro: data.roteiro, tecnicas: data.tecnicas,
      atencao: data.atencao, perguntas: data.perguntas,
      input_type: data.input_type ?? null,
      input_content: data.direction ?? null,
    };
    const { error } = editingId
      ? await ctx.supabase.from("session_plans")
          .update({ ...fields, atualizado_em: new Date().toISOString() })
          .eq("id", editingId).eq("user_id", ctx.userId)
      : await ctx.supabase.from("session_plans")
          .insert({ user_id: ctx.userId, patient_id: data.patient_id, ...fields, status: "salvo" });
    if (error) {
      console.error("Erro ao salvar session_plan (WA):", error.message);
      await patchSession(ctx.supabase, ctx.phone, { mode: "paciente", flow_step: null, flow_data: null });
      await plInfo(ctx, "Não consegui salvar o plano agora. Tente novamente.");
      return { handled: true };
    }
    await sendText(ctx.phone, editingId ? `✅ Plano atualizado.` : `✅ Plano salvo para *${data.patient_name}*.`);
    // Próximo passo: agendar (ou ver agenda, se já houver compromisso futuro) / voltar / menu.
    const { data: future } = await ctx.supabase
      .from("appointments").select("id")
      .eq("user_id", ctx.userId).eq("patient_id", data.patient_id).eq("status", "agendado")
      .gte("starts_at", new Date().toISOString()).limit(1).maybeSingle();
    const hasAppt = !!future?.id;
    await patchSession(ctx.supabase, ctx.phone, {
      mode: "planning", flow_step: "after_save",
      flow_data: { patient_id: data.patient_id, patient_name: data.patient_name, has_appt: hasAppt },
    });
    await sendButtons(ctx.phone, "Plano salvo. E agora?", [
      { id: PL_NEXT_AGENDA, title: hasAppt ? "Ver agenda" : "Agendar sessão" },
      { id: PL_NEXT_PATIENT, title: "Voltar ao paciente" },
      { id: "ctx_exit", title: "Menu" },
    ]);
    return { handled: true };
  }
  if (replyId === PL_NEXT_AGENDA) {
    const patient = data?.patient_id ? await getPatientById(ctx.supabase, ctx.userId, data.patient_id) : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasAppt = (ctx.session?.flow_data as any)?.has_appt === true;
    return { handled: true, action: hasAppt ? "patient_agenda" : "agendar", patient };
  }
  if (replyId === PL_NEXT_PATIENT) {
    const patient = data?.patient_id ? await getPatientById(ctx.supabase, ctx.userId, data.patient_id) : null;
    return { handled: true, action: "patient_menu", patient };
  }
  return { handled: false };
}
