import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  Bookmark,
  CandlestickChart as CandlestickIcon,
  Check,
  ChevronRight,
  Compass,
  Database,
  Eye,
  Flame,
  Layers,
  Network,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { CandlestickChart, TradeLevelLine } from '../components/CandlestickChart';
import {
  calculateSectorFlowStats,
  evaluateBottomUpFunnel,
  getMarketRankings,
  MARKET_RANKING_CATEGORIES,
  MarketRankingType,
  QUANT_STRATEGIES,
  SectorFlowSummary,
} from '../services/stockScreenerEngine';
import {
  ScreenerFilterCriteria,
  ScreenerStockItem,
  StockSectorId,
  WatchlistType,
  WatchlistStockItem,
} from '../types';
import { formatDataTimestamp } from '../utils/formatters';
import {
  searchTaiwanStockUniverse,
  resolveStockToScreenerItem,
  TaiwanStockBasicInfo,
} from '../services/stockUniverseService';
import {
  getAllIndustryGroups,
  getAllConceptGroups,
  getFilteredStocksInGroup,
  getSubCategoriesForGroup,
  IndustryGroupMeta,
  SubCategoryMeta,
} from '../services/industryUniverseService';
import { AIAnalysisReportView } from '../components/AIAnalysisReportView';
import { IndustryMapView } from '../components/IndustryMapView';

