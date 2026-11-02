import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';

/**
 * 本地開發環境專用的免費多源報價 Middleware (/api/quotes)
 * 與 Vercel Serverless Function (api/quotes.ts) 行為一致，支援 .TW / .TWO / 美股 / 免費匯率
 */
function freeQuoteApiDevPlugin(): Plugin {
  return {
    name: 'free-quote-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/quotes', async (req, res) => {
        try {
          const urlObj = new URL(req.url || '', 'http://localhost');
          const symbolsParam = urlObj.searchParams.get('symbols') || '';
          const requestedSymbols = symbolsParam
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

          // 1. 取得免費即時匯率 (USD, JPY, CNY, KRW, VND -> TWD)
          let exchangeRates = {
            USD: 32.25,
            JPY: 0.215,
            CNY: 4.45,
            KRW: 0.0235,
            VND: 0.00128,
            TWD: 1,
            updatedAt: new Date().toISOString(),
          };

          try {
            const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
            if (rateRes.ok) {
              const rateData = (await rateRes.json()) as { rates?: Record<string, number> };
              const r = rateData?.rates;
              if (r && typeof r.TWD === 'number') {
                const twd = r.TWD;
                exchangeRates = {
                  USD: Math.round(twd * 100) / 100,
                  JPY: r.JPY ? Math.round((twd / r.JPY) * 10000) / 10000 : exchangeRates.JPY,
                  CNY: r.CNY ? Math.round((twd / r.CNY) * 1000) / 1000 : exchangeRates.CNY,
                  KRW: r.KRW ? Math.round((twd / r.KRW) * 10000) / 10000 : exchangeRates.KRW,
                  VND: r.VND ? Math.round((twd / r.VND) * 100000) / 100000 : exchangeRates.VND,
                  TWD: 1,
                  updatedAt: new Date().toISOString(),
                };
              }
            }
          } catch {
            // keep default
          }

          // 2. 分流台股代碼與其他海外/指數代碼
          const fugleApiKey = urlObj.searchParams.get('fugleApiKey') || process.env.FUGLE_API_KEY || '';
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

          const quotes: Record<string, unknown> = {};
          const twCodesArray = Array.from(twCodesToFetch);

          // 2.5 若有富果金鑰，優先查詢富果官方開放行情
          if (fugleApiKey && twCodesArray.length > 0) {
            await Promise.all(
              twCodesArray.map(async (code) => {
                try {
                  const fRes = await fetch(
                    `https://api.fugle.tw/market/v1.0/stock/intraday/quote/${encodeURIComponent(code)}`,
                    {
                      headers: { 'X-API-KEY': fugleApiKey },
                    }
                  );
                  if (!fRes.ok) return;
                  const fData = (await fRes.json()) as {
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
                  if (fData && typeof fData.closePrice === 'number' && fData.closePrice > 0) {
                    const price = fData.closePrice;
                    const prevClose = fData.previousClose;
                    const dailyChangePct =
                      typeof fData.changePercent === 'number'
                        ? fData.changePercent
                        : prevClose && prevClose > 0
                          ? Math.round(((price - prevClose) / prevClose) * 10000) / 100
                          : undefined;

                    const entry = {
                      symbol: code,
                      resolvedSymbol: `${code}.TW`,
                      name: fData.name || code,
                      price: Math.round(price * 100) / 100,
                      previousClose: prevClose !== undefined ? Math.round(prevClose * 100) / 100 : undefined,
                      dailyChangePct,
                      open: fData.openPrice !== undefined ? Math.round(fData.openPrice * 100) / 100 : undefined,
                      high: fData.highPrice !== undefined ? Math.round(fData.highPrice * 100) / 100 : undefined,
                      low: fData.lowPrice !== undefined ? Math.round(fData.lowPrice * 100) / 100 : undefined,
                      volumeLots: fData.total?.unit,
                      currency: 'TWD',
                      source: 'twse',
                      updatedAt: fData.updatedAt || new Date().toISOString(),
                    };
                    quotes[code] = entry;
                    quotes[`${code}.TW`] = entry;
                    quotes[`${code}.TWO`] = entry;
                  }
                } catch {
                  // fallback
                }
              })
            );
          }

          // 3. 查詢 TWSE MIS 官方盤中即時報價 (針對尚未被富果命中的台股代碼)
          const remainingTwCodes = twCodesArray.filter((code) => !quotes[code]);
          if (remainingTwCodes.length > 0) {
            const chunkSize = 30;
            const chunks: string[][] = [];
            for (let i = 0; i < remainingTwCodes.length; i += chunkSize) {
              chunks.push(remainingTwCodes.slice(i, i + chunkSize));
            }

            await Promise.all(
              chunks.map(async (chunk) => {
                const exChParam = chunk.flatMap((code) => [`tse_${code}.tw`, `otc_${code}.tw`]).join('|');
                const misUrl = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(exChParam)}&json=1&delay=0`;
                try {
                  const misRes = await fetch(misUrl, {
                    headers: {
                      'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    },
                  });
                  if (!misRes.ok) return;
                  const misData = (await misRes.json()) as {
                    msgArray?: Array<{
                      c?: string;
                      n?: string;
                      nf?: string;
                      z?: string;
                      y?: string;
                      o?: string;
                      h?: string;
                      l?: string;
                      v?: string;
                      t?: string;
                      d?: string;
                      b?: string;
                      a?: string;
                      ex?: string;
                      trade?: { z?: string };
                    }>;
                  };
                  if (!misData?.msgArray) return;

                  for (const item of misData.msgArray) {
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
                      } else if (!isNaN(bestBid) && bestBid > 0) price = bestBid;
                      else if (!isNaN(bestAsk) && bestAsk > 0) price = bestAsk;
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
                    const dailyChangePct =
                      prevClose && prevClose > 0
                        ? Math.round(((price - prevClose) / prevClose) * 10000) / 100
                        : undefined;
                    const isOtc = item.ex?.toLowerCase() === 'otc';
                    const resolvedSymbol = `${code}.${isOtc ? 'TWO' : 'TW'}`;

                    let updatedAt = new Date().toISOString();
                    if (item.d && item.t) {
                      updatedAt = `${item.d.slice(0, 4)}-${item.d.slice(4, 6)}-${item.d.slice(6, 8)}T${item.t}.000+08:00`;
                    }

                    const entry = {
                      symbol: code,
                      resolvedSymbol,
                      name: item.n || item.nf || code,
                      price: Math.round(price * 100) / 100,
                      previousClose: prevClose !== undefined ? Math.round(prevClose * 100) / 100 : undefined,
                      dailyChangePct,
                      open: item.o && item.o !== '-' ? parseFloat(item.o) : undefined,
                      high: item.h && item.h !== '-' ? parseFloat(item.h) : undefined,
                      low: item.l && item.l !== '-' ? parseFloat(item.l) : undefined,
                      volumeLots: item.v && item.v !== '-' ? parseInt(item.v, 10) : undefined,
                      currency: 'TWD',
                      source: isOtc ? 'tpex' : 'twse',
                      updatedAt,
                    };

                    quotes[code] = entry;
                    quotes[`${code}.TW`] = { ...entry, symbol: `${code}.TW` };
                    quotes[`${code}.TWO`] = { ...entry, symbol: `${code}.TWO` };
                  }
                } catch {
                  // fallback
                }
              })
            );
          }

          // 4. 未被 TWSE MIS 命中的標的 (美股、全球 ETF、或台股備援)，由 Yahoo Finance 查詢
          const unresolvedSymbols = requestedSymbols.filter((sym) => {
            const upper = sym.toUpperCase();
            const clean = upper.replace(/\.(TW|TWO)$/i, '');
            return !quotes[upper] && !quotes[clean];
          });

          await Promise.all(
            unresolvedSymbols.map(async (rawSym) => {
              const clean = rawSym.toUpperCase();
              const base = clean.replace(/\.(TW|TWO)$/, '');
              const candidates =
                /^\d{4,6}[A-Z]?$/.test(base)
                  ? base.endsWith('B')
                    ? [`${base}.TWO`, `${base}.TW`]
                    : [`${base}.TW`, `${base}.TWO`]
                  : [clean];

              for (const candidate of candidates) {
                try {
                  const yRes = await fetch(
                    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(candidate)}?interval=1m&range=1d`,
                    {
                      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                    }
                  );
                  if (!yRes.ok) continue;
                  const yData = (await yRes.json()) as {
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
                  const meta = yData?.chart?.result?.[0]?.meta;
                  if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
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

                    const entry = {
                      symbol: clean,
                      resolvedSymbol: meta.symbol || candidate,
                      name: meta.shortName || meta.longName || clean,
                      price,
                      previousClose: prevClose,
                      dailyChangePct,
                      high: meta.regularMarketDayHigh ? Math.round(meta.regularMarketDayHigh * 100) / 100 : undefined,
                      low: meta.regularMarketDayLow ? Math.round(meta.regularMarketDayLow * 100) / 100 : undefined,
                      volumeLots: meta.regularMarketVolume ? Math.round(meta.regularMarketVolume / 1000) : undefined,
                      currency: meta.currency?.toUpperCase() === 'USD' ? 'USD' : 'TWD',
                      source: 'yahoo',
                      updatedAt: meta.regularMarketTime
                        ? new Date(meta.regularMarketTime * 1000).toISOString()
                        : new Date().toISOString(),
                    };
                    quotes[clean] = entry;
                    quotes[base] = entry;
                    break;
                  }
                } catch {
                  // next candidate
                }
              }
            })
          );

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
          res.end(
            JSON.stringify({
              exchangeRateUsdTwd: exchangeRates.USD,
              exchangeRates,
              quotes,
              fetchedAt: new Date().toISOString(),
            })
          );
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
        }
      });

      // 支援本地轉發 FinMind API (/api/finmind)
      server.middlewares.use('/api/finmind', async (req, res) => {
        try {
          const urlObj = new URL(req.url || '', 'http://localhost');
          const targetUrl = `https://api.finmindtrade.com/api/v4/data${urlObj.search}`;
          const upstream = await fetch(targetUrl, {
            headers: { 'User-Agent': 'FinanceLifePWA/1.0 (DevProxy)' },
          });
          const json = await upstream.json();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(json));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 500, error: String(err), data: [] }));
        }
      });

      // 支援本地轉發即時財經新聞 (/api/news)
      server.middlewares.use('/api/news', async (req, res) => {
        try {
          const urlObj = new URL(req.url || '', 'http://localhost');
          const q = urlObj.searchParams.get('q') || '台股';
          const targetUrl = `https://tw.stock.yahoo.com/rss?s=${encodeURIComponent(q)}`;
          const upstream = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh)' },
          });
          const xmlText = await upstream.text();
          const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
          const items: Array<{ title: string; link: string; pubDate: string; description: string; source: string }> = [];
          let match: RegExpExecArray | null;
          while ((match = itemRegex.exec(xmlText)) !== null) {
            const block = match[1];
            const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(block);
            const linkMatch = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i.exec(block);
            const pubDateMatch = /<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i.exec(block);
            const descMatch = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i.exec(block);
            const title = titleMatch ? titleMatch[1].trim() : '';
            if (title) {
              items.push({
                title,
                link: linkMatch ? linkMatch[1].trim() : '',
                pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
                description: descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '',
                source: 'Yahoo 奇摩股市',
              });
            }
            if (items.length >= 8) break;
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 200, items }));
        } catch (err) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 200, items: [] }));
        }
      });

      // 支援本地轉發 Google Gemini AI 分析 (/api/ai-analyze)
      server.middlewares.use('/api/ai-analyze', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            const key =
              parsed.userApiKey ||
              process.env.GEMINI_API_KEY ||
              process.env.VITE_GEMINI_API_KEY ||
              '';

            const isBearishTrend = parsed.trendBias === 'STRONG_BEAR' || parsed.trendBias === 'WEAK_BEAR';
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${key}`;
            const prompt = `你現在是台灣頂尖證券自營部或避險基金的「首席量化操盤手」，專精結合均線位階、法人籌碼、基本面相對估值與 ATR 波動率進行紀律交易。
請針對以下個股量化數據與市場情報，進行深度、直率、無廢話的「實戰操盤決策分析」：
標的：${parsed.stockId || ''} ${parsed.stockName || ''}，現價 NT$ ${parsed.price || ''} (${parsed.changePct || 0}%)
【量化多空判定與技術籌碼位階】
- 量化多空定調：${parsed.trendLabel || '區間震盪整理'} (多空力道指數: ${parsed.trendScore || 50} / 100，型態評級: ${parsed.trendBias || 'CONSOLIDATION'})
- 趨勢特徵診斷：${parsed.trendSummary || '均線與籌碼進入關鍵抉擇期'}
- 量化操作指引：${parsed.actionAdvice || '依照點位紀律操作'}
【長·中·短三期量化評估與共振判定】
- 三期對齊共振：${parsed.horizons?.alignmentLabel || '長中短多空分歧'}
- 短期 (1~10日極短線)：${parsed.horizons?.shortTerm?.biasLabel || '短線整理'} (關注點位: ${parsed.horizons?.shortTerm?.focusLevel || '支撐/壓力'})
- 中期 (1~3個月波段)：${parsed.horizons?.mediumTerm?.biasLabel || '波段整理'} (波段目標: ${parsed.horizons?.mediumTerm?.focusLevel || '季線/TP2'})
- 長期 (半年~1年價值)：${parsed.horizons?.longTerm?.biasLabel || '價值觀察'} (長線目標: ${parsed.horizons?.longTerm?.focusLevel || '年線/TP3'})
【交易關鍵價位】
${
  isBearishTrend
    ? `- 上方反壓防線 (SL, 反彈減碼點)：NT$ ${parsed.ladder?.slPrice || 'N/A'}
- 下檔初步支撐測試 (TP1)：NT$ ${parsed.ladder?.tp1Price || 'N/A'}
- 空方波段滿足價 (TP2)：NT$ ${parsed.ladder?.tp2Price || 'N/A'}
- 極端破底目標價 (TP3)：NT$ ${parsed.ladder?.tp3Price || 'N/A'}`
    : `- 停損防守價 (SL, 2×ATR)：NT$ ${parsed.ladder?.slPrice || 'N/A'}
- 保本止盈價 1 (TP1, 折價收斂50%減碼保本)：NT$ ${parsed.ladder?.tp1Price || 'N/A'}
- 基本面目標價 (TP2, 同業中位數合理價)：NT$ ${parsed.ladder?.tp2Price || 'N/A'}
- 趨勢延伸價 3 (TP3, 龍頭估值溢價/移動停利)：NT$ ${parsed.ladder?.tp3Price || 'N/A'}`
}
同業估值：${parsed.valuation?.statusLabel || parsed.valuation?.status || ''} (折溢價 ${parsed.valuation?.discountPremiumPct || 0}%)，同業中位數 PE: ${parsed.valuation?.peerMedianPe || 'N/A'}
基本面：ROE ${parsed.fundamental?.roeRating || ''}，毛利護城河 ${parsed.fundamental?.marginMoat || ''}
重大新聞摘要：${(parsed.news || []).slice(0, 3).map((n: any) => n.title).join(' / ') || '維持常態'}

請分四大段：
1. 【多空定調與核心結論】：明確依據量化多空判定（${parsed.trendLabel || '區間震盪'}，指數 ${parsed.trendScore || 50}/100）。若為「弱勢偏空」或「空頭破線」，必須嚴正定調為防守/避險/出清，嚴禁盲目喊多或粉飾太平！
2. 【操盤手深度思路與攻防節奏】：分析主力與法人買賣心態。若偏多，分析 SL 防守與 TP1/TP2 攻防；若偏空或破線，分析上方反壓解套點、下檔支撐破底危機與持股減碼時機。
3. 【同業折溢價與基本面質化觀點】
4. 【黑天鵝風險與避坑叮嚀】
語氣務必乾脆專業，無廢話。`;

            const gRes = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1200 },
              }),
            });

            if (!gRes.ok) {
              const errBody = await gRes.text();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, fallback: true, error: errBody }));
              return;
            }

            const data = (await gRes.json()) as any;
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, model: 'gemini-3.5-flash-lite', rawText: text }));
          } catch (e: any) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, fallback: true, error: e?.message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    freeQuoteApiDevPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'FinanceLife 金庫與生活管家',
        short_name: 'FinanceLife',
        description: '全方位個人記帳、分期、借放款、股票基金債券自動計價、智能選股與汽車保養/保單/回診行事曆 PWA',
        theme_color: '#1E3A8A',
        background_color: '#F6F7F9',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
});
