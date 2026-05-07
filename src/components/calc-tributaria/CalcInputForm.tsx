import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calculator, Sliders, Trash2 } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import BetaChip from '@/components/ui/BetaChip';
import { cn } from '@/lib/utils';

import { CalcInput, RefinamentoInput } from '@/lib/calc-tributaria/types';
import { parseBRLInput } from '@/lib/calc-tributaria/format';
import { clearLastInput } from '@/lib/calc-tributaria/storage';
import RefineDialog from './RefineDialog';

const schema = z.object({
  faturamentoBRL: z.string().min(1, 'Informe o faturamento mensal'),
  atuacao: z.enum(['PF', 'PJ', 'AMBOS', 'NAO_COMECEI']),
  prioridade: z.enum(['ECONOMIA', 'APOSENTADORIA']),
});

type FormData = z.infer<typeof schema>;

function formatarMoedaInput(valor: string): string {
  const apenasNumeros = valor.replace(/\D/g, '');
  if (!apenasNumeros) return '';
  const numero = parseInt(apenasNumeros, 10) / 100;
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

interface CalcInputFormProps {
  defaultValues?: Partial<CalcInput>;
  onSubmit: (input: CalcInput) => void;
  isCalculating: boolean;
  hasResult: boolean;
}

export default function CalcInputForm({
  defaultValues,
  onSubmit,
  isCalculating,
  hasResult,
}: CalcInputFormProps) {
  const [refineOpen, setRefineOpen] = useState(false);
  const [refinamento, setRefinamento] = useState<RefinamentoInput | undefined>(
    defaultValues?.refinamento,
  );

  const initialFaturamento = defaultValues?.faturamentoMensal
    ? defaultValues.faturamentoMensal.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
      })
    : '';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      faturamentoBRL: initialFaturamento,
      atuacao: defaultValues?.atuacao ?? 'PF',
      prioridade: defaultValues?.prioridade ?? 'ECONOMIA',
    },
  });

  const atuacao = watch('atuacao');
  const prioridade = watch('prioridade');
  const faturamentoBRL = watch('faturamentoBRL');

  const submit = (data: FormData) => {
    const faturamentoMensal = parseBRLInput(data.faturamentoBRL);
    const input: CalcInput = {
      faturamentoMensal,
      atuacao: data.atuacao,
      prioridade: data.prioridade,
      refinamento,
    };
    onSubmit(input);
  };

  const handleClearStorage = () => {
    clearLastInput();
    setValue('faturamentoBRL', '');
    setRefinamento(undefined);
  };

  const refinamentosCount = refinamento
    ? Object.values(refinamento).filter((v) => v !== undefined && v !== null).length
    : 0;

  return (
    <Card data-tour="calc-trib-input">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calculator className="h-5 w-5 text-primary" />
            Calculadora Tributária PF vs PJ
          </CardTitle>
          <CardDescription>
            Análise gratuita e instantânea. Seus dados ficam apenas no seu navegador.
          </CardDescription>
        </div>
        <BetaChip
          variant="compact"
          className="!bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20"
        />
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(submit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="faturamentoBRL" className="text-sm font-medium">
              Faturamento médio mensal
            </Label>
            <Input
              id="faturamentoBRL"
              inputMode="numeric"
              placeholder="Ex: R$ 8.000,00"
              {...register('faturamentoBRL')}
              onChange={(e) => {
                setValue('faturamentoBRL', formatarMoedaInput(e.target.value), {
                  shouldValidate: true,
                });
              }}
              className={cn(
                'text-lg font-semibold',
                errors.faturamentoBRL && 'border-destructive',
              )}
            />
            {errors.faturamentoBRL && (
              <p className="text-xs text-destructive">
                {errors.faturamentoBRL.message}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Como você atua hoje?</Label>
            <RadioGroup
              value={atuacao}
              onValueChange={(v) => setValue('atuacao', v as FormData['atuacao'])}
              className="grid grid-cols-2 gap-2"
            >
              <RadioOption id="atu-pf" value="PF" label="Pessoa Física" />
              <RadioOption id="atu-pj" value="PJ" label="Pessoa Jurídica" />
              <RadioOption id="atu-ambos" value="AMBOS" label="Ambos" />
              <RadioOption
                id="atu-naocomecei"
                value="NAO_COMECEI"
                label="Ainda não comecei"
              />
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Sua prioridade hoje</Label>
            <RadioGroup
              value={prioridade}
              onValueChange={(v) =>
                setValue('prioridade', v as FormData['prioridade'])
              }
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              <RadioOption
                id="pri-economia"
                value="ECONOMIA"
                label="Pagar menos imposto agora"
              />
              <RadioOption
                id="pri-aposent"
                value="APOSENTADORIA"
                label="Construir aposentadoria robusta"
              />
            </RadioGroup>
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setRefineOpen(true)}
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-hover hover:underline"
            >
              <Sliders className="h-4 w-4" />
              {refinamentosCount > 0
                ? `Refinamento ativo (${refinamentosCount} ${refinamentosCount === 1 ? 'campo' : 'campos'})`
                : 'Tenho dados específicos para informar'}
            </button>

            {(faturamentoBRL || hasResult) && (
              <button
                type="button"
                onClick={handleClearStorage}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
                Limpar histórico
              </button>
            )}
          </div>

          <Button
            type="submit"
            variant="cta"
            size="lg"
            className="w-full"
            disabled={isCalculating}
          >
            {isCalculating ? 'Calculando...' : 'Gerar análise'}
          </Button>
        </form>
      </CardContent>

      <RefineDialog
        open={refineOpen}
        onOpenChange={setRefineOpen}
        initial={refinamento}
        onSave={(novoRefinamento) => {
          setRefinamento(novoRefinamento);
          setRefineOpen(false);
        }}
      />
    </Card>
  );
}

function RadioOption({
  id,
  value,
  label,
}: {
  id: string;
  value: string;
  label: string;
}) {
  return (
    <Label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-background p-3 hover:border-primary hover:bg-primary-light/30 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-light/40 has-[:checked]:text-primary"
    >
      <RadioGroupItem id={id} value={value} />
      <span className="text-sm font-medium">{label}</span>
    </Label>
  );
}
