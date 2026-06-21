'use client';

import React, { useState } from 'react';
import { Terminal, Key, FileText, Copy, Check, X, ShieldAlert, Cpu } from 'lucide-react';

const SEED_KEYS = {
  invoiceId: "0x2974307720a3409d9caa884041360fd36b90c1ccf98135d1baaa48b634ba1e6b",
  payer: {
    publicKey: "3059301306072a8648ce3d020106082a8648ce3d03010703420004b7ff5846ace6d7d2d497497fc259f2182743907f8bd4cdaea038e8b958f02150a7ec578aa78caf9b7836d9d86fba854dd72d51f64c9faa8ea9cb01f5871f4c97",
    privateKey: "308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b0201010420bc031639fc9e4c3e336df65c34992e1825536fa46d40a7aee1dc9109814f48dfa14403420004b7ff5846ace6d7d2d497497fc259f2182743907f8bd4cdaea038e8b958f02150a7ec578aa78caf9b7836d9d86fba854dd72d51f64c9faa8ea9cb01f5871f4c97"
  },
  payee: {
    publicKey: "3059301306072a8648ce3d020106082a8648ce3d030107034200045caf49c3539ce65194acc438d96e4ca0d359ed8f54ceefc0f99512859bc051acca36fdbdd0b16c880e0365a5b625c5b739e813fe1237d03ecf5d69a875a1385d",
    privateKey: "308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b0201010420f2477aca2fea6e33bbdfb7505caa38d02874ef47682d403c52b98b5c23daa98ba144034200045caf49c3539ce65194acc438d96e4ca0d359ed8f54ceefc0f99512859bc051acca36fdbdd0b16c880e0365a5b625c5b739e813fe1237d03ecf5d69a875a1385d"
  }
};

export default function DevPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadKeys = (type: 'payer' | 'payee') => {
    const keys = SEED_KEYS[type];
    localStorage.setItem('murk_ecdh_keys', JSON.stringify(keys));
    
    // Write mock profile to simulate active session
    const mockProfile = {
      username: type === 'payer' ? 'alice' : 'bob',
      address: type === 'payer' 
        ? '0x0111111111111111111111111111111111111111111111111111111111111111' 
        : '0x0222222222222222222222222222222222222222222222222222222222222222',
      ecdhPublicKey: keys.publicKey,
      name: type === 'payer' ? 'Alice Cooper' : 'Bob Miller',
      email: type === 'payer' ? 'alice@cooper.com' : 'bob@miller.com',
      provider: 'email',
      avatarSeed: type === 'payer' ? 'alice' : 'bob',
    };
    localStorage.setItem('murk_active_profile', JSON.stringify(mockProfile));
    
    window.location.reload();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-slate-900 to-indigo-950 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:scale-105 transition-all cursor-pointer border border-indigo-500/30 group"
          title="Open Dev Console"
        >
          <Terminal className="h-5 w-5 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="w-80 rounded-2xl bg-slate-950/95 border border-slate-800 p-5 shadow-[0_10px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl space-y-4 animate-in slide-in-from-bottom-5 duration-300 text-slate-200">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
              <h3 className="font-bold text-xs tracking-wider uppercase font-mono text-slate-300">Murk HSM Simulator</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Simulation Warning */}
            <div className="flex items-start gap-2 bg-indigo-950/20 border border-indigo-900/30 p-2.5 rounded-lg text-[10px] text-slate-400">
              <ShieldAlert className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <p className="leading-tight">
                Simulates pre-computed keypairs for local testing. Click to load identities instantly into your browser.
              </p>
            </div>

            {/* Quick Actions */}
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-2 font-mono">Load Identity Profile</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => loadKeys('payer')}
                  className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-850 text-indigo-400 hover:text-indigo-300 text-[10px] font-bold tracking-wide transition-colors font-mono cursor-pointer"
                >
                  LOAD PAYER
                </button>
                <button
                  onClick={() => loadKeys('payee')}
                  className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-850 text-violet-400 hover:text-violet-300 text-[10px] font-bold tracking-wide transition-colors font-mono cursor-pointer"
                >
                  LOAD PAYEE
                </button>
              </div>
            </div>

            {/* Copyable Details */}
            <div className="space-y-2 pt-3 border-t border-slate-900">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5 font-mono">Shared Secrets</span>
              
              {/* Seed Invoice */}
              <div className="flex items-center justify-between text-xs bg-slate-900/40 p-2 rounded-xl border border-slate-850">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-indigo-400/80 shrink-0" />
                  <span className="font-mono text-[10px] text-slate-400 truncate">Seed Invoice ID</span>
                </div>
                <button
                  onClick={() => copyToClipboard(SEED_KEYS.invoiceId, 'invoice')}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-400 transition-colors"
                >
                  {copiedKey === 'invoice' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Seed Payee/Seller Pubkey */}
              <div className="flex items-center justify-between text-xs bg-slate-900/40 p-2 rounded-xl border border-slate-850">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Key className="h-3.5 w-3.5 text-violet-400/80 shrink-0" />
                  <span className="font-mono text-[10px] text-slate-400 truncate">Seed Payee PubKey</span>
                </div>
                <button
                  onClick={() => copyToClipboard(SEED_KEYS.payee.publicKey, 'payee_pub')}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-400 transition-colors"
                >
                  {copiedKey === 'payee_pub' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
