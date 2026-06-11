// Operações de banco do canal WhatsApp-first.
//
// CRÍTICO: em patients/evolutions o user_id é SEMPRE o profiles.user_id (id de
// auth.users), nunca profiles.id — é a chave de visibilidade no app web. Quem chama
// estas funções já resolve e passa esse user_id.
//
// patients/evolutions são COMPARTILHADAS com a web. wa_sessions/wa_messages são do canal.

export interface WaSession {
  phone: string;
  kind: string | null;
  thread_id: string | null;
  locked_patient_id: string | null;
  mode: string | null;
  sub_state: string | null;
  flow_step: string | null;
  flow_data: Record<string, unknown> | null;
  last_intent: string | null;
  updated_at: string | null;
}

export interface Patient {
  id: string;
  full_name: string;
  initials: string;
  approach: string | null;
  main_complaint: string | null;
  status: string;
  total_sessions: number | null;
}

export async function getSession(supabase: any, phone: string): Promise<WaSession | null> {
  const { data } = await supabase
    .from('wa_sessions')
    .select('phone, kind, thread_id, locked_patient_id, mode, sub_state, flow_step, flow_data, last_intent, updated_at')
    .eq('phone', phone)
    .maybeSingle();
  return data ?? null;
}

/** Upsert parcial do estado da sessão (por phone). */
export async function patchSession(
  supabase: any,
  phone: string,
  patch: Partial<Omit<WaSession, 'phone'>>,
): Promise<void> {
  const { error } = await supabase
    .from('wa_sessions')
    .upsert({ phone, updated_at: new Date().toISOString(), ...patch }, { onConflict: 'phone' });
  if (error) console.error('Error patching wa_sessions:', error.message);
}

/**
 * Idempotência do webhook: tenta registrar o message.id. Retorna true se é a PRIMEIRA vez
 * (deve processar); false se já foi processado (reentrega da Meta — ignorar). Em erro que não
 * seja conflito de unicidade, retorna true para não perder a mensagem.
 */
export async function markMessageProcessed(supabase: any, messageId: string): Promise<boolean> {
  const { error } = await supabase.from('wa_processed_messages').insert({ message_id: messageId });
  if (!error) return true;
  if ((error.code && String(error.code) === '23505') || /duplicate key/i.test(error.message ?? '')) {
    return false; // já processado
  }
  console.error('Error marking processed message:', error.message);
  return true; // erro inesperado: processa mesmo assim (não perder mensagem)
}

export async function logWaMessage(
  supabase: any,
  phone: string,
  role: 'user' | 'ai',
  content: string,
  usage?: unknown,
): Promise<void> {
  const { error } = await supabase
    .from('wa_messages')
    .insert({ phone, role, content, usage: usage ?? null });
  if (error) console.error('Error inserting wa_message:', error.message);
}

/** Lista pacientes ativos do psicólogo (para a lista interativa / atalho). */
export async function listActivePatients(supabase: any, userId: string, limit = 50): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('id, full_name, initials, approach, main_complaint, status, total_sessions')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('last_session_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) console.error('Error listing patients:', error.message);
  return data ?? [];
}

export async function getPatientById(supabase: any, userId: string, id: string): Promise<Patient | null> {
  const { data } = await supabase
    .from('patients')
    .select('id, full_name, initials, approach, main_complaint, status, total_sessions')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();
  return data ?? null;
}

/** Busca por nome (ilike) entre os pacientes ativos do psicólogo. */
export async function searchPatientsByName(
  supabase: any,
  userId: string,
  name: string,
  limit = 10,
): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('id, full_name, initials, approach, main_complaint, status, total_sessions')
    .eq('user_id', userId)
    .eq('status', 'active')
    .ilike('full_name', `%${name}%`)
    .limit(limit);
  if (error) console.error('Error searching patients:', error.message);
  return data ?? [];
}

export async function insertPatient(
  supabase: any,
  patient: { user_id: string; full_name: string; initials: string; approach?: string; main_complaint?: string },
): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .insert({
      user_id: patient.user_id,
      full_name: patient.full_name,
      initials: patient.initials,
      approach: patient.approach ?? null,
      main_complaint: patient.main_complaint ?? null,
      status: 'active',
    })
    .select('id, full_name, initials, approach, main_complaint, status, total_sessions')
    .single();
  if (error) {
    console.error('Error inserting patient:', error.message);
    return null;
  }
  return data;
}

/**
 * Atualiza campos cadastrais do paciente (isolado por user_id). Retorna o registro atualizado.
 * `patch` deve conter apenas chaves de full_name/initials/approach/main_complaint (validado por quem chama).
 */
export async function updatePatient(
  supabase: any,
  userId: string,
  id: string,
  patch: Record<string, string>,
): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .update(patch)
    .eq('user_id', userId)
    .eq('id', id)
    .select('id, full_name, initials, approach, main_complaint, status, total_sessions')
    .single();
  if (error) {
    console.error('Error updating patient:', error.message);
    return null;
  }
  return data;
}

export interface EvolutionRow {
  output_content: string;
  created_at: string;
  session_number: number | null;
}

/** Últimas evoluções do paciente (para injetar histórico no contexto). Exclui as excluídas logicamente. */
export async function recentEvolutions(
  supabase: any,
  userId: string,
  patientId: string,
  limit = 5,
): Promise<EvolutionRow[]> {
  const { data, error } = await supabase
    .from('evolutions')
    .select('output_content, created_at, session_number')
    .eq('user_id', userId)
    .eq('patient_id', patientId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) console.error('Error reading evolutions:', error.message);
  return data ?? [];
}

