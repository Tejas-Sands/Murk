'use client';

import React from 'react';
import { cn } from '../../lib/utils';
import { RefreshCw } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-full font-sans transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-95 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080A]';
    
    const variants = {
      primary: 'bg-gradient-brand text-white shadow-md hover:brightness-110 hover:-translate-y-[1px] hover:shadow-[var(--shadow-glow-brand)] active:brightness-95 active:translate-y-0 active:shadow-sm font-medium tracking-wider text-label',
      secondary: 'bg-transparent border border-white/10 text-[#F8F9FA] hover:bg-[#1A1B1F] hover:border-[rgba(59,130,246,0.5)] active:bg-[#0D0E10]',
      ghost: 'bg-transparent text-[#9CA3AF] hover:bg-[#1A1B1F] hover:text-[#F8F9FA] active:bg-[#0D0E10]',
      danger: 'bg-transparent border border-[rgba(239,68,68,0.5)] text-[#EF4444] hover:shadow-[var(--shadow-glow-critical)] hover:bg-[rgba(239,68,68,0.1)]',
    };

    const sizes = {
      sm: 'px-4 py-2 text-caption',
      md: 'px-6 py-3 text-body-small',
      lg: 'px-8 py-4 text-body',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <RefreshCw className="h-4 w-4 animate-spin opacity-70" />}
        {!isLoading && children}
      </button>
    );
  }
);
Button.displayName = 'Button';
