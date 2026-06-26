// Máquina da agenda do WhatsApp (caminho único usado pelo panorama e pela agenda do
// paciente). Mantém a "regra de ouro": agendar/editar/cancelar/link passam por PRÉVIA +
// [Salvar · Ajustar · Cancelar] antes de gravar. Recuperar (listar) é leitura.
//
// Não importa state.ts (evita ciclo): define o tipo de input mínimo localmente.

import { sendButtons, sendList, sendText } from "./messaging.ts";
import { getPatientById, listActivePatients, type Patient, patchSession, searchPatientsByName } from "./repo.ts";
import { parseDateTimePtBr } from "./datetime.ts";
import { diaChaveSP, fmtDiaCurto, fmtHora, nowSP, spParts, spWallToUtc, startOfTodaySP } from "./tz.ts";
import { numberedList, type PickItem, resolvePick } from "./pickList.ts";

export const APPT_PREFIX = "appt:";
export const AG_SAVE = "ag_save";
export const AG_ADJUST = "ag_adjust";
export const AG_CANCEL = "ag_cancel";
export const AG_RESUME = "ag_resume";
export const AG_DISCARD = "ag_discard";
// Navegação guiada do agendamento.
export const AG_PICK_PATIENT = "ag_pick_patient";   // botão "Selecionar paciente"
export const AG_PT_PREFIX = "agpt:";                  // linha de paciente no picker de agenda
export const AG_DUR_PREFIX = "agdur_";                // agdur_30 / agdur_50 / agdur_60 / agdur_other
export const AG_SKIP_LINK = "ag_skip_link";           // botão "Pular" (link)
export const AG_NEXT_PLAN = "ag_next_plan";           // próximo passo: planejar
export const AG_NEXT_AGAIN = "ag_next_again";         // próximo passo: agendar outra

export type AgendaReplyResult = {
  handled: boolean;
  lockedPatient?: Patient | null;
  action?: "planning" | "agendar_again";
  patient?: Patient | null;
};

type AgInput = { kind: string; text: string; replyId?: string };
type Session = { mode?: string | null; locked_patient_id?: string | null; flow_step?: string | null; flow_data?: Record<string, unknown> | null } | null;

export interface AgendaCtx {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  phone: string;
  userId: string;
  displayName: string;
  session: Session;
  input: AgInput;
}

interface PendingOp {
  ag_op: "create" | "edit" | "cancel";
  patient_id: string | null;
  patient_name: string;
  patient_initials: string | null;
  starts_at: string;       // ISO UTC
  duration_min: number;
  modality: "online" | "presencial";
  appt_id?: string;        // edit/cancel
}

// ---- DB helpers (service_role) ----

async function patientDurationMin(ctx: AgendaCtx, patientId: string): Promise<number> {
  const { data } = await ctx.supabase
    .from("patients").select("default_session_duration").eq("id", patientId).eq("user_id", ctx.userId).maybeSingle();
  const m = String(data?.default_session_duration ?? "").match(/\d+/);
  return m ? Math.max(10, Math.min(240, +m[0])) : 50;
}

async function listUpcoming(ctx: AgendaCtx, fromIso: string, toIso: string) {
  const { data } = await ctx.supabase
    .from("appointments")
    .select("id, patient_id, patient_initials, starts_at, duration_min, modality, meeting_link, status")
    .eq("user_id", ctx.userId).eq("status", "agendado")
    .gte("starts_at", fromIso).lt("starts_at", toIso)
    .order("starts_at", { ascending: true }).limit(50);
  return data ?? [];
}

async function listPatientUpcoming(ctx: AgendaCtx, patientId: string) {
  const { data } = await ctx.supabase
    .from("appointments")
    .select("id, starts_at, duration_min, modality, meeting_link, status")
    .eq("user_id", ctx.userId).eq("patient_id", patientId).eq("status", "agendado")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true }).limit(10);
  return data ?? [];
}

