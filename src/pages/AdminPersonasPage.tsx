import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import AppBreadcrumb from '@/components/ui/AppBreadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit, History, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';

// Os tipos gerados em integrations/supabase/types.ts ainda não conhecem estas tabelas/RPCs
// novas. Usamos um alias `any` no boundary do supabase-js para não quebrar o build de tipos;
// os dados são tipados localmente pelas interfaces abaixo. (Ver task de regeneração de tipos.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;

const PLACEHOLDER_MARK = '[[PLACEHOLDER]]';

interface Persona {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  active_version_id: string | null;
  model_hint: string | null;
  updated_at: string;
}

interface PersonaVersion {
  id: string;
  persona_id: string;
  version: number;
  content: string;
  note: string | null;
  created_at: string;
  created_by: string | null;
}

type DiffRow = { type: 'eq' | 'add' | 'del'; text: string };

/** Diff linha-a-linha via LCS (sem dependência externa). */
function diffLines(oldText: string, newText: string): DiffRow[] {
  const a = oldText.split('\n');
  const b = newText.split('\n');
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { rows.push({ type: 'eq', text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { rows.push({ type: 'del', text: a[i] }); i++; }
    else { rows.push({ type: 'add', text: b[j] }); j++; }
  }
  while (i < m) { rows.push({ type: 'del', text: a[i] }); i++; }
  while (j < n) { rows.push({ type: 'add', text: b[j] }); j++; }
  return rows;
}

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const rows = useMemo(() => diffLines(oldText, newText), [oldText, newText]);
  return (
    <pre className="text-xs font-mono whitespace-pre-wrap rounded border bg-muted/30 p-3 overflow-x-auto">
      {rows.map((r, idx) => (
        <div
          key={idx}
          className={
            r.type === 'add' ? 'bg-green-500/15 text-green-700 dark:text-green-400'
              : r.type === 'del' ? 'bg-red-500/15 text-red-700 dark:text-red-400'
                : ''
          }
        >
          <span className="select-none opacity-60">{r.type === 'add' ? '+ ' : r.type === 'del' ? '- ' : '  '}</span>
          {r.text || ' '}
        </div>
      ))}
    </pre>
  );
}

const isPlaceholder = (content: string | undefined | null) =>
  !!content && content.trimStart().startsWith(PLACEHOLDER_MARK);

const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleString('pt-BR'); } catch { return iso; }
};

