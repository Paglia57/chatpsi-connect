// Espelho de src/lib/calc-tributaria/simples.ts — manter em sincronia.

import {
  SIMPLES_ANEXO_III,
  SIMPLES_ANEXO_V,
  FATOR_R_LIMITE,
  FaixaSimples,
} from './constantes.ts';

export function calcularFatorR(proLabore12m: number, rbt12: number): number {
  if (rbt12 <= 0) return 0;
  return proLabore12m / rbt12;
}

export function escolherAnexo(fatorR: number): 'III' | 'V' {
  return fatorR >= FATOR_R_LIMITE ? 'III' : 'V';
}

function selecionarFaixa(rbt12: number, tabela: FaixaSimples[]): FaixaSimples {
  const faixa = tabela.find((f) => rbt12 <= f.ateRBT12);
  return faixa ?? tabela[tabela.length - 1];
}

export interface DASResultado {
  aliquotaEfetiva: number;
  dasMensal: number;
  faixaIndex: number;
}

export function calcularDAS(
  rbt12: number,
  anexo: 'III' | 'V',
  faturamentoMensal: number,
): DASResultado {
  const tabela = anexo === 'III' ? SIMPLES_ANEXO_III : SIMPLES_ANEXO_V;
  const faixa = selecionarFaixa(rbt12, tabela);
  const faixaIndex = tabela.indexOf(faixa);

  if (rbt12 <= 0) {
    return {
      aliquotaEfetiva: faixa.aliquota,
      dasMensal: faturamentoMensal * faixa.aliquota,
      faixaIndex,
    };
  }

  const aliquotaEfetiva = Math.max(
    0,
    (rbt12 * faixa.aliquota - faixa.deducao) / rbt12,
  );
  const dasMensal = aliquotaEfetiva * faturamentoMensal;

  return { aliquotaEfetiva, dasMensal, faixaIndex };
}
