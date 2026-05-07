import {
  ALIQUOTA_INSS_PROLABORE,
  REDUTOR_REFORMA_2026,
  TABELA_IR_MENSAL_2026,
} from './constantes';

/**
 * IRPF mensal aplicando tabela tradicional 2026 + redutor da reforma 2026.
 * @param baseCalculo Base de cálculo já líquida de INSS e deduções legais.
 * @param rendaMensalParaRedutor Renda total considerada para definir o redutor (default = baseCalculo).
 */
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

/**
 * IRRF sobre pró-labore.
 * INSS contribuinte individual (11%) deduzido da base, depois tabela mensal
 * 2026 + redutor da reforma. Sem desconto simplificado.
 */
export function calcularIRRFProLabore(proLabore: number): number {
  if (proLabore <= 0) return 0;
  const inss = proLabore * ALIQUOTA_INSS_PROLABORE;
  const baseLiquida = Math.max(0, proLabore - inss);
  return calcularIRPFMensal(baseLiquida, proLabore);
}
