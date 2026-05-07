import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import AppBreadcrumb from '@/components/ui/AppBreadcrumb';
import TrialLimitBanner from '@/components/ui/TrialLimitBanner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import CalcInputForm from '@/components/calc-tributaria/CalcInputForm';
import CalcOutputView from '@/components/calc-tributaria/CalcOutputView';

import { CalcInput, CalcOutput, PontoVirada } from '@/lib/calc-tributaria/types';
import { calcularPontoVirada } from '@/lib/calc-tributaria/pontoVirada';
import { loadLastInput, saveLastInput } from '@/lib/calc-tributaria/storage';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTrialLimit } from '@/hooks/useTrialLimit';

const TRIAL_LIMIT = 2;

interface IADispatchOutput {
  cenarios: CalcOutput['cenarios'];
  recomendacao: CalcOutput['recomendacao'];
  pontoVirada: Omit<PontoVirada, 'serie'>;
  premissas: CalcOutput['premissas'];
}

export default function CalcTributariaPage() {
  const { user } = useAuth();
  const [output, setOutput] = useState<CalcOutput | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<CalcInput | null>(null);
  const [defaultInput, setDefaultInput] = useState<Partial<CalcInput> | undefined>();
  const resultRef = useRef<HTMLDivElement | null>(null);

  const trial = useTrialLimit('calc_tributaria_history', TRIAL_LIMIT);

  useEffect(() => {
    const last = loadLastInput();
    if (last) setDefaultInput(last);
  }, []);

  const runAnalysis = async (input: CalcInput) => {
    if (!user) {
      toast.error('Você precisa estar logado para gerar a análise.');
      return;
    }
    if (trial.hasReachedLimit) {
      toast.error(
        `Limite gratuito de ${TRIAL_LIMIT} análises por mês atingido. Assine para análises ilimitadas.`,
      );
      return;
    }

    setIsCalculating(true);
    setErrorMsg(null);
    setOutput(null);
    setLastInput(input);
    saveLastInput(input);

    try {
      const { data, error } = await supabase.functions.invoke(
        'calc_tributaria_dispatch',
        { body: { input } },
      );

      if (error) {
        throw new Error(
          (error as { message?: string }).message ?? 'Erro ao chamar a IA.',
        );
      }

      if (!data?.success || !data?.output) {
        throw new Error(data?.error ?? 'A IA não retornou um resultado válido.');
      }

      const ia = data.output as IADispatchOutput;

      // A IA retorna faturamentoVirada + explicacao; a "serie" para o gráfico
      // continua sendo calculada localmente para preservar a visualização.
      const serieLocal = calcularPontoVirada(input);

      const fullOutput: CalcOutput = {
        input,
        cenarios: ia.cenarios,
        recomendacao: ia.recomendacao,
        pontoVirada: {
          faturamentoVirada:
            ia.pontoVirada?.faturamentoVirada ?? serieLocal.faturamentoVirada,
          markerUsuario: input.faturamentoMensal,
          serie: serieLocal.serie,
          explicacao: ia.pontoVirada?.explicacao,
        },
        premissas: ia.premissas,
        geradoEm: new Date().toISOString(),
      };

      setOutput(fullOutput);
      // Recarrega contagem do trial após sucesso
      trial.refetch?.();

      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro inesperado.';
      console.error('[CalcTributaria] erro:', e);
      setErrorMsg(message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleRetry = () => {
    if (lastInput) {
      runAnalysis(lastInput);
    }
  };

  return (
    <div
      className="max-w-4xl mx-auto space-y-6"
      data-tour="page-calc-tributaria"
    >
      <AppBreadcrumb
        items={[
          { label: 'Ferramentas IA', href: '/app/calculadora-tributaria' },
          { label: 'Calculadora Tributária' },
        ]}
      />

      {!trial.isSubscribed && (
        <TrialLimitBanner
          usageCount={trial.usageCount}
          limit={trial.limit}
          hasReachedLimit={trial.hasReachedLimit}
          featureLabel="análises tributárias"
          isLoading={trial.isLoading}
        />
      )}

      <CalcInputForm
        defaultValues={defaultInput}
        onSubmit={runAnalysis}
        isCalculating={isCalculating}
        hasResult={output !== null}
      />

      {isCalculating && (
        <div ref={resultRef} className="space-y-4">
          <SkeletonResult />
        </div>
      )}

      {!isCalculating && errorMsg && (
        <div ref={resultRef}>
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-destructive">
                    Não conseguimos gerar a análise agora
                  </p>
                  <p className="text-sm text-muted-foreground">{errorMsg}</p>
                </div>
              </div>
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {!isCalculating && !errorMsg && output && (
        <div ref={resultRef}>
          <CalcOutputView output={output} />
        </div>
      )}
    </div>
  );
}

function SkeletonResult() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-72" />
      <p className="text-center text-xs text-muted-foreground pt-2">
        Gerando sua análise tributária com IA…
      </p>
    </div>
  );
}
