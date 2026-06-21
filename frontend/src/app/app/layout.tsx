'use client';

import React, { useEffect, useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useMurkIdentity } from '@/hooks/useMurkIdentity';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();
  const { profile, isLoading } = useMurkIdentity();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      // Check if current page is an authenticated route
      const isAuthRoute = [
        '/dashboard', '/create', '/audit',
        '/app/dashboard', '/app/create', '/app/audit'
      ].some(path => pathname === path || pathname.startsWith(path + '/'));

      if (isAuthRoute && (!account || !profile)) {
        // Redirect to main domain if accessing authenticated pages without wallet + profile session
        if (typeof window !== 'undefined') {
          const host = window.location.host;
          const protocol = window.location.protocol;
          if (host.startsWith('app.')) {
            const mainHost = host.replace('app.', '');
            window.location.href = `${protocol}//${mainHost}/?auth_required=true`;
          } else {
            window.location.href = '/?auth_required=true';
          }
        }
      } else {
        setChecking(false);
      }
    }
  }, [account, profile, isLoading, pathname]);

  const isGuardActive = ['/dashboard', '/create', '/audit', '/app/dashboard', '/app/create', '/app/audit'].some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );

  if (isLoading || (checking && isGuardActive)) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07080A]">
        <div className="absolute -left-16 -top-16 w-36 h-36 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 w-36 h-36 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
        <Loader2 className="h-10 w-10 text-brand animate-spin mb-4" />
        <p className="text-xs text-content-secondary font-mono uppercase tracking-widest">
          Authenticating Secure Workspace...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