async function nextFuture(ctx: AgendaCtx, patientId: string) {
  const { data } = await ctx.supabase
    .from("appointments")
    .select("id, starts_at, duration_min, modality, meeting_link")
    .eq("user_id", ctx.userId).eq("patient_id", patientId).eq("status", "agendado")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true }).limit(1).maybeSingle();
  return data ?? null;
}

// ---- Resolução de paciente por nome no texto (igual ao atalho do state.ts) ----

async function resolvePatientFromText(ctx: AgendaCtx, text: string): Promise<Patient | null> {
  const lower = text.toLowerCase();
  const patients = await listActivePatients(ctx.supabase, ctx.userId, 50);
  const byFull = patients.find((p) => p.full_name && lower.includes(p.full_name.toLowerCase()));
  if (byFull) return byFull;
  const firstWord = patients.find((p) => {
    const first = (p.full_name ?? "").split(/\s+/)[0]?.toLowerCase();
    return first && first.length >= 3 && lower.includes(first);
  });
  if (byFull === undefined && firstWord) return firstWord;
  // fallback: busca pelo maior token
  const token = lower.replace(/[^a-zà-ú\s]/gi, " ").split(/\s+/).filter((w) => w.length >= 3).sort((a, b) => b.length - a.length)[0];
  if (token) {
    const m = await searchPatientsByName(ctx.supabase, ctx.userId, token, 1);
    if (m.length) return m[0];
  }
  return null;
}

// ---- Construção de PRÉVIA ----

function previewText(op: PendingOp): string {
  const dia = fmtDiaCurto(op.starts_at);
  const hora = fmtHora(op.starts_at);
  const verbo = op.ag_op === "create" ? "Agendar" : op.ag_op === "edit" ? "Remarcar para" : "Cancelar";
  return `*${verbo}*\nSessão — ${op.patient_name}, ${dia}, ${hora} (${op.duration_min}min), ${op.modality}`;
}

async function showPreview(ctx: AgendaCtx, op: PendingOp) {
  await patchSession(ctx.supabase, ctx.phone, { mode: "agenda", flow_step: "preview", flow_data: op as unknown as Record<string, unknown> });
  const confirmTitle = op.ag_op === "cancel" ? "Confirmar" : "Salvar";
  await sendButtons(ctx.phone, previewText(op), [
    { id: AG_SAVE, title: confirmTitle },
    { id: AG_ADJUST, title: "Ajustar" },
    { id: AG_CANCEL, title: "Cancelar" },
  ]);
}

// ---- Agendamento guiado: picker de paciente, duração, próximo passo ----

/** Lista de pacientes para o agendamento guiado (interativa ≤10; senão número/nome). */
async function showSchedulePatientList(ctx: AgendaCtx): Promise<void> {
  const patients = await listActivePatients(ctx.supabase, ctx.userId, 50);
  if (patients.length === 0) {
    await sendButtons(ctx.phone, "Você ainda não tem pacientes. Cadastre um para agendar.", [
      { id: "menu_create", title: "Cadastrar" },
      { id: "ctx_exit", title: "Menu" },
    ]);
    return;
  }
  if (patients.length > 10) {
    const items: PickItem[] = patients.map((p) => ({ id: p.id, name: p.full_name, sub: p.initials }));
    await patchSession(ctx.supabase, ctx.phone, { mode: "agenda", flow_step: "agenda_pick", flow_data: { pick_items: items } });
    await sendText(ctx.phone, numberedList(items, "pacientes"));
    return;
  }
  await patchSession(ctx.supabase, ctx.phone, { mode: "agenda", flow_step: "agenda_pick", flow_data: {} });
  await sendList(
    ctx.phone, "Para quem é a sessão?", "Pacientes",
    patients.map((p) => ({ id: `${AG_PT_PREFIX}${p.id}`, title: p.full_name, description: p.initials })),
    "Selecionar paciente",
  );
}

