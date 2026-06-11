import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { resolveSelection } from '../selection.ts';

interface P { id: string; full_name: string }
const items: P[] = [
  { id: 'a', full_name: 'Maria Silva de Souza' },
  { id: 'b', full_name: 'João Pereira' },
  { id: 'c', full_name: 'Maria Antônia Lima' },
];
const nameOf = (p: P) => p.full_name;

Deno.test('resolveSelection: número escolhe pelo índice 1-based', () => {
  assertEquals(resolveSelection('2', items, nameOf), { kind: 'item', item: items[1] });
});

Deno.test('resolveSelection: número fora do intervalo → none', () => {
  assertEquals(resolveSelection('9', items, nameOf), { kind: 'none' });
});

Deno.test('resolveSelection: nome parcial único resolve', () => {
  assertEquals(resolveSelection('joão', items, nameOf), { kind: 'item', item: items[1] });
  assertEquals(resolveSelection('pereira', items, nameOf), { kind: 'item', item: items[1] });
});

Deno.test('resolveSelection: nome ambíguo retorna candidatos', () => {
  const r = resolveSelection('maria', items, nameOf);
  assertEquals(r.kind, 'ambiguous');
  if (r.kind === 'ambiguous') assertEquals(r.items.length, 2);
});

Deno.test('resolveSelection: match exato desempata ambiguidade', () => {
  const list: P[] = [{ id: '1', full_name: 'Ana' }, { id: '2', full_name: 'Ana Paula' }];
  assertEquals(resolveSelection('Ana', list, nameOf), { kind: 'item', item: list[0] });
});

Deno.test('resolveSelection: inexistente e vazio → none', () => {
  assertEquals(resolveSelection('ZZZ', items, nameOf), { kind: 'none' });
  assertEquals(resolveSelection('   ', items, nameOf), { kind: 'none' });
});
