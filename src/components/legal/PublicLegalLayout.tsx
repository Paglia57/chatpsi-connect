import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PublicFooter from "./PublicFooter";

interface PublicLegalLayoutProps {
  title: string;
  version?: string;
  lastUpdated?: string;
  draftBadge?: boolean;
  children: ReactNode;
}

export default function PublicLegalLayout({
  title,
  version,
  lastUpdated,
  draftBadge = true,
  children,
}: PublicLegalLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-background sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <span className="font-display font-semibold text-sm text-foreground">ChatPsi</span>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {draftBadge && (
            <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-foreground">
              <strong>Versão preliminar.</strong> Este documento está em validação jurídica. O conteúdo
              é informativo enquanto a versão definitiva não é publicada.
            </div>
          )}
          <header className="mb-6 space-y-2">
            <h1 className="font-display text-3xl font-semibold text-foreground">{title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {version && <Badge variant="outline">Versão {version}</Badge>}
              {lastUpdated && <span>Atualizado em {lastUpdated}</span>}
            </div>
          </header>

          <article className="prose prose-sm sm:prose max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-primary">
            {children}
          </article>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
