// Parser de data/hora em pt-BR para a agenda. Resolve "quinta 15h", "amanhã 10h",
// "dia 12/06 14h" etc. para o próximo horário futuro no fuso do psicólogo (SP).

import { nowSP } from "./tz.ts";

export type ParsedDT = {
  date?: { y: number; mo: number; d: number };
  time?: { h: number; mi: number };
  matched: boolean;
};

const WEEKDAYS: Record<string, number> = {
  domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6,
};

function norm(s: string): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
}

/** Soma `delta` dias a um Y-M-D (lida com viradas de mês). */
function addDays(y: number, mo: number, d: number, delta: number): { y: number; mo: number; d: number } {
  const base = new Date(Date.UTC(y, mo, d));
  base.setUTCDate(base.getUTCDate() + delta);
  return { y: base.getUTCFullYear(), mo: base.getUTCMonth(), d: base.getUTCDate() };
}

/** Extrai a hora (24h) do texto. Aceita "15h", "15:30", "15h30", "às 15". */
function parseTime(t: string): { h: number; mi: number } | undefined {
  let m = t.match(/\b(\d{1,2})[:h](\d{2})\b/); // 15:30 / 15h30
  if (m) return clampTime(+m[1], +m[2]);
  m = t.match(/\b(\d{1,2})\s*h\b/); // 15h
  if (m) return clampTime(+m[1], 0);
  m = t.match(/\bas\s+(\d{1,2})\b/); // às 15
  if (m) return clampTime(+m[1], 0);
  return undefined;
}

function clampTime(h: number, mi: number): { h: number; mi: number } | undefined {
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return undefined;
  return { h, mi };
}

export function parseDateTimePtBr(text: string, now = nowSP()): ParsedDT {
  const t = norm(text);
  const time = parseTime(t);
  let date: { y: number; mo: number; d: number } | undefined;
  let dateMatched = false;

  // dd/mm (ano atual)
  const dm = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (dm) {
    const d = +dm[1], mo = +dm[2] - 1;
    let y = dm[3] ? (dm[3].length === 2 ? 2000 + +dm[3] : +dm[3]) : now.y;
    let cand = { y, mo, d };
    // se a data (sem ano explícito) já passou neste ano, joga para o próximo ano
    if (!dm[3]) {
      const isPast = (cand.mo < now.mo) || (cand.mo === now.mo && cand.d < now.d);
      if (isPast) cand = { y: y + 1, mo, d };
    }
    date = cand;
    dateMatched = true;
  } else if (/\bdepois de amanha\b/.test(t)) {
    date = addDays(now.y, now.mo, now.d, 2);
    dateMatched = true;
  } else if (/\bamanha\b/.test(t)) {
    date = addDays(now.y, now.mo, now.d, 1);
    dateMatched = true;
  } else if (/\bhoje\b/.test(t)) {
    date = { y: now.y, mo: now.mo, d: now.d };
    dateMatched = true;
  } else {
    // dia da semana
    for (const [name, dow] of Object.entries(WEEKDAYS)) {
      const re = new RegExp(`\\b${name}(?:\\s*-?\\s*feira)?\\b`);
      if (re.test(t)) {
        const queVem = /\b(que vem|proxima|proximo)\b/.test(t);
        let delta = (dow - now.dow + 7) % 7;
        if (delta === 0) delta = 7; // "quinta" hoje sendo quinta = próxima quinta
        if (queVem && delta < 7) delta += 7;
        date = addDays(now.y, now.mo, now.d, delta);
        dateMatched = true;
        break;
      }
    }
  }

  return { date, time, matched: dateMatched || !!time };
}
