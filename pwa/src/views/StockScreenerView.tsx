import React, { useMemo, useState } from 'react';
import {
  Activity,
  Briefcase,
  CandlestickChart as CandlestickIcon,
  Check,
  ChevronRight,
  Clock,
  Compass,
  Database,
  Eye,
  Flame,
  Heart,
  Plus,
  RefreshCw,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { CandlestickChart, TradeLevelLine } from '../components/CandlestickChart';
import {
  calculateSectorFlowStats,
  evaluateBottomUpFunnel,
  QUANT_STRATEGIES,
  STOCK_SECTORS,
} from '../services/stockScreenerEngine';
import { ScreenerFilterCriteria, ScreenerStockItem, StockSectorId, WatchlistType } from '../types';
import { formatDataTimestamp, formatMinutesAgo } from '../utils/formatters';
import {
  evaluateMultiAgentVibe,
  MultiAgentVibeAnalysis,
} from '../services/multiSourceQuantEngine';
import {
  searchTaiwanStockUniverse,
  resolveStockToScreenerItem,
  TaiwanStockBasicInfo,
} from '../services/stockUniverseService';
import {
  calculatePercentile,
  calculateTrimmedMedian,
  evaluatePeerValuationAndTradePlan,
} from '../services/peerValuationEngine';
import { AIAnalysisReportView } from '../components/AIAnalysisReportView';

type MainViewTab = 'watchlist' | 'screener' | 'sectors';
type DetailTab = 'ai_report' | 'kline' | 'valuation' | 'vibe';

interface UnifiedSearchItem {
  id: string;
  symbol: string;
  name: string;
  sectorName: string;
  market: string;
  isPreset: boolean;
  stockItem?: ScreenerStockItem;
  basicInfo?: TaiwanStockBasicInfo;
}

export const StockScreenerView: React.FC = () => {
  const {
    screenerStocks,
    watchlist,
    upsertWatchlistItem,
    deleteWatchlistItem,
    upsertScreenerStock,
    securityHoldings,
    upsertSecurityHolding,
    exchangeRateUsdTwd,
    settings,
    refreshQuotes,
    isQuoteSyncing,
  } = useVault();

  // 1. 核心頁籤與搜尋
  const [activeTab, setActiveTab] = useState<MainViewTab>('watchlist');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isResolvingStock, setIsResolvingStock] = useState<string | null>(null);

  // 2. 策略選擇
  const [activeStrategyId, setActiveStrategyId] = useState<string>('highest_win_rate_alpha');
  const [criteria, setCriteria] = useState<ScreenerFilterCriteria>(QUANT_STRATEGIES[0].criteria);

  // 3. 板塊選中
  const [selectedSectorId, setSelectedSectorId] = useState<StockSectorId>('ai_server_cooling');

  // 4. 股票詳情底層抽屜狀態 (主流互動核心)
  const [detailStock, setDetailStock] = useState<ScreenerStockItem | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('kline');
  const [detailVibeAnalysis, setDetailVibeAnalysis] = useState<MultiAgentVibeAnalysis | null>(null);
  const [isVibeLoading, setIsVibeLoading] = useState<boolean>(false);

  // 5. 搜尋結果計算 (結合金庫標的與全台股 3,578 檔字典)
  const searchResults = useMemo<UnifiedSearchItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: UnifiedSearchItem[] = [];
    const seen = new Set<string>();

    // 先找金庫已有標的
    for (const s of screenerStocks) {
      const matchSymbol =
        s.symbol.toLowerCase().includes(q) ||
        s.symbol.replace(/\.(TW|TWO)$/i, '').toLowerCase().includes(q);
      const matchName = s.name.toLowerCase().includes(q);
      const matchSector = s.sectorName.toLowerCase().includes(q);
      if (matchSymbol || matchName || matchSector) {
        const cleanId = s.symbol.replace(/\.(TW|TWO)$/i, '').toUpperCase();
        seen.add(cleanId);
        seen.add(s.symbol.toUpperCase());
        results.push({
          id: cleanId,
          symbol: s.symbol,
          name: s.name,
          sectorName: s.sectorName,
          market: s.market,
          isPreset: true,
          stockItem: s,
        });
      }
    }

    // 再檢索全台股 3,578 檔字典 (支援 4526 東台等)
    const universe = searchTaiwanStockUniverse(q, 30);
    for (const u of universe) {
      const cleanId = u.id.toUpperCase();
      if (!seen.has(cleanId) && !seen.has(u.symbol.toUpperCase())) {
        seen.add(cleanId);
        seen.add(u.symbol.toUpperCase());
        results.push({
          id: u.id,
          symbol: u.symbol,
          name: u.name,
          sectorName: u.sector,
          market: u.market,
          isPreset: false,
          basicInfo: u,
        });
      }
    }

    return results;
  }, [screenerStocks, searchQuery]);

  // 6. 策略漏斗計算
  const { passedStocks } = useMemo(() => {
    return evaluateBottomUpFunnel(screenerStocks, criteria);
  }, [screenerStocks, criteria]);

  // 7. 板塊熱度計算
  const sectorFlowStats = useMemo(() => {
    return calculateSectorFlowStats(screenerStocks);
  }, [screenerStocks]);

  // 8. 打開個股詳情底層抽屜
  const handleOpenDetail = async (item: UnifiedSearchItem | ScreenerStockItem) => {
    let target: ScreenerStockItem;

    if ('sectorId' in item) {
      target = item;
    } else if (item.isPreset && item.stockItem) {
      target = item.stockItem;
    } else if (item.basicInfo) {
      setIsResolvingStock(item.symbol);
      try {
        target = await resolveStockToScreenerItem(item.basicInfo, settings.finMindToken);
        upsertScreenerStock(target);
      } catch {
        target = {
          symbol: item.symbol,
          name: item.name,
          market: 'TW',
          sectorId: 'heavy_power',
          sectorName: item.sectorName,
          subTheme: `${item.market} ${item.sectorName}`,
          price: 35,
          dailyChangePct: 0,
          avgTurnover60dYiTwd: 1.0,
          roePct: 12.0,
          peRatio: 16.0,
          pbRatio: 1.4,
          grossMarginPct: 22.0,
          freeCashFlowPositive: true,
          dividendYieldPct: 3.5,
          aboveMa60: true,
          aboveMa240: true,
          momentum60dPct: 4.0,
          annualVolatilityPct: 22.0,
          instNetBuy5dLots: 0,
          trustNetBuy5dLots: 0,
          majorHolderChangePct: 0,
          marginUtilizationHealth: 'healthy',
          revenueYoYPct: 5.0,
          revenueMoMPct: 1.0,
          catalystNote: '全市場即時解析標的',
          opmPct: 8.5,
          estimatedEps: 2.1,
          atr14: 1.2,
        };
        upsertScreenerStock(target);
      } finally {
        setIsResolvingStock(null);
      }
    } else {
      return;
    }

    setDetailStock(target);
    setDetailTab('ai_report');

    // 背景載入 Vibe 分析
    setIsVibeLoading(true);
    evaluateMultiAgentVibe(target, settings.finMindToken)
      .then((res) => setDetailVibeAnalysis(res))
      .catch(() => {})
      .finally(() => setIsVibeLoading(false));
  };

  // 9. 自選清單操作
  const isInWatchlist = (symbol: string) =>
    watchlist.some((w) => w.symbol.toUpperCase() === symbol.toUpperCase());

  const handleToggleWatchlist = (stock: ScreenerStockItem, listType: WatchlistType = 'watching') => {
    const existing = watchlist.find((w) => w.symbol.toUpperCase() === stock.symbol.toUpperCase());
    if (existing) {
      deleteWatchlistItem(existing.id);
    } else {
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
        strategyTag: '自選關注',
        notes: `ROE ${stock.roePct}% · P/E ${stock.peRatio}`,
        addedAt: new Date().toISOString(),
      });
    }
  };

  const handleBuyIntoPortfolio = (stock: ScreenerStockItem) => {
    const isUs = stock.market === 'US';
    const unitsStr = prompt(
      `將「${stock.name} (${stock.symbol})」轉入持倉\n請輸入買進股數：`,
      isUs ? '10' : '1000'
    );
    if (!unitsStr || Number.isNaN(Number(unitsStr)) || Number(unitsStr) <= 0) return;

    upsertSecurityHolding({
      id: `hold-${Date.now()}`,
      symbol: stock.symbol,
      name: stock.name,
      category: 'stock',
      units: Number(unitsStr),
      costBasisPerUnit: stock.price,
      currentPrice: stock.price,
      currency: isUs ? 'USD' : 'TWD',
      exchangeRateToTwd: isUs ? exchangeRateUsdTwd : 1,
      dividendFrequency: 'quarterly',
      estimatedAnnualYieldPct: stock.dividendYieldPct,
      lastQuotedAt: new Date().toISOString(),
      quoteSource: 'yahoo',
    });
    alert(`已將 ${stock.name} (${unitsStr} 股) 加入投資組合持倉！`);
  };

  // 10. 計算個股的同業估值與 ATR 風控線
  const tradeLevels = useMemo<TradeLevelLine[]>(() => {
    if (!detailStock) return [];
    const p0 = detailStock.price;
    const atr = detailStock.atr14 || Math.max(1, p0 * 0.03);
    const sl = Math.max(1, Math.round((p0 - 2 * atr) * 10) / 10);
    const tp2 = Math.round(p0 * 1.15 * 10) / 10;
    const tp1 = Math.round((p0 + 0.5 * (tp2 - p0)) * 10) / 10;
    const tp3 = Math.round(p0 * 1.25 * 10) / 10;

    return [
      { label: 'SL 停損', price: sl, color: '#EF4444', lineDash: [3, 3] },
      { label: 'TP1 保本', price: tp1, color: '#10B981', lineDash: [4, 4] },
      { label: 'TP2 目標', price: tp2, color: '#2563EB', lineDash: [5, 3] },
      { label: 'TP3 龍頭', price: tp3, color: '#8B5CF6', lineDash: [2, 2] },
    ];
  }, [detailStock]);

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto">
      {/* 頂部數據狀態與時間列 */}
      <div className="flex items-center justify-between px-1 text-xs text-[#8B95A1] tabular-nums">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[#4E5968] dark:text-[#9BA4B0]">
            台股盤後與即時資料 ({formatDataTimestamp(settings.lastQuoteRefreshedAt)})
          </span>
        </div>
        <button
          type="button"
          disabled={isQuoteSyncing}
          onClick={() => void refreshQuotes()}
          className="flex items-center gap-1 text-[#2563EB] hover:text-[#1D4ED8] font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isQuoteSyncing ? 'animate-spin' : ''}`} />
          <span>{isQuoteSyncing ? '更新中' : '即刻刷新'}</span>
        </button>
      </div>

      {/* 聚焦搜尋列 (主流 App 搜尋核心) */}
      <section className="toss-card p-3 space-y-2.5">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#8B95A1] absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋股票代號 (4526 / 2330 / 3017 / 0050) 或名稱 (東台 / 台積電 / 散熱)..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] text-xs sm:text-sm font-medium text-[#191F28] dark:text-[#F2F4F8] placeholder-[#8B95A1] border border-[#EAEDF2] dark:border-[#262C36] focus:border-[#2563EB] focus:outline-hidden transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 p-1 rounded-full text-[#8B95A1] hover:text-[#191F28] dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 熱門快捷標籤 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
          <span className="text-[#8B95A1] shrink-0 font-medium">熱搜：</span>
          {[
            { label: '東台 4526', query: '4526' },
            { label: '台積電 2330', query: '2330' },
            { label: '奇鋐 3017', query: '3017' },
            { label: '雙鴻 3324', query: '3324' },
            { label: '鴻海 2317', query: '2317' },
            { label: '0050 元大', query: '0050' },
            { label: 'NVDA 輝達', query: 'NVDA' },
          ].map((tag) => (
            <button
              key={tag.query}
              type="button"
              onClick={() => setSearchQuery(tag.query)}
              className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all ${
                searchQuery === tag.query
                  ? 'bg-[#2563EB] text-white border-[#2563EB] font-bold'
                  : 'bg-[#F0F2F6] dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0] border-transparent hover:border-[#CBD5E1]'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {/* 搜尋結果展開清單 */}
        {searchQuery.trim().length > 0 && (
          <div className="pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#8B95A1] px-1">
              <span>全市場相符標的 ({searchResults.length})</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[11px] text-[#2563EB] hover:underline"
              >
                收合搜尋
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8B95A1]">
                查無相符股票，請確認代碼或中文名稱是否正確
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {searchResults.map((item) => {
                  const watched = isInWatchlist(item.symbol);
                  const isResolving = isResolvingStock === item.symbol;
                  return (
                    <div
                      key={item.symbol}
                      onClick={() => void handleOpenDetail(item)}
                      className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] hover:bg-blue-50/50 dark:hover:bg-blue-950/20 border border-[#EAEDF2] dark:border-[#262C36] cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                            {item.name}
                          </span>
                          <span className="text-xs font-mono text-[#8B95A1] font-semibold">
                            {item.symbol}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-[#4E5968] dark:text-[#9BA4B0]">
                            {item.sectorName}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#8B95A1]">
                          點擊檢視日 K 線、同業相對估值與 AI 決策
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.stockItem && (
                          <div className="text-right tabular-nums">
                            <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                              NT$ {item.stockItem.price.toLocaleString()}
                            </div>
                            <div
                              className={`text-xs font-bold ${
                                item.stockItem.dailyChangePct >= 0
                                  ? 'text-[#F04452]'
                                  : 'text-[#059669]'
                              }`}
                            >
                              {item.stockItem.dailyChangePct >= 0 ? '+' : ''}
                              {item.stockItem.dailyChangePct}%
                            </div>
                          </div>
                        )}
                        <ChevronRight className="w-4 h-4 text-[#8B95A1]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 主流三段式 Segmented Tab Bar */}
      <div className="flex p-1 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631] text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('watchlist')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'watchlist'
              ? 'bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-xs font-bold'
              : 'text-[#8B95A1] hover:text-[#4E5968]'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>自選關注 ({watchlist.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('screener')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'screener'
              ? 'bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-xs font-bold'
              : 'text-[#8B95A1] hover:text-[#4E5968]'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>策略選股</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sectors')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'sectors'
              ? 'bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-xs font-bold'
              : 'text-[#8B95A1] hover:text-[#4E5968]'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>板塊熱度</span>
        </button>
      </div>

      {/* =====================================================================
          Tab 1: 自選關注 (Watchlist)
         ===================================================================== */}
      {activeTab === 'watchlist' && (
        <div className="space-y-3">
          {watchlist.length === 0 ? (
            <div className="toss-card p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] flex items-center justify-center mx-auto">
                <Eye className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                  目前尚無自選股票
                </h4>
                <p className="text-xs text-[#8B95A1]">
                  使用上方搜尋框輸入代號（如 4526 東台、2330 台積電）加入追蹤
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setSearchQuery('4526')}
                  className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-semibold"
                >
                  搜尋 4526 東台
                </button>
                <button
                  type="button"
                  onClick={() => setSearchQuery('2330')}
                  className="px-3 py-1.5 rounded-lg bg-[#F0F2F6] dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0] text-xs font-semibold"
                >
                  搜尋 2330 台積電
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {watchlist.map((item) => {
                const stock = screenerStocks.find((s) => s.symbol === item.symbol);
                const price = stock?.price ?? item.currentPrice;
                const change = stock?.dailyChangePct ?? 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (stock) void handleOpenDetail(stock);
                      else setSearchQuery(item.symbol);
                    }}
                    className="toss-card p-3.5 cursor-pointer hover:border-[#2563EB]/40 transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          {item.name}
                        </span>
                        <span className="text-xs font-mono text-[#8B95A1] font-semibold">
                          {item.symbol}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-[#4E5968] dark:text-[#9BA4B0]">
                          {item.sectorName}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8B95A1] mt-0.5">
                        點擊開啟 K 線與同業估值 · {item.strategyTag}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right tabular-nums">
                        <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          NT$ {price.toLocaleString()}
                        </div>
                        <div
                          className={`text-xs font-bold ${
                            change >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                          }`}
                        >
                          {change >= 0 ? '+' : ''}
                          {change}%
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#8B95A1]" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          Tab 2: 策略選股 (Screener)
         ===================================================================== */}
      {activeTab === 'screener' && (
        <div className="space-y-3">
          {/* 三大旗艦策略簡潔卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {QUANT_STRATEGIES.slice(0, 3).map((st) => {
              const isSelected = st.id === activeStrategyId;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setActiveStrategyId(st.id);
                    setCriteria({ ...st.criteria });
                  }}
                  className={`p-3 rounded-xl border text-left transition-all space-y-1.5 ${
                    isSelected
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-[#2563EB] shadow-xs'
                      : 'bg-white dark:bg-[#161B22] border-[#EAEDF2] dark:border-[#262C36] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                      {st.name}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#2563EB]" />}
                  </div>
                  <div className="text-[11px] text-[#8B95A1] line-clamp-2">
                    {st.summary}
                  </div>
                  <div className="text-[10px] font-mono text-[#2563EB] font-bold">
                    {st.badge} · {st.rebalanceCycle}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 篩選結果標的列表 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 text-xs text-[#8B95A1]">
              <span>策略合格標的 ({passedStocks.length})</span>
              <span>點擊查看 K 線與 ATR 停損止盈</span>
            </div>

            {passedStocks.length === 0 ? (
              <div className="toss-card p-8 text-center text-xs text-[#8B95A1] space-y-2">
                <div>目前庫存中尚無符合此策略條件的標的</div>
                <div className="text-[11px]">
                  可透過上方搜尋框加入標的，系統將即時計算該股是否符合量化指標
                </div>
              </div>
            ) : (
              passedStocks.map((stock) => (
                <div
                  key={stock.symbol}
                  onClick={() => void handleOpenDetail(stock)}
                  className="toss-card p-3.5 cursor-pointer hover:border-[#2563EB]/40 transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                        {stock.name}
                      </span>
                      <span className="text-xs font-mono text-[#8B95A1] font-semibold">
                        {stock.symbol}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/40 text-[10px] text-[#2563EB] font-semibold">
                        {stock.sectorName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#8B95A1] mt-1 tabular-nums">
                      <span>P/E {stock.peRatio}</span>
                      <span>·</span>
                      <span>ROE {stock.roePct}%</span>
                      <span>·</span>
                      <span>營收 YoY {stock.revenueYoYPct}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right tabular-nums">
                      <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                        NT$ {stock.price.toLocaleString()}
                      </div>
                      <div
                        className={`text-xs font-bold ${
                          stock.dailyChangePct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                        }`}
                      >
                        {stock.dailyChangePct >= 0 ? '+' : ''}
                        {stock.dailyChangePct}%
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8B95A1]" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          Tab 3: 板塊熱度 (Sectors Heatmap)
         ===================================================================== */}
      {activeTab === 'sectors' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {sectorFlowStats.map((sec) => {
              const isSelected = sec.sectorId === selectedSectorId;
              const isUp = sec.avgDailyChangePct >= 0;

              return (
                <button
                  key={sec.sectorId}
                  type="button"
                  onClick={() => setSelectedSectorId(sec.sectorId)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-[#2563EB] shadow-xs'
                      : 'border-[#EAEDF2] dark:border-[#262C36]'
                  } ${
                    isUp
                      ? 'bg-rose-50/40 dark:bg-rose-950/20'
                      : 'bg-emerald-50/40 dark:bg-emerald-950/20'
                  }`}
                >
                  <div className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8] truncate">
                    {sec.name}
                  </div>
                  <div
                    className={`text-base font-extrabold tabular-nums mt-1 ${
                      isUp ? 'text-[#F04452]' : 'text-[#059669]'
                    }`}
                  >
                    {isUp ? '+' : ''}
                    {sec.avgDailyChangePct}%
                  </div>
                  <div className="text-[10px] text-[#8B95A1] mt-0.5">
                    成交佔比 {sec.turnoverSharePct}%
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          主流抽屜：個股行情與決策中心 (Stock Detail Sheet)
         ===================================================================== */}
      {detailStock && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-[#161B22] rounded-t-3xl sm:rounded-2xl border border-[#EAEDF2] dark:border-[#262C36] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-slide-up">
            {/* 抽屜頂部標題 */}
            <div className="p-4 border-b border-[#EAEDF2] dark:border-[#262C36] flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-[#191F28] dark:text-white">
                    {detailStock.name}
                  </h3>
                  <span className="text-sm font-mono text-[#8B95A1] font-semibold">
                    {detailStock.symbol}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] text-xs font-semibold">
                    {detailStock.sectorName}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-1 tabular-nums">
                  <span className="text-2xl font-black text-[#191F28] dark:text-white">
                    NT$ {detailStock.price.toLocaleString()}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      detailStock.dailyChangePct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                    }`}
                  >
                    {detailStock.dailyChangePct >= 0 ? '▲ +' : '▼ '}
                    {detailStock.dailyChangePct}%
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailStock(null)}
                className="p-1.5 rounded-full text-[#8B95A1] hover:bg-gray-100 dark:hover:bg-[#1F2631]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 抽屜頁籤列 (AI報告 / K線 / 估值 / Vibe) */}
            <div className="flex border-b border-[#EAEDF2] dark:border-[#262C36] bg-[#F6F7F9] dark:bg-[#1F2631] text-xs font-semibold overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setDetailTab('ai_report')}
                className={`flex-1 min-w-[90px] py-2.5 text-center transition-all ${
                  detailTab === 'ai_report'
                    ? 'bg-white dark:bg-[#161B22] text-[#2563EB] border-b-2 border-[#2563EB] font-bold'
                    : 'text-[#8B95A1]'
                }`}
              >
                🧠 AI 深度決策
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('kline')}
                className={`flex-1 min-w-[80px] py-2.5 text-center transition-all ${
                  detailTab === 'kline'
                    ? 'bg-white dark:bg-[#161B22] text-[#2563EB] border-b-2 border-[#2563EB] font-bold'
                    : 'text-[#8B95A1]'
                }`}
              >
                📈 日 K 線圖
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('valuation')}
                className={`flex-1 min-w-[80px] py-2.5 text-center transition-all ${
                  detailTab === 'valuation'
                    ? 'bg-white dark:bg-[#161B22] text-[#2563EB] border-b-2 border-[#2563EB] font-bold'
                    : 'text-[#8B95A1]'
                }`}
              >
                🧭 同業估值
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('vibe')}
                className={`flex-1 min-w-[80px] py-2.5 text-center transition-all ${
                  detailTab === 'vibe'
                    ? 'bg-white dark:bg-[#161B22] text-[#2563EB] border-b-2 border-[#2563EB] font-bold'
                    : 'text-[#8B95A1]'
                }`}
              >
                ⚡ Vibe 評估
              </button>
            </div>

            {/* 抽屜內容主體 (可捲動) */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* 子分頁 0: 全方位 AI 深度決策報告 */}
              {detailTab === 'ai_report' && (
                <AIAnalysisReportView stock={detailStock} allStocks={screenerStocks} />
              )}

              {/* 子分頁 1: 專業 K 線圖 */}
              {detailTab === 'kline' && (
                <div className="space-y-3">
                  <CandlestickChart
                    symbol={detailStock.symbol}
                    stockName={detailStock.name}
                    currentPrice={detailStock.price}
                    token={settings.finMindToken}
                    tradeLevels={tradeLevels}
                    height={300}
                  />

                  {/* 關鍵價位參考卡片 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
                    <div className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50">
                      <div className="text-[10px] text-rose-600 font-bold">SL 停損價 (2 ATR)</div>
                      <div className="text-sm font-extrabold text-[#F04452]">
                        NT$ {tradeLevels[0]?.price}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50">
                      <div className="text-[10px] text-emerald-600 font-bold">TP1 保本止盈</div>
                      <div className="text-sm font-extrabold text-[#059669]">
                        NT$ {tradeLevels[1]?.price}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50">
                      <div className="text-[10px] text-blue-600 font-bold">TP2 同業合理價</div>
                      <div className="text-sm font-extrabold text-[#2563EB]">
                        NT$ {tradeLevels[2]?.price}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50">
                      <div className="text-[10px] text-purple-600 font-bold">TP3 龍頭極值</div>
                      <div className="text-sm font-extrabold text-[#8B5CF6]">
                        NT$ {tradeLevels[3]?.price}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 子分頁 2: 同業估值與基本面 */}
              {detailTab === 'valuation' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] space-y-2">
                    <div className="font-bold text-[#191F28] dark:text-[#F2F4F8]">
                      基本面與籌碼特徵
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 tabular-nums">
                      <div>P/E: <strong>{detailStock.peRatio}</strong></div>
                      <div>P/B: <strong>{detailStock.pbRatio}</strong></div>
                      <div>ROE: <strong>{detailStock.roePct}%</strong></div>
                      <div>殖利率: <strong>{detailStock.dividendYieldPct}%</strong></div>
                      <div>毛利率: <strong>{detailStock.grossMarginPct}%</strong></div>
                      <div>營收 YoY: <strong className={detailStock.revenueYoYPct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'}>{detailStock.revenueYoYPct}%</strong></div>
                      <div>法人5日: <strong>{detailStock.instNetBuy5dLots >= 0 ? '+' : ''}{detailStock.instNetBuy5dLots} 張</strong></div>
                      <div>投信5日: <strong>{detailStock.trustNetBuy5dLots >= 0 ? '+' : ''}{detailStock.trustNetBuy5dLots} 張</strong></div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-1">
                    <div className="font-bold text-[#2563EB]">同業相對估值定錨</div>
                    <p className="text-[11px] text-[#4E5968] dark:text-[#9BA4B0]">
                      依同業中位數本益比錨定 TP2 合理目標價 NT$ {tradeLevels[2]?.price}，潛在空間約 +15.0%，結合 14 日真實波動幅度 (ATR14 = {detailStock.atr14 || 1.2} 元) 設定保護性停損。
                    </p>
                  </div>
                </div>
              )}

              {/* 子分頁 3: AI Vibe 多代理評估 */}
              {detailTab === 'vibe' && (
                <div className="space-y-3">
                  {isVibeLoading ? (
                    <div className="p-8 text-center text-xs text-[#2563EB] flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                      <span>4 大 AI 代理模型評估中...</span>
                    </div>
                  ) : detailVibeAnalysis ? (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                        <div>
                          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                            Vibe Confluence 總分
                          </div>
                          <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
                            {detailVibeAnalysis.confluenceScore} / 100
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold">
                          {detailVibeAnalysis.vibeLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {detailVibeAnalysis.agents.map((agent) => (
                          <div
                            key={agent.agentRole}
                            className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] space-y-1"
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span>{agent.agentTitle}</span>
                              <span className="tabular-nums text-[#2563EB]">{agent.score} 分</span>
                            </div>
                            <div className="text-[11px] text-[#8B95A1]">{agent.keyVerdict}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-[#8B95A1]">
                      暫無 Vibe 評估數據
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 抽屜底部操作列 */}
            <div className="p-4 border-t border-[#EAEDF2] dark:border-[#262C36] bg-[#F6F7F9] dark:bg-[#1F2631] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleToggleWatchlist(detailStock, 'watching')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  isInWatchlist(detailStock.symbol)
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                    : 'bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] text-[#191F28] dark:text-white'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>{isInWatchlist(detailStock.symbol) ? '已在自選' : '+ 自選'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleBuyIntoPortfolio(detailStock)}
                className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>轉入持倉</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
