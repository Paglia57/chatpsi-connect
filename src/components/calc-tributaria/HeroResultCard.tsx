import { TrendingUp, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Recomendacao } from '@/lib/calc-tributaria/types';
import { formatBRL } from '@/lib/calc-tributaria/format';
import { cn } from '@/lib/utils';

interface HeroResultCardProps {
  recomendacao: Recomendacao;
}

export default function HeroResultCard({ recomendacao }: HeroResultCardProps) {
  const isIndefinido = recomendacao.tipoRecomendado === 'INDEFINIDO';
  const economia = recomendacao.economiaMensalBRL;
  const economiaAnual = recomendacao.economiaAnualBRL;

  return (
    <Card
      className={cn(
        'overflow-hidden border-2',
        isIndefinido
          ? 'border-muted'
          : 'border-primary bg-gradient-to-br from-primary-light/40 via-card to-card',
      )}
    >
      <CardContent className="p-6 md:p-8 space-y-4">
        <div className="flex items-start gap-3">
          {isIndefinido ? (
            <Info className="h-6 w-6 shrink-0 text-muted-foreground mt-1" />
          ) : (
            <TrendingUp className="h-6 w-6 shrink-0 text-primary mt-1" />
          )}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {isIndefinido ? 'Pronto para começar' : 'Baseado nos nossos cálculos'}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold leading-tight text-foreground">
              {recomendacao.titulo}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              {recomendacao.subtitulo}
            </p>
            {!isIndefinido && (
              <p className="text-xs text-muted-foreground italic pt-1">
                Não é uma recomendação contábil — somos uma calculadora. Antes de decidir, consulte um contador.
              </p>
            )}
          </div>
        </div>

        {!isIndefinido && economia > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-lg bg-card border border-border p-4 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Economia / mês
              </p>
              <p className="text-2xl md:text-3xl font-bold text-primary">
                {formatBRL(economia)}
              </p>
            </div>
            <div className="rounded-lg bg-card border border-border p-4 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Economia / ano
              </p>
              <p className="text-2xl md:text-3xl font-bold text-primary">
                {formatBRL(economiaAnual)}
              </p>
            </div>
          </div>
        )}

        {recomendacao.comparadoCom && !isIndefinido && (
          <p className="text-xs text-muted-foreground">
            {recomendacao.comparadoCom}
          </p>
        )}

        {recomendacao.alertas.length > 0 && (
          <div className="space-y-2 pt-2">
            {recomendacao.alertas.map((alerta, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md bg-warning/10 border border-warning/30 p-3 text-sm"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
                <span className="text-foreground">{alerta}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