/** Passo de duração por lista (30/50/60/Outro); default = duração do paciente. */
async function askDuration(ctx: AgendaCtx, op: PendingOp): Promise<void> {
  await patchSession(ctx.supabase, ctx.phone, { mode: "agenda", flow_step: "agenda_duration", flow_data: op as unknown as Record<string, unknown> });
  await sendList(ctx.phone, `Duração da sessão? (padrão: ${op.duration_min} min)`, "Duração", [
    { id: `${AG_DUR_PREFIX}30`, title: "30 min" },
    { id: `${AG_DUR_PREFIX}50`, title: "50 min" },
    { id: `${AG_DUR_PREFIX}60`, title: "60 min" },
    { id: `${AG_DUR_PREFIX}other`, title: "Outro" },
  ], "Duração");
}

/** Após resolver data/hora: criar → pergunta a duração; editar → vai direto à prévia. */
async function proceedCreateOrEdit(ctx: AgendaCtx, op: PendingOp): Promise<void> {
  if (op.ag_op === "create") await askDuration(ctx, op);
  else await showPreview(ctx, op);
}

/** Próximo passo após salvar o agendamento (continuidade). */
async function finishWithNextSteps(ctx: AgendaCtx, patientId: string | null, patientName: string): Promise<void> {
  await patchSession(ctx.supabase, ctx.phone, {
    mode: "agenda", flow_step: "after_save", flow_data: { patient_id: patientId, patient_name: patientName },
  });
  await sendButtons(ctx.phone, "Tudo certo! E agora?", [
    { id: AG_NEXT_PLAN, title: "Planejar a sessão" },
    { id: AG_NEXT_AGAIN, title: "Agendar outra" },
    { id: "ctx_exit", title: "Menu" },
  ]);
}

// ---- Montagem do horário a partir do texto ----

function modalityFromText(text: string): "online" | "presencial" {
  return /presencial/i.test(text) ? "presencial" : "online";
}

/** Resolve data+hora do texto para ISO UTC. Retorna { iso } ou pede a hora. */
function resolveStartsAt(text: string): { iso?: string; needTime?: boolean; date?: { y: number; mo: number; d: number } } {
  const p = parseDateTimePtBr(text);
  if (!p.date && !p.time) return {};
  const now = nowSP();
  const date = p.date ?? { y: now.y, mo: now.mo, d: now.d };
  if (!p.time) return { needTime: true, date };
  const utc = spWallToUtc(date.y, date.mo, date.d, p.time.h, p.time.mi);
  return { iso: utc.toISOString() };
}

// ---- Entradas públicas ----

/** Panorama do psicólogo: hoje em detalhe + próximos dias resumidos. */
export async function showPanorama(ctx: AgendaCtx): Promise<void> {
  const from = startOfTodaySP();
  const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
  const appts = await listUpcoming(ctx, from.toISOString(), to.toISOString());
  await patchSession(ctx.supabase, ctx.phone, { mode: "menu", flow_step: null, flow_data: null });

  if (appts.length === 0) {
    await sendButtons(ctx.phone, "Sua agenda dos próximos dias está vazia.", [
      { id: AG_PICK_PATIENT, title: "Agendar sessão" },
      { id: "ctx_exit", title: "Menu" },
    ]);
    return;
  }

  const todayKey = diaChaveSP(from);
  const byDay = new Map<string, any[]>();
  for (const a of appts) {
    const k = diaChaveSP(a.starts_at);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(a);
  }

  const linhas: string[] = ["*Sua agenda:*"];
  for (const [k, items] of byDay) {
    const label = fmtDiaCurto(items[0].starts_at);
    if (k === todayKey) {
      const detalhe = items.map((a) => `${fmtHora(a.starts_at)} ${a.patient_initials ?? "sessão"}`).join(" · ");
      linhas.push(`Hoje (${label}): ${detalhe}`);
    } else {
      linhas.push(`${label}: ${items.length} ${items.length === 1 ? "sessão" : "sessões"}`);
    }
  }
  await sendText(ctx.phone, linhas.join("\n"));

  const rows = appts.slice(0, 10).map((a: any) => ({
    id: `${APPT_PREFIX}${a.id}`,
    title: `${fmtHora(a.starts_at)} ${a.patient_initials ?? "sessão"}`.slice(0, 24),
    description: fmtDiaCurto(a.starts_at),
  }));
  await sendList(ctx.phone, "Toque num compromisso para abrir o paciente:", "Ver agenda", rows, "Próximos");
}