const AdminPersonasContent = () => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [versions, setVersions] = useState<PersonaVersion[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Persona | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [historyOf, setHistoryOf] = useState<Persona | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const { toast } = useToast();

  const versionsById = useMemo(() => {
    const map: Record<string, PersonaVersion> = {};
    for (const v of versions) map[v.id] = v;
    return map;
  }, [versions]);

  const activeContentOf = (p: Persona): string =>
    (p.active_version_id && versionsById[p.active_version_id]?.content) || '';

  const activeVersionNumberOf = (p: Persona): number | null =>
    (p.active_version_id && versionsById[p.active_version_id]?.version) || null;

  const fetchAll = async () => {
    try {
      const [{ data: pData, error: pErr }, { data: vData, error: vErr }] = await Promise.all([
        sb.from('ai_personas').select('id, slug, nome, descricao, active_version_id, model_hint, updated_at').order('nome', { ascending: true }),
        sb.from('ai_persona_versions').select('id, persona_id, version, content, note, created_at, created_by').order('version', { ascending: false }),
      ]);
      if (pErr) throw pErr;
      if (vErr) throw vErr;

      setPersonas((pData || []) as Persona[]);
      setVersions((vData || []) as PersonaVersion[]);

      // Mapeia autores (created_by) -> email, quando disponível.
      const ids = Array.from(new Set(((vData || []) as PersonaVersion[]).map(v => v.created_by).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await sb.from('profiles').select('user_id, email, full_name').in('user_id', ids);
        const map: Record<string, string> = {};
        for (const p of (profs || [])) map[p.user_id] = p.full_name || p.email || p.user_id;
        setAuthors(map);
      }
    } catch (error: any) {
      toast({ title: 'Erro ao carregar personas', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openEdit = (p: Persona) => {
    setEditing(p);
    setEditContent(activeContentOf(p));
    setEditNote('');
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editContent.trim()) {
      toast({ title: 'Conteúdo vazio', description: 'O texto da persona não pode ficar vazio.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await sb.rpc('admin_save_persona_version', {
        p_persona_id: editing.id,
        p_content: editContent,
        p_note: editNote.trim() || null,
      });
      if (error) throw error;
      toast({ title: 'Nova versão salva', description: `Persona "${editing.nome}" atualizada.` });
      setEditing(null);
      await fetchAll();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (persona: Persona, version: PersonaVersion) => {
    setRestoringId(version.id);
    try {
      const { error } = await sb.rpc('admin_rollback_persona', {
        p_persona_id: persona.id,
        p_target_version_id: version.id,
      });
      if (error) throw error;
      toast({ title: 'Versão restaurada', description: `A v${version.version} virou a nova versão ativa.` });
      await fetchAll();
      // Atualiza a persona no diálogo de histórico (active_version_id mudou).
      setHistoryOf(prev => prev ? { ...prev } : prev);
    } catch (error: any) {
      toast({ title: 'Erro ao restaurar', description: error.message, variant: 'destructive' });
    } finally {
      setRestoringId(null);
    }
  };

  const historyVersions = useMemo(
    () => historyOf ? versions.filter(v => v.persona_id === historyOf.id) : [],
    [historyOf, versions],
  );
  // active_version_id atual da persona em histórico (recalcula a partir do estado mais novo).
  const historyActiveId = historyOf
    ? personas.find(p => p.id === historyOf.id)?.active_version_id ?? null
    : null;

  return (
    <div className="container mx-auto py-8 px-4">
      <AppBreadcrumb items={[{ label: 'Administração' }, { label: 'Personas da IA' }]} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Personas da IA</h1>
        <p className="text-muted-foreground">
          Prompts das personas versionados no banco. Editar cria uma nova versão; é possível ver o histórico e restaurar.
        </p>
      </div>

      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          As personas marcadas como <strong>fallback</strong> ainda usam a cópia-base do código (placeholder não preenchido).
          As personas de <strong>Assistant</strong> (clínico web/WhatsApp, vendas, marketing, plano de ação) <strong>ainda não
          alteram o atendimento</strong> ao serem editadas — a troca efetiva virá na migração para a Responses API. Por ora, o texto fica salvo.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Versão ativa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Atualizado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personas.map((p) => {
                const fallback = isPlaceholder(activeContentOf(p)) || !p.active_version_id;
                const activeNum = activeVersionNumberOf(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.nome}
                      {p.descricao && <div className="text-xs text-muted-foreground max-w-md truncate">{p.descricao}</div>}
                    </TableCell>
                    <TableCell><code className="text-xs">{p.slug}</code></TableCell>
                    <TableCell>{activeNum ? `v${activeNum}` : '—'}</TableCell>
                    <TableCell>
                      {fallback
                        ? <Badge variant="destructive">usando fallback</Badge>
                        : <Badge variant="default">no banco</Badge>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDate(p.updated_at)}</TableCell>
                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                        <Edit className="w-4 h-4 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setHistoryOf(p)}>
                        <History className="w-4 h-4 mr-1" /> Histórico
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog: editar (salva nova versão) */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar persona — {editing?.nome}</DialogTitle>
            <DialogDescription>
              Salvar cria uma <strong>nova versão</strong> e a torna ativa. O histórico anterior é preservado.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Conteúdo (system prompt)</label>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={16}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nota / motivo da mudança (opcional)</label>
                <Input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Ex: ajuste de tom na seção de conduta"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button>
                <Button variant="cta" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Salvar nova versão
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: histórico + diff + rollback */}
      <Dialog open={!!historyOf} onOpenChange={(o) => !o && setHistoryOf(null)}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico — {historyOf?.nome}</DialogTitle>
            <DialogDescription>Cada versão é imutável. Restaurar cria uma nova versão com o conteúdo escolhido.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[64vh] pr-3">
            <div className="space-y-4">
              {historyVersions.map((v) => {
                const prev = historyVersions.find(x => x.version === v.version - 1);
                const isActive = v.id === historyActiveId;
                return (
                  <div key={v.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant={isActive ? 'default' : 'secondary'}>v{v.version}{isActive ? ' · ativa' : ''}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {fmtDate(v.created_at)} · {v.created_by ? (authors[v.created_by] || 'admin') : 'Sistema (seed)'}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isActive || restoringId === v.id}
                        onClick={() => historyOf && handleRestore(historyOf, v)}
                      >
                        {restoringId === v.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                        Restaurar
                      </Button>
                    </div>
                    {v.note && <p className="text-xs italic text-muted-foreground">"{v.note}"</p>}
                    {prev ? (
                      <details>
                        <summary className="text-xs cursor-pointer text-primary">Ver diff (v{prev.version} → v{v.version})</summary>
                        <div className="mt-2"><DiffView oldText={prev.content} newText={v.content} /></div>
                      </details>
                    ) : (
                      <details>
                        <summary className="text-xs cursor-pointer text-primary">Ver conteúdo</summary>
                        <pre className="mt-2 text-xs font-mono whitespace-pre-wrap rounded border bg-muted/30 p-3 overflow-x-auto">{v.content}</pre>
                      </details>
                    )}
                  </div>
                );
              })}
              {historyVersions.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma versão encontrada.</p>
              )}
            </div>
          </ScrollArea>
          <Separator />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function AdminPersonasPage() {
  return (
    <AdminGuard>
      <AdminPersonasContent />
    </AdminGuard>
  );
}
