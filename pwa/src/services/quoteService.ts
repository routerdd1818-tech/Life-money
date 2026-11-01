import { DividendFrequency, InvestmentCategory, QuoteCurrency, SecurityHolding } from '../types';

export interface SecurityPreset {
  symbol: string;
  name: string;
  category: InvestmentCategory;
  currency: QuoteCurrency;
  defaultPrice: number;
  dividendFrequency: DividendFrequency;
  estimatedAnnualYieldPct: number;
  dividendMonths: number[];
  description: string;
}

/**
 * 內建台灣與美國熱門「股票 / 市值與高股息 ETF / 債券 ETF / 境內外基金」快速字典
 * 即使在離線狀態也能提供精準基準價、配息頻率與配息月份
 */
export const SECURITY_PRESETS: SecurityPreset[] = [
  // 台股個股 & ETF
  {
    symbol: '2330.TW',
    name: '台積電',
    category: 'stock',
    currency: 'TWD',
    defaultPrice: 1065.0,
    dividendFrequency: 'quarterly',
    estimatedAnnualYieldPct: 1.6,
    dividendMonths: [3, 6, 9, 12],
    description: '全球晶圓代工龍頭 (季配息)',
  },
  {
    symbol: '0050.TW',
    name: '元大台灣50',
    category: 'etf',
    currency: 'TWD',
    defaultPrice: 196.5,
    dividendFrequency: 'semi_annual',
    estimatedAnnualYieldPct: 2.8,
    dividendMonths: [1, 7],
    description: '台股市值前50大權值ETF (半年配)',
  },
  {
    symbol: '006208.TW',
    name: '富邦台50',
    category: 'etf',
    currency: 'TWD',
    defaultPrice: 114.5,
    dividendFrequency: 'semi_annual',
    estimatedAnnualYieldPct: 2.9,
    dividendMonths: [7, 11],
    description: '低內扣費市值型台股ETF',
  },
  {
    symbol: '00878.TW',
    name: '國泰永續高股息',
    category: 'etf',
    currency: 'TWD',
    defaultPrice: 22.85,
    dividendFrequency: 'quarterly',
    estimatedAnnualYieldPct: 6.4,
    dividendMonths: [2, 5, 8, 11],
    description: '高人氣季配息高股息ETF',
  },
  {
    symbol: '00919.TW',
    name: '群益台灣精選高息',
    category: 'etf',
    currency: 'TWD',
    defaultPrice: 23.6,
    dividendFrequency: 'quarterly',
    estimatedAnnualYieldPct: 8.2,
    dividendMonths: [3, 6, 9, 12],
    description: '3/6/9/12月季配高息ETF',
  },
  {
    symbol: '00929.TW',
    name: '復華台灣科技優息',
    category: 'etf',
    currency: 'TWD',
    defaultPrice: 18.75,
    dividendFrequency: 'monthly',
    estimatedAnnualYieldPct: 7.2,
    dividendMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    description: '台股月配息科技高股息ETF',
  },
  // 債券與債券 ETF (櫃買 .TWO 與美股債券 ETF)
  {
    symbol: '00679B.TWO',
    name: '元大美債20年',
    category: 'bond',
    currency: 'TWD',
    defaultPrice: 29.85,
    dividendFrequency: 'quarterly',
    estimatedAnnualYieldPct: 4.5,
    dividendMonths: [2, 5, 8, 11],
    description: '台灣最大長天期美國公債ETF (櫃買掛牌)',
  },
  {
    symbol: '00687B.TWO',
    name: '國泰20年美債',
    category: 'bond',
    currency: 'TWD',
    defaultPrice: 30.9,
    dividendFrequency: 'quarterly',
    estimatedAnnualYieldPct: 4.5,
    dividendMonths: [1, 4, 7, 10],
    description: '1/4/7/10月季配長天期美債ETF',
  },
  {
    symbol: '00937B.TWO',
    name: '群益ESG投等債20+',
    category: 'bond',
    currency: 'TWD',
    defaultPrice: 15.92,
    dividendFrequency: 'monthly',
    estimatedAnnualYieldPct: 6.1,
    dividendMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    description: '月配息投資等級公司債ETF (櫃買掛牌)',
  },
  {
    symbol: '00720B.TWO',
    name: '元大投資級公司債',
    category: 'bond',
    currency: 'TWD',
    defaultPrice: 35.4,
    dividendFrequency: 'quarterly',
    estimatedAnnualYieldPct: 5.4,
    dividendMonths: [1, 4, 7, 10],
    description: 'BBB級以上美元投資級公司債ETF',
  },
  {
    symbol: 'TLT',
    name: 'iShares 20年期以上美債ETF',
    category: 'bond',
    currency: 'USD',
    defaultPrice: 93.4,
    dividendFrequency: 'monthly',
    estimatedAnnualYieldPct: 4.3,
    dividendMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    description: '美股原幣月配息20年長天期公債ETF',
  },
  {
    symbol: 'BND',
    name: 'Vanguard 總體債券市場ETF',
    category: 'bond',
    currency: 'USD',
    defaultPrice: 73.2,
    dividendFrequency: 'monthly',
    estimatedAnnualYieldPct: 4.1,
    dividendMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    description: '涵蓋美國公債與投資級債之月配ETF',
  },
  // 美股 ETF 與個股
  {
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    category: 'etf',
    currency: 'USD',
    defaultPrice: 536.0,
    dividendFrequency: 'quarterly',
    estimatedAnnualYieldPct: 1.3,
    dividendMonths: [3, 6, 9, 12],
    description: '追蹤標普500指數核心ETF',
  },
  {
    symbol: 'QQQ',
    name: 'Invesco 那斯達克100 ETF',
    category: 'etf',
    currency: 'USD',
    defaultPrice: 504.0,
    dividendFrequency: 'quarterly',
    estimatedAnnualYieldPct: 0.6,
    dividendMonths: [3, 6, 9, 12],
    description: '美國前百大非金融科技成長股ETF',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA 輝達',
    category: 'stock',
    currency: 'USD',
    defaultPrice: 141.5,
    dividendFrequency: 'quarterly',
    estimatedAnnualYieldPct: 0.03,
    dividendMonths: [3, 6, 9, 12],
    description: 'AI 算力與資料中心 GPU 龍頭',
  },
  // 熱門共同基金 (境內外基金範例)
  {
    symbol: '0P00006B05.TW',
    name: '安聯台灣科技基金',
    category: 'fund',
    currency: 'TWD',
    defaultPrice: 248.6,
    dividendFrequency: 'none',
    estimatedAnnualYieldPct: 0,
    dividendMonths: [],
    description: '台灣主動型台股科技王牌基金',
  },
  {
    symbol: 'LU0072462426',
    name: '貝萊德世界科技基金 A2',
    category: 'fund',
    currency: 'USD',
    defaultPrice: 92.4,
    dividendFrequency: 'none',
    estimatedAnnualYieldPct: 0,
    dividendMonths: [],
    description: '全球大型科技主動型共同基金 (USD)',
  },
  {
    symbol: 'LU0171298648',
    name: '聯博全球非投資等級債券基金 AT',
    category: 'fund',
    currency: 'USD',
    defaultPrice: 3.18,
    dividendFrequency: 'monthly',
    estimatedAnnualYieldPct: 7.5,
    dividendMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    description: '熱門月配息境外債券型基金 (USD)',
  },
];