/** Agenda do paciente travado (próximas sessões). */
export async function showPatientAgenda(ctx: AgendaCtx, patient: Patient): Promise<void> {
  const appts = await listPatientUpcoming(ctx, patient.id);
  // Deixa o paciente travado e pronto para qualquer ação (inclusive ditar a evolução).
  await patchSession(ctx.supabase, ctx.phone, { mode: "paciente", kind: "clinico", locked_patient_id: patient.id, flow_step: null, flow_data: null, last_intent: null });
  if (appts.length === 0) {
    await sendText(ctx.phone, `*${patient.full_name}* não tem sessões agendadas. Para marcar, escreva por exemplo: *quinta 15h* (ou "agenda ${(patient.full_name ?? "").split(" ")[0]} quinta 15h").`);
    return;
  }
  const linhas = appts.map((a: any) =>
    `${fmtDiaCurto(a.starts_at)} ${fmtHora(a.starts_at)} (${a.modality})${a.meeting_link ? ` • ${a.meeting_link}` : ""}`
  );
  await sendText(ctx.phone, `*Agenda de ${patient.full_name}:*\n${linhas.join("\n")}\n\nPara remarcar/cancelar ou colar link, é só escrever (ex.: "remarca para sexta 16h", "o link é https://...").`);
}

/** Inicia agendamento (entrada B: paciente travado, ou natural language). */
export async function startAgendar(ctx: AgendaCtx, lockedPatient: Patient | null, rawText: string): Promise<void> {
  let patient = lockedPatient;
  if (!patient) {
    patient = await resolvePatientFromText(ctx, rawText);
  }
  if (!patient) {
    await sendButtons(ctx.phone, "Para qual paciente é a sessão?", [
      { id: AG_PICK_PATIENT, title: "Selecionar paciente" },
      { id: "menu_create", title: "Cadastrar" },
      { id: "ctx_exit", title: "Menu" },
    ]);
    return;
  }

  const resolved = resolveStartsAt(rawText);
  const dur = await patientDurationMin(ctx, patient.id);
  const modality = modalityFromText(rawText);

  if (resolved.needTime && resolved.date) {
    await patchSession(ctx.supabase, ctx.phone, {
      mode: "agenda", flow_step: "await_time",
      flow_data: { ag_op: "create", patient_id: patient.id, patient_name: patient.full_name, patient_initials: patient.initials, date: resolved.date, duration_min: dur, modality },
    });
    await sendText(ctx.phone, `Para que horário no dia ${resolved.date.d}/${resolved.date.mo + 1}? (ex.: 15h ou 15:30)`);
    return;
  }
  if (!resolved.iso) {
    await patchSession(ctx.supabase, ctx.phone, {
      mode: "agenda", flow_step: "await_when",
      flow_data: { ag_op: "create", patient_id: patient.id, patient_name: patient.full_name, patient_initials: patient.initials, duration_min: dur, modality },
    });
    await sendText(ctx.phone, `Quando você quer agendar *${patient.full_name}*? (ex.: quinta 15h, amanhã 10h, 12/06 14h)`);
    return;
  }

  await proceedCreateOrEdit(ctx, {
    ag_op: "create", patient_id: patient.id, patient_name: patient.full_name,
    patient_initials: patient.initials, starts_at: resolved.iso, duration_min: dur, modality,
  });
}

