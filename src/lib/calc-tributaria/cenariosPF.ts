import { CalcInput, CenarioPF } from './types';
import {
  DESCONTO_SIMPLIFICADO_IR_MENSAL,
  INSS_PF_11,
  SALARIO_MINIMO_2026,
  TETO_INSS_2026,
} from './constantes';
import { calcularInssPF } from './inss';
import { calcularIRPFMensal } from './irpf';

function montarPrevidencia(
  modalidade: 11 | 20,
  faturamentoMensal: number,
  inssMensal: number,
) {
  if (modalidade === 11) {
    return {
      contribuicaoMensal: INSS_PF_11,
      baseAposentadoria: SALARIO_MINIMO_2026,
      observacao:
        'Plano Simplificado: contribui sobre o salário mínimo. Aposentadoria limitada a 1 salário mínimo.',
    };
  }
  const base = Math.min(
    Math.max(faturamentoMensal, SALARIO_MINIMO_2026),
    TETO_INSS_2026,
  );
  return {
    contribuicaoMensal: inssMensal,
    baseAposentadoria: base,
    observacao:
      'Plano Normal: 20% sobre o faturamento (limitado ao teto). Aposentadoria proporcional à base contribuída.',
  };
}

function montarCenarioPF(
  input: CalcInput,
  modalidade: 11 | 20,
): CenarioPF {
  const fatM = Math.max(0, input.faturamentoMensal);
  const inssMensal = calcularInssPF(modalidade, fatM);
  const despesasAnuais = Math.max(
    0,
    input.refinamento?.despesasDedutiveisAnuais ?? 0,
  );
  const despesasMensais = despesasAnuais / 12;

  // Aplica a melhor opção: dedução por despesas reais OU desconto simplificado.
  const deducaoIRAplicada = Math.max(
    despesasMensais,
    DESCONTO_SIMPLIFICADO_IR_MENSAL,
  );
  const usouDescontoSimplificado = deducaoIRAplicada > despesasMensais;

  const baseIRPF = Math.max(0, fatM - inssMensal - deducaoIRAplicada);
  const irpfMensal = calcularIRPFMensal(baseIRPF, fatM);

  const liquidoMensal = fatM - inssMensal - irpfMensal;
  const totalDescontosMensais = inssMensal + irpfMensal;
  const cargaTributariaPercent = fatM > 0 ? totalDescontosMensais / fatM : 0;

  const alertas: string[] = [];
  if (despesasMensais > fatM * 0.8 && fatM > 0) {
    alertas.push(
      'Despesas dedutíveis muito altas em relação ao faturamento. Verifique com seu contador se todas são realmente dedutíveis pelo Carnê-Leão.',
    );
  }

  return {
    tipo: modalidade === 11 ? 'PF_11' : 'PF_20',
    faturamentoBruto: fatM,
    inssMensal,
    baseIRPF,
    irpfMensal,
    despesasDedutiveisMensais: despesasMensais,
    deducaoIRAplicada,
    usouDescontoSimplificado,
    totalDescontosMensais,
    custosFixos: 0,
    liquidoMensal,
    cargaTributariaPercent,
    previdencia: montarPrevidencia(modalidade, fatM, inssMensal),
    alertas,
  };
}

export function montarCenarioPF11(input: CalcInput): CenarioPF {
  return montarCenarioPF(input, 11);
}

export function montarCenarioPF20(input: CalcInput): CenarioPF {
  return montarCenarioPF(input, 20);
}
