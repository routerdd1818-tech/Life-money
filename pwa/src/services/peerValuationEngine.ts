import {
  DailyStockMetric,
  PeerTagType,
  PeerValuationResult,
  ScreenerStockItem,
  UserTradePlan,
} from '../types';

/**
 * 預設概念股與細分供應鏈標籤資料庫 (涵蓋台美主流熱門供應鏈)
 */
export const PEER_SUPPLY_CHAIN_GROUPS: {
  tag: string;
  name: string;
  description: string;
  symbols: string[];
}[] = [
  {
    tag: 'cowos_semicon',
    name: 'CoWoS 先進封裝與半導體設備',
    description: '晶圓代工龍頭、先進封裝、濕製程設備、探針卡與弘塑辛耘萬潤聯盟',
    symbols: ['2330.TW', '3711.TW', '3131.TW', '3583.TW', '6187.TW', '6515.TW', '2449.TW'],
  },
  {
    tag: 'ai_server_cooling',
    name: 'AI 伺服器與水冷散熱模組',
    description: 'GB200/GB300 伺服器組裝、水冷板、CDU、風扇機殼與電源供應器',
    symbols: ['3017.TW', '3324.TW', '3653.TW', '2382.TW', '6669.TW', '2376.TW', '2308.TW'],
  },
  {
    tag: 'cpo_silicon_photonics',
    name: 'CPO 矽光子與光收發模組',
    description: '800G/1.6T 高速光收發模組、雷射磊晶、矽光子封裝與光纖耦合元件',
    symbols: ['3450.TW', '3081.TW', '4979.TW', '6442.TW', '3163.TW', '3363.TW'],
  },
  {
    tag: 'asic_ic_design',
    name: 'IC 設計與 ASIC / 矽智財 IP',
    description: '雲端客製化晶片 (ASIC)、先進節點 IP 授權與邊緣 AI 晶片',
    symbols: ['2454.TW', '3661.TW', '3443.TW', '3529.TW', '5269.TW', '3035.TW'],
  },
  {
    tag: 'heavy_power_grid',
    name: '重電綠能與變壓器外銷',
    description: '台電強韌電網計畫、北美變壓器外銷外溢紅利、AI 資料中心配電',
    symbols: ['1519.TW', '1503.TW', '1513.TW', '1514.TW', '2371.TW'],
  },
  {
    tag: 'finance_defense_yield',
    name: '金控銀行與高息核心價值',
    description: '大型金控、高殖利率防禦防線與低波動底倉',
    symbols: ['2881.TW', '2882.TW', '2891.TW', '2886.TW', '2884.TW', '2885.TW'],
  },
  {
    tag: 'shipping_cyclical',
    name: '貨櫃海運與景氣循環龍頭',
    description: '全球貨櫃航商、遠歐美運價指數與景氣循環 P/B 估值標的',
    symbols: ['2603.TW', '2609.TW', '2615.TW', '2637.TW', '2606.TW'],
  },
  {
    tag: 'us_tech_titans',
    name: '全球 AI 與美股科技巨擘',
    description: '全球 AI 運算架構與雲端資料中心龍頭對標',
    symbols: ['NVDA', 'MSFT', 'AAPL', 'AMZN', 'GOOGL', 'META', 'TSM'],
  },
];

/**
 * 統計輔助：計算分位數 (Percentile 0~1)
 */
export function calculatePercentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * 統計輔助：縮尾與截尾中位數 (Trimmed Median)
 * 剔除最高與最低比例之極端值（預設 10%），防止少數虧損或飆漲 200 倍扭曲同業定價
 */
export function calculateTrimmedMedian(values: number[], trimRatio = 0.1): number {
  if (values.length === 0) return 0;
  if (values.length <= 2) {
    const sum = values.reduce((acc, v) => acc + v, 0);
    return sum / values.length;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * trimRatio);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  if (trimmed.length === 0) return sorted[Math.floor(sorted.length / 2)];
  
  const mid = Math.floor(trimmed.length / 2);
  return trimmed.length % 2 !== 0
    ? trimmed[mid]
    : (trimmed[mid - 1] + trimmed[mid]) / 2;
}

/**
 * 向量餘弦相似度 (Cosine Similarity)
 * 根據 [毛利率, ROE, 營收年增率, 成交規模對數] 匹配最相似競爭對手
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 提取個股量化特徵向量
 */
function extractFeatureVector(stock: ScreenerStockItem): number[] {
  return [
    stock.grossMarginPct / 100,
    stock.roePct / 100,
    (stock.revenueYoYPct || 0) / 100,
    Math.log10(Math.max(1, stock.avgTurnover60dYiTwd)),
    (stock.peRatio > 0 && stock.peRatio < 100 ? stock.peRatio : 25) / 50,
  ];
}

