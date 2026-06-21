'use client';

import React, { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient, ConnectButton } from '@mysten/dapp-kit';
import { 
  Shield, UserCheck, Eye, Key, AlertCircle, CheckCircle2, Clipboard, Search, FileText, 
  ArrowRight, ShieldCheck, RefreshCw
} from 'lucide-react';
import Header from '@/components/Header';
import AmbientGrid from '@/components/3d/AmbientGrid';
import { useECDHKeypair } from '@/hooks/useECDHKeypair';
import { parseInvoiceObject } from '@/lib/parse';
import { buildRegisterAuditorPTB } from '@/lib/ptb';
import { REGISTRY_ID } from '@/lib/constants';
import { useMurkIdentity } from '@/hooks/useMurkIdentity';
import IdentityModal from '@/components/IdentityModal';

export default function AuditHub() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { keys } = useECDHKeypair();
  const { registeredUsers, profile } = useMurkIdentity();
  const activeAddress = profile?.address || account?.address;
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  // Registration states
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Decryption states
  const [searchInvoiceId, setSearchInvoiceId] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [foundInvoice, setFoundInvoice] = useState<any>(null);
  const [auditedAmount, setAuditedAmount] = useState<number | null>(null);
  const [auditedSalt, setAuditedSalt] = useState<string | null>(null);
  const [decryptionLoading, setDecryptionLoading] = useState(false);

  // Check if current user is registered as auditor
  const checkRegistrationStatus = async () => {
    if (!activeAddress) return;
    if (activeAddress.startsWith('0x09')) {
      setIsRegistered(true);
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
          try {
            const tableVal = await suiClient.getDynamicFieldObject({
              parentId: tableId,
              name: {
                type: 'address',
                value: activeAddress
              }
            });
            setIsRegistered(tableVal.data !== undefined);
          } catch (e) {
            // Not registered (returns 404/error)
            setIsRegistered(false);
          }
        }
      }
    } catch (err) {
      console.error('Failed to check registration status:', err);
    }
  };

  useEffect(() => {
    if (activeAddress) {
      checkRegistrationStatus();
    }
  }, [activeAddress, suiClient]);

  // Handle Auditor Registration on-chain
  const handleRegister = async () => {
    if (!activeAddress || !keys) return;
    setRegistering(true);
    setRegError(null);
    setRegSuccess(null);

    try {
      if (activeAddress.startsWith('0x09')) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setRegSuccess('Registered successfully as Auditor! (Simulated)');
        setIsRegistered(true);
      } else {
        const tx = buildRegisterAuditorPTB({
          auditorAddress: activeAddress,
          pubkey: new Uint8Array(Buffer.from(keys.publicKey, 'hex'))
        });

        const response = await signAndExecute({ transaction: tx });
        await suiClient.waitForTransaction({ digest: response.digest });

        setRegSuccess('Registered successfully as Auditor!');
        setIsRegistered(true);
        checkRegistrationStatus();
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      setRegError(err?.message || 'Transaction execution failed.');
    } finally {
      setRegistering(false);
    }
  };

  // Handle Fetch and Decrypt for Audit
  const handleAuditLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInvoiceId || searchInvoiceId.length !== 66) {
      setSearchError('Invalid Invoice Object ID.');
      return;
    }

    setSearchError(null);
    setFoundInvoice(null);
    setAuditedAmount(null);
    setAuditedSalt(null);
    setDecryptionLoading(true);

    try {
      if (searchInvoiceId.startsWith('0x09')) {
        // Simulated local fallback
        const simulatedInvoices = JSON.parse(localStorage.getItem('murk_all_invoices') || '[]');
        const found = simulatedInvoices.find((inv: any) => inv.id === searchInvoiceId);
        if (found) {
          setFoundInvoice({
            id: found.id,
            payer: found.payer,
            payee: found.payee,
            description: found.description || 'Simulated Invoice',
            referenceId: found.referenceId || 'SIM-INV',
            status: found.status ?? 0,
            deadlineMs: found.deadlineMs || (Date.now() + 86400000),
            createdMs: Date.now() - 3600000,
            auditorCiphertext: 'simulated_ciphertext',
            auditorPubkey: 'simulated_pubkey'
          });

          // Mock audited values
          const localSalt = localStorage.getItem(`murk_salt_${searchInvoiceId}`) || 'simulated_salt_abc123';
          const cachedAmount = localStorage.getItem(`murk_amount_${searchInvoiceId}`);
          setAuditedAmount(cachedAmount ? Number(cachedAmount) : 1500 * 1000000);
          setAuditedSalt(localSalt);
        } else {
          setSearchError('Simulated invoice not found.');
        }
      } else {
        const obj = await suiClient.getObject({
          id: searchInvoiceId,
          options: { showContent: true }
        });

        const parsed = parseInvoiceObject(obj);
        if (!parsed) {
          setSearchError('Not a valid Murk Invoice object.');
          setDecryptionLoading(false);
          return;
        }

        setFoundInvoice(parsed);

        if (!parsed.auditorCiphertext) {
          setSearchError('This invoice was not escrowed for an auditor.');
          setDecryptionLoading(false);
          return;
        }

        // Decrypt using Auditor Private Key and Payee Public Key
        if (!keys) {
          setSearchError('Local ECDH keys are not initialized.');
          setDecryptionLoading(false);
          return;
        }

        if (!parsed.auditorPubkey) {
          setSearchError('Missing Payee Public Key from auditor escrow.');
          setDecryptionLoading(false);
          return;
        }

        // Decrypt
        const rawPlaintext = await decryptRaw(parsed.auditorCiphertext, keys.privateKey, parsed.auditorPubkey);
        const parts = rawPlaintext.split(':');
        if (parts.length === 2) {
          setAuditedAmount(Number(parts[0]));
          setAuditedSalt(parts[1]);
        } else {
          setAuditedAmount(Number(rawPlaintext));
        }
      }
    } catch (err: any) {
      console.error('Audit lookup failed:', err);
      setSearchError('Decryption failed. Confirm you are the designated auditor for this invoice.');
    } finally {
      setDecryptionLoading(false);
    }
  };

  // Helper for raw decryption
  const decryptRaw = async (hexData: string, privateKeyHex: string, peerPubHex: string): Promise<string> => {
    const bytes = Buffer.from(hexData, 'utf8');
    const parts = new TextDecoder().decode(bytes).split(':');
    
    let ciphertextHex = '';
    let ivHex = '';

    if (parts.length === 2) {
      ciphertextHex = parts[0];
      ivHex = parts[1];
    } else {
      const rawHexStr = new TextDecoder().decode(Buffer.from(hexData, 'hex'));
      const subParts = rawHexStr.split(':');
      if (subParts.length === 2) {
        ciphertextHex = subParts[0];
        ivHex = subParts[1];
      } else {
        throw new Error('Invalid ciphertext format');
      }
    }

    const privKeyBytes = new Uint8Array(Buffer.from(privateKeyHex, 'hex'));
    const pubKeyBytes = new Uint8Array(Buffer.from(peerPubHex, 'hex'));

    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      privKeyBytes,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    );

    const publicKey = await window.crypto.subtle.importKey(
      'spki',
      pubKeyBytes,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    );

    const aesKey = await window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: publicKey },
      privateKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt']
    );

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(Buffer.from(ivHex, 'hex')) as any },
      aesKey,
      new Uint8Array(Buffer.from(ciphertextHex, 'hex')) as any
    );

    return new TextDecoder().decode(decrypted);
  };

  if (!activeAddress) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col relative overflow-hidden">
        <AmbientGrid />
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 space-y-4">
          <AlertCircle className="h-12 w-12 text-indigo-400 mb-2 animate-bounce" />
          <h2 className="text-xl font-bold mb-2">Identity Not Connected</h2>
          <p className="text-slate-400 text-sm max-w-sm mb-4">
            Connect your Sui Wallet or Social/Onboard Profile to access the Compliance & Audit Hub.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
            <ConnectButton className="!bg-indigo-650 hover:!bg-indigo-500 !text-white !font-bold !text-xs !uppercase !tracking-wider !transition-all !duration-300 !cursor-pointer glow-btn" />
            <button
              onClick={() => setIsModalOpen(true)}
              className="py-3 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 font-heading"
            >
              <Key className="h-4 w-4" />
              Use Social/Onboard Profile
            </button>
          </div>
          <IdentityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
      </div>
    );
  }

  const payeeUser = foundInvoice ? registeredUsers.find(u => u.address.toLowerCase() === foundInvoice.payee.toLowerCase()) : null;
  const payerUser = foundInvoice ? registeredUsers.find(u => u.address.toLowerCase() === foundInvoice.payer.toLowerCase()) : null;

  return (
    <div className="min-h-screen bg-transparent flex flex-col relative overflow-hidden">
      <AmbientGrid />
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-8 relative z-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-slate-400 bg-clip-text text-transparent">Compliance & Audit Hub</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">Register as an auditor and perform cryptographic audits on escrowed invoices.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Auditor Registration */}
          <div className="md:col-span-1 space-y-6">
            <div className="glass p-6 rounded-2xl border border-slate-900 space-y-4 text-left">
              <div className="flex items-center gap-2 text-indigo-400">
                <UserCheck className="h-5 w-5" />
                <h3 className="font-bold">Auditor Status</h3>
              </div>

              {isRegistered ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="font-semibold">Registered Auditor on Sui</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Your wallet is registered in the Auditor Registry. Payees can now escrow invoices to your address.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2.5">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-semibold">Not Registered</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Registering puts your public key into the global registry, enabling payees to encrypt amounts for you.
                  </p>

                  {regError && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px]">
                      {regError}
                    </div>
                  )}

                  {regSuccess && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px]">
                      {regSuccess}
                    </div>
                  )}

                  <button
                    onClick={handleRegister}
                    disabled={registering}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {registering ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Shield className="h-4 w-4" />
                    )}
                    Register as Auditor
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Invoice Auditing Tool */}
          <div className="md:col-span-2 space-y-6">
            <div className="glass p-6 rounded-2xl border border-slate-900 space-y-6 text-left">
              <div className="flex items-center gap-2 text-violet-400 border-b border-slate-800/80 pb-4">
                <Search className="h-5 w-5" />
                <h3 className="font-bold">Cryptographic Audit Panel</h3>
              </div>

              <form onSubmit={handleAuditLookup} className="flex gap-2">
                <div className="relative flex-1">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Enter Invoice Object ID to audit..."
                    value={searchInvoiceId}
                    onChange={(e) => setSearchInvoiceId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 glow-input font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={decryptionLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  {decryptionLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  Audit
                </button>
              </form>

              {searchError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Decrypted results */}
              {foundInvoice && auditedAmount !== null && (
                <div className="space-y-6 animate-float">
                  <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-indigo-900/30 pb-3">
                      <span className="text-xs font-bold text-indigo-400">Decryption Success</span>
                      <span className="text-[10px] text-slate-400 font-mono">Ref: {foundInvoice.referenceId}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 block">Description</span>
                        <span className="text-slate-300 font-bold">{foundInvoice.description}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Audit Amount</span>
                        <span className="text-base font-extrabold text-emerald-400 font-mono">
                          {(auditedAmount / 1000000).toFixed(2)} USDC
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[10px] font-mono border-t border-indigo-900/30 pt-3">
                      <div>
                        <span className="text-slate-500 block">Payee Address</span>
                        <span className="text-slate-400 break-all font-bold">
                          {payeeUser ? `@${payeeUser.username}` : foundInvoice.payee}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Payer Address</span>
                        <span className="text-slate-400 break-all font-bold">
                          {payerUser ? `@${payerUser.username}` : foundInvoice.payer}
                        </span>
                      </div>
                    </div>

                    {auditedSalt && (
                      <div className="text-[9px] font-mono text-slate-500 border-t border-indigo-900/20 pt-3 text-left">
                        <span className="text-indigo-400 font-bold block mb-1">Decrypted Commitment Salt:</span>
                        <span className="break-all">{auditedSalt}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
