import { motion } from 'framer-motion';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
  size = 'sm',
}: SegmentedControlProps<T>) {
  const sizeStyles = {
    sm: 'p-1 gap-1 text-xs',
    md: 'p-1.5 gap-1.5 text-xs sm:text-sm',
  };

  const itemPadding = {
    sm: 'px-3 py-1',
    md: 'px-4 py-1.5',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full bg-black/[0.06] backdrop-blur-md border border-white/40 ${sizeStyles[size]} ${className}`}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative rounded-full font-medium transition-colors select-none ${itemPadding[size]} ${
              isActive ? 'text-graphite' : 'text-secondary hover:text-graphite'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="segmentedPillActive"
                className="absolute inset-0 bg-white rounded-full shadow-[0_2px_8px_rgba(27,29,31,0.08)]"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
