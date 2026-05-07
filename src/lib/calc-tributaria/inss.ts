import {
  INSS_PF_11,
  SALARIO_MINIMO_2026,
  TABELA_INSS_EMPREGADO_2026,
  TETO_INSS_2026,
} from './constantes';

/**
 * INSS do autônomo.
 * - Modalidade 11% (Plano Simplificado): valor fixo de 11% sobre o salário mínimo.
 * - Modalidade 20% (Plano Normal): 20% sobre a base de contribuição declarada,
 *   limitada inferiormente ao salário mínimo e superiormente ao teto do INSS.
 *   Para fins consultivos, usamos o faturamento mensal como base.
 */
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
