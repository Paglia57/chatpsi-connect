// Normalização de texto para a máquina de estado v2.
// Determinístico, sem IA — usado pela Camada 0 (comandos), pela seleção número-ou-nome
// e pela resolução de nome. Remove acentos para comparar de forma robusta.

// Marcas diacríticas combinantes (U+0300–U+036F) após decompor em NFD.
const COMBINING = new RegExp('[\\u0300-\\u036f]', 'g');

/** trim + minúsculas + sem acentos. */
export function normalizeText(t: string): string {
  return t.trim().toLowerCase().normalize('NFD').replace(COMBINING, '');
}

/** Conta palavras (separadas por espaço) após trim. Vazio = 0. */
export function wordCount(t: string): number {
  const s = t.trim();
  if (!s) return 0;
  return s.split(/\s+/).length;
}

/** Tokens alfanuméricos normalizados (sem pontuação), úteis para casar nomes em texto livre. */
export function tokens(t: string): string[] {
  return normalizeText(t).split(/[^a-z0-9]+/).filter(Boolean);
}