interface ApiQuotesResponse {
  exchangeRateUsdTwd: number;
  quotes: Record<
    string,
    {
      symbol: string;
      resolvedSymbol: string;
      name?: string;
      price: number;
      previousClose?: number;
      currency: 'TWD' | 'USD';
      source: 'yahoo' | 'twse' | 'tpex' | 'fallback';
      updatedAt: string;
    }
  >;
  fetchedAt: string;
}

/**
 * 重新計算單一部位之台幣市值與未實現損益
 */
export function recalculateHoldingMetrics(
  holding: SecurityHolding,
  newPrice?: number,
  newUsdTwdRate?: number
): SecurityHolding {
  const price = typeof newPrice === 'number' && newPrice > 0 ? newPrice : holding.currentPrice;
  const fxRate =
    holding.currency === 'USD'
      ? typeof newUsdTwdRate === 'number' && newUsdTwdRate > 0
        ? newUsdTwdRate
        : holding.exchangeRateToTwd || 32.18
      : 1;

  const marketValueTwd = Math.round(holding.units * price * fxRate);
  const totalCostTwd = Math.round(holding.units * holding.costBasisPerUnit * fxRate);
  const unrealizedPnlTwd = marketValueTwd - totalCostTwd;
  const unrealizedReturnPct =
    totalCostTwd > 0 ? Math.round((unrealizedPnlTwd / totalCostTwd) * 10000) / 100 : 0;

  return {
    ...holding,
    currentPrice: price,
    exchangeRateToTwd: fxRate,
    marketValueTwd,
    unrealizedPnlTwd,
    unrealizedReturnPct,
  };
}

