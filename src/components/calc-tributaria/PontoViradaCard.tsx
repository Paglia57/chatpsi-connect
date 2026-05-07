import { LineChart as LineChartIcon } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PontoVirada } from '@/lib/calc-tributaria/types';
import { formatBRL, formatBRLCompact } from '@/lib/calc-tributaria/format';

interface PontoViradaCardProps {
  pontoVirada: PontoVirada;
}

export default function PontoViradaCard({ pontoVirada }: PontoViradaCardProps) {
  const { faturamentoVirada, serie, markerUsuario } = pontoVirada;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChartIcon className="h-5 w-5 text-primary" />
          Ponto de virada
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {pontoVirada.explicacao ??
            (faturamentoVirada
              ? `A partir de ${formatBRL(faturamentoVirada)}/mês a recomendação muda de PF para PJ.`
              : 'No intervalo analisado, a recomendação não muda entre PF e PJ.')}
        </p>
      </CardHeader>

      <CardContent>
        <div className="w-full" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={serie}
              margin={{ top: 16, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="faturamento"
                tickFormatter={formatBRLCompact}
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickFormatter={formatBRLCompact}
                className="text-xs"
                tick={{ fontSize: 11 }}
                width={60}
              />
              <Tooltip
                formatter={(v: number) => formatBRL(v)}
                labelFormatter={(l) => `Faturamento ${formatBRL(Number(l))}`}
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="pf11"
                name="PF 11%"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="pf20"
                name="PF 20%"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="pjSimples"
                name="PJ Simples"
                stroke="hsl(var(--cta))"
                strokeWidth={2}
                dot={false}
              />
              {markerUsuario > 0 && (
                <ReferenceLine
                  x={markerUsuario}
                  stroke="hsl(var(--foreground))"
                  strokeWidth={1.5}
                  label={{
                    value: 'Você',
                    position: 'top',
                    fontSize: 10,
                    fill: 'hsl(var(--foreground))',
                  }}
                />
              )}
              {faturamentoVirada && (
                <ReferenceLine
                  x={faturamentoVirada}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="6 3"
                  label={{
                    value: 'Virada',
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: 'hsl(var(--primary))',
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Líquido mensal (R$) por faturamento mensal.
        </p>
      </CardContent>
    </Card>
  );
}
