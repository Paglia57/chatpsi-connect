import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import AppBreadcrumb from '@/components/ui/AppBreadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit, Loader2, RefreshCw, Search, Upload, AlertTriangle } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;
const FN = 'planos-acao-admin';

interface Plano {
  id: string;
  titulo: string | null;
  resumo: string | null;
  link: string | null;
  arquivo_origem: string | null;
  revisado: boolean;
  ativo: boolean;
  atualizado_em: string;
}

interface UploadReport {
  imported: number;
  updated: number;
  problem: number;
  problems: { titulo: string; issues: string[] }[];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const AdminPlanosAcaoContent = () => {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyReview, setOnlyReview] = useState(false);

  const [editing, setEditing] = useState<Plano | null>(null);
  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [report, setReport] = useState<UploadReport | null>(null);
  const [reindexing, setReindexing] = useState(false);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchPlanos = async () => {
    try {
      const { data, error } = await sb
        .from('planos_de_acao')
        .select('id, titulo, resumo, link, arquivo_origem, revisado, ativo, atualizado_em')
        .order('atualizado_em', { ascending: false });
      if (error) throw error;
      setPlanos((data ?? []) as Plano[]);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar planos', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlanos(); }, []);

  const filtered = useMemo(
    () => onlyReview ? planos.filter(p => !p.revisado || !p.link) : planos,
    [planos, onlyReview],
  );

  const handleFiles = async (files: FileList | File[]) => {
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) {
      toast({ title: 'Nenhum PDF', description: 'Selecione arquivos PDF.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    setReport(null);
    setProgress({ done: 0, total: pdfs.length });
    const rep: UploadReport = { imported: 0, updated: 0, problem: 0, problems: [] };

    for (let i = 0; i < pdfs.length; i++) {
      const file = pdfs[i];
      try {
        const pdf_base64 = await fileToBase64(file);
        const { data, error } = await sb.functions.invoke(FN, {
          body: { action: 'ingest', filename: file.name, pdf_base64 },
        });
        if (error) throw error;
        if (data?.status === 'imported') rep.imported++;
        else if (data?.status === 'updated') rep.updated++;
        if (data?.status === 'problem' || data?.problem) {
          rep.problem++;
          rep.problems.push({ titulo: data?.titulo ?? file.name, issues: data?.issues ?? [] });
        }
      } catch (e: any) {
        rep.problem++;
        rep.problems.push({ titulo: file.name, issues: ['erro: ' + (e?.message ?? 'falha')] });
      }
      setProgress({ done: i + 1, total: pdfs.length });
    }

    setReport(rep);
    setUploading(false);
    await fetchPlanos();
    toast({ title: 'Upload concluído', description: `${rep.imported} novos, ${rep.updated} atualizados, ${rep.problem} com problema.` });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { error } = await sb.functions.invoke(FN, {
        body: {
          action: 'update',
          id: editing.id,
          titulo: editing.titulo,
          resumo: editing.resumo,
          link: editing.link,
          ativo: editing.ativo,
        },
      });
      if (error) throw error;
      toast({ title: 'Plano atualizado', description: 'Embedding regerado e marcado como revisado.' });
      setEditing(null);
      await fetchPlanos();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const { data, error } = await sb.functions.invoke(FN, { body: { action: 'reindex' } });
      if (error) throw error;
      toast({ title: 'Reindexação concluída', description: `${data?.reindexed ?? 0}/${data?.total ?? 0} embeddings regerados.` });
    } catch (e: any) {
      toast({ title: 'Erro ao reindexar', description: e.message, variant: 'destructive' });
    } finally {
      setReindexing(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchResults(null);
    try {
      const { data, error } = await sb.functions.invoke(FN, { body: { action: 'search', query } });
      if (error) throw error;
      setSearchResults(data?.results ?? []);
    } catch (e: any) {
      toast({ title: 'Erro na busca', description: e.message, variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <AppBreadcrumb items={[{ label: 'Administração' }, { label: 'Planos de ação' }]} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Planos de ação</h1>
        <p className="text-muted-foreground">
          Catálogo de fichas em pgvector. Suba os PDFs (título, resumo e link são extraídos do conteúdo) e a busca por similaridade alimenta a tool <code>plano_de_acao</code>.
        </p>
      </div>

      {/* Upload */}
      <div
        className="mb-6 border-2 border-dashed rounded-lg p-6 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files); }}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-3">Arraste vários PDFs de ficha aqui ou selecione</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }}
        />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          Selecionar PDFs
        </Button>
        {uploading && <p className="text-sm text-muted-foreground mt-3">Processando {progress.done}/{progress.total}…</p>}
      </div>

      {report && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{report.imported}</strong> novos · <strong>{report.updated}</strong> atualizados · <strong>{report.problem}</strong> com problema.
            {report.problems.length > 0 && (
              <ul className="mt-2 text-xs list-disc pl-5">
                {report.problems.slice(0, 10).map((p, i) => (
                  <li key={i}>{p.titulo} — {p.issues.join(', ')}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Busca de teste */}
      <div className="mb-6 rounded-lg border p-4">
        <Label className="text-sm font-medium">Busca de teste (calibrar limiar)</Label>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Ex.: ansiedade em adolescentes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button variant="outline" onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        {searchResults && (
          <div className="mt-3 space-y-2">
            {searchResults.length === 0 && <p className="text-sm text-muted-foreground">Nenhum resultado acima do limiar.</p>}
            {searchResults.map((r: any) => (
              <div key={r.id} className="text-sm border rounded p-2">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{r.titulo}</span>
                  <Badge variant="secondary">score {Number(r.similarity).toFixed(3)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{r.resumo}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Switch id="rev" checked={onlyReview} onCheckedChange={setOnlyReview} />
          <Label htmlFor="rev" className="text-sm">Só os que precisam de revisão</Label>
        </div>
        <Button variant="outline" size="sm" onClick={handleReindex} disabled={reindexing}>
          {reindexing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Reindexar embeddings
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
              <Skeleton className="h-4 w-64" /><Skeleton className="h-4 w-24" /><Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium max-w-md">
                    <div className="truncate">{p.titulo || '—'}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.resumo}</div>
                  </TableCell>
                  <TableCell>
                    {p.link
                      ? <a href={p.link} target="_blank" rel="noreferrer" className="text-primary text-xs underline">abrir</a>
                      : <Badge variant="destructive">sem link</Badge>}
                  </TableCell>
                  <TableCell>
                    {p.revisado ? <Badge variant="default">revisado</Badge> : <Badge variant="secondary">revisar</Badge>}
                  </TableCell>
                  <TableCell>{p.ativo ? 'Sim' : 'Não'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma ficha {onlyReview ? 'para revisar' : 'cadastrada'}.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Editar */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar ficha</DialogTitle>
            <DialogDescription>Salvar regenera o embedding e marca como revisado.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={editing.titulo ?? ''} onChange={(e) => setEditing({ ...editing, titulo: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Resumo</Label>
                <Textarea rows={6} value={editing.resumo ?? ''} onChange={(e) => setEditing({ ...editing, resumo: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Link</Label>
                <Input value={editing.link ?? ''} onChange={(e) => setEditing({ ...editing, link: e.target.value })} placeholder="https://drive.google.com/..." />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="ativo" checked={editing.ativo} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
                <Label htmlFor="ativo">Ativo (aparece na busca)</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button>
                <Button variant="cta" onClick={handleSaveEdit} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function AdminPlanosAcaoPage() {
  return (
    <AdminGuard>
      <AdminPlanosAcaoContent />
    </AdminGuard>
  );
}
