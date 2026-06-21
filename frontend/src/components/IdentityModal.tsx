'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ArrowRight, Wallet, Check, AlertCircle, RefreshCw, Key
} from 'lucide-react';
import { useMurkIdentity } from '../hooks/useMurkIdentity';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';

interface IdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthStep = 'login' | 'register';

export default function IdentityModal({ isOpen, onClose }: IdentityModalProps) {
  const account = useCurrentAccount();
  const { loginWallet, registerUsername } = useMurkIdentity();

  const [step, setStep] = useState<AuthStep>('login');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    // Reset state and close
    setStep('login');
    setUsername('');
    setFullName('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  const redirectToDashboard = () => {
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      const protocol = window.location.protocol;
      if (!host.startsWith('app.')) {
        window.location.href = `${protocol}//app.${host}/dashboard`;
      } else {
        window.location.href = '/dashboard';
      }
    }
  };

  const loginWithAddress = async (address: string) => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await loginWallet(address);
      setLoading(false);
      if (res.success) {
        if (res.registered) {
          setSuccess(true);
          setTimeout(() => {
            handleClose();
            redirectToDashboard();
          }, 1200);
        } else {
          setStep('register');
        }
      } else {
        setError(res.error || 'Wallet authentication failed');
      }
    } catch (err) {
      setLoading(false);
      setError('Connection failed');
    }
  };

  // Automatically trigger login check when wallet is connected
  useEffect(() => {
    if (isOpen && account?.address && step === 'login' && !loading && !success) {
      loginWithAddress(account.address);
    }
  }, [account, isOpen, step]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    
    // Check alphanumeric
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await registerUsername(username, fullName);
      setLoading(false);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          handleClose();
          redirectToDashboard();
        }, 1200);
      } else {
        setError(res.error || 'Registration failed');
      }
    } catch (err) {
      setLoading(false);
      setError('Registration failed');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-[#07080A]/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0D0E10] shadow-xl p-8 z-10"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -left-16 -top-16 w-36 h-36 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -right-16 -bottom-16 w-36 h-36 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute right-5 top-5 p-1.5 rounded-lg text-content-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {success ? (
              /* Success screen */
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-positive/10 border border-positive/20 flex items-center justify-center text-positive">
                  <Check className="h-8 w-8 animate-bounce" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider font-mono">Authentication Complete</h3>
                <p className="text-xs text-content-secondary">Redirecting you to your secure Murk dashboard...</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {step === 'login' && (
                  /* STEP 1: Connect Wallet */
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-6"
                  >
                    {/* Header */}
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-subtle border border-brand/20 text-[9px] font-bold text-brand uppercase tracking-widest font-mono">
                        Secure Authentication Gateway
                      </div>
                      <h2 className="text-xl font-display font-black uppercase text-white tracking-tight pt-2">Connect to Murk</h2>
                      <p className="text-[11px] text-content-secondary max-w-xs mx-auto leading-relaxed">
                        Connect your Sui wallet to access your non-custodial, zero-knowledge invoicing and settlement workspace.
                      </p>
                    </div>

                    {error && (
                      <div className="p-3.5 rounded-2xl bg-critical-subtle border border-critical/20 text-critical text-xs flex items-start gap-2.5">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Wallet connection button wrapper */}
                    <div className="space-y-4 pt-2">
                      {account ? (
                        <div className="w-full p-4 rounded-2xl bg-surface border border-border-default flex flex-col items-center gap-3 text-center">
                          <Wallet className="h-6 w-6 text-brand animate-pulse" />
                          <div className="text-xs font-mono font-bold text-white">
                            Connected: {account.address.slice(0, 6)}...{account.address.slice(-4)}
                          </div>
                          <button
                            type="button"
                            onClick={() => loginWithAddress(account.address)}
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-full bg-gradient-brand hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                          >
                            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Enter Dashboard'}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center p-6 rounded-2xl border border-border-subtle bg-surface/50 text-center space-y-4">
                          <p className="text-xs text-content-secondary leading-relaxed font-sans">
                            Authenticate using any supported Sui wallet extension or mobile app:
                          </p>
                          <ConnectButton className="!rounded-full !bg-gradient-brand hover:!brightness-110 !text-white !font-bold !text-xs !px-6 !py-3 !h-auto !shadow-md !cursor-pointer !border-none" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {step === 'register' && (
                  /* STEP 2: Username Registration */
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-subtle border border-secondary/20 text-[9px] font-bold text-secondary uppercase tracking-widest font-mono">
                        Identity Registration
                      </div>
                      <h2 className="text-xl font-display font-black uppercase text-white tracking-tight pt-2">Claim Username</h2>
                      <p className="text-[11px] text-content-secondary max-w-xs mx-auto leading-relaxed">
                        Create a human-readable alias to map to your Sui address so clients can locate you securely.
                      </p>
                    </div>

                    {error && (
                      <div className="p-3.5 rounded-2xl bg-critical-subtle border border-critical/20 text-critical text-xs flex items-start gap-2.5">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    )}

                    <form onSubmit={handleRegisterSubmit} className="space-y-4">
                      {/* Username */}
                      <div>
                        <label className="block text-[10px] font-bold text-content-secondary uppercase tracking-wider mb-2 font-mono">Choose Username</label>
                        <div className="relative">
                          <span className="absolute left-4 top-3.5 text-xs font-bold text-brand font-mono">@</span>
                          <input
                            type="text"
                            required
                            placeholder="alice_dev"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toLowerCase())}
                            className="w-full bg-[#1A1C21] border border-white/10 rounded-2xl pl-9 pr-4 py-3.5 text-white placeholder:text-content-tertiary text-xs focus:border-brand/50 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      {/* Display name */}
                      <div>
                        <label className="block text-[10px] font-bold text-content-secondary uppercase tracking-wider mb-2 font-mono">Display Name (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Alice Cooper"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-[#1A1C21] border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-content-tertiary text-xs focus:border-brand/50 focus:outline-none"
                        />
                      </div>

                      {/* Info notice */}
                      <div className="p-3 rounded-2xl bg-brand-subtle border border-brand/20 text-[10px] text-content-secondary leading-normal flex gap-2">
                        <Key className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                        <span>This maps a cryptographic identity and registers your local client-side keypairs.</span>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || username.length < 3}
                        className="w-full py-3.5 px-4 rounded-full bg-gradient-brand hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Register Profile & Enter'}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
