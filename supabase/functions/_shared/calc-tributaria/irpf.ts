// Espelho de src/lib/calc-tributaria/irpf.ts — manter em sincronia.

import {
  ALIQUOTA_INSS_PROLABORE,
  REDUTOR_REFORMA_2026,
  TABELA_IR_MENSAL_2026,
} from './constantes.ts';

export function calcularIRPFMensal(
  baseCalculo: number,
  rendaMensalParaRedutor?: number,
): number {
  if (baseCalculo <= 0) return 0;

  const faixa = TABELA_IR_MENSAL_2026.find((f) => baseCalculo <= f.ate);
  if (!faixa) return 0;

  const irBruto = baseCalculo * faixa.aliquota - faixa.deducao;
  const apuradoTradicional = Math.max(0, irBruto);

  const rendaParaRedutor = rendaMensalParaRedutor ?? baseCalculo;
  const redutor = REDUTOR_REFORMA_2026(rendaParaRedutor);

  return Math.max(0, apuradoTradicional - redutor);
}

export function calcularIRRFProLabore(proLabore: number): number {
  if (proLabore <= 0) return 0;
  const inss = proLabore * ALIQUOTA_INSS_PROLABORE;
  const baseLiquida = Math.max(0, proLabore - inss);
  return calcularIRPFMensal(baseLiquida, proLabore);
}
