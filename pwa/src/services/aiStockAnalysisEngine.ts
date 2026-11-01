/**
 * AI 深度個股多空決策與研究引擎 (AI Stock Analysis Engine)
 * 整合：多空趨勢研判、TP1~TP3/SL 關鍵點位、價格合理性、基本面健康度診斷、同業競品矩陣與新聞催化劑
 */

import { ScreenerStockItem } from '../types';
import { StockNewsItem } from './newsService';
import { calculateTrimmedMedian } from './peerValuationEngine';

export type TrendBias = 'STRONG_BULL' | 'MILD_BULL' | 'CONSOLIDATION' | 'BEARISH';
export type ValuationStatus = 'DEEP_DISCOUNT' | 'UNDERVALUED' | 'FAIR' | 'OVERVALUED';

export interface PriceLadder {
  currentPrice: number;
  slPrice: number;
  slDownsidePct: number;
  tp1Price: number;
  tp1UpsidePct: number;
  tp2Price: number;
  tp2UpsidePct: number;
  tp3Price: number;
  tp3UpsidePct: number;
  riskRewardRatio: number;
  isRiskRewardFavorable: boolean;
  atr14: number;
}

export interface ValuationAssessment {
  status: ValuationStatus;
  statusLabel: string;
  discountPremiumPct: number; // 負值為折價，正值為溢價
  currentPe: number;
  peerMedianPe: number;
  currentPb: number;
  peerMedianPb: number;
  fairValueEstimate: number;
  summary: string;
}

export interface FundamentalDiagnosis {
  rating: 'A+' | 'A' | 'B' | 'C';
  healthScore: number; // 0 ~ 100
  roeRating: string;
  marginMoat: string;
  revenueGrowth: string;
  cashflowHealth: string;
  pros: string[];
  risks: string[];
}

export interface PeerComparisonRow {
  symbol: string;
  name: string;
  price: number;
  peRatio: number;
  roePct: number;
  revenueYoYPct: number;
  isTarget: boolean;
  relativeRank: string;
}

export interface GeminiInsight {
  isGeneratedByGemini: boolean;
  modelName: string;
  rawText: string;
  generatedAt: string;
}

export interface AIStockAnalysisReport {
  symbol: string;
  name: string;
  sectorName: string;
  generatedAt: string;
  // 1. 多空趨勢研判
  trendBias: TrendBias;
  trendLabel: string;
  trendScore: number; // 0 ~ 100
  trendSummary: string;
  actionAdvice: string;
  // 2. 關鍵點位階梯
  ladder: PriceLadder;
  // 3. 價格合理性
  valuation: ValuationAssessment;
  // 4. 基本面體質診斷
  fundamental: FundamentalDiagnosis;
  // 5. 同業比較矩陣
  peers: PeerComparisonRow[];
  peerSummary: string;
  // 6. 即時新聞與催化劑
  news: StockNewsItem[];
  catalystSummary: string;
  // 7. Google Gemini 3.5 旗艦大語言模型深度思考觀點
  geminiInsight?: GeminiInsight;
}

/**
 * 核心分析方法：生成全方位 AI 股票深度決策報告
 */
