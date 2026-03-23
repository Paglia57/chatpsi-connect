import { Button } from '@/components/ui/button';

interface StepWelcomeProps {
  displayName: string;
  onNext: () => void;
  onSkip: () => void;
}

export default function StepWelcome({ displayName, onNext, onSkip }: StepWelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-lg mx-auto py-12 px-4 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground font-playfair">
        Bem-vindo ao ChatPsi, {displayName}
      </h1>
      <p className="text-muted-foreground text-base md:text-lg">
        Vamos preparar seu consultório virtual em menos de 2 minutos para você gerar sua primeira evolução clínica com IA.
      </p>
      <Button variant="cta" size="lg" className="px-8 py-4 text-lg rounded-xl shadow-lg" onClick={onNext}>
        Configurar meu consultório
      </Button>
      <button onClick={onSkip} className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors">
        Pular configuração
      </button>
    </div>
  );
}
