import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  Flame,
  Globe,
  Layers,
  Newspaper,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { ScreenerStockItem } from '../types';
import { fetchStockNews, StockNewsItem } from '../services/newsService';
import {
  AIStockAnalysisReport,
  generateAIStockReport,
  enrichReportWithGemini,
} from '../services/aiStockAnalysisEngine';
import { useVault } from '../context/VaultContext';

interface AIAnalysisReportViewProps {
  stock: ScreenerStockItem;
  allStocks?: ScreenerStockItem[];
}

export const AIAnalysisReportView: React.FC<AIAnalysisReportViewProps> = ({
  stock,
  allStocks = [],
}) => {
  const { settings } = useVault();
  const [report, setReport] = useState<AIStockAnalysisReport | null>(null);
  const [news, setNews] = useState<StockNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGeminiLoading, setIsGeminiLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const newsItems = await fetchStockNews(stock.name || stock.symbol, 6);
      setNews(newsItems);
      // 1. 先快速生成基礎量化報告 (0ms 立即可見)
      const baseGenerated = generateAIStockReport(stock, allStocks, newsItems);
      setReport(baseGenerated);
      setIsLoading(false);

      // 2. 非同步連動 Google Gemini 3.5 旗艦模型生成深度操盤手分析
      setIsGeminiLoading(true);
      const enriched = await enrichReportWithGemini(baseGenerated, settings.geminiApiKey);
      setReport(enriched);
    } catch {
      const baseGenerated = generateAIStockReport(stock, allStocks, []);
      setReport(baseGenerated);
    } finally {
      setIsLoading(false);
      setIsGeminiLoading(false);
    }
  };

  const copyGeminiText = () => {
    if (!report?.geminiInsight?.rawText) return;
    navigator.clipboard.writeText(report.geminiInsight.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    void runAnalysis();
  }, [stock.symbol]);

  if (isLoading || !report) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="space-y-1">
          <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
            AI 深度全方位分析中...
          </div>
          <div className="text-xs text-[#8B95A1]">
            正在多空均線診斷 · 同業估值中位數 · ATR 階梯價位 · 搜索最新即時新聞
          </div>
        </div>
      </div>
    );
  }

  const { trendBias, horizons, ladder, valuation, fundamental, peers } = report;

  return (
    <div className="space-y-4 text-xs select-none">
      {/* 1. 多空趨勢大卡片 (結論優先) */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          trendBias === 'STRONG_BULL'
            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
            : trendBias === 'MILD_BULL'
              ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
              : trendBias === 'STRONG_BEAR'
                ? 'bg-emerald-100/60 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-800'
                : trendBias === 'WEAK_BEAR' || trendBias === 'BEARISH'
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                  : 'bg-gray-50 dark:bg-[#1F2631] border-[#EAEDF2] dark:border-[#262C36]'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                  trendBias === 'STRONG_BULL'
                    ? 'bg-[#F04452] text-white'
                    : trendBias === 'MILD_BULL'
                      ? 'bg-[#2563EB] text-white'
                      : trendBias === 'STRONG_BEAR'
                        ? 'bg-[#047857] text-white shadow-sm'
                        : trendBias === 'WEAK_BEAR' || trendBias === 'BEARISH'
                          ? 'bg-[#059669] text-white'
                          : 'bg-gray-500 text-white'
                }`}
              >
                {report.trendLabel}
              </span>
              <span className="text-[11px] font-mono text-[#8B95A1]">
                多空力道指數 {report.trendScore} / 100
              </span>
            </div>
            <p className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8] mt-1.5">
              {report.trendSummary}
            </p>
            <p className="text-xs text-[#4E5968] dark:text-[#9BA4B0] mt-1.5 flex items-start gap-1">
              <span className="font-bold text-[#191F28] dark:text-[#F2F4F8] shrink-0">操作建議：</span>
              <span>{report.actionAdvice}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runAnalysis()}
            className="p-1.5 rounded-lg text-[#8B95A1] hover:text-[#2563EB]"
            title="重新執行分析"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 1.2 長·中·短 三期全方位評估 (Short, Medium, Long Horizons) */}
      {horizons && (
        <div className="p-4 rounded-2xl bg-[#F6F7F9] dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 font-bold text-sm text-[#191F28] dark:text-white">
              <Clock className="w-4 h-4 text-[#2563EB]" />
              <span>長 · 中 · 短 三期全方位評估</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#2563EB] text-white shadow-2xs">
              {horizons.alignmentLabel}
            </span>
          </div>

          <p className="text-[11px] text-[#4E5968] dark:text-[#9BA4B0] leading-relaxed">
            {horizons.summaryInsight}
          </p>

          {/* 三期卡片網格 (Mobile 1欄 / Desktop 3欄自適應) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* 1. 短期評估 (1~10日極短線) */}
            {(() => {
              const h = horizons.shortTerm;
              const isBull = h.bias === 'BULLISH';
              const isBear = h.bias === 'BEARISH';
              return (
                <div
                  className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                    isBull
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40'
                      : isBear
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                        : 'bg-white dark:bg-[#1F2631] border-[#EAEDF2] dark:border-[#262C36]'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-[#191F28] dark:text-white">
                        <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>短期評估</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isBull
                            ? 'bg-rose-100 text-[#F04452] dark:bg-rose-950/80'
                            : isBear
                              ? 'bg-emerald-100 text-[#059669] dark:bg-emerald-950/80'
                              : 'bg-gray-100 text-[#4E5968] dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {h.biasLabel} · {h.score}分
                      </span>
                    </div>

                    <div className="text-[10px] text-[#8B95A1] font-mono">
                      週期：{h.timeframe}
                    </div>

                    <div className="text-[11px] font-medium text-[#191F28] dark:text-white leading-snug">
                      {h.summary}
                    </div>

                    <div className="space-y-1 pt-1 border-t border-black/5 dark:border-white/5 text-[10px] text-[#4E5968] dark:text-[#9BA4B0]">
                      {h.keyFactors.map((f, i) => (
                        <div key={i} className="flex items-center gap-1 line-clamp-1">
                          <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1 text-[10px]">
                    <div className="text-[#8B95A1] font-mono">
                      關鍵點位：<span className="font-bold text-[#191F28] dark:text-white">{h.focusLevel}</span>
                    </div>
                    <div className="text-amber-800 dark:text-amber-300 font-medium">
                      🎯 指引：{h.strategyGuide}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2. 中期評估 (1~3個月波段) */}
            {(() => {
              const h = horizons.mediumTerm;
              const isBull = h.bias === 'BULLISH';
              const isBear = h.bias === 'BEARISH';
              return (
                <div
                  className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                    isBull
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40'
                      : isBear
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                        : 'bg-white dark:bg-[#1F2631] border-[#EAEDF2] dark:border-[#262C36]'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-[#191F28] dark:text-white">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>中期評估</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isBull
                            ? 'bg-rose-100 text-[#F04452] dark:bg-rose-950/80'
                            : isBear
                              ? 'bg-emerald-100 text-[#059669] dark:bg-emerald-950/80'
                              : 'bg-gray-100 text-[#4E5968] dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {h.biasLabel} · {h.score}分
                      </span>
                    </div>

                    <div className="text-[10px] text-[#8B95A1] font-mono">
                      週期：{h.timeframe}
                    </div>

                    <div className="text-[11px] font-medium text-[#191F28] dark:text-white leading-snug">
                      {h.summary}
                    </div>

                    <div className="space-y-1 pt-1 border-t border-black/5 dark:border-white/5 text-[10px] text-[#4E5968] dark:text-[#9BA4B0]">
                      {h.keyFactors.map((f, i) => (
                        <div key={i} className="flex items-center gap-1 line-clamp-1">
                          <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1 text-[10px]">
                    <div className="text-[#8B95A1] font-mono">
                      波段鎖定：<span className="font-bold text-[#191F28] dark:text-white">{h.focusLevel}</span>
                    </div>
                    <div className="text-blue-800 dark:text-blue-300 font-medium">
                      🎯 指引：{h.strategyGuide}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 3. 長期評估 (半年~1年價值成長) */}
            {(() => {
              const h = horizons.longTerm;
              const isBull = h.bias === 'BULLISH';
              const isBear = h.bias === 'BEARISH';
              return (
                <div
                  className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                    isBull
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40'
                      : isBear
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                        : 'bg-white dark:bg-[#1F2631] border-[#EAEDF2] dark:border-[#262C36]'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-[#191F28] dark:text-white">
                        <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>長期評估</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isBull
                            ? 'bg-rose-100 text-[#F04452] dark:bg-rose-950/80'
                            : isBear
                              ? 'bg-emerald-100 text-[#059669] dark:bg-emerald-950/80'
                              : 'bg-gray-100 text-[#4E5968] dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {h.biasLabel} · {h.score}分
                      </span>
                    </div>

                    <div className="text-[10px] text-[#8B95A1] font-mono">
                      週期：{h.timeframe}
                    </div>

                    <div className="text-[11px] font-medium text-[#191F28] dark:text-white leading-snug">
                      {h.summary}
                    </div>

                    <div className="space-y-1 pt-1 border-t border-black/5 dark:border-white/5 text-[10px] text-[#4E5968] dark:text-[#9BA4B0]">
                      {h.keyFactors.map((f, i) => (
                        <div key={i} className="flex items-center gap-1 line-clamp-1">
                          <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1 text-[10px]">
                    <div className="text-[#8B95A1] font-mono">
                      長期底氣：<span className="font-bold text-[#191F28] dark:text-white">{h.focusLevel}</span>
                    </div>
                    <div className="text-indigo-800 dark:text-indigo-300 font-medium">
                      🎯 指引：{h.strategyGuide}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 1.5 Google Gemini 3.5 旗艦大語言模型深度思考觀點 */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-purple-50/50 dark:from-[#171D28] dark:via-[#161D2B] dark:to-[#1C1A29] border border-indigo-200/80 dark:border-indigo-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm text-[#191F28] dark:text-[#F2F4F8]">
              Gemini 3.5 操盤手深度解析
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              gemini-3.5-flash-lite
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {report.geminiInsight?.rawText && (
              <button
                type="button"
                onClick={copyGeminiText}
                className="px-2 py-0.5 rounded text-[11px] font-medium text-[#4E5968] dark:text-[#9BA4B0] hover:text-[#2563EB] bg-white/70 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700"
              >
                {copied ? '已複製' : '複製觀點'}
              </button>
            )}
            <button
              type="button"
              disabled={isGeminiLoading}
              onClick={() => void runAnalysis()}
              className="p-1 rounded-md text-[#8B95A1] hover:text-[#2563EB] transition-colors"
              title="重新推演"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isGeminiLoading ? 'animate-spin text-[#2563EB]' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {isGeminiLoading && !report.geminiInsight ? (
          <div className="py-4 flex items-center justify-center gap-2 text-xs text-[#2563EB]">
            <div className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
            <span>Gemini 3.5 正在調閱籌碼、即時新聞與同業數據深度推演中...</span>
          </div>
        ) : report.geminiInsight?.rawText ? (
          <div className="text-xs leading-relaxed text-[#333D4B] dark:text-[#D1D6DB] space-y-2 whitespace-pre-wrap font-sans bg-white/70 dark:bg-[#12161F]/70 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-950/60 shadow-xs">
            {report.geminiInsight.rawText}
          </div>
        ) : (
          <div className="text-xs text-[#8B95A1] italic">
            以同業中位數與 ATR 風控量化數據為主，可點擊右上重新整理按鈕調用 Gemini 質化觀點。
          </div>
        )}
      </div>

      {/* 2. 關鍵點位梯形看板 (SL / 現價 / TP1 / TP2 / TP3) */}
      <div className="toss-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-sm text-[#191F28] dark:text-[#F2F4F8]">
            <Target className="w-4 h-4 text-[#2563EB]" />
            <span>關鍵交易點位與風控階梯 (ATR Channel)</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              ladder.isRiskRewardFavorable
                ? 'bg-blue-50 text-[#2563EB] dark:bg-blue-950/40'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40'
            }`}
          >
            盈虧比 {ladder.riskRewardRatio} : 1
          </span>
        </div>

        {/* 判斷多空架構呈現不同點位意義 */}
        {trendBias === 'STRONG_BEAR' || trendBias === 'WEAK_BEAR' ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 tabular-nums">
            {/* 上方反壓防線 */}
            <div className="p-3 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200/60 space-y-1">
              <div className="text-[10px] text-red-600 dark:text-red-400 font-bold flex items-center justify-between">
                <span>SL 反壓防線</span>
                <span>+1.5 ATR</span>
              </div>
              <div className="text-base font-black text-[#F04452]">NT$ {ladder.slPrice}</div>
              <div className="text-[10px] text-[#8B95A1]">+{ladder.slDownsidePct}% 反彈減碼點</div>
            </div>

            {/* 現價 */}
            <div className="p-3 rounded-xl bg-gray-100/80 dark:bg-[#1F2631] border border-gray-200 dark:border-gray-700 space-y-1">
              <div className="text-[10px] text-[#4E5968] dark:text-[#9BA4B0] font-bold">
                當前市價
              </div>
              <div className="text-base font-black text-[#191F28] dark:text-white">
                NT$ {ladder.currentPrice}
              </div>
              <div className="text-[10px] text-[#059669] font-medium">空方主導 · 做多不宜</div>
            </div>

            {/* TP1 下檔支撐測試點 */}
            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 space-y-1">
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-between">
                <span>TP1 支撐測試</span>
                <span>-1 ATR</span>
              </div>
              <div className="text-base font-black text-[#059669]">NT$ {ladder.tp1Price}</div>
              <div className="text-[10px] text-emerald-600 font-medium">
                {ladder.tp1UpsidePct}% 初步支撐
              </div>
            </div>

            {/* TP2 空方波段滿足點 */}
            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 space-y-1">
              <div className="text-[10px] text-[#2563EB] font-bold flex items-center justify-between">
                <span>TP2 下檔滿足</span>
                <span>-2.5 ATR</span>
              </div>
              <div className="text-base font-black text-[#2563EB]">NT$ {ladder.tp2Price}</div>
              <div className="text-[10px] text-[#2563EB] font-medium">
                {ladder.tp2UpsidePct}% 波段目標
              </div>
            </div>

            {/* TP3 極端破底目標 */}
            <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 space-y-1">
              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold flex items-center justify-between">
                <span>TP3 破底極值</span>
                <span>-4 ATR</span>
              </div>
              <div className="text-base font-black text-[#8B5CF6]">NT$ {ladder.tp3Price}</div>
              <div className="text-[10px] text-purple-600 font-medium">
                {ladder.tp3UpsidePct}% 極端停損位
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 tabular-nums">
            {/* SL */}
            <div className="p-3 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200/60 space-y-1">
              <div className="text-[10px] text-red-600 dark:text-red-400 font-bold flex items-center justify-between">
                <span>SL 停損點</span>
                <span>-2 ATR</span>
              </div>
              <div className="text-base font-black text-[#F04452]">NT$ {ladder.slPrice}</div>
              <div className="text-[10px] text-[#8B95A1]">{ladder.slDownsidePct}% 防守底線</div>
            </div>

            {/* 現價 */}
            <div className="p-3 rounded-xl bg-gray-100/80 dark:bg-[#1F2631] border border-gray-200 dark:border-gray-700 space-y-1">
              <div className="text-[10px] text-[#4E5968] dark:text-[#9BA4B0] font-bold">
                進場參考現價
              </div>
              <div className="text-base font-black text-[#191F28] dark:text-white">
                NT$ {ladder.currentPrice}
              </div>
              <div className="text-[10px] text-[#8B95A1]">1R 風險 = {ladder.atr14 * 2} 元</div>
            </div>

            {/* TP1 */}
            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 space-y-1">
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-between">
                <span>TP1 保本止盈</span>
                <span>折價收斂50%</span>
              </div>
              <div className="text-base font-black text-[#059669]">NT$ {ladder.tp1Price}</div>
              <div className="text-[10px] text-emerald-600 font-medium">
                +{ladder.tp1UpsidePct}% (減碼35%)
              </div>
            </div>

            {/* TP2 */}
            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 space-y-1">
              <div className="text-[10px] text-[#2563EB] font-bold flex items-center justify-between">
                <span>TP2 同業合理價</span>
                <span>核心目標</span>
              </div>
              <div className="text-base font-black text-[#2563EB]">NT$ {ladder.tp2Price}</div>
              <div className="text-[10px] text-[#2563EB] font-medium">
                +{ladder.tp2UpsidePct}% 潛在空間
              </div>
            </div>

            {/* TP3 */}
            <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 space-y-1">
              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold flex items-center justify-between">
                <span>TP3 龍頭極值</span>
                <span>移動停利</span>
              </div>
              <div className="text-base font-black text-[#8B5CF6]">NT$ {ladder.tp3Price}</div>
              <div className="text-[10px] text-purple-600 font-medium">
                +{ladder.tp3UpsidePct}% 破月線清倉
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. 價格合理性與同業估值 (Valuation Verdict) */}
      <div className="toss-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-sm text-[#191F28] dark:text-[#F2F4F8]">
            <Scale className="w-4 h-4 text-[#2563EB]" />
            <span>價格合理性與估值位階</span>
          </div>
          <span className="text-xs font-bold text-[#2563EB]">
            {valuation.statusLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 tabular-nums">
          <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
            <div className="text-[10px] text-[#8B95A1] mb-0.5">目前本益比 P/E</div>
            <div className="text-sm font-bold text-[#191F28] dark:text-white">
              {valuation.currentPe} 倍
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
            <div className="text-[10px] text-[#8B95A1] mb-0.5">同業中位數 P/E</div>
            <div className="text-sm font-bold text-[#191F28] dark:text-white">
              {valuation.peerMedianPe} 倍
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
            <div className="text-[10px] text-[#8B95A1] mb-0.5">同業折溢價幅度</div>
            <div
              className={`text-sm font-bold ${
                valuation.discountPremiumPct <= 0 ? 'text-[#059669]' : 'text-[#F04452]'
              }`}
            >
              {valuation.discountPremiumPct <= 0 ? '折價 ' : '溢價 '}
              {Math.abs(valuation.discountPremiumPct)}%
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
            <div className="text-[10px] text-[#8B95A1] mb-0.5">基本面公允目標</div>
            <div className="text-sm font-bold text-[#2563EB]">
              NT$ {valuation.fairValueEstimate}
            </div>
          </div>
        </div>

        <p className="text-xs text-[#4E5968] dark:text-[#9BA4B0] bg-blue-50/40 dark:bg-blue-950/20 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
          {valuation.summary}
        </p>
      </div>

      {/* 4. 基本面體質診斷 (五力健檢) */}
      <div className="toss-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-sm text-[#191F28] dark:text-[#F2F4F8]">
            <Shield className="w-4 h-4 text-[#2563EB]" />
            <span>基本面體質評估</span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-[#059669] font-bold text-xs">
            體質評等 {fundamental.rating} ({fundamental.healthScore} 分)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] tabular-nums">
          <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
            <div className="text-[#8B95A1]">ROE 股東權益報酬率</div>
            <div className="text-xs font-bold text-[#191F28] dark:text-white mt-0.5">
              {stock.roePct}% ({fundamental.roeRating})
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
            <div className="text-[#8B95A1]">毛利率護城河</div>
            <div className="text-xs font-bold text-[#191F28] dark:text-white mt-0.5">
              {stock.grossMarginPct}% ({fundamental.marginMoat})
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
            <div className="text-[#8B95A1]">月營收年增率 YoY</div>
            <div
              className={`text-xs font-bold mt-0.5 ${
                stock.revenueYoYPct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
              }`}
            >
              {stock.revenueYoYPct >= 0 ? '+' : ''}
              {stock.revenueYoYPct}% ({fundamental.revenueGrowth})
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
            <div className="text-[#8B95A1]">自由現金流</div>
            <div className="text-xs font-bold text-[#191F28] dark:text-white mt-0.5">
              {fundamental.cashflowHealth}
            </div>
          </div>
        </div>

        {/* 優勢與隱憂 */}
        <div className="space-y-1.5 pt-1">
          {fundamental.pros.map((pro, idx) => (
            <div key={idx} className="flex items-start gap-1.5 text-[11px] text-[#4E5968] dark:text-[#9BA4B0]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
              <span>{pro}</span>
            </div>
          ))}
          {fundamental.risks.map((risk, idx) => (
            <div key={idx} className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>{risk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. 智慧同業比較競品矩陣 */}
      <div className="toss-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-sm text-[#191F28] dark:text-[#F2F4F8]">
            <Layers className="w-4 h-4 text-[#2563EB]" />
            <span>同產業競品橫向對比</span>
          </div>
          <span className="text-[11px] text-[#8B95A1]">{stock.sectorName}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr className="border-b border-[#EAEDF2] dark:border-[#262C36] text-[#8B95A1]">
                <th className="pb-2 font-medium">標的</th>
                <th className="pb-2 font-medium">市價</th>
                <th className="pb-2 font-medium">P/E</th>
                <th className="pb-2 font-medium">ROE</th>
                <th className="pb-2 font-medium">營收 YoY</th>
                <th className="pb-2 font-medium">評價定位</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEDF2] dark:divide-[#262C36]">
              {peers.map((p) => (
                <tr
                  key={p.symbol}
                  className={p.isTarget ? 'bg-blue-50/40 dark:bg-blue-950/20 font-bold' : ''}
                >
                  <td className="py-2 flex items-center gap-1">
                    <span>{p.name}</span>
                    <span className="text-[10px] text-[#8B95A1] font-mono">
                      ({p.symbol.replace(/\.(TW|TWO)$/i, '')})
                    </span>
                    {p.isTarget && (
                      <span className="px-1 rounded bg-[#2563EB] text-white text-[9px]">
                        目標
                      </span>
                    )}
                  </td>
                  <td className="py-2">NT$ {p.price}</td>
                  <td className="py-2">{p.peRatio}x</td>
                  <td className="py-2">{p.roePct}%</td>
                  <td
                    className={`py-2 ${
                      p.revenueYoYPct >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                    }`}
                  >
                    {p.revenueYoYPct >= 0 ? '+' : ''}
                    {p.revenueYoYPct}%
                  </td>
                  <td className="py-2 text-[11px] text-[#2563EB]">{p.relativeRank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[#8B95A1] pt-1">{report.peerSummary}</p>
      </div>

      {/* 6. 即時重大新聞與催化劑解讀 */}
      <div className="toss-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-sm text-[#191F28] dark:text-[#F2F4F8]">
            <Newspaper className="w-4 h-4 text-[#2563EB]" />
            <span>即時新聞與催化劑情報</span>
          </div>
          <span className="text-[11px] text-[#8B95A1]">Yahoo 奇摩即時連動</span>
        </div>

        <p className="text-xs text-[#4E5968] dark:text-[#9BA4B0] bg-[#F6F7F9] dark:bg-[#1F2631] p-2.5 rounded-xl">
          {report.catalystSummary}
        </p>

        <div className="divide-y divide-[#EAEDF2] dark:divide-[#262C36]">
          {news.map((item) => (
            <div key={item.id} className="py-2.5 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-xs text-[#191F28] dark:text-[#F2F4F8] hover:text-[#2563EB] line-clamp-1 flex items-center gap-1"
                >
                  <span>{item.title}</span>
                  <ExternalLink className="w-3 h-3 text-[#8B95A1] shrink-0" />
                </a>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-semibold shrink-0 ${
                    item.sentiment === 'positive'
                      ? 'bg-rose-50 text-[#F04452] dark:bg-rose-950/40'
                      : item.sentiment === 'cautious'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40'
                        : 'bg-gray-100 text-[#4E5968] dark:bg-gray-800 dark:text-[#9BA4B0]'
                  }`}
                >
                  {item.sentiment === 'positive'
                    ? '利多'
                    : item.sentiment === 'cautious'
                      ? '留意'
                      : '中立'}
                </span>
              </div>
              <p className="text-[11px] text-[#8B95A1] line-clamp-2">{item.description}</p>
              <div className="text-[10px] text-[#8B95A1] flex items-center gap-2">
                <span>{item.source}</span>
                <span>·</span>
                <span>{item.pubDate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
