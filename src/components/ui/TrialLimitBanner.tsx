import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrialLimitBannerProps {
  usageCount: number;
  limit: number;
  hasReachedLimit: boolean;
  featureLabel: string;
  isLoading?: boolean;
}

const SUBSCRIBE_URL = "https://wa.me/5511942457454?text=Olá!%20Quero%20assinar%20o%20ChatPsi";

export default function TrialLimitBanner({
  usageCount,
  limit,
  hasReachedLimit,
  featureLabel,
  isLoading,
}: TrialLimitBannerProps) {
  if (isLoading) return null;

  if (hasReachedLimit) {
    return (
      <div className="rounded-xl border border-cta/30 bg-cta/5 p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2 text-cta flex-1">
          <Lock className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            Você atingiu o limite de {limit} {featureLabel} gratuitas este mês.
          </p>
        </div>
        <Button variant="cta" size="sm" asChild>
          <a href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer">
            <Sparkles className="h-4 w-4 mr-1" />
            Assinar para continuar
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 flex items-center gap-2">
      <Sparkles className="h-4 w-4 text-primary shrink-0" />
      <p className="text-xs text-muted-foreground">
        Você usou <span className="font-semibold text-foreground">{usageCount}</span> de{" "}
        <span className="font-semibold text-foreground">{limit}</span> {featureLabel} gratuitas este mês
      </p>
    </div>
  );
}
