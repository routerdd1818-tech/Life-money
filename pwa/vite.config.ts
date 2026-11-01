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