type MainTab = 'watchlist' | 'rankings' | 'rotation' | 'industries' | 'strategies';
type ModalViewMode = 'kline' | 'ai_fundamental' | 'industry_map';
type StrategyCategory = 'all' | 'inst' | 'technical' | 'value' | 'bearish';

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

  // 1. 主頁籤與全域搜尋 (自選關注 / 行情排行 / 資金輪動 / 全市場族群 / 策略選股)
  const [activeTab, setActiveTab] = useState<MainTab>('watchlist');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isResolvingStock, setIsResolvingStock] = useState<string | null>(null);

  // 1.2 自動同步機制：在進入自選或排行頁籤時，若距離上次刷新超過 45 秒，背景自動無感同步
  useEffect(() => {
    if (activeTab === 'watchlist' || activeTab === 'rankings') {
      const last = settings.lastQuoteRefreshedAt
        ? new Date(settings.lastQuoteRefreshedAt).getTime()
        : 0;
      const now = Date.now();
      if (now - last > 45000 && !isQuoteSyncing) {
        void refreshQuotes();
      }
    }
  }, [activeTab]);

  // 1.5 行情排行狀態 (漲跌榜 / 買賣超榜 / 成交金額)
  const [activeRankingType, setActiveRankingType] = useState<MarketRankingType>('gainers');
  const marketRankings = useMemo(() => {
    return getMarketRankings(screenerStocks, 20);
  }, [screenerStocks]);

  // 1.8 板塊資金輪動象限與成交熱度統計
  const sectorSummaries = useMemo(() => {
    return calculateSectorFlowStats(screenerStocks);
  }, [screenerStocks]);

  // 2. 產業族群與次級小分類狀態
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ind_semicon');
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>('all');
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>('');

  // 3. 量化策略狀態 (支援分類篩選與全新卡片佈局)
  const [strategyCat, setStrategyCat] = useState<StrategyCategory>('all');
  const [activeStrategyId, setActiveStrategyId] = useState<string>('highest_win_rate_alpha');
  const [criteria, setCriteria] = useState<ScreenerFilterCriteria>(QUANT_STRATEGIES[0].criteria);

  // 依風格分類過濾之策略清單
  const filteredStrategies = useMemo(() => {
    if (strategyCat === 'all') return QUANT_STRATEGIES;
    if (strategyCat === 'inst') {
      return QUANT_STRATEGIES.filter((s) =>
        ['highest_win_rate_alpha', 'trust_momentum', 'ma_ribbon_surge', 'sector_leader_flow'].includes(s.id)
      );
    }
    if (strategyCat === 'technical') {
      return QUANT_STRATEGIES.filter((s) =>
        ['bollinger_squeeze_breakout', 'macd_rsi_divergence', 'bottom_up_all_star'].includes(s.id)
      );
    }
    if (strategyCat === 'value') {
      return QUANT_STRATEGIES.filter((s) =>
        ['garp_peg_value', 'peer_relative_valuation', 'low_vol_moat', 'fcf_high_yield'].includes(s.id)
      );
    }
    if (strategyCat === 'bearish') {
      return QUANT_STRATEGIES.filter((s) => Boolean(s.criteria.isBearishStrategy));
    }
    return QUANT_STRATEGIES;
  }, [strategyCat]);

  // 4. 股票詳情底層抽屜狀態 (直覺切換: K線走勢 vs AI深度決策)
  const [detailStock, setDetailStock] = useState<ScreenerStockItem | null>(null);
  const [modalMode, setModalMode] = useState<ModalViewMode>('kline');

  // 5. 整合全市場官方產業與熱門概念群組 (以概念優先排序)
  const allGroups = useMemo<IndustryGroupMeta[]>(() => {
    const concepts = getAllConceptGroups();
    const officials = getAllIndustryGroups();
    return [...concepts, ...officials];
  }, []);

  // 6. 當前族群支援之次級小分類
  const subCategories = useMemo<SubCategoryMeta[]>(() => {
    return getSubCategoriesForGroup(selectedGroupId);
  }, [selectedGroupId]);

  // 6.5 當前族群與次級分類篩選後標的 (支援搜尋與快取)
  const groupStocks = useMemo<TaiwanStockBasicInfo[]>(() => {
    return getFilteredStocksInGroup(selectedGroupId, selectedSubCategoryId, groupSearchQuery, 120);
  }, [selectedGroupId, selectedSubCategoryId, groupSearchQuery]);

  // 7. 全市場搜尋相符標的 (結合在庫標的與全台股 3,578 檔字典)
  const searchResults = useMemo<UnifiedSearchItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: UnifiedSearchItem[] = [];
    const seen = new Set<string>();

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

    const universe = searchTaiwanStockUniverse(q, 25);
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

  // 8. 策略選股符合條件標的
  const { passedStocks } = useMemo(() => {
    return evaluateBottomUpFunnel(screenerStocks, criteria);
  }, [screenerStocks, criteria]);

  // 9. 安全開啟股票詳情 (防空保底，保證 100% 成功滑出抽屜)
  const handleOpenStock = async (
    item: ScreenerStockItem | UnifiedSearchItem | TaiwanStockBasicInfo | WatchlistStockItem
  ) => {
    let target: ScreenerStockItem | null = null;

    if ('sectorId' in item && 'price' in item && typeof (item as any).price === 'number') {
      target = item as ScreenerStockItem;
    } else {
      const rawSym = (item as any).symbol || (item as any).id || '';
      const cleanSym = String(rawSym).replace(/\.(TW|TWO)$/i, '').toUpperCase();

      const existing = screenerStocks.find(
        (s) => s.symbol.replace(/\.(TW|TWO)$/i, '').toUpperCase() === cleanSym
      );

      if (existing) {
        target = existing;
      } else {
        const matches = searchTaiwanStockUniverse(cleanSym, 1);
        const basic = matches[0];
        if (basic) {
          setIsResolvingStock(basic.symbol);
          try {
            target = await resolveStockToScreenerItem(basic, settings.finMindToken);
            upsertScreenerStock(target);
          } catch {
            target = null;
          } finally {
            setIsResolvingStock(null);
          }
        }

        if (!target) {
          const name = (item as any).name || cleanSym;
          const sector = (item as any).sector || (item as any).sectorName || '台股綜合';
          const price = (item as any).currentPrice || (item as any).addedPrice || 50;
          target = {
            symbol: (item as any).symbol || `${cleanSym}.TW`,
            name,
            market: (item as any).market || 'TW',
            sectorId: 'heavy_power',
            sectorName: sector,
            subTheme: '市場熱門追蹤',
            price,
            dailyChangePct: 0,
            avgTurnover60dYiTwd: 1.2,
            roePct: 14.0,
            peRatio: 16.5,
            pbRatio: 1.5,
            grossMarginPct: 22.0,
            freeCashFlowPositive: true,
            dividendYieldPct: 3.5,
            aboveMa60: false,
            aboveMa240: false,
            momentum60dPct: 0,
            annualVolatilityPct: 22.0,
            instNetBuy5dLots: 0,
            trustNetBuy5dLots: 0,
            majorHolderChangePct: 0,
            marginUtilizationHealth: 'healthy',
            revenueYoYPct: 5.0,
            revenueMoMPct: 1.0,
            catalystNote: '產業核心供應鏈',
            opmPct: 8.5,
            estimatedEps: 2.8,
            atr14: Math.max(1, Math.round(price * 0.03 * 10) / 10),
          };
          upsertScreenerStock(target);
        }
      }
    }

    setDetailStock(target);
    setModalMode('kline'); // 預設開啟 K 線走勢
  };

  // 10. 自選判斷 (防禦性檢查，避免 undefined throw error)
  const isInWatchlist = (symbol?: string) => {
    if (!symbol) return false;
    const clean = symbol.replace(/\.(TW|TWO)$/i, '').toUpperCase();
    return watchlist.some(
      (w) => w.symbol && w.symbol.replace(/\.(TW|TWO)$/i, '').toUpperCase() === clean
    );
  };

  const handleToggleWatchlist = (stock: ScreenerStockItem, listType: WatchlistType = 'watching') => {
    const clean = stock.symbol.replace(/\.(TW|TWO)$/i, '').toUpperCase();
    const existing = watchlist.find(
      (w) => w.symbol && w.symbol.replace(/\.(TW|TWO)$/i, '').toUpperCase() === clean
    );

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
    alert(`已將 ${stock.name} (${unitsStr} 股) 加入投資組合！`);
  };

  // 11. 關鍵價位階梯
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
    <div className="space-y-3 pb-24 max-w-3xl mx-auto select-none">
      {/* 1. 頂部精簡搜尋列 (整合時間與即時刷新) */}
      <section className="toss-card p-2.5 sm:p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-[#8B95A1] px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>台股即時資料 ({formatDataTimestamp(settings.lastQuoteRefreshedAt)})</span>
          </div>
          <button
            type="button"
            disabled={isQuoteSyncing}
            onClick={() => void refreshQuotes()}
            className="flex items-center gap-1 text-[#2563EB] hover:text-[#1D4ED8] font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isQuoteSyncing ? 'animate-spin' : ''}`} />
            <span>{isQuoteSyncing ? '更新中' : '刷新'}</span>
          </button>
        </div>

        {/* 搜尋框 */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#8B95A1] absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋代號或名稱 (2330 / 4526 / 東台 / 散熱)..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] text-xs sm:text-sm font-medium text-[#191F28] dark:text-[#F2F4F8] placeholder-[#8B95A1] border border-[#EAEDF2] dark:border-[#262C36] focus:border-[#2563EB] focus:outline-hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 p-1 text-[#8B95A1] hover:text-[#191F28] dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 精簡熱搜膠囊 */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
          <span className="text-[#8B95A1] shrink-0 text-[10px]">熱搜：</span>
          {[
            { label: '4526 東台', query: '4526' },
            { label: '2330 台積電', query: '2330' },
            { label: '3017 奇鋐', query: '3017' },
            { label: '3324 雙鴻', query: '3324' },
            { label: '2382 廣達', query: '2382' },
          ].map((tag) => (
            <button
              key={tag.query}
              type="button"
              onClick={() => setSearchQuery(tag.query)}
              className={`px-2 py-0.5 rounded-md border text-[11px] whitespace-nowrap ${
                searchQuery === tag.query
                  ? 'bg-[#2563EB] text-white border-[#2563EB] font-bold'
                  : 'bg-[#F0F2F6] dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0] border-transparent'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {/* 搜尋結果展開清單 */}
        {searchQuery.trim().length > 0 && (
          <div className="pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#8B95A1] px-1">
              <span>相符標的 ({searchResults.length})</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[#2563EB] hover:underline"
              >
                收合
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#8B95A1]">查無相符股票</div>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                {searchResults.map((item) => (
                  <div
                    key={item.symbol}
                    onClick={() => void handleOpenStock(item)}
                    className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] hover:bg-blue-50/50 dark:hover:bg-blue-950/20 border border-[#EAEDF2] dark:border-[#262C36] cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          {item.name}
                        </span>
                        <span className="text-xs font-mono text-[#8B95A1]">{item.symbol}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800 text-[10px] text-[#4E5968] dark:text-[#9BA4B0]">
                          {item.sectorName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.stockItem && (
                        <div className="text-right tabular-nums">
                          <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                            NT$ {item.stockItem.price}
                          </div>
                          <div
                            className={`text-[10px] font-bold ${
                              item.stockItem.dailyChangePct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
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
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. 主分頁切換 (自選 / 排行 / 輪動 / 族群 / 策略) - 5 欄均分網格，一眼看清所有核心功能 */}
      <div className="grid grid-cols-5 p-1 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631] text-[11px] sm:text-xs font-bold gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('watchlist')}
          className={`py-1.5 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 ${
            activeTab === 'watchlist'
              ? 'bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-xs'
              : 'text-[#8B95A1] hover:text-[#4E5968]'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>自選 ({watchlist.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rankings')}
          className={`py-1.5 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 ${
            activeTab === 'rankings'
              ? 'bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-xs'
              : 'text-[#8B95A1] hover:text-[#4E5968]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>排行</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rotation')}
          className={`py-1.5 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 ${
            activeTab === 'rotation'
              ? 'bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-xs'
              : 'text-[#8B95A1] hover:text-[#4E5968]'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>輪動</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('industries')}
          className={`py-1.5 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 ${
            activeTab === 'industries'
              ? 'bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-xs'
              : 'text-[#8B95A1] hover:text-[#4E5968]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>族群</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('strategies')}
          className={`py-1.5 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 ${
            activeTab === 'strategies'
              ? 'bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-xs'
              : 'text-[#8B95A1] hover:text-[#4E5968]'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>策略</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 分頁 1: 自選關注清單 (極簡 Toss 規範排版) */}
      {/* ========================================================================= */}
      {activeTab === 'watchlist' && (
        <section className="space-y-1.5">
          {watchlist.length === 0 ? (
            <div className="toss-card p-10 text-center space-y-2.5">
              <Eye className="w-8 h-8 text-[#8B95A1] mx-auto opacity-30" />
              <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                尚無自選關注標的
              </div>
              <p className="text-xs text-[#8B95A1]">
                可搜尋股票或切換至「全市場族群」挑選心儀股票
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('industries')}
                className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-bold inline-flex items-center gap-1"
              >
                <span>瀏覽全市場族群</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            watchlist.map((item) => {
              const stock = screenerStocks.find(
                (s) =>
                  s.symbol.replace(/\.(TW|TWO)$/i, '') === item.symbol.replace(/\.(TW|TWO)$/i, '')
              );
              const price = stock?.price ?? item.currentPrice;
              const change = stock?.dailyChangePct ?? 0;

              return (
                <div
                  key={item.id}
                  onClick={() => void handleOpenStock(stock || item)}
                  className="toss-card px-3.5 py-3 cursor-pointer hover:border-[#2563EB]/40 transition-all flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] font-bold text-[#191F28] dark:text-[#F2F4F8] group-hover:text-[#2563EB] transition-colors">
                        {item.name}
                      </span>
                      <span className="text-xs font-mono font-medium text-[#8B95A1]">
                        {item.symbol.replace(/\.(TW|TWO)$/i, '')}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-[#F0F2F6] dark:bg-[#1F2631] text-[10px] text-[#8B95A1]">
                        {item.sectorName}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8B95A1]">
                      {stock ? `ROE ${stock.roePct}% · PE ${stock.peRatio}x` : '自選追蹤標的'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right tabular-nums">
                      <div className="text-base font-bold text-[#191F28] dark:text-white">
                        NT$ {price.toLocaleString()}
                      </div>
                      <div
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md inline-block ${
                          change > 0
                            ? 'bg-rose-50 text-[#F04452] dark:bg-rose-950/40'
                            : change < 0
                              ? 'bg-emerald-50 text-[#059669] dark:bg-emerald-950/40'
                              : 'bg-gray-100 text-[#8B95A1] dark:bg-gray-800'
                        }`}
                      >
                        {change > 0 ? '+' : ''}
                        {change}%
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8B95A1] group-hover:text-[#2563EB]" />
                  </div>
                </div>
              );
            })
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* 分頁 2: 漲跌榜與買賣超榜 (主流財經 App 行情排行折頁) */}
      {/* ========================================================================= */}
      {activeTab === 'rankings' && (
        <section className="space-y-2">
          {/* 主流財經 App 次級分類膠囊切換 (漲幅榜 / 跌幅榜 / 法人買超 / 法人賣超 / 成交金額) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
            {MARKET_RANKING_CATEGORIES.map((cat) => {
              const isActive = activeRankingType === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveRankingType(cat.id)}
                  className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'bg-[#191F28] text-white dark:bg-white dark:text-[#191F28] border-transparent font-bold shadow-xs'
                      : 'bg-white dark:bg-[#161B22] text-[#4E5968] dark:text-[#9BA4B0] border-[#EAEDF2] dark:border-[#262C36] hover:border-[#2563EB]/40'
                  }`}
                >
                  {cat.id === 'gainers' && <TrendingUp className="w-3.5 h-3.5 text-rose-500" />}
                  {cat.id === 'losers' && <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />}
                  {cat.id === 'inst_buy' && <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />}
                  {cat.id === 'inst_sell' && <ArrowDownRight className="w-3.5 h-3.5 text-amber-500" />}
                  {cat.id === 'turnover' && <Flame className="w-3.5 h-3.5 text-indigo-500" />}
                  <span>{cat.title}</span>
                </button>
              );
            })}
          </div>

          {/* 榜單摘要說明卡 (標註台股 100% 聚焦與排序標準) */}
          {(() => {
            const currentCat = MARKET_RANKING_CATEGORIES.find((c) => c.id === activeRankingType);
            const rankingList = marketRankings[activeRankingType] || [];

            return (
              <div className="space-y-2">
                <div className="px-3.5 py-2 rounded-xl bg-[#F6F7F9] dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#4E5968] dark:text-[#9BA4B0]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>台股 {currentCat?.description}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#8B95A1] shrink-0 ml-2">
                    前 {rankingList.length} 檔標的
                  </span>
                </div>

                {/* 主流財經 App 表頭 (TableHeader) */}
                <div className="px-3.5 py-1.5 flex items-center justify-between text-[11px] font-bold text-[#8B95A1] border-b border-[#EAEDF2] dark:border-[#262C36]">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center">序號</span>
                    <span>標的名稱 / 產業</span>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <span className="w-16 sm:w-20 text-right">成交價</span>
                    <span className="w-20 sm:w-24 text-right">
                      {activeRankingType === 'gainers' || activeRankingType === 'losers'
                        ? '漲跌幅'
                        : activeRankingType === 'inst_buy'
                          ? '5日法人買超'
                          : activeRankingType === 'inst_sell'
                            ? '5日法人賣超'
                            : '日均成交額'}
                    </span>
                  </div>
                </div>

                {/* 排行列表 */}
                <div className="space-y-1">
                  {rankingList.length === 0 ? (
                    <div className="toss-card p-6 text-center text-xs text-[#8B95A1]">
                      目前無符合此排行之台股標的
                    </div>
                  ) : (
                    rankingList.map((stock, idx) => {
                      const rank = idx + 1;

                      return (
                        <div
                          key={`${stock.symbol}-${rank}`}
                          onClick={() => void handleOpenStock(stock)}
                          className="toss-card px-3.5 py-2.5 cursor-pointer hover:border-[#2563EB]/40 transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            {/* 排行序號 (前三名高對比微徽章) */}
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black tabular-nums shrink-0 ${
                                rank === 1
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200'
                                  : rank === 2
                                    ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                                    : rank === 3
                                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-200'
                                      : 'bg-[#F0F2F6] text-[#8B95A1] dark:bg-[#1F2631]'
                              }`}
                            >
                              {rank}
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[14px] font-bold text-[#191F28] dark:text-[#F2F4F8] group-hover:text-[#2563EB] transition-colors">
                                  {stock.name}
                                </span>
                                <span className="text-xs font-mono font-medium text-[#8B95A1]">
                                  {stock.symbol.replace(/\.(TW|TWO)$/i, '')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded bg-[#F0F2F6] dark:bg-[#1F2631] text-[9px] text-[#8B95A1]">
                                  {stock.sectorName}
                                </span>
                                <span className="text-[10px] text-[#8B95A1] line-clamp-1 max-w-[120px] sm:max-w-[180px]">
                                  {stock.subTheme || `ROE ${stock.roePct}%`}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 sm:gap-6">
                            {/* 成交價 (大字 tabular-nums) */}
                            <div className="w-16 sm:w-20 text-right tabular-nums">
                              <span className="text-sm font-bold text-[#191F28] dark:text-white">
                                {stock.price.toLocaleString()}
                              </span>
                            </div>

                            {/* 依榜單類型顯示之指標膠囊 (固定寬度右對齊) */}
                            <div className="w-20 sm:w-24 text-right tabular-nums">
                              {activeRankingType === 'gainers' || activeRankingType === 'losers' ? (
                                <div
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md inline-block w-full text-center ${
                                    stock.dailyChangePct >= 0
                                      ? 'bg-rose-50 text-[#F04452] dark:bg-rose-950/40'
                                      : 'bg-emerald-50 text-[#059669] dark:bg-emerald-950/40'
                                  }`}
                                >
                                  {stock.dailyChangePct >= 0 ? '+' : ''}
                                  {stock.dailyChangePct}%
                                </div>
                              ) : activeRankingType === 'inst_buy' ? (
                                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-300 inline-block w-full text-center">
                                  +{stock.instNetBuy5dLots.toLocaleString()}張
                                </div>
                              ) : activeRankingType === 'inst_sell' ? (
                                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-300 inline-block w-full text-center">
                                  {stock.instNetBuy5dLots.toLocaleString()}張
                                </div>
                              ) : (
                                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-[#4E5968] dark:bg-gray-800 dark:text-[#9BA4B0] inline-block w-full text-center">
                                  {stock.avgTurnover60dYiTwd} 億
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* ========================================================================= */}
      {/* 分頁 3: 資金輪轉與板塊移動 (8 大板塊熱圖與四象限輪動) */}
      {/* ========================================================================= */}
      {activeTab === 'rotation' && (
        <section className="space-y-3">
          {/* 頂部四象限動態標題卡 */}
          <div className="p-3.5 rounded-2xl bg-[#F6F7F9] dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-sm text-[#191F28] dark:text-white">
                <Flame className="w-4 h-4 text-rose-500" />
                <span>市場資金輪轉象限與板塊熱圖</span>
              </div>
              <span className="text-[10px] text-[#8B95A1] font-mono">
                8 大主力題材板塊
              </span>
            </div>
            <p className="text-[11px] text-[#4E5968] dark:text-[#9BA4B0] leading-relaxed">
              即時統計全台股各板塊資金成交佔比、60 日動能與三大法人淨買賣超，捕捉主力資金大搬風軌跡。
            </p>
          </div>

          {/* 8 大板塊熱力方塊 (Sector Heatmap Tiles) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {sectorSummaries.map((sec) => {
              const isGain = sec.avgDailyChangePct >= 0;
              const isStrong = sec.avgDailyChangePct >= 1.5;

              return (
                <div
                  key={sec.sectorId}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isStrong
                      ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                      : isGain
                        ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200/70 dark:border-orange-900/40'
                        : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-[#191F28] dark:text-white">
                          {sec.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white/80 dark:bg-[#161B22] border border-black/5 dark:border-white/10 text-[#4E5968] dark:text-[#9BA4B0]">
                          {sec.rotationLabel}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#8B95A1] mt-0.5 line-clamp-1">
                        {sec.description}
                      </div>
                    </div>

                    <div className="text-right tabular-nums">
                      <div
                        className={`text-base font-black ${
                          isGain ? 'text-[#F04452]' : 'text-[#059669]'
                        }`}
                      >
                        {isGain ? '+' : ''}
                        {sec.avgDailyChangePct}%
                      </div>
                      <div className="text-[10px] text-[#8B95A1]">今日平均</div>
                    </div>
                  </div>

                  {/* 核心量化指標數據列 */}
                  <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 grid grid-cols-3 gap-1 text-center tabular-nums text-[10px]">
                    <div>
                      <div className="text-[#8B95A1]">成交比重</div>
                      <div className="font-bold text-[#191F28] dark:text-white mt-0.5">
                        {sec.turnoverSharePct}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[#8B95A1]">60日動能</div>
                      <div
                        className={`font-bold mt-0.5 ${
                          sec.avgMomentum60dPct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                        }`}
                      >
                        {sec.avgMomentum60dPct >= 0 ? '+' : ''}
                        {sec.avgMomentum60dPct}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[#8B95A1]">法人5日買賣超</div>
                      <div
                        className={`font-bold mt-0.5 ${
                          sec.netInstFlowLots >= 0 ? 'text-[#2563EB]' : 'text-[#059669]'
                        }`}
                      >
                        {sec.netInstFlowLots >= 0 ? '+' : ''}
                        {sec.netInstFlowLots.toLocaleString()}張
                      </div>
                    </div>
                  </div>

                  {/* 板塊內核心標的微型磚 (Mini Tiles) */}
                  <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <span className="text-[10px] text-[#8B95A1] shrink-0">代表股：</span>
                    {sec.topStocks.slice(0, 4).map((stk) => (
                      <button
                        key={stk.symbol}
                        type="button"
                        onClick={() => void handleOpenStock(stk)}
                        className="px-2 py-1 rounded-lg bg-white/90 dark:bg-[#161B22] border border-black/5 dark:border-white/10 hover:border-[#2563EB] text-[11px] font-bold text-[#191F28] dark:text-white flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                      >
                        <span>{stk.name}</span>
                        <span
                          className={`text-[9px] tabular-nums ${
                            stk.dailyChangePct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                          }`}
                        >
                          {stk.dailyChangePct >= 0 ? '+' : ''}
                          {stk.dailyChangePct}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 分頁 4: 全市場產業族群 (涵蓋 3,578 檔，流暢水平標籤 + 直覺清單) */}
      {/* ========================================================================= */}
      {activeTab === 'industries' && (
        <section className="space-y-2.5">
          {/* 水平滾動族群膠囊標籤 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {allGroups.map((grp) => {
              const isSelected = selectedGroupId === grp.id;
              return (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => {
                    setSelectedGroupId(grp.id);
                    setSelectedSubCategoryId('all');
                    setGroupSearchQuery('');
                  }}
                  className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#191F28] text-white dark:bg-white dark:text-[#191F28] border-transparent font-bold shadow-xs'
                      : 'bg-white dark:bg-[#161B22] text-[#4E5968] dark:text-[#9BA4B0] border-[#EAEDF2] dark:border-[#262C36] hover:border-[#2563EB]/40'
                  }`}
                >
                  <span>{grp.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected
                        ? 'bg-white/20 text-white dark:bg-black/10 dark:text-black font-bold'
                        : 'bg-[#F0F2F6] dark:bg-[#1F2631] text-[#8B95A1]'
                    }`}
                  >
                    {grp.stockCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 次級小分類快速篩選晶片列 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
            {subCategories.map((sub) => {
              const isSubActive = selectedSubCategoryId === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubCategoryId(sub.id)}
                  className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all font-medium ${
                    isSubActive
                      ? 'bg-[#2563EB] text-white border-transparent shadow-xs'
                      : 'bg-white dark:bg-[#161B22] text-[#4E5968] dark:text-[#9BA4B0] border-[#EAEDF2] dark:border-[#262C36] hover:border-[#2563EB]/40'
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>

          {/* 族群內關鍵字快搜 */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8B95A1] absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={groupSearchQuery}
              onChange={(e) => setGroupSearchQuery(e.target.value)}
              placeholder="在此族群快速搜尋股票代號或名稱..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1F2631] text-xs text-[#191F28] dark:text-[#F2F4F8] placeholder-[#8B95A1] border border-[#EAEDF2] dark:border-[#262C36] focus:outline-hidden"
            />
          </div>

          {/* 族群標的列表 */}
          <div className="space-y-1.5">
            {groupStocks.length === 0 ? (
              <div className="toss-card p-6 text-center text-xs text-[#8B95A1]">
                查無相符股票
              </div>
            ) : (
              groupStocks.map((stock) => {
                const screenerStock = screenerStocks.find(
                  (s) => s.symbol.replace(/\.(TW|TWO)$/i, '') === stock.id
                );

                return (
                  <div
                    key={stock.id}
                    onClick={() => void handleOpenStock(screenerStock || stock)}
                    className="toss-card px-3.5 py-2.5 cursor-pointer hover:border-[#2563EB]/40 transition-all flex items-center justify-between group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-bold text-[#191F28] dark:text-[#F2F4F8] group-hover:text-[#2563EB] transition-colors">
                          {stock.name}
                        </span>
                        <span className="text-xs font-mono font-medium text-[#8B95A1]">
                          {stock.id}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-[#F0F2F6] dark:bg-[#1F2631] text-[9px] text-[#8B95A1]">
                          {stock.market}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#8B95A1]">{stock.sector}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {screenerStock ? (
                        <div className="text-right tabular-nums">
                          <div className="text-sm font-bold text-[#191F28] dark:text-white">
                            NT$ {screenerStock.price}
                          </div>
                          <div
                            className={`text-[10px] font-bold ${
                              screenerStock.dailyChangePct >= 0
                                ? 'text-[#F04452]'
                                : 'text-[#059669]'
                            }`}
                          >
                            {screenerStock.dailyChangePct >= 0 ? '+' : ''}
                            {screenerStock.dailyChangePct}%
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[#2563EB] group-hover:underline">
                          查看 ↗
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-[#8B95A1] group-hover:text-[#2563EB]" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 分頁 5: 策略選股 (12 套量化策略分類導航 + 雙欄現代卡片 + 邏輯展開 + 入選名單) */}
      {/* ========================================================================= */}
      {activeTab === 'strategies' && (
        <section className="space-y-3">
          {/* 1. 頂部風格分類篩選標籤 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
            {(
              [
                { id: 'all', label: `全部策略 (${QUANT_STRATEGIES.length})` },
                { id: 'inst', label: '法人主力 (4)' },
                { id: 'technical', label: '技術指標 (3)' },
                { id: 'value', label: '價值成長 (4)' },
                { id: 'bearish', label: '空方避險 (1)' },
              ] as const
            ).map((cat) => {
              const isCatActive = strategyCat === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setStrategyCat(cat.id)}
                  className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all font-semibold ${
                    isCatActive
                      ? 'bg-[#191F28] text-white dark:bg-white dark:text-[#191F28] border-transparent shadow-xs'
                      : 'bg-white dark:bg-[#161B22] text-[#4E5968] dark:text-[#9BA4B0] border-[#EAEDF2] dark:border-[#262C36] hover:border-[#2563EB]/40'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* 2. 策略選擇卡片網格 (自適應雙欄，整潔現代) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredStrategies.map((strat) => {
              const isActive = activeStrategyId === strat.id;
              const isBearish = Boolean(strat.criteria.isBearishStrategy);

              return (
                <button
                  key={strat.id}
                  type="button"
                  onClick={() => {
                    setActiveStrategyId(strat.id);
                    setCriteria(strat.criteria);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2 ${
                    isActive
                      ? isBearish
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-600 dark:border-emerald-500 shadow-xs ring-1 ring-emerald-500/30'
                        : 'bg-blue-50/50 dark:bg-blue-950/20 border-[#2563EB] dark:border-[#2563EB] shadow-xs ring-1 ring-[#2563EB]/30'
                      : 'bg-white dark:bg-[#161B22] border-[#EAEDF2] dark:border-[#262C36] hover:border-[#2563EB]/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-[#191F28] dark:text-white">
                        {isBearish ? (
                          <ShieldAlert className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Compass className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#2563EB]' : 'text-[#8B95A1]'}`} />
                        )}
                        <span className="line-clamp-1">{strat.name}</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          isBearish
                            ? 'bg-emerald-100 text-[#059669] dark:bg-emerald-950/80 dark:text-emerald-300'
                            : isActive
                              ? 'bg-blue-100 text-[#2563EB] dark:bg-blue-950/80 dark:text-blue-300'
                              : 'bg-[#F0F2F6] dark:bg-[#1F2631] text-[#8B95A1]'
                        }`}
                      >
                        {strat.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#4E5968] dark:text-[#9BA4B0] line-clamp-2 leading-relaxed">
                      {strat.summary}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] text-[#8B95A1]">
                    <span>週期：{strat.rebalanceCycle.split('·')[0].trim()}</span>
                    {isActive && (
                      <span className="flex items-center gap-1 font-bold text-[#2563EB] dark:text-blue-400">
                        <Check className="w-3 h-3" /> 使用中
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 3. 當前選中策略的量化邏輯詳細面板 */}
          {(() => {
            const currentStrat =
              QUANT_STRATEGIES.find((s) => s.id === activeStrategyId) || QUANT_STRATEGIES[0];
            const isBearish = Boolean(currentStrat.criteria.isBearishStrategy);

            return (
              <div
                className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                  isBearish
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-100'
                    : 'bg-[#F6F7F9] dark:bg-[#161B22] border-[#EAEDF2] dark:border-[#262C36] text-[#191F28] dark:text-[#F2F4F8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    {isBearish ? (
                      <ShieldAlert className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Compass className="w-4 h-4 text-[#2563EB]" />
                    )}
                    <span>{currentStrat.name} · 量化邏輯剖析</span>
                  </div>
                  <span className="text-[10px] text-[#8B95A1] font-mono">
                    {currentStrat.rebalanceCycle}
                  </span>
                </div>
                <p className="text-[11px] text-[#4E5968] dark:text-[#9BA4B0] leading-relaxed">
                  {currentStrat.logicDetail}
                </p>
              </div>
            );
          })()}

          {/* 4. 入選標的清單 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1 text-xs text-[#8B95A1]">
              <span>入選標的 ({passedStocks.length} 檔)</span>
              <span>自適應量化契合度排序</span>
            </div>
            {passedStocks.length === 0 ? (
              <div className="toss-card p-6 text-center text-xs text-[#8B95A1]">
                目前無標的完全符合此策略條件
              </div>
            ) : (
              passedStocks.map((stock) => {
                const currentStrat = QUANT_STRATEGIES.find((s) => s.id === activeStrategyId);
                const isBearish = Boolean(currentStrat?.criteria.isBearishStrategy);

                return (
                  <div
                    key={stock.symbol}
                    onClick={() => void handleOpenStock(stock)}
                    className="toss-card px-3.5 py-3 cursor-pointer hover:border-[#2563EB]/40 transition-all flex items-center justify-between group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[15px] font-bold text-[#191F28] dark:text-[#F2F4F8] group-hover:text-[#2563EB] transition-colors">
                          {stock.name}
                        </span>
                        <span className="text-xs font-mono font-medium text-[#8B95A1]">
                          {stock.symbol.replace(/\.(TW|TWO)$/i, '')}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-[#F0F2F6] dark:bg-[#1F2631] text-[10px] text-[#8B95A1]">
                          {stock.sectorName}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            isBearish
                              ? 'bg-emerald-100 text-[#059669] dark:bg-emerald-950/60 dark:text-emerald-300'
                              : stock.isFullMatch
                                ? 'bg-blue-100 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300'
                                : 'bg-emerald-100 text-[#059669] dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {isBearish
                            ? `避險 ${stock.matchScore}% 契合`
                            : stock.isFullMatch
                              ? '100% 契合'
                              : `${stock.matchScore}% 契合`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {stock.matchTags?.map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.2 rounded bg-[#F6F7F9] dark:bg-[#1F2631] text-[10px] text-[#4E5968] dark:text-[#9BA4B0] border border-[#EAEDF2] dark:border-[#262C36]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="text-right tabular-nums">
                        <div className="text-base font-bold text-[#191F28] dark:text-white">
                          NT$ {stock.price.toLocaleString()}
                        </div>
                        <div
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md inline-block ${
                            stock.dailyChangePct >= 0
                              ? 'bg-rose-50 text-[#F04452] dark:bg-rose-950/40'
                              : 'bg-emerald-50 text-[#059669] dark:bg-emerald-950/40'
                          }`}
                        >
                          {stock.dailyChangePct >= 0 ? '+' : ''}
                          {stock.dailyChangePct}%
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#8B95A1] group-hover:text-[#2563EB]" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 個股詳情底層抽屜 (一目了然: 首頁即可滑動 K 線 + 雙切換模式) */}
      {/* ========================================================================= */}
      {detailStock && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-xl max-h-[92vh] bg-white dark:bg-[#0E1116] rounded-t-3xl sm:rounded-3xl border border-[#EAEDF2] dark:border-[#262C36] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
            {/* 抽屜頂部標題 */}
            <div className="px-4 py-3 border-b border-[#EAEDF2] dark:border-[#262C36] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#191F28] dark:text-white">
                    {detailStock.name}
                  </h2>
                  <span className="text-xs font-mono text-[#8B95A1] font-semibold">
                    {detailStock.symbol}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-[#F0F2F6] dark:bg-[#1F2631] text-[10px] text-[#4E5968] dark:text-[#9BA4B0]">
                    {detailStock.sectorName}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5 tabular-nums">
                  <span className="text-xl font-black text-[#191F28] dark:text-white">
                    NT$ {detailStock.price.toLocaleString()}
                  </span>
                  <span
                    className={`text-xs font-bold px-1.5 py-0.2 rounded ${
                      detailStock.dailyChangePct >= 0
                        ? 'bg-rose-50 text-[#F04452] dark:bg-rose-950/40'
                        : 'bg-emerald-50 text-[#059669] dark:bg-emerald-950/40'
                    }`}
                  >
                    {detailStock.dailyChangePct >= 0 ? '+' : ''}
                    {detailStock.dailyChangePct}%
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailStock(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-[#8B95A1]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 三切換分頁標籤 (K 線走勢 vs AI 深度決策 vs 產業地圖與供應鏈) */}
            <div className="flex border-b border-[#EAEDF2] dark:border-[#262C36] bg-[#F6F7F9] dark:bg-[#161B22] text-xs font-bold px-2 pt-1 gap-1">
              <button
                type="button"
                onClick={() => setModalMode('kline')}
                className={`flex-1 py-2 rounded-t-lg transition-all flex items-center justify-center gap-1.5 ${
                  modalMode === 'kline'
                    ? 'bg-white dark:bg-[#0E1116] text-[#2563EB] border-t-2 border-[#2563EB] shadow-2xs'
                    : 'text-[#8B95A1] hover:text-[#4E5968]'
                }`}
              >
                <CandlestickIcon className="w-3.5 h-3.5" />
                <span>日 K 線走勢</span>
              </button>

              <button
                type="button"
                onClick={() => setModalMode('ai_fundamental')}
                className={`flex-1 py-2 rounded-t-lg transition-all flex items-center justify-center gap-1.5 ${
                  modalMode === 'ai_fundamental'
                    ? 'bg-white dark:bg-[#0E1116] text-[#2563EB] border-t-2 border-[#2563EB] shadow-2xs'
                    : 'text-[#8B95A1] hover:text-[#4E5968]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI 深度決策</span>
              </button>

              <button
                type="button"
                onClick={() => setModalMode('industry_map')}
                className={`flex-1 py-2 rounded-t-lg transition-all flex items-center justify-center gap-1.5 ${
                  modalMode === 'industry_map'
                    ? 'bg-white dark:bg-[#0E1116] text-[#2563EB] border-t-2 border-[#2563EB] shadow-2xs'
                    : 'text-[#8B95A1] hover:text-[#4E5968]'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>產業地圖與估值</span>
              </button>
            </div>

            {/* 可滾動內容主體 */}
            <div className="p-3.5 overflow-y-auto space-y-3 flex-1 text-xs">
              {/* 模式 1: 日 K 線圖 (手勢左右滑動平移) + ATR 關鍵點位梯形 */}
              {modalMode === 'kline' && (
                <div className="space-y-3">
                  <CandlestickChart
                    symbol={detailStock.symbol}
                    stockName={detailStock.name}
                    currentPrice={detailStock.price}
                    token={settings.finMindToken}
                    tradeLevels={tradeLevels}
                    height={300}
                  />

                  {/* 關鍵價位階梯看板 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center tabular-nums">
                    <div className="p-2 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50">
                      <div className="text-[10px] text-rose-600 font-bold">SL 停損 (2 ATR)</div>
                      <div className="text-sm font-extrabold text-[#F04452]">
                        NT$ {tradeLevels[0]?.price}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50">
                      <div className="text-[10px] text-emerald-600 font-bold">TP1 保本止盈</div>
                      <div className="text-sm font-extrabold text-[#059669]">
                        NT$ {tradeLevels[1]?.price}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50">
                      <div className="text-[10px] text-blue-600 font-bold">TP2 同業合理價</div>
                      <div className="text-sm font-extrabold text-[#2563EB]">
                        NT$ {tradeLevels[2]?.price}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50">
                      <div className="text-[10px] text-purple-600 font-bold">TP3 龍頭極值</div>
                      <div className="text-sm font-extrabold text-[#8B5CF6]">
                        NT$ {tradeLevels[3]?.price}
                      </div>
                    </div>
                  </div>

                  {/* 快速財務指標總結 */}
                  <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#161B22] grid grid-cols-4 gap-2 text-center tabular-nums text-[11px]">
                    <div>
                      <div className="text-[#8B95A1]">P/E 本益比</div>
                      <div className="font-bold text-[#191F28] dark:text-white mt-0.5">
                        {detailStock.peRatio}x
                      </div>
                    </div>
                    <div>
                      <div className="text-[#8B95A1]">P/B 淨值比</div>
                      <div className="font-bold text-[#191F28] dark:text-white mt-0.5">
                        {detailStock.pbRatio}x
                      </div>
                    </div>
                    <div>
                      <div className="text-[#8B95A1]">ROE 報酬率</div>
                      <div className="font-bold text-[#2563EB] mt-0.5">{detailStock.roePct}%</div>
                    </div>
                    <div>
                      <div className="text-[#8B95A1]">營收 YoY</div>
                      <div
                        className={`font-bold mt-0.5 ${
                          detailStock.revenueYoYPct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                        }`}
                      >
                        {detailStock.revenueYoYPct >= 0 ? '+' : ''}
                        {detailStock.revenueYoYPct}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 模式 2: AI 決策與基本面深度診斷 */}
              {modalMode === 'ai_fundamental' && (
                <AIAnalysisReportView stock={detailStock} allStocks={screenerStocks} />
              )}

              {/* 模式 3: 企業產業地圖、上下游供應鏈與產業環節估值剖析 */}
              {modalMode === 'industry_map' && (
                <IndustryMapView
                  stock={detailStock}
                  onSelectStock={(sym) => {
                    void handleOpenStock({
                      symbol: sym,
                      id: sym.replace(/\.(TW|TWO)$/i, ''),
                    } as any);
                  }}
                />
              )}
            </div>

            {/* 抽屜底部動作列 (加入自選 / 轉入持倉) */}
            <div className="p-3 border-t border-[#EAEDF2] dark:border-[#262C36] bg-[#F6F7F9] dark:bg-[#161B22] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleToggleWatchlist(detailStock, 'watching')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  isInWatchlist(detailStock.symbol)
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                    : 'bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] text-[#191F28] dark:text-white'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>{isInWatchlist(detailStock.symbol) ? '已在自選' : '+ 自選'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleBuyIntoPortfolio(detailStock)}
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
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
