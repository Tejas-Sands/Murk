import React from 'react';

interface MurkLogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

export function MurkLogo({ className = "", size = 36, glow = true }: MurkLogoProps) {
  return (
    <div 
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {glow && (
        <div className="absolute inset-0 bg-gradient-to-tr from-primary to-accent opacity-30 blur-md rounded-full animate-pulse" />
      )}
      <img
        src="/logo.png"
        alt="Murk Wallet Protector Logo"
        className="w-full h-full object-contain relative z-10 transition-transform duration-300 hover:scale-105"
      />
    </div>
  );
}
