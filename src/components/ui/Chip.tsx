import React from 'react';

export type ChipAccent =
  | 'lime'
  | 'amber'
  | 'coral'
  | 'sage'
  | 'sky'
  | 'peach'
  | 'charcoal'
  | 'neutral';

export interface ChipProps {
  label: string;
  accent?: ChipAccent;
  dot?: boolean;
  size?: 'sm' | 'md';
  onRemove?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

const accentDots: Record<ChipAccent, string> = {
  lime: '#D2E38A',
  amber: '#F5A524',
  coral: '#F3A58F',
  sage: '#C9D6A8',
  sky: '#B7CFEA',
  peach: '#F2D3C0',
  charcoal: '#2F3234',
  neutral: 'rgba(27, 29, 31, 0.45)',
};

const accentBg: Record<ChipAccent, string> = {
  lime: 'bg-[#D2E38A]/35 text-graphite border-[#D2E38A]/60',
  amber: 'bg-amber/20 text-graphite border-amber/35',
  coral: 'bg-[#F3A58F]/30 text-graphite border-[#F3A58F]/50',
  sage: 'bg-[#C9D6A8]/35 text-graphite border-[#C9D6A8]/60',
  sky: 'bg-[#B7CFEA]/35 text-graphite border-[#B7CFEA]/60',
  peach: 'bg-[#F2D3C0]/35 text-graphite border-[#F2D3C0]/60',
  charcoal: 'bg-[#2F3234] text-white border-[#2F3234]',
  neutral: 'bg-white/55 text-graphite border-white/60',
};

export const Chip: React.FC<ChipProps> = ({
  label,
  accent = 'neutral',
  dot = true,
  size = 'md',
  onRemove,
  className = '',
  icon,
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1.5 rounded-full font-normal',
    md: 'text-xs sm:text-[13px] px-3 py-1 gap-1.5 rounded-full font-normal',
  };

  return (
    <span
      className={`inline-flex items-center border select-none transition-colors backdrop-blur-sm ${sizeStyles[size]} ${accentBg[accent]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: accentDots[accent] }}
        />
      )}
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:opacity-75 focus:outline-none"
        >
          ×
        </button>
      )}
    </span>
  );
};
