import { CalcInput, CenarioPJ } from './types';
import {
  DEFAULTS_INPUT,
  FATOR_R_LIMITE,
  LIMITE_SIMPLES_ANUAL,
  SALARIO_MINIMO_2026,
} from './constantes';
import { calcularDAS, calcularFatorR, escolherAnexo } from './simples';
import { calcularInssEmpregado } from './inss';
import { calcularIRRFProLabore } from './irpf';

export function montarCenarioPJSimples(input: CalcInput): CenarioPJ {
  const fatM = Math.max(0, input.faturamentoMensal);
  const rbt12 = fatM * 12;

  const proLaboreInformado =
    input.refinamento?.proLaboreMensal ?? DEFAULTS_INPUT.proLaboreMensal;
  const proLabore = Math.max(SALARIO_MINIMO_2026, proLaboreInformado);

  const fatorR = calcularFatorR(proLabore * 12, rbt12);
  const anexo = escolherAnexo(fatorR);

  const { aliquotaEfetiva, dasMensal } = calcularDAS(rbt12, anexo, fatM);

  const inssProLabore = calcularInssEmpregado(proLabore);
  const irrfProLabore = calcularIRRFProLabore(proLabore);

  const custoContador =
    input.refinamento?.custoContadorMensal ?? DEFAULTS_INPUT.custoContadorMensal;

  // Líquido na PJ: faturamento − DAS − INSS pró-labore − IRRF pró-labore − contador.
  // (Despesas dedutíveis no PJ não impactam Simples Nacional, então não entram aqui.)
  const liquidoMensal =
    fatM - dasMensal - inssProLabore - irrfProLabore - custoContador;

  const cargaTributariaPercent =
    fatM > 0
      ? (dasMensal + inssProLabore + irrfProLabore + custoContador) / fatM
      : 0;

  const alertas: string[] = [];

  if (anexo === 'V') {
    const proLaboreNecessario = Math.ceil((rbt12 * FATOR_R_LIMITE) / 12);
    alertas.push(
      `Pró-labore representa ${(fatorR * 100).toFixed(1)}% do faturamento (mínimo 28% para Anexo III). Aumentar pró-labore para ~R$ ${proLaboreNecessario.toLocaleString('pt-BR')}/mês move para Anexo III e reduz a alíquota.`,
    );
  }

  if (rbt12 > LIMITE_SIMPLES_ANUAL) {
    alertas.push(
      'Faturamento anual estimado ultrapassa o teto do Simples (R$ 4,8 milhões). Considere Lucro Presumido ou Lucro Real — fora do escopo desta calculadora.',
    );
  }

  if (proLaboreInformado < SALARIO_MINIMO_2026) {
    alertas.push(
      `Pró-labore mínimo legal aplicado: R$ ${SALARIO_MINIMO_2026.toLocaleString('pt-BR')} (salário mínimo).`,
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
    liquidoMensal,
    cargaTributariaPercent,
    previdencia: {
      contribuicaoMensal: inssProLabore,
      baseAposentadoria: proLabore,
      observacao:
        'Contribuição via pró-labore. A base de aposentadoria é proporcional ao pró-labore declarado.',
    },
    alertas,
  };
}
