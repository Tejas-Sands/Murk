import React from 'react';

export function Table({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-[#1A1B1F] border border-white/10 rounded-xl overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {children}
        </table>
      </div>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-[#111214] border-b border-white/10">
      <tr>{children}</tr>
    </thead>
  );
}

export function TableHead({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <th className={`px-4 py-3 text-label text-text-secondary uppercase tracking-wide font-medium whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children, className = '', onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) {
  return (
    <tr 
      onClick={onClick}
      className={`border-b border-white/5 transition-colors ${onClick ? 'cursor-pointer hover:bg-white/5' : 'hover:bg-[#111214]/50'} ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <td className={`px-4 py-3.5 text-body-small text-primary ${className}`}>
      {children}
    </td>
  );
}

export function TableEmpty({ colSpan, message = "No data available" }: { colSpan: number, message?: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-text-tertiary text-body-small">
        {message}
      </td>
    </tr>
  );
}
