// Resolução de nome — o atalho do apressado, agora seguro (spec §9).
// Quando a mensagem cita um nome ("evolução da Maria…"), busca na base DO PSICÓLOGO e classifica:
// uma / várias / nenhuma. As redes de proteção (anúncio do contexto + prévia com o nome no topo)
// vivem no orquestrador; aqui só a decisão determinística.

import { normalizeText, tokens } from './normalize.ts';

export interface NamedPatient { id: string; full_name: string; initials?: string | null }
export type MatchClass = 'one' | 'many' | 'none';

export function classifyMatches<T>(matches: T[]): MatchClass {
  return matches.length === 0 ? 'none' : matches.length === 1 ? 'one' : 'many';
}

/**
 * Procura pacientes "mencionados" num texto livre pelo PRIMEIRO NOME (token ≥ 3 letras).
 * Homônimos (vários "Maria") retornam todos → desambiguação. Determinístico (sem fuzzy/IA).
 */
export function findMentionedPatients<T extends NamedPatient>(text: string, patients: T[]): T[] {
  const tk = new Set(tokens(text));
  if (tk.size === 0) return [];
  return patients.filter((p) => {
    const first = normalizeText(p.full_name).split(/\s+/).filter(Boolean)[0];
    return !!first && first.length >= 3 && tk.has(first);
  });
}
