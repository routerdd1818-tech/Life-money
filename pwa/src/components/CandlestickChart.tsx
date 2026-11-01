import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getFinMindStockPrices, FinMindPriceRow } from '../services/finMindService';

export interface CandlestickPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradeLevelLine {
  label: string;
  price: number;
  color: string;
  lineDash?: number[];
}

interface CandlestickChartProps {
  symbol: string;
  stockName?: string;
  currentPrice?: number;
  token?: string;
  initialData?: CandlestickPoint[];
  tradeLevels?: TradeLevelLine[];
  height?: number;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  symbol,
  stockName,
  currentPrice,
  token,
  initialData,
  tradeLevels = [],
  height = 320,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [candleData, setCandleData] = useState<CandlestickPoint[]>(initialData || []);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // 1. 抓取 FinMind 真實日 K 線數據
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setCandleData(initialData);
      return;
    }

    let isMounted = true;
    const fetchKlines = async () => {
      setIsLoading(true);
      try {
        const cleanId = symbol.replace(/\.(TW|TWO)$/i, '');
        // 抓取近 90 天
        const d = new Date();
        d.setDate(d.getDate() - 110);
        const startDate = d.toISOString().slice(0, 10);

        const rows: FinMindPriceRow[] = await getFinMindStockPrices(cleanId, startDate, token);
        if (isMounted && rows && rows.length > 0) {
          const points: CandlestickPoint[] = rows.map((r) => ({
            date: r.date,
            open: r.open,
            high: r.max,
            low: r.min,
            close: r.close,
            volume: Math.round(r.Trading_Volume / 1000), // 轉成張數
          }));
          setCandleData(points);
        } else if (isMounted) {
          // 若無真實歷史資料，以 currentPrice 產生模擬走勢
          const basePrice = currentPrice || 100;
          const generated: CandlestickPoint[] = [];
          let lastClose = basePrice * 0.88;
          for (let i = 45; i >= 0; i--) {
            const dt = new Date();
            dt.setDate(dt.getDate() - i);
            const change = (Math.random() - 0.48) * (basePrice * 0.035);
            const open = lastClose;
            const close = Math.max(1, Math.round((open + change) * 10) / 10);
            const high = Math.round(Math.max(open, close) * (1 + Math.random() * 0.015) * 10) / 10;
            const low = Math.round(Math.min(open, close) * (1 - Math.random() * 0.015) * 10) / 10;
            const volume = Math.floor(800 + Math.random() * 2500);
            generated.push({
              date: dt.toISOString().slice(0, 10),
              open,
              high,
              low,
              close,
              volume,
            });
            lastClose = close;
          }
          setCandleData(generated);
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void fetchKlines();
    return () => {
      isMounted = false;
    };
  }, [symbol, currentPrice, token, initialData]);

  // 2. 計算 MA (5MA, 20MA, 60MA)
  const { ma5, ma20, ma60 } = useMemo(() => {
    const calcMa = (period: number) => {
      return candleData.map((_, idx, arr) => {
        if (idx < period - 1) return null;
        const slice = arr.slice(idx - period + 1, idx + 1);
        const sum = slice.reduce((acc, c) => acc + c.close, 0);
        return Math.round((sum / period) * 100) / 100;
      });
    };
    return {
      ma5: calcMa(5),
      ma20: calcMa(20),
      ma60: calcMa(60),
    };
  }, [candleData]);

  // 3. Canvas 繪製邏輯
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candleData.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina 螢幕清晰度校正
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // 分割畫布：上方 72% 繪製 K 線，下方 25% 繪製成交量
    const mainH = h * 0.72;
    const volH = h * 0.22;
    const volTop = h * 0.76;
    const rightMargin = 55; // 顯示價格刻度
    const leftMargin = 10;
    const plotW = w - leftMargin - rightMargin;

    // 清空背景
    ctx.clearRect(0, 0, w, h);

    // 顯示最近 45 根 K 線 (若不足則全畫)
    const displayCount = Math.min(candleData.length, 50);
    const startIndex = candleData.length - displayCount;
    const activeCandles = candleData.slice(startIndex);
    const activeMa5 = ma5.slice(startIndex);
    const activeMa20 = ma20.slice(startIndex);
    const activeMa60 = ma60.slice(startIndex);

    if (activeCandles.length === 0) return;

    // 計算價格與成交量上下界 (含水平停損停利線)
    let minPrice = Math.min(...activeCandles.map((c) => c.low));
    let maxPrice = Math.max(...activeCandles.map((c) => c.high));

    tradeLevels.forEach((lvl) => {
      if (lvl.price > 0) {
        minPrice = Math.min(minPrice, lvl.price);
        maxPrice = Math.max(maxPrice, lvl.price);
      }
    });

    // 留 5% 上下 padding
    const priceRange = maxPrice - minPrice || 1;
    const adjustedMin = minPrice - priceRange * 0.05;
    const adjustedMax = maxPrice + priceRange * 0.05;
    const adjustedRange = adjustedMax - adjustedMin;

    const maxVolume = Math.max(...activeCandles.map((c) => c.volume)) || 1;

    // 座標映射函數
    const getX = (idx: number) => {
      const step = plotW / activeCandles.length;
      return leftMargin + idx * step + step / 2;
    };

    const getY = (price: number) => {
      const norm = (price - adjustedMin) / adjustedRange;
      return mainH - norm * mainH + 10;
    };

    const getVolY = (vol: number) => {
      const norm = vol / maxVolume;
      return h - norm * volH;
    };

    const candleWidth = Math.max(2, (plotW / activeCandles.length) * 0.65);

    // 4. 繪製背景水平網格線與價格標籤
    ctx.strokeStyle = 'rgba(234, 237, 242, 0.7)';
    ctx.lineWidth = 1;
    ctx.font = '10px tabular-nums system-ui, sans-serif';
    ctx.fillStyle = '#8B95A1';
    ctx.textAlign = 'right';

    const priceGridSteps = 4;
    for (let i = 0; i <= priceGridSteps; i++) {
      const p = adjustedMin + (adjustedRange * i) / priceGridSteps;
      const y = getY(p);
      ctx.beginPath();
      ctx.moveTo(leftMargin, y);
      ctx.lineTo(leftMargin + plotW, y);
      ctx.stroke();

      ctx.fillText(p.toFixed(1), w - 8, y + 3);
    }

    // 5. 繪製成交量柱狀圖
    activeCandles.forEach((c, idx) => {
      const x = getX(idx);
      const isUp = c.close >= c.open;
      const y = getVolY(c.volume);
      const barH = h - y;

      ctx.fillStyle = isUp ? 'rgba(240, 68, 82, 0.45)' : 'rgba(5, 150, 105, 0.45)';
      ctx.fillRect(x - candleWidth / 2, y, candleWidth, barH);
    });

    // 6. 繪製 K 線燭體與上下影線 (台股習慣：紅漲綠跌)
    activeCandles.forEach((c, idx) => {
      const x = getX(idx);
      const isUp = c.close >= c.open;
      const color = isUp ? '#F04452' : '#059669';

      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      // 影線 (High to Low)
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // 燭體 (Open to Close)
      const top = Math.min(openY, closeY);
      const bodyH = Math.max(1.5, Math.abs(closeY - openY));

      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, top, candleWidth, bodyH);
    });

    // 7. 繪製均線 (5MA 紫 / 20MA 橘 / 60MA 藍)
    const drawMaLine = (maArr: Array<number | null>, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      let hasStarted = false;

      maArr.forEach((val, idx) => {
        if (val === null) return;
        const x = getX(idx);
        const y = getY(val);
        if (!hasStarted) {
          ctx.moveTo(x, y);
          hasStarted = true;
        } else {
          ctx.lineTo(x, y);
        }
      });
      if (hasStarted) ctx.stroke();
    };

    drawMaLine(activeMa5, '#8B5CF6'); // 5MA
    drawMaLine(activeMa20, '#F59E0B'); // 20MA
    drawMaLine(activeMa60, '#2563EB'); // 60MA

    // 8. 繪製三階止盈與停損水平參考線 (SL / TP1 / TP2 / TP3)
    tradeLevels.forEach((lvl) => {
      if (lvl.price <= 0) return;
      const y = getY(lvl.price);
      if (y < 0 || y > mainH) return;

      ctx.strokeStyle = lvl.color;
      ctx.lineWidth = 1.2;
      ctx.setLineDash(lvl.lineDash || [4, 3]);
      ctx.beginPath();
      ctx.moveTo(leftMargin, y);
      ctx.lineTo(leftMargin + plotW, y);
      ctx.stroke();
      ctx.setLineDash([]); // 重設

      // 標註標籤
      ctx.fillStyle = lvl.color;
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${lvl.label} ${lvl.price}`, w - 6, y - 2);
    });

    // 9. 十字游標交互 (Crosshair Hover)
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < activeCandles.length) {
      const target = activeCandles[hoverIndex];
      const x = getX(hoverIndex);
      const y = getY(target.close);

      ctx.strokeStyle = 'rgba(78, 89, 104, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // 垂直線
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x, h);
      ctx.stroke();

      // 水平線
      ctx.beginPath();
      ctx.moveTo(leftMargin, y);
      ctx.lineTo(leftMargin + plotW, y);
      ctx.stroke();

      ctx.setLineDash([]);
    }
  }, [candleData, ma5, ma20, ma60, tradeLevels, hoverIndex, height]);

  // 游標互動事件
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || candleData.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const plotW = rect.width - 65;
    const displayCount = Math.min(candleData.length, 50);
    const step = plotW / displayCount;
    const idx = Math.floor((x - 10) / step);
    if (idx >= 0 && idx < displayCount) {
      setHoverIndex(idx);
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // 取得當前焦點或最新一根 K 棒資訊
  const activeCandle = useMemo(() => {
    if (candleData.length === 0) return null;
    const displayCount = Math.min(candleData.length, 50);
    const startIndex = candleData.length - displayCount;
    const activeCandles = candleData.slice(startIndex);
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < activeCandles.length) {
      return activeCandles[hoverIndex];
    }
    return activeCandles[activeCandles.length - 1];
  }, [candleData, hoverIndex]);

  const changePct = activeCandle
    ? Math.round(((activeCandle.close - activeCandle.open) / activeCandle.open) * 1000) / 10
    : 0;

  return (
    <div ref={containerRef} className="w-full space-y-2 select-none">
      {/* 頂部數據看板 */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-[#EAEDF2] dark:border-[#262C36] pb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#191F28] dark:text-[#F2F4F8]">
            {stockName || symbol}
          </span>
          <span className="text-[11px] font-mono text-[#8B95A1]">{symbol}</span>
          {activeCandle && (
            <span className="text-[11px] font-mono text-[#8B95A1]">
              {activeCandle.date}
            </span>
          )}
        </div>

        {activeCandle && (
          <div className="flex items-center gap-2 text-[11px] tabular-nums flex-wrap">
            <span>開 <strong className="font-mono">{activeCandle.open}</strong></span>
            <span>高 <strong className="font-mono">{activeCandle.high}</strong></span>
            <span>低 <strong className="font-mono">{activeCandle.low}</strong></span>
            <span>收 <strong className="font-mono font-bold text-[#191F28] dark:text-white">{activeCandle.close}</strong></span>
            <span className={changePct >= 0 ? 'text-[#F04452] font-bold' : 'text-[#059669] font-bold'}>
              {changePct >= 0 ? '+' : ''}{changePct}%
            </span>
            <span>量 <strong className="font-mono">{activeCandle.volume.toLocaleString()}</strong> 張</span>
          </div>
        )}
      </div>

      {/* 均線圖例指標 */}
      <div className="flex items-center justify-between text-[10px] text-[#8B95A1]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
            <span>5MA</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            <span>20MA (月線)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
            <span>60MA (季線)</span>
          </span>
        </div>
        <span>紅漲綠跌 · 附成交量與風控階梯</span>
      </div>

      {/* Canvas 畫布 */}
      <div className="relative w-full rounded-xl bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-[#161B22]/70 backdrop-blur-xs">
            <div className="flex items-center gap-2 text-xs text-[#2563EB] font-semibold">
              <span className="w-3.5 h-3.5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
              <span>載入 FinMind 日 K 線行情中...</span>
            </div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: `${height}px` }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair block"
        />
      </div>
    </div>
  );
};
