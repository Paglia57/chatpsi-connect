import React, { useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps } from 'react-joyride';

interface GuidedTourProps {
  run: boolean;
  onFinish: () => void;
}

const steps: Step[] = [
  {
    target: '[data-tour="nav-inicio"]',
    content: 'Este é seu painel principal. Aqui você acompanha estatísticas e tem uma visão geral da sua atividade.',
    title: '🏠 Início',
    disableBeacon: true,
    placement: 'right',
  },
  {
    target: '[data-tour="nav-evolucao"]',
    content: 'Crie evoluções clínicas com auxílio de IA. Envie texto ou áudio e receba evoluções estruturadas automaticamente.',
    title: '📋 Evolução',
    placement: 'right',
  },
  {
    target: '[data-tour="nav-pacientes"]',
    content: 'Gerencie seus pacientes, fichas clínicas, diagnósticos e histórico de sessões.',
    title: '👥 Pacientes',
    placement: 'right',
  },
  {
    target: '[data-tour="nav-chat"]',
    content: 'Consulte protocolos, peça sugestões de intervenções e tire dúvidas clínicas com a IA.',
    title: '💬 Chat Clínico',
    placement: 'right',
  },
  {
    target: '[data-tour="nav-plano"]',
    content: 'Busque planos de ação terapêuticos e materiais psicoeducativos para diferentes quadros.',
    title: '🎯 Planos de Ação',
    placement: 'right',
  },
  {
    target: '[data-tour="nav-artigos"]',
    content: 'Encontre artigos e evidências científicas para embasar suas intervenções clínicas.',
    title: '📖 Artigos Científicos',
    placement: 'right',
  },
  {
    target: '[data-tour="nav-marketing"]',
    content: 'Crie conteúdo para redes sociais e materiais de divulgação para sua prática.',
    title: '✏️ Marketing',
    placement: 'right',
  },
  {
    target: '[data-tour="nav-suporte"]',
    content: 'Precisa de ajuda? Aqui você pode falar com o suporte ou revisitar este tour a qualquer momento.',
    title: '❓ Suporte',
    placement: 'top',
  },
];

const CustomTooltip: React.FC<TooltipRenderProps> = ({
  continuous,
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
  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onFinish();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      scrollToFirstStep
      disableOverlayClose
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
