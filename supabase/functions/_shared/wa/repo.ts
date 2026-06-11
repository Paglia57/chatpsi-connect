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
    .select('phone, kind, thread_id, locked_patient_id, mode, flow_step, flow_data, last_intent, updated_at')
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

/** Últimas evoluções do paciente (para injetar histórico no contexto). */
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
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) console.error('Error reading evolutions:', error.message);
  return data ?? [];
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
