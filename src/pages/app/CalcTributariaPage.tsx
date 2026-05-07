import { useEffect, useRef, useState } from 'react';
import AppBreadcrumb from '@/components/ui/AppBreadcrumb';
import CalcInputForm from '@/components/calc-tributaria/CalcInputForm';
import CalcOutputView from '@/components/calc-tributaria/CalcOutputView';
import { calcularAnalise } from '@/lib/calc-tributaria';
import { CalcInput, CalcOutput } from '@/lib/calc-tributaria/types';
import { loadLastInput, saveLastInput } from '@/lib/calc-tributaria/storage';

export default function CalcTributariaPage() {
  const [output, setOutput] = useState<CalcOutput | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [defaultInput, setDefaultInput] = useState<Partial<CalcInput> | undefined>();
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const last = loadLastInput();
    if (last) setDefaultInput(last);
  }, []);

  const handleCalculate = (input: CalcInput) => {
    setIsCalculating(true);
    requestAnimationFrame(() => {
      const result = calcularAnalise(input);
      setOutput(result);
      saveLastInput(input);
      setIsCalculating(false);
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
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

      <CalcInputForm
        defaultValues={defaultInput}
        onSubmit={handleCalculate}
        isCalculating={isCalculating}
        hasResult={output !== null}
      />

      {output && (
        <div ref={resultRef}>
          <CalcOutputView output={output} />
        </div>
      )}
    </div>
  );
}
