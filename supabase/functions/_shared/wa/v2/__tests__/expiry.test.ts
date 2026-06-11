import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { evaluateExpiry, STALE_MS } from '../expiry.ts';

const NOW = 1_700_000_000_000;
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

Deno.test('evaluateExpiry: dentro da janela → fresh', () => {
  assertEquals(
    evaluateExpiry({ updatedAt: iso(STALE_MS - 1000), now: NOW, hasDraft: true, hasContext: true }),
    'fresh',
  );
});

Deno.test('evaluateExpiry: expirou sem rascunho → stale_no_draft', () => {
  assertEquals(
    evaluateExpiry({ updatedAt: iso(STALE_MS + 1000), now: NOW, hasDraft: false, hasContext: true }),
    'stale_no_draft',
  );
});

Deno.test('evaluateExpiry: expirou COM rascunho → stale_with_draft (preserva conteúdo)', () => {
  assertEquals(
    evaluateExpiry({ updatedAt: iso(STALE_MS + 1000), now: NOW, hasDraft: true, hasContext: false }),
    'stale_with_draft',
  );
});

Deno.test('evaluateExpiry: sessão vazia expirada → fresh (nada a expirar)', () => {
  assertEquals(
    evaluateExpiry({ updatedAt: iso(STALE_MS + 1000), now: NOW, hasDraft: false, hasContext: false }),
    'fresh',
  );
});

Deno.test('evaluateExpiry: sem updatedAt → fresh', () => {
  assertEquals(
    evaluateExpiry({ updatedAt: null, now: NOW, hasDraft: true, hasContext: true }),
    'fresh',
  );
});
