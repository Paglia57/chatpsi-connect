// Espelho de src/lib/calc-tributaria/index.ts — manter em sincronia.

import { CalcInput, CalcOutput } from './types.ts';
import { montarCenarioPF11, montarCenarioPF20 } from './cenariosPF.ts';
import { montarCenarioPJSimples } from './cenarioPJ.ts';
import { gerarRecomendacao } from './recomendacao.ts';
import { calcularPontoVirada } from './pontoVirada.ts';
import { montarPremissas } from './premissas.ts';

export function calcularAnalise(input: CalcInput): CalcOutput {
  const cenarios = {
    pf11: montarCenarioPF11(input),
    pf20: montarCenarioPF20(input),
    pjSimples: montarCenarioPJSimples(input),
  };

  const recomendacao = gerarRecomendacao(cenarios, input);
  const pontoVirada = calcularPontoVirada(input);
  const premissas = montarPremissas(input, cenarios);

  return {
    input,
    cenarios,
    recomendacao,
    pontoVirada,
    premissas,
    geradoEm: new Date().toISOString(),
  };
}

export type {
  AtuacaoAtual,
  Prioridade,
  OrigemAtendimentos,
  CalcInput,
  CalcOutput,
  Cenario,
  CenarioPF,
  CenarioPJ,
  Cenarios,
  Premissa,
  Recomendacao,
  PontoVirada,
  TipoCenario,
} from './types.ts';
