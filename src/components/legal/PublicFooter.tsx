import { Link } from "react-router-dom";

const YEAR = new Date().getFullYear();

export default function PublicFooter() {
  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {YEAR} ChatPsi — Plataforma de apoio a profissionais de saúde mental.
          </p>
          <nav aria-label="Links legais" className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <Link to="/politica-de-privacidade" className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
              Política de Privacidade
            </Link>
            <Link to="/termos-de-uso" className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
              Termos de Uso
            </Link>
            <Link to="/cookies" className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
              Cookies
            </Link>
          </nav>
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Controlador:</span> SECONSULT TECNOLOGIA E
          SAÚDE LTDA — CNPJ 40.044.401/0001-68 — Sorocaba/SP.
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Encarregado (DPO):</span>{" "}
          &lt;NOME DO ENCARREGADO&gt; —{" "}
          <a className="underline underline-offset-2 hover:text-foreground" href="mailto:seconsult.clinica@gmail.com">
            seconsult.clinica@gmail.com
          </a>{" "}
          ·{" "}
          <a className="underline underline-offset-2 hover:text-foreground" href="https://wa.me/5511942457454" target="_blank" rel="noopener noreferrer">
            WhatsApp (secundário) 11 94245-7454
          </a>
        </p>
      </div>
    </footer>
  );
}
