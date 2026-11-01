import React from 'react';
import {
  ArrowDown,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Cpu,
  ExternalLink,
  Layers,
  Network,
  ShieldCheck,
  TrendingUp,
  Workflow,
  Zap,
} from 'lucide-react';
import { ScreenerStockItem } from '../types';
import {
  getIndustryMapProfile,
  IndustryMapProfile,
  SupplyChainNode,
} from '../services/industryMapService';

interface IndustryMapViewProps {
  stock: ScreenerStockItem;
  onSelectStock?: (symbol: string) => void;
}

export const IndustryMapView: React.FC<IndustryMapViewProps> = ({ stock, onSelectStock }) => {
  const profile: IndustryMapProfile = getIndustryMapProfile(stock.symbol, stock);

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
          {profile.mainProducts.map((prod, idx) => (
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

      {/* 3. 完整上下游產業鏈圖譜 (Upstream -> Midstream -> Downstream) */}
      <section className="toss-card p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-sm">
            <Workflow className="w-4 h-4 text-[#2563EB]" />
            <span>產業鏈生態系 (供應鏈關係圖)</span>
          </div>
          <span className="text-[10px] text-[#8B95A1]">點擊標的切換查看</span>
        </div>

        {/* 3.1 上游供應端 (Upstream) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span>上游供應端 (原料、設備、關鍵零組件與IP)</span>
            </span>
            <span className="text-[10px] text-[#8B95A1] font-mono">
              {profile.supplyChain.upstream.length} 家核心節點
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {profile.supplyChain.upstream.map((node) => (
              <div
                key={node.name}
                onClick={() => node.symbol && onSelectStock?.(node.symbol)}
                className={`p-2 rounded-xl border text-left transition-all ${
                  node.symbol
                    ? 'bg-white dark:bg-[#161B22] border-[#EAEDF2] dark:border-[#262C36] hover:border-[#2563EB] cursor-pointer group'
                    : 'bg-[#F6F7F9] dark:bg-[#1F2631] border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#191F28] dark:text-[#F2F4F8] group-hover:text-[#2563EB]">
                    {node.name}
                  </span>
                  {node.symbol && (
                    <span className="text-[10px] font-mono text-[#8B95A1] flex items-center gap-0.5">
                      <span>{node.symbol}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#8B95A1] mt-0.5 line-clamp-1">
                  {node.category} {node.notes ? `· ${node.notes}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 流向指示箭頭 */}
        <div className="flex items-center justify-center text-[#8B95A1] py-0.5">
          <ArrowDown className="w-4 h-4 animate-bounce" />
        </div>

        {/* 3.2 中游製造與本公司地位 (Midstream) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>中游製造 (本企業定位與同業競合格局)</span>
            </span>
            <span className="text-[10px] text-[#8B95A1] font-mono">
              {profile.supplyChain.midstreamPeers.length} 家指標
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {profile.supplyChain.midstreamPeers.map((node) => {
              const isTarget = node.isTarget;
              return (
                <div
                  key={node.name}
                  onClick={() => !isTarget && node.symbol && onSelectStock?.(node.symbol)}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    isTarget
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-[#2563EB] shadow-xs'
                      : node.symbol
                        ? 'bg-white dark:bg-[#161B22] border-[#EAEDF2] dark:border-[#262C36] hover:border-[#2563EB] cursor-pointer group'
                        : 'bg-[#F6F7F9] dark:bg-[#1F2631] border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs text-[#191F28] dark:text-[#F2F4F8] group-hover:text-[#2563EB]">
                        {node.name}
                      </span>
                      {isTarget && (
                        <span className="px-1 py-0.2 rounded bg-[#2563EB] text-white text-[9px] font-bold">
                          本公司
                        </span>
                      )}
                    </div>
                    {node.symbol && (
                      <span className="text-[10px] font-mono text-[#8B95A1]">{node.symbol}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#8B95A1] mt-0.5 line-clamp-1">
                    {node.category} {node.notes ? `· ${node.notes}` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 流向指示箭頭 */}
        <div className="flex items-center justify-center text-[#8B95A1] py-0.5">
          <ArrowDown className="w-4 h-4 animate-bounce" />
        </div>

        {/* 3.3 下游應用端 (Downstream) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>下游應用端 (終端客戶、CSP 雲端巨頭與品牌廠)</span>
            </span>
            <span className="text-[10px] text-[#8B95A1] font-mono">
              {profile.supplyChain.downstream.length} 家應用端
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {profile.supplyChain.downstream.map((node) => (
              <div
                key={node.name}
                onClick={() => node.symbol && onSelectStock?.(node.symbol)}
                className={`p-2 rounded-xl border text-left transition-all ${
                  node.symbol
                    ? 'bg-white dark:bg-[#161B22] border-[#EAEDF2] dark:border-[#262C36] hover:border-[#2563EB] cursor-pointer group'
                    : 'bg-[#F6F7F9] dark:bg-[#1F2631] border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#191F28] dark:text-[#F2F4F8] group-hover:text-[#2563EB]">
                    {node.name}
                  </span>
                  {node.symbol && (
                    <span className="text-[10px] font-mono text-[#8B95A1] flex items-center gap-0.5">
                      <span>{node.symbol}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#8B95A1] mt-0.5 line-clamp-1">
                  {node.category} {node.notes ? `· ${node.notes}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. 產業鏈角色對市場估值定價之深度剖析 (Valuation Analysis by Supply Chain Role) */}
      <section className="toss-card p-3.5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-1.5 font-bold text-sm">
            <TrendingUp className="w-4 h-4 text-[#2563EB]" />
            <span>市場估值定價剖析 (依產業鏈地位)</span>
          </div>
          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${pricingBadge.color}`}>
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
                <li key={i} className="leading-snug">{cat}</li>
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
                <li key={i} className="leading-snug">{risk}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
