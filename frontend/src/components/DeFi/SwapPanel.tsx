'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, ArrowUpDown, ChevronDown, Check, AlertCircle, 
  HelpCircle, ShieldCheck, RefreshCw, Flame
} from 'lucide-react';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';

const TOKENS = [
  { symbol: 'SUI', name: 'Sui Network', balance: 1242.50, price: 1.84, icon: '💧', verified: true },
  { symbol: 'USDC', name: 'USD Coin', balance: 4500.00, price: 1.00, icon: '💵', verified: true },
  { symbol: 'USDT', name: 'Tether USD', balance: 0.00, price: 1.00, icon: '₮', verified: true },
  { symbol: 'ETH', name: 'Ethereum', balance: 1.45, price: 3450.00, icon: 'Ξ', verified: true },
  { symbol: 'MURK', name: 'Murk Protocol', balance: 25000.00, price: 0.25, icon: '🛡️', verified: true },
];

export default function SwapPanel() {
  const [tokenA, setTokenA] = useState(TOKENS[0]); // SUI
  const [tokenB, setTokenB] = useState(TOKENS[1]); // USDC

  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');

  const [showSelectorA, setShowSelectorA] = useState(false);
  const [showSelectorB, setShowSelectorB] = useState(false);

  const [slippage, setSlippage] = useState('0.5');
  const [showSlippageModal, setShowSlippageModal] = useState(false);

  const [showDetails, setShowDetails] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // Validation & States
  const [isApproved, setIsApproved] = useState(false);
  const [swapState, setSwapState] = useState<'idle' | 'approve' | 'swap' | 'loading' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  // Update swap state & outputs based on inputs
  useEffect(() => {
    if (!amountA) {
      setAmountB('');
      setSwapState('idle');
      setErrorMsg(null);
      return;
    }

    const val = parseFloat(amountA);
    if (isNaN(val) || val <= 0) {
      setAmountB('');
      setSwapState('idle');
      setErrorMsg('Enter a valid amount');
      return;
    }

    if (val > tokenA.balance) {
      setSwapState('idle');
      setErrorMsg(`Insufficient ${tokenA.symbol} balance`);
      return;
    }

    setErrorMsg(null);

    // Calculate output amount
    const rate = (tokenA.price / tokenB.price) * 0.997; // 0.3% fee
    const outVal = val * rate;
    setAmountB(outVal.toFixed(6));

    // Determine if approval is needed (e.g. if swapping USDC, let's pretend approval is needed once)
    if (tokenA.symbol === 'USDC' && !isApproved) {
      setSwapState('approve');
    } else {
      setSwapState('swap');
    }
  }, [amountA, tokenA, tokenB, isApproved]);

  const handleMax = () => {
    // Keep 1 SUI for gas if token is SUI
    const reserve = tokenA.symbol === 'SUI' ? 1.0 : 0.0;
    const maxAmount = Math.max(0, tokenA.balance - reserve);
    setAmountA(maxAmount.toString());
  };

  const handleSwitch = () => {
    setIsRotating(true);
    const temp = tokenA;
    setTokenA(tokenB);
    setTokenB(temp);
    setAmountA(amountB);
    setAmountB(amountA);
    setTimeout(() => setIsRotating(false), 300);
  };

  const handleAction = async () => {
    if (swapState === 'approve') {
      setSwapState('loading');
      setTimeout(() => {
        setIsApproved(true);
        setSwapState('swap');
      }, 1500);
    } else if (swapState === 'swap') {
      setSwapState('loading');
      setTimeout(() => {
        // Mock successful swap: update balances
        const inputAmount = parseFloat(amountA);
        const outputAmount = parseFloat(amountB);
        
        tokenA.balance -= inputAmount;
        tokenB.balance += outputAmount;

        setSwapState('success');
        setAmountA('');
        setAmountB('');
        
        setTimeout(() => {
          setSwapState('idle');
        }, 2000);
      }, 2000);
    }
  };

  const getActionButtonText = () => {
    if (errorMsg) return errorMsg;
    switch (swapState) {
      case 'idle': return 'Enter Amount';
      case 'approve': return `Approve ${tokenA.symbol}`;
      case 'swap': return 'Swap';
      case 'loading': return 'Processing...';
      case 'success': return 'Success!';
    }
  };

  return (
    <div className="w-full max-w-[480px] mx-auto py-4 relative">
      {/* Swap Card Container */}
      <GlassCard className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white font-heading">Swap Tokens</h3>
            <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary font-mono font-bold px-2 py-0.5 rounded-full uppercase">Sui Direct</span>
          </div>
          <button 
            onClick={() => setShowSlippageModal(!showSlippageModal)}
            className="p-1.5 hover:bg-white/5 rounded-lg text-text-secondary hover:text-white transition-colors cursor-pointer relative"
          >
            <Settings className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Slippage Settings Drawer */}
        {showSlippageModal && (
          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3 animate-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Slippage Tolerance</span>
              <span className="font-mono text-primary font-bold">{slippage}%</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {['0.1', '0.5', '1.0'].map((val) => (
                <button
                  key={val}
                  onClick={() => setSlippage(val)}
                  className={`py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                    slippage === val 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-white/5 border-transparent text-text-secondary hover:border-white/10'
                  }`}
                >
                  {val}%
                </button>
              ))}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Custom"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  className="w-full py-1 text-center bg-white/5 border border-transparent hover:border-white/10 focus:border-primary/50 text-xs font-mono text-white rounded-lg focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Input A (From) */}
        <div className={`p-4 bg-black/30 border rounded-2xl relative transition-all ${
          errorMsg && amountA ? 'border-red-500/50' : 'border-white/5 focus-within:border-primary/40'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-text-tertiary uppercase font-mono tracking-wider">Pay</span>
            <button 
              onClick={() => setShowSelectorA(true)}
              className="flex items-center gap-1.5 bg-[#1A1B1F] hover:bg-[#1E1F24] border border-white/5 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-colors cursor-pointer"
            >
              <span>{tokenA.icon}</span>
              <span>{tokenA.symbol}</span>
              <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
            </button>
          </div>
          
          <div className="flex items-end justify-between gap-4">
            <input
              type="text"
              placeholder="0.0"
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              className="w-full text-2xl font-mono text-white bg-transparent outline-none placeholder:text-text-tertiary text-left"
            />
            <div className="text-right shrink-0">
              <div className="text-xs text-text-secondary font-mono">
                ${amountA ? (parseFloat(amountA) * tokenA.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 text-[10px] text-text-tertiary">
            <span>Balance: {tokenA.balance.toLocaleString()} {tokenA.symbol}</span>
            <button 
              onClick={handleMax}
              className="font-bold text-primary hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
            >
              Max
            </button>
          </div>
        </div>

        {/* Swap Switch Button */}
        <div className="flex justify-center -my-6 relative z-10">
          <button
            onClick={handleSwitch}
            className="p-3 bg-[#1E1F24] hover:bg-[#1A1B1F] border border-white/10 hover:border-primary/40 hover:shadow-glow_primary/30 rounded-full text-text-secondary hover:text-primary transition-all duration-300 active:scale-90 cursor-pointer shadow-lg"
          >
            <ArrowUpDown className={`h-4.5 w-4.5 transition-transform duration-300 ${isRotating ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Input B (To) */}
        <div className="p-4 bg-black/30 border border-white/5 focus-within:border-primary/40 rounded-2xl relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-text-tertiary uppercase font-mono tracking-wider">Receive</span>
            <button 
              onClick={() => setShowSelectorB(true)}
              className="flex items-center gap-1.5 bg-[#1A1B1F] hover:bg-[#1E1F24] border border-white/5 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-colors cursor-pointer"
            >
              <span>{tokenB.icon}</span>
              <span>{tokenB.symbol}</span>
              <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
            </button>
          </div>
          
          <div className="flex items-end justify-between gap-4">
            <input
              type="text"
              placeholder="0.0"
              value={amountB}
              readOnly
              className="w-full text-2xl font-mono text-white bg-transparent outline-none placeholder:text-text-tertiary text-left"
            />
            <div className="text-right shrink-0">
              <div className="text-xs text-text-secondary font-mono">
                ${amountB ? (parseFloat(amountB) * tokenB.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 text-[10px] text-text-tertiary">
            <span>Balance: {tokenB.balance.toLocaleString()} {tokenB.symbol}</span>
          </div>
        </div>

        {/* Accordion Details */}
        {amountA && (
          <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-3.5 text-xs text-text-secondary hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1">
                <span>1 {tokenA.symbol} = {(tokenA.price / tokenB.price).toFixed(4)} {tokenB.symbol}</span>
              </div>
              <div className="flex items-center gap-1 font-bold text-primary">
                <span>{showDetails ? 'Hide' : 'Show'} Details</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showDetails && (
              <div className="p-3.5 pt-0 border-t border-white/5 space-y-2.5 text-[11px] font-mono text-text-secondary">
                <div className="flex items-center justify-between">
                  <span>Minimum Received</span>
                  <span className="text-white">{(parseFloat(amountB) * 0.995).toFixed(6)} {tokenB.symbol}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Price Impact</span>
                  <span className="text-emerald-400">&lt; 0.05%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Liquidity Provider Fee</span>
                  <span className="text-white">0.3% ({(parseFloat(amountA) * 0.003).toFixed(4)} {tokenA.symbol})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Network Gas Estimate</span>
                  <span className="text-white flex items-center gap-1">💧 &lt; 0.003 SUI</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleAction}
          disabled={swapState === 'idle' || !!errorMsg}
          className="w-full py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          variant="primary"
        >
          {swapState === 'loading' && <RefreshCw className="h-4.5 w-4.5 animate-spin" />}
          {swapState === 'success' && <Check className="h-4.5 w-4.5 text-emerald-400" />}
          {getActionButtonText()}
        </Button>
      </GlassCard>

      {/* Selector Modals */}
      {(showSelectorA || showSelectorB) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] bg-[#111214] border border-white/10 rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white">Select Token</h4>
              <button 
                onClick={() => { setShowSelectorA(false); setShowSelectorB(false); }}
                className="text-text-secondary hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {TOKENS.map((tk) => (
                <button
                  key={tk.symbol}
                  onClick={() => {
                    if (showSelectorA) setTokenA(tk);
                    else setTokenB(tk);
                    setShowSelectorA(false);
                    setShowSelectorB(false);
                  }}
                  className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{tk.icon}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-sm">{tk.symbol}</span>
                        {tk.verified && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <span className="text-[11px] text-text-tertiary">{tk.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-mono text-sm text-white">{tk.balance.toLocaleString()}</span>
                    <span className="block text-[10px] text-text-tertiary">${tk.price.toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
