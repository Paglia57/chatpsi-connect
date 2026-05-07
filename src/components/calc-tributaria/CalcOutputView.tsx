import { CalcOutput } from '@/lib/calc-tributaria/types';
import HeroResultCard from './HeroResultCard';
import CenariosComparativo from './CenariosComparativo';
import PrevidenciaCard from './PrevidenciaCard';
import PontoViradaCard from './PontoViradaCard';
import PremissasCard from './PremissasCard';
import Disclaimer from './Disclaimer';

interface CalcOutputViewProps {
  output: CalcOutput;
}

export default function CalcOutputView({ output }: CalcOutputViewProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      <HeroResultCard recomendacao={output.recomendacao} />
      <CenariosComparativo
        cenarios={output.cenarios}
        recomendacao={output.recomendacao}
      />
      <PrevidenciaCard cenarios={output.cenarios} />
      <PontoViradaCard pontoVirada={output.pontoVirada} />
      <PremissasCard premissas={output.premissas} />
      <Disclaimer />
    </div>
  );
}
