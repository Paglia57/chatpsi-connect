import { Mail, MessageCircle, ShieldCheck, Building2 } from "lucide-react";

interface DpoContactBlockProps {
  variant?: "card" | "inline" | "compact" | "full";
  className?: string;
}

const CONTROLLER_NAME = "SECONSULT TECNOLOGIA E SAÚDE LTDA";
const CONTROLLER_CNPJ = "40.044.401/0001-68";
const CONTROLLER_ADDRESS = "Rua Sete de Setembro, 543 — Apt 121, Centro, Sorocaba/SP, CEP 18035-001";
const DPO_NAME = "<NOME COMPLETO DO ENCARREGADO>";
const DPO_EMAIL = "seconsult.clinica@gmail.com";
const DPO_WHATSAPP_DISPLAY = "11 94245-7454";
const DPO_WHATSAPP_LINK = "https://wa.me/5511942457454";

export default function DpoContactBlock({ variant = "card", className }: DpoContactBlockProps) {
  if (variant === "compact") {
    return (
      <div className={className} id="dpo">
        <p className="text-xs text-muted-foreground">
          <ShieldCheck className="inline h-3.5 w-3.5 mr-1 -mt-0.5 text-primary" aria-hidden />
          Encarregado (DPO): {DPO_NAME} —{" "}
          <a className="underline underline-offset-2 hover:text-foreground" href={`mailto:${DPO_EMAIL}`}>
            {DPO_EMAIL}
          </a>{" "}
          ·{" "}
          <a className="underline underline-offset-2 hover:text-foreground" href={DPO_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
            WhatsApp (secundário) {DPO_WHATSAPP_DISPLAY}
          </a>
        </p>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={className} id="dpo">
        <p className="text-sm text-foreground">
          <strong>Encarregado pelo Tratamento de Dados (DPO):</strong> {DPO_NAME}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          <Mail className="inline h-4 w-4 mr-1 -mt-0.5" aria-hidden />
          <a className="underline underline-offset-2 hover:text-foreground" href={`mailto:${DPO_EMAIL}`}>
            {DPO_EMAIL}
          </a>
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          <MessageCircle className="inline h-4 w-4 mr-1 -mt-0.5" aria-hidden />
          <a className="underline underline-offset-2 hover:text-foreground" href={DPO_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
            WhatsApp (secundário) {DPO_WHATSAPP_DISPLAY}
          </a>
        </p>
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div
        id="dpo"
        className={`rounded-lg border border-border bg-card p-4 shadow-sm space-y-4 ${className ?? ""}`}
      >
        <div>
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1">
              <h3 className="font-display text-sm font-semibold text-foreground">Controlador</h3>
              <p className="text-sm text-foreground mt-1 font-medium">{CONTROLLER_NAME}</p>
              <p className="text-sm text-muted-foreground">CNPJ: {CONTROLLER_CNPJ}</p>
              <p className="text-sm text-muted-foreground">Endereço: {CONTROLLER_ADDRESS}</p>
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1">
              <h3 className="font-display text-sm font-semibold text-foreground">
                Encarregado pelo Tratamento de Dados (DPO)
              </h3>
              <p className="text-sm text-foreground mt-1 font-medium">{DPO_NAME}</p>
              <p className="text-sm text-muted-foreground mt-1">
                <Mail className="inline h-4 w-4 mr-1 -mt-0.5" aria-hidden />
                <a className="underline underline-offset-2 hover:text-foreground" href={`mailto:${DPO_EMAIL}`}>
                  {DPO_EMAIL}
                </a>
              </p>
              <p className="text-sm text-muted-foreground">
                <MessageCircle className="inline h-4 w-4 mr-1 -mt-0.5" aria-hidden />
                <a className="underline underline-offset-2 hover:text-foreground" href={DPO_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                  WhatsApp (secundário) {DPO_WHATSAPP_DISPLAY}
                </a>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Canal preferencial: e-mail. SLA de resposta: até 15 dias corridos (Art. 19, II LGPD).
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // variant === "card" (default — versão DPO única, mantida para compatibilidade)
  return (
    <div
      id="dpo"
      className={`rounded-lg border border-border bg-card p-4 shadow-sm ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1">
          <h3 className="font-display text-sm font-semibold text-foreground">
            Encarregado pelo Tratamento de Dados (DPO)
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Para exercer seus direitos (Art. 18 LGPD) ou esclarecer dúvidas sobre privacidade:
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-foreground font-medium">{DPO_NAME}</p>
            <p className="text-xs text-muted-foreground">Encarregado nomeado por {CONTROLLER_NAME}</p>
            <p className="text-sm text-muted-foreground">
              <Mail className="inline h-4 w-4 mr-1 -mt-0.5" aria-hidden />
              <a className="underline underline-offset-2 hover:text-foreground" href={`mailto:${DPO_EMAIL}`}>
                {DPO_EMAIL}
              </a>
            </p>
            <p className="text-sm text-muted-foreground">
              <MessageCircle className="inline h-4 w-4 mr-1 -mt-0.5" aria-hidden />
              <a className="underline underline-offset-2 hover:text-foreground" href={DPO_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                WhatsApp (secundário) {DPO_WHATSAPP_DISPLAY}
              </a>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Canal preferencial: e-mail. SLA de resposta: até 15 dias corridos (Art. 19, II LGPD).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
