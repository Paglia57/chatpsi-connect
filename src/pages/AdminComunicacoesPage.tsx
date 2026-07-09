import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import AppBreadcrumb from '@/components/ui/AppBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Send, Eye, Pencil, Trash2, Megaphone, Upload, FileText, Image as ImageIcon, Video, Type } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;

interface Communication {
  id: string;
  name: string;
  description: string | null;
  kind: 'text' | 'document' | 'image' | 'video';
  body_text: string | null;
  media_url: string | null;
  media_filename: string | null;
  template_name: string | null;
  template_lang: string | null;
  category: 'utility' | 'marketing';
  dedupe: boolean;
  active: boolean;
}

const EMPTY: Communication = {
  id: '', name: '', description: '', kind: 'text', body_text: '', media_url: '', media_filename: '',
  template_name: '', template_lang: 'pt_BR', category: 'utility', dedupe: true, active: true,
};

const KIND_ICON: Record<string, JSX.Element> = {
  text: <Type className="h-4 w-4" />, document: <FileText className="h-4 w-4" />,
  image: <ImageIcon className="h-4 w-4" />, video: <Video className="h-4 w-4" />,
};
const ACCEPT: Record<string, string> = { document: '.pdf', image: 'image/*', video: 'video/mp4' };

// heurística simples: alerta quando o texto parece promocional (Meta trata como marketing)
const PROMO = /\b(promo|promoç|desconto|oferta|assine|assinatura|off|grátis por|cupom|imperd|compre|black)\b/i;

