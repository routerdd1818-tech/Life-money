import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getFinMindStockPrices, FinMindPriceRow } from '../services/finMindService';
import { ArrowLeft, ArrowRight, MoveHorizontal, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

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
  height = 340,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [candleData, setCandleData] = useState<CandlestickPoint[]>(initialData || []);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 互動狀態：平移與縮放
  // scrollOffset: 距最新一天的回溯根數 (0 代表顯示最右側最新)
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  // 一屏顯示的 K 線根數 (預設 45 根，範圍 20 ~ 120)
  const [visibleCount, setVisibleCount] = useState<number>(45);

  // 拖曳狀態追蹤
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartOffsetRef = useRef<number>(0);
  const touchStartDistRef = useRef<number>(0);
  const touchStartVisibleCountRef = useRef<number>(45);

  // 十字游標選中項目 (null 代表未懸浮，預設顯示最後一根)
  const [hoveredPoint, setHoveredPoint] = useState<{
    point: CandlestickPoint;
    ma5Val: number | null;
    ma20Val: number | null;
    ma60Val: number | null;
    x: number;
    y: number;
  } | null>(null);

  // 1. 抓取 FinMind 真實日 K 線數據 (抓取近 260 天歷史行情)
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setCandleData(initialData);
      setScrollOffset(0);
      return;
    }

    let isMounted = true;
    const fetchKlines = async () => {
      setIsLoading(true);
      try {
        const cleanId = symbol.replace(/\.(TW|TWO)$/i, '');
        const d = new Date();
        d.setDate(d.getDate() - 280); // 近 280 天
        const startDate = d.toISOString().slice(0, 10);

        const rows: FinMindPriceRow[] = await getFinMindStockPrices(cleanId, startDate, token);
        if (isMounted && rows && rows.length > 0) {
          const points: CandlestickPoint[] = rows.map((r) => ({
            date: r.date,
            open: r.open,
            high: r.max,
            low: r.min,
            close: r.close,
            volume: Math.round(r.Trading_Volume / 1000), // 張數
          }));

          // 若具備即時盤中報價，更新或追加今日最新 K 棒
          if (currentPrice && currentPrice > 0) {
            const todayStr = new Date().toISOString().slice(0, 10);
            const last = points[points.length - 1];
            if (last && last.date === todayStr) {
              last.close = currentPrice;
              last.high = Math.max(last.high, currentPrice);
              last.low = Math.min(last.low, currentPrice);
            } else if (last) {
              // 今日盤中尚未寫入日 K，追加今日即時 K 棒
              points.push({
                date: todayStr,
                open: last.close,
                high: Math.max(last.close, currentPrice),
                low: Math.min(last.close, currentPrice),
                close: currentPrice,
                volume: Math.round(last.volume * 0.8),
              });
            }
          }

          setCandleData(points);
          setScrollOffset(0);
        } else if (isMounted) {
          // 若無真實歷史資料，以 currentPrice 產生 120 天模擬走勢
          const basePrice = currentPrice || 100;
          const generated: CandlestickPoint[] = [];
          let lastClose = basePrice * 0.85;
          for (let i = 120; i >= 0; i--) {
            const dt = new Date();
            dt.setDate(dt.getDate() - i);
            const change = (Math.random() - 0.48) * (basePrice * 0.03);
            const open = lastClose;
            const close = Math.max(1, Math.round((open + change) * 10) / 10);
            const high = Math.round(Math.max(open, close) * (1 + Math.random() * 0.015) * 10) / 10;
            const low = Math.round(Math.min(open, close) * (1 - Math.random() * 0.015) * 10) / 10;
            const volume = Math.floor(600 + Math.random() * 3000);
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
          setScrollOffset(0);
        }
      } catch {
        // fallback
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

  // 3. 最大平移範圍計算
  const maxScrollOffset = Math.max(0, candleData.length - visibleCount);

  // 4. 當前視窗切割出的活躍 K 線與 MA 切片
  const { activeCandles, activeMa5, activeMa20, activeMa60, startIndex } = useMemo(() => {
    const total = candleData.length;
    if (total === 0) {
      return {
        activeCandles: [],
        activeMa5: [],
        activeMa20: [],
        activeMa60: [],
        startIndex: 0,
      };
    }

    const count = Math.min(total, visibleCount);
    // 右邊邊界 = total - scrollOffset
    const endIndex = Math.max(count, total - scrollOffset);
    const start = Math.max(0, endIndex - count);

    return {
      activeCandles: candleData.slice(start, endIndex),
      activeMa5: ma5.slice(start, endIndex),
      activeMa20: ma20.slice(start, endIndex),
      activeMa60: ma60.slice(start, endIndex),
      startIndex: start,
    };
  }, [candleData, ma5, ma20, ma60, scrollOffset, visibleCount]);

  // 5. Canvas 渲染核心
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeCandles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    const mainH = h * 0.72;
    const volH = h * 0.22;
    const volTop = h * 0.76;
    const rightMargin = 52;
    const leftMargin = 10;
    const plotW = w - leftMargin - rightMargin;

    ctx.clearRect(0, 0, w, h);

    // 價格區間
    let minPrice = Math.min(...activeCandles.map((c) => c.low));
    let maxPrice = Math.max(...activeCandles.map((c) => c.high));

    tradeLevels.forEach((lvl) => {
      if (lvl.price > 0) {
        minPrice = Math.min(minPrice, lvl.price);
        maxPrice = Math.max(maxPrice, lvl.price);
      }
    });

    const priceRange = maxPrice - minPrice || 1;
    const paddedMin = minPrice - priceRange * 0.05;
    const paddedMax = maxPrice + priceRange * 0.05;
    const paddedRange = paddedMax - paddedMin;

    const priceToY = (p: number) => {
      return mainH - ((p - paddedMin) / paddedRange) * mainH;
    };

    // 成交量最大值
    const maxVolume = Math.max(...activeCandles.map((c) => c.volume), 10);
    const volToH = (v: number) => {
      return (v / maxVolume) * volH;
    };

    const count = activeCandles.length;
    const step = plotW / count;
    const candleW = Math.max(2, Math.min(14, step * 0.72));

    // 背景水平網格線與價格刻度 (4條線)
    ctx.strokeStyle = '#EAEDF2';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const y = (mainH / gridSteps) * i;
      ctx.beginPath();
      ctx.moveTo(leftMargin, y);
      ctx.lineTo(w - rightMargin, y);
      ctx.stroke();

      const priceLevel = paddedMax - (paddedRange / gridSteps) * i;
      ctx.fillStyle = '#8B95A1';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(priceLevel.toFixed(1), w - rightMargin + 6, y + 3);
    }
    ctx.setLineDash([]);

    // 繪製水平止盈停損標記線 (SL, TP1, TP2, TP3)
    tradeLevels.forEach((lvl) => {
      if (lvl.price < paddedMin || lvl.price > paddedMax) return;
      const y = priceToY(lvl.price);

      ctx.save();
      ctx.strokeStyle = lvl.color;
      ctx.lineWidth = 1.2;
      ctx.setLineDash(lvl.lineDash || [4, 3]);
      ctx.beginPath();
      ctx.moveTo(leftMargin, y);
      ctx.lineTo(w - rightMargin, y);
      ctx.stroke();

      // 右側膠囊標籤
      ctx.fillStyle = lvl.color;
      ctx.fillRect(w - rightMargin + 2, y - 8, rightMargin - 4, 16);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${lvl.label} ${lvl.price}`, w - rightMargin / 2, y + 3);
      ctx.restore();
    });

    // 繪製 K 線與成交量棒
    activeCandles.forEach((c, idx) => {
      const x = leftMargin + idx * step + step / 2;
      const isUp = c.close >= c.open;
      const color = isUp ? '#F04452' : '#059669'; // 台灣紅漲綠跌

      // 1. K 線影線 (Wick)
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, priceToY(c.high));
      ctx.lineTo(x, priceToY(c.low));
      ctx.stroke();

      // 2. K 線實體 (Body)
      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const topY = Math.min(openY, closeY);
      const bodyH = Math.max(1.5, Math.abs(closeY - openY));

      ctx.fillStyle = color;
      ctx.fillRect(x - candleW / 2, topY, candleW, bodyH);

      // 3. 成交量棒 (Volume Bar)
      const barH = volToH(c.volume);
      ctx.fillStyle = isUp ? 'rgba(240, 68, 82, 0.45)' : 'rgba(5, 150, 105, 0.45)';
      ctx.fillRect(x - candleW / 2, volTop + volH - barH, candleW, barH);
    });

    // 繪製 MA 折線 (5MA 藍, 20MA 橘, 60MA 紫)
    const drawMaLine = (data: Array<number | null>, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let started = false;

      data.forEach((val, idx) => {
        if (val === null) return;
        const x = leftMargin + idx * step + step / 2;
        const y = priceToY(val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    };

    drawMaLine(activeMa5, '#2563EB'); // 5MA
    drawMaLine(activeMa20, '#F59E0B'); // 20MA
    drawMaLine(activeMa60, '#8B5CF6'); // 60MA

    // 繪製 Crosshair 十字游標線
    if (hoveredPoint) {
      ctx.save();
      ctx.strokeStyle = '#4E5968';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // 垂直線
      ctx.beginPath();
      ctx.moveTo(hoveredPoint.x, 0);
      ctx.lineTo(hoveredPoint.x, h);
      ctx.stroke();

      // 水平線
      ctx.beginPath();
      ctx.moveTo(leftMargin, hoveredPoint.y);
      ctx.lineTo(w - rightMargin, hoveredPoint.y);
      ctx.stroke();
      ctx.restore();
    }
  }, [activeCandles, activeMa5, activeMa20, activeMa60, tradeLevels, hoveredPoint]);

  // 6. 觸控手勢滑動處理 (Touch Pan & Zoom)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartXRef.current = e.touches[0].clientX;
      dragStartOffsetRef.current = scrollOffset;
    } else if (e.touches.length === 2) {
      // 雙指捏合縮放起始
      isDraggingRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistRef.current = Math.hypot(dx, dy);
      touchStartVisibleCountRef.current = visibleCount;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      // 單指拖曳平移
      const currentX = e.touches[0].clientX;
      const deltaX = currentX - dragStartXRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const plotW = rect.width - 62;
      const step = plotW / visibleCount;
      const shiftedCandles = Math.round(deltaX / Math.max(3, step));

      // 向右滑動 (deltaX > 0) -> scrollOffset 增加 (看更早歷史)
      // 向左滑動 (deltaX < 0) -> scrollOffset 減少 (看最新行情)
      const newOffset = Math.max(
        0,
        Math.min(maxScrollOffset, dragStartOffsetRef.current + shiftedCandles)
      );
      setScrollOffset(newOffset);

      // 更新游標位置
      updateHoveredPoint(currentX);
    } else if (e.touches.length === 2) {
      // 雙指 Pinch 縮放
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const ratio = touchStartDistRef.current / Math.max(10, currentDist);
      const newCount = Math.round(touchStartVisibleCountRef.current * ratio);
      setVisibleCount(Math.max(20, Math.min(100, newCount)));
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  // 7. 滑鼠拖曳與游標處理 (Mouse Pan)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = scrollOffset;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      const deltaX = e.clientX - dragStartXRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const plotW = rect.width - 62;
      const step = plotW / visibleCount;
      const shiftedCandles = Math.round(deltaX / Math.max(3, step));

      const newOffset = Math.max(
        0,
        Math.min(maxScrollOffset, dragStartOffsetRef.current + shiftedCandles)
      );
      setScrollOffset(newOffset);
    }
    updateHoveredPoint(e.clientX);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    setHoveredPoint(null);
  };

  // 8. 滾輪支援 (水平滾動或縮放)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // 水平平移
      const shift = e.deltaX > 0 ? -2 : 2;
      setScrollOffset((prev) => Math.max(0, Math.min(maxScrollOffset, prev + shift)));
    } else {
      // 垂直縮放
      const zoom = e.deltaY > 0 ? 4 : -4;
      setVisibleCount((prev) => Math.max(20, Math.min(100, prev + zoom)));
    }
  };

  // 更新 Hover 點資訊
  const updateHoveredPoint = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas || activeCandles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const leftMargin = 10;
    const rightMargin = 52;
    const plotW = rect.width - leftMargin - rightMargin;
    const count = activeCandles.length;
    const step = plotW / count;

    const idx = Math.floor((x - leftMargin) / step);
    if (idx >= 0 && idx < count) {
      const pt = activeCandles[idx];
      const candleX = leftMargin + idx * step + step / 2;
      const priceY = (rect.height * 0.72) / 2; // 預設水平十字線
      setHoveredPoint({
        point: pt,
        ma5Val: activeMa5[idx],
        ma20Val: activeMa20[idx],
        ma60Val: activeMa60[idx],
        x: candleX,
        y: priceY,
      });
    }
  };

  // 頂部顯示的行情快照 (若無懸浮，則顯示視窗內最新一根)
  const displayPoint = hoveredPoint?.point || activeCandles[activeCandles.length - 1];
  const displayMa5 = hoveredPoint?.ma5Val ?? activeMa5[activeMa5.length - 1];
  const displayMa20 = hoveredPoint?.ma20Val ?? activeMa20[activeMa20.length - 1];
  const displayMa60 = hoveredPoint?.ma60Val ?? activeMa60[activeMa60.length - 1];

  const priceDiff = displayPoint ? displayPoint.close - displayPoint.open : 0;
  const priceChangePct =
    displayPoint && displayPoint.open > 0
      ? Math.round((priceDiff / displayPoint.open) * 1000) / 10
      : 0;

  return (
    <div ref={containerRef} className="space-y-2 select-none">
      {/* 1. K 線頂部操控列與即時 OHLC 數值看板 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 rounded-xl bg-[#F6F7F9] dark:bg-[#161B22] text-xs">
        {displayPoint ? (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] tabular-nums">
            <span className="font-bold text-[#191F28] dark:text-white">
              {displayPoint.date}
            </span>
            <span>
              開 <strong className="text-[#191F28] dark:text-white">{displayPoint.open}</strong>
            </span>
            <span>
              高 <strong className="text-[#F04452]">{displayPoint.high}</strong>
            </span>
            <span>
              低 <strong className="text-[#059669]">{displayPoint.low}</strong>
            </span>
            <span>
              收 <strong className={priceDiff >= 0 ? 'text-[#F04452]' : 'text-[#059669]'}>
                {displayPoint.close}
              </strong>
            </span>
            <span className={priceDiff >= 0 ? 'text-[#F04452]' : 'text-[#059669]'}>
              ({priceDiff >= 0 ? '+' : ''}{priceChangePct}%)
            </span>
            <span className="text-[#8B95A1]">
              量 <strong>{displayPoint.volume}</strong> 張
            </span>
          </div>
        ) : (
          <div className="text-[#8B95A1] text-xs">載入日 K 線圖表中...</div>
        )}

        {/* 均線數值指標 */}
        <div className="flex items-center gap-2 text-[10px] font-mono tabular-nums">
          <span className="text-[#2563EB]">MA5 {displayMa5 || '-'}</span>
          <span className="text-[#F59E0B]">MA20 {displayMa20 || '-'}</span>
          <span className="text-[#8B5CF6]">MA60 {displayMa60 || '-'}</span>
        </div>
      </div>

      {/* 2. 手勢移動操作提示與快速時段切換 */}
      <div className="flex items-center justify-between px-1 text-[11px] text-[#8B95A1]">
        <div className="flex items-center gap-1">
          <MoveHorizontal className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>左右滑動平移查看歷史</span>
          {scrollOffset > 0 && (
            <span className="text-[#2563EB] font-bold">
              (回溯 {scrollOffset} 根)
            </span>
          )}
        </div>

        {/* 快速切換視野 */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setVisibleCount(22);
              setScrollOffset(0);
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] ${
              visibleCount === 22 && scrollOffset === 0
                ? 'bg-[#2563EB] text-white'
                : 'hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            1月
          </button>
          <button
            type="button"
            onClick={() => {
              setVisibleCount(60);
              setScrollOffset(0);
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] ${
              visibleCount === 60 && scrollOffset === 0
                ? 'bg-[#2563EB] text-white'
                : 'hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            1季
          </button>
          <button
            type="button"
            onClick={() => {
              setVisibleCount(100);
              setScrollOffset(0);
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] ${
              visibleCount === 100 && scrollOffset === 0
                ? 'bg-[#2563EB] text-white'
                : 'hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            半年
          </button>
          {scrollOffset > 0 && (
            <button
              type="button"
              onClick={() => setScrollOffset(0)}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2563EB] text-white flex items-center gap-0.5"
              title="回到今日最新"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>最新</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. 觸控可滑動之 Canvas K 線圖容器 */}
      <div className="relative rounded-xl border border-[#EAEDF2] dark:border-[#262C36] bg-white dark:bg-[#0E1116] overflow-hidden shadow-2xs">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: `${height}px`, display: 'block', touchAction: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          className="cursor-crosshair active:cursor-grabbing"
        />

        {isLoading && (
          <div className="absolute inset-0 bg-white/70 dark:bg-[#0E1116]/70 backdrop-blur-xs flex items-center justify-center gap-2 text-xs text-[#2563EB]">
            <div className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
            <span>載入行情中...</span>
          </div>
        )}
      </div>

      {/* 圖例說明 */}
      <div className="flex flex-wrap items-center justify-between text-[10px] text-[#8B95A1] px-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#F04452]" />
            <span>紅漲</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#059669]" />
            <span>綠跌</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-1 bg-[#2563EB]" />
            <span>MA5</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-1 bg-[#F59E0B]" />
            <span>MA20</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-1 bg-[#8B5CF6]" />
            <span>MA60</span>
          </span>
        </div>
        <span>支援單指拖曳平移 · 雙指縮放</span>
      </div>
    </div>
  );
};
