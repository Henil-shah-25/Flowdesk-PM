import React, { useEffect, useState } from 'react';

export interface CountUpProps {
  value: number | string;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  value,
  duration = 800,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const numericTarget = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]+/g, '')) || 0;
  const [displayValue, setDisplayValue] = useState<number>(0);

  useEffect(() => {
    // Check if user prefers reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(numericTarget);
      return;
    }

    let startTimestamp: number | null = null;
    let animId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Cubic ease out: 1 - (1 - t)^3
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(easeOut * numericTarget));

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayValue(numericTarget);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [numericTarget, duration]);

  return (
    <span className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
};
