import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Shield, Key, Copy, Check, LayoutDashboard, PlusCircle, UserCheck, LogOut, LogIn, ExternalLink } from 'lucide-react';
import { MurkLogo } from './ui/MurkLogo';
import { useECDHKeypair } from '../hooks/useECDHKeypair';
import { useMurkIdentity } from '../hooks/useMurkIdentity';
import IdentityModal from './IdentityModal';
import { Button } from './ui/Button';

export default function Header() {
  const pathname = usePathname();
  const account = useCurrentAccount();
  const { keys } = useECDHKeypair();
  const { profile, logout } = useMurkIdentity();
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAppSubdomain, setIsAppSubdomain] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAppSubdomain(window.location.hostname.startsWith('app.'));
    }
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Create', path: '/create', icon: PlusCircle },
    { name: 'Audit', path: '/audit', icon: UserCheck },
  ];

  const showcaseNavItems = [
    { name: 'Features', path: '#features' },
    { name: 'Visualizer', path: '#visualizer' },
    { name: 'Contract Code', path: '#contracts' },
  ];

  const handleCopyPubKey = () => {
    const pubKey = profile?.ecdhPublicKey || keys?.publicKey;
    if (pubKey) {
      navigator.clipboard.writeText(pubKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      const protocol = window.location.protocol;
      if (host.startsWith('app.')) {
        const cleanHost = host.replace('app.', '');
        window.location.href = `${protocol}//${cleanHost}/`;
      } else {
        window.location.href = '/';
      }
    }
  };

  const getAvatarUrl = (seed?: string) => {
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed || 'murk'}&backgroundColor=0f172a`;
  };

  const activeAddress = profile?.address || account?.address;
  const activePubKey = profile?.ecdhPublicKey || keys?.publicKey;

  return (
    <>
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-6xl px-4 transition-all duration-300">
        <div className="glass-panel backdrop-blur-2xl bg-black/45 mx-auto flex h-16 items-center justify-between gap-4 rounded-full px-6">
          {/* Logo */}
          <Link href={isAppSubdomain ? "/dashboard" : "/"} className="flex items-center gap-3 group relative shrink-0">
            <MurkLogo size={44} glow={true} />
            <div className="hidden sm:flex flex-col">
              <span className="text-lg font-black tracking-wider text-white group-hover:text-primary transition-colors">
                MURK
              </span>
            </div>
          </Link>

          {/* Navigation */}
          {isAppSubdomain ? (
            activeAddress && (
              <nav className="hidden md:flex items-center gap-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold tracking-wide transition-all duration-300 ${
                        isActive
                          ? 'bg-primary/10 text-primary shadow-[inset_0_1px_2px_rgba(26,93,255,0.15)]'
                          : 'text-text-secondary hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            )
          ) : (
            <nav className="hidden md:flex items-center gap-6">
              {showcaseNavItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className="text-text-secondary hover:text-white text-sm font-semibold tracking-wide transition-all duration-300"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          )}

          {/* Wallet and Keys Actions / Launch Button */}
          <div className="flex items-center gap-3 shrink-0">
            {isAppSubdomain ? (
              <>
                {activeAddress && activePubKey && (
                  <div className="hidden lg:flex items-center gap-2.5 rounded-full bg-black/40 border border-white/5 px-4 py-1.5 text-xs text-text-secondary shadow-inner">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                      </span>
                    </div>
                    <span className="font-data tracking-tight text-[11px]">
                      <span className="text-white font-bold">{activePubKey.slice(0, 6)}</span>...<span className="text-white font-bold">{activePubKey.slice(-6)}</span>
                    </span>
                    <button
                      onClick={handleCopyPubKey}
                      className="ml-1 p-1 hover:text-white transition-all active:scale-95 cursor-pointer"
                      title="Copy ECDH Public Key"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-secondary animate-in zoom-in-50" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-text-secondary hover:text-white" />
                      )}
                    </button>
                  </div>
                )}

                {/* Profile / Auth Button */}
                {profile ? (
                  <div className="flex items-center gap-3 bg-black/30 p-1 border border-white/5 rounded-full">
                    <div className="flex items-center gap-2.5 pl-2 pr-3 py-0.5">
                      <img
                        src={getAvatarUrl(profile.avatarSeed)}
                        alt={profile.username}
                        className="h-7 w-7 rounded-full bg-bg-base border border-white/10"
                      />
                      <div className="hidden sm:flex flex-col text-left">
                        <span className="text-xs font-bold text-white">@{profile.username}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-2 hover:bg-white/10 rounded-full text-text-secondary hover:text-accent transition-colors cursor-pointer"
                      title="Sign Out"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Button onClick={() => setIsModalOpen(true)} variant="primary" className="py-2 px-5 text-xs">
                    <LogIn className="h-4 w-4 mr-1" />
                    Connect
                  </Button>
                )}
              </>
            ) : (
              <Link 
                href="http://app.localhost:3000" 
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 text-white font-bold text-xs uppercase tracking-wider py-2 px-5 rounded-full transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-98 cursor-pointer"
              >
                Launch App
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Spacer to prevent content from hiding under fixed header */}
      <div className="h-24 w-full"></div>

      {/* Auth Gateway Modal */}
      <IdentityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
