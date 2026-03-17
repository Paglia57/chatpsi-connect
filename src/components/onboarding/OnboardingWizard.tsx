import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import StepWelcome from './StepWelcome';
import StepProfile from './StepProfile';
import StepPatient from './StepPatient';
import StepEvolution from './StepEvolution';
import StepCelebration from './StepCelebration';

const STEP_LABELS = ['Boas-vindas', 'Seu perfil', 'Primeiro paciente', 'Primeira evolução', 'Pronto!'];

interface OnboardingWizardProps {
  initialStep?: number;
  onComplete: () => void;
}

export default function OnboardingWizard({ initialStep = 0, onComplete }: OnboardingWizardProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [selectedApproach, setSelectedApproach] = useState(profile?.main_approach || '');
  const [createdPatient, setCreatedPatient] = useState<{ id: string; full_name: string; initials: string; approach: string } | null>(null);
  const [evolutionContent, setEvolutionContent] = useState('');

  const displayName = profile?.nickname || profile?.full_name?.split(' ')[0] || 'Profissional';
  const totalSteps = 4; // Steps 1-4 are the "real" steps (0 is welcome)
  const progressPercent = currentStep === 0 ? 0 : Math.round((currentStep / totalSteps) * 100);

  const handleSkip = async () => {
    if (!user) return;
    await supabase.from('profiles').update({
      onboarding_step: Math.max(currentStep, 1),
      has_completed_onboarding: false,
    }).eq('user_id', user.id);
    await refreshProfile();
    onComplete();
  };

  const handleFinish = async () => {
    if (!user) return;
    await supabase.from('profiles').update({
      has_completed_onboarding: true,
      onboarding_step: 4,
    }).eq('user_id', user.id);
    await refreshProfile();
    onComplete();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepWelcome displayName={displayName} onNext={() => setCurrentStep(1)} onSkip={handleSkip} />;
      case 1:
        return (
          <StepProfile
            onNext={(approach, _specialties) => {
              setSelectedApproach(approach);
              setCurrentStep(2);
            }}
            onSkip={handleSkip}
          />
        );
      case 2:
        return (
          <StepPatient
            selectedApproach={selectedApproach}
            onNext={(patient) => {
              setCreatedPatient(patient);
              setCurrentStep(3);
            }}
            onSkip={handleSkip}
          />
        );
      case 3:
        return (
          <StepEvolution
            selectedApproach={selectedApproach}
            createdPatient={createdPatient}
            onNext={(content) => {
              setEvolutionContent(content);
              setCurrentStep(4);
            }}
            onSkip={handleSkip}
          />
        );
      case 4:
        return <StepCelebration evolutionContent={evolutionContent} onFinish={handleFinish} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="w-full max-w-lg mx-auto pt-6 px-4 space-y-4">
        <div className="flex justify-center">
          <img src="/logo.png" alt="ChatPsi" className="h-10 object-contain" />
        </div>

        {/* Progress bar */}
        {currentStep > 0 && (
          <div className="space-y-2">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Passo {Math.min(currentStep, totalSteps)} de {totalSteps} — {STEP_LABELS[currentStep]}
            </p>
          </div>
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-start justify-center py-6">
        <div className="w-full animate-slide-in-right-fade" key={currentStep}>
          {renderStep()}
        </div>
      </div>

      {/* Skip button footer */}
      {currentStep > 0 && currentStep < 4 && (
        <div className="pb-6 text-center">
          <button onClick={handleSkip} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Pular configuração
          </button>
        </div>
      )}
    </div>
  );
}
