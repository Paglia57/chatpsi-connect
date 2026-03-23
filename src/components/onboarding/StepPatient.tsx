import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface StepPatientProps {
  selectedApproach: string;
  onNext: (patient: { id: string; full_name: string; initials: string; approach: string } | null) => void;
  onSkip: () => void;
}

export default function StepPatient({ selectedApproach, onNext, onSkip }: StepPatientProps) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [approach, setApproach] = useState(selectedApproach);
  const [saving, setSaving] = useState(false);

  const generateInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 3).toUpperCase();
  };

  const handleCreate = async () => {
    if (!fullName.trim() || !user) return;
    setSaving(true);
    try {
      const initials = generateInitials(fullName);
      const { data, error } = await supabase
        .from('patients')
        .insert({
          user_id: user.id,
          full_name: fullName.trim(),
          initials,
          approach: approach || null,
          status: 'active',
        })
        .select('id, full_name, initials, approach')
        .single();
      if (error) throw error;

      // Create patient thread
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (token && data) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-patient-thread`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              patient_name: data.full_name,
              patient_initials: data.initials,
              approach: data.approach,
            }),
          });
        }
      } catch { /* thread creation is non-blocking */ }

      // Update onboarding step
      await supabase.from('profiles').update({ onboarding_step: 2 }).eq('user_id', user.id);

      onNext(data);
    } catch (err: any) {
      toast.error('Erro ao cadastrar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleSkipPatient = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ onboarding_step: 2 }).eq('user_id', user.id);
    onNext(null);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 px-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground font-playfair">Cadastre seu primeiro paciente</h2>
        <p className="text-muted-foreground">Cadastre um paciente para vincular às suas evoluções. Use iniciais ou apelido — os dados ficam protegidos.</p>
      </div>

      <Card className="rounded-2xl shadow-sm border">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label>Nome completo ou iniciais do paciente *</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ex: Maria S. ou M.S." />
            <p className="text-xs text-muted-foreground">Use iniciais para maior sigilo. Você poderá editar depois.</p>
          </div>
          <div className="space-y-2">
            <Label>Abordagem para este paciente</Label>
            <Select value={approach} onValueChange={setApproach}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {APPROACHES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button variant="cta" className="w-full" size="lg" onClick={handleCreate} disabled={saving || !fullName.trim()}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Cadastrar e continuar →
      </Button>

      <button onClick={handleSkipPatient} className="block mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors">
        Pular, cadastro depois
      </button>
    </div>
  );
}
