// Camada 0 — comandos reservados que funcionam de qualquer lugar (spec §5).
// Determinístico (sem IA): previsível, sem custo, sem risco de gravar comando como prontuário.
//
// Regra "curta e exata": uma mensagem só é comando se for curta (≤ ~3 palavras) E o texto
// inteiro (normalizado) corresponder a uma palavra reservada. Um áudio de três minutos que
// MENCIONA "histórico familiar" nunca é confundido com comando.

import { normalizeText, wordCount } from './normalize.ts';

export type CommandName =
  | 'menu'
  | 'acoes'
  | 'nova_evolucao'
  | 'evolucoes'
  | 'historico'
  | 'plano'
  | 'ficha'
  | 'editar'
  | 'ajuda';

// Tabela comando → frases aceitas (já em forma NORMALIZADA: minúsculas, sem acento).
const TABLE: Array<{ cmd: CommandName; phrases: string[] }> = [
  { cmd: 'menu', phrases: ['menu', 'sair', 'voltar', 'trocar', 'cancelar', 'trocar de paciente', 'inicio'] },
  { cmd: 'acoes', phrases: ['acoes', 'opcoes', 'opcao'] },
  { cmd: 'nova_evolucao', phrases: ['nova evolucao', 'evolucao', 'registrar evolucao'] },
  { cmd: 'evolucoes', phrases: ['evolucoes', 'listar evolucoes'] },
  { cmd: 'historico', phrases: ['historico'] },
  { cmd: 'plano', phrases: ['plano', 'plano de acao'] },
  { cmd: 'ficha', phrases: ['ficha', 'consultar ficha'] },
  { cmd: 'editar', phrases: ['editar', 'editar paciente'] },
  { cmd: 'ajuda', phrases: ['ajuda', 'comandos', '?'] },
];

const MAP: Map<string, CommandName> = (() => {
  const m = new Map<string, CommandName>();
  for (const { cmd, phrases } of TABLE) for (const p of phrases) m.set(p, cmd);
  return m;
})();

/** Comandos que dependem de um paciente travado (spec §5). */
export const REQUIRES_PATIENT: Record<CommandName, boolean> = {
  menu: false,
  acoes: false,
  ajuda: false,
  nova_evolucao: true,
  evolucoes: true,
  historico: true,
  plano: true,
  ficha: true,
  editar: true,
};

/** A mensagem é "curta e exata" o suficiente para ser candidata a comando? */
export function isShortExact(text: string): boolean {
  return wordCount(text) > 0 && wordCount(text) <= 3;
}

/** Retorna o comando reservado se a mensagem for curta-e-exata; senão null. */
export function matchCommand(text: string): CommandName | null {
  if (!isShortExact(text)) return null;
  return MAP.get(normalizeText(text)) ?? null;
}
