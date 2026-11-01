import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  DollarSign,
  Globe2,
  Layers,
  Percent,
  PiggyBank,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import {
  CURRENCY_META,
  findSecurityPreset,
  SECURITY_PRESETS,
} from '../services/quoteService';
import {
  analyzePortfolioEtfOverlap,
  ETF_PROFILES,
  simulateEtfDripGrowth,
} from '../services/etfEngine';
import { evaluatePortfolioReturnSummary } from '../services/returnEngine';
import {
  BankAccountType,
  DividendFrequency,
  InvestmentCategory,
  QuoteCurrency,
  SavingsGoal,
  SavingsGoalCategory,
  SupportedCurrency,
} from '../types';

type PortfolioSubTab =
  | 'holdings'
  | 'etf'
  | 'returns'
  | 'accounts'
  | 'rates'
  | 'savings'
  | 'dividends'
  | 'networth';

const PORTFOLIO_TABS = [
  { id: 'holdings', label: '股票/債券/基金' },
  { id: 'etf', label: '📊 ETF 專區' },
  { id: 'returns', label: '📈 報酬率分析' },
  { id: 'accounts', label: '💼 多幣別帳戶' },
  { id: 'rates', label: '💱 常用匯率換算' },
  { id: 'savings', label: '🎯 存錢計畫' },
  { id: 'dividends', label: '📅 股息月曆' },
  { id: 'networth', label: '📉 淨值結構' },
] as const;

