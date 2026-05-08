// Espelho de src/lib/calc-tributaria/cenarioPJ.ts — manter em sincronia.

import { CalcInput, CenarioPJ } from './types.ts';
import {
  ALIQUOTA_INSS_PROLABORE,
  DEFAULTS_INPUT,
  FATOR_R_LIMITE,
  LIMITE_SIMPLES_ANUAL,
  SALARIO_MINIMO_2026,
} from './constantes.ts';
import { calcularDAS, calcularFatorR } from './simples.ts';
import { calcularIRRFProLabore } from './irpf.ts';
import { formatBRL, formatPercent } from './format.ts';

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

  const fatorR = calcularFatorR(proLabore * 12, rbt12);
  const anexo = 'III' as const;

  const { aliquotaEfetiva, dasMensal } = calcularDAS(rbt12, anexo, fatM);

  const inssProLabore = proLabore * ALIQUOTA_INSS_PROLABORE;
  const irrfProLabore = calcularIRRFProLabore(proLabore);

  const custoContador =
    input.refinamento?.custoContadorMensal ?? DEFAULTS_INPUT.custoContadorMensal;

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

  const proLaboreParaAnexoIII = fatM * FATOR_R_LIMITE;
  if (fatorR < FATOR_R_LIMITE && proLabore < proLaboreParaAnexoIII) {
    alertas.push(
      `Fator R atual está em ${formatPercent(fatorR)}, abaixo do mínimo de 28% exigido para o Anexo III. Na prática, a Receita pode reenquadrar a empresa no Anexo V (alíquotas maiores). Para garantir Anexo III, considere subir o pró-labore para ${formatBRL(proLaboreParaAnexoIII)} ou consulte seu contador.`,
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
