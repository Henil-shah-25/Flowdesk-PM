import React from 'react';
import { motion } from 'framer-motion';

export interface ProgressBarProps {
  value: number; // 0 to 100
  accent?: 'lime' | 'coral' | 'amber' | 'charcoal';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const accentColors = {
  lime: '#C6F432',
  coral: '#F26B3A',
  amber: '#F5A524',
  charcoal: '#35383A',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  accent = 'lime',
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  // Default to thin 6px pill bar (h-1.5)
  const heights = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs mb-1.5 font-normal">
          <span className="text-secondary">Progress</span>
          <span className="text-graphite font-medium">{Math.round(clamped)}%</span>
        </div>
      )}
      <div className={`w-full bg-black/[0.08] rounded-full overflow-hidden ${heights[size]}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          className="h-full rounded-full"
          style={{ backgroundColor: accentColors[accent] || '#C6F432' }}
        />
      </div>
    </div>
  );
};
