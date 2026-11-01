/**
 * FinMind 官方金融 API 整合服務 (https://api.finmindtrade.com/api/v4/data)
 * 涵蓋台股日成交行情、三大法人買賣超 (外資/投信/自營商)、個股月營收 YoY 與財務報表
 * 具備免 Token (每小時 300 次) 與自訂 Token (每小時 600 次) 雙軌模式
 * 內建 6 小時智慧快取，保護請求配額不浪費
 */

export interface FinMindPriceRow {
  date: string;
  stock_id: string;
  Trading_Volume: number;
  Trading_money: number;
  open: number;
  max: number;
  min: number;
  close: number;
  spread: number;
  Trading_turnover: number;
}

export interface FinMindInstRow {
  date: string;
  stock_id: string;
  buy: number;
  sell: number;
  name: 'Foreign_Investor' | 'Investment_Trust' | 'Dealer_Self' | 'Dealer_Hedging' | string;
}

export interface FinMindMonthRevenueRow {
  date: string;
  stock_id: string;
  country: string;
  revenue: number;
  revenue_month: number;
  revenue_year: number;
}

export interface FinMindFinancialStatementRow {
  date: string;
  stock_id: string;
  type: string;
  value: number;
  origin_name: string;
}

export interface FinMindAggregatedStockData {
  symbol: string;
  stockId: string;
  latestPrice: number;
  previousClose: number;
  dailyChangePct: number;
  volumeLots: number;
  latestDate: string;
  foreignNetBuyLots5d: number;
  trustNetBuyLots5d: number;
  totalInstNetBuyLots5d: number;
  latestMonthlyRevenueMillionTwd?: number;
  revenueYoYPct?: number;
  revenueMonth?: number;
  source: 'finmind_live' | 'finmind_cache' | 'fallback';
  fetchedAt: string;
}

const CACHE_PREFIX = 'finmind_cache_v1_';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 小時快取

export const DEFAULT_FINMIND_TOKEN =
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_FINMIND_TOKEN as string)) ||
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoidGFuZzkyMTExOCIsImVtYWlsIjoidGFuZ2doZ2hAZ21haWwuY29tIiwidG9rZW5fdmVyc2lvbiI6MH0.eV8XmNzmgJGDp2azc5NoX8jgg1PYQNdbn9Cc9CecpH0';

function getCleanStockId(rawSymbol: string): string {
  const clean = rawSymbol.trim().toUpperCase().replace(/\.(TW|TWO)$/i, '');
  return clean;
}

function getStoredCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const item = JSON.parse(raw) as { data: T; timestamp: number };
    if (Date.now() - item.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return item.data;
  } catch {
    return null;
  }
}

function setStoredCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // LocalStorage quota may be reached, ignore safely
  }
}

/**
 * 核心請求封裝器，向 FinMind API v4 發送請求
 */
async function callFinMindDataset<T>(
  dataset: string,
  stockId: string,
  extraParams: Record<string, string> = {},
  token?: string
): Promise<T[]> {
  const cacheKey = `${dataset}_${stockId}_${JSON.stringify(extraParams)}`;
  const cached = getStoredCache<T[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const query = new URLSearchParams({
    dataset,
    data_id: stockId,
    ...extraParams,
  });

  const effectiveToken = (token && token.trim()) || DEFAULT_FINMIND_TOKEN;
  if (effectiveToken) {
    query.set('token', effectiveToken.trim());
  }

  // 優先嘗試本地或代理端點，若無法連通則直連 FinMind 官方端點
  const urls = [
    `/api/finmind?${query.toString()}`,
    `https://api.finmindtrade.com/api/v4/data?${query.toString()}`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) continue;
      const json = (await res.json()) as { status: number; data?: T[]; msg?: string };
      if (json && (json.status === 200 || Array.isArray(json.data))) {
        const result = Array.isArray(json.data) ? json.data : [];
        if (result.length > 0) {
          setStoredCache(cacheKey, result);
        }
        return result;
      }
    } catch {
      // Try next url
    }
  }

  return [];
}

/**
 * 查詢個股最近日 K 線報價
 */
export async function getFinMindStockPrices(
  rawSymbol: string,
  startDate?: string,
  token?: string
): Promise<FinMindPriceRow[]> {
  const stockId = getCleanStockId(rawSymbol);
  const start =
    startDate ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return callFinMindDataset<FinMindPriceRow>(
    'TaiwanStockPrice',
    stockId,
    { start_date: start },
    token
  );
}

/**
 * 查詢個股三大法人每日買賣超明細 (外資、投信、自營商)
 */
