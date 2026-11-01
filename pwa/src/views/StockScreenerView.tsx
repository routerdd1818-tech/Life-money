import React, { useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  Eye,
  Filter,
  Flame,
  Heart,
  Layers,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import {
  calculateSectorFlowStats,
  evaluateBottomUpFunnel,
  QUANT_STRATEGIES,
  STOCK_SECTORS,
} from '../services/stockScreenerEngine';
import { ScreenerFilterCriteria, ScreenerStockItem, StockSectorId, WatchlistType } from '../types';

type ScreenerSubTab = 'screener' | 'sectors' | 'watchlist' | 'guide';
type WatchlistCategory = 'watching' | 'holdings' | 'favorite';

export const StockScreenerView: React.FC = () => {
  const {
    screenerStocks,
    watchlist,
    upsertWatchlistItem,
    deleteWatchlistItem,
    securityHoldings,
    upsertSecurityHolding,
    exchangeRateUsdTwd,
  } = useVault();

  const [subTab, setSubTab] = useState<ScreenerSubTab>('screener');
  const [watchlistCategory, setWatchlistCategory] = useState<WatchlistCategory>('watching');
  const [activeStrategyId, setActiveStrategyId] = useState<string>('bottom_up_all_star');
  const [showCustomSliders, setShowCustomSliders] = useState<boolean>(false);
  const [criteria, setCriteria] = useState<ScreenerFilterCriteria>(
    QUANT_STRATEGIES[0].criteria
  );

  // 板塊資金輪動選中展開之族群
  const [selectedSectorId, setSelectedSectorId] = useState<StockSectorId>('ai_server_cooling');

  // 新增自訂關注股票表單狀態
  const [showAddWatch, setShowAddWatch] = useState(false);
  const [wlSymbol, setWlSymbol] = useState('');
  const [wlName, setWlName] = useState('');
  const [wlSector, setWlSector] = useState('半導體與 CoWoS 封裝');
  const [wlListType, setWlListType] = useState<WatchlistType>('watching');
  const [wlPrice, setWlPrice] = useState('');
  const [wlTargetBuy, setWlTargetBuy] = useState('');
  const [wlStopLoss, setWlStopLoss] = useState('');
  const [wlStrategyTag, setWlStrategyTag] = useState('🏆 四面向 Bottom-Up 全能複合');
  const [wlNotes, setWlNotes] = useState('');

  // 執行五步漏斗選股
  const { funnelSteps, passedStocks } = useMemo(
    () => evaluateBottomUpFunnel(screenerStocks, criteria),
    [screenerStocks, criteria]
  );

  // 計算八大板塊資金流向與輪轉象限
  const sectorFlowStats = useMemo(
    () => calculateSectorFlowStats(screenerStocks),
    [screenerStocks]
  );

  const activeStrategy = QUANT_STRATEGIES.find((s) => s.id === activeStrategyId);

  const handleSelectStrategy = (strategyId: string) => {
    const found = QUANT_STRATEGIES.find((s) => s.id === strategyId);
    if (!found) return;
    setActiveStrategyId(strategyId);
    setCriteria({ ...found.criteria });
  };

  const getWatchlistItem = (symbol: string) =>
    watchlist.find((w) => w.symbol.toUpperCase() === symbol.toUpperCase());

  const isInWatchlist = (symbol: string) =>
    watchlist.some((w) => w.symbol.toUpperCase() === symbol.toUpperCase());

  const isHeldInPortfolio = (symbol: string) =>
    securityHoldings.some((h) => h.symbol.toUpperCase() === symbol.toUpperCase());

  const watchingStocks = useMemo(
    () => watchlist.filter((w) => (w.listType || 'watching') === 'watching'),
    [watchlist]
  );

  const favoriteStocks = useMemo(
    () => watchlist.filter((w) => w.listType === 'favorite'),
    [watchlist]
  );

  const portfolioStats = useMemo(() => {
    const totalMarketValue = securityHoldings.reduce((sum, h) => sum + h.marketValueTwd, 0);
    const totalCost = securityHoldings.reduce(
      (sum, h) =>
        sum +
        h.costBasisPerUnit *
          h.units *
          (h.currency === 'USD' ? exchangeRateUsdTwd : 1),
      0
    );
    const totalPnl = totalMarketValue - totalCost;
    const totalReturnPct = totalCost > 0 ? Math.round((totalPnl / totalCost) * 1000) / 10 : 0;
    return { totalMarketValue, totalCost, totalPnl, totalReturnPct };
  }, [securityHoldings, exchangeRateUsdTwd]);

  const handleAddStockToWatchlist = (
    stock: ScreenerStockItem,
    strategyName?: string,
    listType: WatchlistType = 'watching'
  ) => {
    const targetBuy = Math.round(stock.price * 0.96 * 10) / 10;
    const stopLoss = Math.round(stock.price * 0.9 * 10) / 10;
    upsertWatchlistItem({
      id: `wl-${stock.symbol}-${Date.now()}`,
      symbol: stock.symbol,
      name: stock.name,
      sectorName: stock.sectorName,
      listType,
      addedPrice: stock.price,
      currentPrice: stock.price,
      targetBuyPrice: targetBuy,
      stopLossPrice: stopLoss,
      strategyTag: strategyName || activeStrategy?.name || '自訂量化選股',
      notes: `ROE ${stock.roePct}% · P/E ${stock.peRatio} · 月營收 YoY ${stock.revenueYoYPct >= 0 ? '+' : ''}${stock.revenueYoYPct}% · ${stock.subTheme}`,
      addedAt: new Date().toISOString(),
    });
  };

  const handleBuyIntoPortfolio = (params: {
    symbol: string;
    name: string;
    price: number;
    market?: 'TW' | 'US';
    dividendYieldPct?: number;
  }) => {
    const unitsStr = prompt(
      `將「${params.name} (${params.symbol})」轉入投資組合持倉\n請輸入買進股數 (例如台股 1000 股或零股 100 股)：`,
      params.market === 'US' ? '10' : '1000'
    );
    if (!unitsStr || Number.isNaN(Number(unitsStr)) || Number(unitsStr) <= 0) return;

    const isUs = params.market === 'US' || /^[A-Z]+$/.test(params.symbol);
    upsertSecurityHolding({
      id: `hold-${Date.now()}`,
      symbol: params.symbol,
      name: params.name,
      category: 'stock',
      units: Number(unitsStr),
      costBasisPerUnit: params.price,
      currentPrice: params.price,
      currency: isUs ? 'USD' : 'TWD',
      exchangeRateToTwd: isUs ? exchangeRateUsdTwd : 1,
      dividendFrequency: 'quarterly',
      estimatedAnnualYieldPct: params.dividendYieldPct ?? 2.5,
      lastQuotedAt: new Date().toISOString(),
      quoteSource: 'yahoo',
    });
    alert(`已將 ${params.name} (${unitsStr} 股) 加入「資產 -> 股票/基金/債券」持倉！`);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 頂部子分頁切換器 */}
      <div className="toss-pill-bar">
        {(
          [
            { id: 'screener', label: '🧠 智能選股漏斗' },
            { id: 'sectors', label: '🌊 板塊資金輪動' },
            { id: 'watchlist', label: `⭐ 關注清單 (${watchlist.length})` },
            { id: 'guide', label: '📖 策略與邏輯指南' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`toss-pill-btn flex-1 ${
              subTab === tab.id ? 'toss-pill-btn-active' : 'toss-pill-btn-inactive'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* =====================================================================
          Sub-Tab 1: 🧠 智能選股漏斗 (FinLab 風格四大面向 + 五步 Bottom-Up 過濾器)
         ===================================================================== */}
      {subTab === 'screener' && (
        <div className="space-y-4">
          {/* 1. 六大實戰量化策略一鍵套用區 */}
          <section className="toss-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-xs sm:text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                  FinLab 風格複合量化選股策略 (點擊一鍵套用)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomSliders(!showCustomSliders)}
                className="px-2.5 py-1 rounded-lg bg-[#F0F2F6] dark:bg-[#1F2631] text-xs font-semibold text-[#2563EB] flex items-center gap-1"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{showCustomSliders ? '收起自訂參數' : '自訂四面向參數'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUANT_STRATEGIES.map((strat) => {
                const isSelected = activeStrategyId === strat.id;
                return (
                  <button
                    key={strat.id}
                    type="button"
                    onClick={() => handleSelectStrategy(strat.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-[#2563EB] bg-blue-50/60 dark:bg-blue-950/30'
                        : 'border-[#EAEDF2] dark:border-[#262C36] bg-[#F6F7F9] dark:bg-[#1F2631] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                        {strat.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                          isSelected
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-white dark:bg-[#161B22] text-[#4E5968] dark:text-[#9BA4B0]'
                        }`}
                      >
                        {strat.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#4E5968] dark:text-[#9BA4B0] line-clamp-2">
                      {strat.summary}
                    </p>
                  </button>
                );
              })}
            </div>

            {activeStrategy && (
              <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] border border-[#EAEDF2] dark:border-[#262C36] text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-[#191F28] dark:text-white">
                  <span>當前策略邏輯：{activeStrategy.name}</span>
                  <span className="text-[11px] text-[#2563EB]">
                    建議換股頻率：{activeStrategy.rebalanceCycle}
                  </span>
                </div>
                <p className="text-[11px] text-[#4E5968] dark:text-[#9BA4B0] leading-relaxed">
                  {activeStrategy.logicDetail}
                </p>
              </div>
            )}

            {/* 自訂四面向篩選滑桿面版 */}
            {showCustomSliders && (
              <div className="pt-3 border-t border-[#EAEDF2] dark:border-[#262C36] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4E5968] dark:text-[#9BA4B0]">
                    自訂四面向因子門檻 (由下而上 Bottom-Up 條件)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      activeStrategy && setCriteria({ ...activeStrategy.criteria })
                    }
                    className="text-[11px] text-[#8B95A1] hover:text-[#191F28] flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    重置為策略預設
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-[#8B95A1] mb-1">
                      限定產業板塊
                    </label>
                    <select
                      value={criteria.sectorId}
                      onChange={(e) =>
                        setCriteria((prev) => ({
                          ...prev,
                          sectorId: e.target.value as 'all' | StockSectorId,
                        }))
                      }
                      className="toss-input text-xs py-1.5"
                    >
                      <option value="all">全部八大板塊</option>
                      {STOCK_SECTORS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.emoji} {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#8B95A1] mb-1 tabular-nums">
                      基本面：最低 ROE ≥ <strong>{criteria.minRoePct}%</strong>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={criteria.minRoePct}
                      onChange={(e) =>
                        setCriteria((prev) => ({ ...prev, minRoePct: Number(e.target.value) }))
                      }
                      className="w-full accent-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#8B95A1] mb-1 tabular-nums">
                      基本面：最高本益比 P/E ≤ <strong>{criteria.maxPeRatio} 倍</strong>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      step="1"
                      value={criteria.maxPeRatio}
                      onChange={(e) =>
                        setCriteria((prev) => ({ ...prev, maxPeRatio: Number(e.target.value) }))
                      }
                      className="w-full accent-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#8B95A1] mb-1 tabular-nums">
                      成長面：月營收 YoY ≥ <strong>{criteria.minRevenueYoYPct}%</strong>
                    </label>
                    <input
                      type="range"
                      min="-10"
                      max="40"
                      step="2"
                      value={criteria.minRevenueYoYPct}
                      onChange={(e) =>
                        setCriteria((prev) => ({
                          ...prev,
                          minRevenueYoYPct: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#8B95A1] mb-1 tabular-nums">
                      技術面：60日動能 ≥ <strong>{criteria.minMomentum60dPct}%</strong>
                    </label>
                    <input
                      type="range"
                      min="-15"
                      max="25"
                      step="1"
                      value={criteria.minMomentum60dPct}
                      onChange={(e) =>
                        setCriteria((prev) => ({
                          ...prev,
                          minMomentum60dPct: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#8B95A1] mb-1 tabular-nums">
                      低波動控制：年化波動度 ≤ <strong>{criteria.maxVolatilityPct}%</strong>
                    </label>
                    <input
                      type="range"
                      min="16"
                      max="50"
                      step="1"
                      value={criteria.maxVolatilityPct}
                      onChange={(e) =>
                        setCriteria((prev) => ({
                          ...prev,
                          maxVolatilityPct: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-[#2563EB]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={criteria.requirePositiveFcf}
                      onChange={(e) =>
                        setCriteria((prev) => ({
                          ...prev,
                          requirePositiveFcf: e.target.checked,
                        }))
                      }
                    />
                    <span>自由現金流為正</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={criteria.requireAboveMa60}
                      onChange={(e) =>
                        setCriteria((prev) => ({
                          ...prev,
                          requireAboveMa60: e.target.checked,
                        }))
                      }
                    />
                    <span>站上季線 (60MA 多頭)</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={criteria.requireInstBuy}
                      onChange={(e) =>
                        setCriteria((prev) => ({
                          ...prev,
                          requireInstBuy: e.target.checked,
                        }))
                      }
                    />
                    <span>三大法人近5日買超</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={criteria.requireTrustBuy}
                      onChange={(e) =>
                        setCriteria((prev) => ({
                          ...prev,
                          requireTrustBuy: e.target.checked,
                        }))
                      }
                    />
                    <span>投信認養買超 &gt; 0</span>
                  </label>
                </div>
              </div>
            )}
          </section>

          {/* 2. 由下而上 (Bottom-Up) 五步選股漏斗即時統計 */}
          <section className="toss-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Filter className="w-4 h-4 text-[#2563EB]" />
                <span>由下而上 (Bottom-Up) 五步實戰選股漏斗過濾過程</span>
              </div>
              <span className="text-xs font-bold text-[#2563EB] tabular-nums">
                最終選出 {passedStocks.length} / {screenerStocks.length} 檔
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {funnelSteps.map((st) => {
                const ratio = Math.round(
                  (st.remainingCount / Math.max(1, screenerStocks.length)) * 100
                );
                return (
                  <div
                    key={st.stepNumber}
                    className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] flex flex-col justify-between gap-1.5"
                  >
                    <div>
                      <div className="text-[11px] font-bold text-[#191F28] dark:text-[#F2F4F8]">
                        {st.title}
                      </div>
                      <div className="text-[10px] text-[#8B95A1] leading-snug">
                        {st.description}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold tabular-nums">
                        <span className="text-[#2563EB]">{st.remainingCount} 檔合格</span>
                        <span className="text-[#8B95A1]">{ratio}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#EAEDF2] dark:bg-[#262C36] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. 合格股票清單與四面向指標卡 */}
          <div className="space-y-3">
            {passedStocks.length === 0 ? (
              <div className="toss-card p-8 text-center space-y-2">
                <div className="text-sm font-bold">目前篩選條件較嚴格，暫無完全符合標的</div>
                <div className="text-xs text-[#8B95A1]">
                  可點擊上方切換其他預設策略，或展開「自訂四面向參數」放寬本益比/營收門檻
                </div>
              </div>
            ) : (
              passedStocks.map((stock) => {
                const watched = isInWatchlist(stock.symbol);
                return (
                  <div key={stock.symbol} className="toss-card p-4 space-y-3">
                    {/* 頂部標題與價格 */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8]">
                            {stock.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#F0F2F6] dark:bg-[#1F2631] text-xs font-mono text-[#4E5968] dark:text-[#9BA4B0]">
                            {stock.symbol}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-[11px] font-semibold text-[#2563EB]">
                            {stock.sectorName}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-[11px] font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                            量化總分 {stock.scores.totalScore}
                          </span>
                        </div>
                        <div className="text-xs text-[#8B95A1] mt-0.5">{stock.subTheme}</div>
                      </div>

                      <div className="text-right tabular-nums shrink-0">
                        <div className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          {stock.market === 'US' ? 'USD ' : 'NT$ '}
                          {stock.price.toLocaleString()}
                        </div>
                        <div
                          className={`text-xs font-bold ${
                            stock.dailyChangePct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                          }`}
                        >
                          {stock.dailyChangePct >= 0 ? '▲ +' : '▼ '}
                          {stock.dailyChangePct}%
                        </div>
                      </div>
                    </div>

                    {/* 四大核心面向評分條 */}
                    <div className="grid grid-cols-4 gap-2 p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] tabular-nums">
                      {[
                        { label: '基本面', score: stock.scores.fundamentalScore },
                        { label: '技術面', score: stock.scores.technicalScore },
                        { label: '籌碼面', score: stock.scores.chipScore },
                        { label: '成長面', score: stock.scores.growthScore },
                      ].map((p) => (
                        <div key={p.label} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-[#8B95A1]">{p.label}</span>
                            <span className="font-bold text-[#191F28] dark:text-white">
                              {p.score}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#EAEDF2] dark:bg-[#262C36] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#2563EB]"
                              style={{ width: `${p.score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 四面向核心數據矩陣 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
                      <div className="p-2 rounded-lg border border-[#EAEDF2] dark:border-[#262C36]">
                        <div className="text-[10px] text-[#8B95A1]">基本面 (ROE / 本益比)</div>
                        <div className="font-bold text-[#191F28] dark:text-white mt-0.5">
                          ROE {stock.roePct}% · P/E {stock.peRatio}
                        </div>
                        <div className="text-[10px] text-[#4E5968] dark:text-[#9BA4B0]">
                          毛利 {stock.grossMarginPct}% · 殖利率 {stock.dividendYieldPct}%
                        </div>
                      </div>

                      <div className="p-2 rounded-lg border border-[#EAEDF2] dark:border-[#262C36]">
                        <div className="text-[10px] text-[#8B95A1]">技術面 (60日動能 / 均線)</div>
                        <div
                          className={`font-bold mt-0.5 ${
                            stock.momentum60dPct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                          }`}
                        >
                          動能 {stock.momentum60dPct >= 0 ? '+' : ''}
                          {stock.momentum60dPct}%
                        </div>
                        <div className="text-[10px] text-[#4E5968] dark:text-[#9BA4B0]">
                          {stock.aboveMa60 ? '✅ 站上季線' : '⚠️ 季線下'} · 波動{' '}
                          {stock.annualVolatilityPct}%
                        </div>
                      </div>

                      <div className="p-2 rounded-lg border border-[#EAEDF2] dark:border-[#262C36]">
                        <div className="text-[10px] text-[#8B95A1]">籌碼面 (法人 / 投信5日)</div>
                        <div
                          className={`font-bold mt-0.5 ${
                            stock.instNetBuy5dLots >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                          }`}
                        >
                          法人 {stock.instNetBuy5dLots >= 0 ? '+' : ''}
                          {stock.instNetBuy5dLots.toLocaleString()} 張
                        </div>
                        <div className="text-[10px] text-[#4E5968] dark:text-[#9BA4B0]">
                          投信 {stock.trustNetBuy5dLots >= 0 ? '+' : ''}
                          {stock.trustNetBuy5dLots.toLocaleString()} 張 · 大戶{' '}
                          {stock.majorHolderChangePct >= 0 ? '+' : ''}
                          {stock.majorHolderChangePct}%
                        </div>
                      </div>

                      <div className="p-2 rounded-lg border border-[#EAEDF2] dark:border-[#262C36]">
                        <div className="text-[10px] text-[#8B95A1]">成長動能 (月營收 YoY)</div>
                        <div
                          className={`font-bold mt-0.5 ${
                            stock.revenueYoYPct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                          }`}
                        >
                          YoY {stock.revenueYoYPct >= 0 ? '+' : ''}
                          {stock.revenueYoYPct}%
                        </div>
                        <div className="text-[10px] text-[#4E5968] dark:text-[#9BA4B0]">
                          月增 MoM {stock.revenueMoMPct >= 0 ? '+' : ''}
                          {stock.revenueMoMPct}% · 成交 {stock.avgTurnover60dYiTwd}億
                        </div>
                      </div>
                    </div>

                    {/* 法說與題材展望 + 行動按鈕 */}
                    <div className="pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <p className="text-[11px] text-[#4E5968] dark:text-[#9BA4B0]">
                        💡 <strong>題材與法說展望：</strong>
                        {stock.catalystNote}
                      </p>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {(() => {
                          const existing = getWatchlistItem(stock.symbol);
                          if (!existing) {
                            return (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleAddStockToWatchlist(stock, undefined, 'watching')}
                                  className="px-2.5 py-1.5 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631] hover:bg-[#E2E8F0] text-[#191F28] dark:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                                  title="加入觀察清單"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
                                  <span>+ 觀察</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddStockToWatchlist(stock, undefined, 'favorite')}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-[#F04452] text-xs font-semibold flex items-center gap-1 transition-colors"
                                  title="加入喜好清單"
                                >
                                  <Heart className="w-3.5 h-3.5 fill-current" />
                                  <span>+ 喜好</span>
                                </button>
                              </>
                            );
                          }

                          return (
                            <span
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 ${
                                existing.listType === 'favorite'
                                  ? 'bg-rose-50 dark:bg-rose-950/40 text-[#F04452] border border-rose-200 dark:border-rose-900/50'
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{existing.listType === 'favorite' ? '❤️ 喜好中' : '👁️ 觀察中'}</span>
                            </span>
                          );
                        })()}

                        <button
                          type="button"
                          onClick={() =>
                            handleBuyIntoPortfolio({
                              symbol: stock.symbol,
                              name: stock.name,
                              price: stock.price,
                              market: stock.market,
                              dividendYieldPct: stock.dividendYieldPct,
                            })
                          }
                          className="px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>轉入持倉</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          Sub-Tab 2: 🌊 股價板塊流動與資金輪轉雷達 (Sector Rotation & Money Flow)
         ===================================================================== */}
      {subTab === 'sectors' && (
        <div className="space-y-4">
          <section className="toss-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#F04452]" />
                <h3 className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                  八大股票板塊資金流向與輪轉熱度排行
                </h3>
              </div>
              <span className="text-[11px] text-[#8B95A1]">點擊板塊可檢視成分股明細</span>
            </div>

            {/* 資金成交比重堆疊橫條 */}
            <div className="space-y-1.5">
              <div className="text-[11px] text-[#8B95A1] flex justify-between">
                <span>市場主流板塊資金成交佔比</span>
                <span>依今日強弱勢排序</span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#F0F2F6] dark:bg-[#1F2631] overflow-hidden flex">
                {sectorFlowStats.map((sec, idx) => {
                  const palette = [
                    'bg-[#2563EB]',
                    'bg-[#F04452]',
                    'bg-[#059669]',
                    'bg-amber-500',
                    'bg-indigo-500',
                    'bg-teal-500',
                    'bg-purple-500',
                    'bg-slate-400',
                  ];
                  return (
                    <div
                      key={sec.sectorId}
                      style={{ width: `${sec.turnoverSharePct}%` }}
                      className={`${palette[idx % palette.length]} h-full first:rounded-l-full last:rounded-r-full`}
                      title={`${sec.name}: ${sec.turnoverSharePct}%`}
                    />
                  );
                })}
              </div>
            </div>

            {/* 八大板塊卡片網格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {sectorFlowStats.map((sec) => {
                const isSelected = selectedSectorId === sec.sectorId;
                const stageBadgeStyle =
                  sec.rotationStage === 'leading'
                    ? 'bg-red-50 dark:bg-red-950/40 text-[#F04452]'
                    : sec.rotationStage === 'accumulating'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#059669]'
                      : sec.rotationStage === 'consolidating'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-[#8B95A1]';

                return (
                  <button
                    key={sec.sectorId}
                    type="button"
                    onClick={() => setSelectedSectorId(sec.sectorId)}
                    className={`p-3.5 rounded-2xl border text-left transition-all space-y-2.5 ${
                      isSelected
                        ? 'border-[#2563EB] bg-blue-50/40 dark:bg-blue-950/25 shadow-xs'
                        : 'border-[#EAEDF2] dark:border-[#262C36] bg-white dark:bg-[#161B22] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8] flex items-center gap-1.5">
                          <span>{sec.emoji}</span>
                          <span>{sec.name}</span>
                        </div>
                        <div className="text-[11px] text-[#8B95A1] mt-0.5">{sec.description}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${stageBadgeStyle}`}
                      >
                        {sec.rotationLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#EAEDF2] dark:border-[#262C36] text-xs tabular-nums">
                      <div>
                        <div className="text-[10px] text-[#8B95A1]">今日平均漲跌</div>
                        <div
                          className={`font-bold ${
                            sec.avgDailyChangePct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                          }`}
                        >
                          {sec.avgDailyChangePct >= 0 ? '▲ +' : '▼ '}
                          {sec.avgDailyChangePct}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#8B95A1]">60日波段動能</div>
                        <div
                          className={`font-bold ${
                            sec.avgMomentum60dPct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                          }`}
                        >
                          {sec.avgMomentum60dPct >= 0 ? '+' : ''}
                          {sec.avgMomentum60dPct}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#8B95A1]">資金成交佔比</div>
                        <div className="font-bold text-[#191F28] dark:text-white">
                          {sec.turnoverSharePct}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#4E5968] dark:text-[#9BA4B0] tabular-nums">
                      <span>
                        法人近5日：
                        <strong
                          className={
                            sec.netInstFlowLots >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                          }
                        >
                          {sec.netInstFlowLots >= 0 ? ' +' : ' '}
                          {sec.netInstFlowLots.toLocaleString()} 張
                        </strong>
                      </span>
                      <span>
                        領頭羊：{sec.topStocks[0]?.name} ({sec.topStocks[0]?.dailyChangePct >= 0 ? '+' : ''}
                        {sec.topStocks[0]?.dailyChangePct}%)
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 選中板塊之代表成分股明細 */}
          {(() => {
            const activeSec =
              sectorFlowStats.find((s) => s.sectorId === selectedSectorId) || sectorFlowStats[0];
            if (!activeSec) return null;

            return (
              <section className="toss-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#2563EB]" />
                    <h4 className="text-sm font-bold">
                      {activeSec.emoji} {activeSec.name} — 族群成分股強弱勢一覽
                    </h4>
                  </div>
                  <span className="text-xs text-[#8B95A1] tabular-nums">
                    族群平均 ROE {activeSec.avgRoePct}%
                  </span>
                </div>

                <div className="divide-y divide-[#EAEDF2] dark:divide-[#262C36]">
                  {activeSec.topStocks.map((st) => (
                    <div
                      key={st.symbol}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                            {st.name}
                          </span>
                          <span className="text-xs font-mono text-[#8B95A1]">{st.symbol}</span>
                          <span className="px-2 py-0.5 rounded bg-[#F0F2F6] dark:bg-[#1F2631] text-[10px] font-medium">
                            {st.subTheme}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#8B95A1] tabular-nums mt-0.5">
                          ROE {st.roePct}% · P/E {st.peRatio} · 月營收 YoY{' '}
                          <strong
                            className={st.revenueYoYPct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'}
                          >
                            {st.revenueYoYPct >= 0 ? '+' : ''}
                            {st.revenueYoYPct}%
                          </strong>{' '}
                          · 法人5日 {st.instNetBuy5dLots >= 0 ? '+' : ''}
                          {st.instNetBuy5dLots.toLocaleString()}張
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 tabular-nums">
                        <div className="text-right">
                          <div className="text-sm font-bold">
                            {st.market === 'US' ? 'USD ' : 'NT$ '}
                            {st.price.toLocaleString()}
                          </div>
                          <div
                            className={`text-xs font-bold ${
                              st.dailyChangePct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                            }`}
                          >
                            {st.dailyChangePct >= 0 ? '▲ +' : '▼ '}
                            {st.dailyChangePct}% (60日 {st.momentum60dPct >= 0 ? '+' : ''}
                            {st.momentum60dPct}%)
                          </div>
                        </div>

                        {(() => {
                          const existing = getWatchlistItem(st.symbol);
                          if (!existing) {
                            return (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleAddStockToWatchlist(st, `${activeSec.name}強勢股`, 'watching')}
                                  className="px-2 py-1 rounded-lg bg-[#F0F2F6] dark:bg-[#1F2631] hover:bg-[#E2E8F0] text-xs font-medium transition-colors"
                                  title="加入觀察清單"
                                >
                                  + 觀察
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddStockToWatchlist(st, `${activeSec.name}強勢股`, 'favorite')}
                                  className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-[#F04452] text-xs font-semibold transition-colors flex items-center gap-0.5"
                                  title="加入喜好清單"
                                >
                                  <Heart className="w-3 h-3 fill-current" />
                                  <span>喜好</span>
                                </button>
                              </div>
                            );
                          }

                          return (
                            <span className="text-[11px] font-semibold text-[#8B95A1] px-2 py-1 bg-[#F0F2F6] dark:bg-[#1F2631] rounded-lg">
                              {existing.listType === 'favorite' ? '❤️ 喜好' : '👁️ 觀察'}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}
        </div>
      )}

      {/* =====================================================================
          Sub-Tab 3: ⭐ 智能股票清單 (觀察清單 · 持股清單 · 喜好清單)
         ===================================================================== */}
      {subTab === 'watchlist' && (
        <div className="space-y-4">
          {/* 三分類導航列：觀察清單 / 持股清單 / 喜好清單 */}
          <div className="toss-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631]">
              <button
                type="button"
                onClick={() => setWatchlistCategory('watching')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  watchlistCategory === 'watching'
                    ? 'bg-white dark:bg-[#161B22] text-[#2563EB] shadow-2xs font-bold'
                    : 'text-[#4E5968] dark:text-[#9BA4B0] hover:text-[#191F28]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>觀察清單</span>
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[10px] tabular-nums">
                  {watchingStocks.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWatchlistCategory('holdings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  watchlistCategory === 'holdings'
                    ? 'bg-white dark:bg-[#161B22] text-[#2563EB] shadow-2xs font-bold'
                    : 'text-[#4E5968] dark:text-[#9BA4B0] hover:text-[#191F28]'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>持股清單</span>
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[10px] tabular-nums">
                  {securityHoldings.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWatchlistCategory('favorite')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  watchlistCategory === 'favorite'
                    ? 'bg-white dark:bg-[#161B22] text-[#F04452] shadow-2xs font-bold'
                    : 'text-[#4E5968] dark:text-[#9BA4B0] hover:text-[#191F28]'
                }`}
              >
                <Heart className="w-3.5 h-3.5 fill-current text-[#F04452]" />
                <span>喜好清單</span>
                <span className="px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-900/50 text-[10px] text-[#F04452] tabular-nums">
                  {favoriteStocks.length}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setWlListType(watchlistCategory === 'favorite' ? 'favorite' : 'watching');
                setShowAddWatch(!showAddWatch);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold flex items-center justify-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>新增標的</span>
            </button>
          </div>

          {/* 新增股票表單 */}
          {showAddWatch && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const p = Number(wlPrice);
                if (!wlSymbol || !wlName || p <= 0) return;

                upsertWatchlistItem({
                  id: `wl-${Date.now()}`,
                  symbol: wlSymbol.trim().toUpperCase(),
                  name: wlName.trim(),
                  sectorName: wlSector,
                  listType: wlListType,
                  addedPrice: p,
                  currentPrice: p,
                  targetBuyPrice: wlTargetBuy ? Number(wlTargetBuy) : undefined,
                  stopLossPrice: wlStopLoss ? Number(wlStopLoss) : undefined,
                  strategyTag: wlStrategyTag,
                  notes: wlNotes || undefined,
                  addedAt: new Date().toISOString(),
                });
                setWlSymbol('');
                setWlName('');
                setWlPrice('');
                setShowAddWatch(false);
              }}
              className="toss-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                  手動新增標的至 {wlListType === 'favorite' ? '❤️ 喜好清單' : '👁️ 觀察清單'}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="wlListType"
                      checked={wlListType === 'watching'}
                      onChange={() => setWlListType('watching')}
                    />
                    <span>觀察清單</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="wlListType"
                      checked={wlListType === 'favorite'}
                      onChange={() => setWlListType('favorite')}
                    />
                    <span>喜好清單</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="股票代號 (例: 2330.TW)"
                  value={wlSymbol}
                  onChange={(e) => setWlSymbol(e.target.value)}
                  className="toss-input uppercase font-mono"
                />
                <input
                  type="text"
                  required
                  placeholder="股票名稱 (例: 台積電)"
                  value={wlName}
                  onChange={(e) => setWlName(e.target.value)}
                  className="toss-input"
                />
                <select
                  value={wlSector}
                  onChange={(e) => setWlSector(e.target.value)}
                  className="toss-input"
                >
                  {STOCK_SECTORS.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.emoji} {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  required
                  step="any"
                  placeholder="目前股價"
                  value={wlPrice}
                  onChange={(e) => setWlPrice(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="理想買進價 (選填)"
                  value={wlTargetBuy}
                  onChange={(e) => setWlTargetBuy(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="紀律停損價 (選填)"
                  value={wlStopLoss}
                  onChange={(e) => setWlStopLoss(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <input
                  type="text"
                  placeholder="選股策略標籤"
                  value={wlStrategyTag}
                  onChange={(e) => setWlStrategyTag(e.target.value)}
                  className="toss-input"
                />
                <input
                  type="text"
                  placeholder="選股理由與觀察筆記"
                  value={wlNotes}
                  onChange={(e) => setWlNotes(e.target.value)}
                  className="toss-input col-span-2"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
              >
                儲存至{wlListType === 'favorite' ? '喜好清單' : '觀察清單'}
              </button>
            </form>
          )}

          {/* 分類 1: 持股清單 (Portfolio Holdings) */}
          {watchlistCategory === 'holdings' && (
            <div className="space-y-3">
              {/* 持股總結卡片 */}
              <div className="toss-card p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-[#161B22] border border-blue-100 dark:border-blue-900/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                      實體投資組合部位即時概況
                    </span>
                  </div>
                  <span className="text-xs text-[#8B95A1] tabular-nums">
                    共持有 {securityHoldings.length} 檔證券標的
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-blue-100 dark:border-blue-900/30">
                  <div>
                    <div className="text-[11px] text-[#8B95A1]">持倉總市值 (TWD)</div>
                    <div className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8] tabular-nums">
                      ${Math.round(portfolioStats.totalMarketValue).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#8B95A1]">總投資成本</div>
                    <div className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8] tabular-nums">
                      ${Math.round(portfolioStats.totalCost).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#8B95A1]">未實現損益</div>
                    <div
                      className={`text-base font-bold tabular-nums ${
                        portfolioStats.totalPnl >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                      }`}
                    >
                      {portfolioStats.totalPnl >= 0 ? '+$' : '-$'}
                      {Math.abs(Math.round(portfolioStats.totalPnl)).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#8B95A1]">整體未實現報酬率</div>
                    <div
                      className={`text-base font-bold tabular-nums ${
                        portfolioStats.totalReturnPct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                      }`}
                    >
                      {portfolioStats.totalReturnPct >= 0 ? '▲ +' : '▼ '}
                      {portfolioStats.totalReturnPct}%
                    </div>
                  </div>
                </div>
              </div>

              {securityHoldings.length === 0 ? (
                <div className="toss-card p-8 text-center text-[#8B95A1] text-xs">
                  目前資產庫中尚無持股部位，可在選股漏斗或資產中心直接買進標的。
                </div>
              ) : (
                securityHoldings.map((holding) => {
                  const wlItem = getWatchlistItem(holding.symbol);
                  return (
                    <div key={holding.id} className="toss-card p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                              {holding.name}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#F0F2F6] dark:bg-[#1F2631] text-xs font-mono text-[#4E5968] dark:text-[#9BA4B0]">
                              {holding.symbol}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-[10px] font-semibold text-[#2563EB] uppercase">
                              {holding.category} · {holding.currency}
                            </span>
                            {wlItem?.listType === 'favorite' && (
                              <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-[10px] font-semibold text-[#F04452] flex items-center gap-0.5">
                                <Heart className="w-2.5 h-2.5 fill-current" /> 喜好中
                              </span>
                            )}
                            {wlItem?.listType === 'watching' && (
                              <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-[10px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-0.5">
                                <Eye className="w-2.5 h-2.5" /> 觀察中
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#8B95A1] tabular-nums mt-1">
                            持有 {holding.units.toLocaleString()} 股 · 買入均價{' '}
                            {holding.currency === 'USD' ? 'USD ' : 'NT$ '}
                            {holding.costBasisPerUnit.toLocaleString()}
                          </div>
                        </div>

                        <div className="text-right tabular-nums">
                          <div className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8]">
                            ${Math.round(holding.marketValueTwd).toLocaleString()}{' '}
                            <span className="text-xs font-normal text-[#8B95A1]">TWD</span>
                          </div>
                          <div
                            className={`text-[11px] font-semibold ${
                              holding.unrealizedReturnPct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                            }`}
                          >
                            {holding.unrealizedReturnPct >= 0 ? '▲ +' : '▼ '}
                            {holding.unrealizedReturnPct}% (
                            {holding.unrealizedPnlTwd >= 0 ? '+$' : '-$'}
                            {Math.abs(Math.round(holding.unrealizedPnlTwd)).toLocaleString()})
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="text-[#8B95A1] tabular-nums">
                          現價：{holding.currency === 'USD' ? '$' : 'NT$ '}
                          {holding.currentPrice.toLocaleString()} · 殖利率約{' '}
                          {holding.estimatedAnnualYieldPct || 0}%
                        </div>

                        <div className="flex items-center gap-2">
                          {!wlItem ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  upsertWatchlistItem({
                                    id: `wl-${holding.symbol}-${Date.now()}`,
                                    symbol: holding.symbol,
                                    name: holding.name,
                                    sectorName: '既有持倉',
                                    listType: 'watching',
                                    addedPrice: holding.currentPrice,
                                    currentPrice: holding.currentPrice,
                                    strategyTag: '實體持股聯動',
                                    notes: `目前持股 ${holding.units} 股`,
                                    addedAt: new Date().toISOString(),
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-[#F0F2F6] dark:bg-[#1F2631] text-[11px] font-medium hover:text-[#2563EB]"
                              >
                                + 觀察
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  upsertWatchlistItem({
                                    id: `wl-${holding.symbol}-${Date.now()}`,
                                    symbol: holding.symbol,
                                    name: holding.name,
                                    sectorName: '既有持倉',
                                    listType: 'favorite',
                                    addedPrice: holding.currentPrice,
                                    currentPrice: holding.currentPrice,
                                    strategyTag: '實體持股聯動',
                                    notes: `核心持股 ${holding.units} 股`,
                                    addedAt: new Date().toISOString(),
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-[11px] font-semibold text-[#F04452] flex items-center gap-1"
                              >
                                <Heart className="w-3 h-3 fill-current" />
                                <span>加喜好</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                upsertWatchlistItem({
                                  ...wlItem,
                                  listType: wlItem.listType === 'favorite' ? 'watching' : 'favorite',
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-[#F0F2F6] dark:bg-[#1F2631] text-[11px] font-medium text-[#8B95A1]"
                            >
                              轉為{wlItem.listType === 'favorite' ? '觀察' : '喜好'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleBuyIntoPortfolio({
                                symbol: holding.symbol,
                                name: holding.name,
                                price: holding.currentPrice,
                                market: holding.currency === 'USD' ? 'US' : 'TW',
                                dividendYieldPct: holding.estimatedAnnualYieldPct,
                              })
                            }
                            className="px-3 py-1 rounded-lg bg-[#2563EB] text-white text-xs font-semibold"
                          >
                            加碼買進
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 分類 2 & 3: 觀察清單 (watching) 與 喜好清單 (favorite) */}
          {watchlistCategory !== 'holdings' && (
            <div className="space-y-3">
              {(() => {
                const targetList =
                  watchlistCategory === 'favorite' ? favoriteStocks : watchingStocks;

                if (targetList.length === 0) {
                  return (
                    <div className="toss-card p-8 text-center text-[#8B95A1] text-xs space-y-2">
                      <p>
                        目前{watchlistCategory === 'favorite' ? '「喜好清單」' : '「觀察清單」'}
                        中尚無標的。
                      </p>
                      <p className="text-[11px]">
                        可透過上方「新增標的」或在「智能選股漏斗」中點擊收藏快速納入。
                      </p>
                    </div>
                  );
                }

                return targetList.map((item) => {
                  const sinceAddedPct =
                    item.addedPrice > 0
                      ? Math.round(
                          ((item.currentPrice - item.addedPrice) / item.addedPrice) * 1000
                        ) / 10
                      : 0;
                  const isInBuyZone =
                    typeof item.targetBuyPrice === 'number' &&
                    item.currentPrice <= item.targetBuyPrice;
                  const isStopLoss =
                    typeof item.stopLossPrice === 'number' &&
                    item.currentPrice <= item.stopLossPrice;
                  const isHeld = isHeldInPortfolio(item.symbol);

                  return (
                    <div key={item.id} className="toss-card p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                              {item.name}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#F0F2F6] dark:bg-[#1F2631] text-xs font-mono text-[#4E5968] dark:text-[#9BA4B0]">
                              {item.symbol}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-[10px] font-semibold text-[#2563EB]">
                              {item.sectorName}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                              {item.strategyTag}
                            </span>
                            {item.listType === 'favorite' ? (
                              <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-[10px] font-bold text-[#F04452] flex items-center gap-0.5">
                                <Heart className="w-2.5 h-2.5 fill-current" /> 喜好
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1F2631] text-[10px] font-medium text-[#4E5968] dark:text-[#9BA4B0] flex items-center gap-0.5">
                                <Eye className="w-2.5 h-2.5" /> 觀察
                              </span>
                            )}
                            {isHeld && (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-bold text-[#059669]">
                                💼 持倉中
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <div className="text-xs text-[#4E5968] dark:text-[#9BA4B0] mt-1">
                              {item.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right tabular-nums">
                            <div className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8]">
                              ${item.currentPrice.toLocaleString()}
                            </div>
                            <div
                              className={`text-[11px] font-semibold ${
                                sinceAddedPct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                              }`}
                            >
                              納入後 {sinceAddedPct >= 0 ? '▲ +' : '▼ '}
                              {sinceAddedPct}%
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteWatchlistItem(item.id)}
                            className="p-1 text-[#8B95A1] hover:text-[#F04452]"
                            title="從清單移除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                        <div className="flex flex-wrap items-center gap-3">
                          {item.targetBuyPrice && (
                            <span
                              className={
                                isInBuyZone
                                  ? 'font-bold text-[#059669]'
                                  : 'text-[#4E5968] dark:text-[#9BA4B0]'
                              }
                            >
                              🎯 理想買點：${item.targetBuyPrice.toLocaleString()}{' '}
                              {isInBuyZone ? '(已達擊球區！)' : ''}
                            </span>
                          )}
                          {item.stopLossPrice && (
                            <span
                              className={
                                isStopLoss ? 'font-bold text-[#F04452]' : 'text-[#8B95A1]'
                              }
                            >
                              🛡️ 紀律停損：${item.stopLossPrice.toLocaleString()}{' '}
                              {isStopLoss ? '(觸發停損警戒！)' : ''}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              upsertWatchlistItem({
                                ...item,
                                listType: item.listType === 'favorite' ? 'watching' : 'favorite',
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-[#F0F2F6] dark:bg-[#1F2631] text-[11px] font-semibold text-[#4E5968] dark:text-[#9BA4B0] hover:text-[#2563EB]"
                          >
                            {item.listType === 'favorite' ? '轉為觀察' : '轉為喜好'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleBuyIntoPortfolio({
                                symbol: item.symbol,
                                name: item.name,
                                price: item.currentPrice,
                              })
                            }
                            className="px-3 py-1 rounded-lg bg-[#2563EB] text-white text-xs font-semibold"
                          >
                            買進轉入持倉
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          Sub-Tab 4: 📖 選股四大面向與進階量化策略實戰指南
         ===================================================================== */}
      {subTab === 'guide' && (
        <div className="space-y-4">
          {/* 一、選股四大核心面向 */}
          <section className="toss-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#2563EB]" />
              <h3 className="text-sm sm:text-base font-bold">
                一、選股的四大核心面向 (FinLab 實戰框架)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] space-y-1.5">
                <div className="font-bold text-[#191F28] dark:text-white">
                  1. 基本面（看體質與價值）
                </div>
                <div className="text-[#4E5968] dark:text-[#9BA4B0] leading-relaxed">
                  • <strong>ROE &gt; 15%</strong>：衡量公司替股東賺錢的真實效率。
                  <br />• <strong>P/E 與 P/B 防價值陷阱</strong>：單買最低本益比容易踩到衰退景氣循環股（如塑化衰退期），必須搭配營收成長與毛利率過濾。
                  <br />• <strong>自由現金流為正</strong>：確保帳上獲利有真金白銀流入。
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] space-y-1.5">
                <div className="font-bold text-[#191F28] dark:text-white">
                  2. 技術面（看趨勢與進場時機）
                </div>
                <div className="text-[#4E5968] dark:text-[#9BA4B0] leading-relaxed">
                  • <strong>均線多頭（MA60 / MA240）</strong>：站上季線與年線代表中長期成本結構偏多。
                  <br />• <strong>60日/120日價格動能</strong>：強者恆強，挑選漲幅領先大盤的強勢股。
                  <br />• <strong>低波動度因子</strong>：有效壓低整體投資組合的最大回撤（MDD）。
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] space-y-1.5">
                <div className="font-bold text-[#191F28] dark:text-white">
                  3. 籌碼面（看大戶與法人動向）
                </div>
                <div className="text-[#4E5968] dark:text-[#9BA4B0] leading-relaxed">
                  • <strong>三大法人連續買超</strong>：確認外資、投信、自營商是否站在買方。
                  <br />• <strong>投信作帳與認養</strong>：投信研究團隊深入拜訪後積極買超的中大型成長股，常具季底爆發力。
                  <br />• <strong>千張大戶與融資健康度</strong>：大戶增持、融資不暴增才具續航力。
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] space-y-1.5">
                <div className="font-bold text-[#191F28] dark:text-white">
                  4. 消息面與成長動能（看轉折）
                </div>
                <div className="text-[#4E5968] dark:text-[#9BA4B0] leading-relaxed">
                  • <strong>月營收年增率（YoY &gt; 0）</strong>：每月 10 日前公佈，是台股最獨特且領先季報的高頻基本面指標。
                  <br />• <strong>法說會展望與主流題材</strong>：鎖定 CoWoS、水冷散熱、CPO 矽光子、強韌電網等結構性成長浪潮。
                </div>
              </div>
            </div>
          </section>

          {/* 二、額外分享的高勝率複合選股策略 */}
          <section className="toss-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#2563EB]" />
              <h3 className="text-sm sm:text-base font-bold">
                二、為你額外設計的 5 套進階複合策略與換股紀律
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              {QUANT_STRATEGIES.map((st) => (
                <div
                  key={st.id}
                  className="p-3.5 rounded-xl border border-[#EAEDF2] dark:border-[#262C36] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-[#191F28] dark:text-white flex items-center gap-2">
                      <span>{st.name}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-[10px] text-[#2563EB]">
                        {st.rebalanceCycle}
                      </span>
                    </div>
                    <p className="text-[#4E5968] dark:text-[#9BA4B0] leading-relaxed">
                      {st.logicDetail}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectStrategy(st.id);
                      setSubTab('screener');
                    }}
                    className="px-3 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold shrink-0 flex items-center gap-1"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>套用此策略</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
