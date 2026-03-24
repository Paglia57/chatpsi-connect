import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, ArrowRight } from 'lucide-react';

interface FirstTimeGuideProps {
  guideKey: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  tips: string[];
  examples: string[];
  ctaText: string;
  onDismiss: () => void;
  onExampleClick?: (text: string) => void;
}

const FirstTimeGuide: React.FC<FirstTimeGuideProps> = ({
  icon,
  title,
  description,
  tips,
  examples,
  ctaText,
  onDismiss,
  onExampleClick,
}) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(), 300);
  };

  const handleExampleClick = (text: string) => {
    setExiting(true);
    setTimeout(() => {
      onExampleClick?.(text);
      onDismiss();
    }, 300);
  };

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        exiting
          ? 'opacity-0 scale-95'
          : visible
          ? 'opacity-100 scale-100'
          : 'opacity-0 scale-95'
      }`}
    >
      <div className="bg-card rounded-xl shadow-sm border border-border p-6 sm:p-8 max-w-2xl mx-auto">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-primary/10 p-4 rounded-full">
            {icon}
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-lg sm:text-xl font-semibold text-foreground text-center mb-2">
          {title}
        </h3>
        <p className="text-muted-foreground text-center max-w-md mx-auto mb-6 text-sm sm:text-base">
          {description}
        </p>

        {/* Tips */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-3 mb-6">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-3">
              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-foreground/80">{tip}</span>
            </div>
          ))}
        </div>

        {/* Examples */}
        <p className="text-sm font-medium text-muted-foreground mb-3">
          Experimente perguntar:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
          {examples.map((example, i) => (
            <button
              key={i}
              onClick={() => handleExampleClick(example)}
              className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-left text-sm text-primary hover:bg-primary/10 transition-colors cursor-pointer flex items-center gap-2"
            >
              <span className="flex-1">"{example}"</span>
              <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <Button
            onClick={handleDismiss}
            variant="cta"
            className="rounded-xl px-6 py-3 text-base font-medium"
          >
            ✨ {ctaText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FirstTimeGuide;
