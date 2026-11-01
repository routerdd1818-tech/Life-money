/**
 * FinMind 官方金融 API 專用 Vercel Serverless 反向代理
 * 支援轉發 TaiwanStockPrice, TaiwanStockInstitutionalInvestorsBuySell, TaiwanStockMonthRevenue
 * 自動附加 CORS 標頭與 Edge Caching，避免前端跨域限制
 */

interface VercelRequestLike {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface VercelResponseLike {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponseLike;
  json: (body: unknown) => void;
}

const DEFAULT_FINMIND_TOKEN =
  process.env.FINMIND_API_TOKEN ||
  process.env.VITE_FINMIND_TOKEN ||
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoidGFuZzkyMTExOCIsImVtYWlsIjoidGFuZ2doZ2hAZ21haWwuY29tIiwidG9rZW5fdmVyc2lvbiI6MH0.eV8XmNzmgJGDp2azc5NoX8jgg1PYQNdbn9Cc9CecpH0';

export default async function handler(req: VercelRequestLike, res: VercelResponseLike): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ ok: true });
    return;
  }

  const query = req.query || {};
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, v));
      } else {
        searchParams.set(key, value);
      }
    }
  }

  // 若前端未附帶 token，後端代理自動附加預設已授權 Token 享受 600 次/小時配額
  if (!searchParams.has('token') && DEFAULT_FINMIND_TOKEN) {
    searchParams.set('token', DEFAULT_FINMIND_TOKEN.trim());
  }

  const targetUrl = `https://api.finmindtrade.com/api/v4/data?${searchParams.toString()}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const apiRes = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FinanceLifePWA/1.0 (FinMind-Proxy)',
      },
    });
    clearTimeout(timer);

    if (!apiRes.ok) {
      res.status(apiRes.status).json({
        status: apiRes.status,
        msg: `FinMind upstream error: ${apiRes.statusText}`,
        data: [],
      });
      return;
    }

    const json = await apiRes.json();
    res.status(200).json(json);
  } catch (err) {
    res.status(500).json({
      status: 500,
      msg: `FinMind proxy fetch failed: ${String(err)}`,
      data: [],
    });
  }
}
