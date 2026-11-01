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

          // 1. 取得免費即時匯率 USD -> TWD
          let usdTwdRate = 32.18;
          try {
            const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
            if (rateRes.ok) {
              const rateData = (await rateRes.json()) as { rates?: Record<string, number> };
              if (rateData?.rates?.TWD) {
                usdTwdRate = Math.round(rateData.rates.TWD * 100) / 100;
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
              exchangeRateUsdTwd: usdTwdRate,
              quotes,
              fetchedAt: new Date().toISOString(),
            })
          );
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
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
