import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Cenario,
  Cenarios,
  Recomendacao,
  TipoCenario,
} from '@/lib/calc-tributaria/types';
import { formatBRL, formatPercent } from '@/lib/calc-tributaria/format';
import { cn } from '@/lib/utils';

interface CenariosComparativoProps {
  cenarios: Cenarios;
  recomendacao: Recomendacao;
}

const TITULOS: Record<TipoCenario, { titulo: string; subtitulo: string }> = {
  PF_11: { titulo: 'PF · INSS 11%', subtitulo: 'Plano Simplificado' },
  PF_20: { titulo: 'PF · INSS 20%', subtitulo: 'Plano Normal (teto)' },
  PJ_SIMPLES: { titulo: 'PJ · Simples Nacional', subtitulo: 'Anexo III' },
};

export default function CenariosComparativo({
  cenarios,
  recomendacao,
}: CenariosComparativoProps) {
  const lista: Array<{ tipo: TipoCenario; cenario: Cenario }> = [
    { tipo: 'PF_11', cenario: cenarios.pf11 },
    { tipo: 'PF_20', cenario: cenarios.pf20 },
    { tipo: 'PJ_SIMPLES', cenario: cenarios.pjSimples },
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Comparativo dos cenários</h3>

      <div className="md:grid md:grid-cols-3 md:gap-4">
        <div className="flex md:contents overflow-x-auto snap-x snap-mandatory gap-3 -mx-4 px-4 pb-2 md:mx-0 md:px-0 md:pb-0">
          {lista.map(({ tipo, cenario }) => (
            <CenarioCard
              key={tipo}
              tipo={tipo}
              cenario={cenario}
              isRecomendado={recomendacao.tipoRecomendado === tipo}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CenarioCard({
  tipo,
  cenario,
  isRecomendado,
}: {
  tipo: TipoCenario;
  cenario: Cenario;
  isRecomendado: boolean;
}) {
  const labels = TITULOS[tipo];

  return (
    <Card
      className={cn(
        'min-w-[85%] snap-start md:min-w-0 transition-all',
        isRecomendado && 'border-primary border-2 shadow-md',
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{labels.titulo}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {labels.subtitulo}
            </p>
          </div>
          {isRecomendado && (
            <Badge className="bg-primary text-primary-foreground gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Recomendado
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Líquido / mês
          </p>
          <p className="text-2xl font-bold text-foreground">
            {formatBRL(cenario.liquidoMensal)}
          </p>
        </div>

        <div className="space-y-1.5 text-sm">
          <Row label="Faturamento" valor={formatBRL(cenario.faturamentoBruto)} />

          {cenario.tipo === 'PF_11' || cenario.tipo === 'PF_20' ? (
            <>
              <Row label="INSS" valor={`− ${formatBRL(cenario.inssMensal)}`} />
              <Row label="IRPF" valor={`− ${formatBRL(cenario.irpfMensal)}`} />
              <Row
                label={
                  cenario.usouDescontoSimplificado
                    ? 'Desconto simplificado IR'
                    : 'Despesas dedutíveis'
                }
                valor={`(${formatBRL(cenario.deducaoIRAplicada)})`}
              />
            </>
          ) : (
            <>
              <Row
                label={`DAS (Anexo ${cenario.anexo})`}
                valor={`− ${formatBRL(cenario.dasMensal)}`}
              />
              <Row
                label="Pró-labore (bruto)"
                valor={formatBRL(cenario.proLabore)}
              />
              <Row
                label="INSS s/ pró-labore"
                valor={`− ${formatBRL(cenario.inssProLabore)}`}
              />
              {cenario.irrfProLabore > 0 && (
                <Row
                  label="IR s/ pró-labore"
                  valor={`− ${formatBRL(cenario.irrfProLabore)}`}
                />
              )}
              <Row
                label="Contador"
                valor={`− ${formatBRL(cenario.custoContador)}`}
              />
            </>
          )}
        </div>

        <div className="pt-2 border-t border-border space-y-1">
          <Row
            label="Total pago"
            valor={`− ${formatBRL(cenario.totalDescontosMensais)}`}
            destaque
          />
          <Row
            label="% sobre faturamento"
            valor={formatPercent(cenario.cargaTributariaPercent)}
          />
        </div>

        {cenario.alertas.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border">
            {cenario.alertas.map((alerta, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warning mt-0.5" />
                <span className="text-muted-foreground leading-snug">
                  {alerta}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className={cn(
          'text-muted-foreground',
          destaque && 'font-medium text-foreground',
        )}
      >
        {label}
      </span>
      <span className={cn(destaque && 'font-semibold text-primary')}>
        {valor}
      </span>
    </div>
  );
}
