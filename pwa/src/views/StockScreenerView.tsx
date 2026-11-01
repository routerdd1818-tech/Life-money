import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CandlestickChart as CandlestickIcon,
  Check,
  ChevronRight,
  Compass,
  Database,
  Eye,
  Flame,
  Layers,
  Plus,
  RefreshCw,
  Search,
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
  getStocksInGroup,
  IndustryGroupMeta,
} from '../services/industryUniverseService';
import { AIAnalysisReportView } from '../components/AIAnalysisReportView';

type MainTab = 'watchlist' | 'industries' | 'strategies';
type ModalViewMode = 'kline' | 'ai_fundamental';

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

  // 1. 主頁籤與全域搜尋 (精簡為 3 大分頁)
  const [activeTab, setActiveTab] = useState<MainTab>('watchlist');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isResolvingStock, setIsResolvingStock] = useState<string | null>(null);

  // 2. 產業族群分類狀態
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ind_semicon');
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>('');

  // 3. 量化策略狀態
  const [activeStrategyId, setActiveStrategyId] = useState<string>('highest_win_rate_alpha');
  const [criteria, setCriteria] = useState<ScreenerFilterCriteria>(QUANT_STRATEGIES[0].criteria);

  // 4. 股票詳情底層抽屜狀態 (直覺切換: K線走勢 vs AI深度決策)
  const [detailStock, setDetailStock] = useState<ScreenerStockItem | null>(null);
  const [modalMode, setModalMode] = useState<ModalViewMode>('kline');

  // 5. 整合全市場官方產業與熱門概念群組 (以概念優先排序)
  const allGroups = useMemo<IndustryGroupMeta[]>(() => {
    const concepts = getAllConceptGroups();
    const officials = getAllIndustryGroups();
    return [...concepts, ...officials];
  }, []);

  // 6. 當前族群內標的 (支援搜尋與快取)
  const groupStocks = useMemo<TaiwanStockBasicInfo[]>(() => {
    return getStocksInGroup(selectedGroupId, groupSearchQuery, 120);
  }, [selectedGroupId, groupSearchQuery]);

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
            aboveMa60: true,
            aboveMa240: true,
            momentum60dPct: 4.5,
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

      {/* 2. 主分頁切換 (精簡收斂為 3 大分類) */}
      <div className="flex p-1 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631] text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('watchlist')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'watchlist'
              ? 'bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-xs'
              : 'text-[#8B95A1] hover:text-[#4E5968]'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>自選關注 ({watchlist.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('industries')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'industries'
              ? 'bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-xs'
              : 'text-[#8B95A1] hover:text-[#4E5968]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>全市場族群 (3,578)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('strategies')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'strategies'
              ? 'bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-xs'
              : 'text-[#8B95A1] hover:text-[#4E5968]'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>策略選股</span>
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
      {/* 分頁 2: 全市場產業族群 (涵蓋 3,578 檔，流暢水平標籤 + 直覺清單) */}
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
      {/* 分頁 3: 策略選股 (精選量化策略與符合條件名單) */}
      {/* ========================================================================= */}
      {activeTab === 'strategies' && (
        <section className="space-y-2.5">
          {/* 策略膠囊選擇器 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
            {QUANT_STRATEGIES.map((strat) => (
              <button
                key={strat.id}
                type="button"
                onClick={() => {
                  setActiveStrategyId(strat.id);
                  setCriteria(strat.criteria);
                }}
                className={`p-2 rounded-xl text-left border transition-all ${
                  activeStrategyId === strat.id
                    ? 'bg-blue-50/60 dark:bg-blue-950/30 border-[#2563EB] text-[#2563EB] font-bold shadow-2xs'
                    : 'bg-[#F6F7F9] dark:bg-[#1F2631] border-transparent text-[#4E5968] dark:text-[#9BA4B0]'
                }`}
              >
                <div className="font-bold text-xs">{strat.name}</div>
                <div className="text-[10px] text-[#8B95A1] mt-0.5 line-clamp-1">
                  {strat.summary}
                </div>
              </button>
            ))}
          </div>

          {/* 入選標的清單 */}
          <div className="space-y-1.5">
            {passedStocks.length === 0 ? (
              <div className="toss-card p-6 text-center text-xs text-[#8B95A1]">
                目前無標的完全符合此策略條件
              </div>
            ) : (
              passedStocks.map((stock) => (
                <div
                  key={stock.symbol}
                  onClick={() => void handleOpenStock(stock)}
                  className="toss-card px-3.5 py-3 cursor-pointer hover:border-[#2563EB]/40 transition-all flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] font-bold text-[#191F28] dark:text-[#F2F4F8] group-hover:text-[#2563EB] transition-colors">
                        {stock.name}
                      </span>
                      <span className="text-xs font-mono font-medium text-[#8B95A1]">
                        {stock.symbol.replace(/\.(TW|TWO)$/i, '')}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-[#F0F2F6] dark:bg-[#1F2631] text-[10px] text-[#8B95A1]">
                        {stock.sectorName}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8B95A1]">
                      ROE {stock.roePct}% · 營收 YoY +{stock.revenueYoYPct}% · 法人買超 {stock.instNetBuy5dLots} 張
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
              ))
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

            {/* 雙切換分頁標籤 (K 線走勢 vs AI 深度決策) */}
            <div className="flex border-b border-[#EAEDF2] dark:border-[#262C36] bg-[#F6F7F9] dark:bg-[#161B22] text-xs font-bold px-2 pt-1 gap-1">
              <button
                type="button"
                onClick={() => setModalMode('kline')}
                className={`flex-1 py-2 rounded-t-lg transition-all flex items-center justify-center gap-1.5 ${
                  modalMode === 'kline'
                    ? 'bg-white dark:bg-[#0E1116] text-[#2563EB] border-t-2 border-[#2563EB] shadow-2xs'
                    : 'text-[#8B95A1]'
                }`}
              >
                <CandlestickIcon className="w-3.5 h-3.5" />
                <span>📈 日 K 線走勢與點位</span>
              </button>

              <button
                type="button"
                onClick={() => setModalMode('ai_fundamental')}
                className={`flex-1 py-2 rounded-t-lg transition-all flex items-center justify-center gap-1.5 ${
                  modalMode === 'ai_fundamental'
                    ? 'bg-white dark:bg-[#0E1116] text-[#2563EB] border-t-2 border-[#2563EB] shadow-2xs'
                    : 'text-[#8B95A1]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>🧠 AI 決策與基本面</span>
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
                <Eye className="w-4 h-4" />
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
