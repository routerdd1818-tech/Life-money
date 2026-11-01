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

          // 2. 查詢各標的 Yahoo Finance v8 報價 (自動嘗試 .TW 與 .TWO)
          const quotes: Record<string, unknown> = {};
          await Promise.all(
            requestedSymbols.map(async (rawSym) => {
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
                    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(candidate)}?interval=1d&range=5d`,
                    {
                      headers: { 'User-Agent': 'Mozilla/5.0 (FinanceLifePWA)' },
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
                          currency?: string;
                          shortName?: string;
                          symbol?: string;
                        };
                      }>;
                    };
                  };
                  const meta = yData?.chart?.result?.[0]?.meta;
                  if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
                    quotes[clean] = {
                      symbol: clean,
                      resolvedSymbol: meta.symbol || candidate,
                      name: meta.shortName || clean,
                      price: Math.round(meta.regularMarketPrice * 100) / 100,
                      previousClose:
                        typeof meta.chartPreviousClose === 'number'
                          ? Math.round(meta.chartPreviousClose * 100) / 100
                          : meta.previousClose,
                      currency: meta.currency?.toUpperCase() === 'USD' ? 'USD' : 'TWD',
                      source: 'yahoo',
                      updatedAt: new Date().toISOString(),
                    };
                    break;
                  }
                } catch {
                  // next candidate
                }
              }
            })
          );

          res.setHeader('Content-Type', 'application/json');
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
