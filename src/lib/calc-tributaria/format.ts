const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const brlInteiro = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBRL(valor: number): string {
  if (!isFinite(valor)) return 'R$ 0,00';
  return brl.format(valor);
}

export function formatBRLInteiro(valor: number): string {
  if (!isFinite(valor)) return 'R$ 0';
  return brlInteiro.format(valor);
}

export function formatBRLCompact(valor: number): string {
  if (!isFinite(valor)) return 'R$ 0';
  if (Math.abs(valor) >= 1000) {
    const milhares = valor / 1000;
    return `R$ ${milhares.toLocaleString('pt-BR', { maximumFractionDigits: milhares >= 10 ? 0 : 1 })}k`;
  }
  return brlInteiro.format(valor);
}

export function formatPercent(fracao: number, casas = 2): string {
  if (!isFinite(fracao)) return '0%';
  // Defensive: a IA pode retornar o valor já em percentual (ex: 9.29 em vez
  // de 0.0929). Como a carga tributária real nunca passa de 100% (1.0),
  // qualquer valor > 1 é tratado como já-em-percentual e dividido por 100.
  const valorDecimal = fracao > 1 ? fracao / 100 : fracao;
  return percent.format(valorDecimal).replace(/(,\d{2,})/, (m) => {
    const inteiro = m.slice(0, casas + 1);
    return inteiro;
  });
}

export function parseBRLInput(raw: string): number {
  if (!raw) return 0;
  const limpo = raw
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(limpo);
  return isFinite(num) ? num : 0;
}
