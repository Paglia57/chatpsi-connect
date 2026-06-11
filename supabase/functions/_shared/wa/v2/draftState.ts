// Estado do rascunho (padrão de captura, spec §6) e da sessão v2, serializado em flow_data (jsonb).
// patchSession faz upsert do objeto inteiro de flow_data (não merge) → SEMPRE ler-modificar-gravar
// o FlowData completo. Estas funções são puras: leem/transformam o objeto, sem IO.

export type DraftTarget = 'new_evolution' | 'edit_evolution' | 'edit_patient' | 'cadastro';

export interface DraftPart {
  kind: string;           // text | audio | image | document
  text: string;           // texto derivado (transcrição/descrição) ou corpo
  audioPath?: string | null;
}

export interface Draft {
  target: DraftTarget;
  patientId?: string;
  evolutionId?: string;          // edit_evolution
  field?: string;                // edit_patient: full_name|initials|approach|main_complaint
  baseText?: string;             // edit_evolution: texto atual como base
  parts: DraftPart[];            // acúmulo multi-mensagem
  cadastro?: Record<string, string>; // cadastro: dados parciais
  cadastroStep?: string;         // cadastro: passo atual (nome|iniciais|abordagem|queixa)
  previewText?: string;          // prévia gerada, aguardando confirmação
  inputType?: 'text' | 'audio';  // origem predominante (p/ evolução)
  audioPath?: string | null;     // áudio a vincular na evolução salva
}

export interface PendingCommand { command: string; raw: string }
export interface NameCandidate { id: string; full_name: string; initials?: string | null }

export interface FlowData {
  draft?: Draft;
  pendingCommand?: PendingCommand;     // desambiguação de comando em rascunho
  selectedEvolutionId?: string;        // sub-máquina de evoluções
  evoList?: NameCandidate[];           // ids da lista de evoluções mostrada (p/ seleção por número)
  patientList?: NameCandidate[];       // ids da lista de pacientes mostrada (p/ seleção por número)
  nameCandidates?: NameCandidate[];    // desambiguação de nome (atalho do apressado)
  pendingIntent?: string;              // comando que aguarda escolha de paciente
}

/** Lê flow_data como FlowData (cópia rasa). */
export function readFlow(flow: unknown): FlowData {
  return flow && typeof flow === 'object' ? { ...(flow as FlowData) } : {};
}

export function readDraft(flow: unknown): Draft | null {
  return readFlow(flow).draft ?? null;
}

/** Concatena as partes de texto do rascunho (ordem de chegada). */
export function joinParts(parts: DraftPart[]): string {
  return (parts ?? []).map((p) => (p.text ?? '').trim()).filter(Boolean).join('\n\n');
}
