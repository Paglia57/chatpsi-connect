import { CalcInput } from './types';

const KEY = 'chatpsi:calc-trib:last-input';

export function loadLastInput(): Partial<CalcInput> | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed as Partial<CalcInput>;
  } catch {
    return null;
  }
}

export function saveLastInput(input: CalcInput): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(input));
  } catch {
    // Falha silenciosa: localStorage indisponível (modo privado, cota cheia, etc.)
  }
}

export function clearLastInput(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Falha silenciosa
  }
}