export function generateAIStockReport(
  target: ScreenerStockItem,
  allStocks: ScreenerStockItem[] = [],
  newsItems: StockNewsItem[] = []
): AIStockAnalysisReport {
  const p0 = target.price;
  const atr = target.atr14 || Math.max(0.8, Math.round(p0 * 0.03 * 10) / 10);

  // 1. 多空趨勢研判 (結合均線多空、法人買賣超、動能與 ATR)
  let trendScore = 50;
  if (target.aboveMa60) trendScore += 18;
  if (target.aboveMa240) trendScore += 12;
  if (target.instNetBuy5dLots > 0) trendScore += 15;
  if (target.trustNetBuy5dLots > 0) trendScore += 15;
  if (target.momentum60dPct > 8) trendScore += 10;
  else if (target.momentum60dPct < -5) trendScore -= 15;
  if (target.dailyChangePct > 0) trendScore += 5;
  trendScore = Math.max(10, Math.min(98, trendScore));

  let trendBias: TrendBias = 'CONSOLIDATION';
  let trendLabel = '區間震盪整理';
  let trendSummary = '目前股價於季線附近震盪壓縮，均線糾結，等待量能表態。';
  let actionAdvice = '建議暫先觀望或採逢低區間操作，突破壓力線再行順勢加碼。';

  if (trendScore >= 78) {
    trendBias = 'STRONG_BULL';
    trendLabel = '強大多頭格局';
    trendSummary = `站穩 60MA 季線且均線呈多頭排列，三大法人近 5 日買超 ${target.instNetBuy5dLots > 0 ? '+' : ''}${target.instNetBuy5dLots} 張，多方籌碼強勢鎖碼。`;
    actionAdvice = '趨勢偏多明確，回測支撐有守可積極分批布局，嚴守 2 ATR 防守點。';
  } else if (trendScore >= 62) {
    trendBias = 'MILD_BULL';
    trendLabel = '溫和偏多反彈';
    trendSummary = '股價維持於中期均線上方，動能溫和回溫，具備持續墊高潛力。';
    actionAdvice = '可採取逢拉回佈局策略，不宜過度追高，分批建立基本持倉。';
  } else if (trendScore <= 38) {
    trendBias = 'BEARISH';
    trendLabel = '空方修正整理';
    trendSummary = '跌破關鍵均線支撐，法人買盤退場或呈現調節，短線承壓。';
    actionAdvice = '空方力道主導，切勿貿然搶反彈，靜待止跌落底與籌碼沉澱訊號。';
  }

  // 2. 關鍵點位精算 (SL, TP1, TP2, TP3)
  const slPrice = Math.max(0.5, Math.round((p0 - 2 * atr) * 10) / 10);
  const slDownsidePct = Math.round(((slPrice - p0) / p0) * 1000) / 10;

  // 尋找同業中位數以定錨 TP2
  const industryPeers = allStocks.filter(
    (s) => s.sectorId === target.sectorId && s.symbol !== target.symbol
  );
  const peerPes = industryPeers.map((p) => p.peRatio).filter((v) => v > 0);
  const peerMedianPe = peerPes.length >= 3 ? calculateTrimmedMedian(peerPes) : 18.5;

  const qualityAlpha = (target.opmPct || 10) > 15 ? 1.08 : 1.0; // 品質溢價
  const eps = target.estimatedEps || Math.max(1, Math.round((p0 / (target.peRatio || 16)) * 10) / 10);
  const fairValueEstimate = Math.round(eps * peerMedianPe * qualityAlpha * 10) / 10;

  const tp2Price = Math.max(Math.round(p0 * 1.08 * 10) / 10, fairValueEstimate);
  const tp2UpsidePct = Math.round(((tp2Price - p0) / p0) * 1000) / 10;

  const tp1Price = Math.round((p0 + 0.5 * (tp2Price - p0)) * 10) / 10;
  const tp1UpsidePct = Math.round(((tp1Price - p0) / p0) * 1000) / 10;

  const tp3Price = Math.round(tp2Price * 1.15 * 10) / 10;
  const tp3UpsidePct = Math.round(((tp3Price - p0) / p0) * 1000) / 10;

  const risk1R = p0 - slPrice;
  const reward2R = tp2Price - p0;
  const riskRewardRatio = risk1R > 0 ? Math.round((reward2R / risk1R) * 100) / 100 : 2.5;

  const ladder: PriceLadder = {
    currentPrice: p0,
    slPrice,
    slDownsidePct,
    tp1Price,
    tp1UpsidePct,
    tp2Price,
    tp2UpsidePct,
    tp3Price,
    tp3UpsidePct,
    riskRewardRatio,
    isRiskRewardFavorable: riskRewardRatio >= 1.5,
    atr14: atr,
  };

  // 3. 價格合理性評估
  const discountPremiumPct = Math.round(((target.peRatio - peerMedianPe) / peerMedianPe) * 1000) / 10;
  let valStatus: ValuationStatus = 'FAIR';
  let valLabel = '價格落在合理估值區間';
  let valSummary = `目前本益比 ${target.peRatio} 倍，與同業中位數 ${peerMedianPe} 倍相近，估值已合理反映基本面。`;

  if (discountPremiumPct <= -15) {
    valStatus = 'DEEP_DISCOUNT';
    valLabel = '深度折價 · 估值極具吸引力';
    valSummary = `相較同業中位數折價達 ${Math.abs(discountPremiumPct)}%，具備強大的估值修復與安全邊際（Margin of Safety）。`;
  } else if (discountPremiumPct < -4) {
    valStatus = 'UNDERVALUED';
    valLabel = '相對同業折價 · 具性價比';
    valSummary = `相較同業中位數折價約 ${Math.abs(discountPremiumPct)}%，在同業競爭中處於低估優勢。`;
  } else if (discountPremiumPct > 20) {
    valStatus = 'OVERVALUED';
    valLabel = '高估值溢價 · 留意獲利了結';
    valSummary = `本益比已大幅高於同業中位數 ${discountPremiumPct}%，需觀察未來營收動能是否足以支撐高倍數。`;
  }

  const valuation: ValuationAssessment = {
    status: valStatus,
    statusLabel: valLabel,
    discountPremiumPct,
    currentPe: target.peRatio,
    peerMedianPe,
    currentPb: target.pbRatio,
    peerMedianPb: 1.8,
    fairValueEstimate,
    summary: valSummary,
  };

  // 4. 基本面體質診斷
  let healthScore = 60;
  const pros: string[] = [];
  const risks: string[] = [];

  if (target.roePct >= 18) {
    healthScore += 15;
    pros.push(`股東權益報酬率高達 ${target.roePct}%，資本運用與獲利效率位列前段班`);
  } else if (target.roePct >= 12) {
    healthScore += 8;
    pros.push(`ROE 達 ${target.roePct}%，獲利體質穩定維持於健康水位`);
  } else {
    risks.push(`ROE 僅 ${target.roePct}%，資本報酬率偏低需關注獲利改善能力`);
  }

  if (target.revenueYoYPct >= 15) {
    healthScore += 15;
    pros.push(`月營收年增達 +${target.revenueYoYPct}%，終端拉貨動能強勁`);
  } else if (target.revenueYoYPct >= 5) {
    healthScore += 8;
    pros.push(`營收維持正向增長 (+${target.revenueYoYPct}%)，營運處於上升軌道`);
  } else if (target.revenueYoYPct < 0) {
    healthScore -= 10;
    risks.push(`月營收呈現衰退 (${target.revenueYoYPct}%)，短線面臨景氣逆風或基期壓力`);
  }

  if (target.freeCashFlowPositive) {
    healthScore += 10;
    pros.push('自由現金流呈現健康正向流入，具備抵禦外部景氣循環與配息底蘊');
  } else {
    healthScore -= 10;
    risks.push('自由現金流未轉正，需關注資本支出回收進度與週轉壓力');
  }

  if (target.grossMarginPct >= 30) {
    pros.push(`高毛利率 ${target.grossMarginPct}%，擁有強大的技術專利或供應鏈定價權護城河`);
  }

  healthScore = Math.max(30, Math.min(98, healthScore));

  let rating: 'A+' | 'A' | 'B' | 'C' = 'B';
  if (healthScore >= 88) rating = 'A+';
  else if (healthScore >= 75) rating = 'A';
  else if (healthScore < 55) rating = 'C';

  const fundamental: FundamentalDiagnosis = {
    rating,
    healthScore,
    roeRating: target.roePct >= 15 ? '極佳' : target.roePct >= 10 ? '穩健' : '偏弱',
    marginMoat: target.grossMarginPct >= 28 ? '高護城河' : '平均水準',
    revenueGrowth: target.revenueYoYPct >= 10 ? '高速成長' : target.revenueYoYPct >= 0 ? '穩定' : '衰退中',
    cashflowHealth: target.freeCashFlowPositive ? '充沛安全' : '需留意',
    pros,
    risks: risks.length > 0 ? risks : ['短線需注意大盤系統性波動風險'],
  };

  // 5. 同業比較矩陣 (取出最相關之同業對比)
  const peerList = industryPeers.slice(0, 4);
  const rows: PeerComparisonRow[] = [
    {
      symbol: target.symbol,
      name: target.name,
      price: target.price,
      peRatio: target.peRatio,
      roePct: target.roePct,
      revenueYoYPct: target.revenueYoYPct,
      isTarget: true,
      relativeRank: discountPremiumPct < 0 ? '估值折價優勢' : '龍頭溢價位階',
    },
    ...peerList.map((p, idx) => ({
      symbol: p.symbol,
      name: p.name,
      price: p.price,
      peRatio: p.peRatio,
      roePct: p.roePct,
      revenueYoYPct: p.revenueYoYPct,
      isTarget: false,
      relativeRank: `同業對標 #${idx + 1}`,
    })),
  ];

  // 6. 新聞與重大消息催化劑解讀
  const catalystSummary = newsItems.length > 0
    ? `彙整近期 ${newsItems.length} 則市場情報：正面消息聚焦於營運訂單展望與法人佈局；需留意外圍市場匯率及同業供需變數。`
    : `近期無負面預警消息，市場聚焦於次月營收公布與下一季法說會指引。`;

  return {
    symbol: target.symbol,
    name: target.name,
    sectorName: target.sectorName,
    generatedAt: new Date().toISOString(),
    trendBias,
    trendLabel,
    trendScore,
    trendSummary,
    actionAdvice,
    ladder,
    valuation,
    fundamental,
    peers: rows,
    peerSummary: `同業族群平均本益比約 ${peerMedianPe} 倍，${target.name} 本益比為 ${target.peRatio} 倍，位處${discountPremiumPct < 0 ? '相對平價' : '強勢領先'}梯隊。`,
    news: newsItems,
    catalystSummary,
  };
}

