import React from 'react';
import { GlassCard } from './GlassCard';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <GlassCard className={`p-8 sm:p-12 text-center flex flex-col items-center justify-center ${className}`}>
      <div className="w-14 h-14 rounded-full bg-white/50 border border-white/70 flex items-center justify-center text-graphite mb-4 shadow-sm">
        {icon}
      </div>
      <h3 className="text-xl font-normal text-graphite mb-1.5 tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-secondary max-w-sm mb-6 leading-relaxed font-normal">{description}</p>
      {action && <div>{action}</div>}
    </GlassCard>
  );
};
