import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

export interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  icon: React.ReactNode;
  'aria-label': string;
  variant?: 'glass' | 'ghost' | 'primary' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  'aria-label': ariaLabel,
  variant = 'glass',
  size = 'md',
  active = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 md:w-[52px] md:h-[52px] text-sm md:text-base', // 52px target
    lg: 'w-12 h-12 md:w-[52px] md:h-[52px] text-base',
  };

  const variantStyles = {
    glass: active
      ? 'bg-nearblack text-white shadow-sm'
      : 'bg-white/55 hover:bg-white/80 text-graphite border border-white/60 shadow-sm',
    ghost: active
      ? 'bg-black/10 text-graphite'
      : 'bg-transparent hover:bg-black/5 text-secondary hover:text-graphite',
    primary: 'bg-lime text-graphite hover:bg-[#b8e32c] shadow-sm font-semibold',
    dark: 'bg-nearblack text-white hover:bg-black shadow-sm',
  };

  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      whileHover={disabled ? undefined : { scale: 1.05 }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-full transition-all disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-nearblack/20 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon}
    </motion.button>
  );
};
