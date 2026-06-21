'use client';

import React from 'react';

interface MurkyMascotProps {
  pose: 'shield' | 'scan' | 'code' | 'keygen' | 'wink';
  className?: string;
}

export default function MurkyMascot({ pose, className = 'w-16 h-16' }: MurkyMascotProps) {
  // Common colors: Electric Blue (#3B82F6), Violet (#8B5CF6), Neon Emerald (#10B981)
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-all duration-500`}
    >
      {/* Glow Defs */}
      <defs>
        <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-violet" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background/Shadow Ring */}
      <circle cx="50" cy="50" r="45" fill="#0D0E10" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

      {/* Legs / Stand */}
      <path d="M40 85 L35 95 M60 85 L65 95" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 95 L70 95" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />

      {/* Main Body - Cyber Shield Shape */}
      <path
        d="M25 25 C25 20, 50 15, 50 15 C50 15, 75 20, 75 25 C75 45, 75 65, 50 82 C25 65, 25 45, 25 25 Z"
        fill="#111316"
        stroke="#3B82F6"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* Inner Tech Panel Details */}
      <path
        d="M32 30 C32 27, 50 23, 50 23 C50 23, 68 27, 68 30 C68 45, 68 60, 50 74 C32 60, 32 45, 32 30 Z"
        fill="#1A1C21"
        stroke="rgba(139, 92, 246, 0.3)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Antenna */}
      <path d="M50 15 L50 8" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="6" r="3" fill="#3B82F6" filter="url(#glow-blue)" />

      {/* Core Eye / Lens */}
      {pose === 'wink' ? (
        // Happy arch eye for wink
        <path
          d="M38 52 Q50 42 62 52"
          stroke="#10B981"
          strokeWidth="5.5"
          strokeLinecap="round"
          filter="url(#glow-blue)"
        />
      ) : (
        // Standard scanner circle eye
        <>
          <circle cx="50" cy="50" r="14" fill="#0D0E10" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <circle
            cx="50"
            cy="50"
            r="10"
            fill="#3B82F6"
            fillOpacity="0.15"
            stroke={pose === 'scan' ? '#10B981' : '#3B82F6'}
            strokeWidth="2.5"
            filter="url(#glow-blue)"
            className={pose === 'scan' ? 'animate-ping' : ''}
          />
          <circle cx="50" cy="50" r="4" fill={pose === 'scan' ? '#10B981' : '#8B5CF6'} />
        </>
      )}

      {/* Cyberpunk Glasses (Cool shades) */}
      <polygon
        points="22,42 47,42 49,48 24,48"
        fill="rgba(7, 8, 10, 0.9)"
        stroke="#8B5CF6"
        strokeWidth="1.5"
      />
      <polygon
        points="53,42 78,42 76,48 51,48"
        fill="rgba(7, 8, 10, 0.9)"
        stroke="#8B5CF6"
        strokeWidth="1.5"
      />
      <line x1="47" y1="44" x2="53" y2="44" stroke="#8B5CF6" strokeWidth="2" />

      {/* Pose Specific Accents */}
      {pose === 'shield' && (
        // Glowing brackets/shield bubbles around
        <g filter="url(#glow-blue)" opacity="0.8">
          <path d="M12 25 A38 38 0 0 0 12 75" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 6" />
          <path d="M88 25 A38 38 0 0 1 88 75" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 6" />
        </g>
      )}

      {pose === 'scan' && (
        // Laser scanning lines
        <g filter="url(#glow-blue)">
          <line x1="50" y1="50" x2="15" y2="75" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="50" y1="50" x2="85" y2="75" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="50" y1="50" x2="50" y2="90" stroke="#10B981" strokeWidth="2" />
        </g>
      )}

      {pose === 'code' && (
        // Floating code nodes
        <g filter="url(#glow-violet)" className="text-[7px] font-mono font-bold" fill="#8B5CF6">
          <text x="8" y="28">1</text>
          <text x="82" y="32">0</text>
          <text x="12" y="68">0</text>
          <text x="85" y="65">1</text>
        </g>
      )}

      {pose === 'keygen' && (
        // Floating lock and keys
        <g filter="url(#glow-blue)" stroke="#3B82F6" strokeWidth="1.5" fill="none">
          {/* Key Left */}
          <path d="M10 28 H18 M18 28 A3 3 0 1 0 18 24 A3 3 0 0 0 18 28 M13 28 V31 M16 28 V31" strokeLinecap="round" />
          {/* Lock Right */}
          <rect x="80" y="24" width="10" height="8" rx="1.5" fill="#111316" strokeWidth="1" />
          <path d="M82 24 V21 A3 3 0 0 1 88 21 V24" />
        </g>
      )}
    </svg>
  );
}
