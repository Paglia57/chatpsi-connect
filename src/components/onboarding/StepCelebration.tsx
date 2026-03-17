import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ClipboardCopy, Check, MessageCircle, BookOpen, Target, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { parseEvolutionContent } from '@/lib/evolutionParser';
import confetti from 'canvas-confetti';

interface StepCelebrationProps {
  evolutionContent: string;
  onFinish: () => void;
}

const features = [
  { icon: MessageCircle, title: 'Chat Clínico', desc: 'Discuta casos e consulte protocolos', emoji: '💬', route: '/chat' },
  { icon: BookOpen, title: 'Artigos Científicos', desc: 'Busque evidências para suas intervenções', emoji: '📚', route: '/busca-artigos' },
  { icon: Target, title: 'Planos de Ação', desc: 'Monte planos terapêuticos com IA', emoji: '🎯', route: '/busca-plano' },
  { icon: Megaphone, title: 'IA de Marketing', desc: 'Crie conteúdo para redes sociais', emoji: '✍️', route: '/marketing' },
];

export default function StepCelebration({ evolutionContent, onFinish }: StepCelebrationProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, colors: ['#0d9488', '#ec4899', '#f59e0b'] });
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(evolutionContent);
    setCopied(true);
    toast.success('Evolução copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  const parsed = parseEvolutionContent(evolutionContent);

  return (
    <div className="max-w-lg mx-auto space-y-6 px-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground font-playfair">Sua primeira evolução foi gerada! 🎉</h2>
      </div>

      <Card className="rounded-2xl shadow-sm border">
        <CardContent className="p-4">
          <div className="max-h-[300px] overflow-y-auto prose prose-sm max-w-none">
            {parsed.map((line, i) => {
              switch (line.type) {
                case 'empty': return <div key={i} className="h-2" />;
                case 'separator': return <Separator key={i} className="my-2" />;
                case 'title': return <h2 key={i} className="font-display font-semibold text-base text-foreground text-center border-b border-border pb-2 mb-2">{line.content}</h2>;
                case 'heading': return <h3 key={i} className="font-display font-semibold text-xs text-foreground uppercase tracking-wide mt-3 mb-1">{line.content}</h3>;
                case 'metadata': return <p key={i} className="text-xs text-muted-foreground">{line.content}</p>;
                case 'text': return <p key={i} className="text-xs text-foreground leading-relaxed">{line.content}</p>;
              }
            })}
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground text-center">O que mais você pode fazer no ChatPsi:</p>
        <div className="grid grid-cols-2 gap-3">
          {features.map(f => (
            <Card
              key={f.title}
              className="rounded-xl border cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/50"
              onClick={() => { onFinish(); navigate(f.route); }}
            >
              <CardContent className="p-3 text-center space-y-1">
                <span className="text-xl">{f.emoji}</span>
                <p className="text-xs font-semibold text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-tight">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Button variant="cta" className="w-full" size="lg" onClick={onFinish}>
        Explorar o ChatPsi →
      </Button>
    </div>
  );
}
