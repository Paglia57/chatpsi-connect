// Harness de teste para a máquina de estado v2: um cliente Supabase FAKE encadeável e um
// capturador de mensagens (io). Permite testar transições sem rede nem banco real.

export interface SentMessage {
  type: 'text' | 'buttons' | 'list';
  to: string;
  body: string;
  buttons?: { id: string; title: string }[];
  rows?: { id: string; title: string; description?: string }[];
  label?: string;
  section?: string;
}

export function makeIo() {
  const sent: SentMessage[] = [];
  const io = {
    sendText: (to: string, body: string) => { sent.push({ type: 'text', to, body }); return Promise.resolve(); },
    sendButtons: (to: string, body: string, buttons: { id: string; title: string }[]) => {
      sent.push({ type: 'buttons', to, body, buttons }); return Promise.resolve();
    },
    sendList: (to: string, body: string, label: string, rows: any[], section = 'Pacientes') => {
      sent.push({ type: 'list', to, body, label, rows, section }); return Promise.resolve();
    },
  };
  return { sent, io };
}

export function fakeChat(text = 'EVOLUÇÃO CLÍNICA GERADA PELA IA') {
  return () => Promise.resolve({ text, threadId: 'thr_test', usage: { prompt: 1, completion: 1, total: 2 } });
}

type Row = Record<string, any>;
interface Store {
  patients: Row[];
  evolutions: Row[];
  wa_sessions: Record<string, Row>;
  wa_messages: Row[];
  wa_audit: Row[];
  wa_leads: Row[];
}

function matches(row: Row, filters: [string, string, any][]): boolean {
  for (const [op, col, val] of filters) {
    if (op === 'eq' && row[col] !== val) return false;
    if (op === 'is' && (row[col] ?? null) !== val) return false;
    if (op === 'ilike') {
      const needle = String(val).replace(/%/g, '').toLowerCase();
      if (!String(row[col] ?? '').toLowerCase().includes(needle)) return false;
    }
    if (op === 'gte' && !(row[col] >= val)) return false;
    if (op === 'in' && !(val as any[]).includes(row[col])) return false;
  }
  return true;
}

class Builder {
  filters: [string, string, any][] = [];
  op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' | null = null;
  payload: any = null;
  selectCols: string | null = null;
  orderCol: string | null = null;
  orderAsc = true;
  limitN: number | null = null;

  constructor(private store: Store, private table: keyof Store, private counter: { n: number }) {}

  select(cols: string) { if (!this.op) this.op = 'select'; this.selectCols = cols; return this; }
  insert(payload: any) { this.op = 'insert'; this.payload = payload; return this; }
  update(payload: any) { this.op = 'update'; this.payload = payload; return this; }
  upsert(payload: any) { this.op = 'upsert'; this.payload = payload; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(col: string, val: any) { this.filters.push(['eq', col, val]); return this; }
  is(col: string, val: any) { this.filters.push(['is', col, val]); return this; }
  ilike(col: string, val: any) { this.filters.push(['ilike', col, val]); return this; }
  in(col: string, vals: any[]) { this.filters.push(['in', col, vals]); return this; }
  gte(col: string, val: any) { this.filters.push(['gte', col, val]); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.orderCol = col; this.orderAsc = opts?.ascending ?? true; return this; }
  limit(n: number) { this.limitN = n; return this; }

  maybeSingle() { return Promise.resolve(this._exec('maybe')); }
  single() { return Promise.resolve(this._exec('one')); }
  then(resolve: any, reject?: any) { return Promise.resolve(this._exec('list')).then(resolve, reject); }

  private rowsArray(): Row[] {
    if (this.table === 'wa_sessions') return Object.values(this.store.wa_sessions);
    return this.store[this.table] as Row[];
  }

  private _exec(mode: 'list' | 'maybe' | 'one'): { data: any; error: any } {
    const nextId = () => `${this.table}_${++this.counter.n}`;

    if (this.op === 'upsert') {
      // Apenas wa_sessions usa upsert (por phone), com merge parcial.
      const phone = this.payload.phone;
      const prev = this.store.wa_sessions[phone] ?? { phone };
      this.store.wa_sessions[phone] = { ...prev, ...this.payload };
      return { data: null, error: null };
    }
    if (this.op === 'insert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = items.map((it) => {
        const row: Row = { id: nextId(), ...it };
        if (this.table === 'patients') {
          row.status = row.status ?? 'active';
          row.total_sessions = row.total_sessions ?? 0;
        }
        if (this.table === 'evolutions') row.revision_history = row.revision_history ?? [];
        (this.store[this.table] as Row[]).push(row);
        return row;
      });
      if (mode === 'one' || mode === 'maybe') return { data: inserted[0] ?? null, error: null };
      return { data: null, error: null };
    }
    if (this.op === 'update') {
      const arr = this.rowsArray();
      const hit = arr.filter((r) => matches(r, this.filters));
      for (const r of hit) Object.assign(r, this.payload);
      if (mode === 'one' || mode === 'maybe') return { data: hit[0] ?? null, error: null };
      return { data: null, error: null };
    }
    if (this.op === 'delete') {
      const arr = this.rowsArray();
      const keep = arr.filter((r) => !matches(r, this.filters));
      (this.store[this.table] as Row[]).length = 0;
      (this.store[this.table] as Row[]).push(...keep);
      return { data: null, error: null };
    }
    // select
    let rows = this.rowsArray().filter((r) => matches(r, this.filters));
    if (this.orderCol) {
      rows = rows.slice().sort((a, b) => {
        const av = a[this.orderCol!]; const bv = b[this.orderCol!];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return this.orderAsc ? cmp : -cmp;
      });
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    if (mode === 'one') return { data: rows[0] ?? null, error: null };
    if (mode === 'maybe') return { data: rows[0] ?? null, error: null };
    return { data: rows, error: null };
  }
}

export function makeSupabase(initial: Partial<Store> = {}) {
  const store: Store = {
    patients: initial.patients ?? [],
    evolutions: initial.evolutions ?? [],
    wa_sessions: initial.wa_sessions ?? {},
    wa_messages: initial.wa_messages ?? [],
    wa_audit: initial.wa_audit ?? [],
    wa_leads: initial.wa_leads ?? [],
  };
  const counter = { n: 0 };
  const supabase: any = {
    from: (table: keyof Store) => new Builder(store, table, counter),
    storage: {
      from: () => ({ upload: (_path: string) => Promise.resolve({ error: null }) }),
    },
  };
  return { supabase, store };
}

/** Atalho: cria/garante uma sessão no store. */
export function seedSession(store: { wa_sessions: Record<string, Row> }, phone: string, patch: Row) {
  store.wa_sessions[phone] = { phone, updated_at: new Date().toISOString(), ...patch };
}
