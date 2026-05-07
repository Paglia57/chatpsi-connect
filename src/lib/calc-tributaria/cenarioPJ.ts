import { CalcInput, CenarioPJ } from './types';
import {
  ALIQUOTA_INSS_PROLABORE,
  DEFAULTS_INPUT,
  FATOR_R_LIMITE,
  LIMITE_SIMPLES_ANUAL,
  SALARIO_MINIMO_2026,
} from './constantes';
import { calcularDAS, calcularFatorR } from './simples';
import { calcularIRRFProLabore } from './irpf';

/**
 * Pró-labore otimizado para garantir Fator R ≥ 28% (Anexo III).
 * Regra: 28% do faturamento; se o resultado ficar abaixo do salário mínimo,
 * força para o salário mínimo. Caso o usuário informe um pró-labore explicitamente
 * (>= salário mínimo), respeita o override.
 */
function calcularProLaboreOtimizado(
  faturamentoMensal: number,
  proLaboreInformado?: number,
): number {
  if (
    proLaboreInformado !== undefined &&
    proLaboreInformado >= SALARIO_MINIMO_2026
  ) {
    return proLaboreInformado;
  }
  return Math.max(SALARIO_MINIMO_2026, faturamentoMensal * FATOR_R_LIMITE);
}

export function montarCenarioPJSimples(input: CalcInput): CenarioPJ {
  const fatM = Math.max(0, input.faturamentoMensal);
  const rbt12 = fatM * 12;

  const proLabore = calcularProLaboreOtimizado(
    fatM,
    input.refinamento?.proLaboreMensal,
  );

  // Por construção, Fator R sempre fica ≥ 28% → Anexo III.
  const fatorR = calcularFatorR(proLabore * 12, rbt12);
  const anexo: 'III' = 'III';

  const { aliquotaEfetiva, dasMensal } = calcularDAS(rbt12, anexo, fatM);

  const inssProLabore = proLabore * ALIQUOTA_INSS_PROLABORE;
  const irrfProLabore = calcularIRRFProLabore(proLabore);

  const custoContador =
    input.refinamento?.custoContadorMensal ?? DEFAULTS_INPUT.custoContadorMensal;

  // Pró-labore não é despesa: é dinheiro do sócio. Apenas DAS, INSS, IR e
  // contador entram em totalDescontosMensais.
  const totalDescontosMensais =
    dasMensal + inssProLabore + irrfProLabore + custoContador;
  const liquidoMensal = fatM - totalDescontosMensais;

  const cargaTributariaPercent =
    fatM > 0 ? totalDescontosMensais / fatM : 0;

  const alertas: string[] = [];

  if (rbt12 > LIMITE_SIMPLES_ANUAL) {
    alertas.push(
      'Faturamento anual estimado ultrapassa o teto do Simples (R$ 4,8 milhões). Considere Lucro Presumido ou Lucro Real — fora do escopo desta calculadora.',
    );
  }

  return {
    tipo: 'PJ_SIMPLES',
    faturamentoBruto: fatM,
    rbt12,
    anexo,
    fatorR,
    aliquotaEfetiva,
    dasMensal,
    proLabore,
    inssProLabore,
    irrfProLabore,
    custoContador,
    totalDescontosMensais,
    liquidoMensal,
    cargaTributariaPercent,
    previdencia: {
      contribuicaoMensal: inssProLabore,
      baseAposentadoria: proLabore,
      observacao:
        'Contribuição via pró-labore (11%). A base de aposentadoria é o pró-labore declarado.',
    },
    alertas,
  };
}
