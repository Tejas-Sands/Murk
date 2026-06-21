'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Shield, EyeOff, Calendar, AlertCircle, ArrowLeft, Key, User, FileText, CheckCircle2, RefreshCw, Sparkles, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import BackgroundAnimation from '@/components/BackgroundAnimation';
import { useECDHKeypair } from '@/hooks/useECDHKeypair';
import { useMurkIdentity } from '@/hooks/useMurkIdentity';
import { encryptAmount, computeCommitment, generateSalt } from '@/lib/confidential';
import { buildCreateInvoicePTB } from '@/lib/ptb';
import { REGISTRY_ID } from '@/lib/constants';

interface SplitPayerState {
  input: string;
  address: string;
  pubKey: string;
  resolved: any | null;
}

export default function CreateInvoice() {
  const router = useRouter();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { keys } = useECDHKeypair();
  const { resolveUsername, profile } = useMurkIdentity();
  const activeAddress = profile?.address || account?.address;
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  // Form states
  const [payerInput, setPayerInput] = useState('');
  const [payerAddress, setPayerAddress] = useState('');
  const [payerPubKey, setPayerPubKey] = useState('');
  const [resolvedProfile, setResolvedProfile] = useState<any | null>(null);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('1');
  
  // Auditor
  const [enableAuditor, setEnableAuditor] = useState(false);
  const [auditorInput, setAuditorInput] = useState('');
  const [auditorAddress, setAuditorAddress] = useState('');
  const [auditorPubKey, setAuditorPubKey] = useState('');
  const [resolvedAuditorProfile, setResolvedAuditorProfile] = useState<any | null>(null);

  // Payment type states
  const [paymentType, setPaymentType] = useState<'standard' | 'escrow' | 'split'>('standard');
  const [splitPayers, setSplitPayers] = useState<SplitPayerState[]>([
    { input: '', address: '', pubKey: '', resolved: null },
    { input: '', address: '', pubKey: '', resolved: null }
  ]);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-resolve Payer identity
  useEffect(() => {
    if (!payerInput) {
      setResolvedProfile(null);
      setPayerAddress('');
      setPayerPubKey('');
      return;
    }

    const cleanInput = payerInput.trim().replace('@', '');
    const profile = resolveUsername(cleanInput);

    if (profile) {
      setResolvedProfile(profile);
      setPayerAddress(profile.address);
      setPayerPubKey(profile.ecdhPublicKey);
    } else {
      setResolvedProfile(null);
      if (payerInput.startsWith('0x') && payerInput.length === 66) {
        setPayerAddress(payerInput);
      } else {
        setPayerAddress('');
      }
    }
  }, [payerInput, resolveUsername]);

  // Auto-resolve Auditor identity
  useEffect(() => {
    if (!auditorInput) {
      setResolvedAuditorProfile(null);
      setAuditorAddress('');
      setAuditorPubKey('');
      return;
    }

    const cleanInput = auditorInput.trim().replace('@', '');
    const profile = resolveUsername(cleanInput);

    if (profile) {
      setResolvedAuditorProfile(profile);
      setAuditorAddress(profile.address);
      setAuditorPubKey(profile.ecdhPublicKey);
    } else {
      setResolvedAuditorProfile(null);
      if (auditorInput.startsWith('0x') && auditorInput.length === 66) {
        setAuditorAddress(auditorInput);
      } else {
        setAuditorAddress('');
      }
    }
  }, [auditorInput, resolveUsername]);

  // Fetch auditor key on-chain if a raw address was entered
  useEffect(() => {
    async function fetchOnChainAuditorKey() {
      if (!enableAuditor || !auditorAddress || auditorAddress.length !== 66 || resolvedAuditorProfile) {
        return;
      }

      try {
        const regObj = await suiClient.getObject({
          id: REGISTRY_ID,
          options: { showContent: true }
        });

        const content = regObj.data?.content;
        if (content && content.dataType === 'moveObject') {
          const fields = content.fields as any;
          const tableId = fields.auditors?.fields?.id?.id;
          
          if (tableId) {
            const tableVal = await suiClient.getDynamicFieldObject({
              parentId: tableId,
              name: {
                type: 'address',
                value: auditorAddress
              }
            });

            const valContent = tableVal.data?.content;
            if (valContent && valContent.dataType === 'moveObject') {
              const valFields = valContent.fields as any;
              const pubKeyBytes = valFields.value;
              if (Array.isArray(pubKeyBytes)) {
                const hexKey = Array.from(pubKeyBytes).map(b => b.toString(16).padStart(2, '0')).join('');
                setAuditorPubKey(hexKey);
                setError(null);
              }
            } else {
              setAuditorPubKey('');
              setError('Auditor is not registered in the Auditor Registry.');
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch auditor key:', err);
        setAuditorPubKey('');
        setError('Failed to query auditor registry.');
      }
    }

    fetchOnChainAuditorKey();
  }, [auditorAddress, enableAuditor, resolvedAuditorProfile, suiClient]);

  const handleSplitPayerChange = (idx: number, val: string) => {
    const updated = [...splitPayers];
    updated[idx].input = val;
    
    const cleanInput = val.trim().replace('@', '');
    const profile = resolveUsername(cleanInput);
    
    if (profile) {
      updated[idx].address = profile.address;
      updated[idx].pubKey = profile.ecdhPublicKey;
      updated[idx].resolved = profile;
    } else {
      updated[idx].resolved = null;
      if (val.startsWith('0x') && val.length === 66) {
        updated[idx].address = val;
      } else {
        updated[idx].address = '';
      }
    }
    setSplitPayers(updated);
  };

  const handleSplitPayerKeyChange = (idx: number, val: string) => {
    const updated = [...splitPayers];
    updated[idx].pubKey = val;
    setSplitPayers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAddress) {
      setError('Please connect a wallet or authenticate with an onboarding profile.');
      return;
    }
    const activePubKey = keys?.publicKey;
    const activePrivKey = keys?.privateKey;

    if (!activePubKey || !activePrivKey) {
      setError('ECDH keys not initialized.');
      return;
    }
    if (payerAddress.length !== 66 && paymentType !== 'split') {
      setError('Invalid Payer Sui Address (must be 66 characters starting with 0x).');
      return;
    }
    if (payerPubKey.length < 50 && paymentType !== 'split') {
      setError('Invalid Payer ECDH Public Key.');
      return;
    }
    if (paymentType === 'split') {
      for (const p of splitPayers) {
        if (p.address.length !== 66) {
          setError('Each split payer address must be 66 characters starting with 0x.');
          return;
        }
        if (p.pubKey.length < 50) {
          setError('Each split payer must have a valid ECDH Public Key.');
          return;
        }
      }
    }
    if (Number(amount) <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (enableAuditor && !auditorPubKey) {
      setError('An auditor is selected but their public key could not be retrieved.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const amountVal = Math.round(Number(amount) * 1000000); 
      const salt = generateSalt();
      
      let finalPayerAddress = payerAddress;
      let encryptedPayer = { ciphertext: '', iv: '' };
      
      if (paymentType !== 'split') {
        encryptedPayer = await encryptAmount(amountVal, activePrivKey, payerPubKey);
      } else {
        encryptedPayer = await encryptAmount(amountVal, activePrivKey, splitPayers[0].pubKey);
        finalPayerAddress = splitPayers[0].address;
      }
      
      let encryptedAuditor = { ciphertext: '', iv: '' };
      if (enableAuditor && auditorPubKey) {
        encryptedAuditor = await encryptAmount(amountVal, activePrivKey, auditorPubKey);
      }

      const commitment = await computeCommitment(amountVal, salt);
      const deadlineMs = Date.now() + Number(deadlineDays) * 24 * 60 * 60 * 1000;

      let invoiceId = '';

      if (activeAddress.startsWith('0x09')) {
        // Simulated local creation for local onboarding profiles
        const mockHex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        invoiceId = '0x' + mockHex;

        localStorage.setItem(`murk_salt_${invoiceId}`, salt);
        localStorage.setItem(`murk_amount_${invoiceId}`, amountVal.toString());

        const sentInvoices = JSON.parse(localStorage.getItem('murk_created_invoices') || '[]');
        sentInvoices.push(invoiceId);
        localStorage.setItem('murk_created_invoices', JSON.stringify(sentInvoices));

        const allInvoices = JSON.parse(localStorage.getItem('murk_all_invoices') || '[]');
        allInvoices.push({
          id: invoiceId,
          payer: finalPayerAddress,
          payee: activeAddress,
          description: paymentType === 'escrow' ? `[ESCROW] ${description}` : description,
          referenceId,
          deadlineMs,
          status: 0
        });
        localStorage.setItem('murk_all_invoices', JSON.stringify(allInvoices));
      } else {
        // Real Sui transaction execution
        const tx = buildCreateInvoicePTB({
          encryptedAmount: new Uint8Array(Buffer.from(encryptedPayer.ciphertext + ':' + encryptedPayer.iv, 'utf8')),
          amountCommitment: new Uint8Array(Buffer.from(commitment, 'hex')),
          auditorPubkey: enableAuditor ? new Uint8Array(Buffer.from(auditorPubKey, 'hex')) : null,
          auditorCiphertext: enableAuditor ? new Uint8Array(Buffer.from(encryptedAuditor.ciphertext + ':' + encryptedAuditor.iv, 'utf8')) : null,
          payer: finalPayerAddress,
          description: paymentType === 'escrow' ? `[ESCROW] ${description}` : description,
          referenceId,
          deadlineMs,
        });

        const response = await signAndExecute({
          transaction: tx,
        });

        const txResult = await suiClient.waitForTransaction({
          digest: response.digest,
          options: {
            showEffects: true,
            showObjectChanges: true,
          }
        });

        const createdObj = txResult.objectChanges?.find(
          (change) => change.type === 'created' && change.objectType.includes('::invoice::Invoice')
        );

        invoiceId = (createdObj as any)?.objectId;

        if (invoiceId) {
          localStorage.setItem(`murk_salt_${invoiceId}`, salt);
          localStorage.setItem(`murk_amount_${invoiceId}`, amountVal.toString());

          const sentInvoices = JSON.parse(localStorage.getItem('murk_created_invoices') || '[]');
          sentInvoices.push(invoiceId);
          localStorage.setItem('murk_created_invoices', JSON.stringify(sentInvoices));

          const allInvoices = JSON.parse(localStorage.getItem('murk_all_invoices') || '[]');
          allInvoices.push({
            id: invoiceId,
            payer: finalPayerAddress,
            payee: activeAddress
          });
          localStorage.setItem('murk_all_invoices', JSON.stringify(allInvoices));
        }
      }

      setSuccess(invoiceId || 'Invoice created successfully.');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: any) {
      console.error('Invoice creation failed:', err);
      setError(err?.message || 'Transaction execution failed.');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = (seed?: string) => {
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed || 'murk'}&backgroundColor=0f172a`;
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans relative overflow-hidden">
      <BackgroundAnimation />

      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 relative z-10">
        
        {/* Back navigation */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-200 text-xs font-semibold mb-6 transition-colors font-mono cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          BACK_TO_DASHBOARD
        </button>

        <div className="glass p-6 sm:p-8 rounded-3xl border border-slate-900/60 shadow-2xl relative">
          
          <div className="flex items-center gap-4 border-b border-slate-900 pb-6 mb-6">
            <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Draft Private Invoice</h1>
              <p className="text-xs text-slate-500 mt-1 font-mono">Encrypt amounts client-side prior to Sui on-chain submission.</p>
            </div>
          </div>

          {error && (
            <div className="p-4 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-3 animate-in zoom-in-95">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 animate-bounce text-emerald-450" />
              <div>
                <p className="font-bold">Invoice Created Successfully!</p>
                <p className="text-[10px] text-emerald-400/80 font-mono mt-1">Sui Object ID: {success}</p>
                <p className="text-[10px] text-slate-500 mt-2">Redirecting back to dashboard ledger...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase mb-2 font-mono">Invoice Amount (USDC)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.000001"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-2xl px-4 py-3.5 text-slate-100 placeholder:text-slate-700 font-mono text-sm focus:border-indigo-500 glow-input"
                />
                <span className="absolute right-4 top-3.5 text-xs font-bold text-indigo-400 font-mono">USDC</span>
              </div>
            </div>

            {/* Payment Structure Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase mb-2 font-mono">Payment Agreement Structure</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-900">
                <button
                  type="button"
                  onClick={() => setPaymentType('standard')}
                  className={`py-3 px-2 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all text-center cursor-pointer ${
                    paymentType === 'standard'
                      ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                      : 'text-slate-500 hover:text-slate-350 border border-transparent'
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('escrow')}
                  className={`py-3 px-2 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all text-center cursor-pointer ${
                    paymentType === 'escrow'
                      ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                      : 'text-slate-500 hover:text-slate-350 border border-transparent'
                  }`}
                >
                  Escrow Lock
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('split')}
                  className={`py-3 px-2 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all text-center cursor-pointer ${
                    paymentType === 'split'
                      ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                      : 'text-slate-500 hover:text-slate-350 border border-transparent'
                  }`}
                >
                  Multi-Payer
                </button>
              </div>
            </div>

            {/* Payer address and ECDH key */}
            {paymentType !== 'split' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase mb-2 font-mono">Payer (@Username or Address)</label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-650" />
                      <input
                        type="text"
                        required
                        placeholder="Type @alice or 0x..."
                        value={payerInput}
                        onChange={(e) => setPayerInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 rounded-2xl pl-11 pr-4 py-3.5 text-slate-100 placeholder:text-slate-700 font-mono text-xs focus:border-indigo-500 glow-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase mb-2 font-mono">Payer ECDH Public Key (Hex)</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-3.5 h-4 w-4 text-slate-650" />
                      <input
                        type="text"
                        required
                        disabled={!!resolvedProfile}
                        placeholder={resolvedProfile ? "Auto-resolved from profile" : "Paste payer's public key..."}
                        value={payerPubKey}
                        onChange={(e) => setPayerPubKey(e.target.value)}
                        className={`w-full bg-slate-950 border border-slate-900 rounded-2xl pl-11 pr-4 py-3.5 text-slate-100 placeholder:text-slate-700 font-mono text-xs focus:border-indigo-500 glow-input ${resolvedProfile ? 'opacity-60 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Resolved Profile Badge */}
                {resolvedProfile && (
                  <div className="p-3.5 rounded-2xl bg-indigo-950/15 border border-indigo-900/30 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-3">
                      <img
                        src={getAvatarUrl(resolvedProfile.avatarSeed)}
                        alt={resolvedProfile.username}
                        className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-850"
                      />
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-200 block font-mono">@{resolvedProfile.username} Resolved</span>
                        <span className="text-[10px] text-slate-550 font-mono block break-all mt-0.5">{resolvedProfile.address}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                      <Check className="h-3.5 w-3.5" /> SECURE IDENTITY FOUND
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Multi-Payer Split Mode */
              <div className="space-y-4 border border-slate-900 p-5 rounded-2xl bg-slate-950/40">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">Split Payer Registrations</h4>
                  <button
                    type="button"
                    onClick={() => setSplitPayers([...splitPayers, { input: '', address: '', pubKey: '', resolved: null }])}
                    className="text-[10px] text-indigo-450 hover:underline font-bold font-mono cursor-pointer"
                  >
                    + ADD_PAYER
                  </button>
                </div>
                {splitPayers.map((p, idx) => (
                  <div key={idx} className="space-y-2 border-b border-slate-900/60 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-1 font-mono">PAYER_{idx + 1}_(@USERNAME OR ADDRESS)</label>
                        <input
                          type="text"
                          required
                          placeholder="Type @alice or 0x..."
                          value={p.input}
                          onChange={(e) => handleSplitPayerChange(idx, e.target.value)}
                          className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2.5 text-[11px] text-slate-100 placeholder:text-slate-700 font-mono focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-1 font-mono">PAYER_{idx + 1}_ECDH_PUBKEY</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            disabled={!!p.resolved}
                            placeholder={p.resolved ? "Auto-resolved from profile" : "Hex..."}
                            value={p.pubKey}
                            onChange={(e) => handleSplitPayerKeyChange(idx, e.target.value)}
                            className={`flex-1 bg-slate-950 border border-slate-900 rounded-xl px-3 py-2.5 text-[11px] text-slate-100 placeholder:text-slate-700 font-mono focus:border-indigo-500 ${p.resolved ? 'opacity-60 cursor-not-allowed' : ''}`}
                          />
                          {splitPayers.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setSplitPayers(splitPayers.filter((_, i) => i !== idx))}
                              className="text-rose-500 hover:text-rose-400 text-[10px] font-bold hover:underline px-2 cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Resolved Badge for split payer */}
                    {p.resolved && (
                      <div className="px-3 py-1.5 rounded-lg bg-indigo-950/10 border border-indigo-900/20 text-[9px] font-mono text-slate-400 flex items-center justify-between">
                        <span>Resolved to: {p.address.slice(0, 16)}...{p.address.slice(-14)}</span>
                        <span className="text-emerald-400 font-bold uppercase tracking-wider">✔ Resolved</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Description & Reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase mb-2 font-mono">Description / Memo</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Software Consulting"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-2xl px-4 py-3.5 text-slate-100 placeholder:text-slate-700 text-xs focus:border-indigo-500 glow-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase mb-2 font-mono">Reference ID (Public)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-2026-042"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-2xl px-4 py-3.5 text-slate-100 placeholder:text-slate-700 text-xs focus:border-indigo-500 glow-input font-mono"
                />
              </div>
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase mb-2 font-mono">Payment Deadline</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-3.5 h-4 w-4 text-slate-650" />
                <select
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-2xl pl-11 pr-4 py-3.5 text-slate-350 text-xs focus:border-indigo-500 glow-input appearance-none cursor-pointer"
                >
                  <option value="1">1 Day (24 Hours)</option>
                  <option value="3">3 Days</option>
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>
            </div>

            {/* Auditor Option */}
            <div className="border-t border-slate-900 pt-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Include Auditor Key Escrow</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-normal">Encrypt amount details for compliance verification by third-party auditors.</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableAuditor}
                  onChange={(e) => setEnableAuditor(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-900 bg-slate-950 text-indigo-600 focus:ring-indigo-650 cursor-pointer"
                />
              </div>

              {enableAuditor && (
                <div className="p-4.5 rounded-2xl bg-slate-900/30 border border-slate-900 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 font-mono">Auditor (@Username or Address)</label>
                    <input
                      type="text"
                      required={enableAuditor}
                      placeholder="Type @auditor or 0x..."
                      value={auditorInput}
                      onChange={(e) => setAuditorInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2.5 text-slate-100 placeholder:text-slate-700 font-mono text-xs focus:border-indigo-500 glow-input"
                    />
                  </div>

                  {/* Resolved Auditor profile */}
                  {resolvedAuditorProfile && (
                    <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-[10px] font-mono break-all flex items-start gap-2">
                      <Shield className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-indigo-400 font-bold block mb-1">Auditor @{resolvedAuditorProfile.username} Resolved:</span>
                        <span className="block font-bold">Address: {resolvedAuditorProfile.address}</span>
                        <span className="block mt-1 font-bold">Key: {resolvedAuditorProfile.ecdhPublicKey}</span>
                      </div>
                    </div>
                  )}

                  {!resolvedAuditorProfile && auditorPubKey && (
                    <div className="text-[10px] text-slate-450 font-mono break-all flex items-start gap-2 bg-indigo-950/20 border border-indigo-900/30 p-3.5 rounded-xl">
                      <Shield className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-indigo-400 font-bold block mb-1">Auditor Public Key found on-chain:</span>
                        {auditorPubKey}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-650 via-indigo-700 to-violet-650 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-xl shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed glow-btn flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  Publishing Private Cryptography Ledger...
                </>
              ) : (
                <>
                  <Shield className="h-4.5 w-4.5" />
                  Draft & Publish Invoice
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
