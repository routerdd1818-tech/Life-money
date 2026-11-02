import React, { useMemo, useState } from 'react';
import {
  Car,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  HeartPulse,
  Layers,
  Pin,
  Plus,
  Repeat,
  Shield,
  SplitSquareVertical,
  Trash2,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { buildUnifiedCalendarEvents } from '../services/financeEngine';
import { CalendarEventSource } from '../types';

const CALENDAR_FILTERS = [
  { id: 'all', label: '全部日程', icon: Layers },
  { id: 'credit_card', label: '信用卡', icon: CreditCard },
  { id: 'medical', label: '醫療回診', icon: HeartPulse },
  { id: 'vehicle', label: '車輛保養', icon: Car },
  { id: 'insurance', label: '保單扣款', icon: Shield },
  { id: 'installment', label: '分期付款', icon: SplitSquareVertical },
  { id: 'recurring', label: '固定收支', icon: Repeat },
  { id: 'manual', label: '自訂行程', icon: Pin },
] as const;

export const CalendarView: React.FC = () => {
  const {
    manualCalendarEvents,
    upsertManualCalendarEvent,
    deleteManualCalendarEvent,
    creditCards,
    installments,
    debtRecords,
    recurringItems,
    vehicles,
    insurancePolicies,
    medicalRecords,
    loans,
  } = useVault();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth1Based, setViewMonth1Based] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(() => today.toISOString().slice(0, 10));
  const [sourceFilter, setSourceFilter] = useState<'all' | CalendarEventSource>('all');

  // 新增自訂行程表單
  const [showAddModal, setShowAddModal] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState(() => today.toISOString().slice(0, 10));
  const [evTime, setEvTime] = useState('10:00');
  const [evEmoji, setEvEmoji] = useState('📌');
  const [evNotes, setEvNotes] = useState('');

  // 聚合全系統事件
  const allEvents = useMemo(
    () =>
      buildUnifiedCalendarEvents({
        targetYear: viewYear,
        targetMonth1Based: viewMonth1Based,
        manualEvents: manualCalendarEvents,
        cards: creditCards,
        installments,
        debts: debtRecords,
        recurringItems,
        vehicles,
        policies: insurancePolicies,
        medicalRecords,
        loans,
      }),
    [
      viewYear,
      viewMonth1Based,
      manualCalendarEvents,
      creditCards,
      installments,
      debtRecords,
      recurringItems,
      vehicles,
      insurancePolicies,
      medicalRecords,
      loans,
    ]
  );

  const filteredEvents =
    sourceFilter === 'all' ? allEvents : allEvents.filter((e) => e.source === sourceFilter);

  const monthPrefix = `${viewYear}-${String(viewMonth1Based).padStart(2, '0')}`;
  const monthEvents = filteredEvents.filter((e) => e.date.startsWith(monthPrefix));
  const selectedDayEvents = filteredEvents.filter((e) => e.date === selectedDate);

  // 建立月曆網格
  const daysInMonth = new Date(viewYear, viewMonth1Based, 0).getDate();
  const firstDayDow = new Date(viewYear, viewMonth1Based - 1, 1).getDay(); // 0 = Sun ... 6 = Sat

  const eventsByDateMap = useMemo(() => {
    const map = new Map<string, typeof filteredEvents>();
    for (const ev of monthEvents) {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [monthEvents]);

  const handlePrevMonth = () => {
    if (viewMonth1Based === 1) {
      setViewYear((y) => y - 1);
      setViewMonth1Based(12);
    } else {
      setViewMonth1Based((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth1Based === 12) {
      setViewYear((y) => y + 1);
      setViewMonth1Based(1);
    } else {
      setViewMonth1Based((m) => m + 1);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 1. 類別篩選：自適應 4 欄 x 2 列網格 (電腦 8 欄)，杜絕隱藏滑動 */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 p-1.5 rounded-2xl bg-[#F0F2F6] dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36]">
        {CALENDAR_FILTERS.map((f) => {
          const Icon = f.icon;
          const isActive = sourceFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setSourceFilter(f.id)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-center transition-all ${
                isActive
                  ? 'bg-white dark:bg-[#21262D] text-[#2563EB] dark:text-blue-400 font-bold shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-[#6B7684] dark:text-[#8B949E] hover:text-[#191F28] dark:hover:text-white'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 ${
                  isActive ? 'text-[#2563EB] dark:text-blue-400' : 'text-[#8B95A1]'
                }`}
              />
              <span className="text-[11px] font-semibold whitespace-nowrap">{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. 月曆主卡片 */}
      <div className="toss-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-[#F0F2F6] dark:hover:bg-[#1F2631]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold tabular-nums">
              {viewYear} 年 {viewMonth1Based} 月
            </h3>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-[#F0F2F6] dark:hover:bg-[#1F2631]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setEvDate(selectedDate);
              setShowAddModal(!showAddModal);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增行程</span>
          </button>
        </div>

        {/* 星期標頭 */}
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[#8B95A1] pb-1">
          {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* 日期格子 */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayDow }).map((_, i) => (
            <div key={`empty-${i}`} className="h-14" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = `${viewYear}-${String(viewMonth1Based).padStart(2, '0')}-${String(
              dayNum
            ).padStart(2, '0')}`;
            const dayEvents = eventsByDateMap.get(dateStr) || [];
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === today.toISOString().slice(0, 10);

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={`h-14 rounded-xl p-1 flex flex-col items-center justify-between border transition-all tabular-nums ${
                  isSelected
                    ? 'border-[#2563EB] bg-blue-50/70 dark:bg-blue-950/40'
                    : isToday
                      ? 'border-[#CBD5E1] dark:border-[#334155] bg-[#F6F7F9] dark:bg-[#1F2631]'
                      : 'border-transparent hover:bg-[#F6F7F9] dark:hover:bg-[#1F2631]'
                }`}
              >
                <span
                  className={`text-xs font-semibold ${
                    isSelected
                      ? 'text-[#2563EB] font-bold'
                      : isToday
                        ? 'text-[#191F28] dark:text-white font-bold'
                        : 'text-[#4E5968] dark:text-[#9BA4B0]'
                  }`}
                >
                  {dayNum}
                </span>

                {/* 事件微標記 */}
                <div className="flex items-center gap-0.5 overflow-hidden max-w-full">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span key={ev.id} className="text-[10px] leading-none">
                      {ev.emoji}
                    </span>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] text-[#8B95A1] font-bold">+</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 新增自訂行程表單 */}
      {showAddModal && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!evTitle) return;
            upsertManualCalendarEvent({
              id: `man-${Date.now()}`,
              title: evTitle,
              date: evDate,
              time: evTime || undefined,
              source: 'manual',
              colorHex: '#2563EB',
              emoji: evEmoji || '📌',
              notes: evNotes || undefined,
            });
            setEvTitle('');
            setEvNotes('');
            setShowAddModal(false);
          }}
          className="toss-card p-4 space-y-3"
        >
          <div className="text-xs font-bold">新增自訂行事曆事項</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <input
              type="text"
              required
              placeholder="行程標題..."
              value={evTitle}
              onChange={(e) => setEvTitle(e.target.value)}
              className="toss-input col-span-2"
            />
            <input
              type="date"
              required
              value={evDate}
              onChange={(e) => setEvDate(e.target.value)}
              className="toss-input tabular-nums"
            />
            <input
              type="time"
              value={evTime}
              onChange={(e) => setEvTime(e.target.value)}
              className="toss-input tabular-nums"
            />
            <input
              type="text"
              placeholder="圖示 Emoji"
              value={evEmoji}
              onChange={(e) => setEvEmoji(e.target.value)}
              className="toss-input text-center"
            />
            <input
              type="text"
              placeholder="備註說明 (選填)"
              value={evNotes}
              onChange={(e) => setEvNotes(e.target.value)}
              className="toss-input col-span-3"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
          >
            儲存行程
          </button>
        </form>
      )}

      {/* 3. 選取日期之當日事件清單 */}
      <div className="toss-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold tabular-nums">
            {selectedDate} 當日事項 ({selectedDayEvents.length})
          </h4>
        </div>

        {selectedDayEvents.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#8B95A1]">
            該日無排定扣款、回診、保單或保養事項
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg shrink-0">{ev.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#191F28] dark:text-[#F2F4F8] truncate">
                      {ev.title}
                    </div>
                    <div className="text-[11px] text-[#8B95A1] tabular-nums">
                      {ev.time ? `${ev.time} · ` : ''}
                      {ev.notes || '系統自動連動日程'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {typeof ev.amount === 'number' && ev.amount > 0 && (
                    <span className="text-xs sm:text-sm font-bold tabular-nums text-[#191F28] dark:text-[#F2F4F8]">
                      NT$ {ev.amount.toLocaleString()}
                    </span>
                  )}
                  {ev.source === 'manual' && (
                    <button
                      type="button"
                      onClick={() => deleteManualCalendarEvent(ev.id)}
                      className="p-1 text-[#8B95A1] hover:text-[#F04452]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. 本月全領域日程總表 */}
      <div className="toss-card p-4 space-y-2.5">
        <div className="text-xs font-bold text-[#4E5968] dark:text-[#9BA4B0]">
          {viewMonth1Based} 月份全領域重要日程一覽 ({monthEvents.length} 項)
        </div>
        <div className="divide-y divide-[#EAEDF2] dark:divide-[#262C36]">
          {monthEvents.map((ev) => (
            <div key={ev.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-[#8B95A1] tabular-nums shrink-0">
                  {ev.date.slice(5)}
                </span>
                <span>{ev.emoji}</span>
                <span className="font-semibold text-[#191F28] dark:text-[#F2F4F8] truncate">
                  {ev.title}
                </span>
              </div>
              {typeof ev.amount === 'number' && ev.amount > 0 && (
                <span className="font-bold tabular-nums shrink-0 ml-2">
                  NT$ {ev.amount.toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