/** Edição/cancelamento por linguagem natural (localiza próximo futuro do paciente). */
export async function editOrCancel(ctx: AgendaCtx, lockedPatient: Patient | null, rawText: string, op: "edit" | "cancel"): Promise<void> {
  const patient = lockedPatient ?? await resolvePatientFromText(ctx, rawText);
  if (!patient) {
    await sendText(ctx.phone, "Não identifiquei o paciente para essa alteração. Tente: \"cancela a sessão da Maria\".");
    return;
  }
  const appt = await nextFuture(ctx, patient.id);
  if (!appt) {
    await sendText(ctx.phone, `*${patient.full_name}* não tem sessão futura agendada.`);
    return;
  }
  if (op === "cancel") {
    await showPreview(ctx, {
      ag_op: "cancel", appt_id: appt.id, patient_id: patient.id, patient_name: patient.full_name,
      patient_initials: patient.initials, starts_at: appt.starts_at, duration_min: appt.duration_min, modality: appt.modality,
    });
    return;
  }
  const resolved = resolveStartsAt(rawText);
  if (!resolved.iso) {
    await patchSession(ctx.supabase, ctx.phone, {
      mode: "agenda", flow_step: "await_when",
      flow_data: { ag_op: "edit", appt_id: appt.id, patient_id: patient.id, patient_name: patient.full_name, patient_initials: patient.initials, duration_min: appt.duration_min, modality: appt.modality },
    });
    await sendText(ctx.phone, `Para quando remarcar a sessão de *${patient.full_name}*? (ex.: sexta 16h)`);
    return;
  }
  await showPreview(ctx, {
    ag_op: "edit", appt_id: appt.id, patient_id: patient.id, patient_name: patient.full_name,
    patient_initials: patient.initials, starts_at: resolved.iso, duration_min: appt.duration_min, modality: appt.modality,
  });
}

/** Anexa link da reunião ao próximo compromisso futuro do paciente. */
export async function attachLink(ctx: AgendaCtx, lockedPatient: Patient | null, rawText: string): Promise<boolean> {
  const url = rawText.match(/https?:\/\/[^\s]+/i)?.[0];
  if (!url) return false;
  const patient = lockedPatient ?? await resolvePatientFromText(ctx, rawText);
  if (!patient) {
    await sendText(ctx.phone, "Para qual paciente é esse link? Abra o paciente e cole o link, ou escreva \"o link da Maria é ...\".");
    return true;
  }
  const appt = await nextFuture(ctx, patient.id);
  if (!appt) {
    await sendText(ctx.phone, `*${patient.full_name}* não tem sessão futura para anexar o link.`);
    return true;
  }
  await ctx.supabase.from("appointments").update({ meeting_link: url, atualizado_em: new Date().toISOString() }).eq("id", appt.id);
  await sendText(ctx.phone, `🔗 Link anexado à sessão de *${patient.full_name}* (${fmtDiaCurto(appt.starts_at)} ${fmtHora(appt.starts_at)}).`);
  return true;
}

