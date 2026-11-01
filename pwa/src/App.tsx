import React, { useState } from 'react';
import { Cloud, Plus, Settings, User } from 'lucide-react';
import { VaultProvider, useVault } from './context/VaultContext';
import { MainTabId } from './types';
import { BottomNav } from './components/BottomNav';
import { BrandLogo } from './components/BrandLogo';
import { QuickEntrySheet } from './components/QuickEntrySheet';
import { SettingsModal } from './components/SettingsModal';
import { OverviewView } from './views/OverviewView';
import { LedgerView } from './views/LedgerView';
import { PortfolioView } from './views/PortfolioView';
import { StockScreenerView } from './views/StockScreenerView';
import { LifeVaultView } from './views/LifeVaultView';
import { CalendarView } from './views/CalendarView';

const TAB_TITLES: Record<MainTabId, { title: string; subtitle: string }> = {
  overview: { title: '總覽 Overview', subtitle: '全資產淨值、現金流預警與近期日程' },
  ledger: { title: '記帳與信用 Ledger', subtitle: '收支、信用卡額度、分期、借放款與固定收支' },
  portfolio: { title: '資產中心 Portfolio', subtitle: '股票/ETF/基金/債券自動計價與銀行現金' },
  screener: {
    title: '智能選股與板塊雷達 QuantLab',
    subtitle: 'FinLab 四面向五步漏斗選股、八大板塊資金輪動與關注清單',
  },
  life: { title: '生活管家 LifeVault', subtitle: '汽車保養耗材、保險保單與醫療回診紀錄' },
  calendar: { title: '整合行事曆 Calendar', subtitle: '帳務、卡費、保費、保養與回診全域時間軸' },
};

const MainAppShell: React.FC = () => {
  const { settings, shortfallAlerts, currentUser } = useVault();
  const [activeTab, setActiveTab] = useState<MainTabId>('overview');
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const headerMeta = TAB_TITLES[activeTab];

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0E1116] text-[#191F28] dark:text-[#F2F4F8]">
      {/* 頂部導航列 */}
      <header className="sticky top-0 z-30 bg-[#F6F7F9]/90 dark:bg-[#0E1116]/90 backdrop-blur-md border-b border-[#EAEDF2] dark:border-[#262C36]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo className="w-8 h-8 rounded-lg shadow-2xs" />
            <div>
              <h1 className="text-base font-bold tracking-tight text-[#191F28] dark:text-[#F2F4F8] leading-tight">
                {headerMeta.title}
              </h1>
              <p className="text-[11px] text-[#8B95A1] hidden sm:block">{headerMeta.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuickEntryOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>快速記帳</span>
            </button>

            {/* 使用者帳號與金庫切換快捷標籤 */}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] text-[#4E5968] dark:text-[#9BA4B0] hover:text-[#191F28] dark:hover:text-white flex items-center gap-1.5 text-xs transition-colors"
              title="使用者帳號與金庫設定"
            >
              <User className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="max-w-[70px] sm:max-w-[110px] truncate font-medium">
                {currentUser?.displayName || currentUser?.username || '金庫帳號'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-xl bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] text-[#4E5968] dark:text-[#9BA4B0] hover:text-[#191F28] dark:hover:text-white flex items-center gap-1 text-xs"
              title="雲端同步與系統設定"
            >
              {settings.lastSyncedAt ? (
                <Cloud className="w-4 h-4 text-[#059669]" />
              ) : (
                <Settings className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 主內容區 */}
      <main className="max-w-3xl mx-auto px-4 pt-4">
        {activeTab === 'overview' && (
          <OverviewView
            onNavigateTab={setActiveTab}
            onOpenQuickEntry={() => setQuickEntryOpen(true)}
          />
        )}
        {activeTab === 'ledger' && (
          <LedgerView onOpenQuickEntry={() => setQuickEntryOpen(true)} />
        )}
        {activeTab === 'portfolio' && <PortfolioView />}
        {activeTab === 'screener' && <StockScreenerView />}
        {activeTab === 'life' && <LifeVaultView />}
        {activeTab === 'calendar' && <CalendarView />}
      </main>

      {/* 底部六欄導航 */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        alertCount={shortfallAlerts.length}
      />

      {/* 快速記帳抽屜 & 設定對話框 */}
      <QuickEntrySheet isOpen={quickEntryOpen} onClose={() => setQuickEntryOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export function App() {
  return (
    <VaultProvider>
      <MainAppShell />
    </VaultProvider>
  );
}

export default App;
