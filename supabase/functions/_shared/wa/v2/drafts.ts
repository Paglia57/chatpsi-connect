// Gatilho de prévia do padrão de captura (spec §6): além do botão [Gerar prévia], uma mensagem
// curta como "pronto"/"só isso" sinaliza que o psicólogo terminou de ditar.

import { normalizeText } from './normalize.ts';

const PREVIEW_TRIGGERS = new Set([
  'pronto', 'so isso', 'e isso', 'isso', 'terminei', 'finalizei', 'acabei',
  'gerar previa', 'previa', 'fim', 'pode gerar',
]);

/** A mensagem curta sinaliza fim da captura? (só faz sentido com rascunho aberto) */
export function isPreviewTrigger(text: string): boolean {
  const n = normalizeText(text);
  return n.length > 0 && PREVIEW_TRIGGERS.has(n);
}