/**
 * 透過 Google Gemini 3.5 旗艦模型對量化報告進行質化深度賦能
 */
export async function enrichReportWithGemini(
  baseReport: AIStockAnalysisReport,
  userApiKey?: string
): Promise<AIStockAnalysisReport> {
  try {
    const res = await fetch('/api/ai-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stockId: baseReport.symbol,
        stockName: baseReport.name,
        price: baseReport.ladder.currentPrice,
        changePct: 0,
        ladder: baseReport.ladder,
        valuation: baseReport.valuation,
        fundamental: baseReport.fundamental,
        peers: baseReport.peers.filter((p) => !p.isTarget),
        news: baseReport.news,
        userApiKey,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.rawText) {
        return {
          ...baseReport,
          geminiInsight: {
            isGeneratedByGemini: true,
            modelName: data.model || 'gemini-3.5-flash-lite',
            rawText: data.rawText,
            generatedAt: data.generatedAt || new Date().toISOString(),
          },
        };
      }
    }
  } catch (err) {
    console.warn('[Gemini AI Enrich Warning]', err);
  }
  return baseReport;
}

/**
 * 完整非同步生成方法（結合量化計算與 Gemini 3.5 LLM 深度觀點）
 */
export async function generateAIStockReportAsync(
  target: ScreenerStockItem,
  allStocks: ScreenerStockItem[] = [],
  newsItems: StockNewsItem[] = [],
  userApiKey?: string
): Promise<AIStockAnalysisReport> {
  const base = generateAIStockReport(target, allStocks, newsItems);
  return await enrichReportWithGemini(base, userApiKey);
}
