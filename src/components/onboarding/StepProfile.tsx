import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

const APPROACHES = [
  "TCC (Terapia Cognitivo-Comportamental)",
  "Psicanálise",
  "Humanista",
  "Comportamental",
  "Sistêmica",
  "Gestalt",
  "Psicodrama",
  "Outra",
];

const SPECIALTIES = [
  "Ansiedade", "Depressão", "TDAH", "Trauma", "Casal",
  "Infantil", "Dependência Química", "Luto", "TEA", "Transtornos Alimentares",
];

interface StepProfileProps {
  onNext: (approach: string, specialties: string[]) => void;
  onSkip: () => void;
}

export default function StepProfile({ onNext, onSkip }: StepProfileProps) {
  const { user, profile } = useAuth();
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [approach, setApproach] = useState(profile?.main_approach || '');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(profile?.specialties || []);
  const [saving, setSaving] = useState(false);

  const toggleSpecialty = (s: string) => {
    setSelectedSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleContinue = async () => {
    if (selectedSpecialties.length === 0) {
      toast.error('Selecione ao menos uma área de atuação para personalizar a IA');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: nickname || null,
          main_approach: approach || null,
          specialties: selectedSpecialties,
          onboarding_step: 1,
        })
        .eq('user_id', user.id);
      if (error) throw error;
      onNext(approach, selectedSpecialties);
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const showConfirmation = approach && selectedSpecialties.length > 0;

  return (
    <div className="max-w-lg mx-auto space-y-6 px-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground font-playfair">Sobre você</h2>
        <p className="text-muted-foreground">Essas informações personalizam a IA para sua prática clínica.</p>
      </div>

      <Card className="rounded-2xl shadow-sm border">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label>Como podemos te chamar?</Label>
            <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Ex: Dr. Ana" />
          </div>

          <div className="space-y-2">
            <Label>Qual sua abordagem principal?</Label>
            <Select value={approach} onValueChange={setApproach}>
              <SelectTrigger><SelectValue placeholder="Selecione a abordagem" /></SelectTrigger>
              <SelectContent>
                {APPROACHES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quais suas especialidades? *</Label>
            <div className="grid grid-cols-2 gap-2">
              {SPECIALTIES.map(s => {
                const isSelected = selectedSpecialties.includes(s);
                return (
                  <label
                    key={s}
                    className={`flex items-center gap-2 cursor-pointer px-2.5 py-1.5 rounded-lg border transition-all duration-200 ${
                      isSelected
                        ? 'bg-teal-50 border-teal-200 scale-[1.02]'
                        : 'border-transparent hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleSpecialty(s)} />
                    <span className="text-sm text-foreground">{s}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {showConfirmation && (
            <p className="text-sm text-success animate-fade-in">
              ✓ A IA vai priorizar conteúdos sobre {selectedSpecialties.join(', ')} com foco em {approach} para você.
            </p>
          )}
        </CardContent>
      </Card>

      <Button variant="cta" className="w-full" size="lg" onClick={handleContinue} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Continuar →
      </Button>
    </div>
  );
}
