import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

export type GlassVariant =
  | 'default'
  | 'sky'
  | 'lime'
  | 'coral'
  | 'sage'
  | 'peach'
  | 'charcoal'
  | 'dark';

export interface GlassCardProps extends HTMLMotionProps<'div'> {
  children?: React.ReactNode;
  className?: string;
  variant?: GlassVariant;
  interactive?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  variant = 'default',
  interactive = false,
  ...props
}) => {
  const variantClasses: Record<GlassVariant, string> = {
    default: 'glass-surface text-graphite',
    sky: 'glass-surface-sky text-graphite',
    lime: 'glass-surface-lime text-graphite',
    coral: 'glass-surface-coral text-graphite',
    sage: 'glass-surface-sage text-graphite',
    peach: 'glass-surface-peach text-graphite',
    charcoal: 'dark-card-surface text-white',
    dark: 'dark-card-surface text-white',
  };

  return (
    <motion.div
      whileHover={
        interactive
          ? {
              y: -4,
              transition: { type: 'spring', stiffness: 350, damping: 25 },
            }
          : undefined
      }
      whileTap={interactive ? { scale: 0.98 } : undefined}
      className={`p-6 sm:p-8 rounded-[30px] transition-all duration-200 ${variantClasses[variant]} ${
        interactive
          ? 'cursor-pointer hover:border-lime/60 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.90),0_28px_52px_-18px_rgba(20,25,30,0.34)]'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};
