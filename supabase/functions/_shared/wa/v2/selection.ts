// Seleção única "número ou nome" (spec §4 "Regra das listas" / §0): toda lista numerada do
// produto — pacientes, evoluções, desambiguação — aceita resposta por número OU por nome.
// Um único padrão, aprendido uma vez.

import { normalizeText } from './normalize.ts';

export type SelectionResult<T> =
  | { kind: 'item'; item: T }       // resolveu para exatamente um (por índice ou nome único)
  | { kind: 'ambiguous'; items: T[] } // o nome casou com vários
  | { kind: 'none' };                 // não casou nada

/**
 * Resolve a resposta do usuário contra uma lista.
 * - Número puro ("2") → item na posição (1-based).
 * - Texto → casa por substring normalizada; empate exato desfaz a ambiguidade.
 */
export function resolveSelection<T>(
  input: string,
  items: T[],
  nameOf: (t: T) => string,
): SelectionResult<T> {
  const raw = (input ?? '').trim();
  if (!raw || items.length === 0) return { kind: 'none' };

  if (/^\d+$/.test(raw)) {
    const idx = parseInt(raw, 10) - 1;
    return idx >= 0 && idx < items.length ? { kind: 'item', item: items[idx] } : { kind: 'none' };
  }

  const norm = normalizeText(raw);
  const matches = items.filter((it) => normalizeText(nameOf(it)).includes(norm));
  if (matches.length === 0) return { kind: 'none' };
  if (matches.length === 1) return { kind: 'item', item: matches[0] };

  // Vários: um match EXATO desempata (ex.: "Ana" quando há "Ana" e "Ana Paula").
  const exact = matches.filter((it) => normalizeText(nameOf(it)) === norm);
  if (exact.length === 1) return { kind: 'item', item: exact[0] };
  return { kind: 'ambiguous', items: matches };
}
