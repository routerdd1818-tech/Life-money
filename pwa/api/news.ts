/**
 * 個股即時新聞反向代理 (Vercel Serverless Function)
 * 支援透過 Yahoo Finance 台灣財經新聞 RSS 取得個股即時新聞
 * 自動處理 CORS 與 Edge Cache
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
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ ok: true });
    return;
  }

  const query = req.query || {};
  const q = (Array.isArray(query.q) ? query.q[0] : query.q) || '台股';

  // 查詢 Yahoo 奇摩股市 / 財經新聞 RSS
  const encodedQuery = encodeURIComponent(q);
  const targetUrl = `https://tw.stock.yahoo.com/rss?s=${encodedQuery}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const apiRes = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
        Accept: 'application/rss+xml, text/xml, */*',
      },
    });
    clearTimeout(timer);

    if (!apiRes.ok) {
      res.status(200).json({ status: 200, items: [] });
      return;
    }

    const xmlText = await apiRes.text();

    // 簡易 XML 解析 item 標籤
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items: Array<{
      title: string;
      link: string;
      pubDate: string;
      description: string;
      source: string;
    }> = [];

    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const block = match[1];
      const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(block);
      const linkMatch = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i.exec(block);
      const pubDateMatch = /<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i.exec(block);
      const descMatch = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i.exec(block);

      const title = titleMatch ? titleMatch[1].trim() : '';
      const link = linkMatch ? linkMatch[1].trim() : '';
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
      const description = descMatch
        ? descMatch[1].replace(/<[^>]+>/g, '').trim()
        : '';

      if (title) {
        items.push({
          title,
          link,
          pubDate,
          description,
          source: 'Yahoo 奇摩股市',
        });
      }
      if (items.length >= 10) break;
    }

    res.status(200).json({ status: 200, items });
  } catch (err) {
    res.status(200).json({ status: 200, items: [] });
  }
}
