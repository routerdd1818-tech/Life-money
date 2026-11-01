import React from 'react';
import {
  CalendarDays,
  Landmark,
  LayoutDashboard,
  LineChart,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react';
import { MainTabId } from '../types';

interface BottomNavProps {
  activeTab: MainTabId;
  onChangeTab: (tab: MainTabId) => void;
  alertCount?: number;
}

const NAV_ITEMS: Array<{
  id: MainTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: '總覽', icon: LayoutDashboard },
  { id: 'ledger', label: '記帳', icon: ReceiptText },
  { id: 'portfolio', label: '資產', icon: Landmark },
  { id: 'screener', label: '選股', icon: LineChart },
  { id: 'life', label: '管家', icon: ShieldCheck },
  { id: 'calendar', label: '行事曆', icon: CalendarDays },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab, alertCount = 0 }) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#161B22]/95 backdrop-blur-md border-t border-[#EAEDF2] dark:border-[#262C36] pb-safe">
      <div className="max-w-3xl mx-auto h-16 grid grid-cols-6 px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? 'text-[#2563EB] dark:text-[#3B82F6] font-semibold'
                  : 'text-[#8B95A1] dark:text-[#636E7B] hover:text-[#191F28] dark:hover:text-white font-medium'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.id === 'overview' && alertCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#F04452] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {alertCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
