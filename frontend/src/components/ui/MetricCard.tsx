import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Badge } from './Badge';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: 'positive' | 'negative' | 'neutral';
  trendValue?: string;
  sparklineData?: number[];
  onClick?: () => void;
}

export function MetricCard({ label, value, trend, trendValue, sparklineData, onClick }: MetricCardProps) {
  const isClickable = !!onClick;
  
  return (
    <div 
      onClick={onClick}
      className={`bg-[#1A1B1F] border border-white/10 rounded-xl p-5 min-h-[120px] flex flex-col justify-between transition-all duration-200 ${
        isClickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-white/20' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-label text-text-secondary uppercase tracking-widest">{label}</span>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <span className="text-data-large font-mono text-white">{value}</span>
          
          {trend && trendValue && (
            <div className="mt-2 flex items-center">
              <Badge 
                variant={trend === 'positive' ? 'positive' : trend === 'negative' ? 'critical' : 'neutral'}
                badgeSize="sm"
                className="gap-1 font-mono"
              >
                {trend === 'positive' && <ArrowUpRight className="h-3 w-3" />}
                {trend === 'negative' && <ArrowDownRight className="h-3 w-3" />}
                {trend === 'neutral' && <Minus className="h-3 w-3" />}
                {trendValue}
              </Badge>
            </div>
          )}
        </div>

        {sparklineData && sparklineData.length > 0 && (
          <div className="h-10 w-24 flex items-end justify-between gap-0.5 opacity-60">
            {/* Simple CSS-based bar sparkline for now, ideally SVG or recharts */}
            {sparklineData.map((val, i) => {
              const max = Math.max(...sparklineData);
              const height = max === 0 ? 0 : (val / max) * 100;
              return (
                <div 
                  key={i} 
                  className={`w-full rounded-t-sm ${trend === 'negative' ? 'bg-critical' : 'bg-positive'}`}
                  style={{ height: `${Math.max(10, height)}%` }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
