'use client';

import React, { useState } from 'react';
import { 
  Coins, Sparkles, TrendingUp, HelpCircle, AlertCircle, 
  ArrowUpRight, ShieldCheck, RefreshCw, Check
} from 'lucide-react';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';

const STAKE_POOLS = [
  { id: 'sui', token: 'SUI', name: 'Sui Validator Staking', apr: 6.8, staked: 500, earned: 1.24, totalStaked: 12450000, logo: '💧' },
  { id: 'murk', token: 'MURK', name: 'Murk Governance Staking', apr: 48.5, staked: 12500, earned: 184.20, totalStaked: 3400000, logo: '🛡️' },
  { id: 'sui-usdc-lp', token: 'SUI-USDC LP', name: 'SUI/USDC Yield Farm', apr: 38.2, staked: 0, earned: 0.00, totalStaked: 8500000, logo: '🚜' },
];

export default function StakingPanel() {
  const [pools, setPools] = useState(STAKE_POOLS);
  const [claimStatus, setClaimStatus] = useState<Record<string, 'idle' | 'claiming' | 'success'>>({});
  
  // Stake/Unstake modal states
  const [actionPool, setActionPool] = useState<typeof STAKE_POOLS[0] | null>(null);
  const [actionType, setActionType] = useState<'stake' | 'unstake'>('stake');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleStakingAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const val = parseFloat(amount);
      setPools(prev => prev.map(p => {
        if (p.id === actionPool?.id) {
          const newStaked = actionType === 'stake' ? p.staked + val : Math.max(0, p.staked - val);
          return { ...p, staked: newStaked };
        }
        return p;
      }));
      setIsSubmitting(false);
      setActionPool(null);
      setAmount('');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white font-heading">Staking & Yield Farms</h2>
          <p className="text-xs text-text-secondary">Stake your tokens to secure the network and earn protocol rewards.</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {pools.map((pool) => {
          const status = claimStatus[pool.id] || 'idle';
          return (
            <GlassCard key={pool.id} className="p-6 flex flex-col justify-between h-full">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      {pool.logo}
                    </span>
                    <div>
                      <h3 className="font-bold text-white text-base font-heading">{pool.token}</h3>
                      <span className="text-[10px] text-text-tertiary block">{pool.name}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {pool.apr}% APR
                  </span>
                </div>

                {/* Info Blocks */}
                <div className="space-y-3.5 mb-6">
                  <div className="flex items-center justify-between text-xs font-mono border-b border-white/5 pb-2">
                    <span className="text-text-secondary">Total Value Staked</span>
                    <span className="text-white font-bold">${pool.totalStaked.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono border-b border-white/5 pb-2">
                    <span className="text-text-secondary">Your Stake</span>
                    <span className="text-white font-bold">{pool.staked.toLocaleString()} {pool.token}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono border-b border-white/5 pb-2">
                    <span className="text-text-secondary">Earned Rewards</span>
                    <span className="text-primary font-bold">{pool.earned.toFixed(4)} {pool.token}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                <div className="flex gap-2">
                  <Button 
                    onClick={() => { setActionPool(pool); setActionType('stake'); }}
                    variant="primary" 
                    className="flex-1 py-2 text-xs"
                  >
                    Stake
                  </Button>
                  {pool.staked > 0 && (
                    <Button 
                      onClick={() => { setActionPool(pool); setActionType('unstake'); }}
                      variant="secondary" 
                      className="flex-1 py-2 text-xs"
                    >
                      Unstake
                    </Button>
                  )}
                </div>
                {pool.earned > 0 && (
                  <Button 
                    onClick={() => handleClaim(pool.id)}
                    disabled={status === 'claiming'}
                    variant="ghost" 
                    className="w-full py-2 text-xs text-primary hover:text-white flex items-center justify-center gap-1.5"
                  >
                    {status === 'claiming' ? 'Claiming...' : status === 'success' ? 'Claimed!' : 'Claim Emissions'}
                  </Button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Stake / Unstake Modal */}
      {actionPool && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleStakingAction}
            className="w-full max-w-[420px] bg-[#111214] border border-white/10 rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h4 className="text-base font-bold text-white capitalize">{actionType} {actionPool.token}</h4>
                <p className="text-[11px] text-text-secondary">{actionPool.name}</p>
              </div>
              <button 
                type="button"
                onClick={() => setActionPool(null)}
                className="text-text-secondary hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-black/30 border border-white/5 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-text-secondary font-mono">Amount to {actionType}</span>
                  <span className="text-[10px] text-text-tertiary">
                    {actionType === 'stake' ? `Balance: ${actionPool.token === 'SUI' ? '1,242' : '25,000'} ${actionPool.token}` : `Staked: ${actionPool.staked.toLocaleString()}`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full text-xl font-mono text-white bg-transparent outline-none"
                    required
                  />
                  <span className="text-sm font-bold text-white shrink-0">{actionPool.token}</span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              variant="primary"
            >
              {isSubmitting ? 'Confirming...' : `Confirm ${actionType}`}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
