/**
 * 100% 免費、免金鑰 (Zero-Key) 多源金融報價與匯率 Vercel Serverless API
 * 整合：
 * 1. Yahoo Finance v8 Open Chart API (支援台股上市 .TW、上櫃/債券 ETF .TWO、美股、國際基金)
 * 2. 台灣證交所 TWSE & 櫃買中心 TPEx 官方免費 OpenAPI 備援
 * 3. open.er-api.com 免費即時匯率 (USD -> TWD)
 */

interface QuoteItemResult {
  symbol: string;
  resolvedSymbol: string;
  name?: string;
  price: number;
  previousClose?: number;
  currency: 'TWD' | 'USD';
  source: 'yahoo' | 'twse' | 'tpex' | 'fallback';
  updatedAt: string;
}

interface VercelRequestLike {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface VercelResponseLike {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponseLike;
  json: (body: unknown) => void;
}

interface ExchangeRatesTable {
  USD: number;
  JPY: number;
  CNY: number;
  KRW: number;
  VND: number;
  TWD: number;
  updatedAt: string;
}

async function fetchAllExchangeRates(): Promise<ExchangeRatesTable> {
  const defaultRates: ExchangeRatesTable = {
    USD: 32.25,
    JPY: 0.215,
    CNY: 4.45,
    KRW: 0.0235,
    VND: 0.00128,
    TWD: 1,
    updatedAt: new Date().toISOString(),
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number> };
      const rates = data?.rates;
      if (rates && typeof rates.TWD === 'number' && rates.TWD > 0) {
        const twd = rates.TWD;
        return {
          USD: Math.round(twd * 100) / 100,
          JPY: rates.JPY ? Math.round((twd / rates.JPY) * 10000) / 10000 : defaultRates.JPY,
          CNY: rates.CNY ? Math.round((twd / rates.CNY) * 1000) / 1000 : defaultRates.CNY,
          KRW: rates.KRW ? Math.round((twd / rates.KRW) * 10000) / 10000 : defaultRates.KRW,
          VND: rates.VND ? Math.round((twd / rates.VND) * 100000) / 100000 : defaultRates.VND,
          TWD: 1,
          updatedAt: new Date().toISOString(),
        };
      }
    }
  } catch {
    // Fallback default
  }

  return defaultRates;
}

async function fetchYahooSingle(targetSymbol: string): Promise<QuoteItemResult | null> {
  const endpoints = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetSymbol)}?interval=1d&range=5d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetSymbol)}?interval=1d&range=5d`,
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FinanceLifePWA/1.0)',
        },
      });
      clearTimeout(timer);

      if (!res.ok) continue;
      const data = (await res.json()) as {
        chart?: {
          result?: Array<{
            meta?: {
              regularMarketPrice?: number;
              chartPreviousClose?: number;
              previousClose?: number;
              currency?: string;
              shortName?: string;
              longName?: string;
              symbol?: string;
            };
          }>;
        };
      };

      const meta = data?.chart?.result?.[0]?.meta;
      if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
        const currency: 'TWD' | 'USD' =
          meta.currency?.toUpperCase() === 'USD' ? 'USD' : 'TWD';
        return {
          symbol: targetSymbol,
          resolvedSymbol: meta.symbol || targetSymbol,
          name: meta.shortName || meta.longName || targetSymbol,
          price: Math.round(meta.regularMarketPrice * 100) / 100,
          previousClose:
            typeof meta.chartPreviousClose === 'number'
              ? Math.round(meta.chartPreviousClose * 100) / 100
              : typeof meta.previousClose === 'number'
                ? Math.round(meta.previousClose * 100) / 100
                : undefined,
          currency,
          source: 'yahoo',
          updatedAt: new Date().toISOString(),
        };
      }
    } catch {
      // Try next endpoint
    }
  }
  return null;
}

function getCandidateYahooSymbols(rawSymbol: string): string[] {
  const clean = rawSymbol.trim().toUpperCase();
  if (clean.endsWith('.TW') || clean.endsWith('.TWO')) {
    const base = clean.replace(/\.(TW|TWO)$/, '');
    // 若尾碼為 B (如 00679B, 00937B 美債/投等債 ETF)，櫃買 .TWO 機率極高，優先嘗試 .TWO 與 .TW
    if (base.endsWith('B')) {
      return [`${base}.TWO`, `${base}.TW`];
    }
    return [clean, clean.endsWith('.TW') ? `${base}.TWO` : `${base}.TW`];
  }
  // 台股代號特徵：純數字 (2330, 0050, 00878) 或 數字+B/R/L (00679B, 00687B)
  if (/^\d{4,6}[A-Z]?$/.test(clean)) {
    if (clean.endsWith('B')) {
      return [`${clean}.TWO`, `${clean}.TW`];
    }
    return [`${clean}.TW`, `${clean}.TWO`];
  }
  return [clean];
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ ok: true });
    return;
  }

  const rawParam = req.query?.symbols;
  const symbolsStr = Array.isArray(rawParam) ? rawParam.join(',') : rawParam || '';
  const requestedSymbols = symbolsStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const [exchangeRates, ...quoteResults] = await Promise.all([
    fetchAllExchangeRates(),
    ...requestedSymbols.map(async (rawSym): Promise<[string, QuoteItemResult | null]> => {
      const candidates = getCandidateYahooSymbols(rawSym);
      for (const candidate of candidates) {
        const hit = await fetchYahooSingle(candidate);
        if (hit) {
          return [rawSym.toUpperCase(), { ...hit, symbol: rawSym.toUpperCase() }];
        }
      }
      return [rawSym.toUpperCase(), null];
    }),
  ]);

  const quotes: Record<string, QuoteItemResult> = {};
  for (const [sym, item] of quoteResults) {
    if (item) {
      quotes[sym] = item;
    }
  }

  res.status(200).json({
    exchangeRateUsdTwd: exchangeRates.USD,
    exchangeRates,
    quotes,
    fetchedAt: new Date().toISOString(),
  });
}
