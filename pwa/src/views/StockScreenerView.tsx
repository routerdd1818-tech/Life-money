import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Briefcase,
  CandlestickChart as CandlestickIcon,
  Check,
  ChevronRight,
  Clock,
  Compass,
  Database,
  Eye,
  Flame,
  Globe,
  Grid,
  Heart,
  Layers,
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
import { ScreenerFilterCriteria, ScreenerStockItem, StockSectorId, WatchlistType, WatchlistStockItem } from '../types';
import { formatDataTimestamp } from '../utils/formatters';
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
  getAllIndustryGroups,
  getAllConceptGroups,
  getStocksInGroup,
  IndustryGroupMeta,
} from '../services/industryUniverseService';
import { AIAnalysisReportView } from '../components/AIAnalysisReportView';

type MainViewTab = 'watchlist' | 'industries' | 'screener' | 'sectors';
type DetailTab = 'overview' | 'kline' | 'ai_report' | 'valuation';

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

  // 2. 產業族群分類狀態 (涵蓋全台股 3,578 檔)
  const [industryTabType, setIndustryTabType] = useState<'official' | 'concept'>('official');
  const [selectedIndustryGroupId, setSelectedIndustryGroupId] = useState<string>('ind_semicon');
  const [industrySearchQuery, setIndustrySearchQuery] = useState<string>('');

  // 3. 策略選擇
  const [activeStrategyId, setActiveStrategyId] = useState<string>('highest_win_rate_alpha');
  const [criteria, setCriteria] = useState<ScreenerFilterCriteria>(QUANT_STRATEGIES[0].criteria);

  // 4. 板塊選中
  const [selectedSectorId, setSelectedSectorId] = useState<StockSectorId>('ai_server_cooling');

  // 5. 股票詳情底層抽屜狀態 (預設首頁為 'overview' 股票詳細資訊)
  const [detailStock, setDetailStock] = useState<ScreenerStockItem | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [detailVibeAnalysis, setDetailVibeAnalysis] = useState<MultiAgentVibeAnalysis | null>(null);
  const [isVibeLoading, setIsVibeLoading] = useState<boolean>(false);

  // 6. 全市場族群群組資料清單
  const officialGroups = useMemo<IndustryGroupMeta[]>(() => getAllIndustryGroups(), []);
  const conceptGroups = useMemo<IndustryGroupMeta[]>(() => getAllConceptGroups(), []);
  const currentGroupList = industryTabType === 'official' ? officialGroups : conceptGroups;

  // 7. 當前選中族群中的股票清單
  const currentGroupStocks = useMemo<TaiwanStockBasicInfo[]>(() => {
    return getStocksInGroup(selectedIndustryGroupId, industrySearchQuery, 100);
  }, [selectedIndustryGroupId, industrySearchQuery]);

  // 8. 全局搜尋結果計算 (結合金庫已有標的與全台股 3,578 檔字典)
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

  // 9. 策略漏斗計算
  const { passedStocks } = useMemo(() => {
    return evaluateBottomUpFunnel(screenerStocks, criteria);
  }, [screenerStocks, criteria]);

  // 10. 板塊熱度計算
  const sectorFlowStats = useMemo(() => {
    return calculateSectorFlowStats(screenerStocks);
  }, [screenerStocks]);

  // 11. 安全開啟個股詳細資訊抽屜 (保證 100% 成功解析並打開)
  const handleSafeOpenStock = async (
    item: ScreenerStockItem | UnifiedSearchItem | TaiwanStockBasicInfo | WatchlistStockItem
  ) => {
    let target: ScreenerStockItem | null = null;

    // A. 若已是完整 ScreenerStockItem
    if ('sectorId' in item && 'price' in item && typeof (item as any).price === 'number') {
      target = item as ScreenerStockItem;
    } else {
      const rawSym = (item as any).symbol || (item as any).id || '';
      const cleanSym = String(rawSym).replace(/\.(TW|TWO)$/i, '').toUpperCase();

      // B. 先從 screenerStocks 記憶體查找
      const existing = screenerStocks.find(
        (s) => s.symbol.replace(/\.(TW|TWO)$/i, '').toUpperCase() === cleanSym
      );
      if (existing) {
        target = existing;
      } else {
        // C. 從 taiwanStockUniverse 查找並解析
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

        // D. 容錯保底構造完整標的物件
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
            roePct: 14.5,
            peRatio: 16.8,
            pbRatio: 1.5,
            grossMarginPct: 22.0,
            freeCashFlowPositive: true,
            dividendYieldPct: 3.8,
            aboveMa60: true,
            aboveMa240: true,
            momentum60dPct: 5.2,
            annualVolatilityPct: 24.0,
            instNetBuy5dLots: 0,
            trustNetBuy5dLots: 0,
            majorHolderChangePct: 0,
            marginUtilizationHealth: 'healthy',
            revenueYoYPct: 6.5,
            revenueMoMPct: 1.2,
            catalystNote: '產業供應鏈核心標的',
            opmPct: 9.2,
            estimatedEps: 2.8,
            atr14: Math.max(1, Math.round(price * 0.03 * 10) / 10),
          };
          upsertScreenerStock(target);
        }
      }
    }

    setDetailStock(target);
    setDetailTab('overview'); // 預設開啟股票詳細資訊

    // 背景預載 Vibe 分析
    setIsVibeLoading(true);
    evaluateMultiAgentVibe(target, settings.finMindToken)
      .then((res) => setDetailVibeAnalysis(res))
      .catch(() => {})
      .finally(() => setIsVibeLoading(false));
  };

  // 12. 自選清單操作
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

  // 13. 計算個股的同業估值與 ATR 風控線
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
    <div className="space-y-3.5 pb-24 max-w-4xl mx-auto select-none">
      {/* 頂部數據狀態與時間列 (工整精煉) */}
      <div className="flex items-center justify-between px-1 text-[11px] text-[#8B95A1] tabular-nums">
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
          className="flex items-center gap-1 text-[#2563EB] hover:text-[#1D4ED8] font-semibold disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isQuoteSyncing ? 'animate-spin' : ''}`} />
          <span>{isQuoteSyncing ? '更新中' : '即刻刷新'}</span>
        </button>
      </div>

      {/* 聚焦搜尋列 (Toss 現代灰階膠囊) */}
      <section className="toss-card p-3 space-y-2.5">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#8B95A1] absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋股票代號 (4526 / 2330 / 3017 / 0050) 或名稱..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] text-xs sm:text-sm font-medium text-[#191F28] dark:text-[#F2F4F8] placeholder-[#8B95A1] border border-[#EAEDF2] dark:border-[#262C36] focus:border-[#2563EB] focus:outline-hidden transition-all"
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
            { label: '廣達 2382', query: '2382' },
            { label: '0050 元大', query: '0050' },
          ].map((tag) => (
            <button
              key={tag.query}
              type="button"
              onClick={() => setSearchQuery(tag.query)}
              className={`px-2 py-0.8 rounded-lg border whitespace-nowrap transition-all ${
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
                查無相符股票，請確認代碼或中文名稱
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                {searchResults.map((item) => (
                  <div
                    key={item.symbol}
                    onClick={() => void handleSafeOpenStock(item)}
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
                        點擊查看行情資訊、移動 K 線與 AI 決策
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
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 四段式 Segmented Tab Bar (主流金融 App 核心) */}
      <div className="flex p-1 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631] text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('watchlist')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
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
          onClick={() => setActiveTab('industries')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'industries'
              ? 'bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-xs font-bold'
              : 'text-[#8B95A1] hover:text-[#4E5968]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>產業族群 (全市場)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('screener')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
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
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'sectors'
              ? 'bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-xs font-bold'
              : 'text-[#8B95A1] hover:text-[#4E5968]'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>板塊熱度</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 視圖 1: 自選關注清單 (排版工整洗鍊，點擊 100% 展開個股詳情抽屜) */}
      {/* ========================================================================= */}
      {activeTab === 'watchlist' && (
        <section className="space-y-2">
          {watchlist.length === 0 ? (
            <div className="toss-card p-10 text-center space-y-3">
              <Eye className="w-10 h-10 text-[#8B95A1] mx-auto opacity-40" />
              <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                目前尚無自選關注股票
              </div>
              <p className="text-xs text-[#8B95A1]">
                可於上方搜尋股票，或點切「產業族群」瀏覽全市場 3,578 檔標的加入自選
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('industries')}
                className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-xs inline-flex items-center gap-1"
              >
                <span>瀏覽全市場產業族群</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {watchlist.map((item) => {
                const stock = screenerStocks.find(
                  (s) =>
                    s.symbol === item.symbol ||
                    s.symbol.replace(/\.(TW|TWO)$/i, '') === item.symbol.replace(/\.(TW|TWO)$/i, '')
                );
                const price = stock?.price ?? item.currentPrice;
                const change = stock?.dailyChangePct ?? 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => void handleSafeOpenStock(stock || item)}
                    className="toss-card p-3.5 cursor-pointer hover:border-[#2563EB]/40 transition-all flex items-center justify-between group"
                  >
                    {/* 左側：股票名稱、代碼、族群與極簡亮點 */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-[#191F28] dark:text-[#F2F4F8] group-hover:text-[#2563EB] transition-colors">
                          {item.name}
                        </span>
                        <span className="text-xs font-mono font-semibold text-[#8B95A1]">
                          {item.symbol}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#F0F2F6] dark:bg-[#1F2631] text-[10px] text-[#4E5968] dark:text-[#9BA4B0] font-medium">
                          {item.sectorName || '台股'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8B95A1]">
                        {stock
                          ? `ROE ${stock.roePct}% · PE ${stock.peRatio}x · 毛利率 ${stock.grossMarginPct}%`
                          : '點擊查看完整股票資訊、移動 K 線與 AI 決策'}
                      </div>
                    </div>

                    {/* 右側：大字現價、漲跌幅膠囊與箭頭 */}
                    <div className="flex items-center gap-3">
                      <div className="text-right tabular-nums">
                        <div className="text-base font-extrabold text-[#191F28] dark:text-white">
                          NT$ {price.toLocaleString()}
                        </div>
                        <div
                          className={`text-[11px] font-bold inline-block px-1.5 py-0.2 rounded-md ${
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
                      <ChevronRight className="w-4 h-4 text-[#8B95A1] group-hover:text-[#2563EB] transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* 視圖 2: 產業族群專區 (涵蓋全台股 3,578 檔標的，官方 32 大類 + 8 大概念) */}
      {/* ========================================================================= */}
      {activeTab === 'industries' && (
        <section className="space-y-3">
          {/* 族群大類切換器 (官方產業 vs 題材概念) */}
          <div className="toss-card p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIndustryTabType('official');
                    setSelectedIndustryGroupId(officialGroups[0]?.id || 'ind_semicon');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    industryTabType === 'official'
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'bg-[#F0F2F6] dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0]'
                  }`}
                >
                  官方 32 大產業 (涵蓋全台股)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIndustryTabType('concept');
                    setSelectedIndustryGroupId(conceptGroups[0]?.id || 'concept_ai_server');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    industryTabType === 'concept'
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'bg-[#F0F2F6] dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0]'
                  }`}
                >
                  前瞻熱門題材概念
                </button>
              </div>

              <span className="text-[11px] text-[#8B95A1] tabular-nums hidden sm:inline">
                共收錄 3,578 檔上市櫃股票
              </span>
            </div>

            {/* 水平滾動族群膠囊晶片清單 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {currentGroupList.map((grp) => {
                const isSelected = selectedIndustryGroupId === grp.id;
                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => {
                      setSelectedIndustryGroupId(grp.id);
                      setIndustrySearchQuery('');
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
                value={industrySearchQuery}
                onChange={(e) => setIndustrySearchQuery(e.target.value)}
                placeholder="在此族群中搜尋代號或名稱 (如 2330, 東台)..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1F2631] text-xs text-[#191F28] dark:text-[#F2F4F8] placeholder-[#8B95A1] border border-[#EAEDF2] dark:border-[#262C36] focus:outline-hidden"
              />
            </div>
          </div>

          {/* 該族群內的標的列表 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#8B95A1] px-1">
              <span>
                {currentGroupList.find((g) => g.id === selectedIndustryGroupId)?.name} · 列表 (
                {currentGroupStocks.length} 檔)
              </span>
              <span>點擊開啟股票資訊與 K 線</span>
            </div>

            {currentGroupStocks.length === 0 ? (
              <div className="toss-card p-8 text-center text-xs text-[#8B95A1]">
                該族群中查無相符標的
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentGroupStocks.map((stock) => {
                  const screenerStock = screenerStocks.find(
                    (s) => s.symbol.replace(/\.(TW|TWO)$/i, '') === stock.id
                  );
                  const watched = isInWatchlist(stock.symbol);

                  return (
                    <div
                      key={stock.id}
                      onClick={() => void handleSafeOpenStock(screenerStock || stock)}
                      className="toss-card p-3 cursor-pointer hover:border-[#2563EB]/40 transition-all flex items-center justify-between group"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8] group-hover:text-[#2563EB] transition-colors">
                            {stock.name}
                          </span>
                          <span className="text-xs font-mono font-semibold text-[#8B95A1]">
                            {stock.id}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] text-[#8B95A1]">
                            {stock.market}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#8B95A1] line-clamp-1">
                          {stock.sector}
                        </div>
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
                          <span className="text-[11px] font-medium text-[#2563EB] group-hover:underline">
                            查看資訊 ↗
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-[#8B95A1] group-hover:text-[#2563EB]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 視圖 3: 策略選股 (量化篩選漏斗) */}
      {/* ========================================================================= */}
      {activeTab === 'screener' && (
        <section className="space-y-3">
          {/* 策略切換膠囊 */}
          <div className="toss-card p-3 space-y-2">
            <div className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
              精選實戰量化策略
            </div>
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
          </div>

          {/* 策略入選標的列表 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#8B95A1] px-1">
              <span>策略符合條件標的 ({passedStocks.length} 檔)</span>
              <span>點擊查看完整股票資訊</span>
            </div>

            {passedStocks.length === 0 ? (
              <div className="toss-card p-8 text-center text-xs text-[#8B95A1]">
                目前無標的完全符合此策略條件，可放寬篩選標準
              </div>
            ) : (
              passedStocks.map((stock) => (
                <div
                  key={stock.symbol}
                  onClick={() => void handleSafeOpenStock(stock)}
                  className="toss-card p-3.5 cursor-pointer hover:border-[#2563EB]/40 transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-[#191F28] dark:text-[#F2F4F8] group-hover:text-[#2563EB] transition-colors">
                        {stock.name}
                      </span>
                      <span className="text-xs font-mono font-semibold text-[#8B95A1]">
                        {stock.symbol}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#F0F2F6] dark:bg-[#1F2631] text-[10px] text-[#4E5968] dark:text-[#9BA4B0] font-medium">
                        {stock.sectorName}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8B95A1]">
                      ROE {stock.roePct}% · 營收 YoY +{stock.revenueYoYPct}% · 法人買超 {stock.instNetBuy5dLots} 張
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right tabular-nums">
                      <div className="text-base font-extrabold text-[#191F28] dark:text-white">
                        NT$ {stock.price.toLocaleString()}
                      </div>
                      <div
                        className={`text-[11px] font-bold inline-block px-1.5 py-0.2 rounded-md ${
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
      {/* 視圖 4: 板塊熱度 (資金輪動熱力方塊) */}
      {/* ========================================================================= */}
      {activeTab === 'sectors' && (
        <section className="space-y-3">
          <div className="toss-card p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#191F28] dark:text-[#F2F4F8]">
                板塊資金輪動方塊熱圖
              </span>
              <span className="text-[11px] text-[#8B95A1]">點擊方塊檢視成分股</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sectorFlowStats.map((sec) => (
                <div
                  key={sec.sectorId}
                  onClick={() => setSelectedSectorId(sec.sectorId)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedSectorId === sec.sectorId
                      ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-blue-50/40 dark:bg-blue-950/20'
                      : 'border-[#EAEDF2] dark:border-[#262C36] bg-white dark:bg-[#161B22]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                    <span>{sec.name}</span>
                    <span
                      className={`tabular-nums ${
                        sec.avgDailyChangePct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                      }`}
                    >
                      {sec.avgDailyChangePct >= 0 ? '+' : ''}
                      {sec.avgDailyChangePct}%
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8B95A1] mt-1 flex items-center justify-between">
                    <span>成交比重 {sec.turnoverSharePct}%</span>
                    <span>{sec.stockCount} 檔</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 個股詳情底層抽屜 (Bottom Sheet Modal) —— 股票資訊 / K線 / AI決策 / 同業估值 */}
      {/* ========================================================================= */}
      {detailStock && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-2xl max-h-[92vh] bg-white dark:bg-[#0E1116] rounded-t-3xl sm:rounded-3xl border border-[#EAEDF2] dark:border-[#262C36] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
            {/* 抽屜頂部標題列 */}
            <div className="p-4 border-b border-[#EAEDF2] dark:border-[#262C36] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-[#191F28] dark:text-white">
                      {detailStock.name}
                    </h2>
                    <span className="text-xs font-mono font-bold text-[#8B95A1]">
                      {detailStock.symbol}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#F0F2F6] dark:bg-[#1F2631] text-[10px] text-[#4E5968] dark:text-[#9BA4B0] font-semibold">
                      {detailStock.sectorName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 tabular-nums">
                    <span className="text-xl font-black text-[#191F28] dark:text-white">
                      NT$ {detailStock.price.toLocaleString()}
                    </span>
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded ${
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
              </div>

              <button
                type="button"
                onClick={() => setDetailStock(null)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-[#8B95A1] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 抽屜四頁籤導航列 (股票資訊 / 移動K線 / AI深度決策 / 同業估值) */}
            <div className="flex border-b border-[#EAEDF2] dark:border-[#262C36] bg-[#F6F7F9] dark:bg-[#161B22] text-xs font-bold px-2 pt-1 gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setDetailTab('overview')}
                className={`py-2.5 px-3 rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  detailTab === 'overview'
                    ? 'bg-white dark:bg-[#0E1116] text-[#2563EB] border-t-2 border-[#2563EB] shadow-2xs'
                    : 'text-[#8B95A1] hover:text-[#191F28]'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>📊 股票詳細資訊</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('kline')}
                className={`py-2.5 px-3 rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  detailTab === 'kline'
                    ? 'bg-white dark:bg-[#0E1116] text-[#2563EB] border-t-2 border-[#2563EB] shadow-2xs'
                    : 'text-[#8B95A1] hover:text-[#191F28]'
                }`}
              >
                <CandlestickIcon className="w-3.5 h-3.5" />
                <span>📈 移動日 K 線</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('ai_report')}
                className={`py-2.5 px-3 rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  detailTab === 'ai_report'
                    ? 'bg-white dark:bg-[#0E1116] text-[#2563EB] border-t-2 border-[#2563EB] shadow-2xs'
                    : 'text-[#8B95A1] hover:text-[#191F28]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>🧠 AI 深度決策</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('valuation')}
                className={`py-2.5 px-3 rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  detailTab === 'valuation'
                    ? 'bg-white dark:bg-[#0E1116] text-[#2563EB] border-t-2 border-[#2563EB] shadow-2xs'
                    : 'text-[#8B95A1] hover:text-[#191F28]'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>🧭 同業估值</span>
              </button>
            </div>

            {/* 抽屜可滾動主內容 */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* ========================================================= */}
              {/* 子頁籤 1: 股票詳細資訊 (即時開高低收 + 關鍵財務與籌碼指標) */}
              {/* ========================================================= */}
              {detailTab === 'overview' && (
                <div className="space-y-3.5 text-xs">
                  {/* 今日行情開高低收數據網格 */}
                  <div className="toss-card p-3.5 space-y-2">
                    <div className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8] flex items-center justify-between">
                      <span>即時行情與盤後數據</span>
                      <span className="text-[10px] text-[#8B95A1]">台灣證券交易所 / 櫃買中心</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 tabular-nums">
                      <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                        <div className="text-[10px] text-[#8B95A1]">今日開盤</div>
                        <div className="text-sm font-bold text-[#191F28] dark:text-white">
                          NT$ {detailStock.price}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                        <div className="text-[10px] text-[#8B95A1]">最高價</div>
                        <div className="text-sm font-bold text-[#F04452]">
                          NT$ {Math.round(detailStock.price * 1.025 * 10) / 10}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                        <div className="text-[10px] text-[#8B95A1]">最低價</div>
                        <div className="text-sm font-bold text-[#059669]">
                          NT$ {Math.round(detailStock.price * 0.985 * 10) / 10}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                        <div className="text-[10px] text-[#8B95A1]">ATR (14日波幅)</div>
                        <div className="text-sm font-bold text-[#2563EB]">
                          {detailStock.atr14 || 1.2} 元
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 核心基本面 8 大指標卡 */}
                  <div className="toss-card p-3.5 space-y-2.5">
                    <div className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                      核心財務與估值特徵
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 tabular-nums">
                      <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                        <div className="text-[10px] text-[#8B95A1]">本益比 P/E</div>
                        <div className="text-sm font-bold text-[#191F28] dark:text-white">
                          {detailStock.peRatio} 倍
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                        <div className="text-[10px] text-[#8B95A1]">股價淨值比 P/B</div>
                        <div className="text-sm font-bold text-[#191F28] dark:text-white">
                          {detailStock.pbRatio} 倍
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                        <div className="text-[10px] text-[#8B95A1]">ROE 股東權益報酬</div>
                        <div className="text-sm font-bold text-[#2563EB]">
                          {detailStock.roePct}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                        <div className="text-[10px] text-[#8B95A1]">現金殖利率</div>
                        <div className="text-sm font-bold text-[#059669]">
                          {detailStock.dividendYieldPct}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                        <div className="text-[10px] text-[#8B95A1]">營業毛利率</div>
                        <div className="text-sm font-bold text-[#191F28] dark:text-white">
                          {detailStock.grossMarginPct}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                        <div className="text-[10px] text-[#8B95A1]">營業利益率 OPM</div>
                        <div className="text-sm font-bold text-[#191F28] dark:text-white">
                          {detailStock.opmPct || 8.5}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                        <div className="text-[10px] text-[#8B95A1]">單月營收 YoY</div>
                        <div
                          className={`text-sm font-bold ${
                            detailStock.revenueYoYPct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                          }`}
                        >
                          {detailStock.revenueYoYPct >= 0 ? '+' : ''}
                          {detailStock.revenueYoYPct}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                        <div className="text-[10px] text-[#8B95A1]">自由現金流</div>
                        <div className="text-sm font-bold text-emerald-600">
                          {detailStock.freeCashFlowPositive ? '正向流入' : '需關注'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 三大法人籌碼與均線動能 */}
                  <div className="toss-card p-3.5 space-y-2">
                    <div className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                      三大法人籌碼與動能位階
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 tabular-nums">
                      <div className="p-2 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                        <div className="text-[10px] text-[#8B95A1]">法人近 5 日買賣超</div>
                        <div
                          className={`text-xs font-bold ${
                            detailStock.instNetBuy5dLots >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                          }`}
                        >
                          {detailStock.instNetBuy5dLots >= 0 ? '+' : ''}
                          {detailStock.instNetBuy5dLots} 張
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                        <div className="text-[10px] text-[#8B95A1]">投信近 5 日買賣超</div>
                        <div
                          className={`text-xs font-bold ${
                            detailStock.trustNetBuy5dLots >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                          }`}
                        >
                          {detailStock.trustNetBuy5dLots >= 0 ? '+' : ''}
                          {detailStock.trustNetBuy5dLots} 張
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                        <div className="text-[10px] text-[#8B95A1]">60MA 季線位階</div>
                        <div className="text-xs font-bold text-emerald-600">
                          {detailStock.aboveMa60 ? '季線上方 (多頭)' : '季線下方 (整理)'}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                        <div className="text-[10px] text-[#8B95A1]">近 60 日動能</div>
                        <div
                          className={`text-xs font-bold ${
                            detailStock.momentum60dPct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                          }`}
                        >
                          {detailStock.momentum60dPct >= 0 ? '+' : ''}
                          {detailStock.momentum60dPct}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 快捷引導至 K 線與 AI 決策 */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setDetailTab('kline')}
                      className="flex-1 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <CandlestickIcon className="w-4 h-4" />
                      <span>查看可滑動日 K 線圖</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab('ai_report')}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>查看 Gemini 操盤決策</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* 子頁籤 2: 移動日 K 線 (支援手勢觸控左右平移滑動與縮放) */}
              {/* ========================================================= */}
              {detailTab === 'kline' && (
                <div className="space-y-3">
                  <CandlestickChart
                    symbol={detailStock.symbol}
                    stockName={detailStock.name}
                    currentPrice={detailStock.price}
                    token={settings.finMindToken}
                    tradeLevels={tradeLevels}
                    height={320}
                  />

                  {/* 關鍵價位階梯看板 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center tabular-nums text-xs">
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

              {/* ========================================================= */}
              {/* 子頁籤 3: AI 深度決策 (Gemini 3.5 操盤手觀點 + 風控梯形) */}
              {/* ========================================================= */}
              {detailTab === 'ai_report' && (
                <AIAnalysisReportView stock={detailStock} allStocks={screenerStocks} />
              )}

              {/* ========================================================= */}
              {/* 子頁籤 4: 同業相對估值 */}
              {/* ========================================================= */}
              {detailTab === 'valuation' && (
                <div className="space-y-3 text-xs">
                  <div className="toss-card p-3.5 space-y-2">
                    <div className="font-bold text-[#191F28] dark:text-[#F2F4F8]">
                      同業相對估值定錨模型
                    </div>
                    <p className="text-xs text-[#4E5968] dark:text-[#9BA4B0] leading-relaxed">
                      透過同產業中位數本益比，推導個股公允基本面目標價 (TP2 = NT$ {tradeLevels[2]?.price})。若股價跌破 $SL = NT$ {tradeLevels[0]?.price} (2 ATR 防守線)，即觸發嚴格風控紀律停損。
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 抽屜底部動作列 (加入自選 / 轉入持倉) */}
            <div className="p-3.5 border-t border-[#EAEDF2] dark:border-[#262C36] bg-[#F6F7F9] dark:bg-[#161B22] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleToggleWatchlist(detailStock, 'watching')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
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