/**
 * 演算法自動推薦體質最相近之 5 家同業 (Algorithmic Peer Matching)
 */
export function findAlgorithmicPeers(
  targetStock: ScreenerStockItem,
  universe: ScreenerStockItem[],
  maxPeers = 5
): ScreenerStockItem[] {
  const targetVec = extractFeatureVector(targetStock);
  const candidates = universe.filter(
    (s) => s.symbol.toUpperCase() !== targetStock.symbol.toUpperCase()
  );

  const scored = candidates.map((cand) => {
    const candVec = extractFeatureVector(cand);
    const sim = calculateCosineSimilarity(targetVec, candVec);
    return { stock: cand, similarity: sim };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, maxPeers).map((s) => s.stock);
}

/**
 * 計算五維度 PR 百分位數 (0~100)
 */
export function calculateRadarPRScores(
  target: ScreenerStockItem,
  peers: ScreenerStockItem[]
): {
  valuationAttraction: number;
  growthMomentum: number;
  profitMoat: number;
  capitalEfficiency: number;
  chipConcentration: number;
} {
  const all = [target, ...peers];
  const count = all.length;
  if (count <= 1) {
    return {
      valuationAttraction: 50,
      growthMomentum: 50,
      profitMoat: 50,
      capitalEfficiency: 50,
      chipConcentration: 50,
    };
  }

  // 1. 估值吸引力：PE / PEG 倒數 (本益比越低越好，排除負值與 > 100)
  const peInverses = all.map((s) => {
    const pe = s.peRatio > 0 && s.peRatio <= 100 ? s.peRatio : 100;
    return 1 / pe;
  });
  const targetPeInv = 1 / (target.peRatio > 0 && target.peRatio <= 100 ? target.peRatio : 100);
  const peRank = peInverses.filter((v) => v <= targetPeInv).length;
  const valuationPR = Math.round((peRank / count) * 100);

  // 2. 成長動能：月營收 YoY
  const revYoYs = all.map((s) => s.revenueYoYPct);
  const revRank = revYoYs.filter((v) => v <= target.revenueYoYPct).length;
  const growthPR = Math.round((revRank / count) * 100);

  // 3. 獲利護城河：毛利率 (若有 opmPct 則加權)
  const profits = all.map((s) => s.grossMarginPct * 0.6 + (s.opmPct || s.grossMarginPct * 0.4) * 0.4);
  const targetProfit = target.grossMarginPct * 0.6 + (target.opmPct || target.grossMarginPct * 0.4) * 0.4;
  const profitRank = profits.filter((v) => v <= targetProfit).length;
  const profitPR = Math.round((profitRank / count) * 100);

  // 4. 資本效率：ROE
  const roes = all.map((s) => s.roePct);
  const roeRank = roes.filter((v) => v <= target.roePct).length;
  const capitalPR = Math.round((roeRank / count) * 100);

  // 5. 籌碼集中度：三大法人 5 日買賣超 (張數標準化 / 流動性)
  const chips = all.map((s) => s.instNetBuy5dLots / Math.max(1, s.avgTurnover60dYiTwd * 100));
  const targetChip = target.instNetBuy5dLots / Math.max(1, target.avgTurnover60dYiTwd * 100);
  const chipRank = chips.filter((v) => v <= targetChip).length;
  const chipPR = Math.round((chipRank / count) * 100);

  return {
    valuationAttraction: Math.min(100, Math.max(5, valuationPR)),
    growthMomentum: Math.min(100, Math.max(5, growthPR)),
    profitMoat: Math.min(100, Math.max(5, profitPR)),
    capitalEfficiency: Math.min(100, Math.max(5, capitalPR)),
    chipConcentration: Math.min(100, Math.max(5, chipPR)),
  };
}

/**
 * 簡易線性迴歸分析 (ROE vs PB 或 EPS YoY vs PE)
 */
export function calculateLinearRegression(
  points: { x: number; y: number }[]
): { slope: number; intercept: number; rSquared: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-9) {
    return { slope: 0, intercept: sumY / n, rSquared: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // 計算 R^2
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const predictedY = slope * p.x + intercept;
    ssTot += Math.pow(p.y - meanY, 2);
    ssRes += Math.pow(p.y - predictedY, 2);
  }
  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return { slope, intercept, rSquared };
}

/**
 * 智慧同業估值與三階段 TP/SL 定價引擎核心執行器
 */
export function evaluatePeerValuationAndTradePlan(
  targetStock: ScreenerStockItem,
  peerStocks: ScreenerStockItem[],
  peerGroupTag: string,
  peerGroupType: PeerTagType | 'custom' = 'supply_chain',
  capitalBudget = 1000000, // 預設 100 萬資金
  riskBudgetPct = 1.5      // 預設單筆承擔 1.5% 總資金風險
): PeerValuationResult {
  const p0 = targetStock.price;
  const isCyclical = !!targetStock.isCyclical || targetStock.sectorId === 'shipping_trad';

  // 1. 估算個股預估 EPS
  const targetEstimatedEps =
    targetStock.estimatedEps && targetStock.estimatedEps > 0
      ? targetStock.estimatedEps
      : targetStock.peRatio > 0
      ? Number((p0 / targetStock.peRatio).toFixed(2))
      : Number((p0 / 15).toFixed(2));

  // 2. 篩選同業有效本益比與淨值比 (護欄：剔除虧損與極端值 > 120)
  const validPeers = peerStocks.filter(
    (p) => p.symbol.toUpperCase() !== targetStock.symbol.toUpperCase()
  );

  const rawPes = validPeers
    .map((p) => p.peRatio)
    .filter((pe) => pe > 0 && pe <= 120);

  const rawPbs = validPeers
    .map((p) => p.pbRatio)
    .filter((pb) => pb > 0 && pb <= 30);

  const rawOpms = validPeers
    .map((p) => p.opmPct ?? p.grossMarginPct * 0.45)
    .filter((opm) => opm > 0);

  // 3. 計算同業分位數與截尾中位數
  const peerMedianPe = rawPes.length > 0 ? calculateTrimmedMedian(rawPes, 0.1) : 22;
  const peerTrimmedMedianPe = rawPes.length > 0 ? calculateTrimmedMedian(rawPes, 0.15) : 22;
  const peerMedianPb = rawPbs.length > 0 ? calculateTrimmedMedian(rawPbs, 0.1) : 2.5;

  const peerQ1Pe = rawPes.length > 0 ? calculatePercentile(rawPes, 0.25) : peerMedianPe * 0.85;
  const peerQ3Pe = rawPes.length > 0 ? calculatePercentile(rawPes, 0.75) : peerMedianPe * 1.15;
  const peerQ90Pe = rawPes.length > 0 ? calculatePercentile(rawPes, 0.9) : peerMedianPe * 1.35;
  const peerQ3Opm = rawOpms.length > 0 ? calculatePercentile(rawOpms, 0.75) : 25;

  // 4. 品質溢價係數 alpha (若個股營業利益率高於同業 Q3，給予 +10% 溢價)
  const targetOpm = targetStock.opmPct ?? targetStock.grossMarginPct * 0.45;
  let qualityPremiumAlpha = 0;
  if (targetOpm >= peerQ3Opm && targetOpm > 0) {
    qualityPremiumAlpha = 0.1; // +10% 品質溢價
  } else if (targetOpm < calculatePercentile(rawOpms, 0.25)) {
    qualityPremiumAlpha = -0.05; // -5% 折價扣分
  }

  // 5. 決定主要估值方法 (景氣循環股或 PE 失真時強制切換 PB)
  const valuationMethod: 'PE' | 'PB' =
    isCyclical || targetStock.peRatio <= 0 || targetStock.peRatio > 120
      ? 'PB'
      : 'PE';

  let targetFairValue = 0;
  if (valuationMethod === 'PE') {
    targetFairValue = targetEstimatedEps * peerMedianPe * (1 + qualityPremiumAlpha);
  } else {
    const bookValuePerShare = p0 / Math.max(0.5, targetStock.pbRatio);
    targetFairValue = bookValuePerShare * peerMedianPb * (1 + qualityPremiumAlpha);
  }
  targetFairValue = Math.round(targetFairValue * 10) / 10;

  // 相對同業折溢價率 %
  const discountPct = Number((((p0 - targetFairValue) / targetFairValue) * 100).toFixed(1));
  const isDiscounted = discountPct < 0; // 現價低於同業合理價

  // 6. ATR14 與停損/止盈定價連動
  const atr14 =
    targetStock.atr14 && targetStock.atr14 > 0
      ? targetStock.atr14
      : Number(
          Math.max(
            1,
            ((p0 * (targetStock.annualVolatilityPct || 28)) / 100 / Math.sqrt(252)) * 1.6
          ).toFixed(1)
        );

  // 停損價 SL = P0 - 2 * ATR (底線考量同業 Q1 支撐保護)
  const peerQ1SupportPrice =
    valuationMethod === 'PE'
      ? targetEstimatedEps * peerQ1Pe
      : (p0 / Math.max(0.5, targetStock.pbRatio)) * (peerMedianPb * 0.85);

  let slPrice = Math.max(
    Number((p0 - 2 * atr14).toFixed(1)),
    Number((p0 * 0.85).toFixed(1))
  );
  // 若同業估值 Q1 支撐位與 ATR 接近，作為有力防禦基準
  if (peerQ1SupportPrice > 0 && peerQ1SupportPrice < p0 && peerQ1SupportPrice > slPrice) {
    slPrice = Number(peerQ1SupportPrice.toFixed(1));
  }
  // 避免 SL >= P0
  if (slPrice >= p0) slPrice = Number((p0 - atr14).toFixed(1));

  const riskUnit1R = Number((p0 - slPrice).toFixed(1));

  // TP2 錨定基本面合理目標價
  const tp2Price = targetFairValue;

  // TP1 = min(P0 + 1.5R, P0 + 0.5 * (TP2 - P0))，收斂同業折價 50% 去風險
  const halfDiscountConvergencePrice = p0 + 0.5 * Math.max(0, tp2Price - p0);
  const tp1Price = Number(
    Math.min(p0 + 1.5 * riskUnit1R, halfDiscountConvergencePrice).toFixed(1)
  );

  // TP3 = 同業 Q90 龍頭溢價極值 (享受估值重估 Re-rating 肥尾)
  const tp3Price = Number(
    Math.max(
      tp2Price * 1.15,
      valuationMethod === 'PE'
        ? targetEstimatedEps * peerQ90Pe
        : tp2Price * 1.2
    ).toFixed(1)
  );

  // 風報比與潛在空間
  const upsideTp2Pct = Number((((tp2Price - p0) / p0) * 100).toFixed(1));
  const riskRewardRatio =
    riskUnit1R > 0 ? Number(((tp2Price - p0) / riskUnit1R).toFixed(2)) : 0;

  // 風報比不足警告
  const isLowRiskRewardWarning = tp2Price < p0 + 1.5 * riskUnit1R || riskRewardRatio < 1.3;
  let warningMessage: string | undefined;
  if (isLowRiskRewardWarning) {
    warningMessage =
      tp2Price <= p0
        ? '⚠️ 該股現價已高於同業合理估值（溢價），潛在上漲空間受限，進場勝率偏低。'
        : `⚠️ 目標空間僅 +${upsideTp2Pct}%，風報比 ${riskRewardRatio}:1 未達標準 (1.5:1)，建議等待回檔至支撐位。`;
  }

  // 單筆部位風險部位計算 (1.5% 總資本風險)
  const riskBudgetTwd = (capitalBudget * riskBudgetPct) / 100;
  const suggestedShares = riskUnit1R > 0 ? Math.floor(riskBudgetTwd / riskUnit1R) : 1000;

  // 7. 五維度 PR 百分位雷達分數
  const radarScores = calculateRadarPRScores(targetStock, validPeers);

  // 8. 散佈圖與迴歸線 (ROE vs PB)
  const regressionPoints = [targetStock, ...validPeers].map((s) => ({
    x: s.roePct,
    y: s.pbRatio,
  }));
  const regression = calculateLinearRegression(regressionPoints);
  const fairPbByRegression = regression.slope * targetStock.roePct + regression.intercept;
  const isBelowRegressionLine = targetStock.pbRatio < fairPbByRegression;

  const tradePlan: UserTradePlan = {
    id: `plan_${targetStock.symbol}_${Date.now()}`,
    symbol: targetStock.symbol,
    name: targetStock.name,
    peerGroupTag,
    entryPrice: p0,
    atr14,
    riskUnit1R,
    slPrice,
    tp1Price,
    tp2Price,
    tp3Price,
    upsideTp2Pct,
    riskRewardRatio,
    isLowRiskRewardWarning,
    warningMessage,
    suggestedShares,
    stage: 'INITIAL',
    createdAt: new Date().toISOString(),
  };

  return {
    targetStock,
    peerGroupTag,
    peerGroupType,
    peerStocks: validPeers,
    peerMedianPe,
    peerTrimmedMedianPe,
    peerMedianPb,
    peerQ1Pe,
    peerQ3Pe,
    peerQ3Opm,
    peerQ90Pe,
    qualityPremiumAlpha,
    targetEstimatedEps,
    targetFairValue,
    valuationMethod,
    isDiscounted,
    discountPct,
    isCyclical,
    radarScores,
    regression: {
      slope: regression.slope,
      intercept: regression.intercept,
      rSquared: regression.rSquared,
      isBelowRegressionLine,
    },
    tradePlan,
  };
}
