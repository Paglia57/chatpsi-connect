import React, { useState, useEffect, useCallback } from 'react';
import Joyride, { CallBackProps, ACTIONS, EVENTS, STATUS, Step, TooltipRenderProps } from 'react-joyride';
import { useNavigate, useLocation } from 'react-router-dom';

interface TourStep extends Step {
  data?: { route?: string };
}

interface GuidedTourProps {
  run: boolean;
  onFinish: () => void;
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="page-home"]',
    content: 'Este é seu painel principal. Aqui você acompanha estatísticas, acessa atalhos e tem uma visão geral da sua atividade.',
    title: '🏠 Início',
    disableBeacon: true,
    placement: 'bottom',
    data: { route: '/app' },
  },
  {
    target: '[data-tour="page-evolution"]',
    content: 'Crie evoluções clínicas com auxílio de IA. Envie texto ou áudio e receba evoluções estruturadas automaticamente.',
    title: '📋 Evolução Clínica',
    placement: 'bottom',
    data: { route: '/app/evolucao' },
  },
  {
    target: '[data-tour="page-patients"]',
    content: 'Gerencie seus pacientes, fichas clínicas, diagnósticos e histórico de sessões. Cada paciente tem um contexto próprio para a IA.',
    title: '👥 Pacientes',
    placement: 'bottom',
    data: { route: '/app/pacientes' },
  },
  {
    target: '[data-tour="page-chat"]',
    content: 'Consulte protocolos, peça sugestões de intervenções e tire dúvidas clínicas com a IA em tempo real.',
    title: '💬 Chat Clínico',
    placement: 'bottom',
    data: { route: '/chat' },
  },
  {
    target: '[data-tour="page-plano"]',
    content: 'Busque planos de ação terapêuticos e materiais psicoeducativos para diferentes quadros clínicos.',
    title: '🎯 Planos de Ação',
    placement: 'bottom',
    data: { route: '/busca-plano' },
  },
  {
    target: '[data-tour="page-artigos"]',
    content: 'Encontre artigos e evidências científicas para embasar suas intervenções clínicas.',
    title: '📖 Artigos Científicos',
    placement: 'bottom',
    data: { route: '/busca-artigos' },
  },
  {
    target: '[data-tour="page-marketing"]',
    content: 'Crie conteúdo para redes sociais e materiais de divulgação para sua prática clínica.',
    title: '✏️ Marketing',
    placement: 'bottom',
    data: { route: '/marketing' },
  },
  {
    target: '[data-tour="page-indicacoes"]',
    content: 'Compartilhe seu código de indicação com colegas. Quando alguém se cadastrar e assinar, vocês dois ganham!',
    title: '🎁 Indique e Ganhe',
    placement: 'bottom',
    data: { route: '/app/indicacoes' },
  },
  {
    target: '[data-tour="nav-suporte"]',
    content: 'Precisa de ajuda? Aqui você pode falar com o suporte ou revisitar este tour a qualquer momento.',
    title: '❓ Suporte',
    placement: 'top',
  },
];

const CustomTooltip: React.FC<TooltipRenderProps> = ({
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  size,
  isLastStep,
}) => (
  <div
    {...tooltipProps}
    className="bg-card border border-border rounded-2xl shadow-xl p-5 max-w-sm animate-in fade-in zoom-in-95 duration-200"
  >
    {step.title && (
      <h3 className="text-base font-bold text-foreground mb-1">{step.title}</h3>
    )}
    <p className="text-sm text-muted-foreground leading-relaxed">{step.content}</p>

    <div className="flex items-center justify-between mt-4 gap-2">
      <span className="text-xs text-muted-foreground">
        {index + 1} de {size}
      </span>
      <div className="flex gap-2">
        {index > 0 && (
          <button
            {...backProps}
            className="px-3 py-1.5 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
          >
            Anterior
          </button>
        )}
        {!isLastStep && (
          <button
            {...closeProps}
            className="px-3 py-1.5 text-sm rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            Pular
          </button>
        )}
        <button
          {...primaryProps}
          className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          {isLastStep ? 'Finalizar' : 'Próximo'}
        </button>
      </div>
    </div>
  </div>
);

const GuidedTour: React.FC<GuidedTourProps> = ({ run, onFinish }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [internalRun, setInternalRun] = useState(false);

  // Sync internal run with prop, navigate to first step route
  useEffect(() => {
    if (run) {
      const firstRoute = tourSteps[0]?.data?.route;
      if (firstRoute && location.pathname !== firstRoute) {
        navigate(firstRoute);
      }
      setStepIndex(0);
      // Delay to let page render
      const timer = setTimeout(() => setInternalRun(true), 500);
      return () => clearTimeout(timer);
    } else {
      setInternalRun(false);
      setStepIndex(0);
    }
  }, [run]);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { action, index, type, status } = data;

    // Tour finished or skipped
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setInternalRun(false);
      // Navigate back to home
      navigate('/app');
      onFinish();
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      const nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1;

      if (nextIndex < 0 || nextIndex >= tourSteps.length) return;

      const nextStep = tourSteps[nextIndex];
      const targetRoute = nextStep.data?.route;

      if (targetRoute && location.pathname !== targetRoute) {
        setIsNavigating(true);
        setInternalRun(false);
        navigate(targetRoute);
        // Wait for page to render before showing tooltip
        setTimeout(() => {
          setStepIndex(nextIndex);
          setInternalRun(true);
          setIsNavigating(false);
        }, 600);
      } else {
        setStepIndex(nextIndex);
      }
    }
  }, [navigate, location.pathname, onFinish]);

  return (
    <Joyride
      steps={tourSteps}
      run={internalRun && !isNavigating}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      disableOverlayClose
      disableScrolling={false}
      tooltipComponent={CustomTooltip}
      callback={handleCallback}
      locale={{
        back: 'Anterior',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular',
      }}
      styles={{
        options: {
          zIndex: 10000,
          arrowColor: 'hsl(var(--card))',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
};

export default GuidedTour;
