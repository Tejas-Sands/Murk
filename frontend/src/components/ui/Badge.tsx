import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'neutral' | 'brand' | 'positive' | 'caution' | 'critical' | 'outline';
  badgeSize?: 'sm' | 'md';
  showDot?: boolean;
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'neutral', badgeSize = 'sm', showDot = false, children, ...props }, ref) => {
    
    const variants = {
      neutral: 'bg-[#1A1B1F] text-[#9CA3AF]',
      brand: 'bg-[rgba(59,130,246,0.15)] text-[#3B82F6]',
      positive: 'bg-[rgba(16,185,129,0.15)] text-[#10B981]',
      caution: 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B]',
      critical: 'bg-[rgba(239,68,68,0.15)] text-[#EF4444]',
      outline: 'bg-transparent border border-white/10 text-[#F8F9FA]',
    };

    const dotColors = {
      neutral: 'bg-[#9CA3AF]',
      brand: 'bg-[#3B82F6]',
      positive: 'bg-[#10B981]',
      caution: 'bg-[#F59E0B]',
      critical: 'bg-[#EF4444]',
      outline: 'bg-[#F8F9FA]',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-label rounded-full',
      md: 'px-2.5 py-1 text-caption rounded-full',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 font-sans whitespace-nowrap',
          variants[variant],
          sizes[badgeSize],
          className
        )}
        {...props}
      >
        {showDot && (
          <span className={cn('block h-1.5 w-1.5 rounded-full', dotColors[variant])} />
        )}
        {children}
      </div>
    );
  }
);
Badge.displayName = 'Badge';
