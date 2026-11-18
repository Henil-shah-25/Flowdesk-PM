import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
}) => {
  const variantStyles = {
    rectangular: 'rounded-[12px]',
    circular: 'rounded-full',
    text: 'rounded-[6px] h-4',
  };

  return (
    <div
      className={`animate-pulse bg-black/[0.06] ${variantStyles[variant]} ${className}`}
      style={{
        width: width !== undefined ? width : undefined,
        height: height !== undefined ? height : undefined,
      }}
    />
  );
};
