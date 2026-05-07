import { CalcInput, CalcOutput } from './types';
import { montarCenarioPF11, montarCenarioPF20 } from './cenariosPF';
import { montarCenarioPJSimples } from './cenarioPJ';
import { gerarRecomendacao } from './recomendacao';
import { calcularPontoVirada } from './pontoVirada';
import { montarPremissas } from './premissas';

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
} from './types';
