import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const [magneticOffset, setMagneticOffset] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant !== 'primary' || disabled || isLoading) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) * 0.18;
    const deltaY = (e.clientY - centerY) * 0.18;
    // Clamp to 6px
    const clampedX = Math.max(-6, Math.min(6, deltaX));
    const clampedY = Math.max(-6, Math.min(6, deltaY));
    setMagneticOffset({ x: clampedX, y: clampedY });
  };

  const handleMouseLeave = () => {
    if (variant === 'primary') {
      setMagneticOffset({ x: 0, y: 0 });
    }
  };

  const baseStyles =
    'group inline-flex items-center justify-center font-medium transition-colors select-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-nearblack/20 disabled:opacity-40 disabled:pointer-events-none relative';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5 h-9',
    md: 'text-xs sm:text-[15px] px-5 sm:px-6 py-2.5 gap-2 min-h-[44px] md:min-h-[52px]',
    lg: 'text-sm sm:text-base px-6 sm:px-7 py-3 gap-2.5 min-h-[48px] md:min-h-[52px]',
  };

  const variantStyles = {
    primary: 'bg-lime hover:bg-[#b8e32c] text-graphite shadow-sm font-medium',
    secondary:
      'bg-white/55 hover:bg-white/75 text-graphite border border-white/60 shadow-sm',
    ghost: 'bg-transparent hover:bg-black/5 text-graphite',
    danger: 'bg-coral hover:bg-coral/90 text-white shadow-sm',
    dark: 'bg-nearblack hover:bg-black text-white shadow-sm',
  };

  return (
    <motion.button
      animate={{ x: magneticOffset.x, y: magneticOffset.y }}
      whileHover={disabled || isLoading ? undefined : { scale: 1.02 }}
      whileTap={disabled || isLoading ? undefined : { scale: 0.97 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="shrink-0 transition-transform duration-200 group-hover:rotate-90">
              {icon}
            </span>
          )}
          <span>{children}</span>
          {icon && iconPosition === 'right' && (
            <span className="shrink-0 transition-transform duration-200 group-hover:rotate-90">
              {icon}
            </span>
          )}
        </>
      )}
    </motion.button>
  );
};
