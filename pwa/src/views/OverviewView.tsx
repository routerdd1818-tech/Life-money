import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Plus,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { buildUnifiedCalendarEvents } from '../services/financeEngine';
import { MainTabId } from '../types';

interface OverviewViewProps {
  onNavigateTab: (tab: MainTabId) => void;
  onOpenQuickEntry: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigateTab,
  onOpenQuickEntry,
}) => {
  const {
    netWorthSummary,
    passiveIncomeSummary,
    shortfallAlerts,
    transactions,
    creditCards,
    installments,
    debtRecords,
    recurringItems,
    vehicles,
    insurancePolicies,
    medicalRecords,
    manualCalendarEvents,
    securityHoldings,
    isQuoteSyncing,
    refreshQuotes,
    exchangeRateUsdTwd,
  } = useVault();

  // 計算全投資組合未實現總損益
  const totalUnrealizedPnl = securityHoldings.reduce((s, h) => s + h.unrealizedPnlTwd, 0);

  // 篩選未來 14 天內的重要行事曆提醒
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const future14 = new Date();
  future14.setDate(now.getDate() + 14);
  const future14Str = future14.toISOString().slice(0, 10);

  const upcomingEvents = buildUnifiedCalendarEvents({
    targetYear: now.getFullYear(),
    targetMonth1Based: now.getMonth() + 1,
    manualEvents: manualCalendarEvents,
    cards: creditCards,
    installments,
    debts: debtRecords,
    recurringItems,
    vehicles,
    policies: insurancePolicies,
    medicalRecords,
  })
    .filter((ev) => ev.date >= todayStr && ev.date <= future14Str)
    .slice(0, 6);

  // 檢查汽車耗材是否有里程低於 1000 km 的預警
  const vehicleWarnings: Array<{ vehicleName: string; itemName: string; remainingKm: number }> = [];
  for (const v of vehicles) {
    for (const c of v.consumables) {
      if (c.intervalKm) {
        const nextKm = c.lastReplacedMileage + c.intervalKm;
        const remainingKm = nextKm - v.currentMileage;
        if (remainingKm <= 1000) {
          vehicleWarnings.push({
            vehicleName: v.name,
            itemName: c.itemName,
            remainingKm,
          });
        }
      }
    }
  }

  return (
    <div className="space-y-4 pb-24">
      {/* 1. Hero 淨資產總額大字卡 */}
      <section className="toss-card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#4E5968] dark:text-[#9BA4B0]">
            個人淨資產總額 (Net Worth)
          </span>
          <button
            type="button"
            disabled={isQuoteSyncing}
            onClick={() => void refreshQuotes()}
            className="px-2.5 py-1 rounded-lg bg-[#F0F2F6] dark:bg-[#1F2631] hover:bg-[#E2E8F0] dark:hover:bg-[#2D3748] text-[11px] font-semibold text-[#4E5968] dark:text-[#9BA4B0] flex items-center gap-1.5 transition-colors tabular-nums"
          >
            <RefreshCw className={`w-3 h-3 ${isQuoteSyncing ? 'animate-spin text-[#2563EB]' : ''}`} />
            <span>{isQuoteSyncing ? '報價更新中' : `USD ${exchangeRateUsdTwd.toFixed(2)}`}</span>
          </button>
        </div>

        <div className="flex items-baseline justify-between gap-2 mb-4">
          <div className="tabular-nums">
            <span className="text-sm font-semibold text-[#8B95A1] mr-1.5">NT$</span>
            <span className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[#191F28] dark:text-[#F2F4F8]">
              {netWorthSummary.netWorth.toLocaleString()}
            </span>
          </div>
          <div
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg tabular-nums ${
              totalUnrealizedPnl >= 0
                ? 'bg-red-50 dark:bg-red-950/40 text-[#F04452]'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-[#059669]'
            }`}
          >
            {totalUnrealizedPnl >= 0 ? '▲' : '▼'} 投資損益{' '}
            {totalUnrealizedPnl >= 0 ? '+' : ''}
            {totalUnrealizedPnl.toLocaleString()}
          </div>
        </div>

        {/* 資產 vs 負債四格快覽 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3.5 border-t border-[#EAEDF2] dark:border-[#262C36]">
          <button
            type="button"
            onClick={() => onNavigateTab('portfolio')}
            className="text-left p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] hover:border-[#2563EB] border border-transparent transition-colors"
          >
            <div className="text-[11px] text-[#8B95A1] mb-0.5">銀行與現金</div>
            <div className="text-sm font-bold tabular-nums text-[#191F28] dark:text-[#F2F4F8]">
              ${netWorthSummary.cashAndBankTotal.toLocaleString()}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('portfolio')}
            className="text-left p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] hover:border-[#2563EB] border border-transparent transition-colors"
          >
            <div className="text-[11px] text-[#8B95A1] mb-0.5">股/債/基金現值</div>
            <div className="text-sm font-bold tabular-nums text-[#2563EB] dark:text-[#3B82F6]">
              ${netWorthSummary.investmentTotal.toLocaleString()}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('ledger')}
            className="text-left p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] hover:border-[#2563EB] border border-transparent transition-colors"
          >
            <div className="text-[11px] text-[#8B95A1] mb-0.5">信用卡待繳總計</div>
            <div className="text-sm font-bold tabular-nums text-[#F04452]">
              -${netWorthSummary.creditCardLiabilityTotal.toLocaleString()}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('ledger')}
            className="text-left p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] hover:border-[#2563EB] border border-transparent transition-colors"
          >
            <div className="text-[11px] text-[#8B95A1] mb-0.5">分期與貸款餘額</div>
            <div className="text-sm font-bold tabular-nums text-[#4E5968] dark:text-[#9BA4B0]">
              -$
              {(
                netWorthSummary.debtLiabilityTotal + netWorthSummary.installmentRemainingTotal
              ).toLocaleString()}
            </div>
          </button>
        </div>
      </section>

      {/* 2. 擴充功能 #4：智慧現金流水位預警 (7日內自動扣款 > 帳戶餘額時觸發) */}
      {shortfallAlerts.length > 0 && (
        <section className="toss-card p-4 border-l-4 border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>智慧現金流水位預警 (未來 7 日扣款餘額不足)</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('portfolio')}
              className="text-[11px] font-semibold text-[#2563EB] flex items-center gap-0.5"
            >
              <span>立即調撥</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {shortfallAlerts.map((alert) => (
              <div
                key={alert.accountId}
                className="p-3 rounded-xl bg-white dark:bg-[#161B22] border border-amber-200/70 dark:border-amber-900/50 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>
                    {alert.accountEmoji} {alert.accountName}
                  </span>
                  <span className="text-[#F04452] tabular-nums">
                    缺口 NT$ {alert.shortfallAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#4E5968] dark:text-[#9BA4B0] tabular-nums">
                  <span>目前餘額：${alert.currentBalance.toLocaleString()}</span>
                  <span>7 日內應扣總計：${alert.requiredAmount7Days.toLocaleString()}</span>
                </div>
                <div className="pt-1 border-t border-[#EAEDF2] dark:border-[#262C36] space-y-1">
                  {alert.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-[11px] text-[#8B95A1] tabular-nums"
                    >
                      <span>
                        {item.emoji} {item.date.slice(5)} ({item.daysUntil === 0 ? '今日' : `${item.daysUntil}天後`}) ·{' '}
                        {item.title}
                      </span>
                      <span className="font-semibold text-[#191F28] dark:text-[#F2F4F8]">
                        ${item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. 擴充功能 #3：股息 / 債息被動收入與固定剛性支出覆蓋率 */}
      <section className="toss-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#2563EB]" />
            <span className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
              股息與債息被動收入覆蓋率
            </span>
          </div>
          <span className="text-xs font-bold text-[#2563EB] tabular-nums">
            {passiveIncomeSummary.coverageRatioPct}% 已覆蓋
          </span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-[#F0F2F6] dark:bg-[#1F2631] overflow-hidden mb-2.5">
          <div
            className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
            style={{ width: `${Math.min(100, passiveIncomeSummary.coverageRatioPct)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-[#4E5968] dark:text-[#9BA4B0] tabular-nums">
          <span>
            月均被動配息：
            <strong className="text-[#191F28] dark:text-white ml-1">
              NT$ {passiveIncomeSummary.monthlyAveragePassiveIncomeTwd.toLocaleString()}
            </strong>
          </span>
          <span>
            每月固定+分期支出：
            <strong className="text-[#191F28] dark:text-white ml-1">
              NT$ {passiveIncomeSummary.monthlyFixedExpenseTwd.toLocaleString()}
            </strong>
          </span>
        </div>
      </section>

      {/* 4. 汽車保養耗材里程預警 */}
      {vehicleWarnings.length > 0 && (
        <section className="toss-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>愛車保養耗材里程提醒</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('life')}
              className="text-[11px] font-semibold text-[#2563EB]"
            >
              前往汽車保養 →
            </button>
          </div>
          <div className="space-y-1.5">
            {vehicleWarnings.map((w, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] text-xs"
              >
                <span className="font-medium">
                  🚗 {w.vehicleName} · {w.itemName}
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {w.remainingKm <= 0
                    ? `已超過 ${Math.abs(w.remainingKm).toLocaleString()} km`
                    : `距更換剩 ${w.remainingKm.toLocaleString()} km`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. 未來 14 日跨領域重要事項 (行事曆整合預覽) */}
      <section className="toss-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
              近期重要日程 (卡費 / 回診 / 保單 / 保養)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('calendar')}
            className="text-xs font-semibold text-[#2563EB]"
          >
            完整月曆 →
          </button>
        </div>

        <div className="space-y-2">
          {upcomingEvents.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base shrink-0">{ev.emoji}</span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#191F28] dark:text-[#F2F4F8] truncate">
                    {ev.title}
                  </div>
                  <div className="text-[11px] text-[#8B95A1] tabular-nums truncate">
                    {ev.date} {ev.time ? `· ${ev.time}` : ''} {ev.notes ? `· ${ev.notes}` : ''}
                  </div>
                </div>
              </div>
              {typeof ev.amount === 'number' && ev.amount > 0 && (
                <div className="text-xs font-bold tabular-nums text-[#191F28] dark:text-[#F2F4F8] shrink-0 ml-2">
                  NT$ {ev.amount.toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 6. 最新收支動態 */}
      <section className="toss-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">最新記帳流水</h3>
          </div>
          <button
            type="button"
            onClick={onOpenQuickEntry}
            className="px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>記一筆</span>
          </button>
        </div>

        <div className="divide-y divide-[#EAEDF2] dark:divide-[#262C36]">
          {transactions.slice(0, 5).map((tx) => (
            <div key={tx.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] flex items-center justify-center text-sm shrink-0">
                  {tx.categoryEmoji}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#191F28] dark:text-[#F2F4F8] truncate">
                    {tx.categoryName}{' '}
                    {tx.notes ? (
                      <span className="font-normal text-[#4E5968] dark:text-[#9BA4B0]">
                        · {tx.notes}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-[#8B95A1] tabular-nums">
                    {tx.date} · {tx.paymentSourceName}
                  </div>
                </div>
              </div>
              <div
                className={`text-sm font-bold tabular-nums shrink-0 ml-2 ${
                  tx.type === 'income'
                    ? 'text-[#059669]'
                    : tx.type === 'transfer'
                      ? 'text-[#4E5968] dark:text-[#9BA4B0]'
                      : 'text-[#191F28] dark:text-[#F2F4F8]'
                }`}
              >
                {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                NT$ {tx.amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
