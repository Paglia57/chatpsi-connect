import { Info } from 'lucide-react';

export default function Disclaimer() {
  return (
    <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground flex items-start gap-2">
      <Info className="h-4 w-4 shrink-0 mt-0.5" />
      <p>
        <strong className="text-foreground">Aviso importante.</strong> Esta
        análise foi gerada por inteligência artificial com base nas regras
        tributárias vigentes em 2026 e nos dados que você informou.{' '}
        <strong className="text-foreground">
          Não é uma recomendação profissional.
        </strong>{' '}
        Os valores reais podem variar conforme sua situação específica,
        deduções aplicáveis, mudanças na legislação e particularidades do seu
        CNAE. Antes de decidir entre PF e PJ — ou de migrar entre regimes —
        consulte um profissional de contabilidade.
      </p>
    </div>
  );
}