/** Continua um fluxo de agenda em andamento (mode==='agenda'). Retorna true se tratou. */
export async function continueAgenda(ctx: AgendaCtx): Promise<boolean> {
  const step = ctx.session?.flow_step ?? null;
  const data = (ctx.session?.flow_data ?? {}) as Record<string, any>;
  const text = ctx.input.text ?? "";

  if (step === "agenda_pick") {
    // Escolha de paciente (por número/nome) no agendamento guiado.
    const items = data.pick_items as PickItem[] | undefined;
    let patientId: string | null = null;
    if (items && items.length) {
      const pick = resolvePick(text, items);
      if (pick && "id" in pick) patientId = pick.id;
      else if (pick && "ambiguous" in pick) {
        await sendList(ctx.phone, "Encontrei mais de um. Selecione:", "Pacientes",
          pick.ambiguous.map((p) => ({ id: `${AG_PT_PREFIX}${p.id}`, title: p.name, description: p.sub })), "Selecionar paciente");
        return true;
      }
    } else {
      const m = await searchPatientsByName(ctx.supabase, ctx.userId, text.trim(), 1);
      patientId = m[0]?.id ?? null;
    }
    if (!patientId) { await sendText(ctx.phone, "Não encontrei. Responda com o *número* ou parte do *nome*."); return true; }
    const patient = await getPatientById(ctx.supabase, ctx.userId, patientId);
    if (!patient) { await sendText(ctx.phone, "Paciente não encontrado."); return true; }
    await startAgendar(ctx, patient, "");
    return true;
  }

  if (step === "agenda_dur_other" || step === "agenda_duration") {
    const m = text.match(/\d{1,3}/);
    if (!m) { await sendText(ctx.phone, "Quantos minutos? (ex.: 45) — ou toque numa das opções."); return true; }
    const dur = Math.max(10, Math.min(240, +m[0]));
    await showPreview(ctx, { ...(data as unknown as PendingOp), duration_min: dur });
    return true;
  }

  if (step === "await_time" && data.date) {
    const t = parseDateTimePtBr(text);
    if (!t.time) { await sendText(ctx.phone, "Não entendi o horário. Envie como 15h ou 15:30."); return true; }
    const iso = spWallToUtc(data.date.y, data.date.mo, data.date.d, t.time.h, t.time.mi).toISOString();
    await proceedCreateOrEdit(ctx, { ag_op: data.ag_op, patient_id: data.patient_id, patient_name: data.patient_name, patient_initials: data.patient_initials, starts_at: iso, duration_min: data.duration_min ?? 50, modality: data.modality ?? "online", appt_id: data.appt_id });
    return true;
  }

  if ((step === "await_when" || step === "adjust") && (data.ag_op === "create" || data.ag_op === "edit")) {
    const r = resolveStartsAt(text);
    if (r.needTime && r.date) {
      await patchSession(ctx.supabase, ctx.phone, { flow_step: "await_time", flow_data: { ...data, date: r.date } });
      await sendText(ctx.phone, `Para que horário no dia ${r.date.d}/${r.date.mo + 1}? (ex.: 15h)`);
      return true;
    }
    if (!r.iso) { await sendText(ctx.phone, "Não entendi a data/hora. Tente: quinta 15h, amanhã 10h, 12/06 14h."); return true; }
    await proceedCreateOrEdit(ctx, { ag_op: data.ag_op, patient_id: data.patient_id, patient_name: data.patient_name, patient_initials: data.patient_initials, starts_at: r.iso, duration_min: data.duration_min ?? 50, modality: data.modality ?? "online", appt_id: data.appt_id });
    return true;
  }

  if (step === "await_link") {
    const url = text.match(/https?:\/\/[^\s]+/i)?.[0];
    if (url && data.appt_id) {
      await ctx.supabase.from("appointments").update({ meeting_link: url, atualizado_em: new Date().toISOString() }).eq("id", data.appt_id);
      await sendText(ctx.phone, "🔗 Link adicionado à sessão.");
    }
    await finishWithNextSteps(ctx, data.patient_id ?? null, data.patient_name ?? "");
    return true;
  }

  return false;
}

