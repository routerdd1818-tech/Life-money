/**
 * 100% 免費、免金鑰 (Zero-Key) 全球與全台股即時多源金融報價 API
 * 三重即時引擎：
 * 1. 富果 Fugle 官方開放行情 API (若有提供金鑰優先啟用官方專線)
 * 2. 台灣證券交易所 TWSE & 櫃買中心 TPEx 官方即時盤中 MIS API (mis.twse.com.tw)
 *    - 涵蓋上市、上櫃、興櫃、ETF、債券 ETF，秒級盤中撮合成交價、昨收價、即時漲跌、高低價與成交量
 * 3. Yahoo Finance v8 Open API (query1/query2.finance.yahoo.com)
 *    - 涵蓋美股、ADR、全球指數、海外 ETF、境內外基金與備援
 * 4. open.er-api.com 即時匯率 (USD -> TWD 等 6 大貨幣)
 */

interface QuoteItemResult {
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
  source: 'twse' | 'tpex' | 'yahoo' | 'fallback';
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

interface TwseMisMsgItem {
  c?: string; // 股票代號 (例: "2330")
  n?: string; // 股票名稱 (例: "台積電")
  nf?: string; // 全名
  z?: string; // 最近撮合成交價 (若未成交為 "-")
  y?: string; // 昨收價
  o?: string; // 開盤價
  h?: string; // 最高價
  l?: string; // 最低價
  v?: string; // 累積成交量 (張數)
  t?: string; // 成交時間 (例: "09:30:15")
  d?: string; // 交易日期 (例: "20261102")
  b?: string; // 買進五檔
  a?: string; // 賣出五檔
  ex?: string; // "tse" 或 "otc"
  trade?: {
    z?: string;
    v?: number;
    t?: string;
  };
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
    // fallback
  }

  return defaultRates;
}

/**
 * 查詢富果 Fugle 官方開放行情 API (若有提供 API Key)
 */
async function fetchFugleBatch(stockCodes: string[], apiKey: string): Promise<Record<string, QuoteItemResult>> {
  if (!apiKey || stockCodes.length === 0) return {};
  const results: Record<string, QuoteItemResult> = {};

  await Promise.all(
    stockCodes.map(async (code) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`https://api.fugle.tw/market/v1.0/stock/intraday/quote/${encodeURIComponent(code)}`, {
          signal: controller.signal,
          headers: { 'X-API-KEY': apiKey },
        });
        clearTimeout(timer);

        if (!res.ok) return;
        const data = (await res.json()) as {
          symbol?: string;
          name?: string;
          closePrice?: number;
          previousClose?: number;
          changePercent?: number;
          openPrice?: number;
          highPrice?: number;
          lowPrice?: number;
          total?: { unit?: number };
          updatedAt?: string;
        };

        if (data && typeof data.closePrice === 'number' && data.closePrice > 0) {
          const price = data.closePrice;
          const prevClose = data.previousClose;
          const dailyChangePct =
            typeof data.changePercent === 'number'
              ? data.changePercent
              : prevClose && prevClose > 0
                ? Math.round(((price - prevClose) / prevClose) * 10000) / 100
                : undefined;

          const entry: QuoteItemResult = {
            symbol: code,
            resolvedSymbol: `${code}.TW`,
            name: data.name || code,
            price: Math.round(price * 100) / 100,
            previousClose: prevClose !== undefined ? Math.round(prevClose * 100) / 100 : undefined,
            dailyChangePct,
            open: data.openPrice !== undefined ? Math.round(data.openPrice * 100) / 100 : undefined,
            high: data.highPrice !== undefined ? Math.round(data.highPrice * 100) / 100 : undefined,
            low: data.lowPrice !== undefined ? Math.round(data.lowPrice * 100) / 100 : undefined,
            volumeLots: data.total?.unit,
            currency: 'TWD',
            source: 'twse',
            updatedAt: data.updatedAt || new Date().toISOString(),
          };

          results[code] = entry;
          results[`${code}.TW`] = { ...entry, symbol: `${code}.TW` };
          results[`${code}.TWO`] = { ...entry, symbol: `${code}.TWO` };
        }
      } catch {
        // fallback
      }
    })
  );

  return results;
}

/**
 * 批次向 TWSE MIS 官方端點查詢台股即時盤中報價
 */
