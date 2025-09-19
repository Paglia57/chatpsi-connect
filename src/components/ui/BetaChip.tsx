import React from 'react';
import { cn } from '@/lib/utils';

interface BetaChipProps {
  variant?: 'normal' | 'compact';
  className?: string;
}

const BetaChip: React.FC<BetaChipProps> = ({ 
  variant = 'normal', 
  className 
}) => {
  return (
    <div 
      className={cn(
        "sidebar-beta-chip inline-flex items-center justify-center whitespace-nowrap font-bold text-xs uppercase tracking-wider transition-all duration-200",
        variant === 'compact' ? "px-2 py-1 rounded-md" : "px-3 py-2 rounded-full",
        "bg-white/20 text-white border border-white/30",
        "hover:bg-white/30 hover:border-white/40",
        "shadow-sm backdrop-blur-sm",
        className
      )}
    >
      VERSÃO BETA
    </div>
  );
};

export default BetaChip;