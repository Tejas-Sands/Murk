import React from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, ArrowLeftRight, Droplets, TrendingUp, 
  Landmark, BarChart3, Gift, HelpCircle, Sun, Moon, 
  Settings, BookOpen
} from 'lucide-react';
import { MurkLogo } from './ui/MurkLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  walletSection?: React.ReactNode;
}

export default function Sidebar({ activeTab, setActiveTab, walletSection }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'swap', label: 'Swap', icon: ArrowLeftRight, comingSoon: true },
    { id: 'liquidity', label: 'Liquidity', icon: Droplets, comingSoon: true },
    { id: 'stake', label: 'Stake', icon: TrendingUp, comingSoon: true },
    { id: 'lend', label: 'Lend/Borrow', icon: Landmark, comingSoon: true },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, comingSoon: true },
    { id: 'rewards', label: 'Rewards', icon: Gift, comingSoon: true },
  ];

  return (
    <>
      {/* Desktop Sidebar (visible on sm and larger) */}
      <aside className="hidden sm:flex flex-col fixed inset-y-0 left-0 w-[280px] bg-[#111214] border-r border-white/5 z-30">
        {/* Brand Area */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-white/5 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <MurkLogo size={32} glow={true} />
          <span className="text-xl font-bold tracking-wider text-white font-heading">
            MURK
          </span>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => !item.comingSoon && setActiveTab(item.id)}
                disabled={item.comingSoon}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-brand/15 text-brand border-l-2 border-brand font-semibold text-label'
                    : item.comingSoon
                    ? 'text-text-tertiary cursor-not-allowed border-l-2 border-transparent text-label opacity-60'
                    : 'text-text-secondary hover:text-white hover:bg-white/5 border-l-2 border-transparent text-label cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
                {item.comingSoon && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary bg-white/5 px-2 py-0.5 rounded-full">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 flex flex-col gap-4 mt-auto">
          {/* Secondary Nav */}
          <div className="flex flex-col gap-1 px-2 border-t border-white/5 pt-4">
            <button className="flex items-center gap-2 text-text-tertiary hover:text-white transition-colors text-caption cursor-pointer py-1.5">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
            <button className="flex items-center gap-2 text-text-tertiary hover:text-white transition-colors text-caption cursor-pointer py-1.5">
              <BookOpen className="h-4 w-4" />
              <span>Documentation</span>
            </button>
            <button className="flex items-center gap-2 text-text-tertiary hover:text-white transition-colors text-caption cursor-pointer py-1.5">
              <HelpCircle className="h-4 w-4" />
              <span>Help & Support</span>
            </button>
          </div>

          {/* Theme Switcher & Wallet */}
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-1 bg-black/40 border border-white/5 rounded-lg p-0.5">
              <button className="p-1 text-text-tertiary hover:text-white transition-colors cursor-pointer" title="Light Mode">
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button className="p-1 text-brand bg-brand/15 rounded transition-colors cursor-pointer" title="Dark Mode">
                <Moon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation (visible on mobile only) */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-[#111214]/95 backdrop-blur-2xl border-t border-white/5 z-50 flex items-center justify-around h-16 px-2 pb-safe">
        {navItems.slice(0, 5).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all duration-200 cursor-pointer ${
                isActive ? 'text-brand' : 'text-text-secondary'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium tracking-tight">{item.label.split('/')[0]}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
