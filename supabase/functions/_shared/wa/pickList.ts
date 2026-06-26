// Helper reutilizável para listas grandes navegáveis por NÚMERO ou NOME.
// Usado quando a lista não cabe numa lista interativa do WhatsApp (cai no modo texto numerado).

export interface PickItem {
  id: string;
  name: string;
  sub?: string;
}

function norm(s: string): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "").trim();
}

/** Monta o texto "Você tem N {label}: 1. ... \n Me diga o NÚMERO ou o NOME". */
export function numberedList(items: PickItem[], label: string): string {
  const lines = items.map((it, i) => `${i + 1}. ${it.name}${it.sub ? ` (${it.sub})` : ""}`);
  return `Você tem ${items.length} ${label}:\n${lines.join("\n")}\n\nMe diga o *NÚMERO* ou o *NOME* (ou parte do nome).`;
}

/**
 * Resolve a escolha do usuário sobre uma lista ordenada: número no intervalo → item;
 * senão, match por nome tolerante a acento/maiúsculas. Retorna o id, uma lista ambígua,
 * ou null se nada casar.
 */
export function resolvePick(
  text: string,
  ordered: PickItem[],
): { id: string } | { ambiguous: PickItem[] } | null {
  const t = (text ?? "").trim();

  const numMatch = t.match(/^#?\s*(\d{1,3})$/);
  if (numMatch) {
    const n = +numMatch[1];
    if (n >= 1 && n <= ordered.length) return { id: ordered[n - 1].id };
    return null;
  }

  const nt = norm(t);
  if (nt.length < 2) return null;

  const matches = ordered.filter((it) => norm(it.name).includes(nt));
  if (matches.length === 1) return { id: matches[0].id };
  if (matches.length > 1) {
    const starts = matches.filter((m) => norm(m.name).startsWith(nt));
    if (starts.length === 1) return { id: starts[0].id };
    return { ambiguous: matches.slice(0, 10) };
  }
  return null;
}
