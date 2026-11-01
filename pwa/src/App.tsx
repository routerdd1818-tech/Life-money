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
import { AuthGateView } from './views/AuthGateView';

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
  const { settings, shortfallAlerts, currentUser, isHydrated } = useVault();
  const [activeTab, setActiveTab] = useState<MainTabId>('overview');
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 1. 若尚未完成 Local-First 狀態初始化，顯示高質感過渡載入
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0E1116] flex flex-col justify-center items-center gap-3">
        <BrandLogo className="w-12 h-12 rounded-2xl shadow-md animate-pulse" />
        <div className="w-5 h-5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 2. 強制登入守衛 (Mandatory Auth Gate)：若尚未登入，強制顯示全螢幕登入與註冊頁面
  if (!currentUser) {
    return <AuthGateView />;
  }

  const headerMeta = TAB_TITLES[activeTab];

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0E1116] text-[#191F28] dark:text-[#F2F4F8]">
      {/* 頂部導航列 */}
      <header className="sticky top-0 z-30 bg-[#F6F7F9]/90 dark:bg-[#0E1116]/90 backdrop-blur-md border-b border-[#EAEDF2] dark:border-[#262C36]">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          {/* 左側品牌與標題 (自適應截斷，避免推擠) */}
          <div className="flex items-center gap-2 min-w-0 shrink">
            <BrandLogo className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-2xs shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-[#191F28] dark:text-[#F2F4F8] leading-tight truncate">
                {activeTab === 'screener' ? '選股決策' : headerMeta.title}
              </h1>
              <p className="text-[11px] text-[#8B95A1] hidden sm:block truncate">
                {headerMeta.subtitle}
              </p>
            </div>
          </div>

          {/* 右側快捷動作 (嚴禁折行與擠壓) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setQuickEntryOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors whitespace-nowrap shrink-0"
              title="快速新增記帳交易"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">記帳</span>
            </button>

            {/* 使用者帳號與金庫切換快捷標籤 */}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="px-2 py-1.5 rounded-xl bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] text-[#4E5968] dark:text-[#9BA4B0] hover:text-[#191F28] dark:hover:text-white flex items-center gap-1 text-xs transition-colors shrink-0"
              title="使用者帳號與金庫設定"
            >
              <User className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span className="max-w-[55px] sm:max-w-[90px] truncate font-medium text-[11px]">
                {currentUser?.displayName || currentUser?.username || '金庫'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] text-[#4E5968] dark:text-[#9BA4B0] hover:text-[#191F28] dark:hover:text-white flex items-center justify-center shrink-0"
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
