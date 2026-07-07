import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Send, FileText, Eye } from 'lucide-react';

interface SendSummary {
  total: number;
  sent_free: number;
  sent_template: number;
  skipped: number;
  failed: number;
  dry_run?: boolean;
}
interface SendResponse {
  ok?: boolean;
  error?: string;
  summary?: SendSummary;
  est_cost_brl?: number;
  manual_version?: string;
}

const MANUAL_URL = 'https://app.chatpsi.com.br/manual-whatsapp-chatpsi.pdf';

export default function ManualSendCard() {
  const { toast } = useToast();
  const [busy, setBusy] = useState<null | 'preview' | 'send' | 'test'>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [result, setResult] = useState<SendResponse | null>(null);

  const call = async (payload: Record<string, unknown>, kind: 'preview' | 'send' | 'test') => {
    setBusy(kind);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-send-manual', { body: payload });
      if (error) throw error;
      if ((data as SendResponse)?.error) throw new Error((data as SendResponse).error);
      setResult(data as SendResponse);
      const s = (data as SendResponse).summary;
      if (kind === 'preview') {
        toast({ title: 'Simulação pronta', description: `${s?.total ?? 0} destinatários — sem enviar nada.` });
      } else if (kind === 'test') {
        toast({ title: 'Teste enviado', description: 'Confira seu WhatsApp.' });
      } else {
        toast({ title: 'Envio concluído', description: `Grátis: ${s?.sent_free ?? 0} · Template: ${s?.sent_template ?? 0}` });
      }
    } catch (e: any) {
      toast({ title: 'Erro no envio', description: e.message || 'Falha desconhecida', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-card border-2 border-primary/20 rounded-lg p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold leading-tight">Manual do WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            Envia o guia (PDF) aos usuários. Janela de 24h aberta → documento grátis; fechada → template utility (~R$ 0,035).{' '}
            <a href={MANUAL_URL} target="_blank" rel="noreferrer" className="text-primary underline">ver PDF</a>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="outline" size="sm" disabled={!!busy}
          onClick={() => call({ mode: 'all_active', dry_run: true }, 'preview')}>
          {busy === 'preview' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          Simular (ativos)
        </Button>
        <Button variant="cta" size="sm" disabled={!!busy} onClick={() => setConfirmOpen(true)}>
          {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar para todos os ativos
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2 pt-3 border-t">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground">Enviar teste para um número (com DDI, ex.: 5511999999999)</label>
          <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="5511999999999" className="mt-1" />
        </div>
        <Button variant="outline" size="sm" disabled={!!busy || testPhone.replace(/\D/g, '').length < 12}
          onClick={() => call({ mode: 'test', test_phone: testPhone }, 'test')}>
          {busy === 'test' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar teste
        </Button>
      </div>

      {result?.summary && (
        <div className="mt-4 text-sm bg-muted/40 rounded-md p-3">
          <p className="font-medium mb-1">
            {result.summary.dry_run ? 'Simulação (nada enviado)' : 'Resultado do envio'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            <Stat label="Total" value={result.summary.total} />
            <Stat label="Grátis" value={result.summary.sent_free} />
            <Stat label="Template" value={result.summary.sent_template} />
            <Stat label="Pulados" value={result.summary.skipped} />
            <Stat label="Falhas" value={result.summary.failed} />
          </div>
          {typeof result.est_cost_brl === 'number' && (
            <p className="text-xs text-muted-foreground mt-2">
              Custo estimado (templates): <b>R$ {result.est_cost_brl.toFixed(2)}</b>
              {result.summary.dry_run ? ' se enviar agora' : ''} · versão {result.manual_version}
            </p>
          )}
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar manual para todos os assinantes ativos?</DialogTitle>
            <DialogDescription>
              Cada usuário recebe o PDF uma única vez (não reenvia quem já recebeu esta versão).
              Quem está com a janela de 24h aberta recebe de graça; os demais via template utility (~R$ 0,035 cada).
              Dica: rode <b>Simular</b> antes para ver o custo estimado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button variant="cta" onClick={() => { setConfirmOpen(false); call({ mode: 'all_active' }, 'send'); }}>
              Confirmar envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background rounded p-2">
      <div className="text-lg font-bold text-primary">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
