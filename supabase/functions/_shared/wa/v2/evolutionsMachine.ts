// Sub-máquina de evoluções (spec §8): formatação PURA da lista e dos resumos.
// O roteamento (listar/ver/editar/excluir) e o IO ficam no orquestrador; o repo faz o acesso.

export interface EvoRow {
  id: string;
  created_at: string | null;
  output_content: string | null;
  session_number: number | null;
}

/** Resumo de uma linha (sem quebras), cortado para caber no WhatsApp. */
export function evoSnippet(text: string | null, max = 60): string {
  const s = (text ?? '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** Data dd/mm a partir de um ISO yyyy-mm-dd... */
export function fmtDate(iso: string | null): string {
  const d = (iso ?? '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, dd] = d.split('-');
    void y;
    return `${dd}/${m}`;
  }
  return d;
}

/** Lista numerada das evoluções (spec §8). */
export function formatEvolutionList(patientName: string, evos: EvoRow[]): string {
  if (evos.length === 0) return `Ainda não há evoluções registradas para *${patientName}*.`;
  const lines = evos.map((e, i) => `${i + 1}. ${fmtDate(e.created_at)} — "${evoSnippet(e.output_content)}"`);
  return (
    `*Evoluções — ${patientName}*\n` +
    `${lines.join('\n')}\n\n` +
    `(últimas ${evos.length} · responda com o número ou a data)`
  );
}

/** Texto curto de confirmação de exclusão (confirmação dupla, spec §8). */
export function formatDeleteConfirmation(evo: EvoRow): string {
  return (
    `🗑️ *Excluir esta evolução?*\n\n` +
    `${fmtDate(evo.created_at)} — "${evoSnippet(evo.output_content, 120)}"\n\n` +
    `Esta ação não pode ser desfeita pelo chat.`
  );
}
