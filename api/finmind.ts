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
