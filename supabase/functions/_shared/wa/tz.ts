// Fuso do psicólogo. Default America/Sao_Paulo (UTC−3; Brasil sem horário de verão desde 2019).
// Se um dia precisar de DST/outro fuso, trocar por uma lib de timezone aqui (isolado).

export const TZ = "America/Sao_Paulo";
const SP_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC = local + 3h

export type SpComponents = { y: number; mo: number; d: number; h: number; mi: number };

/** Instante UTC (Date) a partir de componentes de "parede" no fuso SP. */
export function spWallToUtc(y: number, mo: number, d: number, h: number, mi: number): Date {
  return new Date(Date.UTC(y, mo, d, h, mi, 0) + SP_OFFSET_MS);
}

/** Componentes de parede (SP) de um instante UTC. */
export function spParts(utc: Date): SpComponents & { dow: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(utc)) p[part.type] = part.value;
  const y = +p.year, mo = +p.month - 1, d = +p.day;
  let h = +p.hour;
  if (h === 24) h = 0;
  const mi = +p.minute;
  const dow = new Date(Date.UTC(y, mo, d)).getUTCDay();
  return { y, mo, d, h, mi, dow };
}

/** "Agora" como componentes de parede em SP. */
export function nowSP(): SpComponents & { dow: number } {
  return spParts(new Date());
}

/** Início do dia de hoje (00:00 SP) como instante UTC. */
export function startOfTodaySP(): Date {
  const n = nowSP();
  return spWallToUtc(n.y, n.mo, n.d, 0, 0);
}

/** Formata um instante UTC no fuso SP. */
export function formatSP(utc: Date | string, opts: Intl.DateTimeFormatOptions): string {
  const d = typeof utc === "string" ? new Date(utc) : utc;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, ...opts }).format(d);
}

/** "HH:MM" no fuso SP. */
export function fmtHora(utc: Date | string): string {
  return formatSP(utc, { hour: "2-digit", minute: "2-digit" });
}

/** Ex.: "qua 11/06" no fuso SP. */
export function fmtDiaCurto(utc: Date | string): string {
  return formatSP(utc, { weekday: "short", day: "2-digit", month: "2-digit" })
    .replace(".", "").replace(",", "");
}

/** Chave de dia "YYYY-MM-DD" no fuso SP (para agrupar). */
export function diaChaveSP(utc: Date | string): string {
  const p = spParts(typeof utc === "string" ? new Date(utc) : utc);
  return `${p.y}-${String(p.mo + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}