async function fetchTwseMisBatch(stockCodes: string[]): Promise<Record<string, QuoteItemResult>> {
  if (stockCodes.length === 0) return {};
  const results: Record<string, QuoteItemResult> = {};

  const chunkSize = 30;
  const chunks: string[][] = [];
  for (let i = 0; i < stockCodes.length; i += chunkSize) {
    chunks.push(stockCodes.slice(i, i + chunkSize));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const exChList: string[] = [];
      for (const code of chunk) {
        exChList.push(`tse_${code}.tw`, `otc_${code}.tw`);
      }
      const exChParam = exChList.join('|');
      const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(exChParam)}&json=1&delay=0`;

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'application/json, text/javascript, */*; q=0.01',
          },
        });
        clearTimeout(timer);

        if (!res.ok) return;
        const data = (await res.json()) as { msgArray?: TwseMisMsgItem[] };
        if (!data || !Array.isArray(data.msgArray)) return;

        for (const item of data.msgArray) {
          const code = item.c?.trim().toUpperCase();
          if (!code) continue;

          let price: number | null = null;
          if (item.z && item.z !== '-') {
            const parsed = parseFloat(item.z);
            if (!isNaN(parsed) && parsed > 0) price = parsed;
          }
          if (price === null && item.trade?.z && item.trade.z !== '-') {
            const parsed = parseFloat(item.trade.z);
            if (!isNaN(parsed) && parsed > 0) price = parsed;
          }
          if (price === null) {
            const bestBid = item.b ? parseFloat(item.b.split('_')[0]) : NaN;
            const bestAsk = item.a ? parseFloat(item.a.split('_')[0]) : NaN;
            if (!isNaN(bestBid) && !isNaN(bestAsk) && bestBid > 0 && bestAsk > 0) {
              price = Math.round(((bestBid + bestAsk) / 2) * 100) / 100;
            } else if (!isNaN(bestBid) && bestBid > 0) {
              price = bestBid;
            } else if (!isNaN(bestAsk) && bestAsk > 0) {
              price = bestAsk;
            }
          }
          if (price === null && item.o && item.o !== '-') {
            const parsed = parseFloat(item.o);
            if (!isNaN(parsed) && parsed > 0) price = parsed;
          }
          if (price === null && item.y && item.y !== '-') {
            const parsed = parseFloat(item.y);
            if (!isNaN(parsed) && parsed > 0) price = parsed;
          }

          if (price === null || price <= 0) continue;

          const prevClose = item.y && item.y !== '-' ? parseFloat(item.y) : undefined;
          const open = item.o && item.o !== '-' ? parseFloat(item.o) : undefined;
          const high = item.h && item.h !== '-' ? parseFloat(item.h) : undefined;
          const low = item.l && item.l !== '-' ? parseFloat(item.l) : undefined;
          const volumeLots = item.v && item.v !== '-' ? parseInt(item.v, 10) : undefined;

          let dailyChangePct: number | undefined;
          if (prevClose && prevClose > 0) {
            dailyChangePct = Math.round(((price - prevClose) / prevClose) * 10000) / 100;
          }

          const isOtc = item.ex?.toLowerCase() === 'otc';
          const source: 'twse' | 'tpex' = isOtc ? 'tpex' : 'twse';
          const resolvedSymbol = `${code}.${isOtc ? 'TWO' : 'TW'}`;
          const name = item.n || item.nf || code;

          let updatedAt = new Date().toISOString();
          if (item.d && item.t) {
            const y = item.d.slice(0, 4);
            const m = item.d.slice(4, 6);
            const d = item.d.slice(6, 8);
            updatedAt = `${y}-${m}-${d}T${item.t}.000+08:00`;
          }

          const entry: QuoteItemResult = {
            symbol: code,
            resolvedSymbol,
            name,
            price: Math.round(price * 100) / 100,
            previousClose: prevClose !== undefined ? Math.round(prevClose * 100) / 100 : undefined,
            dailyChangePct,
            open: open !== undefined ? Math.round(open * 100) / 100 : undefined,
            high: high !== undefined ? Math.round(high * 100) / 100 : undefined,
            low: low !== undefined ? Math.round(low * 100) / 100 : undefined,
            volumeLots,
            currency: 'TWD',
            source,
            updatedAt,
          };

          results[code] = entry;
          results[`${code}.TW`] = { ...entry, symbol: `${code}.TW` };
          results[`${code}.TWO`] = { ...entry, symbol: `${code}.TWO` };
        }
      } catch {
        // fallback
      }
    })
  );

  return results;
}

/**
 * 查詢 Yahoo Finance 即時盤中 v8 chart/quote (美股、全球 ETF、台股備援)
 */
async function fetchYahooSingle(targetSymbol: string): Promise<QuoteItemResult | null> {
  const endpoints = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetSymbol)}?interval=1m&range=1d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetSymbol)}?interval=1m&range=1d`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetSymbol)}?interval=1d&range=5d`,
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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
              regularMarketDayHigh?: number;
              regularMarketDayLow?: number;
              regularMarketVolume?: number;
              currency?: string;
              shortName?: string;
              longName?: string;
              symbol?: string;
              regularMarketTime?: number;
            };
          }>;
        };
      };

      const meta = data?.chart?.result?.[0]?.meta;
      if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
        const currency: 'TWD' | 'USD' =
          meta.currency?.toUpperCase() === 'USD' ? 'USD' : 'TWD';
        const price = Math.round(meta.regularMarketPrice * 100) / 100;
        const prevClose =
          typeof meta.chartPreviousClose === 'number' && meta.chartPreviousClose > 0
            ? Math.round(meta.chartPreviousClose * 100) / 100
            : typeof meta.previousClose === 'number' && meta.previousClose > 0
              ? Math.round(meta.previousClose * 100) / 100
              : undefined;

        let dailyChangePct: number | undefined;
        if (prevClose && prevClose > 0) {
          dailyChangePct = Math.round(((price - prevClose) / prevClose) * 10000) / 100;
        }

        const updatedAt = meta.regularMarketTime
          ? new Date(meta.regularMarketTime * 1000).toISOString()
          : new Date().toISOString();

        return {
          symbol: targetSymbol,
          resolvedSymbol: meta.symbol || targetSymbol,
          name: meta.shortName || meta.longName || targetSymbol,
          price,
          previousClose: prevClose,
          dailyChangePct,
          high: meta.regularMarketDayHigh ? Math.round(meta.regularMarketDayHigh * 100) / 100 : undefined,
          low: meta.regularMarketDayLow ? Math.round(meta.regularMarketDayLow * 100) / 100 : undefined,
          volumeLots: meta.regularMarketVolume ? Math.round(meta.regularMarketVolume / 1000) : undefined,
          currency,
          source: 'yahoo',
          updatedAt,
        };
      }
    } catch {
      // try next
    }
  }
  return null;
}

function getCandidateYahooSymbols(rawSymbol: string): string[] {
  const clean = rawSymbol.trim().toUpperCase();
  if (clean.endsWith('.TW') || clean.endsWith('.TWO')) {
    const base = clean.replace(/\.(TW|TWO)$/, '');
    if (base.endsWith('B')) {
      return [`${base}.TWO`, `${base}.TW`];
    }
    return [clean, clean.endsWith('.TW') ? `${base}.TWO` : `${base}.TW`];
  }
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
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

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

  const fugleApiKey =
    (typeof req.query?.fugleApiKey === 'string' && req.query.fugleApiKey.trim()) ||
    process.env.FUGLE_API_KEY ||
    '';

  // 1. 分流台股代碼與其他海外/指數代碼
  const twCodesToFetch = new Set<string>();
  const foreignSymbols: string[] = [];

  for (const rawSym of requestedSymbols) {
    const clean = rawSym.toUpperCase().replace(/\.(TW|TWO)$/i, '');
    if (/^\d{4,6}[A-Z]?$/.test(clean)) {
      twCodesToFetch.add(clean);
    } else {
      foreignSymbols.push(rawSym);
    }
  }

  // 2. 若提供富果金鑰，優先查詢富果官方行情
  let fugleMap: Record<string, QuoteItemResult> = {};
  if (fugleApiKey && twCodesToFetch.size > 0) {
    fugleMap = await fetchFugleBatch(Array.from(twCodesToFetch), fugleApiKey);
  }

  // 3. 尚未被富果命中的台股代碼，交由 TWSE MIS 官方介面查詢
  const twCodesForMis = Array.from(twCodesToFetch).filter((code) => !fugleMap[code]);

  const [exchangeRates, twseMisMap] = await Promise.all([
    fetchAllExchangeRates(),
    fetchTwseMisBatch(twCodesForMis),
  ]);

  const quotes: Record<string, QuoteItemResult> = { ...fugleMap, ...twseMisMap };

  // 4. 檢查哪些請求尚未被命中 (美股、全球 ETF、或未收錄標的)，由 Yahoo Finance 接手補足
  const unresolvedSymbols: string[] = [];
  for (const rawSym of requestedSymbols) {
    const upper = rawSym.toUpperCase();
    const clean = upper.replace(/\.(TW|TWO)$/i, '');
    if (!quotes[upper] && !quotes[clean]) {
      unresolvedSymbols.push(rawSym);
    }
  }

  if (unresolvedSymbols.length > 0) {
    const yahooResults = await Promise.all(
      unresolvedSymbols.map(async (rawSym): Promise<[string, QuoteItemResult | null]> => {
        const candidates = getCandidateYahooSymbols(rawSym);
        for (const candidate of candidates) {
          const hit = await fetchYahooSingle(candidate);
          if (hit) {
            return [rawSym.toUpperCase(), { ...hit, symbol: rawSym.toUpperCase() }];
          }
        }
        return [rawSym.toUpperCase(), null];
      })
    );

    for (const [sym, item] of yahooResults) {
      if (item) {
        quotes[sym] = item;
        const clean = sym.replace(/\.(TW|TWO)$/i, '');
        quotes[clean] = item;
      }
    }
  }

  res.status(200).json({
    exchangeRateUsdTwd: exchangeRates.USD,
    exchangeRates,
    quotes,
    fetchedAt: new Date().toISOString(),
  });
}
