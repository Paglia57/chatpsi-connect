// Espelho de src/lib/calc-tributaria/inss.ts — manter em sincronia.

import {
  INSS_PF_11,
  SALARIO_MINIMO_2026,
  TABELA_INSS_EMPREGADO_2026,
  TETO_INSS_2026,
} from './constantes.ts';

export function calcularInssPF(
  modalidade: 11 | 20,
  faturamentoMensal: number,
): number {
  if (modalidade === 11) return INSS_PF_11;
  const base = Math.min(
    Math.max(faturamentoMensal, SALARIO_MINIMO_2026),
    TETO_INSS_2026,
  );
  return base * 0.20;
}

export function calcularInssEmpregado(salario: number): number {
  if (salario <= 0) return 0;
  const base = Math.min(salario, TETO_INSS_2026);
  let total = 0;
  let limiteAnterior = 0;
  for (const faixa of TABELA_INSS_EMPREGADO_2026) {
    if (base > faixa.ate) {
      total += (faixa.ate - limiteAnterior) * faixa.aliquota;
      limiteAnterior = faixa.ate;
    } else {
      total += (base - limiteAnterior) * faixa.aliquota;
      break;
    }
  }
  return total;
}
