'use client';

import React, { useState } from 'react';
import { Search, Bell, Menu, Copy, Check, LogOut } from 'lucide-react';
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit';
import { useMurkIdentity } from '@/hooks/useMurkIdentity';
import { useECDHKeypair } from '@/hooks/useECDHKeypair';

interface TopBarProps {
  pageTitle?: string;
  onMenuClick?: () => void;
}

export default function TopBar({ pageTitle = 'Dashboard', onMenuClick }: TopBarProps) {
  const account = useCurrentAccount();
  const { profile, logout } = useMurkIdentity();
  const { keys } = useECDHKeypair();
  
  const [copied, setCopied] = useState(false);

  const activeAddress = profile?.address || account?.address;
  const activePubKey = profile?.ecdhPublicKey || keys?.publicKey;

  const handleCopyPubKey = () => {
    if (activePubKey) {
      navigator.clipboard.writeText(activePubKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="h-[72px] fixed top-0 right-0 left-0 sm:left-[280px] bg-canvas/80 backdrop-blur-md border-b border-white/5 z-40 flex items-center justify-between px-4 sm:px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="sm:hidden p-2 text-text-secondary hover:text-white transition-colors cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="hidden sm:block text-h4 text-white">{pageTitle}</h1>
      </div>

      {/* Center Section: Global Search */}
      <div className="hidden md:flex flex-1 max-w-[320px] mx-4">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-text-tertiary" />
          </div>
          <input
            type="text"
            placeholder="Search transactions, invoices..."
            className="w-full bg-[#111214] border border-white/10 rounded-full py-2 pl-10 pr-4 text-body-small text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand focus:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* ECDH Public Key Copier (Visible on dashboard pages) */}
        {account && activePubKey && (
          <div className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-[10px] text-text-secondary font-mono">
            <span className="text-brand font-bold uppercase text-[9px] tracking-wider hidden xs:inline">ECDH:</span>
            <span>{activePubKey.slice(0, 6)}...{activePubKey.slice(-4)}</span>
            <button
              onClick={handleCopyPubKey}
              className="ml-1 p-0.5 hover:text-white transition-colors cursor-pointer"
              title="Copy ECDH Public Key"
            >
              {copied ? (
                <Check className="h-3 w-3 text-secondary animate-in zoom-in-50" />
              ) : (
                <Copy className="h-3 w-3 text-text-secondary hover:text-white" />
              )}
            </button>
          </div>
        )}

        <button className="relative p-2 text-text-secondary hover:text-white transition-colors cursor-pointer">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand"></span>
        </button>
        
        <div className="h-8 w-[1px] bg-white/10 mx-1 hidden sm:block"></div>

        <div className="flex items-center">
          {!profile && !account ? (
            <ConnectButton className="!bg-brand !text-white hover:!opacity-90 !rounded-full !py-2 !px-4 !text-label !font-bold transition-all" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-body-small font-semibold text-white">
                  {profile?.name || 'Anonymous User'}
                </span>
                <span className="text-caption text-text-tertiary font-mono">
                  {activeAddress?.slice(0, 6)}...{activeAddress?.slice(-4)}
                </span>
              </div>
              
              <div className="h-10 w-10 rounded-full bg-brand/15 border border-brand/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand transition-colors">
                <span className="text-brand font-bold text-body">
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : activeAddress?.charAt(2).toUpperCase() || '?'}
                </span>
              </div>

              <button 
                onClick={logout}
                className="p-2 text-text-secondary hover:text-[#FF4A4A] hover:bg-[#FF4A4A]/10 rounded-full transition-all cursor-pointer ml-1"
                title="Disconnect Wallet & Session"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