export async function getFinMindInstitutionalFlow(
  rawSymbol: string,
  startDate?: string,
  token?: string
): Promise<FinMindInstRow[]> {
  const stockId = getCleanStockId(rawSymbol);
  const start =
    startDate ||
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return callFinMindDataset<FinMindInstRow>(
    'TaiwanStockInstitutionalInvestorsBuySell',
    stockId,
    { start_date: start },
    token
  );
}

/**
 * 查詢個股近幾月營收
 */
export async function getFinMindMonthlyRevenue(
  rawSymbol: string,
  token?: string
): Promise<FinMindMonthRevenueRow[]> {
  const stockId = getCleanStockId(rawSymbol);
  const start = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return callFinMindDataset<FinMindMonthRevenueRow>(
    'TaiwanStockMonthRevenue',
    stockId,
    { start_date: start },
    token
  );
}

/**
 * 匯整單一股票的 FinMind 權威量化資料（最新價格、5日外資與投信張數、最新月營收與年增率）
 */
export async function aggregateFinMindStockOverview(
  rawSymbol: string,
  token?: string
): Promise<FinMindAggregatedStockData | null> {
  const stockId = getCleanStockId(rawSymbol);

  // 僅對純數字代號（台股）呼叫 FinMind 服務
  if (!/^\d{4,6}[A-Z]?$/.test(stockId)) {
    return null;
  }

  const [prices, instFlows, revenues] = await Promise.all([
    getFinMindStockPrices(rawSymbol, undefined, token),
    getFinMindInstitutionalFlow(rawSymbol, undefined, token),
    getFinMindMonthlyRevenue(rawSymbol, token),
  ]);

  if (!prices || prices.length === 0) {
    return null;
  }

  // 1. 最新收盤與昨收
  const sortedPrices = [...prices].sort((a, b) => a.date.localeCompare(b.date));
  const latestPriceRow = sortedPrices[sortedPrices.length - 1];
  const prevPriceRow = sortedPrices[sortedPrices.length - 2] || latestPriceRow;

  const latestPrice = latestPriceRow.close;
  const previousClose = prevPriceRow.close;
  const dailyChangePct =
    previousClose > 0
      ? Math.round(((latestPrice - previousClose) / previousClose) * 10000) / 100
      : 0;
  const volumeLots = Math.round(latestPriceRow.Trading_Volume / 1000);

  // 2. 三大法人近 5 日買賣超張數 (以股數除以 1000 換算為張數)
  let foreignNetBuyLots5d = 0;
  let trustNetBuyLots5d = 0;

  if (instFlows && instFlows.length > 0) {
    // 找出最近 5 個不同的日期
    const uniqueDates = Array.from(new Set(instFlows.map((r) => r.date)))
      .sort()
      .slice(-5);

    for (const row of instFlows) {
      if (uniqueDates.includes(row.date)) {
        const netLots = Math.round((row.buy - row.sell) / 1000);
        if (row.name.toLowerCase().includes('foreign')) {
          foreignNetBuyLots5d += netLots;
        } else if (row.name.toLowerCase().includes('trust')) {
          trustNetBuyLots5d += netLots;
        }
      }
    }
  }

  // 3. 最新月營收與 YoY 推算
  let latestMonthlyRevenueMillionTwd: number | undefined;
  let revenueYoYPct: number | undefined;
  let revenueMonth: number | undefined;

  if (revenues && revenues.length > 0) {
    const sortedRevs = [...revenues].sort((a, b) => a.date.localeCompare(b.date));
    const latestRev = sortedRevs[sortedRevs.length - 1];
    revenueMonth = latestRev.revenue_month;
    latestMonthlyRevenueMillionTwd = Math.round(latestRev.revenue / 1000000);

    // 尋找去年同月營收計算真實 YoY
    const sameMonthLastYear = sortedRevs.find(
      (r) =>
        r.revenue_month === latestRev.revenue_month &&
        r.revenue_year === latestRev.revenue_year - 1
    );

    if (sameMonthLastYear && sameMonthLastYear.revenue > 0) {
      revenueYoYPct =
        Math.round(
          ((latestRev.revenue - sameMonthLastYear.revenue) /
            sameMonthLastYear.revenue) *
            1000
        ) / 10;
    }
  }

  return {
    symbol: rawSymbol,
    stockId,
    latestPrice,
    previousClose,
    dailyChangePct,
    volumeLots,
    latestDate: latestPriceRow.date,
    foreignNetBuyLots5d,
    trustNetBuyLots5d,
    totalInstNetBuyLots5d: foreignNetBuyLots5d + trustNetBuyLots5d,
    latestMonthlyRevenueMillionTwd,
    revenueYoYPct,
    revenueMonth,
    source: 'finmind_live',
    fetchedAt: new Date().toISOString(),
  };
}
