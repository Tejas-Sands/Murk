'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@xmtp/xmtp-js';
import { ethers } from 'ethers';
import { Send, Key, MessageSquare, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useECDHKeypair } from '../hooks/useECDHKeypair';

export default function XMTPChat({ invoiceId, peerSuiAddress, currentRole }: { invoiceId: string, peerSuiAddress: string, currentRole: 'payer' | 'payee' }) {
  const { keys } = useECDHKeypair();
  const [xmtpClient, setXmtpClient] = useState<Client | null>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [peerEvmAddress, setPeerEvmAddress] = useState('');
  const [isPeerKnown, setIsPeerKnown] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check if we have peer EVM address cached
  useEffect(() => {
    const cached = localStorage.getItem(`murk_peer_evm_${peerSuiAddress}`);
    if (cached) {
      setPeerEvmAddress(cached);
      setIsPeerKnown(true);
    }
  }, [peerSuiAddress]);

  const initXMTP = async () => {
    if (!keys?.privateKey) {
      setError('Local cryptographic identity not initialized.');
      return;
    }
    if (!peerEvmAddress || !peerEvmAddress.startsWith('0x') || peerEvmAddress.length !== 42) {
      setError('Please enter a valid peer EVM address (0x... 42 chars).');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Create a deterministic EVM wallet from our local ECDH private key
      const cleanPrivKey = keys.privateKey.padStart(64, '0').slice(0, 64);
      const wallet = new ethers.Wallet('0x' + cleanPrivKey);
      
      // Initialize XMTP client on devnet
      const client = await Client.create(wallet, { env: 'dev' });
      setXmtpClient(client);

      // Check if peer is on XMTP
      const canMessage = await client.canMessage(peerEvmAddress);
      if (!canMessage) {
        setError("Peer hasn't activated XMTP on devnet yet.");
        setLoading(false);
        return;
      }

      // Start or load conversation using invoice ID as the conversation ID topic
      const conv = await client.conversations.newConversation(peerEvmAddress, {
        conversationId: `murk-invoice-${invoiceId}`,
        metadata: { title: `Invoice ${invoiceId.slice(0, 6)}` }
      });
      
      setConversation(conv);
      
      // Load existing messages
      const msgs = await conv.messages();
      setMessages(msgs);

      // Save peer address to cache
      localStorage.setItem(`murk_peer_evm_${peerSuiAddress}`, peerEvmAddress);
      setIsPeerKnown(true);

      // Stream new messages
      const stream = await conv.streamMessages();
      (async () => {
        for await (const message of stream) {
          setMessages((prev) => {
            if (prev.find(m => m.id === message.id)) return prev;
            return [...prev, message];
          });
        }
      })();

    } catch (err: any) {
      console.error('XMTP Error:', err);
      setError(err.message || 'Failed to connect to XMTP network.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || !inputText.trim()) return;
    
    const textToSend = inputText;
    setInputText('');
    
    try {
      await conversation.send(textToSend);
    } catch (err) {
      console.error('Failed to send:', err);
    }
  };

  // Derive our own EVM address to show the user
  const myEvmAddress = keys?.privateKey 
    ? new ethers.Wallet('0x' + keys.privateKey.padStart(64, '0').slice(0, 64)).address 
    : '...';

  if (!xmtpClient) {
    return (
      <div className="glass p-6 rounded-3xl border border-slate-900 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-indigo-400 mb-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-bold text-xs tracking-wider uppercase font-mono">Encrypted Messaging Panel</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed font-normal">
          Establish an end-to-end encrypted direct messaging tunnel via the decentralized XMTP protocol, isolated specifically to this invoice context.
        </p>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-900 space-y-1 text-[10px] font-mono leading-normal">
          <div className="text-slate-500">YOUR_CHAT_ADDRESS_EVM:</div>
          <div className="text-indigo-300 break-all select-all">{myEvmAddress}</div>
          <div className="text-slate-500 mt-2">Counterparty must register with this address to initialize.</div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">Peer's EVM Chat Address</label>
            <input
              type="text"
              placeholder="0x... (42 hex chars)"
              value={peerEvmAddress}
              onChange={(e) => setPeerEvmAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-700 font-mono focus:border-indigo-500 glow-input"
            />
          </div>
          
          <button
            onClick={initXMTP}
            disabled={loading || !keys}
            className="w-full py-3 px-4 rounded-xl bg-indigo-650 hover:bg-indigo-650/90 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50 glow-btn cursor-pointer"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
            Connect & Initialize Thread
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl border border-slate-900 shadow-xl flex flex-col h-[480px] overflow-hidden">
      
      {/* Thread Header */}
      <div className="p-4 border-b border-slate-900 bg-slate-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4.5 w-4.5 text-indigo-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider font-mono text-slate-350">Secure Chat Thread</h3>
        </div>
        <div className="text-[9px] text-slate-500 font-mono flex items-center gap-1.5 bg-slate-950 border border-slate-900 px-2.5 py-1 rounded-lg">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          XMTP DEVNET
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/20">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-550 text-xs font-mono">
            <MessageSquare className="h-8 w-8 mb-2 opacity-15" />
            No secure messages detected.
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderAddress.toLowerCase() === myEvmAddress.toLowerCase();
            return (
              <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-xs leading-relaxed font-sans shadow-md border ${
                  isMe 
                    ? 'bg-indigo-650 text-white rounded-tr-sm border-indigo-600' 
                    : 'bg-slate-900 text-slate-200 rounded-tl-sm border-slate-850'
                }`}>
                  {msg.content}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 px-1 font-mono">
                  {new Date(msg.sent).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-900 bg-slate-900/40">
        <form onSubmit={sendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Write end-to-end encrypted message..."
            className="flex-1 bg-slate-950 border border-slate-900 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-700 focus:border-indigo-500 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 shadow-md cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
