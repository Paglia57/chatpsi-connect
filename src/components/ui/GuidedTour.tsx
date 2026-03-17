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

const Tip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-2 text-sm text-muted-foreground">
    <span className="text-primary mt-0.5">•</span>
    <span>{children}</span>
  </li>
);

const StepContent: React.FC<{ desc: string; tips: string[] }> = ({ desc, tips }) => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    <ul className="space-y-1.5">
      {tips.map((t, i) => <Tip key={i}>{t}</Tip>)}
    </ul>
  </div>
);

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="page-home"]',
    content: (
      <StepContent
        desc="Seu painel principal com visão geral da sua atividade."
        tips={[
          'Acompanhe estatísticas de sessões e evoluções',
          'Use os atalhos rápidos para acessar qualquer módulo',
          'Veja pacientes recentes e atividade do dia',
        ]}
      />
    ),
    title: '🏠 Início',
    disableBeacon: true,
    placement: 'bottom',
    data: { route: '/app' },
  },
  {
    target: '[data-tour="page-evolution"]',
    content: (
      <StepContent
        desc="Crie evoluções clínicas estruturadas com auxílio de IA."
        tips={[
          'Envie texto livre ou grave um áudio da sessão',
          'A IA gera a evolução formatada automaticamente',
          'Selecione o paciente para contextualizar a evolução',
        ]}
      />
    ),
    title: '📋 Evolução Clínica',
    disableBeacon: true,
    placement: 'bottom',
    data: { route: '/app/evolucao' },
  },
  {
    target: '[data-tour="page-patients"]',
    content: (
      <StepContent
        desc="Gerencie seus pacientes e fichas clínicas completas."
        tips={[
          'Cadastre pacientes com diagnóstico CID-10 e DSM-5',
          'Adicione queixa principal, medicação e abordagem',
          'A IA usa o contexto do paciente nas evoluções',
        ]}
      />
    ),
    title: '👥 Pacientes',
    disableBeacon: true,
    placement: 'bottom',
    data: { route: '/app/pacientes' },
  },
  {
    target: '[data-tour="page-chat"]',
    content: (
      <StepContent
        desc="Tire dúvidas clínicas e peça sugestões em tempo real."
        tips={[
          'Pergunte sobre protocolos e técnicas de intervenção',
          'Peça sugestões de atividades para quadros específicos',
          'Consulte critérios diagnósticos e materiais psicoeducativos',
        ]}
      />
    ),
    title: '💬 Chat Clínico',
    disableBeacon: true,
    placement: 'bottom',
    data: { route: '/chat' },
  },
  {
    target: '[data-tour="page-plano"]',
    content: (
      <StepContent
        desc="Monte planos de ação terapêuticos personalizados."
        tips={[
          'Busque planos por quadro clínico ou demanda do paciente',
          'Receba sugestões de objetivos e intervenções',
          'Adapte os planos à sua abordagem terapêutica',
        ]}
      />
    ),
    title: '🎯 Planos de Ação',
    disableBeacon: true,
    placement: 'bottom',
    data: { route: '/busca-plano' },
  },
  {
    target: '[data-tour="page-artigos"]',
    content: (
      <StepContent
        desc="Encontre evidências científicas para suas intervenções."
        tips={[
          'Busque artigos por tema, técnica ou transtorno',
          'Use as referências para embasar seus relatórios',
          'Acesse resumos e links para os estudos completos',
        ]}
      />
    ),
    title: '📖 Artigos Científicos',
    disableBeacon: true,
    placement: 'bottom',
    data: { route: '/busca-artigos' },
  },
  {
    target: '[data-tour="page-marketing"]',
    content: (
      <StepContent
        desc="Crie conteúdo profissional para divulgar sua prática."
        tips={[
          'Gere posts para Instagram, LinkedIn e outras redes',
          'Crie textos educativos e carrosséis informativos',
          'Adapte o tom e estilo ao seu público-alvo',
        ]}
      />
    ),
    title: '✏️ Marketing',
    disableBeacon: true,
    placement: 'bottom',
    data: { route: '/marketing' },
  },
  {
    target: '[data-tour="page-indicacoes"]',
    content: (
      <StepContent
        desc="Indique colegas e ganhe benefícios exclusivos."
        tips={[
          'Compartilhe seu código de indicação com colegas',
          'Quando alguém assinar, vocês dois são recompensados',
          'Acompanhe suas indicações e resgates aqui',
        ]}
      />
    ),
    title: '🎁 Indique e Ganhe',
    disableBeacon: true,
    placement: 'bottom',
    data: { route: '/app/indicacoes' },
  },
  {
    target: '[data-tour="nav-suporte"]',
    content: (
      <StepContent
        desc="Acesse suporte e revisite este tour quando precisar."
        tips={[
          'Clique em "Revisitar orientações" para rever este guia',
          'Use "Falar com suporte" para contato direto via WhatsApp',
        ]}
      />
    ),
    title: '❓ Suporte',
    disableBeacon: true,
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
      <h3 className="text-base font-bold text-foreground mb-2">{step.title}</h3>
    )}
    <div>{step.content}</div>

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

  const waitForTarget = useCallback((stepIdx: number, cb: () => void) => {
    const target = tourSteps[stepIdx]?.target;
    if (!target || typeof target !== 'string') { cb(); return; }
    let attempts = 0;
    const check = () => {
      if (document.querySelector(target)) { cb(); return; }
      attempts++;
      if (attempts < 20) setTimeout(check, 100);
    };
    check();
  }, []);

  useEffect(() => {
    if (run) {
      const firstRoute = tourSteps[0]?.data?.route;
      if (firstRoute && location.pathname !== firstRoute) {
        navigate(firstRoute);
      }
      setStepIndex(0);
      const timer = setTimeout(() => waitForTarget(0, () => setInternalRun(true)), 300);
      return () => clearTimeout(timer);
    } else {
      setInternalRun(false);
      setStepIndex(0);
    }
  }, [run]);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { action, index, type, status } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setInternalRun(false);
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
        setTimeout(() => {
          waitForTarget(nextIndex, () => {
            setStepIndex(nextIndex);
            setInternalRun(true);
            setIsNavigating(false);
          });
        }, 300);
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
