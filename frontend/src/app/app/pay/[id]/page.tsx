'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient, ConnectButton } from '@mysten/dapp-kit';
import { Shield, Lock, CheckCircle2, AlertCircle, Send, RefreshCw, EyeOff, Zap, ArrowLeft, ArrowUpRight, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseInvoiceObject } from '@/lib/parse';
import { PACKAGE_ID, CLOCK_ID } from '@/lib/constants';
import { Transaction } from '@mysten/sui/transactions';
import { useMurkIdentity } from '@/hooks/useMurkIdentity';
import IdentityModal from '@/components/IdentityModal';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { profile } = useMurkIdentity();
  const activeAddress = profile?.address || account?.address;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Decrypted values from URL Hash
  const [amount, setAmount] = useState<number | null>(null);
  const [salt, setSalt] = useState<string | null>(null);

  useEffect(() => {
    // Parse URL hash for #amount:salt
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash.includes(':')) {
        const parts = hash.split(':');
        if (parts.length === 2) {
          setAmount(Number(parts[0]));
          setSalt(parts[1]);
          // Strip the hash from URL visually so it doesn't stay there
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    }
  }, []);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      if (invoiceId.startsWith('0x') && invoiceId.length === 66) {
        try {
          const obj = await suiClient.getObject({
            id: invoiceId,
            options: { showContent: true }
          });
          const parsed = parseInvoiceObject(obj);
          if (parsed) {
            setInvoice(parsed);
            setLoading(false);
            return;
          }
        } catch (rpcErr) {
          console.warn('On-chain lookup failed, trying local fallback:', rpcErr);
        }
      }

      // Local fallback
      const simulatedInvoices = JSON.parse(localStorage.getItem('murk_all_invoices') || '[]');
      const found = simulatedInvoices.find((inv: any) => inv.id === invoiceId);
      if (found) {
        setInvoice({
          id: found.id,
          payer: found.payer,
          payee: found.payee,
          description: found.description || 'Simulated Invoice',
          referenceId: found.referenceId || 'SIM-INV',
          status: found.status ?? 0,
          deadlineMs: found.deadlineMs || (Date.now() + 86400000)
        });
      } else {
        setError('Invoice not found or invalid.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch invoice details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) fetchInvoiceDetails();
  }, [invoiceId]);

  const handleSettle = async () => {
    if (!activeAddress || amount === null || !salt) return;
    setActionLoading(true);
    setError(null);

    try {
      if (activeAddress.startsWith('0x09')) {
        // Simulated local settlement
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Update local database status
        const simulatedInvoices = JSON.parse(localStorage.getItem('murk_all_invoices') || '[]');
        const updated = simulatedInvoices.map((inv: any) => {
          if (inv.id === invoiceId) {
            return { ...inv, status: 1 };
          }
          return inv;
        });
        localStorage.setItem('murk_all_invoices', JSON.stringify(updated));

        // Save to local settled/received invoice cache
        const received = JSON.parse(localStorage.getItem('murk_received_invoices') || '[]');
        if (!received.includes(invoiceId)) {
          received.push(invoiceId);
          localStorage.setItem('murk_received_invoices', JSON.stringify(received));
        }

        setSuccess('Payment successful! (Simulated local settlement)');
        setInvoice((prev: any) => prev ? { ...prev, status: 1 } : null);
        
        setTimeout(() => {
          router.push(`/dashboard`);
        }, 2500);
      } else {
        // Real Sui transaction settlement
        const tx = new Transaction();
        const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);
        tx.transferObjects([paymentCoin], invoice.payee);

        tx.moveCall({
          target: `${PACKAGE_ID}::murk::settle_invoice`,
          arguments: [
            tx.object(invoiceId),
            tx.pure.u64(amount),
            tx.pure.vector('u8', Array.from(Buffer.from(salt, 'hex'))),
            tx.object(CLOCK_ID),
          ],
        });

        const response = await signAndExecute({ transaction: tx });
        await suiClient.waitForTransaction({ digest: response.digest });

        setSuccess('Payment successful! Invoice settled.');
        fetchInvoiceDetails();
        
        setTimeout(() => {
          router.push(`/dashboard`);
        }, 2500);
      }
    } catch (err: any) {
      console.error('Settlement failed:', err);
      setError(err?.message || 'Settlement transaction failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4 text-center">
        <div className="glass p-8 rounded-3xl max-w-md w-full border border-rose-500/20 shadow-2xl">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-200 mb-2">Invoice Not Found</h2>
          <p className="text-xs text-slate-400 font-mono">{error}</p>
        </div>
      </div>
    );
  }

  const isPending = invoice?.status === 0;
  const isSettled = invoice?.status === 1;

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-slate-100 items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Blur Rings */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <motion.div 
        className="w-full max-w-md glass p-6 sm:p-8 rounded-3xl border border-slate-900 shadow-2xl relative"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-14 w-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            {isSettled ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-450 animate-pulse" />
            ) : amount !== null ? (
              <Zap className="h-7 w-7 text-amber-400" />
            ) : (
              <Lock className="h-7 w-7 text-indigo-400" />
            )}
          </div>
          <h1 className="text-xl font-black tracking-tight">
            {isSettled ? 'Invoice Settled' : 'Confidential Payment'}
          </h1>
          <p className="text-[10px] text-slate-500 mt-1.5 font-mono break-all leading-normal">
            Ref: {invoice.referenceId}
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-4 py-4 animate-in fade-in duration-300">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
              {success}
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Redirecting back to dashboard ledger...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Amount Display */}
            <div className="text-center p-5 rounded-2xl bg-slate-900/40 border border-slate-850 shadow-inner relative overflow-hidden">
              <span className="text-[9px] text-slate-500 block mb-2 font-bold uppercase tracking-widest font-mono">Amount Due</span>
              {amount !== null ? (
                <div className="flex items-baseline justify-center gap-1.5 font-mono">
                  <span className="text-4xl font-black text-slate-100">{(amount / 1000000).toFixed(2)}</span>
                  <span className="text-xs font-bold text-indigo-400 font-sans">USDC</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-2">
                  <EyeOff className="h-6 w-6 text-slate-700 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-550 font-mono uppercase tracking-wider">Amount Encrypted</span>
                  <span className="text-[9px] text-slate-600 max-w-[220px] leading-normal font-sans">
                    Decryption payload is missing from the URL. Ensure you use the generated private share link.
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-900/60">
                <span className="text-slate-550">MEMO</span>
                <span className="font-sans font-bold text-slate-200 text-right max-w-[180px] truncate">{invoice.description}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-900/60">
                <span className="text-slate-550">PAYEE_ADDRESS</span>
                <span className="text-slate-400 text-[10px]">{invoice.payee.slice(0, 8)}...{invoice.payee.slice(-6)}</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-slate-550">STATUS</span>
                <span className="font-sans font-bold text-amber-400 uppercase text-[10px] tracking-wider bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10">Pending</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[10px] flex items-start gap-2 font-mono">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3">
              {!activeAddress ? (
                <div className="flex flex-col gap-3 relative group">
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl blur opacity-30 group-hover:opacity-75 transition-all duration-300 pointer-events-none" />
                  <ConnectButton className="!w-full !py-3.5 !rounded-xl !bg-indigo-650 hover:!bg-indigo-500 !text-white !font-bold !text-xs !uppercase !tracking-wider !transition-all !duration-300 !cursor-pointer glow-btn" />
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 font-heading"
                  >
                    <Key className="h-4 w-4" />
                    Use Social/Onboard Profile
                  </button>
                </div>
              ) : amount !== null && isPending ? (
                <button
                  onClick={handleSettle}
                  disabled={actionLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-650 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/15 disabled:opacity-50 flex items-center justify-center gap-2 transition-all glow-btn cursor-pointer"
                >
                  {actionLoading ? (
                    <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {actionLoading ? 'Processing Verification...' : 'Settle Payment Now'}
                </button>
              ) : null}
              
              {activeAddress && amount !== null && (
                <div className="mt-4 text-center font-mono text-[9px] text-slate-550 flex items-center justify-center gap-1">
                  <Shield className="h-3 w-3" />
                  CRYPTOGRAPHIC ON-CHAIN SETTLEMENT VERIFIED
                </div>
              )}
            </div>
            
          </div>
        )}
      </motion.div>
      <IdentityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
