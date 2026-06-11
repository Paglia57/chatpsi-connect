// Centraliza TODOS os ids de botões e linhas de lista interativos da máquina v2.
// Mantém o roteamento (handleReply) e a montagem de prévias coerentes num só lugar.

// --- Menu inicial (3 caminhos) ---
export const MENU_CHOOSE = 'menu_choose';
export const MENU_CREATE = 'menu_create';
export const MENU_FREE = 'menu_free';

// --- Lista de ações do MODO PACIENTE ---
export const PT_EVOLUTION = 'pt_evolution';   // nova evolução (abre rascunho)
export const PT_EVOLUTIONS = 'pt_evolutions'; // sub-máquina: listar evoluções
export const PT_HISTORY = 'pt_history';
export const PT_PLAN = 'pt_plan';
export const PT_VIEW = 'pt_view';
export const PT_EDIT = 'pt_edit';
export const MENU_EXIT = 'ctx_exit';

// --- Prefixos (id dinâmico + entidade) ---
export const PATIENT_PREFIX = 'patient:';
export const EDIT_PREFIX = 'edit:';
export const EVO_PREFIX = 'evo:';

// --- Padrão de captura: rascunho → prévia → confirmação ---
export const DRAFT_PREVIEW = 'draft_preview'; // [Gerar prévia]
export const DRAFT_SAVE = 'draft_save';
export const DRAFT_ADJUST = 'draft_adjust';
export const DRAFT_CANCEL = 'draft_cancel';
export const DRAFT_RESUME = 'draft_resume'; // retomar rascunho após comando

// --- Desambiguação de comando dentro de rascunho (Camada 0) ---
export const DISAMBIG_COMMAND = 'disambig_command'; // [Ver o histórico]
export const DISAMBIG_CONTENT = 'disambig_content'; // [Faz parte da evolução]

// --- Prévia de edição de paciente ---
export const PATIENT_EDIT_CONFIRM = 'pedit_confirm';
export const PATIENT_EDIT_CANCEL = 'pedit_cancel';

// --- Prévia de cadastro de paciente ---
export const CADASTRO_CREATE = 'cad_create';
export const CADASTRO_FIX = 'cad_fix';
export const CADASTRO_CANCEL = 'cad_cancel';

// --- Sub-máquina de evoluções (evolução selecionada) ---
export const EVO_VIEW = 'evo_view';
export const EVO_EDIT = 'evo_edit';
export const EVO_DELETE = 'evo_delete';
export const EVO_BACK = 'evo_back';
export const EVO_DELETE_CONFIRM = 'evo_delete_confirm';
export const EVO_DELETE_CANCEL = 'evo_delete_cancel';

// --- Expiração de contexto (24h) preservando rascunho ---
export const EXPIRY_RESUME = 'expiry_resume';
export const EXPIRY_DISCARD = 'expiry_discard';

// --- Resolução de nome: nenhuma correspondência ---
export const NAME_CREATE = 'name_create';
export const NAME_CHOOSE = 'name_choose';
export const NAME_MENU = 'name_menu';
