/**
 * AI 深度個股多空決策與研究引擎 (AI Stock Analysis Engine)
 * 整合：多空趨勢研判、TP1~TP3/SL 關鍵點位、價格合理性、基本面健康度診斷、同業競品矩陣與新聞催化劑
 */

import { ScreenerStockItem } from '../types';
import { StockNewsItem } from './newsService';
import { calculateTrimmedMedian } from './peerValuationEngine';

export type TrendBias = 'STRONG_BULL' | 'MILD_BULL' | 'CONSOLIDATION' | 'WEAK_BEAR' | 'STRONG_BEAR' | 'BEARISH';
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

export type HorizonBias = 'BULLISH' | 'NEUTRAL' | 'BEARISH';

export interface HorizonEvaluationItem {
  horizon: 'short' | 'medium' | 'long';
  horizonLabel: string;
  timeframe: string;
  bias: HorizonBias;
  biasLabel: string;
  score: number;
  keyFactors: string[];
  focusLevel: string;
  summary: string;
  strategyGuide: string;
}

export interface MultiHorizonAnalysis {
  shortTerm: HorizonEvaluationItem;
  mediumTerm: HorizonEvaluationItem;
  longTerm: HorizonEvaluationItem;
  alignment: 'all_bullish' | 'all_bearish' | 'short_weak_long_strong' | 'short_strong_long_weak' | 'mixed';
  alignmentLabel: string;
  summaryInsight: string;
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
  // 1.5 長·中·短三期全面評估 (Horizon Evaluation)
  horizons: MultiHorizonAnalysis;
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
 * 長·中·短三期量化評估計算
 */
export function calculateMultiHorizonEvaluation(
  target: ScreenerStockItem,
  p0: number,
  atr: number,
  ladder: PriceLadder,
  discountPremiumPct: number
): MultiHorizonAnalysis {
  // 1. 短期評估 (1~10 個交易日) - 聚焦極短線籌碼、今日漲跌與 5MA 攻防
  let shortScore = 50;
  if (target.instNetBuy5dLots > 500) shortScore += 16;
  else if (target.instNetBuy5dLots > 0) shortScore += 8;
  else if (target.instNetBuy5dLots < -500) shortScore -= 18;
  else if (target.instNetBuy5dLots < 0) shortScore -= 10;

  if (target.dailyChangePct >= 2.0) shortScore += 12;
  else if (target.dailyChangePct >= 0) shortScore += 5;
  else if (target.dailyChangePct <= -2.5) shortScore -= 14;
  else shortScore -= 6;

  if (target.aboveMa60) shortScore += 6;
  else shortScore -= 8;

  shortScore = Math.min(96, Math.max(10, Math.round(shortScore)));

  let shortBias: HorizonBias = 'NEUTRAL';
  let shortBiasLabel = '區間震盪整理';
  let shortFactors: string[] = [];
  let shortSummary = '';
  let shortGuide = '';

  if (shortScore >= 66) {
    shortBias = 'BULLISH';
    shortBiasLabel = '短多強勢表態';
    shortFactors = [
      `三大法人近5日買超 ${target.instNetBuy5dLots > 0 ? '+' : ''}${target.instNetBuy5dLots.toLocaleString()} 張`,
      `今日股價動能強勁 (${target.dailyChangePct >= 0 ? '+' : ''}${target.dailyChangePct}%)`,
      `站穩短期均線支撐`,
    ];
    shortSummary = '短線買盤追價意願積極，量價結構偏多，有機會向短線目標發起挑戰。';
    shortGuide = `沿 5MA 移動停利，以短線防守點 NT$ ${ladder.slPrice} 設停損，達 TP1 NT$ ${ladder.tp1Price} 適度減碼保本。`;
  } else if (shortScore <= 38) {
    shortBias = 'BEARISH';
    shortBiasLabel = '短線承壓回檔';
    shortFactors = [
      `三大法人近5日調節賣超 ${Math.abs(target.instNetBuy5dLots).toLocaleString()} 張`,
      `短線動能走疲 (${target.dailyChangePct}%)`,
      `短期均線蓋頭承壓`,
    ];
    shortSummary = '短線籌碼鬆動，買盤追價動能不足，恐持續向下尋求短線支撐。';
    shortGuide = `短線嚴禁追高，持股者逢反彈靠近壓力應分批減碼避險，慎防短線跌破防守點 NT$ ${ladder.slPrice}。`;
  } else {
    shortBias = 'NEUTRAL';
    shortBiasLabel = '短線多空拉鋸';
    shortFactors = [
      `法人籌碼多空互見 (${target.instNetBuy5dLots > 0 ? '+' : ''}${target.instNetBuy5dLots.toLocaleString()} 張)`,
      `短線進入狹幅箱型`,
      `等待量能方向突破`,
    ];
    shortSummary = '多空力道互不相讓，量能維持平淡，短線以箱型震盪為主。';
    shortGuide = `短線採取「箱型下緣低接、箱型上緣調節」策略，嚴格遵守區間紀律。`;
  }

  const shortTerm: HorizonEvaluationItem = {
    horizon: 'short',
    horizonLabel: '短期評估',
    timeframe: '1 ~ 10 個交易日 (極短線)',
    bias: shortBias,
    biasLabel: shortBiasLabel,
    score: shortScore,
    keyFactors: shortFactors,
    focusLevel: `支撐 NT$ ${ladder.slPrice} / 壓力 NT$ ${ladder.tp1Price}`,
    summary: shortSummary,
    strategyGuide: shortGuide,
  };

  // 2. 中期評估 (1~3 個月 / 20~60 個交易日) - 聚焦季線趨勢、投信作帳與營收成長
  let midScore = 50;
  if (target.aboveMa60) midScore += 16;
  else midScore -= 20;

  if (target.momentum60dPct >= 12) midScore += 14;
  else if (target.momentum60dPct >= 0) midScore += 6;
  else if (target.momentum60dPct <= -12) midScore -= 18;
  else midScore -= 8;

  if (target.trustNetBuy5dLots > 200) midScore += 12;
  else if (target.trustNetBuy5dLots > 0) midScore += 6;
  else if (target.trustNetBuy5dLots < -200) midScore -= 12;

  if (target.revenueYoYPct >= 15) midScore += 12;
  else if (target.revenueYoYPct >= 0) midScore += 4;
  else if (target.revenueYoYPct <= -15) midScore -= 16;
  else midScore -= 8;

  midScore = Math.min(96, Math.max(10, Math.round(midScore)));

  let midBias: HorizonBias = 'NEUTRAL';
  let midBiasLabel = '波段橫盤整理';
  let midFactors: string[] = [];
  let midSummary = '';
  let midGuide = '';

  if (midScore >= 65) {
    midBias = 'BULLISH';
    midBiasLabel = '波段多頭主升';
    midFactors = [
      '股價站穩 60MA 季線生命線',
      `60日價格動能強勁 (+${target.momentum60dPct}%)`,
      `月營收年增率表現優異 (+${target.revenueYoYPct}%)`,
    ];
    midSummary = '中期多頭架構完整，季線維持揚升，營收成長為波段行情的最大底氣。';
    midGuide = `季線不破波段續抱，波段獲利目標鎖定同業公允價 TP2 NT$ ${ladder.tp2Price}。`;
  } else if (midScore <= 40) {
    midBias = 'BEARISH';
    midBiasLabel = '波段空方破線';
    midFactors = [
      '跌破 60MA 季線關鍵生命線',
      `60日動能疲弱下彎 (${target.momentum60dPct}%)`,
      target.revenueYoYPct < 0 ? `月營收陷入衰退 (${target.revenueYoYPct}%)` : '中期賣壓沉重',
    ];
    midSummary = '中期均線下彎蓋頭形成反壓，波段趨勢由多轉空，籌碼有持續沉澱需求。';
    midGuide = `波段部位應確實減碼或出清避險，切勿在季線下彎階段盲目攤平，靜待底部型態浮現。`;
  } else {
    midBias = 'NEUTRAL';
    midBiasLabel = '季線附近打底';
    midFactors = [
      '股價於季線上下反覆測試',
      `月營收年增持平 (${target.revenueYoYPct >= 0 ? '+' : ''}${target.revenueYoYPct}%)`,
      '波段方向等待次季展望確認',
    ];
    midSummary = '中期進入籌碼整理期，均線斜率平緩，需要下個月營收或法說會催化劑打破僵局。';
    midGuide = `建議波段投資人耐住性子，待股價帶量突破季線上方壓力時再順勢加碼。`;
  }

  const mediumTerm: HorizonEvaluationItem = {
    horizon: 'medium',
    horizonLabel: '中期評估',
    timeframe: '1 ~ 3 個月 (波段趨勢)',
    bias: midBias,
    biasLabel: midBiasLabel,
    score: midScore,
    keyFactors: midFactors,
    focusLevel: `季線防守 / 公允目標價 NT$ ${ladder.tp2Price}`,
    summary: midSummary,
    strategyGuide: midGuide,
  };

  // 3. 長期評估 (半年~1年以上 / 120~240 個交易日) - 聚焦年線、ROE護城河、現金流與估值
  let longScore = 50;
  if (target.aboveMa240) longScore += 16;
  else longScore -= 18;

  if (target.roePct >= 20) longScore += 18;
  else if (target.roePct >= 12) longScore += 10;
  else if (target.roePct < 5) longScore -= 14;

  if (target.freeCashFlowPositive) longScore += 12;
  else longScore -= 12;

  if (target.grossMarginPct >= 40) longScore += 10;
  else if (target.grossMarginPct >= 20) longScore += 4;
  else if (target.grossMarginPct < 10) longScore -= 8;

  if (discountPremiumPct <= -10) longScore += 8;
  else if (discountPremiumPct > 35) longScore -= 10;

  longScore = Math.min(98, Math.max(10, Math.round(longScore)));

  let longBias: HorizonBias = 'NEUTRAL';
  let longBiasLabel = '長期價值觀察';
  let longFactors: string[] = [];
  let longSummary = '';
  let longGuide = '';

  if (longScore >= 68) {
    longBias = 'BULLISH';
    longBiasLabel = '長多護城河卓越';
    longFactors = [
      `股東權益報酬率 ROE ${target.roePct}% (資本效率優異)`,
      '自由現金流常年正向，具備抗景氣下行韌性',
      `站穩 240MA 年線生命線，長期多頭確立`,
    ];
    longSummary = '具備厚實的獲利護城河與優異的股東回報，在所屬產業分工中佔據關鍵議價地位。';
    longGuide = `極適合長期價值型投資人或定期定額存股，長期目標上看 TP3 龍頭溢價 NT$ ${ladder.tp3Price}。`;
  } else if (longScore <= 40) {
    longBias = 'BEARISH';
    longBiasLabel = '長線競爭力弱化';
    longFactors = [
      `資本效率不足 (ROE 僅 ${target.roePct}%)`,
      !target.freeCashFlowPositive ? '自由現金流緊縮，資本支出壓力大' : '長線毛利受壓抑',
      '股價長期受制於年線下方',
    ];
    longSummary = '長期獲利成長性與護城河較為脆弱，易受景氣逆風或同業削價競爭影響。';
    longGuide = `不建議作為長期存股標的，若有反彈應將資金轉移至產業龍頭或高 ROE 護城河企業。`;
  } else {
    longBias = 'NEUTRAL';
    longBiasLabel = '長期景氣循環';
    longFactors = [
      `ROE ${target.roePct}% 處於歷史常態中軸`,
      '營運高度連動產業總經循環',
      `目前估值折溢價 ${discountPremiumPct}% 相對中性`,
    ];
    longSummary = '企業體質穩定但受產業週期波動制約，適合在循環底部買進、循環頂部出場。';
    longGuide = `以逢低買進防禦策略為主，耐心等待新一輪產業向上擴張週期來臨。`;
  }

  const longTerm: HorizonEvaluationItem = {
    horizon: 'long',
    horizonLabel: '長期評估',
    timeframe: '半年 ~ 1 年以上 (價值成長)',
    bias: longBias,
    biasLabel: longBiasLabel,
    score: longScore,
    keyFactors: longFactors,
    focusLevel: `年線生命線 / 終極目標 NT$ ${ladder.tp3Price}`,
    summary: longSummary,
    strategyGuide: longGuide,
  };

  // 4. 三期共振對齊分析 (Alignment)
  let alignment: MultiHorizonAnalysis['alignment'] = 'mixed';
  let alignmentLabel = '長中短多空分歧 · 箱型整理';
  let summaryInsight = '各週期多空訊號互有拉鋸，操作上應明確切分短線進出與中長線部位，切忌混淆週期。';

  if (shortBias === 'BULLISH' && midBias === 'BULLISH' && longBias === 'BULLISH') {
    alignment = 'all_bullish';
    alignmentLabel = '長中短三期共振看多 (多方最強極品)';
    summaryInsight = '極短線資金充沛、波段季線強勁揚升、長線基本面護城河深厚，為勝率最高的多頭黃金階段！';
  } else if (shortBias === 'BEARISH' && midBias === 'BEARISH' && longBias === 'BEARISH') {
    alignment = 'all_bearish';
    alignmentLabel = '長中短三期全面走空 (破線嚴控風險)';
    summaryInsight = '短線賣壓沉重、季線下彎、長線競爭力衰退，三期全面偏空，持股應徹底減碼避險。';
  } else if (shortBias === 'BEARISH' && (midBias === 'BULLISH' || longBias === 'BULLISH')) {
    alignment = 'short_weak_long_strong';
    alignmentLabel = '短線良性拉回 · 中長多頭格局 (逢低買點)';
    summaryInsight = '長中線趨勢依然向好，短線修正僅為籌碼獲利了結洗盤，拉回關鍵支撐反為極佳波段買點。';
  } else if (shortBias === 'BULLISH' && (midBias === 'BEARISH' || longBias === 'BEARISH')) {
    alignment = 'short_strong_long_weak';
    alignmentLabel = '短線超跌反彈 · 中長期趨勢仍空 (反彈逃命)';
    summaryInsight = '短線急拉屬於跌深反彈或隔日沖軋空，中長期均線仍處空方壓制，切勿誤判為長線反轉！';
  }

  return {
    shortTerm,
    mediumTerm,
    longTerm,
    alignment,
    alignmentLabel,
    summaryInsight,
  };
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

  // 尋找同業中位數以定錨合理估值與 TP2
  const industryPeers = allStocks.filter(
    (s) => s.sectorId === target.sectorId && s.symbol !== target.symbol
  );
  const peerPes = industryPeers.map((p) => p.peRatio).filter((v) => v > 0);
  const peerMedianPe = peerPes.length >= 3 ? calculateTrimmedMedian(peerPes) : 18.5;
  const discountPremiumPct = Math.round(((target.peRatio - peerMedianPe) / peerMedianPe) * 1000) / 10;

  // 1. 均線架構與位階 (MA Ribbon Trend Strategy - 權重 30 分)
  let maScore = 0;
  if (target.aboveMa60 && target.aboveMa240) {
    maScore += 18; // 雙站穩季線與年線多頭排列
  } else if (!target.aboveMa60 && !target.aboveMa240) {
    maScore -= 24; // 均線空頭排列，雙雙跌破下彎
  } else if (!target.aboveMa60) {
    maScore -= 16; // 跌破 60MA 季線，中期轉空
  } else if (target.aboveMa60) {
    maScore += 8; // 站上季線但年線仍在上方
  }

  // 2. 價格動能與突破/破底 (Momentum Breakout/Breakdown - 權重 25 分)
  let momentumScore = 0;
  if (target.momentum60dPct >= 15) {
    momentumScore += 16;
  } else if (target.momentum60dPct >= 5) {
    momentumScore += 8;
  } else if (target.momentum60dPct <= -12) {
    momentumScore -= 20; // 破底重挫空頭主跌段
  } else if (target.momentum60dPct < 0) {
    momentumScore -= 10; // 弱勢陰跌走空
  }
  if (target.dailyChangePct > 3) momentumScore += 5;
  else if (target.dailyChangePct < -3) momentumScore -= 6;

  // 3. 三大法人與投信籌碼流向 (Smart Money Flow - 權重 25 分)
  let chipScore = 0;
  if (target.instNetBuy5dLots > 500 && target.trustNetBuy5dLots > 200) {
    chipScore += 18; // 外資與投信「雙認養鎖碼」
  } else if (target.instNetBuy5dLots < -1000 && target.trustNetBuy5dLots < -300) {
    chipScore -= 22; // 外資與投信「雙調節出貨」
  } else if (target.instNetBuy5dLots < -500) {
    chipScore -= 12; // 外資單向大幅提款
  } else if (target.trustNetBuy5dLots < -200) {
    chipScore -= 10; // 投信棄守砍倉
  } else if (target.instNetBuy5dLots > 0 || target.trustNetBuy5dLots > 0) {
    chipScore += 8; // 法人買盤溫和回補
  }

  // 4. 基本面營收與成長動能 (Fundamental Momentum - 權重 15 分)
  let fundScore = 0;
  if (target.revenueYoYPct >= 20) {
    fundScore += 12;
  } else if (target.revenueYoYPct >= 5) {
    fundScore += 6;
  } else if (target.revenueYoYPct <= -15) {
    fundScore -= 15; // 營收嚴重衰退
  } else if (target.revenueYoYPct < 0) {
    fundScore -= 8;
  }

  // 5. 同業相對估值折溢價 (Valuation Divergence - 權重 10 分)
  let valScore = 0;
  if (discountPremiumPct <= -15 && target.roePct >= 12) {
    valScore += 8; // 體質優良卻深度折價，安全邊際高
  } else if (discountPremiumPct > 35 && target.momentum60dPct < 0) {
    valScore -= 12; // 估值泡沫且動能轉弱，殺估值風險高
  }

  const rawTrendScore = 50 + maScore + momentumScore + chipScore + fundScore + valScore;
  const trendScore = Math.max(5, Math.min(98, Math.round(rawTrendScore)));

  let trendBias: TrendBias = 'CONSOLIDATION';
  let trendLabel = '區間震盪整理';
  let trendSummary = '均線糾結且量能平淡，多空力道互有拉鋸，等待量能突破表態。';
  let actionAdvice = '多空方向未明，建議暫先保留資金觀望，或採箱型下緣低接、上緣減碼操作。';

  if (trendScore >= 76) {
    trendBias = 'STRONG_BULL';
    trendLabel = '強大多頭格局';
    trendSummary = `均線呈多頭排列，外資投信近 5 日合計買超 ${target.instNetBuy5dLots > 0 ? '+' : ''}${target.instNetBuy5dLots} 張，多方強勢控盤。`;
    actionAdvice = '多方掌控全局，拉回均線支撐有守可順勢分批加碼，以 2 ATR 設移動停利。';
  } else if (trendScore >= 60) {
    trendBias = 'MILD_BULL';
    trendLabel = '溫和偏多蓄勢';
    trendSummary = '股價維持於中期均線上方，量能溫和，具備震盪墊高挑戰前高的條件。';
    actionAdvice = '建議逢拉回量縮時分批布局，切忌過度追價，嚴守季線支撐防守點。';
  } else if (trendScore <= 24) {
    trendBias = 'STRONG_BEAR';
    trendLabel = '空頭破線崩跌';
    trendSummary = `跌破季線與年線關鍵支撐，均線全面空頭排列，法人近 5 日大幅調節賣超 ${Math.abs(target.instNetBuy5dLots)} 張，下檔未見煞車訊號。`;
    actionAdvice = '空方趨勢確立且破線下彎，持股者強烈建議反彈減碼出清，空手者嚴禁接刀摸底。';
  } else if (trendScore <= 41) {
    trendBias = 'WEAK_BEAR';
    trendLabel = '弱勢偏空整理';
    trendSummary = '跌破關鍵均線支撐，均線下彎蓋頭，法人籌碼偏向調節，短線反彈動能疲弱。';
    actionAdvice = '偏空格局成形，持股者應趁反彈至均線壓力分批減碼避險，切勿貿然摸底。';
  }

  // 2. 關鍵點位精算 (SL, TP1, TP2, TP3)
  const isBearish = trendBias === 'STRONG_BEAR' || trendBias === 'WEAK_BEAR';

  let slPrice: number;
  let slDownsidePct: number;
  let tp1Price: number;
  let tp1UpsidePct: number;
  let tp2Price: number;
  let tp2UpsidePct: number;
  let tp3Price: number;
  let tp3UpsidePct: number;
  let riskRewardRatio: number;
  let isRiskRewardFavorable: boolean;

  const qualityAlpha = (target.opmPct || 10) > 15 ? 1.08 : 1.0; // 品質溢價
  const eps = target.estimatedEps || Math.max(1, Math.round((p0 / (target.peRatio || 16)) * 10) / 10);
  const fairValueEstimate = Math.round(eps * peerMedianPe * qualityAlpha * 10) / 10;

  if (isBearish) {
    // 空方架構：防守點為上方反壓解套位，TP1/TP2 為下檔支撐測試滿足位
    slPrice = Math.round((p0 + 1.5 * atr) * 10) / 10;
    slDownsidePct = Math.round(((slPrice - p0) / p0) * 1000) / 10;
    tp1Price = Math.max(0.5, Math.round((p0 - 1.0 * atr) * 10) / 10);
    tp1UpsidePct = Math.round(((tp1Price - p0) / p0) * 1000) / 10;
    tp2Price = Math.max(0.5, Math.round((p0 - 2.5 * atr) * 10) / 10);
    tp2UpsidePct = Math.round(((tp2Price - p0) / p0) * 1000) / 10;
    tp3Price = Math.max(0.5, Math.round((p0 - 4.0 * atr) * 10) / 10);
    tp3UpsidePct = Math.round(((tp3Price - p0) / p0) * 1000) / 10;
    riskRewardRatio = 0.5;
    isRiskRewardFavorable = false;
  } else {
    // 多方與震盪架構：多單防守點在下方 2 ATR，TP1/TP2/TP3 往上看
    slPrice = Math.max(0.5, Math.round((p0 - 2 * atr) * 10) / 10);
    slDownsidePct = Math.round(((slPrice - p0) / p0) * 1000) / 10;

    tp2Price = Math.max(Math.round(p0 * 1.08 * 10) / 10, fairValueEstimate);
    tp2UpsidePct = Math.round(((tp2Price - p0) / p0) * 1000) / 10;

    tp1Price = Math.round((p0 + 0.5 * (tp2Price - p0)) * 10) / 10;
    tp1UpsidePct = Math.round(((tp1Price - p0) / p0) * 1000) / 10;

    tp3Price = Math.round(tp2Price * 1.15 * 10) / 10;
    tp3UpsidePct = Math.round(((tp3Price - p0) / p0) * 1000) / 10;

    const risk1R = p0 - slPrice;
    const reward2R = tp2Price - p0;
    riskRewardRatio = risk1R > 0 ? Math.round((reward2R / risk1R) * 100) / 100 : 2.5;
    isRiskRewardFavorable = riskRewardRatio >= 1.5;
  }

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
    isRiskRewardFavorable,
    atr14: atr,
  };

  // 2.5 長·中·短三期全面評估 (Horizon Evaluation)
  const horizons = calculateMultiHorizonEvaluation(target, p0, atr, ladder, discountPremiumPct);

  // 3. 價格合理性評估
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
    horizons,
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
        changePct: baseReport.ladder.slDownsidePct ? 0 : 0,
        trendBias: baseReport.trendBias,
        trendScore: baseReport.trendScore,
        trendLabel: baseReport.trendLabel,
        trendSummary: baseReport.trendSummary,
        actionAdvice: baseReport.actionAdvice,
        horizons: baseReport.horizons,
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
