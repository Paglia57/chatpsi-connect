// Montagem das prévias do padrão de captura (spec §6). Funções PURAS: devolvem { text, buttons }
// e NÃO fazem IO — o orquestrador as envia. Toda prévia de gravação exibe o NOME DO PACIENTE no
// topo: é a última barreira contra gravar na ficha errada.

import * as ids from './ids.ts';

export interface PreviewButton { id: string; title: string }
export interface PreviewMessage { text: string; buttons: PreviewButton[] }

/** Prévia de evolução (nova ou editada). Sempre 3 botões: Salvar / Ajustar / Cancelar. */
export function buildEvolutionPreview(opts: {
  patientName: string;
  dateLabel: string;
  body: string;
}): PreviewMessage {
  return {
    text: `📝 *Evolução — ${opts.patientName} · ${opts.dateLabel}*\n\n${opts.body}`,
    buttons: [
      { id: ids.DRAFT_SAVE, title: 'Salvar' },
      { id: ids.DRAFT_ADJUST, title: 'Ajustar' },
      { id: ids.DRAFT_CANCEL, title: 'Cancelar' },
    ],
  };
}

/** Prévia de edição de paciente: campo: antigo → novo. 2 botões: Confirmar / Cancelar. */
export function buildPatientEditPreview(opts: {
  patientName: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
}): PreviewMessage {
  return {
    text:
      `✏️ *${opts.patientName}*\n\n` +
      `*${opts.fieldLabel}:*\n${opts.oldValue || '—'}  →  ${opts.newValue}`,
    buttons: [
      { id: ids.PATIENT_EDIT_CONFIRM, title: 'Confirmar' },
      { id: ids.PATIENT_EDIT_CANCEL, title: 'Cancelar' },
    ],
  };
}

/** Prévia da ficha completa antes de criar. 3 botões: Criar / Corrigir / Cancelar. */
export function buildCadastroPreview(opts: {
  full_name: string;
  initials: string;
  approach: string;
  main_complaint: string;
}): PreviewMessage {
  return {
    text: [
      '📋 *Nova ficha — confira antes de criar*',
      '',
      `*Nome:* ${opts.full_name || '—'}`,
      `*Iniciais:* ${opts.initials || '—'}`,
      `*Abordagem:* ${opts.approach || '—'}`,
      `*Queixa:* ${opts.main_complaint || '—'}`,
    ].join('\n'),
    buttons: [
      { id: ids.CADASTRO_CREATE, title: 'Criar' },
      { id: ids.CADASTRO_FIX, title: 'Corrigir' },
      { id: ids.CADASTRO_CANCEL, title: 'Cancelar' },
    ],
  };
}
