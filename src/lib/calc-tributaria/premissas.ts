import { CalcInput, Cenarios, Premissa } from './types';
import {
  DEFAULTS_INPUT,
  INSS_PF_11,
  SALARIO_MINIMO_2026,
  TETO_INSS_2026,
} from './constantes';
import { formatBRL, formatPercent } from './format';

export function montarPremissas(
  input: CalcInput,
  cenarios: Cenarios,
): Premissa[] {
  const premissas: Premissa[] = [];

  premissas.push({
    label: 'Ano-base',
    valor: '2026 (regras tributárias vigentes em janeiro/2026)',
    fonte: 'Receita Federal do Brasil',
  });

  premissas.push({
    label: 'Salário mínimo',
    valor: formatBRL(SALARIO_MINIMO_2026),
  });

  premissas.push({
    label: 'Teto INSS',
    valor: formatBRL(TETO_INSS_2026),
  });

  premissas.push({
    label: 'INSS PF 11% (sobre salário mínimo)',
    valor: `${formatBRL(INSS_PF_11)} / mês`,
  });

  premissas.push({
    label: 'INSS PF 20% (sobre faturamento, limitado ao teto)',
    valor: `${formatBRL(cenarios.pf20.inssMensal)} / mês`,
  });

  const proLaboreInformado =
    input.refinamento?.proLaboreMensal ?? DEFAULTS_INPUT.proLaboreMensal;
  premissas.push({
    label: 'Pró-labore PJ',
    valor:
      proLaboreInformado < SALARIO_MINIMO_2026
        ? `${formatBRL(SALARIO_MINIMO_2026)} (mínimo legal aplicado)`
        : `${formatBRL(proLaboreInformado)}${
            input.refinamento?.proLaboreMensal ? ' (informado)' : ' (default)'
          }`,
  });

  premissas.push({
    label: 'Custo contador',
    valor: `${formatBRL(
      input.refinamento?.custoContadorMensal ?? DEFAULTS_INPUT.custoContadorMensal,
    )} / mês ${input.refinamento?.custoContadorMensal ? '(informado)' : '(default)'}`,
  });

  premissas.push({
    label: 'Despesas dedutíveis (PF, anuais)',
    valor: formatBRL(
      input.refinamento?.despesasDedutiveisAnuais ??
        DEFAULTS_INPUT.despesasDedutiveisAnuais,
    ),
  });

  premissas.push({
    label: 'Origem dos atendimentos',
    valor: traduzirOrigem(
      input.refinamento?.origemAtendimentos ?? DEFAULTS_INPUT.origemAtendimentos,
    ),
  });

  const pj = cenarios.pjSimples;
  premissas.push({
    label: 'Anexo do Simples',
    valor: `Anexo ${pj.anexo} (Fator R = ${formatPercent(pj.fatorR)})`,
  });

  premissas.push({
    label: 'Alíquota efetiva DAS',
    valor: formatPercent(pj.aliquotaEfetiva),
  });

  premissas.push({
    label: 'Redutor do IR (reforma 2026)',
    valor:
      'Aplicado para rendas até R$ 7.350/mês (zera para até R$ 5.000)',
  });

  return premissas;
}

function traduzirOrigem(origem: string): string {
  switch (origem) {
    case 'PROPRIOS':
      return 'Pacientes próprios';
    case 'CONVENIOS':
      return 'Convênios';
    case 'CLINICAS':
      return 'Clínicas / repasse';
    case 'MISTO':
      return 'Misto';
    default:
      return origem;
  }
}
