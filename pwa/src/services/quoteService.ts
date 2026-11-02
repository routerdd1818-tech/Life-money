import {
  DividendFrequency,
  ExchangeRatesTable,
  InvestmentCategory,
  QuoteCurrency,
  SecurityHolding,
  SupportedCurrency,
} from '../types';

export const CURRENCY_META: Record<SupportedCurrency, { name: string; symbol: string; flag: string }> = {
  TWD: { name: '新台幣', symbol: 'NT$', flag: '🇹🇼' },
  USD: { name: '美元', symbol: '$', flag: '🇺🇸' },
  JPY: { name: '日幣', symbol: '¥', flag: '🇯🇵' },
  CNY: { name: '人民幣', symbol: '¥', flag: '🇨🇳' },
  KRW: { name: '韓元', symbol: '₩', flag: '🇰🇷' },
  VND: { name: '越南盾', symbol: '₫', flag: '🇻🇳' },
};

export const DEFAULT_EXCHANGE_RATES: ExchangeRatesTable = {
  USD: 32.25,
  JPY: 0.215,
  CNY: 4.45,
  KRW: 0.0235,
  VND: 0.00128,
  TWD: 1,
  updatedAt: new Date().toISOString(),
};

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

export interface LiveQuoteItem {
  symbol: string;
  resolvedSymbol: string;
  name?: string;
  price: number;
  previousClose?: number;
  dailyChangePct?: number;
  open?: number;
  high?: number;
  low?: number;
  volumeLots?: number;
  currency: 'TWD' | 'USD';
  source: 'twse' | 'tpex' | 'yahoo' | 'fallback' | 'manual';
  updatedAt: string;
}

export interface ApiQuotesResponse {
  exchangeRateUsdTwd: number;
  exchangeRates?: ExchangeRatesTable;
  quotes: Record<string, LiveQuoteItem>;
  fetchedAt: string;
}

function getStoredFugleApiKey(): string {
  try {
    const raw = localStorage.getItem('financelife_settings_v1');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return parsed?.fugleApiKey || '';
  } catch {
    return '';
  }
}

/**
 * 查詢任一單檔股票（台股上市/上櫃/興櫃、美股、ETF、基金）即時盤中報價
 */
export async function fetchRealtimeQuote(
  rawSymbol: string,
  fugleApiKey?: string
): Promise<LiveQuoteItem | null> {
  const clean = rawSymbol.trim().toUpperCase();
  if (!clean) return null;

  const effectiveKey = fugleApiKey || getStoredFugleApiKey();
  const fugleParam = effectiveKey ? `&fugleApiKey=${encodeURIComponent(effectiveKey)}` : '';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(clean)}${fugleParam}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as ApiQuotesResponse;
      const baseCode = clean.replace(/\.(TW|TWO)$/i, '');
      const hit =
        data.quotes[clean] ||
        data.quotes[`${baseCode}.TW`] ||
        data.quotes[`${baseCode}.TWO`] ||
        data.quotes[baseCode];
      if (hit && hit.price > 0) {
        return hit;
      }
    }
  } catch {
    // network failure fallback
  }

  return null;
}

/**
 * 批次查詢多檔股票即時盤中報價
 */
export async function fetchBatchRealtimeQuotes(
  symbols: string[],
  fugleApiKey?: string
): Promise<Record<string, LiveQuoteItem>> {
  const cleanSymbols = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()))).filter(Boolean);
  if (cleanSymbols.length === 0) return {};

  const effectiveKey = fugleApiKey || getStoredFugleApiKey();
  const fugleParam = effectiveKey ? `&fugleApiKey=${encodeURIComponent(effectiveKey)}` : '';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(cleanSymbols.join(','))}${fugleParam}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as ApiQuotesResponse;
      return data.quotes || {};
    }
  } catch {
    // fallback
  }

  return {};
}

