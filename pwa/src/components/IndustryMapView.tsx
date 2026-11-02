import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Cpu,
  ExternalLink,
  Flame,
  Layers,
  Network,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Workflow,
  Zap,
} from 'lucide-react';
import { ScreenerStockItem } from '../types';
import { useVault } from '../context/VaultContext';
import {
  getIndustryMapProfile,
  IndustryMapProfile,
  SupplyChainNode,
} from '../services/industryMapService';
import {
  enrichChainNode,
  EnrichedChainNode,
  calculateSupplyChainResonance,
  simulateSupplyChainShock,
  ShockScenarioType,
} from '../services/supplyChainPropagationEngine';

interface IndustryMapViewProps {
  stock: ScreenerStockItem;
  onSelectStock?: (symbol: string) => void;
}

type IndustryViewSubTab = 'topology' | 'role_valuation';

export const IndustryMapView: React.FC<IndustryMapViewProps> = ({ stock, onSelectStock }) => {
  const { screenerStocks } = useVault();
  const profile: IndustryMapProfile = useMemo(() => {
    return getIndustryMapProfile(stock.symbol, stock);
  }, [stock.symbol, stock]);

  // 子頁籤：拓撲流向畫布 (含衝擊模擬) vs 產業鏈角色與估值
  const [activeSubTab, setActiveSubTab] = useState<IndustryViewSubTab>('topology');

  // 豐富化後的上下游節點
  const enrichedUpstream = useMemo(() => {
    return profile.supplyChain.upstream.map((n) => enrichChainNode(n, screenerStocks));
  }, [profile.supplyChain.upstream, screenerStocks]);

  const enrichedDownstream = useMemo(() => {
    return profile.supplyChain.downstream.map((n) => enrichChainNode(n, screenerStocks));
  }, [profile.supplyChain.downstream, screenerStocks]);

  const enrichedMidstream = useMemo(() => {
    return profile.supplyChain.midstreamPeers.map((n) => enrichChainNode(n, screenerStocks));
  }, [profile.supplyChain.midstreamPeers, screenerStocks]);

  // 供應鏈順風共振分數
  const resonanceSummary = useMemo(() => {
    return calculateSupplyChainResonance(stock, enrichedUpstream, enrichedDownstream, screenerStocks);
  }, [stock, enrichedUpstream, enrichedDownstream, screenerStocks]);

  // 【What-If 衝擊模擬器狀態】
  // 預設選取第一個有代碼的下游客戶（如 Apple / NVIDIA / CSP），若無則選上游
  const defaultSimNode = useMemo(() => {
    return (
      enrichedDownstream.find((n) => n.symbol) ||
      enrichedUpstream.find((n) => n.symbol) ||
      enrichedDownstream[0] ||
      enrichedUpstream[0] ||
      null
    );
  }, [enrichedDownstream, enrichedUpstream]);

  const [selectedSimNode, setSelectedSimNode] = useState<EnrichedChainNode | null>(defaultSimNode);
  const [shockPct, setShockPct] = useState<number>(5.0);
  const [shockScenario, setShockScenario] = useState<ShockScenarioType>('surge_5pct');

  // 確保在切換股票時，若選取節點失效則重設為預設
  const activeSimNode = selectedSimNode || defaultSimNode;

  // 計算模擬結果
  const simulationResult = useMemo(() => {
    if (!activeSimNode) return null;
    return simulateSupplyChainShock(stock, activeSimNode, shockPct, shockScenario);
  }, [stock, activeSimNode, shockPct, shockScenario]);

  // 快捷情境切換
  const handleSelectScenario = (scen: ShockScenarioType, pct: number) => {
    setShockScenario(scen);
    setShockPct(pct);
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'upstream':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'midstream':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'downstream':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200';
    }
  };

  const getPricingPowerBadge = (power: 'high' | 'medium' | 'low') => {
    switch (power) {
      case 'high':
        return {
          label: '強議價能力 (高定價權)',
          color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200',
        };
      case 'medium':
        return {
          label: '中等議價 (成本轉嫁)',
          color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200',
        };
      case 'low':
        return {
          label: '一般議價 (毛利受限)',
          color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200',
        };
    }
  };

  const pricingBadge = getPricingPowerBadge(profile.valuationAnalysis.pricingPower);

  return (
    <div className="space-y-3.5 text-xs text-[#191F28] dark:text-[#F2F4F8]">
      {/* 頂部加法雙分頁切換器 */}
      <div className="grid grid-cols-2 p-1 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631] text-xs font-bold gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('topology')}
          className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'topology'
              ? 'bg-white dark:bg-[#161B22] text-[#2563EB] dark:text-blue-400 shadow-xs font-bold'
              : 'text-[#6B7684] dark:text-[#8B949E] hover:text-[#191F28] dark:hover:text-white'
          }`}
        >
          <Workflow className="w-3.5 h-3.5" />
          <span>拓撲流向與衝擊模擬</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('role_valuation')}
          className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'role_valuation'
              ? 'bg-white dark:bg-[#161B22] text-[#2563EB] dark:text-blue-400 shadow-xs font-bold'
              : 'text-[#6B7684] dark:text-[#8B949E] hover:text-[#191F28] dark:hover:text-white'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>產業鏈分工與估值</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 視圖 A: 拓撲流向畫布 + What-If 衝擊模擬器 (互動式節點流動圖譜) */}
      {/* ========================================================================= */}
      {activeSubTab === 'topology' && (
        <div className="space-y-3.5">
          {/* 1. 供應鏈順風共振儀表卡 */}
          <section className="p-3.5 rounded-2xl bg-gradient-to-br from-[#F6F7F9] to-blue-50/40 dark:from-[#161B22] dark:to-blue-950/20 border border-[#EAEDF2] dark:border-[#262C36] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-sm text-[#191F28] dark:text-white">
                <Flame className="w-4 h-4 text-orange-500" />
                <span>供應鏈順風共振度</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2563EB] text-white">
                {resonanceSummary.resonanceLabel}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center tabular-nums">
              <div className="p-2 rounded-xl bg-white/90 dark:bg-[#0E1116] border border-black/5 dark:border-white/5">
                <div className="text-[10px] text-[#8B95A1]">共振評分</div>
                <div className="text-lg font-black text-[#2563EB] dark:text-blue-400 mt-0.5">
                  {resonanceSummary.resonanceScore}
                  <span className="text-[10px] font-normal text-[#8B95A1] ml-0.5">/ 100</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/90 dark:bg-[#0E1116] border border-black/5 dark:border-white/5">
                <div className="text-[10px] text-[#8B95A1]">下游客戶動能</div>
                <div
                  className={`text-lg font-black mt-0.5 ${
                    resonanceSummary.downstreamAvgChangePct >= 0
                      ? 'text-[#F04452]'
                      : 'text-[#059669]'
                  }`}
                >
                  {resonanceSummary.downstreamAvgChangePct >= 0 ? '+' : ''}
                  {resonanceSummary.downstreamAvgChangePct}%
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/90 dark:bg-[#0E1116] border border-black/5 dark:border-white/5">
                <div className="text-[10px] text-[#8B95A1]">全鏈法人共識</div>
                <div className="text-lg font-black text-[#191F28] dark:text-white mt-0.5">
                  {resonanceSummary.chainInstitutionalConsensusPct}%
                </div>
              </div>
            </div>

            {resonanceSummary.highlightAlert && (
              <div className="p-2 rounded-xl bg-blue-100/60 dark:bg-blue-950/40 text-[11px] text-[#2563EB] dark:text-blue-300 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{resonanceSummary.highlightAlert}</span>
              </div>
            )}
          </section>

          {/* 2. 互動式三欄泳道畫布 (上游 ➔ 目標公司呼吸燈 ➔ 下游) */}
          <section className="p-3.5 rounded-2xl bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-sm text-[#191F28] dark:text-white">
                <Network className="w-4 h-4 text-[#2563EB]" />
                <span>一階上下游流向拓撲 (1-Hop Topology)</span>
              </div>
              <span className="text-[10px] text-[#8B95A1]">點擊節點開啟衝擊模擬</span>
            </div>

            {/* 三欄泳道卡片流 (Mobile 上下流 / Desktop 橫向流) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
              {/* 泳道 1: 上游原料 / 設備 / IP */}
              <div className="p-2.5 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/30 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>上游端 (原料 / 設備 / IP)</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#8B95A1]">
                    {enrichedUpstream.length} 家
                  </span>
                </div>

                <div className="space-y-1.5">
                  {enrichedUpstream.map((node) => {
                    const isSelected = activeSimNode?.name === node.name;
                    const isGain = (node.dailyChangePct ?? 0) >= 0;

                    return (
                      <div
                        key={node.name}
                        onClick={() => setSelectedSimNode(node)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-purple-100 dark:bg-purple-900/50 border-purple-600 dark:border-purple-400 ring-2 ring-purple-500/30 shadow-xs'
                            : 'bg-white dark:bg-[#1F2631] border-[#EAEDF2] dark:border-[#262C36] hover:border-purple-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-xs text-[#191F28] dark:text-white">
                              {node.name}
                            </span>
                            {node.symbol && (
                              <span className="text-[10px] font-mono text-[#8B95A1]">
                                {node.symbol}
                              </span>
                            )}
                          </div>
                          {node.dailyChangePct !== undefined && node.dailyChangePct !== 0 && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded tabular-nums ${
                                isGain
                                  ? 'bg-rose-50 text-[#F04452] dark:bg-rose-950/60'
                                  : 'bg-emerald-50 text-[#059669] dark:bg-emerald-950/60'
                              }`}
                            >
                              {isGain ? '+' : ''}
                              {node.dailyChangePct}%
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-1 text-[10px] text-[#8B95A1]">
                          <span className="line-clamp-1">{node.category}</span>
                          <span className="font-mono text-purple-600 dark:text-purple-400">
                            彈性 {node.leadLagBeta}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 泳道 2: 中游核心【目標公司】(呼吸燈高亮) */}
              <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border-2 border-[#2563EB] shadow-md space-y-2 relative">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-[#2563EB] dark:text-blue-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-ping" />
                    <span>目標核心樞紐 (Center)</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-[#2563EB] text-white text-[9px] font-bold">
                    當前標的
                  </span>
                </div>

                {/* 目標公司大卡片 */}
                <div className="p-3 rounded-xl bg-white dark:bg-[#0E1116] border border-blue-200 dark:border-blue-900 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-black text-sm text-[#191F28] dark:text-white flex items-center gap-1">
                        <span>{stock.name}</span>
                        <span className="text-xs font-mono font-medium text-[#8B95A1]">
                          {stock.symbol.replace(/\.(TW|TWO)$/i, '')}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#8B95A1] mt-0.5">
                        {stock.sectorName} · {profile.industryRing.tierLabel}
                      </div>
                    </div>

                    <div className="text-right tabular-nums">
                      <div className="text-sm font-bold text-[#191F28] dark:text-white">
                        NT$ {stock.price.toLocaleString()}
                      </div>
                      <div
                        className={`text-[10px] font-bold ${
                          stock.dailyChangePct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                        }`}
                      >
                        {stock.dailyChangePct >= 0 ? '+' : ''}
                        {stock.dailyChangePct}%
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#4E5968] dark:text-[#9BA4B0] leading-snug pt-1 border-t border-black/5 dark:border-white/5">
                    {profile.industryRing.roleDescription}
                  </p>
                </div>

                {/* 同業競合微型磚 */}
                <div className="pt-1">
                  <div className="text-[10px] font-bold text-[#8B95A1] mb-1">同業競合指標：</div>
                  <div className="grid grid-cols-2 gap-1">
                    {enrichedMidstream
                      .filter((n) => !n.isTarget)
                      .slice(0, 4)
                      .map((node) => (
                        <div
                          key={node.name}
                          onClick={() => node.symbol && onSelectStock?.(node.symbol)}
                          className="p-1.5 rounded-lg bg-white/80 dark:bg-[#1F2631] border border-black/5 dark:border-white/5 text-[10px] hover:border-[#2563EB] cursor-pointer"
                        >
                          <div className="font-bold text-[#191F28] dark:text-white line-clamp-1">
                            {node.name}
                          </div>
                          <div className="text-[#8B95A1] font-mono">{node.symbol}</div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* 泳道 3: 下游終端 / 客戶 / CSP */}
              <div className="p-2.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>下游端 (客戶 / CSP / 品牌)</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#8B95A1]">
                    {enrichedDownstream.length} 家
                  </span>
                </div>

                <div className="space-y-1.5">
                  {enrichedDownstream.map((node) => {
                    const isSelected = activeSimNode?.name === node.name;
                    const isGain = (node.dailyChangePct ?? 0) >= 0;

                    return (
                      <div
                        key={node.name}
                        onClick={() => setSelectedSimNode(node)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-600 dark:border-emerald-400 ring-2 ring-emerald-500/30 shadow-xs'
                            : 'bg-white dark:bg-[#1F2631] border-[#EAEDF2] dark:border-[#262C36] hover:border-emerald-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-xs text-[#191F28] dark:text-white">
                              {node.name}
                            </span>
                            {node.symbol && (
                              <span className="text-[10px] font-mono text-[#8B95A1]">
                                {node.symbol}
                              </span>
                            )}
                          </div>
                          {node.dailyChangePct !== undefined && node.dailyChangePct !== 0 && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded tabular-nums ${
                                isGain
                                  ? 'bg-rose-50 text-[#F04452] dark:bg-rose-950/60'
                                  : 'bg-emerald-50 text-[#059669] dark:bg-emerald-950/60'
                              }`}
                            >
                              {isGain ? '+' : ''}
                              {node.dailyChangePct}%
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-1 text-[10px] text-[#8B95A1]">
                          <span className="line-clamp-1">{node.category}</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">
                            彈性 {node.leadLagBeta}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* 3. 【殺手級 UX: What-If 供應鏈衝擊模擬器 (Shock Simulator)】 */}
          {activeSimNode && simulationResult && (
            <section className="p-4 rounded-2xl bg-[#F6F7F9] dark:bg-[#161B22] border-2 border-[#2563EB]/40 space-y-3 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center gap-1.5 font-bold text-sm text-[#191F28] dark:text-white">
                  <Sliders className="w-4 h-4 text-[#2563EB]" />
                  <span>What-If 衝擊模擬器</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-[#2563EB] dark:bg-blue-950/80 dark:text-blue-300 text-[10px] font-bold">
                    模擬節點：{activeSimNode.name}
                  </span>
                </div>

                {activeSimNode.symbol && (
                  <button
                    type="button"
                    onClick={() => onSelectStock?.(activeSimNode.symbol!)}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-[#1F2631] border border-[#EAEDF2] dark:border-[#262C36] hover:border-[#2563EB] text-[10px] font-bold text-[#2563EB] flex items-center gap-1 transition-colors"
                  >
                    <span>穿透切換此個股</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* 快捷模擬情境按鈕列 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectScenario('surge_5pct', 5.0)}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    shockScenario === 'surge_5pct'
                      ? 'bg-rose-50 text-[#F04452] border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 font-bold'
                      : 'bg-white dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0] border-[#EAEDF2] dark:border-[#262C36]'
                  }`}
                >
                  <div className="text-[11px] font-bold">🔥 節點暴漲 +5%</div>
                  <div className="text-[9px] opacity-75">急單催化劑激勵</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectScenario('drop_5pct', -5.0)}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    shockScenario === 'drop_5pct'
                      ? 'bg-emerald-50 text-[#059669] border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 font-bold'
                      : 'bg-white dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0] border-[#EAEDF2] dark:border-[#262C36]'
                  }`}
                >
                  <div className="text-[11px] font-bold">📉 節點修正 -5%</div>
                  <div className="text-[9px] opacity-75">短期利空回檔</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectScenario('revenue_surge_25pct', 8.0)}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    shockScenario === 'revenue_surge_25pct'
                      ? 'bg-blue-50 text-[#2563EB] border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 font-bold'
                      : 'bg-white dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0] border-[#EAEDF2] dark:border-[#262C36]'
                  }`}
                >
                  <div className="text-[11px] font-bold">🚀 營收大增 +25%</div>
                  <div className="text-[9px] opacity-75">基本面景氣大好</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectScenario('order_cut_15pct', -8.0)}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    shockScenario === 'order_cut_15pct'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 font-bold'
                      : 'bg-white dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0] border-[#EAEDF2] dark:border-[#262C36]'
                  }`}
                >
                  <div className="text-[11px] font-bold">⚠️ 客戶砍單下修</div>
                  <div className="text-[9px] opacity-75">訂單遞延與去庫存</div>
                </button>
              </div>

              {/* 互動滑桿 */}
              <div className="p-3 rounded-xl bg-white dark:bg-[#0E1116] border border-[#EAEDF2] dark:border-[#262C36] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8B95A1]">自由滑動衝擊幅度：</span>
                  <span
                    className={`font-mono font-bold text-sm tabular-nums ${
                      shockPct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                    }`}
                  >
                    {shockPct >= 0 ? '+' : ''}
                    {shockPct.toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="0.5"
                  value={shockPct}
                  onChange={(e) => {
                    setShockPct(parseFloat(e.target.value));
                    setShockScenario('custom');
                  }}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                />
                <div className="flex justify-between text-[10px] text-[#8B95A1] font-mono">
                  <span>-15% 崩跌</span>
                  <span>0% 平盤</span>
                  <span>+15% 暴漲</span>
                </div>
              </div>

              {/* 即時預算傳導衝擊看板 (The Shock Prediction Results) */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#0E1116] border border-blue-200 dark:border-blue-900/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#191F28] dark:text-white">
                    對本公司【{stock.name}】預估傳導影響
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#2563EB] dark:bg-blue-950 dark:text-blue-300">
                    {simulationResult.impactBadge}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center tabular-nums">
                  <div className="p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1F2631]">
                    <div className="text-[10px] text-[#8B95A1]">預估衝擊區間</div>
                    <div
                      className={`text-base font-black mt-0.5 ${
                        simulationResult.predictedChangeMinPct >= 0
                          ? 'text-[#F04452]'
                          : 'text-[#059669]'
                      }`}
                    >
                      {simulationResult.predictedChangeMinPct >= 0 ? '+' : ''}
                      {simulationResult.predictedChangeMinPct}% ~{' '}
                      {simulationResult.predictedChangeMaxPct >= 0 ? '+' : ''}
                      {simulationResult.predictedChangeMaxPct}%
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1F2631]">
                    <div className="text-[10px] text-[#8B95A1]">反映滯後天數</div>
                    <div className="text-base font-bold text-[#191F28] dark:text-white mt-0.5">
                      {simulationResult.expectedLagDays} 日內
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1F2631]">
                    <div className="text-[10px] text-[#8B95A1]">歷史同向勝率</div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {simulationResult.historicalWinRatePct}%
                    </div>
                  </div>
                </div>

                {/* 傳導原理解析與操盤指引 */}
                <div className="space-y-1 pt-1 text-[11px] text-[#4E5968] dark:text-[#9BA4B0] leading-relaxed">
                  <p>{simulationResult.rationale}</p>
                  <p className="font-bold text-[#191F28] dark:text-white pt-1">
                    🎯 操作指引：{simulationResult.actionGuidance}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 視圖 B: 產業鏈分工與估值 (既有完整產品線營收比重、定價權與估值評價模型) */}
      {/* ========================================================================= */}
      {activeSubTab === 'role_valuation' && (
        <div className="space-y-3.5">
          {/* 1. 企業產業定位頂部總覽卡 */}
          <section className="p-3.5 rounded-2xl bg-[#F6F7F9] dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <Network className="w-4 h-4 text-[#2563EB]" />
                <span>產業分工與生態定位</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${getStageColor(
                  profile.industryRing.stage
                )}`}
              >
                {profile.industryRing.stageName}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-[#0E1116] border border-[#EAEDF2] dark:border-[#262C36] space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-[#2563EB] dark:bg-blue-950/70 dark:text-blue-300 text-[10px] font-bold">
                  {profile.industryRing.tierLabel}
                </span>
                <span className="text-[11px] text-[#4E5968] dark:text-[#9BA4B0]">
                  {profile.industryRing.marketShareNote}
                </span>
              </div>
              <p className="text-xs text-[#191F28] dark:text-white leading-relaxed font-medium">
                {profile.industryRing.roleDescription}
              </p>
            </div>
          </section>

          {/* 2. 公司核心主力產品線與營收分佈 (Product Breakdown) */}
          <section className="toss-card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <Boxes className="w-4 h-4 text-[#2563EB]" />
                <span>主力產品組合與技術優勢</span>
              </div>
              <span className="text-[10px] text-[#8B95A1]">營收佔比與關鍵技術</span>
            </div>

            <div className="space-y-2">
              {profile.mainProducts.map((prod) => (
                <div
                  key={prod.name}
                  className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] border border-[#EAEDF2] dark:border-[#262C36] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#191F28] dark:text-white">
                      {prod.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#2563EB] dark:text-blue-400">
                      {prod.revenueSharePct}%
                    </span>
                  </div>

                  {/* 營收佔比進度條 */}
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                      style={{ width: `${prod.revenueSharePct}%` }}
                    />
                  </div>

                  <div className="text-[11px] text-[#4E5968] dark:text-[#9BA4B0] leading-relaxed">
                    {prod.description}
                  </div>

                  <div className="flex items-start gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>技術壁壘：{prod.techAdvantage}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. 產業鏈角色對市場估值定價之深度剖析 */}
          <section className="toss-card p-3.5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                <span>市場估值定價剖析 (依產業鏈地位)</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${pricingBadge.color}`}
              >
                {pricingBadge.label}
              </span>
            </div>

            {/* 議價權與毛利護城河 */}
            <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] space-y-1 text-[11px]">
              <div className="font-bold text-[#191F28] dark:text-white">議價權與毛利來源：</div>
              <p className="text-[#4E5968] dark:text-[#9BA4B0] leading-relaxed">
                {profile.valuationAnalysis.pricingPowerReason}
              </p>
              <p className="text-emerald-700 dark:text-emerald-400 font-medium pt-0.5">
                {profile.valuationAnalysis.grossMarginMoat}
              </p>
            </div>

            {/* 估值評價模型與 P/E 區間量尺 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#191F28] dark:text-white">
                  {profile.valuationAnalysis.frameworkLabel}
                </span>
                <span className="text-[#8B95A1] font-mono">
                  產業中位數 {profile.valuationAnalysis.typicalPeRange.industryMedian}x
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center tabular-nums">
                <div className="p-2 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] border border-[#EAEDF2] dark:border-[#262C36]">
                  <div className="text-[10px] text-[#8B95A1]">保守低估區</div>
                  <div className="text-sm font-bold text-[#4E5968] dark:text-[#9BA4B0] mt-0.5">
                    {profile.valuationAnalysis.typicalPeRange.low}x
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                  <div className="text-[10px] text-[#2563EB] font-bold">市場公允中軸</div>
                  <div className="text-sm font-extrabold text-[#2563EB] mt-0.5">
                    {profile.valuationAnalysis.typicalPeRange.fair}x
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] border border-[#EAEDF2] dark:border-[#262C36]">
                  <div className="text-[10px] text-[#8B95A1]">樂觀景氣頂峰</div>
                  <div className="text-sm font-bold text-[#F04452] mt-0.5">
                    {profile.valuationAnalysis.typicalPeRange.high}x
                  </div>
                </div>
              </div>
            </div>

            {/* 市場核心定價邏輯 */}
            <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 space-y-1">
              <div className="font-bold text-xs text-indigo-900 dark:text-indigo-200">
                市場給予定價之核心邏輯：
              </div>
              <p className="text-[11px] text-[#4E5968] dark:text-[#9BA4B0] leading-relaxed">
                {profile.valuationAnalysis.marketValuationRationale}
              </p>
            </div>

            {/* 估值重估催化劑與潛在風險 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 space-y-1">
                <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>向上重估催化劑 (Re-rating)</span>
                </div>
                <ul className="space-y-1 text-[#4E5968] dark:text-[#9BA4B0] list-disc list-inside">
                  {profile.valuationAnalysis.reratingCatalysts.map((cat, i) => (
                    <li key={i} className="leading-snug">
                      {cat}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/50 space-y-1">
                <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>估值下修風險 (De-rating)</span>
                </div>
                <ul className="space-y-1 text-[#4E5968] dark:text-[#9BA4B0] list-disc list-inside">
                  {profile.valuationAnalysis.downsideRisks.map((risk, i) => (
                    <li key={i} className="leading-snug">
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
