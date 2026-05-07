import { useState } from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Premissa } from '@/lib/calc-tributaria/types';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';

interface PremissasCardProps {
  premissas: Premissa[];
}

export default function PremissasCard({ premissas }: PremissasCardProps) {
  const { isMobile } = useResponsive();
  const [open, setOpen] = useState(!isMobile);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer pb-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-primary" />
                Premissas usadas
              </CardTitle>
              <ChevronDown
                className={cn(
                  'h-5 w-5 text-muted-foreground transition-transform',
                  open && 'rotate-180',
                )}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Tudo que assumimos no cálculo. Toque em "Refinar" para ajustar.
            </p>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <dl className="divide-y divide-border">
              {premissas.map((p, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-1"
                >
                  <dt className="text-sm text-muted-foreground">{p.label}</dt>
                  <dd className="text-sm font-medium text-foreground sm:text-right">
                    {p.valor}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