export async function fetchLatestExchangeRates(
  currentRates: ExchangeRatesTable = DEFAULT_EXCHANGE_RATES
): Promise<ExchangeRatesTable> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('/api/quotes?symbols=USDTWD=X', {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as ApiQuotesResponse;
      if (data.exchangeRates) {
        return data.exchangeRates;
      }
    }
  } catch {
    // fallback to open.er-api.com
    try {
      const rRes = await fetch('https://open.er-api.com/v6/latest/USD');
      if (rRes.ok) {
        const rData = (await rRes.json()) as { rates?: Record<string, number> };
        const r = rData?.rates;
        if (r && typeof r.TWD === 'number') {
          const twd = r.TWD;
          return {
            USD: Math.round(twd * 100) / 100,
            JPY: r.JPY ? Math.round((twd / r.JPY) * 10000) / 10000 : currentRates.JPY,
            CNY: r.CNY ? Math.round((twd / r.CNY) * 1000) / 1000 : currentRates.CNY,
            KRW: r.KRW ? Math.round((twd / r.KRW) * 10000) / 10000 : currentRates.KRW,
            VND: r.VND ? Math.round((twd / r.VND) * 100000) / 100000 : currentRates.VND,
            TWD: 1,
            updatedAt: new Date().toISOString(),
          };
        }
      }
    } catch {
      // keep
    }
  }

  return currentRates;
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
 * 批次向免費 Serverless 端點 (/api/quotes) 或直連開放端點同步持倉、自選股最新市價與 6 大外幣牌告匯率
 */
export async function syncAllHoldingsQuotes(
  holdings: SecurityHolding[],
  currentUsdTwdRate: number,
  currentRates?: ExchangeRatesTable,
  extraSymbols: string[] = []
): Promise<{
  updatedHoldings: SecurityHolding[];
  exchangeRateUsdTwd: number;
  exchangeRates: ExchangeRatesTable;
  apiQuotes: Record<string, LiveQuoteItem>;
  isSuccess: boolean;
  refreshedAt: string;
}> {
  let liveRates: ExchangeRatesTable = currentRates || DEFAULT_EXCHANGE_RATES;
  let liveFx = currentUsdTwdRate || 32.18;
  let apiQuotes: ApiQuotesResponse['quotes'] = {};
  let isSuccess = false;

  const holdingSymbols = holdings.map((h) => h.symbol.trim().toUpperCase());
  const allSymbols = Array.from(new Set([...holdingSymbols, ...extraSymbols.map((s) => s.trim().toUpperCase())])).filter(Boolean);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7500);
    const queryParam = allSymbols.length > 0 ? `?symbols=${encodeURIComponent(allSymbols.join(','))}` : '';
    const res = await fetch(`/api/quotes${queryParam}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as ApiQuotesResponse;
      if (typeof data.exchangeRateUsdTwd === 'number' && data.exchangeRateUsdTwd > 20) {
        liveFx = data.exchangeRateUsdTwd;
      }
      if (data.exchangeRates) {
        liveRates = data.exchangeRates;
      }
      if (data.quotes) {
        apiQuotes = data.quotes;
      }
      isSuccess = true;
    }
  } catch {
    // 若 Serverless 端點暫時無法連線，嘗試免費外匯 API 直連取得最新匯率
    try {
      const rRes = await fetch('https://open.er-api.com/v6/latest/USD');
      if (rRes.ok) {
        const rData = (await rRes.json()) as { rates?: Record<string, number> };
        const r = rData?.rates;
        if (r && typeof r.TWD === 'number') {
          liveFx = Math.round(r.TWD * 100) / 100;
          liveRates = {
            USD: liveFx,
            JPY: r.JPY ? Math.round((liveFx / r.JPY) * 10000) / 10000 : liveRates.JPY,
            CNY: r.CNY ? Math.round((liveFx / r.CNY) * 1000) / 1000 : liveRates.CNY,
            KRW: r.KRW ? Math.round((liveFx / r.KRW) * 10000) / 10000 : liveRates.KRW,
            VND: r.VND ? Math.round((liveFx / r.VND) * 100000) / 100000 : liveRates.VND,
            TWD: 1,
            updatedAt: new Date().toISOString(),
          };
          isSuccess = true;
        }
      }
    } catch {
      // 保持現存匯率
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
    exchangeRates: liveRates,
    apiQuotes,
    isSuccess,
    refreshedAt: nowIso,
  };
}
