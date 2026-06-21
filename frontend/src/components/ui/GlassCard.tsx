import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  depth?: 'flat' | 'raised' | 'floating';
}

export const GlassCard = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, depth = 'raised', children, ...props }, ref) => {
    
    const depths = {
      flat: 'bg-[#111214] border border-white/5',
      raised: 'bg-[#1A1B1F] border border-white/10 shadow-sm',
      floating: 'bg-[#1A1B1F] border border-[rgba(59,130,246,0.5)] shadow-md hover:shadow-lg hover:-translate-y-[2px]',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl p-5 md:p-6 transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]',
          depths[depth],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlassCard.displayName = 'GlassCard'; // Keep legacy name to avoid large refactor