/**
 * 查詢預設標的特徵 (協助使用者只輸入代號如 00679B 或 2330 時自動補齊名稱、分類、配息頻率)
 */
export function findSecurityPreset(rawSymbol: string): SecurityPreset | undefined {
  const clean = rawSymbol.trim().toUpperCase();
  const base = clean.replace(/\.(TW|TWO)$/, '');
  return SECURITY_PRESETS.find(
    (p) =>
      p.symbol.toUpperCase() === clean ||
      p.symbol.toUpperCase().replace(/\.(TW|TWO)$/, '') === base
  );
}

/**
 * 批次向免費 Serverless 端點 (/api/quotes) 同步所有持倉最新收盤/即時價與匯率
 */
export async function syncAllHoldingsQuotes(
  holdings: SecurityHolding[],
  currentUsdTwdRate: number
): Promise<{ updatedHoldings: SecurityHolding[]; exchangeRateUsdTwd: number }> {
  if (holdings.length === 0) {
    return { updatedHoldings: [], exchangeRateUsdTwd: currentUsdTwdRate };
  }

  const symbols = Array.from(new Set(holdings.map((h) => h.symbol.trim().toUpperCase())));
  let liveFx = currentUsdTwdRate || 32.18;
  let apiQuotes: ApiQuotesResponse['quotes'] = {};

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7500);
    const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(','))}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as ApiQuotesResponse;
      if (typeof data.exchangeRateUsdTwd === 'number' && data.exchangeRateUsdTwd > 20) {
        liveFx = data.exchangeRateUsdTwd;
      }
      if (data.quotes) {
        apiQuotes = data.quotes;
      }
    }
  } catch {
    // 若處於純離線環境，嘗試免費匯率直連或優雅回退至本地基準價
    try {
      const rRes = await fetch('https://open.er-api.com/v6/latest/USD');
      if (rRes.ok) {
        const rData = (await rRes.json()) as { rates?: Record<string, number> };
        if (rData?.rates?.TWD) {
          liveFx = Math.round(rData.rates.TWD * 100) / 100;
        }
      }
    } catch {
      // keep existing liveFx
    }
  }

  const nowIso = new Date().toISOString();
  const updatedHoldings = holdings.map((h) => {
    const symKey = h.symbol.trim().toUpperCase();
    const hit = apiQuotes[symKey];

    if (hit && hit.price > 0) {
      const updated = recalculateHoldingMetrics(
        {
          ...h,
          previousClose: hit.previousClose ?? h.previousClose,
          lastQuotedAt: hit.updatedAt || nowIso,
          quoteSource: hit.source === 'fallback' ? 'manual' : hit.source,
        },
        hit.price,
        liveFx
      );
      return updated;
    }

    // 若無即時網路命中，更新匯率折算
    return recalculateHoldingMetrics({ ...h, lastQuotedAt: nowIso }, h.currentPrice, liveFx);
  });

  return {
    updatedHoldings,
    exchangeRateUsdTwd: liveFx,
  };
}
