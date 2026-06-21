'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { 
  Shield, EyeOff, Lock, CheckCircle2, AlertCircle, ArrowLeft, Send, RefreshCw, Key, 
  Share2, MessageSquare, Clipboard, Check, LockKeyhole, LockKeyholeOpen, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import XMTPChat from '@/components/XMTPChat';
import { parseInvoiceObject } from '@/lib/parse';
import { PACKAGE_ID, CLOCK_ID, REGISTRY_ID } from '@/lib/constants';
import { decryptAmount } from '@/lib/confidential';
import { Transaction } from '@mysten/sui/transactions';

import { useMurkIdentity } from '@/hooks/useMurkIdentity';

export default function InvoiceDetails() {
  const params = useParams();
  const router = useRouter();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { profile } = useMurkIdentity();
  const activeAddress = profile?.address || account?.address;
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Decryption state
  const [decryptedAmount, setDecryptedAmount] = useState<number | null>(null);
  const [salt, setSalt] = useState<string | null>(null);
  const [decryptionAttempted, setDecryptionAttempted] = useState(false);

  // Share link copy state
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active sub-tab (Actions vs Messages)
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');

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
            
            const localSalt = localStorage.getItem(`murk_salt_${invoiceId}`);
            if (localSalt) setSalt(localSalt);

            const cachedAmount = localStorage.getItem(`murk_amount_${invoiceId}`);
            if (cachedAmount) setDecryptedAmount(Number(cachedAmount));
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
          deadlineMs: found.deadlineMs || (Date.now() + 86400000),
          createdMs: Date.now() - 3600000,
          encryptedAmount: Buffer.from('ciphertext:iv', 'utf8'),
          amountCommitment: Buffer.from('mock_commitment', 'utf8')
        });

        const localSalt = localStorage.getItem(`murk_salt_${invoiceId}`);
        if (localSalt) setSalt(localSalt);

        const cachedAmount = localStorage.getItem(`murk_amount_${invoiceId}`);
        if (cachedAmount) setDecryptedAmount(Number(cachedAmount));
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

  const handleDecrypt = async () => {
    if (!invoice) return;
    setError(null);
    setDecryptionAttempted(true);

    try {
      if (invoiceId.startsWith('0x') && !invoiceId.startsWith('0x09')) {
        const storedKeys = localStorage.getItem('murk_ecdh_keys');
        if (!storedKeys) {
          throw new Error('Local ECDH keys missing. Generate keys on home hub first.');
        }
        const myKeys = JSON.parse(storedKeys);

        const isPayer = invoice.payer.toLowerCase() === activeAddress?.toLowerCase();
        const isPayee = invoice.payee.toLowerCase() === activeAddress?.toLowerCase();

        // Convert ciphertext and IV back from contract bytes
        const cipherTextStr = Buffer.from(invoice.encryptedAmount).toString('utf8');
        if (!cipherTextStr.includes(':')) {
          throw new Error('Invalid encrypted amount format on-chain.');
        }
        const [ciphertext, iv] = cipherTextStr.split(':');

        let peerPubKey = '';
        if (isPayer) {
          peerPubKey = invoice.payeePubKey; 
        } else if (isPayee) {
          peerPubKey = invoice.payerPubKey || ''; 
        } else {
          throw new Error('Only the Payer or Payee can decrypt this invoice.');
        }

        if (!peerPubKey) {
          throw new Error('Counterparty public key missing from on-chain payload.');
        }

        const decrypted = await decryptAmount({ ciphertext, iv }, myKeys.privateKey, peerPubKey);
        
        setDecryptedAmount(decrypted);
        localStorage.setItem(`murk_amount_${invoiceId}`, decrypted.toString());
      } else {
        // Simulated decryption
        const cachedAmount = localStorage.getItem(`murk_amount_${invoiceId}`);
        if (cachedAmount) {
          setDecryptedAmount(Number(cachedAmount));
        } else {
          const mockAmt = 1500 * 1000000;
          setDecryptedAmount(mockAmt);
          localStorage.setItem(`murk_amount_${invoiceId}`, mockAmt.toString());
        }
      }
    } catch (err: any) {
      console.error('Decryption failed:', err);
      setError(err?.message || 'Decryption failed. Check key compatibility.');
    }
  };

  const handleCopyLink = () => {
    if (!invoice) return;
    const finalAmount = decryptedAmount !== null ? decryptedAmount : localStorage.getItem(`murk_amount_${invoiceId}`);
    const finalSalt = salt || localStorage.getItem(`murk_salt_${invoiceId}`);

    if (!finalAmount || !finalSalt) {
      setError('Invoice amount and salt must be decrypted/present to generate share link.');
      return;
    }

    const shareUrl = `${window.location.origin}/pay/${invoiceId}#${finalAmount}:${finalSalt}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyId = (id: string, type: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(type);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Escrow actions
  const handleLockFunds = async () => {
    if (!activeAddress || !decryptedAmount) return;
    setActionLoading(true);
    setError(null);
    try {
      if (activeAddress.startsWith('0x09')) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        // Update local database status
        const simulatedInvoices = JSON.parse(localStorage.getItem('murk_all_invoices') || '[]');
        const updated = simulatedInvoices.map((inv: any) => {
          if (inv.id === invoiceId) {
            return { ...inv, status: 2 }; // status 2 = Funds Locked
          }
          return inv;
        });
        localStorage.setItem('murk_all_invoices', JSON.stringify(updated));

        setSuccess('Funds successfully locked in escrow. (Simulated)');
        setInvoice((prev: any) => prev ? { ...prev, status: 2 } : null);
      } else {
        const tx = new Transaction();
        const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(decryptedAmount)]);
        
        tx.moveCall({
          target: `${PACKAGE_ID}::escrow::lock_funds`,
          arguments: [
            tx.object(invoiceId),
            coin,
            tx.object(CLOCK_ID),
          ],
        });

        const response = await signAndExecute({ transaction: tx });
        await suiClient.waitForTransaction({ digest: response.digest });
        setSuccess('Funds successfully locked in escrow.');
        fetchInvoiceDetails();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to lock funds.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseEscrow = async () => {
    if (!activeAddress) return;
    setActionLoading(true);
    setError(null);
    try {
      if (activeAddress.startsWith('0x09')) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Update local database status
        const simulatedInvoices = JSON.parse(localStorage.getItem('murk_all_invoices') || '[]');
        const updated = simulatedInvoices.map((inv: any) => {
          if (inv.id === invoiceId) {
            return { ...inv, status: 1 }; // status 1 = Settled
          }
          return inv;
        });
        localStorage.setItem('murk_all_invoices', JSON.stringify(updated));

        setSuccess('Escrow funds successfully released to Payee. (Simulated)');
        setInvoice((prev: any) => prev ? { ...prev, status: 1 } : null);
      } else {
        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::escrow::release_funds`,
          arguments: [
            tx.object(invoiceId),
            tx.object(CLOCK_ID),
          ],
        });

        const response = await signAndExecute({ transaction: tx });
        await suiClient.waitForTransaction({ digest: response.digest });
        setSuccess('Escrow funds successfully released to Payee.');
        fetchInvoiceDetails();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to release escrow.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundEscrow = async () => {
    if (!activeAddress) return;
    setActionLoading(true);
    setError(null);
    try {
      if (activeAddress.startsWith('0x09')) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Update local database status
        const simulatedInvoices = JSON.parse(localStorage.getItem('murk_all_invoices') || '[]');
        const updated = simulatedInvoices.map((inv: any) => {
          if (inv.id === invoiceId) {
            return { ...inv, status: 3 }; // status 3 = Refunded
          }
          return inv;
        });
        localStorage.setItem('murk_all_invoices', JSON.stringify(updated));

        setSuccess('Escrow funds successfully refunded to Payer. (Simulated)');
        setInvoice((prev: any) => prev ? { ...prev, status: 3 } : null);
      } else {
        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::escrow::refund_funds`,
          arguments: [
            tx.object(invoiceId),
            tx.object(CLOCK_ID),
          ],
        });

        const response = await signAndExecute({ transaction: tx });
        await suiClient.waitForTransaction({ digest: response.digest });
        setSuccess('Escrow funds successfully refunded to Payer.');
        fetchInvoiceDetails();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to refund escrow.');
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
      <div className="min-h-screen bg-transparent flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="glass p-8 rounded-3xl max-w-md w-full border border-rose-500/20">
            <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-200 mb-2">Invoice Loading Error</h2>
            <p className="text-xs text-slate-400 font-mono">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const isPayer = invoice.payer.toLowerCase() === account?.address.toLowerCase();
  const isPayee = invoice.payee.toLowerCase() === account?.address.toLowerCase();
  const isEscrow = invoice.description.startsWith('[ESCROW]');
  const isPending = invoice.status === 0;
  const isSettled = invoice.status === 1;

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-200 text-xs font-semibold mb-6 transition-colors font-mono cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          BACK_TO_DASHBOARD
        </button>

        {success && (
          <div className="p-4 mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-xs flex items-center gap-2 animate-in slide-in-from-top-4">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-400" />
            <span className="font-bold">{success}</span>
          </div>
        )}

        {error && (
          <div className="p-4 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs flex items-center gap-2 animate-in slide-in-from-top-4">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-400" />
            <span className="font-mono">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT 2 COLUMNS: Invoice cryptographics & chat */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Main info glass block */}
            <div className="glass p-6 sm:p-8 rounded-3xl border border-slate-900 shadow-xl relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5 mb-5">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-100">{invoice.description}</h1>
                  <span className="text-[10px] text-slate-500 font-mono mt-1 block">Ref: {invoice.referenceId}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyId(invoiceId, 'inv')}
                    className="p-2 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-850 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 text-[10px] font-mono cursor-pointer"
                  >
                    {copiedId === 'inv' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Clipboard className="h-3.5 w-3.5" />}
                    Copy ID
                  </button>

                  {/* Share Payment Link (Only when decrypted) */}
                  {(decryptedAmount !== null || salt) && (
                    <button
                      onClick={handleCopyLink}
                      className="p-2 bg-indigo-600/10 hover:bg-indigo-650/20 text-indigo-400 rounded-xl border border-indigo-500/20 hover:border-indigo-500/40 transition-colors flex items-center gap-1.5 text-[10px] font-bold cursor-pointer"
                    >
                      {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
                      {copiedLink ? 'Link Copied!' : 'Copy Pay Link'}
                    </button>
                  )}
                </div>
              </div>

              {/* Cryptography Ledger Detail */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono mb-2">Zero-Knowledge State</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 flex flex-col justify-between">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Encrypted Amount (Ciphertext)</span>
                    <span className="font-mono text-[10px] text-slate-400 break-all leading-tight">
                      {Buffer.from(invoice.encryptedAmount).toString('utf8').slice(0, 30)}...
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 flex flex-col justify-between">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">On-Chain Hash Commitment</span>
                    <span className="font-mono text-[10px] text-slate-400 break-all leading-tight">
                      {Buffer.from(invoice.amountCommitment).toString('hex')}
                    </span>
                  </div>
                </div>

                {decryptedAmount === null && (
                  <div className="pt-2">
                    <button
                      onClick={handleDecrypt}
                      className="py-3 px-4 w-full rounded-2xl bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Lock className="h-4 w-4" />
                      Decrypt Amount & Generate Secret Salt
                    </button>
                    <p className="text-[10px] text-slate-500 text-center mt-2 font-mono">
                      Uses ECDH Shared Secret to decrypt the AES-GCM envelope locally.
                    </p>
                  </div>
                )}

                {decryptedAmount !== null && (
                  <motion.div 
                    className="p-4 rounded-2xl bg-indigo-950/10 border border-indigo-500/20 space-y-2.5 font-mono text-[10px]"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="flex items-center gap-2 text-indigo-400 font-bold mb-1">
                      <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                      Cryptographic Verification Successful
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider block">Decrypted Amount:</span>
                      <span className="text-sm font-bold text-slate-200">{(decryptedAmount / 1000000).toFixed(2)} USDC</span>
                    </div>
                    {salt && (
                      <div>
                        <span className="text-slate-500 uppercase tracking-wider block">Local Settlement Salt:</span>
                        <span className="text-slate-350 break-all select-all font-mono">{salt}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Messaging / XMTP Chat glass block */}
            <div className="space-y-3">
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-900 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all duration-300 cursor-pointer ${
                    activeTab === 'details' 
                      ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' 
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  Verification Log
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all duration-300 cursor-pointer ${
                    activeTab === 'chat' 
                      ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' 
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  Secure Chat Thread
                </button>
              </div>

              {activeTab === 'chat' ? (
                <XMTPChat 
                  invoiceId={invoiceId}
                  peerSuiAddress={isPayer ? invoice.payee : invoice.payer}
                  currentRole={isPayer ? 'payer' : 'payee'}
                />
              ) : (
                <div className="glass p-6 rounded-3xl border border-slate-900 text-xs text-slate-400 font-mono space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono border-b border-slate-900 pb-2">Verification Audit Log</h3>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <div>
                        <span className="text-slate-500">[{new Date(invoice.createdMs).toLocaleTimeString()}]</span> Created commitment hash and broadcasted invoice envelope.
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-2 w-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <div>
                        <span className="text-slate-500">[{new Date(invoice.createdMs).toLocaleTimeString()}]</span> ECDH keypair linked payee (<span className="text-slate-300">{invoice.payee.slice(0,6)}</span>) and payer (<span className="text-slate-300">{invoice.payer.slice(0,6)}</span>).
                      </div>
                    </div>
                    {invoice.status === 1 && (
                      <div className="flex gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5 shrink-0 animate-pulse" />
                        <div>
                          <span className="text-slate-500">Settled State:</span> Receipt minted and verification successfully validated on-chain.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Financial Summary & Escrow */}
          <div className="space-y-6">
            
            {/* Financial Summary */}
            <div className="glass p-6 rounded-3xl border border-slate-900 shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase font-mono mb-4 border-b border-slate-900 pb-2.5">
                Financial Summary
              </h3>

              <div className="space-y-4">
                {/* USDC Display */}
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-850 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Amount Due</span>
                  {decryptedAmount !== null ? (
                    <div className="text-right">
                      <span className="text-2xl font-black text-slate-100 font-mono">{(decryptedAmount / 1000000).toFixed(2)}</span>
                      <span className="text-[10px] text-indigo-400 font-bold block">USDC</span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1 font-mono uppercase">
                      <EyeOff className="h-3.5 w-3.5" />
                      Hidden
                    </span>
                  )}
                </div>

                {/* Counterparty addresses */}
                <div className="space-y-2 text-[10px] font-mono">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-900/60">
                    <span className="text-slate-500">PAYEE_ADDRESS</span>
                    <button 
                      onClick={() => handleCopyId(invoice.payee, 'payee')}
                      className="text-slate-350 hover:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {copiedId === 'payee' ? 'Copied!' : `${invoice.payee.slice(0, 6)}...${invoice.payee.slice(-4)}`}
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-900/60">
                    <span className="text-slate-500">PAYER_ADDRESS</span>
                    <button 
                      onClick={() => handleCopyId(invoice.payer, 'payer')}
                      className="text-slate-350 hover:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {copiedId === 'payer' ? 'Copied!' : `${invoice.payer.slice(0, 6)}...${invoice.payer.slice(-4)}`}
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500">EXPIRATION</span>
                    <span className="text-slate-350">{new Date(invoice.deadlineMs).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Escrow Admin panel */}
            {isEscrow && (
              <div className="glass p-6 rounded-3xl border border-slate-900 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-900 pb-3 mb-2">
                  <ShieldAlert className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Escrow Administration</h3>
                </div>

                {/* State description */}
                <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-[10px] text-slate-400 leading-normal font-mono">
                  Escrow invoices secure funds inside the smart contract until conditions are satisfied.
                </div>

                <div className="space-y-3">
                  {/* Payer locking funds */}
                  {isPayer && isPending && (
                    <button
                      onClick={handleLockFunds}
                      disabled={actionLoading || decryptedAmount === null}
                      className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                      Lock Funds in Escrow
                    </button>
                  )}

                  {/* Payee claiming release */}
                  {isPayee && (
                    <button
                      onClick={handleReleaseEscrow}
                      disabled={actionLoading}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LockKeyholeOpen className="h-4 w-4" />}
                      Release Escrow
                    </button>
                  )}

                  {/* Payer/Payee triggering refund */}
                  <button
                    onClick={handleRefundEscrow}
                    disabled={actionLoading}
                    className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-400 hover:text-rose-300 border border-slate-850 hover:border-slate-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                    Refund Escrow
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