export interface EvolutionListItem {
  id: string;
  output_content: string | null;
  created_at: string | null;
  session_number: number | null;
}

/** Lista evoluções do paciente para a sub-máquina (traz id; exclui as excluídas logicamente). */
export async function listEvolutionsForPatient(
  supabase: any,
  userId: string,
  patientId: string,
  limit = 5,
): Promise<EvolutionListItem[]> {
  const { data, error } = await supabase
    .from('evolutions')
    .select('id, output_content, created_at, session_number')
    .eq('user_id', userId)
    .eq('patient_id', patientId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) console.error('Error listing evolutions:', error.message);
  return data ?? [];
}

export interface EvolutionFull extends EvolutionListItem {
  patient_id: string | null;
  patient_initials: string | null;
  input_type: string | null;
  approach: string | null;
  revision_history: unknown;
}

/** Lê uma evolução pelo id, isolada por psicólogo e não excluída. */
export async function getEvolutionById(
  supabase: any,
  userId: string,
  id: string,
): Promise<EvolutionFull | null> {
  const { data } = await supabase
    .from('evolutions')
    .select('id, patient_id, patient_initials, input_type, approach, output_content, created_at, session_number, revision_history')
    .eq('user_id', userId)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  return data ?? null;
}

/** Registra uma ação na trilha de auditoria do canal (spec §8). */
export async function insertWaAudit(
  supabase: any,
  entry: {
    user_id: string;
    action: string;
    entity_id?: string | null;
    phone?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from('wa_audit').insert({
    user_id: entry.user_id,
    action: entry.action,
    entity: 'evolution',
    entity_id: entry.entity_id ?? null,
    phone: entry.phone ?? null,
    metadata: entry.metadata ?? {},
  });
  if (error) console.error('Error inserting wa_audit:', error.message);
}

/**
 * Exclusão lógica de evolução (spec §8): marca deleted_at/deleted_by (isolada por user_id) e
 * grava a trilha de auditoria. Retorna true se afetou a linha.
 */
export async function softDeleteEvolution(
  supabase: any,
  userId: string,
  id: string,
  phone: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('evolutions')
    .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
    .eq('user_id', userId)
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('Error soft-deleting evolution:', error.message);
    return false;
  }
  if (!data) return false;
  await insertWaAudit(supabase, { user_id: userId, action: 'evolution_soft_delete', entity_id: id, phone });
  return true;
}

/**
 * Atualiza o texto de uma evolução existente (spec §8): preserva a origem, marca edited_at e
 * empilha a versão anterior em revision_history (mesmo formato da web). Isolada por user_id.
 */
export async function updateEvolutionContent(
  supabase: any,
  userId: string,
  id: string,
  newContent: string,
  improvementPrompt: string,
  phone: string,
): Promise<boolean> {
  const current = await getEvolutionById(supabase, userId, id);
  if (!current) return false;
  const history = Array.isArray(current.revision_history) ? current.revision_history : [];
  history.push({
    version_replaced: current.output_content ?? '',
    improvement_prompt: improvementPrompt,
    timestamp: new Date().toISOString(),
  });
  const { error } = await supabase
    .from('evolutions')
    .update({ output_content: newContent, edited_at: new Date().toISOString(), revision_history: history })
    .eq('user_id', userId)
    .eq('id', id);
  if (error) {
    console.error('Error updating evolution content:', error.message);
    return false;
  }
  await insertWaAudit(supabase, { user_id: userId, action: 'evolution_edit', entity_id: id, phone });
  return true;
}

export async function insertEvolution(
  supabase: any,
  ev: {
    user_id: string;
    patient_id: string;
    patient_initials: string;
    input_type: 'text' | 'audio';
    input_content: string;
    output_content: string;
    approach?: string | null;
    audio_url?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('evolutions').insert({
    user_id: ev.user_id,
    patient_id: ev.patient_id,
    patient_initials: ev.patient_initials,
    input_type: ev.input_type,
    input_content: ev.input_content,
    output_content: ev.output_content,
    approach: ev.approach ?? null,
    audio_url: ev.audio_url ?? null,
  });
  if (error) console.error('Error inserting evolution:', error.message);
}

/** Incrementa o contador de sessões do paciente. */
export async function bumpPatientSession(supabase: any, patient: Patient): Promise<void> {
  const { error } = await supabase
    .from('patients')
    .update({
      total_sessions: (patient.total_sessions ?? 0) + 1,
      last_session_at: new Date().toISOString(),
    })
    .eq('id', patient.id);
  if (error) console.error('Error bumping patient session:', error.message);
}

/** Sobe o áudio recebido no bucket session-audios (pasta por user_id). Retorna o path ou null. */
export async function uploadSessionAudio(
  supabase: any,
  userId: string,
  bytes: Uint8Array,
  mimeType: string,
): Promise<string | null> {
  const extMap: Record<string, string> = {
    'audio/ogg': 'ogg', 'audio/opus': 'ogg', 'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/webm': 'webm', 'audio/amr': 'amr',
  };
  const ext = extMap[mimeType] ?? 'ogg';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('session-audios')
    .upload(path, bytes, { contentType: mimeType, upsert: false });
  if (error) {
    console.error('Error uploading session audio:', error.message);
    return null;
  }
  return path;
}
