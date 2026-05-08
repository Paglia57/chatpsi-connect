// Espelho de src/lib/calc-tributaria/types.ts — manter em sincronia.

export type AtuacaoAtual = 'PF' | 'PJ' | 'AMBOS' | 'NAO_COMECEI';
export type Prioridade = 'ECONOMIA' | 'APOSENTADORIA';
export type OrigemAtendimentos = 'PROPRIOS' | 'CONVENIOS' | 'CLINICAS' | 'MISTO';

export interface RefinamentoInput {
  contribuicaoInssBRL?: number;
  custoContadorMensal?: number;
  despesasDedutiveisAnuais?: number;
  origemAtendimentos?: OrigemAtendimentos;
  proLaboreMensal?: number;
}

export interface CalcInput {
  faturamentoMensal: number;
  atuacao: AtuacaoAtual;
  prioridade: Prioridade;
  refinamento?: RefinamentoInput;
}

export interface PrevidenciaInfo {
  contribuicaoMensal: number;
  baseAposentadoria: number;
  observacao: string;
}

export interface CenarioPF {
  tipo: 'PF_11' | 'PF_20';
  faturamentoBruto: number;
  inssMensal: number;
  baseIRPF: number;
  irpfMensal: number;
  despesasDedutiveisMensais: number;
  deducaoIRAplicada: number;
  usouDescontoSimplificado: boolean;
  totalDescontosMensais: number;
  custosFixos: number;
  liquidoMensal: number;
  cargaTributariaPercent: number;
  previdencia: PrevidenciaInfo;
  alertas: string[];
}

export interface CenarioPJ {
  tipo: 'PJ_SIMPLES';
  faturamentoBruto: number;
  rbt12: number;
  anexo: 'III' | 'V';
  fatorR: number;
  aliquotaEfetiva: number;
  dasMensal: number;
  proLabore: number;
  inssProLabore: number;
  irrfProLabore: number;
  custoContador: number;
  totalDescontosMensais: number;
  liquidoMensal: number;
  cargaTributariaPercent: number;
  previdencia: PrevidenciaInfo;
  alertas: string[];
}

export type Cenario = CenarioPF | CenarioPJ;
export type TipoCenario = 'PF_11' | 'PF_20' | 'PJ_SIMPLES';

export interface Cenarios {
  pf11: CenarioPF;
  pf20: CenarioPF;
  pjSimples: CenarioPJ;
}

export interface Premissa {
  label: string;
  valor: string;
  fonte?: string;
}

export interface Recomendacao {
  tipoRecomendado: TipoCenario | 'INDEFINIDO';
  titulo: string;
  subtitulo: string;
  economiaMensalBRL: number;
  economiaAnualBRL: number;
  comparadoCom: string;
  alertas: string[];
}

export interface PontoVirada {
  faturamentoVirada: number | null;
  serie: Array<{
    faturamento: number;
    pf11: number;
    pf20: number;
    pjSimples: number;
  }>;
  markerUsuario: number;
  explicacao?: string;
}

export interface CalcOutput {
  input: CalcInput;
  cenarios: Cenarios;
  recomendacao: Recomendacao;
  pontoVirada: PontoVirada;
  premissas: Premissa[];
  geradoEm: string;
}
