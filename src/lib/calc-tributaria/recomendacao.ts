import { CalcInput, Cenarios, Recomendacao, TipoCenario } from './types';
import { formatBRL } from './format';

const NOMES: Record<TipoCenario, string> = {
  PF_11: 'Pessoa Física (INSS 11%)',
  PF_20: 'Pessoa Física (INSS 20%)',
  PJ_SIMPLES: 'Pessoa Jurídica (Simples Nacional)',
};

interface CenarioComLiquido {
  tipo: TipoCenario;
  liquido: number;
}

function ordenarPorLiquido(cenarios: Cenarios): CenarioComLiquido[] {
  const lista: CenarioComLiquido[] = [
    { tipo: 'PF_11', liquido: cenarios.pf11.liquidoMensal },
    { tipo: 'PF_20', liquido: cenarios.pf20.liquidoMensal },
    { tipo: 'PJ_SIMPLES', liquido: cenarios.pjSimples.liquidoMensal },
  ];
  return lista.sort((a, b) => b.liquido - a.liquido);
}

export function gerarRecomendacao(
  cenarios: Cenarios,
  input: CalcInput,
): Recomendacao {
  const fat = input.faturamentoMensal;
  const alertas: string[] = [];

  if (fat <= 0) {
    return {
      tipoRecomendado: 'INDEFINIDO',
      titulo: 'Informe seu faturamento para começar',
      subtitulo:
        'Insira o valor que você fatura por mês para gerar uma recomendação personalizada.',
      economiaMensalBRL: 0,
      economiaAnualBRL: 0,
      comparadoCom: '',
      alertas,
    };
  }

  if (fat < 5000) {
    const ranking = ordenarPorLiquido(cenarios);
    const segundoNaoPF11 = ranking.find((c) => c.tipo !== 'PF_11');
    const economia = Math.max(
      0,
      cenarios.pf11.liquidoMensal - (segundoNaoPF11?.liquido ?? 0),
    );
    alertas.push(
      'Abaixo de R$ 5.000/mês, os custos fixos do PJ (DAS mínimo + contador) tornam a Pessoa Física mais vantajosa, mesmo que o cálculo bruto pareça apertado.',
    );
    return {
      tipoRecomendado: 'PF_11',
      titulo: 'Continue como Pessoa Física (INSS 11%)',
      subtitulo:
        'Para o seu faturamento atual, abrir CNPJ não compensa pelos custos de manutenção.',
      economiaMensalBRL: economia,
      economiaAnualBRL: economia * 12,
      comparadoCom: 'comparado a abrir CNPJ no Simples Nacional',
      alertas,
    };
  }

  const ranking = ordenarPorLiquido(cenarios);
  const vencedor = ranking[0];
  const segundo = ranking[1];

  if (input.prioridade === 'APOSENTADORIA') {
    const pf20 = cenarios.pf20;
    const diferenca = vencedor.liquido - pf20.liquidoMensal;
    if (vencedor.tipo !== 'PF_20' && diferenca <= 300) {
      const economiaPerdida = diferenca;
      return {
        tipoRecomendado: 'PF_20',
        titulo: 'Pessoa Física com INSS 20% (foco em aposentadoria)',
        subtitulo: `Você priorizou aposentadoria. Custa apenas ${formatBRL(economiaPerdida)}/mês a mais que a opção mais barata, mas garante base previdenciária sobre o teto (${formatBRL(pf20.previdencia.baseAposentadoria)}) em vez do salário mínimo.`,
        economiaMensalBRL: 0,
        economiaAnualBRL: 0,
        comparadoCom: `vs. ${NOMES[vencedor.tipo]}`,
        alertas,
      };
    }
  }

  const economia = vencedor.liquido - segundo.liquido;

  return {
    tipoRecomendado: vencedor.tipo,
    titulo: `${tituloDoVencedor(vencedor.tipo)}`,
    subtitulo: subtituloDoVencedor(vencedor.tipo, economia),
    economiaMensalBRL: economia,
    economiaAnualBRL: economia * 12,
    comparadoCom: `vs. ${NOMES[segundo.tipo]}`,
    alertas,
  };
}

function tituloDoVencedor(tipo: TipoCenario): string {
  switch (tipo) {
    case 'PJ_SIMPLES':
      return 'Abrir CNPJ no Simples Nacional';
    case 'PF_20':
      return 'Pessoa Física com INSS 20%';
    case 'PF_11':
    default:
      return 'Pessoa Física com INSS 11%';
  }
}

function subtituloDoVencedor(tipo: TipoCenario, economia: number): string {
  if (economia <= 0) {
    return 'Os cenários estão muito próximos. Considere fatores não financeiros (burocracia, previsibilidade, aposentadoria).';
  }
  switch (tipo) {
    case 'PJ_SIMPLES':
      return `Você economiza ${formatBRL(economia)} por mês mantendo um CNPJ no Simples Nacional.`;
    case 'PF_20':
      return `Você economiza ${formatBRL(economia)} por mês como PF com INSS 20% — equilíbrio entre carga atual e aposentadoria.`;
    case 'PF_11':
    default:
      return `Você economiza ${formatBRL(economia)} por mês mantendo Pessoa Física com INSS 11%.`;
  }
}
