import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { isShortExact, matchCommand, REQUIRES_PATIENT } from '../commands.ts';

Deno.test('matchCommand: palavra reservada curta e exata vira comando', () => {
  assertEquals(matchCommand('menu'), 'menu');
  assertEquals(matchCommand('Menu'), 'menu');
  assertEquals(matchCommand('  SAIR '), 'menu');
  assertEquals(matchCommand('histórico'), 'historico');
  assertEquals(matchCommand('historico'), 'historico');
  assertEquals(matchCommand('evoluções'), 'evolucoes');
  assertEquals(matchCommand('evolução'), 'nova_evolucao');
  assertEquals(matchCommand('ações'), 'acoes');
  assertEquals(matchCommand('plano de ação'), 'plano');
});

Deno.test('matchCommand: distingue singular (nova) de plural (listar)', () => {
  assertEquals(matchCommand('evolução'), 'nova_evolucao');
  assertEquals(matchCommand('evoluções'), 'evolucoes');
});

Deno.test('matchCommand: texto longo que MENCIONA palavra reservada NÃO é comando', () => {
  assertEquals(matchCommand('o paciente trouxe o histórico familiar completo da mãe'), null);
  assertEquals(matchCommand('quero registrar uma nova evolução sobre a sessão de hoje agora'), null);
});

Deno.test('isShortExact: rejeita vazio e frases com mais de 3 palavras', () => {
  assertEquals(isShortExact(''), false);
  assertEquals(isShortExact('menu'), true);
  assertEquals(isShortExact('trocar de paciente'), true); // 3 palavras
  assertEquals(isShortExact('quero trocar de paciente'), false); // 4 palavras
});

Deno.test('matchCommand: frase reservada de 3 palavras ainda casa', () => {
  assertEquals(matchCommand('trocar de paciente'), 'menu');
  assertEquals(matchCommand('consultar ficha'), 'ficha');
});

Deno.test('REQUIRES_PATIENT: comandos clínicos exigem paciente, navegação não', () => {
  assertEquals(REQUIRES_PATIENT.plano, true);
  assertEquals(REQUIRES_PATIENT.evolucoes, true);
  assertEquals(REQUIRES_PATIENT.menu, false);
  assertEquals(REQUIRES_PATIENT.ajuda, false);
});
