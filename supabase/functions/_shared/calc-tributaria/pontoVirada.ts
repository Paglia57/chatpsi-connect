// Espelho de src/lib/calc-tributaria/pontoVirada.ts — manter em sincronia.

import { CalcInput, PontoVirada } from './types.ts';
import { montarCenarioPF11, montarCenarioPF20 } from './cenariosPF.ts';
import { montarCenarioPJSimples } from './cenarioPJ.ts';

const PASSO = 500;
const MIN = 1000;
const MAX = 30000;

function melhorTipo(pf11: number, pf20: number, pj: number): 'PF' | 'PJ' {
  const melhorPF = Math.max(pf11, pf20);
  return pj > melhorPF ? 'PJ' : 'PF';
}

export function calcularPontoVirada(input: CalcInput): PontoVirada {
  const serie: PontoVirada['serie'] = [];
  let virada: number | null = null;
  let melhorAnterior: 'PF' | 'PJ' | null = null;

  for (let f = MIN; f <= MAX; f += PASSO) {
    const sub: CalcInput = { ...input, faturamentoMensal: f };
    const pf11 = montarCenarioPF11(sub).liquidoMensal;
    const pf20 = montarCenarioPF20(sub).liquidoMensal;
    const pj = montarCenarioPJSimples(sub).liquidoMensal;

    serie.push({
      faturamento: f,
      pf11: Math.round(pf11),
      pf20: Math.round(pf20),
      pjSimples: Math.round(pj),
    });

    const melhor = melhorTipo(pf11, pf20, pj);
    if (
      virada === null &&
      melhorAnterior !== null &&
      melhor !== melhorAnterior &&
      melhorAnterior === 'PF' &&
      melhor === 'PJ'
    ) {
      virada = f;
    }
    melhorAnterior = melhor;
  }

  return {
    faturamentoVirada: virada,
    serie,
    markerUsuario: input.faturamentoMensal,
  };
}
