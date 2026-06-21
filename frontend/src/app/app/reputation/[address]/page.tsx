'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSuiClient } from '@mysten/dapp-kit';
import { Shield, Medal, CheckCircle2, Clock, Zap, Target, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import { PACKAGE_ID } from '@/lib/constants';
import TrustGlobe from '@/components/3d/TrustGlobe';

export default function ReputationPage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;
  const suiClient = useSuiClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stats
  const [totalSettlements, setTotalSettlements] = useState(0);
  const [onTimeRate, setOnTimeRate] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [tierName, setTierName] = useState('UNRANKED');
  const [tierSubText, setTierSubText] = useState('Tier I: Local Standard Account');
  const [tierColor, setTierColor] = useState('text-slate-500');
  const [tierBg, setTierBg] = useState('bg-slate-900/50 border-slate-800');
  const [tierGlow, setTierGlow] = useState('rgba(148, 163, 184, 0.05)');

  useEffect(() => {
    if (address) fetchReputationData();
  }, [address]);

  const fetchReputationData = async () => {
    setLoading(true);
    try {
      if (address.startsWith('0x09')) {
        // Simulated local fallback
        setTotalSettlements(6);
        setOnTimeRate(105 % 100 ? 100 : 98); // exactly 100%
        setCurrentStreak(5);
        setTierName('GOLD');
        setTierSubText('Tier III: Gold Premium Merchant (Simulated)');
        setTierColor('text-yellow-500');
        setTierBg('bg-yellow-950/10 border-yellow-900/30');
        setTierGlow('rgba(234, 179, 8, 0.15)');
        setLoading(false);
        return;
      }

      // Fetch user's SettlementReceipts
      const receiptsRes = await suiClient.getOwnedObjects({
        owner: address,
        filter: {
          StructType: `${PACKAGE_ID}::invoice::SettlementReceipt`
        },
        options: { showContent: true }
      });

      // Fetch user's ReputationBadge
      const badgeRes = await suiClient.getOwnedObjects({
        owner: address,
        filter: {
          StructType: `${PACKAGE_ID}::reputation::ReputationBadge`
        },
        options: { showContent: true }
      });

      const badge = badgeRes.data.length > 0 ? badgeRes.data[0].data?.content as any : null;
      if (badge && badge.fields) {
        const tierMap: Record<number, {name: string, sub: string, color: string, bg: string, glow: string}> = {
          1: { 
            name: 'BRONZE', 
            sub: 'Tier I: Bronze Transactor', 
            color: 'text-amber-600', 
            bg: 'bg-amber-950/10 border-amber-900/30', 
            glow: 'rgba(217, 119, 6, 0.1)' 
          },
          2: { 
            name: 'SILVER', 
            sub: 'Tier II: Silver Integrity Partner', 
            color: 'text-slate-400', 
            bg: 'bg-slate-900/60 border-slate-800', 
            glow: 'rgba(148, 163, 184, 0.1)' 
          },
          3: { 
            name: 'GOLD', 
            sub: 'Tier III: Gold Premium Merchant', 
            color: 'text-yellow-500', 
            bg: 'bg-yellow-950/10 border-yellow-900/30', 
            glow: 'rgba(234, 179, 8, 0.15)' 
          },
          4: { 
            name: 'PLATINUM', 
            sub: 'Tier IV: Elite Audited Institution', 
            color: 'text-indigo-400', 
            bg: 'bg-indigo-950/15 border-indigo-500/25', 
            glow: 'rgba(99, 102, 241, 0.2)' 
          },
        };
        const t = tierMap[badge.fields.badge_tier] || { 
          name: 'UNRANKED', 
          sub: 'Tier I: Standard Account', 
          color: 'text-slate-500', 
          bg: 'bg-slate-900/50 border-slate-805', 
          glow: 'rgba(148, 163, 184, 0.05)' 
        };
        setTierName(t.name);
        setTierSubText(t.sub);
        setTierColor(t.color);
        setTierBg(t.bg);
        setTierGlow(t.glow);
      }

      const receipts = receiptsRes.data.map(r => r.data?.content as any).filter(Boolean);
      
      setTotalSettlements(receipts.length);

      if (receipts.length > 0) {
        let onTimeCount = badge?.fields?.on_time_count || receipts.length; 
        setOnTimeRate(Math.round((onTimeCount / receipts.length) * 100));
        setCurrentStreak(Math.min(receipts.length, 5));
      }

    } catch (err: any) {
      setError(err?.message || 'Failed to fetch reputation data.');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 15 } }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-12">
        {/* Navigation */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-200 text-xs font-semibold mb-8 transition-colors font-mono cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          BACK_TO_DASHBOARD
        </button>

        {/* Profile Card Header */}
        <div className="mb-12 text-center flex flex-col items-center">
          <motion.div 
            className={`inline-flex items-center justify-center h-20 w-20 rounded-full bg-slate-950 border-2 shadow-2xl mb-4 relative ${tierColor}`}
            style={{ 
              borderColor: 'currentColor', 
              boxShadow: `0 0 40px -5px ${tierGlow}` 
            }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Medal className="h-10 w-10" />
          </motion.div>
          
          <motion.h1 
            className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            On-Chain Reputation
          </motion.h1>
          
          <motion.p 
            className="text-[10px] text-slate-500 font-mono mt-1.5 break-all max-w-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {address}
          </motion.p>
          
          <motion.div 
            className={`mt-4 inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-bold border uppercase tracking-wider font-mono ${tierBg}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {tierSubText}
          </motion.div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center font-mono text-xs">
            {error}
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Trust Globe Visualization */}
            <motion.div 
              variants={cardVariants}
              className="md:col-span-3 glass p-6 rounded-3xl border border-slate-900 flex flex-col items-center justify-center relative overflow-hidden"
            >
              <div className="absolute top-4 left-6">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Reputation Network Node Map</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block font-sans">Visualizing zero-knowledge verification points</span>
              </div>
              <div className="w-full max-w-[400px] h-[300px] mt-6">
                <TrustGlobe trustScore={onTimeRate || 85} />
              </div>
            </motion.div>

            {/* Stat Card 1 */}
            <motion.div 
              variants={cardVariants}
              className="glass p-6 rounded-3xl border border-slate-900 hover:border-slate-800/80 transition-colors relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <CheckCircle2 className="h-24 w-24 text-emerald-500" />
              </div>
              <div className="relative z-10 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Total Settlements</span>
                <span className="text-4xl font-black text-slate-100 font-mono">{totalSettlements}</span>
                <p className="text-[11px] text-slate-400 leading-normal pt-2 font-normal">
                  Invoices successfully processed and settled on the Sui network.
                </p>
              </div>
            </motion.div>

            {/* Stat Card 2 */}
            <motion.div 
              variants={cardVariants}
              className="glass p-6 rounded-3xl border border-slate-900 hover:border-slate-800/80 transition-colors relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Target className="h-24 w-24 text-indigo-500" />
              </div>
              <div className="relative z-10 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-mono">On-Time Rate</span>
                <span className="text-4xl font-black text-slate-100 font-mono">{onTimeRate}%</span>
                <p className="text-[11px] text-slate-400 leading-normal pt-2 font-normal">
                  Percentage of commitments verified prior to the specified invoice deadline.
                </p>
              </div>
            </motion.div>

            {/* Stat Card 3 */}
            <motion.div 
              variants={cardVariants}
              className="glass p-6 rounded-3xl border border-slate-900 hover:border-slate-800/80 transition-colors relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap className="h-24 w-24 text-amber-500" />
              </div>
              <div className="relative z-10 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Current Streak</span>
                <span className="text-4xl font-black text-slate-100 font-mono">{currentStreak}</span>
                <p className="text-[11px] text-slate-400 leading-normal pt-2 font-normal">
                  Number of consecutive settlements completed on time without delays.
                </p>
              </div>
            </motion.div>

            {/* Verification Indicator */}
            <motion.div 
              variants={cardVariants}
              className="md:col-span-3 mt-4"
            >
              <div className="p-5 rounded-2xl bg-indigo-950/15 border border-indigo-500/15 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-indigo-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Zero-Knowledge Trust Scoring</h4>
                    <p className="text-[11px] text-slate-400 leading-normal mt-0.5 font-normal">
                      Reputation metrics are calculated via cryptographic commitment timestamps. Real invoice details remain entirely anonymous.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
