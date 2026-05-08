// Sanity check do cálculo determinístico da calculadora tributária.
// Reproduz o caso do screenshot do cliente: faturamento R$ 6.500 sem refinamento.
// Executa rodando `tsc` para um diretório temporário e importando os JS gerados.

import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const tmpOut = resolve(root, '.tmp-verify');

rmSync(tmpOut, { recursive: true, force: true });
mkdirSync(tmpOut, { recursive: true });
writeFileSync(resolve(tmpOut, 'package.json'), JSON.stringify({ type: 'commonjs' }));

execSync(
  `npx tsc --target ES2020 --module CommonJS --moduleResolution node --esModuleInterop --outDir "${tmpOut}" "${resolve(root, 'src/lib/calc-tributaria')}/index.ts"`,
  { stdio: 'inherit', cwd: root },
);

const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const { calcularAnalise } = require(resolve(tmpOut, 'index.js'));
const { formatPercent, formatBRL } = require(resolve(tmpOut, 'format.js'));

const out = calcularAnalise({
  faturamentoMensal: 6500,
  atuacao: 'PF',
  prioridade: 'ECONOMIA',
});

console.log('================================================');
console.log('CASO DO CLIENTE: Faturamento R$ 6.500, sem refinamento');
console.log('================================================');

console.log('\n--- Cenário PJ Simples Nacional ---');
console.log('  proLabore:                       ', formatBRL(out.cenarios.pjSimples.proLabore), `(esperado: R$ 1.820,00; cliente reclamou R$ 1.680,00)`);
console.log('  fatorR:                          ', formatPercent(out.cenarios.pjSimples.fatorR), `(esperado: 28,00%; cliente reclamou 25,84%)`);
console.log('  cargaTributariaPercent (decimal):', out.cenarios.pjSimples.cargaTributariaPercent);
console.log('  cargaTributariaPercent (display):', formatPercent(out.cenarios.pjSimples.cargaTributariaPercent), `(esperado: ~17%; cliente reclamou 1.716,00%)`);
console.log('  dasMensal:                       ', formatBRL(out.cenarios.pjSimples.dasMensal));
console.log('  liquidoMensal:                   ', formatBRL(out.cenarios.pjSimples.liquidoMensal));
console.log('  alertas:                         ', out.cenarios.pjSimples.alertas);

console.log('\n--- Cenário PF 11% ---');
console.log('  cargaTributariaPercent (decimal):', out.cenarios.pf11.cargaTributariaPercent);
console.log('  cargaTributariaPercent (display):', formatPercent(out.cenarios.pf11.cargaTributariaPercent), '(cliente reclamou 1.874,00%)');

console.log('\n--- Cenário PF 20% ---');
console.log('  cargaTributariaPercent (decimal):', out.cenarios.pf20.cargaTributariaPercent);
console.log('  cargaTributariaPercent (display):', formatPercent(out.cenarios.pf20.cargaTributariaPercent), '(cliente reclamou 3.597,00%)');

console.log('\n================================================');
console.log('REGRESSÃO formatPercent (deve sempre retornar ~18,74%)');
console.log('================================================');
console.log('  formatPercent(0.1874):', formatPercent(0.1874));
console.log('  formatPercent(18.74): ', formatPercent(18.74));
console.log('  formatPercent(1874):  ', formatPercent(1874));
console.log('  formatPercent(0):     ', formatPercent(0));
console.log('  formatPercent(1):     ', formatPercent(1));

console.log('\n================================================');
console.log('EDGE CASE: Pró-labore manual abaixo de 28% (deve gerar alerta)');
console.log('================================================');
const out2 = calcularAnalise({
  faturamentoMensal: 6500,
  atuacao: 'PJ',
  prioridade: 'ECONOMIA',
  refinamento: { proLaboreMensal: 1700 },
});
console.log('  proLabore:', formatBRL(out2.cenarios.pjSimples.proLabore));
console.log('  fatorR:   ', formatPercent(out2.cenarios.pjSimples.fatorR));
console.log('  alertas:');
out2.cenarios.pjSimples.alertas.forEach((a) => console.log('    -', a));

rmSync(tmpOut, { recursive: true, force: true });
console.log('\nVerificação concluída.');