export const PortfolioView: React.FC = () => {
  const {
    securityHoldings,
    upsertSecurityHolding,
    deleteSecurityHolding,
    assetAccounts,
    upsertAssetAccount,
    deleteAssetAccount,
    netWorthSummary,
    passiveIncomeSummary,
    netWorthSnapshots,
    exchangeRateUsdTwd,
    exchangeRates,
    savingsGoals,
    upsertSavingsGoal,
    deleteSavingsGoal,
    depositToSavingsGoal,
    isQuoteSyncing,
    refreshQuotes,
  } = useVault();

  const [subTab, setSubTab] = useState<PortfolioSubTab>('holdings');
  const [filterCat, setFilterCat] = useState<'all' | InvestmentCategory>('all');

  // 新增投資部位狀態
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InvestmentCategory>('stock');
  const [units, setUnits] = useState('1000');
  const [costBasis, setCostBasis] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currency, setCurrency] = useState<QuoteCurrency>('TWD');
  const [divFreq, setDivFreq] = useState<DividendFrequency>('quarterly');
  const [yieldPct, setYieldPct] = useState('3.5');

  // 新增銀行/現金帳戶狀態
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<BankAccountType>('bank');
  const [accCurrency, setAccCurrency] = useState<SupportedCurrency>('TWD');
  const [accBalance, setAccBalance] = useState('');
  const [accLastFour, setAccLastFour] = useState('');
  const [accEmoji, setAccEmoji] = useState('🏦');

  // 常用匯率計算機狀態
  const [fxAmount, setFxAmount] = useState('10000');
  const [fxFromCurrency, setFxFromCurrency] = useState<SupportedCurrency>('TWD');

  // ETF 專區狀態
  const [etfCategoryFilter, setEtfCategoryFilter] = useState<'all' | string>('all');
  const [expandedEtfSymbol, setExpandedEtfSymbol] = useState<string | null>('0050.TW');
  const [dripInitial, setDripInitial] = useState(300000);
  const [dripMonthly, setDripMonthly] = useState(15000);
  const [dripYield, setDripYield] = useState(6.0);
  const [dripYears, setDripYears] = useState(15);

  // 投資報酬率分期切換
  const [returnPeriodFilter, setReturnPeriodFilter] = useState<'quarter' | 'year'>('quarter');

  // 存錢計畫狀態
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalCat, setGoalCat] = useState<SavingsGoalCategory>('house_downpayment');
  const [goalTarget, setGoalTarget] = useState('1000000');
  const [goalCurrent, setGoalCurrent] = useState('200000');
  const [goalDate, setGoalDate] = useState('2027-12-31');
  const [goalMonthly, setGoalMonthly] = useState('25000');
  const [goalEmoji, setGoalEmoji] = useState('🏡');
  const [goalColor, setGoalColor] = useState('#2563EB');
  const [goalLinkedAcc, setGoalLinkedAcc] = useState(assetAccounts[0]?.id || '');
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('20000');
  const [depositSourceAcc, setDepositSourceAcc] = useState(assetAccounts[0]?.id || '');

  // 當使用者輸入股票/基金/債券代號時，自動比對內建熱門庫帶入名稱與預設參考價
  const handleSymbolChange = (val: string) => {
    setSymbol(val);
    const preset = findSecurityPreset(val);
    if (preset) {
      setName(preset.name);
      setCategory(preset.category);
      setCurrency(preset.currency);
      setCurrentPrice(String(preset.defaultPrice));
      if (!costBasis) setCostBasis(String(preset.defaultPrice));
      setDivFreq(preset.dividendFrequency);
      setYieldPct(String(preset.estimatedAnnualYieldPct));
    }
  };

  const filteredHoldings =
    filterCat === 'all'
      ? securityHoldings
      : securityHoldings.filter((h) => h.category === filterCat);

  const totalCostTwd = securityHoldings.reduce(
    (s, h) => s + Math.round(h.units * h.costBasisPerUnit * h.exchangeRateToTwd),
    0
  );
  const totalPnlTwd = netWorthSummary.investmentTotal - totalCostTwd;
  const totalReturnPct =
    totalCostTwd > 0 ? Math.round((totalPnlTwd / totalCostTwd) * 10000) / 100 : 0;

  // 計算投資報酬率總覽
  const investmentSummary = useMemo(
    () => evaluatePortfolioReturnSummary({ holdings: securityHoldings, exchangeRateUsdTwd }),
    [securityHoldings, exchangeRateUsdTwd]
  );

  // 計算 ETF 成分穿透與集中度
  const penetrationSummary = useMemo(
    () => analyzePortfolioEtfOverlap(securityHoldings, exchangeRateUsdTwd),
    [securityHoldings, exchangeRateUsdTwd]
  );

  // 計算 DRIP 複利滾利
  const dripResult = useMemo(
    () =>
      simulateEtfDripGrowth({
        initialInvestment: dripInitial,
        monthlyContribution: dripMonthly,
        annualPriceAppreciationPct: 3.0,
        annualDividendYieldPct: dripYield,
        years: dripYears,
      }),
    [dripInitial, dripMonthly, dripYield, dripYears]
  );

  // 匯率即時換算表推算
  const fxCalculated = useMemo(() => {
    const amountNum = Math.max(0, Number(fxAmount) || 0);
    // 先轉為 TWD 基準金額
    const fromRate = exchangeRates[fxFromCurrency] || 1;
    const baseTwd = amountNum * fromRate;

    const currencies: SupportedCurrency[] = ['TWD', 'USD', 'JPY', 'CNY', 'KRW', 'VND'];
    return currencies.map((cur) => {
      const targetRate = exchangeRates[cur] || 1;
      const converted = cur === 'TWD' ? baseTwd : baseTwd / targetRate;
      return {
        currency: cur,
        meta: CURRENCY_META[cur],
        amount: converted,
        rateToTwd: targetRate,
      };
    });
  }, [fxAmount, fxFromCurrency, exchangeRates]);

  return (
    <div className="space-y-4 pb-24">
      {/* 頂部橫向滾動子分頁切換 */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#EBEFE6]/50 dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] overflow-x-auto no-scrollbar">
        {PORTFOLIO_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 ${
              subTab === tab.id
                ? 'bg-white dark:bg-[#21262D] text-[#191F28] dark:text-[#F2F4F8] shadow-sm font-bold'
                : 'text-[#6B7684] dark:text-[#8B949E] hover:text-[#191F28] dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================== */}
      {/* 1. 股票 / ETF / 基金 / 債券 自動計價部位 */}
      {/* ============================================================== */}
      {subTab === 'holdings' && (
        <div className="space-y-4">
          <div className="toss-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[#8B95A1]">
                  證券投資總市值 (免費 API 自動計價 · 1 USD = {exchangeRateUsdTwd.toFixed(2)} TWD)
                </div>
                <div className="text-2xl font-bold tabular-nums text-[#191F28] dark:text-[#F2F4F8]">
                  NT$ {netWorthSummary.investmentTotal.toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isQuoteSyncing}
                  onClick={() => void refreshQuotes()}
                  className="px-3 py-2 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631] text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isQuoteSyncing ? 'animate-spin text-[#2563EB]' : ''}`} />
                  <span>重算現值</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddHolding(!showAddHolding)}
                  className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>新增標的</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2.5 border-t border-[#EAEDF2] dark:border-[#262C36] text-xs tabular-nums">
              <span className="text-[#4E5968] dark:text-[#9BA4B0]">
                投入總成本：NT$ {totalCostTwd.toLocaleString()}
              </span>
              <span
                className={`font-bold ${
                  totalPnlTwd >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                }`}
              >
                未實現損益：{totalPnlTwd >= 0 ? '▲ +' : '▼ '}
                NT$ {totalPnlTwd.toLocaleString()} ({totalReturnPct >= 0 ? '+' : ''}
                {totalReturnPct}%)
              </span>
            </div>
          </div>

          {showAddHolding && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!symbol || !name) return;
                upsertSecurityHolding({
                  id: `hold-${symbol.toLowerCase()}-${Date.now()}`,
                  symbol: symbol.toUpperCase(),
                  name,
                  category,
                  units: Number(units) || 0,
                  costBasisPerUnit: Number(costBasis) || 0,
                  currentPrice: Number(currentPrice) || Number(costBasis) || 0,
                  currency,
                  exchangeRateToTwd: currency === 'USD' ? exchangeRateUsdTwd : 1,
                  dividendFrequency: divFreq,
                  estimatedAnnualYieldPct: Number(yieldPct) || 0,
                  dividendMonths: [],
                  lastQuotedAt: new Date().toISOString(),
                  quoteSource: 'manual',
                });
                setSymbol('');
                setName('');
                setUnits('1000');
                setCostBasis('');
                setCurrentPrice('');
                setShowAddHolding(false);
              }}
              className="toss-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#191F28] dark:text-white">
                  新增持倉標的 (支援台股代號、美股、基金 ISIN)
                </span>
                <span className="text-[11px] text-[#2563EB] font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  輸入代號自動辨識
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] text-[#8B95A1] block mb-1">標的代號</label>
                  <input
                    type="text"
                    required
                    placeholder="例: 2330.TW, 0050, VOO"
                    value={symbol}
                    onChange={(e) => handleSymbolChange(e.target.value)}
                    className="toss-input uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1] block mb-1">標的名稱</label>
                  <input
                    type="text"
                    required
                    placeholder="例: 台積電, 元大台灣50"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="toss-input"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1] block mb-1">投資類別</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as InvestmentCategory)}
                    className="toss-input"
                  >
                    <option value="stock">股票 (Stock)</option>
                    <option value="etf">ETF 指數基金</option>
                    <option value="fund">共同基金 (NAV)</option>
                    <option value="bond">債券 / 債券ETF</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1] block mb-1">持有股數 / 單位數</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="股數 (例: 1000)"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1] block mb-1">買入均價 (原幣)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="平均成本"
                    value={costBasis}
                    onChange={(e) => setCostBasis(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1] block mb-1">當前現價 (原幣)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="收盤/即時價"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1] block mb-1">報價計價幣別</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as QuoteCurrency)}
                    className="toss-input"
                  >
                    <option value="TWD">TWD 新台幣</option>
                    <option value="USD">USD 美元</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1] block mb-1">配息頻率</label>
                  <select
                    value={divFreq}
                    onChange={(e) => setDivFreq(e.target.value as DividendFrequency)}
                    className="toss-input"
                  >
                    <option value="none">不配息 (累積型)</option>
                    <option value="monthly">月配息</option>
                    <option value="quarterly">季配息</option>
                    <option value="semi_annual">半年配</option>
                    <option value="annual">年配息</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1] block mb-1">預估年化殖利率 %</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="例: 4.5"
                    value={yieldPct}
                    onChange={(e) => setYieldPct(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHolding(false)}
                  className="w-1/3 py-2 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631] text-xs font-semibold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
                >
                  確認儲存標的
                </button>
              </div>
            </form>
          )}

          {/* 類別篩選 */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
            {(
              [
                { id: 'all', label: '全部部位' },
                { id: 'stock', label: '股票' },
                { id: 'etf', label: 'ETF' },
                { id: 'fund', label: '基金' },
                { id: 'bond', label: '債券' },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setFilterCat(btn.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterCat === btn.id
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-[#F0F2F6] dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0]'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* 持倉列表 */}
          <div className="space-y-3">
            {filteredHoldings.map((h) => {
              const costTwd = Math.round(h.units * h.costBasisPerUnit * h.exchangeRateToTwd);
              const pnl = h.unrealizedPnlTwd;
              const pnlPct = h.unrealizedReturnPct;
              const isProfit = pnl >= 0;

              return (
                <div key={h.id} className="toss-card p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-[#F0F2F6] dark:bg-[#1F2631] text-[#2563EB] uppercase">
                          {h.category}
                        </span>
                        <h4 className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          {h.name}
                        </h4>
                        <span className="text-xs text-[#8B95A1] tabular-nums uppercase">
                          ({h.symbol})
                        </span>
                      </div>
                      <div className="text-xs text-[#8B95A1] mt-1 tabular-nums">
                        持有 {h.units.toLocaleString()} 股 · 成本 {h.currency === 'USD' ? '$' : 'NT$'}{' '}
                        {h.costBasisPerUnit} · 現價 {h.currency === 'USD' ? '$' : 'NT$'}{' '}
                        {h.currentPrice}
                      </div>
                    </div>

                    <div className="text-right tabular-nums">
                      <div className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8]">
                        NT$ {h.marketValueTwd.toLocaleString()}
                      </div>
                      <div
                        className={`text-xs font-bold ${
                          isProfit ? 'text-[#F04452]' : 'text-[#059669]'
                        }`}
                      >
                        {isProfit ? '▲ +' : '▼ '}NT$ {pnl.toLocaleString()} ({isProfit ? '+' : ''}
                        {pnlPct}%)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] text-[11px] text-[#8B95A1]">
                    <span>
                      成本合計 NT$ {costTwd.toLocaleString()}
                      {h.estimatedAnnualYieldPct ? ` · 殖利率約 ${h.estimatedAnnualYieldPct}%` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteSecurityHolding(h.id)}
                      className="text-[#8B95A1] hover:text-[#F04452] p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. 📊 ETF 專區 (成分股權重穿透、投組集中度警報與 DRIP 複利模擬) */}
      {/* ============================================================== */}
      {subTab === 'etf' && (
        <div className="space-y-4">
          {/* 投組成分穿透與集中度警報 */}
          <div className="toss-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold">個人投組成分穿透與重疊集中度 (Overlap Scanner)</h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] font-bold">
                智能成分穿透
              </span>
            </div>
            <p className="text-xs text-[#8B95A1]">
              自動將您持有的 0050、006208 等 ETF 與個股直接穿透拆解，計算您在底層單一公司的真實曝險總權重。
            </p>

            {penetrationSummary.alerts.length > 0 && (
              <div className="space-y-2">
                {penetrationSummary.alerts.map((alertText: string, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2 text-xs"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-amber-800 dark:text-amber-200 font-medium">
                      {alertText}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 前五大真實底層持股 */}
            <div className="space-y-2 pt-1">
              <div className="text-xs font-semibold text-[#4E5968] dark:text-[#9BA4B0]">
                投組底層實際曝險 TOP 5 (含個股直接持有 + ETF 穿透佔比)
              </div>
              <div className="space-y-1.5 tabular-nums">
                {penetrationSummary.topPenetratedStocks.slice(0, 5).map((item, idx: number) => (
                  <div
                    key={item.symbol}
                    className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#EAEDF2] dark:bg-[#262C36] flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold">{item.name}</span>{' '}
                        <span className="text-[#8B95A1]">({item.symbol})</span>
                        <span className="ml-2 text-[10px] text-[#2563EB] bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                          {item.sector}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">NT$ {item.totalExposedTwd.toLocaleString()}</span>
                      <span className="ml-2 text-[#8B95A1]">({item.exposedPct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* DRIP 股息再投入複利滾雪球模擬器 */}
          <div className="toss-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#059669]" />
                <h3 className="text-sm font-bold">DRIP 股息再投入複利滾利試算</h3>
              </div>
              <span className="text-xs font-bold text-[#059669] tabular-nums">
                複利終值 NT$ {dripResult.withDripFinalValue.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <label className="text-[11px] text-[#8B95A1] block mb-1">初期本金 (NT$)</label>
                <input
                  type="number"
                  step="50000"
                  value={dripInitial}
                  onChange={(e) => setDripInitial(Number(e.target.value) || 0)}
                  className="toss-input tabular-nums"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#8B95A1] block mb-1">每月定額 (NT$)</label>
                <input
                  type="number"
                  step="1000"
                  value={dripMonthly}
                  onChange={(e) => setDripMonthly(Number(e.target.value) || 0)}
                  className="toss-input tabular-nums"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#8B95A1] block mb-1">年化殖利率 (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={dripYield}
                  onChange={(e) => setDripYield(Number(e.target.value) || 0)}
                  className="toss-input tabular-nums"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#8B95A1] block mb-1">投資滾利年數</label>
                <select
                  value={dripYears}
                  onChange={(e) => setDripYears(Number(e.target.value))}
                  className="toss-input tabular-nums"
                >
                  <option value={5}>5 年</option>
                  <option value={10}>10 年</option>
                  <option value={15}>15 年</option>
                  <option value={20}>20 年</option>
                  <option value={30}>30 年</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] space-y-1.5 text-xs tabular-nums">
              <div className="flex justify-between text-[#8B95A1]">
                <span>累積自掏腰包總本金：</span>
                <span className="font-semibold text-[#191F28] dark:text-white">
                  NT$ {dripResult.totalInvestedCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[#8B95A1]">
                <span>若股息領出花掉 (無滾利)：</span>
                <span className="font-semibold">
                  NT$ {dripResult.withoutDripFinalValue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[#059669] font-bold pt-1 border-t border-[#EAEDF2] dark:border-[#262C36]">
                <span>股息自動全額再投入 (DRIP 複利)：</span>
                <span>NT$ {dripResult.withDripFinalValue.toLocaleString()}</span>
              </div>
              <div className="text-[11px] text-[#2563EB] text-right font-semibold">
                多賺額外複利收益：+NT$ {dripResult.dripExtraWealth.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 主流台美股 ETF 字典卡片 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#4E5968] dark:text-[#9BA4B0]">
                主流 11 檔 ETF 規格庫與前十大成分股穿透
              </h3>
              <div className="flex gap-1 overflow-x-auto no-scrollbar text-xs">
                {(
                  [
                    { id: 'all', label: '全部' },
                    { id: 'market_cap', label: '市值型' },
                    { id: 'high_dividend', label: '高股息' },
                    { id: 'bond', label: '債券型' },
                    { id: 'us_broad', label: '美股大盤' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setEtfCategoryFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                      etfCategoryFilter === tab.id
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-[#F0F2F6] dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {ETF_PROFILES.filter(
              (p) => etfCategoryFilter === 'all' || p.category === etfCategoryFilter
            ).map((etf) => {
              const isExpanded = expandedEtfSymbol === etf.symbol;
              const isPremium = etf.premiumDiscountPct >= 0;

              return (
                <div key={etf.symbol} className="toss-card p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#191F28] dark:text-[#F2F4F8]">
                          {etf.name}
                        </span>
                        <span className="text-xs font-semibold text-[#8B95A1] tabular-nums">
                          {etf.symbol}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] font-bold">
                          {etf.issuer}
                        </span>
                      </div>
                      <p className="text-xs text-[#8B95A1] mt-1">{etf.description}</p>
                    </div>

                    <div className="text-right tabular-nums">
                      <div className="text-sm font-bold">市價 ${etf.marketPrice}</div>
                      <div className="text-xs text-[#8B95A1]">淨值 ${etf.nav}</div>
                      <div
                        className={`text-[11px] font-semibold ${
                          isPremium ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {isPremium ? '溢價' : '折價'} {Math.abs(etf.premiumDiscountPct)}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] text-xs tabular-nums text-center">
                    <div>
                      <div className="text-[10px] text-[#8B95A1]">內扣費用率</div>
                      <div className="font-bold text-[#191F28] dark:text-white">
                        {etf.expenseRatioPct}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#8B95A1]">年化殖利率</div>
                      <div className="font-bold text-[#F04452]">{etf.dividendYieldPct}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#8B95A1]">配息頻率</div>
                      <div className="font-bold text-[#2563EB]">
                        {etf.dividendFrequency === 'monthly'
                          ? '月月配'
                          : etf.dividendFrequency === 'quarterly'
                            ? '季配息'
                            : '半年配'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedEtfSymbol(isExpanded ? null : etf.symbol)}
                    className="w-full py-1.5 flex items-center justify-center gap-1 text-xs text-[#2563EB] font-semibold hover:bg-blue-50/50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
                  >
                    <span>{isExpanded ? '收合前十大成分股' : '展開前十大成分股穿透權重'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] space-y-1.5">
                      <div className="text-[11px] font-bold text-[#8B95A1] mb-1">
                        前十大成分股與產業分佈：
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs tabular-nums">
                        {etf.topHoldings.map((h, idx) => (
                          <div
                            key={h.symbol}
                            className="p-2 rounded-lg bg-[#FFFFFF] dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] flex justify-between items-center"
                          >
                            <div>
                              <span className="text-[10px] text-[#8B95A1] mr-1.5">{idx + 1}.</span>
                              <span className="font-semibold">{h.name}</span>
                              <span className="text-[10px] text-[#8B95A1] block">{h.sector}</span>
                            </div>
                            <span className="font-bold text-[#2563EB]">{h.weightPct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. 📈 投資報酬率分析 (TWRR / MWRR IRR / CAGR / 季與年維度切換) */}
      {/* ============================================================== */}
      {subTab === 'returns' && (
        <div className="space-y-4">
          <div className="toss-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold">投資報酬率綜合儀表板</h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#059669] font-bold">
                Alpha +{investmentSummary.alphaTaiexPct}%
              </span>
            </div>

            {/* 四大核心國際標準報酬率 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 tabular-nums">
              <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                <div className="text-[11px] text-[#8B95A1]">TWRR 時間加權報酬</div>
                <div className="text-xl font-bold text-[#2563EB]">
                  {investmentSummary.twrrPct >= 0 ? '+' : ''}
                  {investmentSummary.twrrPct}%
                </div>
                <div className="text-[10px] text-[#8B95A1] mt-0.5">排除中途出入金干擾</div>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                <div className="text-[11px] text-[#8B95A1]">MWRR / IRR 金額加權</div>
                <div className="text-xl font-bold text-[#059669]">
                  {investmentSummary.mwrrPct >= 0 ? '+' : ''}
                  {investmentSummary.mwrrPct}%
                </div>
                <div className="text-[10px] text-[#8B95A1] mt-0.5">反映個人真實口袋收益</div>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                <div className="text-[11px] text-[#8B95A1]">CAGR 年化複合成長</div>
                <div className="text-xl font-bold text-[#191F28] dark:text-white">
                  {investmentSummary.cagrPct >= 0 ? '+' : ''}
                  {investmentSummary.cagrPct}%
                </div>
                <div className="text-[10px] text-[#8B95A1] mt-0.5">複利滾動幾何均值</div>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                <div className="text-[11px] text-[#8B95A1]">大盤加權指數 (TAIEX)</div>
                <div className="text-xl font-bold text-[#4E5968] dark:text-[#9BA4B0]">
                  +{investmentSummary.benchmarkTaiexPct}%
                </div>
                <div className="text-[10px] text-[#059669] font-bold mt-0.5">
                  超額 Alpha +{investmentSummary.alphaTaiexPct}%
                </div>
              </div>
            </div>

            {/* 本金與市值總計 */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] text-xs tabular-nums text-center">
              <div>
                <div className="text-[10px] text-[#8B95A1]">累積投入本金</div>
                <div className="font-bold text-[#191F28] dark:text-white">
                  ${investmentSummary.totalCostTwd.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#8B95A1]">持倉現值</div>
                <div className="font-bold text-[#2563EB]">
                  ${investmentSummary.currentMarketValueTwd.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#8B95A1]">累計未實現損益</div>
                <div className="font-bold text-[#F04452]">
                  +${investmentSummary.totalPnlTwd.toLocaleString()}
                </div>
              </div>
            </div>

            {/* 歷年 / 季度績效明細表 */}
            <div className="space-y-3 pt-2 border-t border-[#EAEDF2] dark:border-[#262C36]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#191F28] dark:text-white">
                  歷期損益與超額報酬明細
                </span>
                <div className="flex gap-1 bg-[#F0F2F6] dark:bg-[#1F2631] p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setReturnPeriodFilter('quarter')}
                    className={`px-2.5 py-1 rounded-md font-semibold ${
                      returnPeriodFilter === 'quarter'
                        ? 'bg-white dark:bg-[#262C36] shadow-sm text-[#2563EB]'
                        : 'text-[#8B95A1]'
                    }`}
                  >
                    按季度 (Q1~Q4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturnPeriodFilter('year')}
                    className={`px-2.5 py-1 rounded-md font-semibold ${
                      returnPeriodFilter === 'year'
                        ? 'bg-white dark:bg-[#262C36] shadow-sm text-[#2563EB]'
                        : 'text-[#8B95A1]'
                    }`}
                  >
                    按年度 (Annual)
                  </button>
                </div>
              </div>

              <div className="space-y-2 tabular-nums">
                {investmentSummary.periodBreakdowns
                  .filter((p) => p.periodType === returnPeriodFilter)
                  .map((p) => (
                    <div
                      key={p.label}
                      className="p-3 rounded-xl bg-[#FFFFFF] dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-sm text-[#191F28] dark:text-white">
                          {p.label}
                        </div>
                        <div className="text-[11px] text-[#8B95A1] mt-0.5">
                          期初 ${p.startValue.toLocaleString()} → 期末 ${p.endValue.toLocaleString()}{' '}
                          (淨金流 ${p.cashFlow.toLocaleString()})
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-[#F04452]">
                          +${p.returnTwd.toLocaleString()} ({p.twrrPct}%)
                        </div>
                        <div className="text-[11px] text-[#8B95A1]">
                          大盤 {p.benchmarkTaiexPct}% ·{' '}
                          <span className="text-[#059669] font-bold">
                            Alpha +{p.alphaPct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. 💼 多幣別銀行與現金帳戶 (TWD, USD, JPY, CNY, KRW, VND) */}
      {/* ============================================================== */}
      {subTab === 'accounts' && (
        <div className="space-y-4">
          <div className="toss-card p-4 flex items-center justify-between">
            <div className="tabular-nums">
              <div className="text-xs text-[#8B95A1]">多幣別帳戶總折算新台幣現值</div>
              <div className="text-2xl font-bold text-[#191F28] dark:text-[#F2F4F8]">
                NT$ {netWorthSummary.cashAndBankTotal.toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddAcc(!showAddAcc)}
              className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>新增帳戶</span>
            </button>
          </div>

          {showAddAcc && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!accName) return;
                upsertAssetAccount({
                  id: `acc-${Date.now()}`,
                  name: accName,
                  type: accType,
                  currency: accCurrency,
                  balance: Number(accBalance) || 0,
                  accountLastFour: accLastFour || undefined,
                  colorHex: '#2563EB',
                  emoji: accEmoji || '🏦',
                  updatedAt: new Date().toISOString(),
                });
                setAccName('');
                setAccBalance('');
                setShowAddAcc(false);
              }}
              className="toss-card p-4 space-y-3"
            >
              <div className="text-xs font-bold">新增多幣別帳戶或現金錢包</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="帳戶名稱 (例: 玉山雙幣日圓)"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="toss-input"
                />
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as BankAccountType)}
                  className="toss-input"
                >
                  <option value="bank">銀行存款帳戶</option>
                  <option value="brokerage_cash">證券交割戶</option>
                  <option value="cash">實體現金錢包</option>
                  <option value="digital_wallet">電子支付 (Line Pay等)</option>
                </select>
                <select
                  value={accCurrency}
                  onChange={(e) => setAccCurrency(e.target.value as SupportedCurrency)}
                  className="toss-input"
                >
                  <option value="TWD">🇹🇼 TWD (新台幣)</option>
                  <option value="USD">🇺🇸 USD (美金)</option>
                  <option value="JPY">🇯🇵 JPY (日幣)</option>
                  <option value="CNY">🇨🇳 CNY (人民幣)</option>
                  <option value="KRW">🇰🇷 KRW (韓元)</option>
                  <option value="VND">🇻🇳 VND (越南盾)</option>
                </select>
                <input
                  type="number"
                  required
                  placeholder="原幣別餘額"
                  value={accBalance}
                  onChange={(e) => setAccBalance(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <input
                  type="text"
                  maxLength={4}
                  placeholder="帳號末四碼 (選填)"
                  value={accLastFour}
                  onChange={(e) => setAccLastFour(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <input
                  type="text"
                  placeholder="圖示 Emoji"
                  value={accEmoji}
                  onChange={(e) => setAccEmoji(e.target.value)}
                  className="toss-input text-center"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
              >
                儲存帳戶
              </button>
            </form>
          )}

          <div className="space-y-3">
            {assetAccounts.map((acc) => {
              const cur: SupportedCurrency = acc.currency || 'TWD';
              const rate = exchangeRates[cur] || 1;
              const convertedTwd = Math.round(acc.balance * rate);
              const meta = CURRENCY_META[cur];

              return (
                <div
                  key={acc.id}
                  className="toss-card p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] flex items-center justify-center text-lg">
                      {acc.emoji || <Building2 className="w-5 h-5 text-[#2563EB]" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8] flex items-center gap-1.5">
                        <span>{acc.name}</span>
                        {cur !== 'TWD' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] font-bold">
                            {meta.flag} {cur}
                          </span>
                        )}
                        {acc.accountLastFour ? (
                          <span className="text-xs font-normal text-[#8B95A1] tabular-nums">
                            ({acc.accountLastFour})
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-[#8B95A1]">
                        {acc.type === 'bank'
                          ? '銀行存款'
                          : acc.type === 'brokerage_cash'
                            ? '證券交割戶'
                            : acc.type === 'cash'
                              ? '現金錢包'
                              : '行動電子支付'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right tabular-nums">
                      <div className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8]">
                        {meta.symbol} {acc.balance.toLocaleString()}
                      </div>
                      {cur !== 'TWD' ? (
                        <div className="text-[11px] text-[#2563EB] font-semibold">
                          ≈ NT$ {convertedTwd.toLocaleString()}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const nextVal = prompt(`校準「${acc.name}」目前實際餘額：`, String(acc.balance));
                            if (nextVal !== null && !Number.isNaN(Number(nextVal))) {
                              upsertAssetAccount({
                                ...acc,
                                balance: Number(nextVal),
                                updatedAt: new Date().toISOString(),
                              });
                            }
                          }}
                          className="text-[11px] text-[#8B95A1] hover:text-[#2563EB]"
                        >
                          一鍵校準
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteAssetAccount(acc.id)}
                      className="p-1 text-[#8B95A1] hover:text-[#F04452]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. 💱 常用匯率即時換算機 (VND, CNY, JPY, KRW, USD, TWD) */}
      {/* ============================================================== */}
      {subTab === 'rates' && (
        <div className="space-y-4">
          <div className="toss-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold">常用國際匯率即時換算器</h3>
              </div>
              <button
                type="button"
                disabled={isQuoteSyncing}
                onClick={() => void refreshQuotes()}
                className="px-2.5 py-1 rounded-lg bg-[#F0F2F6] dark:bg-[#1F2631] text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3 h-3 ${isQuoteSyncing ? 'animate-spin text-[#2563EB]' : ''}`} />
                <span>更新匯率牌告</span>
              </button>
            </div>

            {/* 即時牌告看板 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 tabular-nums text-xs">
              <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] flex justify-between items-center">
                <span>🇺🇸 1 USD 美元</span>
                <span className="font-bold text-[#191F28] dark:text-white">
                  ${exchangeRates.USD} TWD
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] flex justify-between items-center">
                <span>🇯🇵 1 JPY 日幣</span>
                <span className="font-bold text-[#191F28] dark:text-white">
                  ${exchangeRates.JPY} TWD
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] flex justify-between items-center">
                <span>🇨🇳 1 CNY 人民幣</span>
                <span className="font-bold text-[#191F28] dark:text-white">
                  ${exchangeRates.CNY} TWD
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] flex justify-between items-center">
                <span>🇰🇷 1 KRW 韓元</span>
                <span className="font-bold text-[#191F28] dark:text-white">
                  ${exchangeRates.KRW} TWD
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] flex justify-between items-center">
                <span>🇻🇳 1 VND 越南盾</span>
                <span className="font-bold text-[#191F28] dark:text-white">
                  ${exchangeRates.VND} TWD
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] flex justify-between items-center font-bold">
                <span>🇹🇼 基準計價幣別</span>
                <span>新台幣 TWD</span>
              </div>
            </div>

            {/* 輸入換算機 */}
            <div className="pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[11px] text-[#8B95A1] block mb-1">換算金額</label>
                  <input
                    type="number"
                    value={fxAmount}
                    onChange={(e) => setFxAmount(e.target.value)}
                    className="toss-input text-lg font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1] block mb-1">來源幣別</label>
                  <select
                    value={fxFromCurrency}
                    onChange={(e) => setFxFromCurrency(e.target.value as SupportedCurrency)}
                    className="toss-input font-bold"
                  >
                    <option value="TWD">🇹🇼 TWD</option>
                    <option value="USD">🇺🇸 USD</option>
                    <option value="JPY">🇯🇵 JPY</option>
                    <option value="CNY">🇨🇳 CNY</option>
                    <option value="KRW">🇰🇷 KRW</option>
                    <option value="VND">🇻🇳 VND</option>
                  </select>
                </div>
              </div>

              {/* 快捷金額按鈕 */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar text-xs">
                {['1000', '10000', '50000', '100000', '500000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setFxAmount(amt)}
                    className="px-2.5 py-1 rounded-lg bg-[#F0F2F6] dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0] font-semibold tabular-nums shrink-0"
                  >
                    +{Number(amt).toLocaleString()}
                  </button>
                ))}
              </div>

              {/* 換算結果卡片清單 */}
              <div className="space-y-2 pt-1">
                {fxCalculated.map((item) => (
                  <div
                    key={item.currency}
                    className={`p-3 rounded-xl flex items-center justify-between text-xs tabular-nums ${
                      item.currency === fxFromCurrency
                        ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900'
                        : 'bg-[#F6F7F9] dark:bg-[#1F2631]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.meta.flag}</span>
                      <div>
                        <div className="font-bold text-sm text-[#191F28] dark:text-white">
                          {item.meta.name} ({item.currency})
                        </div>
                        <div className="text-[10px] text-[#8B95A1]">
                          1 {item.currency} ≈ {item.rateToTwd} TWD
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold text-[#191F28] dark:text-white">
                        {item.meta.symbol}{' '}
                        {item.currency === 'VND' || item.currency === 'KRW'
                          ? Math.round(item.amount).toLocaleString()
                          : item.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. 🎯 存錢計畫 (Savings Goals) */}
      {/* ============================================================== */}
      {subTab === 'savings' && (
        <div className="space-y-4">
          {/* 存錢總覽卡片 */}
          <div className="toss-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[#8B95A1]">全計畫累積已存專款總計</div>
                <div className="text-2xl font-bold tabular-nums text-[#191F28] dark:text-[#F2F4F8]">
                  NT${' '}
                  {savingsGoals
                    .reduce((sum, g) => sum + g.currentAmount, 0)
                    .toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddGoal(!showAddGoal)}
                className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>新增目標</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] text-xs tabular-nums text-center">
              <div>
                <div className="text-[10px] text-[#8B95A1]">目標總預算</div>
                <div className="font-bold">
                  NT${' '}
                  {savingsGoals
                    .reduce((sum, g) => sum + g.targetAmount, 0)
                    .toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#8B95A1]">進行中計畫</div>
                <div className="font-bold text-[#2563EB]">
                  {savingsGoals.filter((g) => !g.isCompleted).length} 項
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#8B95A1]">已圓滿達成</div>
                <div className="font-bold text-[#059669]">
                  {savingsGoals.filter((g) => g.isCompleted).length} 項
                </div>
              </div>
            </div>
          </div>

          {/* 新增存錢目標表單 */}
          {showAddGoal && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!goalTitle) return;
                upsertSavingsGoal({
                  id: `goal-${Date.now()}`,
                  title: goalTitle,
                  category: goalCat,
                  targetAmount: Number(goalTarget) || 0,
                  currentAmount: Number(goalCurrent) || 0,
                  targetDate: goalDate,
                  monthlyPlannedContribution: Number(goalMonthly) || 0,
                  linkedAccountId: goalLinkedAcc || undefined,
                  emoji: goalEmoji || '🎯',
                  colorHex: goalColor || '#2563EB',
                  isCompleted: (Number(goalCurrent) || 0) >= (Number(goalTarget) || 1),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                setGoalTitle('');
                setShowAddGoal(false);
              }}
              className="toss-card p-4 space-y-3"
            >
              <div className="text-xs font-bold text-[#191F28] dark:text-white">
                建立全新存錢目標
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <input
                  type="text"
                  required
                  placeholder="目標名稱 (例: 買房頭期款 200萬)"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="toss-input col-span-2"
                />
                <select
                  value={goalCat}
                  onChange={(e) => setGoalCat(e.target.value as SavingsGoalCategory)}
                  className="toss-input"
                >
                  <option value="house_downpayment">🏡 買房頭期款</option>
                  <option value="car_purchase">🚗 購車基金</option>
                  <option value="travel">✈️ 旅遊玩樂</option>
                  <option value="emergency_fund">🛡️ 緊急備用金</option>
                  <option value="education">🎓 進修與留學</option>
                  <option value="retirement">🏖️ 退休養老</option>
                  <option value="custom">🎯 自訂計畫</option>
                </select>
                <input
                  type="number"
                  required
                  placeholder="目標總金額 (TWD)"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <input
                  type="number"
                  placeholder="目前已存金額"
                  value={goalCurrent}
                  onChange={(e) => setGoalCurrent(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <input
                  type="date"
                  required
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  className="toss-input"
                />
                <input
                  type="number"
                  placeholder="每月預計提撥"
                  value={goalMonthly}
                  onChange={(e) => setGoalMonthly(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <select
                  value={goalLinkedAcc}
                  onChange={(e) => setGoalLinkedAcc(e.target.value)}
                  className="toss-input"
                >
                  <option value="">不指定專屬銀行帳戶</option>
                  {assetAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (NT$ {a.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="圖示 Emoji"
                  value={goalEmoji}
                  onChange={(e) => setGoalEmoji(e.target.value)}
                  className="toss-input text-center"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddGoal(false)}
                  className="w-1/3 py-2 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631] text-xs font-semibold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
                >
                  儲存存錢計畫
                </button>
              </div>
            </form>
          )}

          {/* 存錢計畫卡片列表 */}
          <div className="space-y-3">
            {savingsGoals.map((g) => {
              const pct = Math.min(100, Math.round((g.currentAmount / (g.targetAmount || 1)) * 100));
              const remaining = Math.max(0, g.targetAmount - g.currentAmount);

              return (
                <div key={g.id} className="toss-card p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-xl shrink-0">
                        {g.emoji}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8] flex items-center gap-1.5">
                          <span>{g.title}</span>
                          {g.isCompleted && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                              已達成 🎉
                            </span>
                          )}
                        </h4>
                        <div className="text-xs text-[#8B95A1] tabular-nums mt-0.5">
                          目標日：{g.targetDate}{' '}
                          {g.monthlyPlannedContribution
                            ? `· 每月預估提撥 $${g.monthlyPlannedContribution.toLocaleString()}`
                            : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right tabular-nums">
                      <div className="text-base font-bold text-[#191F28] dark:text-white">
                        NT$ {g.currentAmount.toLocaleString()}
                      </div>
                      <div className="text-xs text-[#8B95A1]">
                        目標 NT$ {g.targetAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* 進度條 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs tabular-nums">
                      <span className="font-semibold text-[#2563EB]">{pct}% 達成</span>
                      <span className="text-[#8B95A1]">
                        {remaining > 0 ? `尚差 NT$ ${remaining.toLocaleString()}` : '已全數到位！'}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#EAEDF2] dark:bg-[#262C36] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* 備註與操作按鈕 */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] text-xs">
                    <span className="text-[11px] text-[#8B95A1] truncate max-w-[200px]">
                      {g.notes || '專款專用存錢目標'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDepositGoalId(g.id);
                          setDepositAmount(String(g.monthlyPlannedContribution || 10000));
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] font-bold text-xs hover:bg-blue-100 transition-colors"
                      >
                        一鍵存入專款
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSavingsGoal(g.id)}
                        className="p-1 text-[#8B95A1] hover:text-[#F04452]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 提撥存入彈窗 Modal */}
          {depositGoalId && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
              <div className="w-full max-w-md bg-white dark:bg-[#161B22] rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#191F28] dark:text-white">
                    🎯 提撥專款存入計畫
                  </h3>
                  <button
                    type="button"
                    onClick={() => setDepositGoalId(null)}
                    className="text-[#8B95A1] hover:text-[#191F28]"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[#8B95A1] block mb-1">扣款來源銀行帳戶</label>
                    <select
                      value={depositSourceAcc}
                      onChange={(e) => setDepositSourceAcc(e.target.value)}
                      className="toss-input"
                    >
                      {assetAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} (餘額 NT$ {a.balance.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[#8B95A1] block mb-1">本次提撥存入金額 (NT$)</label>
                    <input
                      type="number"
                      step="1000"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="toss-input text-base font-bold tabular-nums"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDepositGoalId(null)}
                    className="w-1/3 py-2.5 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631] text-xs font-semibold"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const amt = Number(depositAmount);
                      if (amt > 0 && depositGoalId) {
                        depositToSavingsGoal(
                          depositGoalId,
                          amt,
                          depositSourceAcc || undefined,
                          '存入存錢計畫專款'
                        );
                        setDepositGoalId(null);
                      }
                    }}
                    className="w-2/3 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
                  >
                    確認存入專款 (自動扣帳記帳)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. 📅 股息 / 債息被動收入 12 個月現金流月曆 */}
      {/* ============================================================== */}
      {subTab === 'dividends' && (
        <div className="space-y-4">
          <div className="toss-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold">年度股息與債息現金流預估</h3>
              </div>
              <span className="text-xs font-bold text-[#2563EB] tabular-nums">
                固定支出覆蓋率 {passiveIncomeSummary.coverageRatioPct}%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 tabular-nums">
              <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                <div className="text-[11px] text-[#8B95A1]">預估年領總息收</div>
                <div className="text-base font-bold text-[#191F28] dark:text-white">
                  ${passiveIncomeSummary.annualPassiveIncomeTwd.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                <div className="text-[11px] text-[#8B95A1]">平均每月被動收入</div>
                <div className="text-base font-bold text-[#059669]">
                  +${passiveIncomeSummary.monthlyAveragePassiveIncomeTwd.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                <div className="text-[11px] text-[#8B95A1]">每月剛性固定支出</div>
                <div className="text-base font-bold text-[#F04452]">
                  -${passiveIncomeSummary.monthlyFixedExpenseTwd.toLocaleString()}
                </div>
              </div>
            </div>

            {/* 1~12 月配息柱狀分佈 */}
            <div className="pt-3">
              <div className="text-xs font-semibold text-[#4E5968] dark:text-[#9BA4B0] mb-3">
                1 ~ 12 月預估領息月曆 (TWD)
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 tabular-nums">
                {passiveIncomeSummary.monthlyBreakdown.map((amt, idx) => {
                  const maxMonth = Math.max(...passiveIncomeSummary.monthlyBreakdown, 1);
                  const barPct = Math.round((amt / maxMonth) * 100);
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] space-y-1.5"
                    >
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-[#4E5968] dark:text-[#9BA4B0]">
                          {idx + 1} 月
                        </span>
                        <span className="font-bold text-[#191F28] dark:text-white">
                          ${amt.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#EAEDF2] dark:bg-[#262C36] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#2563EB]"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. 📉 每日淨值快照與資產結構 */}
      {/* ============================================================== */}
      {subTab === 'networth' && (
        <div className="space-y-4">
          <div className="toss-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold">資產負債結構與每日淨值紀錄</h3>
              </div>
              <span className="text-xs text-[#8B95A1] tabular-nums">
                淨值 NT$ {netWorthSummary.netWorth.toLocaleString()}
              </span>
            </div>

            <div className="space-y-2 tabular-nums text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#EAEDF2] dark:border-[#262C36]">
                <span className="text-[#4E5968] dark:text-[#9BA4B0]">銀行存款與多幣別現金總計</span>
                <span className="font-bold">NT$ {netWorthSummary.cashAndBankTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EAEDF2] dark:border-[#262C36]">
                <span className="text-[#4E5968] dark:text-[#9BA4B0]">股票 / ETF / 基金 / 債券現值</span>
                <span className="font-bold text-[#2563EB]">
                  NT$ {netWorthSummary.investmentTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EAEDF2] dark:border-[#262C36]">
                <span className="text-[#4E5968] dark:text-[#9BA4B0]">儲蓄險保單價值準備金</span>
                <span className="font-bold">
                  NT$ {netWorthSummary.insuranceCashValueTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EAEDF2] dark:border-[#262C36]">
                <span className="text-[#4E5968] dark:text-[#9BA4B0]">應收債權 (別人欠我)</span>
                <span className="font-bold text-[#059669]">
                  +NT$ {netWorthSummary.receivablesTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EAEDF2] dark:border-[#262C36]">
                <span className="text-[#4E5968] dark:text-[#9BA4B0]">信用卡已出帳与未出帳負債</span>
                <span className="font-bold text-[#F04452]">
                  -NT$ {netWorthSummary.creditCardLiabilityTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EAEDF2] dark:border-[#262C36]">
                <span className="text-[#4E5968] dark:text-[#9BA4B0]">正式房貸與車貸未償本金負債</span>
                <span className="font-bold text-[#F04452]">
                  -NT$ {netWorthSummary.loanLiabilityTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#4E5968] dark:text-[#9BA4B0]">分期付款未償餘額與其他負債</span>
                <span className="font-bold text-[#F04452]">
                  -NT${' '}
                  {(
                    netWorthSummary.debtLiabilityTotal + netWorthSummary.installmentRemainingTotal
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#EAEDF2] dark:border-[#262C36] space-y-2">
              <div className="text-xs font-semibold text-[#8B95A1] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>歷史每日淨值快照</span>
              </div>
              {netWorthSnapshots.map((snap) => (
                <div
                  key={snap.date}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] text-xs tabular-nums"
                >
                  <span className="font-medium">{snap.date}</span>
                  <span className="font-bold text-[#191F28] dark:text-white">
                    NT$ {snap.netWorth.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