function AdminComunicacoesContent() {
  const { toast } = useToast();
  const [items, setItems] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Communication | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [sendFor, setSendFor] = useState<Communication | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sb.from('communications').select('*').order('created_at', { ascending: true });
    if (error) toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    setItems(data || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const b64: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const { data, error } = await sb.functions.invoke('admin-upload-media', {
        body: { filename: file.name, content_type: file.type || 'application/octet-stream', data_base64: b64 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setEditing((e) => e ? { ...e, media_url: data.url, media_filename: file.name } : e);
      toast({ title: 'Arquivo enviado', description: file.name });
    } catch (e: any) {
      toast({ title: 'Falha no upload', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const saveForm = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast({ title: 'Dê um nome à comunicação', variant: 'destructive' }); return; }
    if (editing.kind !== 'text' && !editing.media_url) { toast({ title: 'Anexe o arquivo da mídia', variant: 'destructive' }); return; }
    setSavingForm(true);
    const payload = {
      name: editing.name, description: editing.description, kind: editing.kind,
      body_text: editing.body_text, media_url: editing.media_url || null, media_filename: editing.media_filename || null,
      template_name: editing.template_name || null, template_lang: editing.template_lang || 'pt_BR',
      category: editing.category, dedupe: editing.dedupe, active: editing.active, updated_at: new Date().toISOString(),
    };
    const { error } = editing.id
      ? await sb.from('communications').update(payload).eq('id', editing.id)
      : await sb.from('communications').insert(payload);
    setSavingForm(false);
    if (error) { toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }); return; }
    toast({ title: editing.id ? 'Comunicação atualizada' : 'Comunicação criada' });
    setEditing(null);
    load();
  };

  const remove = async (c: Communication) => {
    if (!confirm(`Excluir "${c.name}"?`)) return;
    const { error } = await sb.from('communications').delete().eq('id', c.id);
    if (error) { toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Excluída' });
    load();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <AppBreadcrumb items={[{ label: 'Administração', href: '/admin' }, { label: 'Comunicações' }]} />
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Comunicações e Notificações</h1>
            <p className="text-sm text-muted-foreground">Mensagens salvas para disparar aos usuários pelo WhatsApp.</p>
          </div>
        </div>
        <Button variant="cta" onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="h-4 w-4" /> Nova comunicação
        </Button>
      </div>

      <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
        <b>Como o custo funciona:</b> quem está na janela de 24h (mandou msg ao bot) recebe <b>grátis</b>.
        Quem está fora só recebe se a comunicação tiver um <b>template aprovado</b> (utility ~R$0,035 · marketing ~R$0,32 por entrega).
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma comunicação ainda. Crie a primeira.</p>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <div key={c.id} className="border rounded-lg p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">{KIND_ICON[c.kind]}</span>
                  <span className="font-semibold">{c.name}</span>
                  <Badge variant={c.category === 'marketing' ? 'destructive' : 'secondary'}>{c.category}</Badge>
                  {c.template_name ? <Badge variant="outline">template: {c.template_name}</Badge>
                    : <Badge variant="outline" className="text-amber-600 border-amber-300">só janela aberta</Badge>}
                </div>
                {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
              </div>
              <div className="flex flex-wrap gap-1.5 shrink-0">
                <Button size="sm" variant="cta" onClick={() => setSendFor(c)}><Send className="h-4 w-4" /> Disparar</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing({ ...c })}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => remove(c)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- criar/editar ---- */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar comunicação' : 'Nova comunicação'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Ex.: Nova funcionalidade X" />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição (interna)</Label>
                <Input value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={editing.kind} onValueChange={(v) => setEditing({ ...editing, kind: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="document">Documento (PDF)</SelectItem>
                      <SelectItem value="image">Imagem</SelectItem>
                      <SelectItem value="video">Vídeo / GIF (mp4)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria (fora da janela)</Label>
                  <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utility">Utility (~R$0,035)</SelectItem>
                      <SelectItem value="marketing">Marketing (~R$0,32)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editing.kind !== 'text' && (
                <div className="space-y-1.5">
                  <Label>Arquivo ({editing.kind === 'document' ? 'PDF' : editing.kind === 'image' ? 'imagem' : 'mp4'})</Label>
                  <div className="flex items-center gap-2">
                    <input id="media-file" type="file" accept={ACCEPT[editing.kind]} className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                    <Button type="button" variant="outline" size="sm" disabled={uploading}
                      onClick={() => document.getElementById('media-file')?.click()}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Enviar arquivo
                    </Button>
                    {editing.media_url && <a href={editing.media_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline truncate">{editing.media_filename || 'ver arquivo'}</a>}
                  </div>
                  <p className="text-[11px] text-muted-foreground">GIF: envie como .mp4 (o WhatsApp reproduz vídeo curto).</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>{editing.kind === 'text' ? 'Texto da mensagem' : 'Legenda / texto'}</Label>
                <Textarea rows={5} value={editing.body_text ?? ''} onChange={(e) => setEditing({ ...editing, body_text: e.target.value })}
                  placeholder={'Use {{nome}} para o primeiro nome. Quebras de linha são respeitadas.'} />
                {PROMO.test(editing.body_text ?? '') && editing.category === 'utility' && (
                  <p className="text-[11px] text-amber-600">⚠ O texto parece promocional — a Meta pode reclassificar como marketing. Considere ajustar ou marcar como marketing.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Template Meta (fora da janela)</Label>
                  <Input value={editing.template_name ?? ''} onChange={(e) => setEditing({ ...editing, template_name: e.target.value })} placeholder="ex.: manual_whatsapp" />
                </div>
                <div className="space-y-1.5">
                  <Label>Idioma do template</Label>
                  <Input value={editing.template_lang ?? 'pt_BR'} onChange={(e) => setEditing({ ...editing, template_lang: e.target.value })} />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">Sem template, a comunicação só alcança quem está na janela aberta (grátis). O template precisa ser aprovado no WhatsApp Manager.</p>

              <div className="flex items-center gap-2">
                <Checkbox checked={editing.dedupe} onCheckedChange={(v) => setEditing({ ...editing, dedupe: v === true })} id="dedupe" />
                <Label htmlFor="dedupe" className="text-sm">Não reenviar a quem já recebeu esta comunicação</Label>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button variant="cta" onClick={saveForm} disabled={savingForm}>
                  {savingForm && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {sendFor && <SendDialog comm={sendFor} onClose={() => setSendFor(null)} />}
    </div>
  );
}

interface TplStatus {
  checking: boolean;
  found?: boolean;
  status?: string; // APPROVED | PENDING | REJECTED | NOT_FOUND | UNKNOWN
  rejectedReason?: string | null;
}

function SendDialog({ comm, onClose }: { comm: Communication; onClose: () => void }) {
  const { toast } = useToast();
  const [audience, setAudience] = useState<'active' | 'inactive' | 'all'>('active');
  const [testPhone, setTestPhone] = useState('');
  const [busy, setBusy] = useState<null | 'preview' | 'send' | 'test' | 'tpl'>(null);
  const [result, setResult] = useState<any>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tpl, setTpl] = useState<TplStatus | null>(comm.template_name ? { checking: true } : null);

  const checkTemplate = useCallback(async () => {
    if (!comm.template_name) { setTpl(null); return; }
    setTpl({ checking: true });
    const { data, error } = await sb.functions.invoke('admin-wa-templates', {
      body: { action: 'status', name: comm.template_name, lang: comm.template_lang || 'pt_BR' },
    });
    if (error || data?.error) { setTpl({ checking: false, status: 'UNKNOWN' }); return; }
    setTpl({ checking: false, found: data.found, status: data.found ? data.status : 'NOT_FOUND', rejectedReason: data.rejectedReason });
  }, [comm.template_name, comm.template_lang]);

  useEffect(() => { checkTemplate(); }, [checkTemplate]);

  const createTemplate = async () => {
    setBusy('tpl');
    try {
      const { data, error } = await sb.functions.invoke('admin-wa-templates', {
        body: { action: 'create_from_communication', communication_id: comm.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: data.already_exists ? 'Template já existe na Meta' : 'Template enviado pra aprovação',
        description: data.already_exists ? `Status: ${data.status}` : 'Utility costuma aprovar em minutos/horas. Atualize o status antes de disparar.',
      });
      checkTemplate();
    } catch (e: any) {
      toast({ title: 'Falha ao criar template', description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const call = async (payload: Record<string, unknown>, kind: 'preview' | 'send' | 'test') => {
    setBusy(kind); setResult(null);
    try {
      const { data, error } = await sb.functions.invoke('admin-send-communication', { body: { communication_id: comm.id, ...payload } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      const s = data.summary;
      if (kind === 'preview') toast({ title: 'Simulação pronta', description: `${s?.total ?? 0} destinatários — nada enviado.` });
      else if (kind === 'test') toast({ title: 'Teste enviado', description: 'Confira o WhatsApp.' });
      else toast({
        title: 'Envio concluído',
        description: `Grátis: ${s?.sent_free ?? 0} · Template: ${s?.sent_template ?? 0}` +
          ((s?.skipped_template_not_approved ?? 0) > 0 ? ` · ${s.skipped_template_not_approved} não receberam (template não aprovado)` : ''),
      });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Disparar: {comm.name}</DialogTitle>
          <DialogDescription>Janela aberta = grátis. Fora da janela só com template aprovado ({comm.category}).</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Público</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Assinantes ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
                <SelectItem value="all">Todos com WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* alcance fora da janela de 24h: depende do template aprovado na Meta */}
          <div className="rounded-md border p-3 text-xs space-y-2">
            {!comm.template_name ? (
              <p className="text-amber-700">
                <b>Sem template:</b> só recebe quem usou o bot nas últimas 24h. Pra alcançar <b>todos</b>,
                salve a comunicação com um nome de template e crie ele na Meta aqui.
              </p>
            ) : tpl?.checking ? (
              <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Verificando template “{comm.template_name}” na Meta…</p>
            ) : tpl?.status === 'APPROVED' ? (
              <p className="text-emerald-700"><b>✓ Template aprovado</b> ({comm.template_name}) — alcança todos, dentro e fora da janela de 24h.</p>
            ) : tpl?.status === 'NOT_FOUND' ? (
              <div className="space-y-2">
                <p className="text-red-600"><b>✗ O template “{comm.template_name}” não existe na Meta.</b> Fora da janela de 24h ninguém recebe até ele ser criado e aprovado.</p>
                <Button size="sm" variant="outline" disabled={!!busy} onClick={createTemplate}>
                  {busy === 'tpl' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Criar template na Meta agora
                </Button>
              </div>
            ) : tpl?.status === 'REJECTED' ? (
              <p className="text-red-600"><b>✗ Template rejeitado pela Meta</b>{tpl.rejectedReason ? ` (${tpl.rejectedReason})` : ''}. Ajuste no WhatsApp Manager ou salve com outro nome de template e crie de novo.</p>
            ) : tpl?.status === 'UNKNOWN' ? (
              <p className="text-muted-foreground">Não consegui verificar o template na Meta agora; o envio vai tentar mesmo assim.</p>
            ) : (
              <p className="text-amber-700"><b>⏳ Template “{comm.template_name}” aguardando aprovação da Meta</b> (status: {tpl?.status}). Fora da janela ainda não recebe.</p>
            )}
            {comm.template_name && !tpl?.checking && (
              <button type="button" className="text-[11px] underline text-muted-foreground" onClick={checkTemplate}>Atualizar status</button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={!!busy} onClick={() => call({ audience, mode: 'dry_run' }, 'preview')}>
              {busy === 'preview' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Simular
            </Button>
            <Button variant="cta" size="sm" disabled={!!busy} onClick={() => setConfirmOpen(true)}>
              {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar
            </Button>
          </div>

          <div className="flex items-end gap-2 pt-2 border-t">
            <div className="flex-1">
              <Label className="text-xs">Teste (nº com DDI)</Label>
              <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="5511999999999" className="mt-1" />
            </div>
            <Button variant="outline" size="sm" disabled={!!busy || testPhone.replace(/\D/g, '').length < 12}
              onClick={() => call({ mode: 'test', test_phone: testPhone }, 'test')}>Enviar teste</Button>
          </div>

          {result?.summary && (
            <div className="text-sm bg-muted/40 rounded-md p-3">
              <p className="font-medium mb-1">{result.summary.dry_run ? 'Simulação (nada enviado)' : 'Resultado'}</p>
              <p className="text-xs">Total: {result.summary.total} · Grátis: {result.summary.sent_free} · Template: {result.summary.sent_template}
                {' '}· Pulados (sem template fora da janela): {result.summary.skipped_no_template} · Falhas: {result.summary.failed}</p>
              {(result.summary.skipped_template_not_approved ?? 0) > 0 && (
                <p className="text-xs text-amber-700 mt-1">⚠ {result.summary.skipped_template_not_approved} fora da janela NÃO receberam: template “{comm.template_name}” não está aprovado na Meta (status: {result.summary.template_status ?? '?'}).</p>
              )}
              {(result.summary.skipped_dedupe ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{result.summary.skipped_dedupe} pulados por já terem recebido esta comunicação.</p>
              )}
              {(result.summary.top_errors ?? []).map((e: any, i: number) => (
                <p key={i} className="text-xs text-red-600 mt-1">Erro ({e.count}x): {e.message}</p>
              ))}
              {typeof result.est_cost_brl === 'number' && (
                <p className="text-xs text-muted-foreground mt-1">Custo estimado (templates): <b>R$ {result.est_cost_brl.toFixed(2)}</b></p>
              )}
            </div>
          )}
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar envio para {audience === 'active' ? 'ativos' : audience === 'inactive' ? 'inativos' : 'todos'}?</DialogTitle>
              <DialogDescription>Grátis na janela aberta; fora dela, template {comm.category} (custa por entrega). Rode Simular antes se quiser ver o custo.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
              <Button variant="cta" onClick={() => { setConfirmOpen(false); call({ audience, mode: 'send' }, 'send'); }}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminComunicacoesPage() {
  return <AdminGuard><AdminComunicacoesContent /></AdminGuard>;
}
