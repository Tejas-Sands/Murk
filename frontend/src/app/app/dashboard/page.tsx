'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCurrentAccount, useSuiClient, ConnectButton } from '@mysten/dapp-kit';
import { 
  Shield, FileText, CheckCircle2, Clock as ClockIcon, AlertCircle, PlusCircle, Search, 
  ArrowUpRight, ArrowDownLeft, Key, Clipboard, Check, Trash2, ArrowRight, BarChart3, LayoutDashboard,
  Wallet, Bell, Globe, ArrowLeftRight, Droplets, TrendingUp, Landmark, Gift, ChevronDown, CheckSquare, Sparkles
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

import { parseInvoiceObject } from '@/lib/parse';
import { PACKAGE_ID, STATUS_LABELS, STATUS_COLORS } from '@/lib/constants';
import { useMurkIdentity } from '@/hooks/useMurkIdentity';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import IdentityModal from '@/components/IdentityModal';
import { MetricCard } from '@/components/ui/MetricCard';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '@/components/ui/Table';

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import SwapPanel from '@/components/DeFi/SwapPanel';
import LiquidityPanel from '@/components/DeFi/LiquidityPanel';
import StakingPanel from '@/components/DeFi/StakingPanel';

const PORTFOLIO_DATA = [
  { name: 'SUI', value: 2286.20, color: '#3B82F6' },
  { name: 'USDC', value: 4500.00, color: '#10B981' },
  { name: 'ETH', value: 5002.50, color: '#8B5CF6' },
  { name: 'MURK', value: 6250.00, color: '#F59E0B' },
];

const PRICE_HISTORY = [
  { time: '09:00', price: 1.80 },
  { time: '10:00', price: 1.82 },
  { time: '11:00', price: 1.79 },
  { time: '12:00', price: 1.83 },
  { time: '13:00', price: 1.85 },
  { time: '14:00', price: 1.84 },
  { time: '15:00', price: 1.86 },
  { time: '16:00', price: 1.84 },
];

export default function Dashboard() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { registeredUsers, profile, logout } = useMurkIdentity();

  const activeAddress = profile?.address || account?.address;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const wavesCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = wavesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    let phase = 0;

    const drawWaves = () => {
      ctx.clearRect(0, 0, width, height);

      // Wave 1
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.04)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < width; x++) {
        const y = 
          height * 0.5 + 
          Math.sin(x * 0.002 + phase) * 80 + 
          Math.cos(x * 0.005 - phase) * 30;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Wave 2
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.03)';
      ctx.lineWidth = 1.2;
      for (let x = 0; x < width; x++) {
        const y = 
          height * 0.52 + 
          Math.cos(x * 0.0015 - phase * 0.8) * 110 + 
          Math.sin(x * 0.004 + phase) * 40;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += 0.004;
      animationId = requestAnimationFrame(drawWaves);
    };

    drawWaves();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Invoice ledger states
  const [searchId, setSearchId] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [adminCaps, setAdminCaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Network Switcher state
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('Sui Mainnet');

  // Timeframe selector for price chart
  const [timeframe, setTimeframe] = useState('1D');

  const fetchDashboardData = async () => {
    if (!activeAddress) return;
    setLoading(true);

    try {
      let loadedCaps: any[] = [];
      let loadedReceipts: any[] = [];

      // Only attempt fetching on-chain objects if it's a real Sui address (not mock 0x09)
      if (activeAddress && !activeAddress.startsWith('0x09')) {
        try {
          const capObjects = await suiClient.getOwnedObjects({
            owner: activeAddress,
            filter: { StructType: `${PACKAGE_ID}::invoice::InvoiceAdminCap` },
            options: { showContent: true }
          });

          loadedCaps = capObjects.data.map(obj => {
            const fields = (obj.data?.content as any)?.fields;
            return {
              id: obj.data?.objectId,
              invoiceId: fields?.invoice_id
            };
          }).filter(c => !!c.invoiceId);

          setAdminCaps(loadedCaps);

          const receiptObjects = await suiClient.getOwnedObjects({
            owner: activeAddress,
            filter: { StructType: `${PACKAGE_ID}::invoice::SettlementReceipt` },
            options: { showContent: true }
          });

          loadedReceipts = receiptObjects.data.map(obj => {
            const fields = (obj.data?.content as any)?.fields;
            return {
              id: obj.data?.objectId,
              invoiceId: fields?.invoice_id,
              payee: fields?.payee,
              payer: fields?.payer,
              settledAtMs: Number(fields?.settled_at_ms || 0),
              description: fields?.description
            };
          });

          setReceipts(loadedReceipts);
        } catch (rpcErr) {
          console.warn('Sui RPC fetch failed, using local fallback:', rpcErr);
        }
      }

      const localCreated = JSON.parse(localStorage.getItem('murk_created_invoices') || '[]');
      const localReceived = JSON.parse(localStorage.getItem('murk_received_invoices') || '[]');
      const capInvoices = loadedCaps.map(c => c.invoiceId);
      const receiptInvoices = loadedReceipts.map(r => r.invoiceId);
      const simulatedInvoices = JSON.parse(localStorage.getItem('murk_all_invoices') || '[]');
      const matchingSimulated = simulatedInvoices
         .filter((inv: any) => inv.payer.toLowerCase() === activeAddress.toLowerCase() || inv.payee.toLowerCase() === activeAddress.toLowerCase())
         .map((inv: any) => inv.id);

      const uniqueIds = Array.from(new Set([
        ...localCreated, 
        ...localReceived, 
        ...capInvoices, 
        ...receiptInvoices,
        ...matchingSimulated
      ]));

      // Only multi-get on-chain objects if we have real unique IDs and a real network wallet connection
      if (uniqueIds.length > 0 && !activeAddress.startsWith('0x09')) {
        try {
          const invoiceDetails = await suiClient.multiGetObjects({
            ids: uniqueIds,
            options: { showContent: true }
          });

          const parsed = invoiceDetails
            .map(obj => parseInvoiceObject(obj))
            .filter(inv => inv !== null);

          // Merge with any simulated local invoices
          const allMerged = [...parsed];
          simulatedInvoices.forEach((sim: any) => {
            if (uniqueIds.includes(sim.id) && !allMerged.some(m => m.id === sim.id)) {
              allMerged.push(sim);
            }
          });

          setInvoices(allMerged);
        } catch (rpcErr) {
          // Fallback to purely simulated local invoices
          const matchingSims = simulatedInvoices.filter((inv: any) => uniqueIds.includes(inv.id));
          setInvoices(matchingSims);
        }
      } else if (uniqueIds.length > 0) {
        // Mock profile loading simulated invoices
        const matchingSims = simulatedInvoices.filter((inv: any) => uniqueIds.includes(inv.id));
        setInvoices(matchingSims);
      } else {
        setInvoices([]);
      }

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeAddress, suiClient]);

  const handleSearchInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId || searchId.length !== 66) {
      setSearchError('Invalid Sui Object ID.');
      return;
    }

    setSearchError(null);
    try {
      const obj = await suiClient.getObject({
        id: searchId,
        options: { showContent: true }
      });

      const parsed = parseInvoiceObject(obj);
      if (parsed) {
        const received = JSON.parse(localStorage.getItem('murk_received_invoices') || '[]');
        if (!received.includes(searchId)) {
          received.push(searchId);
          localStorage.setItem('murk_received_invoices', JSON.stringify(received));
        }
        setSearchId('');
        fetchDashboardData();
      } else {
        setSearchError('Object is not a valid Murk Invoice.');
      }
    } catch (err) {
      console.error('Failed to search invoice:', err);
      setSearchError('Invoice not found.');
    }
  };

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const removeInvoiceFromCache = (id: string) => {
    const received = JSON.parse(localStorage.getItem('murk_received_invoices') || '[]');
    const filteredReceived = received.filter((i: string) => i !== id);
    localStorage.setItem('murk_received_invoices', JSON.stringify(filteredReceived));

    const created = JSON.parse(localStorage.getItem('murk_created_invoices') || '[]');
    const filteredCreated = created.filter((i: string) => i !== id);
    localStorage.setItem('murk_created_invoices', JSON.stringify(filteredCreated));

    fetchDashboardData();
  };

  const sentInvoices = invoices.filter(inv => inv.payee.toLowerCase() === activeAddress?.toLowerCase());
  const receivedInvoices = invoices.filter(inv => inv.payer.toLowerCase() === activeAddress?.toLowerCase());

  const pendingCount = invoices.filter(inv => inv.status === 0).length;
  const settledCount = invoices.filter(inv => inv.status === 1).length;

  const getAvatarUrl = (seed?: string) => {
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed || 'murk'}&backgroundColor=0f172a`;
  };

  if (!activeAddress) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center z-10 bg-[#0A0B0D] relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -left-1/4 -top-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-1/4 -bottom-1/4 w-1/2 h-1/2 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="glass-panel p-8 max-w-md w-full space-y-6 relative z-10 border border-white/10 rounded-3xl">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
              <Shield className="h-6 w-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white uppercase tracking-wider font-mono">Authentication Required</h2>
            <p className="text-text-secondary text-xs max-w-xs leading-relaxed">
              Connect a native Sui wallet or authenticate via your local cryptographic onboarding identity to open the dashboard.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-center">
              <ConnectButton className="!rounded-xl !bg-primary !text-white !font-bold !text-xs !px-5 !py-3.5 !h-auto !shadow-none !cursor-pointer hover:!bg-primary/90 transition-colors w-full" />
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 font-mono"
            >
              <Key className="h-4 w-4 text-secondary" />
              Use Social/Onboard Profile
            </button>
          </div>
        </div>

        <IdentityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    );
  }

  // Render Left Navigation Wallet Section
  return (
    <div className="min-h-screen bg-transparent text-[#F8F9FA] flex relative overflow-hidden">
      {/* Background waves canvas */}
      <canvas ref={wavesCanvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Luxury 1px Grid Lines */}
      <div className="absolute inset-0 pointer-events-none z-0 flex justify-between px-8 sm:px-16 lg:px-24">
        <div className="grid-line w-[1px] bg-white/3 border-l border-white/3" />
        <div className="grid-line w-[1px] bg-white/3 border-l border-white/3 hidden sm:block" />
        <div className="grid-line w-[1px] bg-white/3 border-l border-white/3 hidden lg:block" />
        <div className="grid-line w-[1px] bg-white/3 border-l border-white/3" />
      </div>

      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <TopBar pageTitle={activeTab === 'dashboard' ? 'Overview' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} />

      {/* Main Container */}
      <main className="flex-1 min-w-0 sm:pl-[280px] pt-[72px] flex flex-col min-h-screen relative z-10">

        {/* Content Body */}
        <div className="p-6 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* Tab: Dashboard Overview */}
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Welcome Hero */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                  <div>
                    <h1 className="text-h2 text-white uppercase">Good morning, {profile?.name || 'Commander'}</h1>
                    <p className="text-body-large text-text-secondary mt-1">Your network and assets are secure.</p>
                  </div>
                  <Link href="/app/create">
                    <Button variant="primary">Create Invoice</Button>
                  </Link>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard 
                    label="Total Balance" 
                    value="$18,038.70" 
                    trend="positive" 
                    trendValue="+5.84%" 
                    sparklineData={[2, 4, 3, 6, 5, 8, 9]} 
                  />
                  <MetricCard 
                    label="Weekly Yield" 
                    value="+1.24%" 
                    trend="positive" 
                    trendValue="+0.12%" 
                    sparklineData={[1, 1, 2, 3, 5, 4, 6]} 
                  />
                  <MetricCard 
                    label="Active Invoices" 
                    value={invoices.length.toString()} 
                  />
                  <MetricCard 
                    label="Network Status" 
                    value="Optimal" 
                    trend="neutral" 
                    trendValue="99.9% Uptime" 
                  />
                </div>

                {/* Two Column Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left (8 cols): Recent Activity Table */}
                  <div className="lg:col-span-8">
                    <GlassCard className="p-0 overflow-hidden h-full">
                      <div className="p-6 border-b border-white/5">
                        <h3 className="text-h4 text-white">Recent Activity</h3>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableHead>Position</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead className="text-right">Yield</TableHead>
                        </TableHeader>
                        <TableBody>
                          {[
                            { name: 'SUI Validator Pool', type: 'Staking', balance: '500.00 SUI', yield: '1.24 SUI', tab: 'stake' },
                            { name: 'MURK Governance', type: 'Gov Staking', balance: '12,500.00 MURK', yield: '184.20 MURK', tab: 'stake' },
                            { name: 'SUI / USDC Pool', type: 'Liquidity', balance: '0.12% Share', yield: '$42.50 USDC', tab: 'liquidity' },
                          ].map((pos) => (
                            <TableRow key={pos.name}>
                              <TableCell className="font-bold">{pos.name}</TableCell>
                              <TableCell className="text-text-secondary">{pos.type}</TableCell>
                              <TableCell>{pos.balance}</TableCell>
                              <TableCell className="text-right text-emerald-400 font-bold">{pos.yield}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </GlassCard>
                  </div>

                  {/* Right (4 cols): Portfolio Breakdown */}
                  <div className="lg:col-span-4">
                    <GlassCard className="p-6 h-full flex flex-col">
                      <h3 className="text-h4 text-white mb-6">Portfolio Breakdown</h3>
                      <div className="relative h-48 w-full flex items-center justify-center mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={PORTFOLIO_DATA}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {PORTFOLIO_DATA.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-label text-text-secondary uppercase">Total</span>
                          <span className="text-data-large font-bold text-white">$18.0k</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3 mt-auto">
                        {PORTFOLIO_DATA.map((item) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                              <span className="font-bold text-white text-body-small">{item.name}</span>
                            </div>
                            <span className="font-mono text-text-secondary text-body-small">${item.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab: Swap */}
            {activeTab === 'swap' && (
              <motion.div 
                key="swap"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <SwapPanel />
              </motion.div>
            )}

            {/* Tab: Liquidity */}
            {activeTab === 'liquidity' && (
              <motion.div 
                key="liquidity"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <LiquidityPanel />
              </motion.div>
            )}

            {/* Tab: Stake */}
            {activeTab === 'stake' && (
              <motion.div 
                key="stake"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <StakingPanel />
              </motion.div>
            )}

            {/* Tab: Lend/Borrow (Hosts ZK Invoice Ledger) */}
            {activeTab === 'lend' && (
              <motion.div 
                key="lend"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Title & Quick Search */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white font-heading">Private Invoicing Credit</h2>
                    <p className="text-xs text-text-secondary">Draft & settle confidential invoice agreements encrypted via ZKP.</p>
                  </div>

                  <form onSubmit={handleSearchInvoice} className="flex gap-2 max-w-md w-full">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-text-tertiary" />
                      <input
                        type="text"
                        placeholder="Import invoice by object ID..."
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="w-full bg-[#111214] border border-white/5 rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder:text-text-tertiary focus:outline-none focus:border-primary/50 transition-colors font-mono"
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                      className="py-2 px-5 text-xs font-bold"
                    >
                      Import
                    </Button>
                  </form>
                </div>

                {searchError && (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{searchError}</span>
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <GlassCard className="p-4 flex flex-col justify-between">
                    <span className="text-[10px] text-text-secondary uppercase font-mono font-bold">Total Invoices</span>
                    <span className="text-2xl font-mono font-bold text-white mt-2">{invoices.length}</span>
                  </GlassCard>
                  <GlassCard className="p-4 flex flex-col justify-between">
                    <span className="text-[10px] text-text-secondary uppercase font-mono font-bold">Unsettled</span>
                    <span className="text-2xl font-mono font-bold text-amber-400 mt-2">{pendingCount}</span>
                  </GlassCard>
                  <GlassCard className="p-4 flex flex-col justify-between">
                    <span className="text-[10px] text-text-secondary uppercase font-mono font-bold">Settled</span>
                    <span className="text-2xl font-mono font-bold text-emerald-400 mt-2">{settledCount}</span>
                  </GlassCard>
                  <GlassCard className="p-4 flex flex-col justify-between">
                    <span className="text-[10px] text-text-secondary uppercase font-mono font-bold">Auditable Receipts</span>
                    <span className="text-2xl font-mono font-bold text-purple-400 mt-2">{receipts.length}</span>
                  </GlassCard>
                </div>

                {/* Invoice grids */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sent Receivables */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <h3 className="text-xs font-bold flex items-center gap-2 text-white uppercase tracking-wider">
                        <ArrowUpRight className="h-4 w-4 text-primary" /> Receivables
                      </h3>
                      <Link href="/create">
                        <Button variant="secondary" className="py-1 px-3 text-[10px] font-bold">
                          <PlusCircle className="h-3.5 w-3.5 mr-1" /> Draft Invoice
                        </Button>
                      </Link>
                    </div>

                    <div className="space-y-4">
                      {sentInvoices.length === 0 ? (
                        <GlassCard className="p-8 text-center text-xs text-text-secondary font-mono border-dashed">
                          No receivables drafted. Click above to create one.
                        </GlassCard>
                      ) : (
                        sentInvoices.map((inv) => (
                          <InvoiceCard
                            key={inv.id}
                            invoice={inv}
                            registeredUsers={registeredUsers}
                            onCopy={handleCopy}
                            copied={copiedId === inv.id}
                            onDelete={removeInvoiceFromCache}
                          />
                        ))
                      )}
                    </div>
                  </div>

                  {/* Received Payables */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <h3 className="text-xs font-bold flex items-center gap-2 text-white uppercase tracking-wider">
                        <ArrowDownLeft className="h-4 w-4 text-secondary" /> Payables
                      </h3>
                      <span className="text-[10px] text-text-tertiary">Settle via ZK proofs</span>
                    </div>

                    <div className="space-y-4">
                      {receivedInvoices.length === 0 ? (
                        <GlassCard className="p-8 text-center text-xs text-text-secondary font-mono border-dashed">
                          No payables found. Share keys or import by ID.
                        </GlassCard>
                      ) : (
                        receivedInvoices.map((inv) => (
                          <InvoiceCard
                            key={inv.id}
                            invoice={inv}
                            registeredUsers={registeredUsers}
                            onCopy={handleCopy}
                            copied={copiedId === inv.id}
                            onDelete={removeInvoiceFromCache}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab: Analytics */}
            {activeTab === 'analytics' && (
              <motion.div 
                key="analytics"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                <GlassCard className="p-8">
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold text-white font-heading">ZK Settlement Analytics</h2>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 text-left font-mono">
                    <div>
                      <span className="text-[10px] text-text-secondary uppercase">Drafted Value</span>
                      <span className="text-xl font-bold text-white block mt-1">$45,000.00</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-secondary uppercase">Settled Value</span>
                      <span className="text-xl font-bold text-emerald-400 block mt-1">$12,250.00</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-secondary uppercase">Active Clients</span>
                      <span className="text-xl font-bold text-white block mt-1">12</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-secondary uppercase">Settlement Rate</span>
                      <span className="text-xl font-bold text-primary block mt-1">94.8%</span>
                    </div>
                  </div>

                  <div className="h-80 w-full bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center justify-center text-xs text-text-tertiary">
                    Interactive chart metrics loaded successfully.
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* Tab: Rewards */}
            {activeTab === 'rewards' && (
              <motion.div 
                key="rewards"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-2xl mx-auto space-y-6"
              >
                <GlassCard className="p-8 text-center space-y-6">
                  <div className="h-16 w-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto">
                    <Gift className="h-8 w-8 text-primary" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white font-heading">Loyalty Rewards & Incentives</h2>
                    <p className="text-xs text-text-secondary max-w-md mx-auto">
                      Earn gas refunds, staking multipliers, and commission rebates for active trading and settlement validation on Murk.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-left font-mono">
                    <div className="p-4 bg-black/30 border border-white/5 rounded-2xl">
                      <span className="text-[10px] text-text-secondary uppercase block mb-1">Your MURK Points</span>
                      <span className="text-xl font-bold text-white">4,250</span>
                    </div>
                    <div className="p-4 bg-black/30 border border-white/5 rounded-2xl">
                      <span className="text-[10px] text-text-secondary uppercase block mb-1">Active Multiplier</span>
                      <span className="text-xl font-bold text-emerald-400">1.25x</span>
                    </div>
                  </div>

                  <Button variant="primary" className="py-3.5 px-8 text-xs font-bold uppercase tracking-wider">
                    Claim Gas Rebate (SUI)
                  </Button>
                </GlassCard>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
        <IdentityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </main>
    </div>
  );
}

function InvoiceCard({ 
  invoice, 
  registeredUsers,
  onCopy, 
  copied, 
  onDelete 
}: { 
  invoice: any; 
  registeredUsers: any[];
  onCopy: (id: string) => void; 
  copied: boolean; 
  onDelete: (id: string) => void;
}) {
  const statusLabel = STATUS_LABELS[invoice.status as keyof typeof STATUS_LABELS] || 'Unknown';
  
  const payeeUser = registeredUsers.find(u => u.address.toLowerCase() === invoice.payee.toLowerCase());
  const payerUser = registeredUsers.find(u => u.address.toLowerCase() === invoice.payer.toLowerCase());

  const cachedAmount = localStorage.getItem(`murk_amount_${invoice.id}`);
  const displayAmount = cachedAmount ? (Number(cachedAmount) / 1000000).toFixed(2) : null;

  return (
    <GlassCard className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 text-left flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              invoice.status === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
              invoice.status === 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
              'bg-white/10 text-text-secondary'
            }`}>
              {statusLabel}
            </span>
            <span className="text-[10px] text-text-secondary font-mono truncate max-w-[100px]">
              {invoice.referenceId}
            </span>
          </div>

          <h4 className="text-base font-bold text-white line-clamp-1 group-hover:text-primary transition-colors">{invoice.description}</h4>
          
          <div className="text-[11px] text-text-secondary font-mono space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-10">Payee:</span>
              <span className="text-white">
                {payeeUser ? `@${payeeUser.username}` : `${invoice.payee.slice(0, 8)}...${invoice.payee.slice(-6)}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-10">Payer:</span>
              <span className="text-white">
                {payerUser ? `@${payerUser.username}` : `${invoice.payer.slice(0, 8)}...${invoice.payer.slice(-6)}`}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right flex flex-col items-end shrink-0">
          {displayAmount ? (
            <div className="text-xl font-data font-bold text-white">
              {displayAmount} <span className="text-xs text-primary font-sans font-bold">USDC</span>
            </div>
          ) : (
            <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-text-secondary flex items-center gap-1.5 font-mono uppercase">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Hidden
            </div>
          )}
          
          <span className="text-[10px] text-text-secondary mt-2 font-mono">
            Exp: {new Date(invoice.deadlineMs).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
        <button
          onClick={() => onCopy(invoice.id)}
          className="p-2 hover:bg-white/5 rounded-xl text-text-secondary hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono cursor-pointer"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400 animate-in zoom-in-50" /> : <Clipboard className="h-3.5 w-3.5" />}
          {invoice.id.slice(0, 6)}...{invoice.id.slice(-4)}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onDelete(invoice.id)}
            className="p-2 hover:bg-rose-500/10 rounded-xl text-text-secondary hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <Link href={`/invoice/${invoice.id}`}>
            <Button variant="secondary" className="py-1.5 px-4 text-xs h-auto">
              Manage
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </GlassCard>
  );
}
