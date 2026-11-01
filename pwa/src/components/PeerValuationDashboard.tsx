import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart2,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronRight,
  Compass,
  Crosshair,
  ExternalLink,
  Info,
  Layers,
  Percent,
  Plus,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import {
  calculatePercentile,
  calculateTrimmedMedian,
  evaluatePeerValuationAndTradePlan,
  findAlgorithmicPeers,
  PEER_SUPPLY_CHAIN_GROUPS,
} from '../services/peerValuationEngine';
import { evaluateAndRankStrategies } from '../services/strategyRankingEngine';
import {
  PeerTagType,
  ScreenerStockItem,
  TradePlanStage,
  UserTradePlan,
} from '../types';

interface PeerValuationDashboardProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

type GroupingMode = 'supply_chain' | 'official' | 'algo' | 'custom';

export const PeerValuationDashboard: React.FC<PeerValuationDashboardProps> = ({
  selectedSymbol,
  onSelectSymbol,
}) => {
  const {
    screenerStocks,
    watchlist,
    upsertWatchlistItem,
    tradePlans,
    upsertTradePlan,
    deleteTradePlan,
    updateTradePlanStage,
  } = useVault();

  // 1. 同業分群模式與設定
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('supply_chain');
  const [selectedSupplyChainTag, setSelectedSupplyChainTag] = useState<string>('ai_server_cooling');
  const [customPeerBasket, setCustomPeerBasket] = useState<string[]>([
    '3017.TW',
    '3324.TW',
    '3653.TW',
    '2382.TW',
    '6669.TW',
    '2308.TW',
  ]);

  // 2. 部位風控計算機參數
  const [capitalBudget, setCapitalBudget] = useState<number>(1000000);
  const [riskBudgetPct, setRiskBudgetPct] = useState<number>(1.5);

  // 3. 提示通知狀態
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 目標股票
  const targetStock = useMemo(() => {
    return (
      screenerStocks.find(
        (s) => s.symbol.toUpperCase() === selectedSymbol.toUpperCase()
      ) || screenerStocks[0]
    );
  }, [screenerStocks, selectedSymbol]);

  // 同業候選池
  const { peerStocks, groupTitle, groupType } = useMemo(() => {
    if (groupingMode === 'supply_chain') {
      const group =
        PEER_SUPPLY_CHAIN_GROUPS.find((g) => g.tag === selectedSupplyChainTag) ||
        PEER_SUPPLY_CHAIN_GROUPS[1];
      const peers = screenerStocks.filter(
        (s) =>
          group.symbols.includes(s.symbol) &&
          s.symbol.toUpperCase() !== targetStock.symbol.toUpperCase()
      );
      return { peerStocks: peers, groupTitle: group.name, groupType: 'supply_chain' as PeerTagType };
    }

    if (groupingMode === 'official') {
      const peers = screenerStocks.filter(
        (s) =>
          s.sectorId === targetStock.sectorId &&
          s.symbol.toUpperCase() !== targetStock.symbol.toUpperCase()
      );
      return { peerStocks: peers, groupTitle: targetStock.sectorName, groupType: 'official' as PeerTagType };
    }

    if (groupingMode === 'algo') {
      const peers = findAlgorithmicPeers(targetStock, screenerStocks, 5);
      return {
        peerStocks: peers,
        groupTitle: '🤖 AI 餘弦相似度演算法匹配同業 (毛利率/ROE/YoY/市值)',
        groupType: 'quant_cluster' as PeerTagType,
      };
    }

    // 自訂籃子
    const peers = screenerStocks.filter(
      (s) =>
        customPeerBasket.includes(s.symbol) &&
        s.symbol.toUpperCase() !== targetStock.symbol.toUpperCase()
    );
    return { peerStocks: peers, groupTitle: '🧺 自訂比較籃子', groupType: 'custom' as const };
  }, [groupingMode, selectedSupplyChainTag, targetStock, screenerStocks, customPeerBasket]);

  // 執行同業估值與三階 TP/SL 風控計算
  const valuationResult = useMemo(() => {
    return evaluatePeerValuationAndTradePlan(
      targetStock,
      peerStocks,
      groupTitle,
      groupType,
      capitalBudget,
      riskBudgetPct
    );
  }, [targetStock, peerStocks, groupTitle, groupType, capitalBudget, riskBudgetPct]);

  // 執行五大策略評比與最佳推薦
  const strategyEvaluation = useMemo(() => {
    return evaluateAndRankStrategies(targetStock, valuationResult);
  }, [targetStock, valuationResult]);

  // 已儲存之交易計畫
  const activeTradePlan = useMemo(() => {
    return tradePlans.find(
      (p) => p.symbol.toUpperCase() === targetStock.symbol.toUpperCase()
    );
  }, [tradePlans, targetStock]);

  const handleSaveTradePlan = () => {
    upsertTradePlan(valuationResult.tradePlan);
    showToast(`✅ 已將「${targetStock.name}」寫入交易計畫與動態 TP/SL 監控！`);
  };

  const handleToggleCustomPeer = (sym: string) => {
    setCustomPeerBasket((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleAddToWatch = (type: 'watching' | 'favorite') => {
    upsertWatchlistItem({
      id: `wl-${targetStock.symbol}-${Date.now()}`,
      symbol: targetStock.symbol,
      name: targetStock.name,
      sectorName: targetStock.sectorName,
      listType: type,
      addedPrice: targetStock.price,
      currentPrice: targetStock.price,
      targetBuyPrice: valuationResult.tradePlan.tp1Price,
      stopLossPrice: valuationResult.tradePlan.slPrice,
      strategyTag: strategyEvaluation.bestStrategy.strategyName,
      notes: `同業折價 ${Math.abs(valuationResult.discountPct)}% · TP2 ${valuationResult.targetFairValue} · 風報比 ${valuationResult.tradePlan.riskRewardRatio}:1`,
      addedAt: new Date().toISOString(),
    });
    showToast(`⭐ 已加入${type === 'watching' ? '觀察清單' : '自選核心'}！`);
  };

  // 五維度雷達圖繪製計算
  const radarSvgPoints = useMemo(() => {
    const rScores = valuationResult.radarScores;
    const scores = [
      rScores.valuationAttraction,
      rScores.growthMomentum,
      rScores.profitMoat,
      rScores.capitalEfficiency,
      rScores.chipConcentration,
    ];
    const cx = 130;
    const cy = 130;
    const maxR = 90;
    const angles = [-Math.PI / 2, -Math.PI / 2 + 0.4 * Math.PI, -Math.PI / 2 + 0.8 * Math.PI, -Math.PI / 2 + 1.2 * Math.PI, -Math.PI / 2 + 1.6 * Math.PI];

    const polyPoints = scores
      .map((score, i) => {
        const r = (Math.max(10, score) / 100) * maxR;
        const x = cx + r * Math.cos(angles[i]);
        const y = cy + r * Math.sin(angles[i]);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const axisPoints = angles.map((ang) => {
      const x = cx + maxR * Math.cos(ang);
      const y = cy + maxR * Math.sin(ang);
      return { x, y };
    });

    return { cx, cy, maxR, polyPoints, axisPoints };
  }, [valuationResult.radarScores]);

  // ROE vs P/B 迴歸散佈圖計算
  const scatterSvgData = useMemo(() => {
    const all = [targetStock, ...valuationResult.peerStocks];
    const width = 320;
    const height = 180;
    const padX = 35;
    const padY = 25;
    const plotW = width - padX * 2;
    const plotH = height - padY * 2;

    const maxRoe = 40;
    const maxPb = 10;

    const getX = (roe: number) => padX + (Math.min(maxRoe, Math.max(0, roe)) / maxRoe) * plotW;
    const getY = (pb: number) => height - padY - (Math.min(maxPb, Math.max(0, pb)) / maxPb) * plotH;

    const points = all.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      roe: s.roePct,
      pb: s.pbRatio,
      x: getX(s.roePct),
      y: getY(s.pbRatio),
      isTarget: s.symbol.toUpperCase() === targetStock.symbol.toUpperCase(),
    }));

    // 迴歸線端點
    const reg = valuationResult.regression;
    const lineX1 = getX(0);
    const lineY1 = getY(reg.intercept);
    const lineX2 = getX(maxRoe);
    const lineY2 = getY(reg.slope * maxRoe + reg.intercept);

    return { width, height, points, lineX1, lineY1, lineX2, lineY2, padX, padY, plotW, plotH };
  }, [targetStock, valuationResult.peerStocks, valuationResult.regression]);

  return (
    <div className="space-y-4">
      {/* Toast 提示條 */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[#191F28] text-white text-xs font-semibold shadow-xl border border-gray-700 animate-fade-in flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. 標的股票選擇器與頂部核心資訊 */}
      <section className="toss-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
              智慧同業比較與相對估值引擎
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-[#2563EB]">
            動態估值定價
          </span>
        </div>

        {/* 熱門標的橫向切換藥丸 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {screenerStocks.slice(0, 10).map((s) => {
            const isSelected = s.symbol.toUpperCase() === targetStock.symbol.toUpperCase();
            return (
              <button
                key={s.symbol}
                type="button"
                onClick={() => onSelectSymbol(s.symbol)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-sm'
                    : 'bg-[#F6F7F9] dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0] border-[#EAEDF2] dark:border-[#262C36] hover:border-[#CBD5E1]'
                }`}
              >
                {s.name} ({s.symbol.replace('.TW', '')})
              </button>
            );
          })}
        </div>

        {/* 標的股票卡片 */}
        <div className="p-3.5 rounded-2xl bg-[#F6F7F9] dark:bg-[#1A202C] border border-[#EAEDF2] dark:border-[#262C36] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-extrabold text-[#191F28] dark:text-[#F2F4F8]">
                {targetStock.name}
              </span>
              <span className="text-xs font-mono text-[#8B95A1]">
                {targetStock.symbol}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-200 dark:bg-[#262C36] text-[#4E5968] dark:text-[#9BA4B0]">
                {targetStock.sectorName}
              </span>
              {targetStock.isCyclical && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  景氣循環股
                </span>
              )}
            </div>
            <p className="text-xs text-[#4E5968] dark:text-[#9BA4B0]">
              {targetStock.subTheme} · {targetStock.catalystNote}
            </p>
          </div>

          <div className="flex items-baseline sm:flex-col sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E5E8EB] dark:border-[#262C36]">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-[#8B95A1]">市價 (P₀)</span>
              <span className="text-xl font-extrabold text-[#191F28] dark:text-[#F2F4F8] tabular-nums">
                ${targetStock.price.toLocaleString()}
              </span>
            </div>
            <span
              className={`text-xs font-bold tabular-nums ${
                targetStock.dailyChangePct >= 0 ? 'text-[#F04452]' : 'text-[#10B981]'
              }`}
            >
              {targetStock.dailyChangePct >= 0 ? '+' : ''}
              {targetStock.dailyChangePct}%
            </span>
          </div>
        </div>
      </section>

      {/* 2. 動態同業分群模式切換器 */}
      <section className="toss-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
              動態同業分群基準 (Dynamic Peer Clustering)
            </h3>
          </div>
          <span className="text-[11px] text-[#8B95A1]">
            共比對 {valuationResult.peerStocks.length} 家競爭同業
          </span>
        </div>

        {/* 4 大分群模式 Segmented Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {[
            { id: 'supply_chain', label: '⛓️ 概念供應鏈', desc: '上下游細分族群' },
            { id: 'official', label: '🏢 官方產業', desc: '證交所大分類' },
            { id: 'algo', label: '🤖 AI 相似推薦', desc: '財報特徵餘弦匹配' },
            { id: 'custom', label: '🧺 自訂籃子', desc: '自由增刪對標' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setGroupingMode(mode.id as GroupingMode)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                groupingMode === mode.id
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-[#2563EB] text-[#2563EB]'
                  : 'bg-[#F6F7F9] dark:bg-[#1F2631] border-[#EAEDF2] dark:border-[#262C36] text-[#4E5968] dark:text-[#9BA4B0] hover:border-[#CBD5E1]'
              }`}
            >
              <div className="text-xs font-bold">{mode.label}</div>
              <div className="text-[10px] opacity-75">{mode.desc}</div>
            </button>
          ))}
        </div>

        {/* 若為供應鏈模式，提供細分子群切換 */}
        {groupingMode === 'supply_chain' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs pt-1">
            {PEER_SUPPLY_CHAIN_GROUPS.map((grp) => (
              <button
                key={grp.tag}
                type="button"
                onClick={() => setSelectedSupplyChainTag(grp.tag)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedSupplyChainTag === grp.tag
                    ? 'bg-[#191F28] text-white dark:bg-white dark:text-[#191F28]'
                    : 'bg-[#F0F2F6] dark:bg-[#1A202C] text-[#4E5968] dark:text-[#9BA4B0]'
                }`}
              >
                {grp.name}
              </button>
            ))}
          </div>
        )}

        {/* 若為自訂籃子模式，提供打勾選擇同業 */}
        {groupingMode === 'custom' && (
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1A202C] border border-[#EAEDF2] dark:border-[#262C36] space-y-2">
            <div className="text-[11px] font-bold text-[#4E5968] dark:text-[#9BA4B0]">
              手動勾選欲納入比較的同業標的（即時動態重算中位數）：
            </div>
            <div className="flex flex-wrap gap-1.5">
              {screenerStocks
                .filter((s) => s.symbol !== targetStock.symbol)
                .map((s) => {
                  const isChecked = customPeerBasket.includes(s.symbol);
                  return (
                    <button
                      key={s.symbol}
                      type="button"
                      onClick={() => handleToggleCustomPeer(s.symbol)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border ${
                        isChecked
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] border-[#2563EB]'
                          : 'bg-white dark:bg-[#161B22] text-[#8B95A1] border-gray-200 dark:border-gray-800'
                      }`}
                    >
                      {isChecked ? <Check className="w-3 h-3 text-[#2563EB]" /> : <Plus className="w-3 h-3" />}
                      <span>{s.name} ({s.symbol.replace('.TW', '')})</span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* 納入比較的同業清單一覽 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] text-[#8B95A1] shrink-0 font-medium">當前同業池：</span>
          {valuationResult.peerStocks.map((p) => (
            <span
              key={p.symbol}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-[#1A202C] border border-[#EAEDF2] dark:border-[#262C36] text-[#191F28] dark:text-[#F2F4F8] text-[11px] shrink-0 font-medium"
            >
              {p.name} (P/E {p.peRatio})
            </span>
          ))}
        </div>
      </section>

      {/* 3. 同業估值核心總覽卡片與品質溢價 (Auto-Valuation) */}
      <section className="toss-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
              相對估值定價 (Relative Valuation to TP2)
            </h3>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              valuationResult.isDiscounted
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
            }`}
          >
            {valuationResult.isDiscounted
              ? `🔥 相對同業折價 ${Math.abs(valuationResult.discountPct)}%`
              : `⚠️ 相對同業溢價 +${valuationResult.discountPct}%`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* 基本面合理目標價 (TP2) */}
          <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40">
            <div className="text-[11px] text-[#2563EB] font-bold flex items-center gap-1">
              <span>基本面合理價 (TP2)</span>
            </div>
            <div className="text-xl font-extrabold text-[#2563EB] tabular-nums mt-0.5">
              ${valuationResult.targetFairValue}
            </div>
            <div className="text-[10px] text-[#4E5968] dark:text-[#9BA4B0] mt-1">
              潛在空間: <span className="font-bold tabular-nums text-[#2563EB]">+{valuationResult.tradePlan.upsideTp2Pct}%</span>
            </div>
          </div>

          {/* 同業中位數與截尾中位數 */}
          <div className="p-3 rounded-2xl bg-[#F6F7F9] dark:bg-[#1F2631] border border-[#EAEDF2] dark:border-[#262C36]">
            <div className="text-[11px] text-[#8B95A1] font-medium">同業中位數 PE</div>
            <div className="text-lg font-bold text-[#191F28] dark:text-[#F2F4F8] tabular-nums mt-0.5">
              {valuationResult.peerMedianPe}x
            </div>
            <div className="text-[10px] text-[#8B95A1] mt-1">
              截尾防扭曲: <span className="tabular-nums font-semibold">{valuationResult.peerTrimmedMedianPe}x</span>
            </div>
          </div>

          {/* 品質溢價係數 */}
          <div className="p-3 rounded-2xl bg-[#F6F7F9] dark:bg-[#1F2631] border border-[#EAEDF2] dark:border-[#262C36]">
            <div className="text-[11px] text-[#8B95A1] font-medium">品質溢價係數 α</div>
            <div className="text-lg font-bold text-[#191F28] dark:text-[#F2F4F8] tabular-nums mt-0.5">
              {valuationResult.qualityPremiumAlpha > 0 ? `+${valuationResult.qualityPremiumAlpha * 100}%` : '0%'}
            </div>
            <div className="text-[10px] text-[#8B95A1] mt-1">
              {valuationResult.qualityPremiumAlpha > 0 ? '營益率 > 同業 Q3' : '獲利同業中標'}
            </div>
          </div>

          {/* 估值方法與護欄 */}
          <div className="p-3 rounded-2xl bg-[#F6F7F9] dark:bg-[#1F2631] border border-[#EAEDF2] dark:border-[#262C36]">
            <div className="text-[11px] text-[#8B95A1] font-medium">定價方法與護欄</div>
            <div className="text-lg font-bold text-[#191F28] dark:text-[#F2F4F8] tabular-nums mt-0.5">
              {valuationResult.valuationMethod === 'PE' ? '中位數 P/E' : '歷史 P/B 錨定'}
            </div>
            <div className="text-[10px] text-[#8B95A1] mt-1">
              {valuationResult.isCyclical ? '景氣循環股自動切換 PB' : '已剔除極端值'}
            </div>
          </div>
        </div>

        {/* 估值公式透明白話解析 */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1A202C] border border-[#EAEDF2] dark:border-[#262C36] text-xs text-[#4E5968] dark:text-[#9BA4B0] space-y-1">
          <div className="font-semibold text-[#191F28] dark:text-[#F2F4F8] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>定價推導公式：</span>
          </div>
          <p className="font-mono text-[11px] text-[#2563EB] dark:text-blue-400">
            Target Price = 預估 EPS ({valuationResult.targetEstimatedEps}元) × 同業中位數 PE ({valuationResult.peerMedianPe}x) × (1 + {valuationResult.qualityPremiumAlpha > 0 ? '+10%' : '0%'} α) = ${valuationResult.targetFairValue}
          </p>
          <p className="text-[11px] text-[#8B95A1]">
            該目標價已自動寫入交易計畫之 <span className="font-bold text-[#191F28] dark:text-[#F2F4F8]">TP2 (核心止盈價)</span>，作為基本面合理均值回歸的獲利了結點。
          </p>
        </div>
      </section>

      {/* 4. 五維度 PR 百分位雷達圖 & ROE-PB 迴歸散佈圖 (雙圖表並列) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 圖表 A：五維度 PR 百分位雷達圖 */}
        <section className="toss-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                五維度同業百分位雷達 (PR 0~100)
              </h3>
            </div>
            <span className="text-[10px] text-[#8B95A1]">
              PR ≥ 70 代表擊敗 70% 同業
            </span>
          </div>

          <div className="flex justify-center items-center py-2">
            <svg width="260" height="260" viewBox="0 0 260 260" className="overflow-visible">
              {/* 五邊形網格底層 */}
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((level) => {
                const r = radarSvgPoints.maxR * level;
                const points = radarSvgPoints.axisPoints
                  .map((_, i) => {
                    const ang = -Math.PI / 2 + i * 0.4 * Math.PI;
                    const x = radarSvgPoints.cx + r * Math.cos(ang);
                    const y = radarSvgPoints.cy + r * Math.sin(ang);
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' ');
                return (
                  <polygon
                    key={level}
                    points={points}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={level === 1 ? '0.25' : '0.12'}
                    strokeWidth="1"
                  />
                );
              })}

              {/* 放射軸線 */}
              {radarSvgPoints.axisPoints.map((pt, i) => (
                <line
                  key={i}
                  x1={radarSvgPoints.cx}
                  y1={radarSvgPoints.cy}
                  x2={pt.x}
                  y2={pt.y}
                  stroke="currentColor"
                  strokeOpacity="0.15"
                  strokeWidth="1"
                />
              ))}

              {/* 標的值填充多邊形 */}
              <polygon
                points={radarSvgPoints.polyPoints}
                fill="#2563EB"
                fillOpacity="0.25"
                stroke="#2563EB"
                strokeWidth="2.5"
              />

              {/* 各軸文字標籤 */}
              {[
                { label: `估值吸引力 (${valuationResult.radarScores.valuationAttraction})`, x: 130, y: 22 },
                { label: `成長動能 (${valuationResult.radarScores.growthMomentum})`, x: 232, y: 100 },
                { label: `獲利護城河 (${valuationResult.radarScores.profitMoat})`, x: 198, y: 235 },
                { label: `資本效率 (${valuationResult.radarScores.capitalEfficiency})`, x: 62, y: 235 },
                { label: `籌碼集中 (${valuationResult.radarScores.chipConcentration})`, x: 28, y: 100 },
              ].map((lbl, idx) => (
                <text
                  key={idx}
                  x={lbl.x}
                  y={lbl.y}
                  fontSize="10"
                  textAnchor="middle"
                  fontWeight="bold"
                  fill="currentColor"
                  className="fill-[#4E5968] dark:fill-[#9BA4B0]"
                >
                  {lbl.label}
                </text>
              ))}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0]">
            <span>綜合優勢評定：</span>
            <span className="font-bold text-[#2563EB]">
              {valuationResult.radarScores.profitMoat >= 70 && valuationResult.radarScores.valuationAttraction >= 60
                ? '🏆 高成長低估值錯殺標的'
                : valuationResult.radarScores.growthMomentum >= 75
                ? '🔥 高動能成長領先股'
                : '⚖️ 穩健價值型防禦標的'}
            </span>
          </div>
        </section>

        {/* 圖表 B：ROE vs P/B 估值迴歸散佈圖 */}
        <section className="toss-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                ROE vs. P/B 相對估值迴歸散佈圖
              </h3>
            </div>
            <span className="text-[10px] text-[#8B95A1]">
              迴歸線下方 = 相對折價
            </span>
          </div>

          <div className="flex justify-center items-center py-2">
            <svg width={scatterSvgData.width} height={scatterSvgData.height} className="overflow-visible">
              {/* 綠色折價陰影區域 (迴歸線下方) */}
              <polygon
                points={`${scatterSvgData.padX},${scatterSvgData.lineY1} ${scatterSvgData.width - scatterSvgData.padX},${scatterSvgData.lineY2} ${scatterSvgData.width - scatterSvgData.padX},${scatterSvgData.height - scatterSvgData.padY} ${scatterSvgData.padX},${scatterSvgData.height - scatterSvgData.padY}`}
                fill="#10B981"
                fillOpacity="0.08"
              />

              {/* 坐標軸 */}
              <line
                x1={scatterSvgData.padX}
                y1={scatterSvgData.height - scatterSvgData.padY}
                x2={scatterSvgData.width - scatterSvgData.padX}
                y2={scatterSvgData.height - scatterSvgData.padY}
                stroke="currentColor"
                strokeOpacity="0.2"
                strokeWidth="1"
              />
              <line
                x1={scatterSvgData.padX}
                y1={scatterSvgData.padY}
                x2={scatterSvgData.padX}
                y2={scatterSvgData.height - scatterSvgData.padY}
                stroke="currentColor"
                strokeOpacity="0.2"
                strokeWidth="1"
              />

              {/* 軸文字標籤 */}
              <text
                x={scatterSvgData.width - scatterSvgData.padX}
                y={scatterSvgData.height - 8}
                fontSize="9"
                fill="currentColor"
                textAnchor="end"
                className="fill-[#8B95A1]"
              >
                ROE (%)
              </text>
              <text
                x={scatterSvgData.padX - 8}
                y={scatterSvgData.padY}
                fontSize="9"
                fill="currentColor"
                textAnchor="end"
                className="fill-[#8B95A1]"
              >
                P/B
              </text>

              {/* 迴歸線 Fair Value Regression Line */}
              <line
                x1={scatterSvgData.lineX1}
                y1={scatterSvgData.lineY1}
                x2={scatterSvgData.lineX2}
                y2={scatterSvgData.lineY2}
                stroke="#2563EB"
                strokeWidth="2"
                strokeDasharray="4 3"
              />

              {/* 各點散佈 */}
              {scatterSvgData.points.map((pt) => {
                if (pt.isTarget) {
                  return (
                    <g key={pt.symbol}>
                      <circle cx={pt.x} cy={pt.y} r="8" fill="#2563EB" fillOpacity="0.25" />
                      <circle cx={pt.x} cy={pt.y} r="5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                      <text
                        x={pt.x}
                        y={pt.y - 10}
                        fontSize="10"
                        fontWeight="bold"
                        fill="#2563EB"
                        textAnchor="middle"
                      >
                        {pt.name} (★)
                      </text>
                    </g>
                  );
                }
                return (
                  <g key={pt.symbol}>
                    <circle cx={pt.x} cy={pt.y} r="3.5" fill="#9BA4B0" stroke="#FFFFFF" strokeWidth="1" />
                    <text
                      x={pt.x}
                      y={pt.y - 6}
                      fontSize="8"
                      fill="#8B95A1"
                      textAnchor="middle"
                    >
                      {pt.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0]">
            <span>迴歸折價判讀：</span>
            <span
              className={`font-bold ${
                valuationResult.regression.isBelowRegressionLine ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {valuationResult.regression.isBelowRegressionLine
                ? '✅ 位於迴歸線下方（性價比顯著高於同業平均）'
                : '⚠️ 位於迴歸線上方（估值高於同業資本回報預期）'}
            </span>
          </div>
        </section>
      </div>

      {/* 5. ATR 風控與三階段 TP/SL 定價階梯 (Trade Plan Staircase) */}
      <section className="toss-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
              ATR 風控與三階段止盈/停損階梯 (Trade Execution Plan)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#8B95A1]">
            14日 ATR = ${valuationResult.tradePlan.atr14} (1R = ${valuationResult.tradePlan.riskUnit1R})
          </span>
        </div>

        {/* 風報比警告條 (若不足 1.3:1) */}
        {valuationResult.tradePlan.isLowRiskRewardWarning && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">風報比不足警告 (Low R:R Warning)</div>
              <div>{valuationResult.tradePlan.warningMessage}</div>
            </div>
          </div>
        )}

        {/* 階梯價位看板 (SL / P0 / TP1 / TP2 / TP3) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          {/* 停損價 SL */}
          <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
            <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
              🛑 停損價 (SL)
            </div>
            <div className="text-base sm:text-lg font-extrabold text-rose-600 tabular-nums mt-0.5">
              ${valuationResult.tradePlan.slPrice}
            </div>
            <div className="text-[10px] text-[#8B95A1] mt-0.5">
              P₀ - 2×ATR (同業Q1保護)
            </div>
          </div>

          {/* 現價成本 P0 */}
          <div className="p-3 rounded-2xl bg-[#F6F7F9] dark:bg-[#1F2631] border border-[#EAEDF2] dark:border-[#262C36]">
            <div className="text-[10px] font-bold text-[#8B95A1] uppercase tracking-wider">
              📍 買進現價 (P₀)
            </div>
            <div className="text-base sm:text-lg font-extrabold text-[#191F28] dark:text-[#F2F4F8] tabular-nums mt-0.5">
              ${valuationResult.tradePlan.entryPrice}
            </div>
            <div className="text-[10px] text-[#8B95A1] mt-0.5">
              基準建倉成本
            </div>
          </div>

          {/* 保本止盈價 TP1 */}
          <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40">
            <div className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">
              🛡️ 保本止盈 (TP1)
            </div>
            <div className="text-base sm:text-lg font-extrabold text-[#2563EB] tabular-nums mt-0.5">
              ${valuationResult.tradePlan.tp1Price}
            </div>
            <div className="text-[10px] text-[#2563EB] mt-0.5 font-medium">
              折價收斂50% (減碼35%)
            </div>
          </div>

          {/* 基本面目標價 TP2 */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              🎯 核心目標 (TP2)
            </div>
            <div className="text-base sm:text-lg font-extrabold text-emerald-600 tabular-nums mt-0.5">
              ${valuationResult.tradePlan.tp2Price}
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5 font-bold">
              同業中位數均值 (減碼35%)
            </div>
          </div>

          {/* 趨勢延伸價 TP3 */}
          <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 col-span-2 sm:col-span-1">
            <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
              🚀 龍頭重估 (TP3)
            </div>
            <div className="text-base sm:text-lg font-extrabold text-purple-600 tabular-nums mt-0.5">
              ${valuationResult.tradePlan.tp3Price}
            </div>
            <div className="text-[10px] text-purple-700 dark:text-purple-300 mt-0.5 font-medium">
              同業Q90溢價 / 20MA停利
            </div>
          </div>
        </div>

        {/* 部位風險計算機 (Position Sizing) */}
        <div className="p-3.5 rounded-2xl bg-[#F6F7F9] dark:bg-[#1A202C] border border-[#EAEDF2] dark:border-[#262C36] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
              <Crosshair className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>單筆部位風險計算機（以 1R 波動度反推建議部位）：</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#8B95A1]">總資金:</span>
              <input
                type="number"
                value={capitalBudget}
                onChange={(e) => setCapitalBudget(Number(e.target.value) || 0)}
                className="w-24 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161B22] font-mono text-xs tabular-nums text-right"
              />
              <span className="text-[#8B95A1]">風險:</span>
              <input
                type="number"
                step="0.1"
                value={riskBudgetPct}
                onChange={(e) => setRiskBudgetPct(Number(e.target.value) || 0)}
                className="w-14 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161B22] font-mono text-xs tabular-nums text-right"
              />
              <span>%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-gray-200 dark:border-gray-800">
            <div>
              <span className="text-[#8B95A1]">單筆最大虧損預算:</span>
              <div className="font-bold font-mono text-[#191F28] dark:text-[#F2F4F8] tabular-nums">
                ${((capitalBudget * riskBudgetPct) / 100).toLocaleString()} 元
              </div>
            </div>
            <div>
              <span className="text-[#8B95A1]">單股風險 (1R):</span>
              <div className="font-bold font-mono text-rose-600 tabular-nums">
                ${valuationResult.tradePlan.riskUnit1R} 元
              </div>
            </div>
            <div>
              <span className="text-[#8B95A1]">建議買進股數:</span>
              <div className="font-bold font-mono text-[#2563EB] tabular-nums">
                {valuationResult.tradePlan.suggestedShares.toLocaleString()} 股 (約 {(valuationResult.tradePlan.suggestedShares / 1000).toFixed(1)} 張)
              </div>
            </div>
            <div>
              <span className="text-[#8B95A1]">整體風報比 (R:R):</span>
              <div className="font-bold font-mono text-emerald-600 tabular-nums">
                {valuationResult.tradePlan.riskRewardRatio}:1
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={handleSaveTradePlan}
              className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{activeTradePlan ? '更新至我的交易計畫' : '💾 儲存為我的交易計畫'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddToWatch('watching')}
              className="px-3 py-2 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631] text-[#191F28] dark:text-[#F2F4F8] text-xs font-semibold hover:bg-gray-200 transition-colors"
            >
              ⭐ 加入觀察清單
            </button>
            <button
              type="button"
              onClick={() => handleAddToWatch('favorite')}
              className="px-3 py-2 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631] text-[#191F28] dark:text-[#F2F4F8] text-xs font-semibold hover:bg-gray-200 transition-colors"
            >
              ❤️ 加入自選核心
            </button>
          </div>
        </div>
      </section>

      {/* 6. 🏆 策略量化評比取最佳與「推薦原因」詳解面板 */}
      <section className="toss-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
              五大策略量化對比與「最佳策略推薦」引擎 (Strategy Ranking & Best Pick)
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600">
            綜合多因子裁決
          </span>
        </div>

        {/* 冠居第一名之最佳推薦策略大卡片 */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 via-blue-50/50 to-indigo-50/60 dark:from-amber-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 border-2 border-amber-300 dark:border-amber-700/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">👑</span>
              <span className="text-sm font-extrabold text-[#191F28] dark:text-[#F2F4F8]">
                系統推薦最佳策略：{strategyEvaluation.bestStrategy.strategyName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#2563EB] text-white">
                適配度 {strategyEvaluation.bestStrategy.fitScore} 分
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                勝率 {strategyEvaluation.bestStrategy.winRatePct}%
              </span>
            </div>
          </div>

          {/* 白話推薦原因詳解 */}
          <div className="p-3 rounded-xl bg-white/90 dark:bg-[#161B22]/90 border border-amber-200 dark:border-amber-900/50 space-y-1.5 text-xs">
            <div className="font-bold text-[#191F28] dark:text-[#F2F4F8] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>為什麼推薦此策略？（勝出關鍵分析）：</span>
            </div>
            <p className="leading-relaxed text-[#333D4B] dark:text-[#D1D5DB]">
              {strategyEvaluation.overallReason}
            </p>
            <p className="text-[11px] text-[#4E5968] dark:text-[#9BA4B0] border-t border-gray-100 dark:border-gray-800 pt-1.5">
              {strategyEvaluation.bestStrategy.recommendationReason}
            </p>
          </div>
        </div>

        {/* 五套策略完整對比表格 */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-[#4E5968] dark:text-[#9BA4B0]">
            過去既有策略 vs. 全新同業相對估值策略 完整對比表：
          </div>

          <div className="grid grid-cols-1 gap-2">
            {strategyEvaluation.rankedStrategies.map((strat, rank) => {
              return (
                <div
                  key={strat.strategyId}
                  className={`p-3 rounded-xl border transition-all ${
                    strat.isBest
                      ? 'border-[#2563EB] bg-blue-50/30 dark:bg-blue-950/20'
                      : 'border-[#EAEDF2] dark:border-[#262C36] bg-[#F6F7F9] dark:bg-[#1F2631]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          rank === 0
                            ? 'bg-amber-400 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-[#4E5968] dark:text-[#9BA4B0]'
                        }`}
                      >
                        {rank + 1}
                      </span>
                      <span className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                        {strat.strategyName}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-[#161B22] text-[#8B95A1] border border-gray-200 dark:border-gray-800">
                        {strat.badge}
                      </span>
                      {strat.isBest && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#2563EB] text-white">
                          TOP 1
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs tabular-nums font-mono">
                      <div>
                        <span className="text-[#8B95A1] text-[10px]">適配分: </span>
                        <span className="font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          {strat.fitScore}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8B95A1] text-[10px]">預估勝率: </span>
                        <span className="font-bold text-emerald-600">
                          {strat.winRatePct}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8B95A1] text-[10px]">風報比: </span>
                        <span className="font-bold text-[#2563EB]">
                          {strat.riskRewardRatio}:1
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8B95A1] text-[10px]">夏普值: </span>
                        <span className="font-bold text-[#4E5968] dark:text-[#9BA4B0]">
                          {strat.sharpeRatio}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 優劣勢快速摘要 */}
                  <div className="mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-800/60 flex flex-wrap gap-1.5 text-[11px]">
                    {strat.pros.map((pro, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-medium"
                      >
                        ✓ {pro}
                      </span>
                    ))}
                    {strat.cons.map((con, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-medium"
                      >
                        ✕ {con}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. 我的動態交易計畫追蹤清單 (My Active Trade Plans) */}
      <section className="toss-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
              我的動態交易計畫庫 ({tradePlans.length})
            </h3>
          </div>
          <span className="text-[10px] text-[#8B95A1]">
            支援四階段動態止盈停損追蹤
          </span>
        </div>

        {tradePlans.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#8B95A1]">
            尚無儲存的交易計畫，點擊上方「💾 儲存為我的交易計畫」即可開始追蹤！
          </div>
        ) : (
          <div className="space-y-2">
            {tradePlans.map((plan) => {
              const currentStock = screenerStocks.find((s) => s.symbol === plan.symbol);
              const curPrice = currentStock ? currentStock.price : plan.entryPrice;
              const pnlPct = Number((((curPrice - plan.entryPrice) / plan.entryPrice) * 100).toFixed(1));

              return (
                <div
                  key={plan.id}
                  className="p-3.5 rounded-2xl bg-[#F6F7F9] dark:bg-[#1F2631] border border-[#EAEDF2] dark:border-[#262C36] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                        {plan.name} ({plan.symbol})
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          plan.stage === 'TP2_HIT_TRAILING'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : plan.stage === 'TP1_HIT_BREAKEVEN'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : plan.stage === 'CLOSED'
                            ? 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {plan.stage === 'INITIAL' && '📍 建倉監控中'}
                        {plan.stage === 'TP1_HIT_BREAKEVEN' && '🛡️ 已達 TP1 (保本減碼35%)'}
                        {plan.stage === 'TP2_HIT_TRAILING' && '🎯 已達 TP2 (移動停利30%)'}
                        {plan.stage === 'CLOSED' && '🏁 已結案'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold tabular-nums font-mono ${
                          pnlPct >= 0 ? 'text-[#F04452]' : 'text-[#10B981]'
                        }`}
                      >
                        {pnlPct >= 0 ? '+' : ''}
                        {pnlPct}%
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteTradePlan(plan.id)}
                        className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 價位階梯橫條 */}
                  <div className="grid grid-cols-4 gap-2 text-xs font-mono tabular-nums text-center p-2 rounded-xl bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36]">
                    <div>
                      <div className="text-[10px] text-rose-500 font-sans">停損 SL</div>
                      <div className="font-bold text-rose-600">${plan.slPrice}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#8B95A1] font-sans">成本 P₀</div>
                      <div className="font-bold">${plan.entryPrice}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#2563EB] font-sans">保本 TP1</div>
                      <div className="font-bold text-[#2563EB]">${plan.tp1Price}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-600 font-sans">同業 TP2</div>
                      <div className="font-bold text-emerald-600">${plan.tp2Price}</div>
                    </div>
                  </div>

                  {/* 階段切換按鈕 */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[#8B95A1] text-[11px]">手動切換紀律階段：</span>
                    <div className="flex items-center gap-1">
                      {(['INITIAL', 'TP1_HIT_BREAKEVEN', 'TP2_HIT_TRAILING', 'CLOSED'] as TradePlanStage[]).map(
                        (st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => updateTradePlanStage(plan.id, st)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                              plan.stage === st
                                ? 'bg-[#191F28] text-white dark:bg-white dark:text-[#191F28]'
                                : 'bg-gray-200 dark:bg-gray-800 text-[#4E5968] dark:text-[#9BA4B0]'
                            }`}
                          >
                            {st === 'INITIAL' && '建倉'}
                            {st === 'TP1_HIT_BREAKEVEN' && 'TP1保本'}
                            {st === 'TP2_HIT_TRAILING' && 'TP2停利'}
                            {st === 'CLOSED' && '結案'}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
