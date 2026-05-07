import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cenarios } from '@/lib/calc-tributaria/types';
import { formatBRL } from '@/lib/calc-tributaria/format';

interface PrevidenciaCardProps {
  cenarios: Cenarios;
}

export default function PrevidenciaCard({ cenarios }: PrevidenciaCardProps) {
  const pf11 = cenarios.pf11.previdencia;
  const pf20 = cenarios.pf20.previdencia;
  const diferencaContribuicao =
    pf20.contribuicaoMensal - pf11.contribuicaoMensal;
  const diferencaBase = pf20.baseAposentadoria - pf11.baseAposentadoria;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Impacto na sua aposentadoria
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md border border-border p-3 space-y-1.5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              INSS 11% (Plano Simplificado)
            </p>
            <p className="text-lg font-semibold">
              {formatBRL(pf11.contribuicaoMensal)} <span className="text-sm font-normal text-muted-foreground">/ mês</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Base de aposentadoria: até{' '}
              <span className="font-medium text-foreground">
                {formatBRL(pf11.baseAposentadoria)}
              </span>
            </p>
          </div>

          <div className="rounded-md border-2 border-primary/30 bg-primary-light/20 p-3 space-y-1.5">
            <p className="text-xs uppercase tracking-wide text-primary font-semibold">
              INSS 20% (Plano Normal)
            </p>
            <p className="text-lg font-semibold">
              {formatBRL(pf20.contribuicaoMensal)} <span className="text-sm font-normal text-muted-foreground">/ mês</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Base de aposentadoria: até{' '}
              <span className="font-medium text-foreground">
                {formatBRL(pf20.baseAposentadoria)}
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
          <p className="text-foreground">
            Contribuir <span className="font-semibold">20%</span> custa{' '}
            <span className="font-semibold text-primary">
              {formatBRL(diferencaContribuicao)}
            </span>{' '}
            a mais por mês — mas garante aposentadoria proporcional sobre uma
            base{' '}
            <span className="font-semibold">
              {formatBRL(diferencaBase)}
            </span>{' '}
            maior do que o plano simplificado.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
