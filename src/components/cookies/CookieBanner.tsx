import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";
import { useCookieConsent } from "@/hooks/useCookieConsent";

export default function CookieBanner() {
  const { hasConsented, acceptAll, rejectNonEssential } = useCookieConsent();

  if (hasConsented) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-background/95 backdrop-blur shadow-lg animate-fade-in"
    >
      <div className="max-w-5xl mx-auto p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
        <div className="flex items-start gap-3">
          <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1 min-w-0">
            <h2 id="cookie-banner-title" className="font-display text-sm font-semibold text-foreground">
              Cookies e privacidade
            </h2>
            <p id="cookie-banner-desc" className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
              Usamos cookies estritamente necessários para manter você autenticado e cookies opcionais para
              análise agregada. Você pode aceitar tudo, rejeitar os não-essenciais, ou personalizar suas escolhas.{" "}
              <Link to="/cookies" className="underline underline-offset-2 hover:text-foreground">
                Saiba mais
              </Link>{" "}
              ·{" "}
              <Link to="/politica-de-privacidade" className="underline underline-offset-2 hover:text-foreground">
                Política de Privacidade
              </Link>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button asChild variant="outline" size="sm">
            <Link to="/cookies">Personalizar</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={rejectNonEssential}>
            <X className="h-4 w-4" />
            Rejeitar não-essenciais
          </Button>
          <Button variant="cta" size="sm" onClick={acceptAll}>
            Aceitar todos
          </Button>
        </div>
      </div>
    </div>
  );
}