/** Trata respostas de botão/lista da agenda. Retorna true se tratou. */
export async function handleAgendaReply(ctx: AgendaCtx, replyId: string): Promise<AgendaReplyResult> {
  // Agendamento guiado: botão "Selecionar paciente".
  if (replyId === AG_PICK_PATIENT) {
    await showSchedulePatientList(ctx);
    return { handled: true };
  }
  // Escolha de paciente no picker do agendamento → resume o agendamento.
  if (replyId.startsWith(AG_PT_PREFIX)) {
    const patient = await getPatientById(ctx.supabase, ctx.userId, replyId.slice(AG_PT_PREFIX.length));
    if (!patient) { await sendText(ctx.phone, "Paciente não encontrado."); return { handled: true }; }
    await startAgendar(ctx, patient, "");
    return { handled: true };
  }
  // Duração escolhida (30/50/60/Outro).
  if (replyId.startsWith(AG_DUR_PREFIX)) {
    const op = (ctx.session?.flow_data ?? {}) as unknown as PendingOp;
    if (!op?.starts_at) { await sendText(ctx.phone, "Não há agendamento em andamento."); return { handled: true }; }
    const suf = replyId.slice(AG_DUR_PREFIX.length);
    if (suf === "other") {
      await patchSession(ctx.supabase, ctx.phone, { mode: "agenda", flow_step: "agenda_dur_other", flow_data: op as unknown as Record<string, unknown> });
      await sendText(ctx.phone, "Quantos minutos? (ex.: 45)");
      return { handled: true };
    }
    await showPreview(ctx, { ...op, duration_min: Math.max(10, Math.min(240, +suf || op.duration_min)) });
    return { handled: true };
  }
  // Pular o link.
  if (replyId === AG_SKIP_LINK) {
    const data = (ctx.session?.flow_data ?? {}) as Record<string, any>;
    await finishWithNextSteps(ctx, data.patient_id ?? null, data.patient_name ?? "");
    return { handled: true };
  }
  // Próximo passo após salvar: planejar / agendar outra.
  if (replyId === AG_NEXT_PLAN || replyId === AG_NEXT_AGAIN) {
    const data = (ctx.session?.flow_data ?? {}) as Record<string, any>;
    const patient = data.patient_id ? await getPatientById(ctx.supabase, ctx.userId, data.patient_id) : null;
    return { handled: true, action: replyId === AG_NEXT_PLAN ? "planning" : "agendar_again", patient };
  }

  // Tocar num compromisso do panorama: trava o paciente e mostra a agenda dele.
  if (replyId.startsWith(APPT_PREFIX)) {
    const apptId = replyId.slice(APPT_PREFIX.length);
    const { data: appt } = await ctx.supabase
      .from("appointments").select("patient_id").eq("id", apptId).eq("user_id", ctx.userId).maybeSingle();
    if (!appt?.patient_id) {
      await sendText(ctx.phone, "Esse compromisso não está vinculado a um paciente.");
      return { handled: true };
    }
    const patient = await getPatientById(ctx.supabase, ctx.userId, appt.patient_id);
    if (!patient) { await sendText(ctx.phone, "Paciente não encontrado."); return { handled: true }; }
    await patchSession(ctx.supabase, ctx.phone, { mode: "paciente", kind: "clinico", locked_patient_id: patient.id, flow_step: null, flow_data: null, last_intent: null });
    await showPatientAgenda(ctx, patient);
    return { handled: true, lockedPatient: patient };
  }

  if (replyId === AG_ADJUST) {
    const data = (ctx.session?.flow_data ?? {}) as Record<string, any>;
    await patchSession(ctx.supabase, ctx.phone, { mode: "agenda", flow_step: "adjust", flow_data: data });
    await sendText(ctx.phone, "Sem problema. Reescreva o agendamento (ex.: \"sexta 16h\").");
    return { handled: true };
  }

  if (replyId === AG_CANCEL) {
    await patchSession(ctx.supabase, ctx.phone, { mode: "menu", flow_step: null, flow_data: null });
    await sendText(ctx.phone, "Operação cancelada. Nada foi gravado.");
    return { handled: true };
  }

  if (replyId === AG_SAVE) {
    const op = (ctx.session?.flow_data ?? {}) as unknown as PendingOp;
    if (!op?.ag_op) { await sendText(ctx.phone, "Não há nada pendente para salvar."); return { handled: true }; }
    if (op.ag_op === "create") {
      const { data: inserted } = await ctx.supabase.from("appointments").insert({
        user_id: ctx.userId, patient_id: op.patient_id, patient_initials: op.patient_initials,
        starts_at: op.starts_at, duration_min: op.duration_min, modality: op.modality, status: "agendado",
      }).select("id").maybeSingle();
      await patchSession(ctx.supabase, ctx.phone, {
        mode: "agenda", flow_step: "await_link",
        flow_data: { appt_id: inserted?.id, patient_id: op.patient_id, patient_name: op.patient_name },
      });
      await sendButtons(
        ctx.phone,
        `✅ Sessão agendada para *${op.patient_name}* — ${fmtDiaCurto(op.starts_at)} ${fmtHora(op.starts_at)}.\n\nEnvie a *URL* do link da reunião, ou toque em *Pular*.`,
        [{ id: AG_SKIP_LINK, title: "Pular" }],
      );
      return { handled: true };
    }
    if (op.ag_op === "edit" && op.appt_id) {
      await ctx.supabase.from("appointments").update({ starts_at: op.starts_at, atualizado_em: new Date().toISOString() }).eq("id", op.appt_id);
      await patchSession(ctx.supabase, ctx.phone, { mode: "menu", flow_step: null, flow_data: null });
      await sendText(ctx.phone, `✅ Sessão de *${op.patient_name}* remarcada para ${fmtDiaCurto(op.starts_at)} ${fmtHora(op.starts_at)}.`);
      return { handled: true };
    }
    if (op.ag_op === "cancel" && op.appt_id) {
      await ctx.supabase.from("appointments").update({ status: "cancelado", atualizado_em: new Date().toISOString() }).eq("id", op.appt_id);
      await patchSession(ctx.supabase, ctx.phone, { mode: "menu", flow_step: null, flow_data: null });
      await sendText(ctx.phone, `✅ Sessão de *${op.patient_name}* cancelada.`);
      return { handled: true };
    }
  }

  if (replyId === AG_DISCARD) {
    await patchSession(ctx.supabase, ctx.phone, { mode: "menu", flow_step: null, flow_data: null });
    await sendText(ctx.phone, "Agendamento descartado.");
    return { handled: true };
  }
  if (replyId === AG_RESUME) {
    const op = (ctx.session?.flow_data ?? {}) as unknown as PendingOp;
    if (op?.ag_op && op?.starts_at) { await showPreview(ctx, op); return { handled: true }; }
    await sendText(ctx.phone, "Não consegui retomar; vamos recomeçar.");
    await patchSession(ctx.supabase, ctx.phone, { mode: "menu", flow_step: null, flow_data: null });
    return { handled: true };
  }

  return { handled: false };
}

/** Classifica um texto de comando de agenda e roteia. Retorna true se tratou. */
export async function handleAgendaCommand(ctx: AgendaCtx, lockedPatient: Patient | null, rawText: string): Promise<boolean> {
  const t = rawText.toLowerCase().normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "").trim();

  // Link
  if (/https?:\/\//i.test(rawText) && /(link|reuniao|meet|zoom|sala)/i.test(t)) {
    return await attachLink(ctx, lockedPatient, rawText);
  }
  // Cancelar
  if (/^(cancela|cancelar|desmarca|desmarcar)\b/.test(t)) {
    await editOrCancel(ctx, lockedPatient, rawText, "cancel");
    return true;
  }
  // Remarcar / adiar / mudar
  if (/^(remarca|remarcar|adia|adiar|muda|mudar|transfere|transferir)\b/.test(t)) {
    await editOrCancel(ctx, lockedPatient, rawText, "edit");
    return true;
  }
  // Agendar / marcar
  if (/^(agenda|agendar|marca|marcar)\b/.test(t)) {
    // "agenda"/"minha agenda" puro = panorama (tratado fora); aqui só com conteúdo
    await startAgendar(ctx, lockedPatient, rawText);
    return true;
  }
  return false;
}
