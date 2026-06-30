import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import AppBreadcrumb from '@/components/ui/AppBreadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, FileText, Upload, Info, ExternalLink } from 'lucide-react';

const MANUAL_PATH = 'manuals/manual-uso.pdf';

const AdminAssinaturasContent = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Manual
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const [manualFilename, setManualFilename] = useState('Manual-de-Uso-ChatPsi.pdf');

  // Templates
  const [tplAtivada, setTplAtivada] = useState('assinatura_ativada');
  const [tplPendente, setTplPendente] = useState('pagamento_pendente');
  const [tplCancelada, setTplCancelada] = useState('assinatura_cancelada');
  const [tplLang, setTplLang] = useState('pt_BR');

  // Mensagens editáveis
  const [onboardingFull, setOnboardingFull] = useState('');
  const [onboardingWelcomeBack, setOnboardingWelcomeBack] = useState('');
  const [deactivation, setDeactivation] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('subscription_settings' as any)
        .select('*')
        .limit(1)
        .single();
      if (data) {
        const row = data as any;
        setManualUrl(row.manual_pdf_url ?? null);
        setManualFilename(row.manual_pdf_filename ?? 'Manual-de-Uso-ChatPsi.pdf');
        setTplAtivada(row.tpl_ativada_name ?? 'assinatura_ativada');
        setTplPendente(row.tpl_pendente_name ?? 'pagamento_pendente');
        setTplCancelada(row.tpl_cancelada_name ?? 'assinatura_cancelada');
        setTplLang(row.tpl_lang ?? 'pt_BR');
        setOnboardingFull(row.onboarding_full_message ?? '');
        setOnboardingWelcomeBack(row.onboarding_welcome_back_message ?? '');
        setDeactivation(row.deactivation_message ?? '');
      }
    } catch {
      // mantém defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const persist = async (patch: Record<string, unknown>) => {
    const { error } = await (supabase.from('subscription_settings' as any) as any)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // atualiza a linha singleton
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['subscription-settings'] });
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast({ title: 'Arquivo inválido', description: 'Envie um PDF.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(MANUAL_PATH, file, { upsert: true, contentType: 'application/pdf' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('public-assets').getPublicUrl(MANUAL_PATH);
      // cache-buster para refletir a nova versão imediatamente
      const url = `${urlData.publicUrl}?v=${Date.now()}`;
      const filename = file.name;

      await persist({ manual_pdf_url: url, manual_pdf_filename: filename });
      setManualUrl(url);
      setManualFilename(filename);
      toast({ title: 'Manual atualizado!' });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await persist({
        tpl_ativada_name: tplAtivada,
        tpl_pendente_name: tplPendente,
        tpl_cancelada_name: tplCancelada,
        tpl_lang: tplLang,
        onboarding_full_message: onboardingFull,
        onboarding_welcome_back_message: onboardingWelcomeBack,
        deactivation_message: deactivation,
      });
      toast({ title: 'Configurações salvas!' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <AppBreadcrumb items={[
        { label: 'Administração', href: '/admin' },
        { label: 'Assinaturas & Manual' },
      ]} />

      <h1 className="text-3xl font-bold mb-2">Assinaturas & Manual</h1>
      <p className="text-muted-foreground mb-6">
        Manual de Uso enviado nas boas-vindas e textos das mensagens de assinatura.
      </p>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Manual de Uso */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Manual de Uso (PDF)
              </CardTitle>
              <CardDescription>
                Enviado como anexo no template de boas-vindas (cabeçalho do documento).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {manualUrl ? (
                <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span className="truncate">{manualFilename}</span>
                  <a
                    href={manualUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline shrink-0"
                  >
                    Ver atual <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum manual enviado ainda.</p>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleManualUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {manualUrl ? 'Substituir PDF' : 'Enviar PDF'}
              </Button>
            </CardContent>
          </Card>

          {/* Aviso sobre templates da Meta */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Sobre os textos das mensagens</AlertTitle>
            <AlertDescription>
              As mensagens proativas no WhatsApp (ativação, pagamento pendente e cancelamento) usam
              <strong> templates aprovados pela Meta</strong> — o texto do corpo é definido na Meta e
              alterá-lo aqui não muda o envio sem nova aprovação. Os campos de mensagem abaixo alimentam
              o <strong>onboarding</strong> e a <strong>renovação dentro do bot</strong>. Já o
              <strong> Manual</strong> e o <strong>nome dos templates</strong> têm efeito imediato.
            </AlertDescription>
          </Alert>

          {/* Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Templates da Meta</CardTitle>
              <CardDescription>Nomes exatos dos templates aprovados e o idioma.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tpl-ativada">Template de ativação</Label>
                <Input id="tpl-ativada" value={tplAtivada} onChange={(e) => setTplAtivada(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-pendente">Template de pagamento pendente</Label>
                <Input id="tpl-pendente" value={tplPendente} onChange={(e) => setTplPendente(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-cancelada">Template de cancelamento</Label>
                <Input id="tpl-cancelada" value={tplCancelada} onChange={(e) => setTplCancelada(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-lang">Idioma</Label>
                <Input id="tpl-lang" value={tplLang} onChange={(e) => setTplLang(e.target.value)} placeholder="pt_BR" />
              </div>
            </CardContent>
          </Card>

          {/* Mensagens editáveis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mensagens de onboarding e desativação</CardTitle>
              <CardDescription>
                Usadas pelo motor de onboarding (em construção) e pela renovação dentro do bot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ob-full">Onboarding — sequência completa (primeira vez)</Label>
                <Textarea
                  id="ob-full"
                  rows={4}
                  value={onboardingFull}
                  onChange={(e) => setOnboardingFull(e.target.value)}
                  placeholder="Mensagem(ns) de boas-vindas para novos assinantes (Onboarding 7 dias)."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ob-back">Onboarding — bem-vindo de volta (reativação)</Label>
                <Textarea
                  id="ob-back"
                  rows={3}
                  value={onboardingWelcomeBack}
                  onChange={(e) => setOnboardingWelcomeBack(e.target.value)}
                  placeholder="Mensagem curta para quem reativou a assinatura."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deactivation">Mensagem de desativação / renovação (no bot)</Label>
                <Textarea
                  id="deactivation"
                  rows={3}
                  value={deactivation}
                  onChange={(e) => setDeactivation(e.target.value)}
                  placeholder="Texto exibido no bot quando a assinatura está inativa."
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar configurações
          </Button>
        </div>
      )}
    </div>
  );
};

export default function AdminAssinaturasPage() {
  return (
    <AdminGuard>
      <AdminAssinaturasContent />
    </AdminGuard>
  );
}
