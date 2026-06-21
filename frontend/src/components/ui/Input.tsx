import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: 'sm' | 'md' | 'lg';
  isError?: boolean;
  isSuccess?: boolean;
  prefixNode?: React.ReactNode;
  suffixNode?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = 'md', isError, isSuccess, prefixNode, suffixNode, disabled, ...props }, ref) => {
    
    const sizes = {
      sm: 'px-3 py-2 text-caption rounded-md',
      md: 'px-4 py-3 text-body-small rounded-lg',
      lg: 'px-5 py-4 text-body rounded-xl',
    };

    return (
      <div className="relative flex items-center w-full">
        {prefixNode && (
          <div className="absolute left-3 md:left-4 flex items-center justify-center text-[#6B7280] pointer-events-none">
            {prefixNode}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full bg-[#1A1C21] border border-white/10 text-[#F8F9FA] placeholder:text-[#6B7280] font-sans transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none focus:border-[rgba(59,130,246,0.5)] focus:shadow-[var(--shadow-glow-brand)]',
            sizes[inputSize],
            prefixNode && (inputSize === 'sm' ? 'pl-9' : inputSize === 'md' ? 'pl-11' : 'pl-12'),
            suffixNode && (inputSize === 'sm' ? 'pr-9' : inputSize === 'md' ? 'pr-11' : 'pr-12'),
            isError && 'border-[rgba(239,68,68,0.5)] shadow-[var(--shadow-glow-critical)] focus:border-[#EF4444]',
            isSuccess && 'border-[rgba(16,185,129,0.5)] focus:border-[#10B981]',
            disabled && 'opacity-50 bg-[#07080A] cursor-not-allowed',
            className
          )}
          {...props}
        />
        {suffixNode && (
          <div className="absolute right-3 md:right-4 flex items-center justify-center">
            {suffixNode}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
