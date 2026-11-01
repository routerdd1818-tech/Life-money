/**
 * Google Gemini 3.5 旗艦大語言模型個股深度決策分析端點 (Vercel Serverless Function)
 * 接收個股技術指標、ATR 風控階梯、同業估值與重大新聞，由 Gemini 3.5 Flash-Lite 產出深度操盤手分析
 */

interface VercelRequestLike {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

interface VercelResponseLike {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponseLike;
  json: (body: unknown) => void;
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-goog-api-key');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    let bodyData: any = req.body;
    if (typeof bodyData === 'string') {
      try {
        bodyData = JSON.parse(bodyData);
      } catch (e) {
        bodyData = {};
      }
    }

    const {
      stockId = '2330',
      stockName = '台積電',
      price = 1000,
      changePct = 0,
      trendBias = 'CONSOLIDATION',
      trendScore = 50,
      trendLabel = '區間震盪整理',
      trendSummary = '',
      actionAdvice = '',
      ladder = {},
      valuation = {},
      fundamental = {},
      peers = [],
      news = [],
      userApiKey = '',
    } = bodyData || {};

    const apiKey =
      (userApiKey && typeof userApiKey === 'string' && userApiKey.trim()) ||
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      '';

    if (!apiKey) {
      res.status(200).json({
        ok: false,
        fallback: true,
        message: '未設定 GEMINI_API_KEY，請於環境變數或設定中填入',
      });
      return;
    }

    // 格式化新聞摘要
    const newsSummary = Array.isArray(news) && news.length > 0
      ? news.slice(0, 5).map((n: any, idx: number) => `${idx + 1}. [${n.source || '媒體'}] ${n.title}`).join('\n')
      : '無近期重大即時新聞或維持既有產業脈動。';

    // 格式化同業競品
    const peersSummary = Array.isArray(peers) && peers.length > 0
      ? peers.map((p: any) => `${p.name}(${p.symbol}): PE ${p.pe || 'N/A'}x, ROE ${p.roePct || 0}%, 營收YoY ${p.revYoYPct || 0}%`).join('；')
      : '同業競品族群估值維持常態中位數。';

    const isBearishTrend = trendBias === 'STRONG_BEAR' || trendBias === 'WEAK_BEAR';

    const promptText = `你現在是台灣頂尖證券自營部或避險基金的「首席量化操盤手」，專精結合均線位階、法人籌碼、基本面相對估值與 ATR 波動率進行紀律交易。
請針對以下個股量化數據與市場情報，進行深度、直率、無廢話的「實戰操盤決策分析」：

【分析標的】
- 股票：${stockId} ${stockName}
- 當前市價：NT$ ${price} (${changePct >= 0 ? '+' : ''}${changePct}%)
- ATR(14) 波動度：${ladder.atr14 || 'N/A'} 元
- 風險報酬比 (Reward-to-Risk)：${ladder.riskRewardRatio ? ladder.riskRewardRatio + ' : 1' : 'N/A'}

【量化多空判定與技術籌碼位階】
- 量化多空定調：${trendLabel} (多空力道指數: ${trendScore} / 100，型態評級: ${trendBias})
- 趨勢特徵診斷：${trendSummary || '均線與籌碼進入關鍵抉擇期'}
- 量化操作指引：${actionAdvice || '依照點位紀律操作'}

【交易關鍵價位】
${
  isBearishTrend
    ? `- 上方反壓防線 (SL, 反彈減碼點)：NT$ ${ladder.slPrice || 'N/A'}
- 下檔初步支撐測試 (TP1)：NT$ ${ladder.tp1Price || 'N/A'}
- 空方波段滿足價 (TP2)：NT$ ${ladder.tp2Price || 'N/A'}
- 極端破底目標價 (TP3)：NT$ ${ladder.tp3Price || 'N/A'}`
    : `- 停損防守價 (SL, 2×ATR)：NT$ ${ladder.slPrice || 'N/A'}
- 保本止盈價 1 (TP1, 折價收斂50%減碼保本)：NT$ ${ladder.tp1Price || 'N/A'}
- 基本面目標價 (TP2, 同業中位數合理價)：NT$ ${ladder.tp2Price || 'N/A'}
- 趨勢延伸價 3 (TP3, 龍頭估值溢價/移動停利)：NT$ ${ladder.tp3Price || 'N/A'}`
}

【相對估值與同業現況】
- 估值狀態：${valuation.statusLabel || valuation.status || '相對合理'} (相對於同業中位數折溢價 ${valuation.discountPremiumPct || 0}%)
- 同業中位數 PE：${valuation.peerMedianPe || 'N/A'} 倍 | 估算公允價值：NT$ ${valuation.fairValueEstimate || 'N/A'}
- 同業競品現況：${peersSummary}

【基本面體質健檢】
- 體質評分：${fundamental.healthScore || 80} / 100 (評等: ${fundamental.rating || '良好'})
- 獲利護城河：${fundamental.marginMoat || 'N/A'}
- 資本效率：${fundamental.roeRating || 'N/A'}
- 優勢：${(fundamental.pros || []).join('、') || '無特別突出優勢'}
- 潛在隱憂：${(fundamental.risks || []).join('、') || '注意系統性市場波動'}

【即時市場新聞與產業情報】
${newsSummary}

---
【輸出要求】
請嚴格遵守以下四個段落架構輸出，語氣必須像資深操盤手在作晨會晨報，結論先行、段落清晰、講真話：
1. 【多空定調與核心結論】：明確依據量化多空判定（${trendLabel}，力道指數 ${trendScore}/100）。若為「弱勢偏空」或「空頭破線」，必須嚴正定調為防守/避險/出清，嚴禁盲目喊多或粉飾太平！
2. 【操盤手深度思路與攻防節奏】：分析主力與法人買賣心態。若偏多，分析 SL 防守與 TP1/TP2 攻防；若偏空或破線，分析上方反壓解套點、下檔支撐破底危機與持股減碼時機。
3. 【同業折溢價與基本面質化觀點】：剖析當前相對於同業是遭錯殺低估還是估值過高，以及基本面護城河是否支撐股價。
4. 【黑天鵝風險與避坑叮嚀】：結合近期新聞與產業景氣，點出最該防備的 1~2 個致命破線或產業風險。

請使用純繁體中文回答，不使用制式廢話。`;

    // 呼叫 Gemini 3.5 Flash-Lite (最快速且最新世代)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9500);

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: promptText }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1200,
        },
      }),
    });
    clearTimeout(timeout);

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[Gemini API Error]', geminiRes.status, errText);
      res.status(200).json({
        ok: false,
        fallback: true,
        error: `Gemini API 回應狀態 ${geminiRes.status}`,
        message: '暫時使用量化引擎生成報告',
      });
      return;
    }

    const geminiData = await geminiRes.json();
    const generatedText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!generatedText) {
      res.status(200).json({
        ok: false,
        fallback: true,
        message: 'Gemini 未返回文字',
      });
      return;
    }

    res.status(200).json({
      ok: true,
      model: 'gemini-3.5-flash-lite',
      generatedAt: new Date().toISOString(),
      rawText: generatedText,
    });
  } catch (err: any) {
    console.error('[ai-analyze handler error]', err);
    res.status(200).json({
      ok: false,
      fallback: true,
      error: err?.message || '內部連線逾時',
    });
  }
}
