import { useState } from "react";
import PublicLegalLayout from "@/components/legal/PublicLegalLayout";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCookieConsent } from "@/hooks/useCookieConsent";

export default function CookiePreferencesPage() {
  const { consent, choices, savePreferences, rejectNonEssential, acceptAll, resetConsent } =
    useCookieConsent();
  const [analytics, setAnalytics] = useState(choices.analytics);
  const [marketing, setMarketing] = useState(choices.marketing);

  const handleSave = () => {
    savePreferences({ analytics, marketing });
    toast.success("Preferências de cookies atualizadas");
  };

  const handleAcceptAll = () => {
    acceptAll();
    setAnalytics(true);
    setMarketing(true);
    toast.success("Todos os cookies aceitos");
  };

  const handleRejectAll = () => {
    rejectNonEssential();
    setAnalytics(false);
    setMarketing(false);
    toast.success("Cookies não-essenciais rejeitados");
  };

  return (
    <PublicLegalLayout
      title="Política e Preferências de Cookies"
      version="0.1"
      lastUpdated="25/05/2026"
    >
      <div className="not-prose mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
        <p className="text-sm text-foreground">
          ⚠️ O ChatPsi trata <strong>dados sensíveis de saúde mental</strong>. Para conhecer todas
          as finalidades, bases legais, prazos de retenção e seus direitos como titular, consulte
          nossa{" "}
          <a href="/politica-de-privacidade" className="text-primary underline underline-offset-2 hover:no-underline">
            Política de Privacidade
          </a>{" "}
          e o <strong>RIPD</strong> (Relatório de Impacto à Proteção de Dados), disponível mediante
          solicitação ao Encarregado.
        </p>
      </div>

      <h2>O que são cookies</h2>
      <p>
        Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita um
        site. Eles servem para lembrar preferências, manter você autenticado, medir uso e
        personalizar a experiência. O ChatPsi também usa tecnologias equivalentes (localStorage,
        sessionStorage), tratadas com o mesmo rigor de privacidade.
      </p>

      <h2>Suas escolhas</h2>
      <div className="not-prose my-6 space-y-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-semibold text-foreground">
                  Estritamente necessários
                </h3>
                <Badge variant="outline">Sempre ativos</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Indispensáveis para autenticação e funcionamento básico do ChatPsi. Não podem ser
                desativados.
              </p>
            </div>
            <Switch checked disabled aria-label="Estritamente necessários (sempre ativos)" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-display text-sm font-semibold text-foreground">
                Cookies analíticos
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Estatística agregada de uso da plataforma. Atualmente não há cookies analíticos
                ativos — sua escolha será aplicada se passarmos a usar no futuro.
              </p>
            </div>
            <Switch
              checked={analytics}
              onCheckedChange={setAnalytics}
              aria-label="Cookies analíticos"
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-display text-sm font-semibold text-foreground">
                Cookies de marketing
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Hoje não usamos cookies de marketing nem pixels de redes sociais. Sua escolha será
                aplicada se passarmos a usar no futuro.
              </p>
            </div>
            <Switch
              checked={marketing}
              onCheckedChange={setMarketing}
              aria-label="Cookies de marketing"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="cta" onClick={handleSave}>
            Salvar preferências
          </Button>
          <Button variant="outline" onClick={handleAcceptAll}>
            Aceitar todos
          </Button>
          <Button variant="outline" onClick={handleRejectAll}>
            Rejeitar não-essenciais
          </Button>
          <Button variant="ghost" onClick={resetConsent}>
            Esquecer minhas escolhas
          </Button>
        </div>

        {consent && (
          <p className="text-xs text-muted-foreground pt-2">
            Última atualização das suas escolhas:{" "}
            {new Date(consent.timestamp).toLocaleString("pt-BR")} (versão {consent.version}).
          </p>
        )}
      </div>

      <h2>Cookies que usamos hoje</h2>
      <h3>Estritamente necessários (sem consentimento — Art. 7º, V LGPD)</h3>
      <ul>
        <li>
          <code>sb-&lt;projeto&gt;-auth-token</code> — Supabase, manter autenticação, duração de sessão
        </li>
        <li>
          <code>sb-&lt;projeto&gt;-refresh-token</code> — Supabase, renovar sessão, 7 dias
        </li>
        <li>
          <code>chatpsi_cookie_consent</code> — ChatPsi, lembrar suas escolhas neste banner, 12 meses
        </li>
        <li>
          <code>chatpsi_seen_guides</code> — ChatPsi, lembrar tutoriais já vistos, 24 meses
        </li>
      </ul>

      <h3>Analíticos (opt-in)</h3>
      <p>Não usamos no momento.</p>

      <h3>Marketing (opt-in)</h3>
      <p>Não usamos no momento.</p>

      <h2>Como gerenciar no navegador</h2>
      <p>
        Você também pode bloquear/excluir cookies pelas configurações do navegador (pode afetar
        funcionalidade). Revogar o consentimento é tão simples quanto concedê-lo (Art. 8º, §5º
        LGPD).
      </p>

      <h2>Cookies de terceiros</h2>
      <ul>
        <li>
          <strong>Supabase</strong> — sempre carregado (autenticação) — política:{" "}
          <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
            supabase.com/privacy
          </a>
        </li>
        <li>
          <strong>OpenAI</strong> — não carrega cookies no seu navegador; toda comunicação é via
          edge function no servidor — política:{" "}
          <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer">
            openai.com/policies/privacy-policy
          </a>
        </li>
      </ul>

      <h2>Controlador</h2>
      <p>
        <strong>SECONSULT TECNOLOGIA E SAÚDE LTDA</strong><br />
        CNPJ: 40.044.401/0001-68<br />
        Endereço: Rua Sete de Setembro, 543 — Apt 121, Centro, Sorocaba/SP, CEP 18035-001
      </p>

      <h2>Encarregado (DPO)</h2>
      <p>
        <strong>&lt;NOME COMPLETO DO ENCARREGADO&gt;</strong><br />
        E-mail: <a href="mailto:seconsult.clinica@gmail.com">seconsult.clinica@gmail.com</a><br />
        WhatsApp (secundário):{" "}
        <a href="https://wa.me/5511942457454" target="_blank" rel="noopener noreferrer">
          11 94245-7454
        </a>
      </p>
      <p className="text-sm text-muted-foreground">
        Canal preferencial: e-mail. SLA de resposta: até 15 dias corridos (Art. 19, II LGPD).
      </p>
    </PublicLegalLayout>
  );
}
