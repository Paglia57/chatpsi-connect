// Constantes tributárias brasileiras vigentes em 2026.
// Atualizar anualmente. Última revisão: jan/2026.

export const SALARIO_MINIMO_2026 = 1621;
export const TETO_INSS_2026 = 8475.55;

export const INSS_PF_11 = 178.31;
export const INSS_PF_20 = 1695.11;

export const DESCONTO_SIMPLIFICADO_IR_MENSAL = 607.20;

export interface FaixaIR {
  ate: number;
  aliquota: number;
  deducao: number;
}

export const TABELA_IR_MENSAL_2026: FaixaIR[] = [
  { ate: 2428.80, aliquota: 0,     deducao: 0 },
  { ate: 2826.65, aliquota: 0.075, deducao: 182.16 },
  { ate: 3751.05, aliquota: 0.15,  deducao: 394.16 },
  { ate: 4664.68, aliquota: 0.225, deducao: 675.49 },
  { ate: Infinity, aliquota: 0.275, deducao: 908.73 },
];

export function REDUTOR_REFORMA_2026(rendaMensal: number): number {
  if (rendaMensal <= 0) return 0;
  if (rendaMensal <= 5000) return 312.89;
  if (rendaMensal <= 7350) return Math.max(0, 978.62 - 0.133145 * rendaMensal);
  return 0;
}

export interface FaixaSimples {
  ateRBT12: number;
  aliquota: number;
  deducao: number;
}

export const SIMPLES_ANEXO_III: FaixaSimples[] = [
  { ateRBT12: 180000,    aliquota: 0.06,   deducao: 0 },
  { ateRBT12: 360000,    aliquota: 0.112,  deducao: 9360 },
  { ateRBT12: 720000,    aliquota: 0.135,  deducao: 17640 },
  { ateRBT12: 1800000,   aliquota: 0.16,   deducao: 35640 },
  { ateRBT12: 3600000,   aliquota: 0.21,   deducao: 125640 },
  { ateRBT12: 4800000,   aliquota: 0.33,   deducao: 648000 },
];

export const SIMPLES_ANEXO_V: FaixaSimples[] = [
  { ateRBT12: 180000,    aliquota: 0.155,  deducao: 0 },
  { ateRBT12: 360000,    aliquota: 0.18,   deducao: 4500 },
  { ateRBT12: 720000,    aliquota: 0.195,  deducao: 9900 },
  { ateRBT12: 1800000,   aliquota: 0.205,  deducao: 17100 },
  { ateRBT12: 3600000,   aliquota: 0.23,   deducao: 62100 },
  { ateRBT12: 4800000,   aliquota: 0.305,  deducao: 540000 },
];

export const FATOR_R_LIMITE = 0.28;
export const LIMITE_SIMPLES_ANUAL = 4800000;

// Tabela INSS empregado/pró-labore (progressiva, 2026).
export interface FaixaInssEmpregado {
  ate: number;
  aliquota: number;
}

export const TABELA_INSS_EMPREGADO_2026: FaixaInssEmpregado[] = [
  { ate: 1518.00, aliquota: 0.075 },
  { ate: 2793.88, aliquota: 0.09 },
  { ate: 4190.83, aliquota: 0.12 },
  { ate: TETO_INSS_2026, aliquota: 0.14 },
];

export const DEFAULTS_INPUT = {
  contribuicaoInssBRL: INSS_PF_11,
  custoContadorMensal: 200,
  despesasDedutiveisAnuais: 0,
  origemAtendimentos: 'PROPRIOS' as const,
  proLaboreMensal: SALARIO_MINIMO_2026,
};
