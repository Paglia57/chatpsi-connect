// Expiração de contexto após 24h sem interação (spec §13), AGORA preservando rascunhos.
// Função pura (recebe `now`) para ser testável sem depender do relógio.

export const STALE_MS = 24 * 60 * 60 * 1000;

export type ExpiryVerdict =
  | 'fresh'              // dentro da janela, ou nada a expirar
  | 'stale_no_draft'    // expirou e não havia rascunho → reinicia no menu (v1)
  | 'stale_with_draft'; // expirou MAS havia rascunho → oferece [Retomar] [Descartar] antes do menu

export function evaluateExpiry(opts: {
  updatedAt: string | null;
  now: number;
  hasDraft: boolean;
  hasContext: boolean; // mode/locked_patient_id/flow_step preenchido
}): ExpiryVerdict {
  const { updatedAt, now, hasDraft, hasContext } = opts;
  if (!updatedAt) return 'fresh';
  const stale = now - new Date(updatedAt).getTime() > STALE_MS;
  if (!stale) return 'fresh';
  if (!hasContext && !hasDraft) return 'fresh'; // sessão vazia: nada a expirar
  return hasDraft ? 'stale_with_draft' : 'stale_no_draft';
}
