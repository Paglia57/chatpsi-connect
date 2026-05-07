import {
  INSS_PF_11,
  INSS_PF_20,
  TABELA_INSS_EMPREGADO_2026,
  TETO_INSS_2026,
} from './constantes';

export function calcularInssPF(modalidade: 11 | 20): number {
  return modalidade === 20 ? INSS_PF_20 : INSS_PF_11;
}

/**
 * INSS empregado/pró-labore com tabela progressiva por faixas.
 * O cálculo é feito por faixa: cada parte do salário paga a alíquota da sua faixa.
 */
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
