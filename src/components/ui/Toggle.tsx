import React from 'react';
import { motion } from 'framer-motion';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
  size?: 'sm' | 'md';
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  id,
  size = 'md',
}) => {
  const switchId = id || (label ? `toggle-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  const dimensions = size === 'sm'
    ? { width: 34, height: 18, circle: 14, translate: 16 }
    : { width: 42, height: 22, circle: 18, translate: 20 };

  return (
    <label
      htmlFor={switchId}
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      }`}
    >
      <button
        id={switchId}
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className="relative inline-flex items-center rounded-full p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/40"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          backgroundColor: checked ? '#C6F432' : 'rgba(27, 29, 31, 0.16)',
        }}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          animate={{ x: checked ? dimensions.translate : 0 }}
          className="block rounded-full bg-white shadow-sm"
          style={{
            width: dimensions.circle,
            height: dimensions.circle,
          }}
        />
      </button>
      {label && <span className="text-xs sm:text-[13px] text-graphite">{label}</span>}
    </label>
  );
};
