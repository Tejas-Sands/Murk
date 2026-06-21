'use client';

import React, { useState } from 'react';
import { 
  Plus, Flame, ShieldAlert, BadgeCheck, HelpCircle, 
  TrendingUp, Wallet, ArrowUpRight, Check, Droplets
} from 'lucide-react';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';

const POOLS = [
  { id: 'sui-usdc', pair: 'SUI / USDC', fee: '0.25%', tvl: 45204850, apr: 28.5, share: 0.12, earned: 42.50, verified: true, hot: true, isNew: false },
  { id: 'sui-eth', pair: 'SUI / ETH', fee: '0.30%', tvl: 12450200, apr: 34.2, share: 0.05, earned: 18.25, verified: true, hot: true, isNew: true },
  { id: 'usdc-usdt', pair: 'USDC / USDT', fee: '0.05%', tvl: 85400300, apr: 4.8, share: 0.0, earned: 0.0, verified: true, hot: false, isNew: false },
  { id: 'murk-sui', pair: 'MURK / SUI', fee: '1.00%', tvl: 3420000, apr: 112.5, share: 0.85, earned: 450.80, verified: true, hot: true, isNew: false },
];

export default function LiquidityPanel() {
  const [pools, setPools] = useState(POOLS);
  const [claimStatus, setClaimStatus] = useState<Record<string, 'idle' | 'claiming' | 'success'>>({});
  const [addModalPool, setAddModalPool] = useState<typeof POOLS[0] | null>(null);
  
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  const handleClaim = (poolId: string) => {
    setClaimStatus(prev => ({ ...prev, [poolId]: 'claiming' }));
    setTimeout(() => {
      setClaimStatus(prev => ({ ...prev, [poolId]: 'success' }));
      setPools(prev => prev.map(p => {
        if (p.id === poolId) {
          return { ...p, earned: 0 };
        }
        return p;
      }));
      setTimeout(() => {
        setClaimStatus(prev => ({ ...prev, [poolId]: 'idle' }));
      }, 1500);
    }, 1500);
  };

  const handleAddLiquidity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;

    setIsDepositing(true);
    setTimeout(() => {
      const added = parseFloat(depositAmount);
      setPools(prev => prev.map(p => {
        if (p.id === addModalPool?.id) {
          const newShare = p.share > 0 ? p.share + 0.02 : 0.02;
          return { ...p, share: newShare };
        }
        return p;
      }));
      setIsDepositing(false);
      setAddModalPool(null);
      setDepositAmount('');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white font-heading">Liquidity Pools</h2>
          <p className="text-xs text-text-secondary">Provide liquidity to earn transaction fees and staking emissions.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setAddModalPool(pools[0])}
            variant="primary" 
            className="py-2 px-4 text-xs"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Position
          </Button>
        </div>
      </div>

      {/* Pools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pools.map((pool) => {
          const status = claimStatus[pool.id] || 'idle';
          return (
            <GlassCard key={pool.id} className="p-6 flex flex-col justify-between">
              {/* Card Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-lg">
                    💧
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-base font-heading">{pool.pair}</span>
                      {pool.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                    </div>
                    <span className="text-[10px] text-text-tertiary uppercase font-mono">Fee Tier: {pool.fee}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {pool.hot && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <Flame className="h-3 w-3" /> HOT
                    </span>
                  )}
                  {pool.isNew && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      NEW
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] text-text-secondary uppercase block mb-1">Total TVL</span>
                  <span className="text-sm font-mono font-bold text-white">
                    ${pool.tvl.toLocaleString()}
                  </span>
                </div>
                <div className="bg-black/30 border border-white/5 p-3 rounded-xl relative group">
                  <span className="text-[10px] text-text-secondary uppercase flex items-center gap-1 mb-1">
                    Est. APR
                    <HelpCircle className="h-3 w-3 text-text-tertiary cursor-pointer" />
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {pool.apr}%
                  </span>
                </div>
                <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] text-text-secondary uppercase block mb-1">Your Share</span>
                  <span className="text-sm font-mono font-bold text-white">
                    {pool.share > 0 ? `${(pool.share * 100).toFixed(2)}%` : '0.00%'}
                  </span>
                </div>
                <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] text-text-secondary uppercase block mb-1">Earned Fees</span>
                  <span className="text-sm font-mono font-bold text-primary">
                    ${pool.earned.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 border-t border-white/5 pt-4">
                <Button 
                  onClick={() => setAddModalPool(pool)}
                  variant="secondary" 
                  className="flex-1 py-2 text-xs"
                >
                  Add Liquidity
                </Button>
                {pool.earned > 0 && (
                  <Button 
                    onClick={() => handleClaim(pool.id)}
                    disabled={status === 'claiming'}
                    variant="ghost" 
                    className="flex-1 py-2 text-xs text-primary hover:text-white"
                  >
                    {status === 'claiming' ? 'Claiming...' : status === 'success' ? 'Claimed!' : 'Claim Fees'}
                  </Button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Add Liquidity Modal */}
      {addModalPool && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleAddLiquidity}
            className="w-full max-w-[420px] bg-[#111214] border border-white/10 rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h4 className="text-base font-bold text-white">Add Liquidity</h4>
                <p className="text-[11px] text-text-secondary">{addModalPool.pair} Pool ({addModalPool.fee} tier)</p>
              </div>
              <button 
                type="button"
                onClick={() => setAddModalPool(null)}
                className="text-text-secondary hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-black/30 border border-white/5 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-text-secondary font-mono">Amount to Deposit</span>
                  <span className="text-[10px] text-text-tertiary">Balance: 1,242 SUI</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="0.0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full text-xl font-mono text-white bg-transparent outline-none"
                    required
                  />
                  <span className="text-sm font-bold text-white shrink-0">SUI</span>
                </div>
              </div>

              <div className="text-xs text-text-secondary font-mono bg-black/20 p-3 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span>Pool Price Share:</span>
                  <span>&lt; 0.01%</span>
                </div>
                <div className="flex justify-between">
                  <span>Weekly APR estimate:</span>
                  <span className="text-emerald-400">~{addModalPool.apr}%</span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isDepositing}
              className="w-full py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              variant="primary"
            >
              {isDepositing ? 'Depositing...' : 'Confirm Supply'}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
