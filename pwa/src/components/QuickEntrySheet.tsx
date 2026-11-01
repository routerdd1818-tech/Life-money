import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { PaymentSourceType, TransactionType } from '../types';
import { AttachmentPicker } from './AttachmentPicker';

interface QuickEntrySheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXPENSE_CATEGORIES = [
  { name: '餐飲美食', emoji: '🍱' },
  { name: '交通加油', emoji: '⛽' },
  { name: '日常採買', emoji: '🛒' },
  { name: '數位娛樂', emoji: '🎬' },
  { name: '汽車養護', emoji: '🚗' },
  { name: '醫療保健', emoji: '🏥' },
  { name: '保險稅費', emoji: '🛡️' },
  { name: '居家水電', emoji: '🏠' },
];

const INCOME_CATEGORIES = [
  { name: '薪資獎金', emoji: '💼' },
  { name: '股息債息', emoji: '💰' },
  { name: '投資獲利', emoji: '📈' },
  { name: '兼職外快', emoji: '⚡' },
  { name: '其他收入', emoji: '✨' },
];

export const QuickEntrySheet: React.FC<QuickEntrySheetProps> = ({ isOpen, onClose }) => {
  const { assetAccounts, creditCards, addTransaction } = useVault();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedCatIndex, setSelectedCatIndex] = useState(0);
  const [paymentSourceType, setPaymentSourceType] = useState<PaymentSourceType>('account');
  const [paymentSourceId, setPaymentSourceId] = useState<string>(
    () => assetAccounts[0]?.id || ''
  );
  const [toAccountId, setToAccountId] = useState<string>(() => assetAccounts[1]?.id || '');
  const [notes, setNotes] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | undefined>(undefined);

  if (!isOpen) return null;

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const currentCat = categories[selectedCatIndex] || categories[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    let sourceName = '';
    if (paymentSourceType === 'account') {
      sourceName = assetAccounts.find((a) => a.id === paymentSourceId)?.name || '銀行/現金帳戶';
    } else {
      const card = creditCards.find((c) => c.id === paymentSourceId);
      sourceName = card ? `${card.bankName} ${card.cardName}` : '信用卡';
    }

    const targetToAcc = assetAccounts.find((a) => a.id === toAccountId);

    addTransaction({
      type,
      amount: numAmount,
      date,
      categoryName: type === 'transfer' ? '帳戶轉帳' : currentCat.name,
      categoryEmoji: type === 'transfer' ? '🔄' : currentCat.emoji,
      paymentSourceType: type === 'transfer' ? 'account' : paymentSourceType,
      paymentSourceId,
      paymentSourceName: sourceName,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      toAccountName: type === 'transfer' ? targetToAcc?.name : undefined,
      notes: notes.trim() || undefined,
      attachmentUrl,
    });

    setAmount('');
    setNotes('');
    setAttachmentUrl(undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#161B22] rounded-t-2xl border-t border-[#EAEDF2] dark:border-[#262C36] p-5 max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8]">
            快速記帳與帳戶連動
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8B95A1] hover:bg-[#F0F2F6] dark:hover:bg-[#1F2631]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 類型切換 */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631]">
            {(
              [
                { id: 'expense', label: '支出 / 刷卡' },
                { id: 'income', label: '收入入帳' },
                { id: 'transfer', label: '帳戶互轉' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setType(tab.id);
                  setSelectedCatIndex(0);
                  if (tab.id !== 'expense') {
                    setPaymentSourceType('account');
                    setPaymentSourceId(assetAccounts[0]?.id || '');
                  }
                }}
                className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                  type === tab.id
                    ? 'bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-xs'
                    : 'text-[#4E5968] dark:text-[#9BA4B0]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 金額與日期 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#4E5968] dark:text-[#9BA4B0] mb-1">
                金額 (NT$)
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                placeholder="輸入金額..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="toss-input text-lg font-bold tabular-nums"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4E5968] dark:text-[#9BA4B0] mb-1">
                日期
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="toss-input tabular-nums"
              />
            </div>
          </div>

          {/* 分類選擇 */}
          {type !== 'transfer' && (
            <div>
              <label className="block text-xs font-medium text-[#4E5968] dark:text-[#9BA4B0] mb-1.5">
                收支分類
              </label>
              <div className="grid grid-cols-4 gap-2">
                {categories.map((cat, idx) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setSelectedCatIndex(idx)}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      selectedCatIndex === idx
                        ? 'border-[#2563EB] bg-blue-50/70 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 font-semibold'
                        : 'border-[#EAEDF2] dark:border-[#262C36] bg-[#F6F7F9] dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0]'
                    }`}
                  >
                    <span className="text-base">{cat.emoji}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 扣款/入帳來源 */}
          {type === 'transfer' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#4E5968] dark:text-[#9BA4B0] mb-1">
                  轉出帳戶
                </label>
                <select
                  value={paymentSourceId}
                  onChange={(e) => setPaymentSourceId(e.target.value)}
                  className="toss-input"
                >
                  {assetAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.emoji} {acc.name} (${acc.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4E5968] dark:text-[#9BA4B0] mb-1">
                  轉入帳戶
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="toss-input"
                >
                  {assetAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.emoji} {acc.name} (${acc.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#4E5968] dark:text-[#9BA4B0]">
                  連動帳戶或信用卡 (自動增減餘額/未出帳額度)
                </label>
                {type === 'expense' && (
                  <div className="flex items-center gap-1 bg-[#F0F2F6] dark:bg-[#1F2631] p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentSourceType('account');
                        setPaymentSourceId(assetAccounts[0]?.id || '');
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                        paymentSourceType === 'account'
                          ? 'bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-2xs'
                          : 'text-[#8B95A1]'
                      }`}
                    >
                      銀行 / 現金
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentSourceType('credit_card');
                        setPaymentSourceId(creditCards[0]?.id || '');
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                        paymentSourceType === 'credit_card'
                          ? 'bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-2xs'
                          : 'text-[#8B95A1]'
                      }`}
                    >
                      刷信用卡
                    </button>
                  </div>
                )}
              </div>

              {paymentSourceType === 'account' ? (
                <select
                  value={paymentSourceId}
                  onChange={(e) => setPaymentSourceId(e.target.value)}
                  className="toss-input"
                >
                  {assetAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.emoji} {acc.name} (目前餘額 NT$ {acc.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={paymentSourceId}
                  onChange={(e) => setPaymentSourceId(e.target.value)}
                  className="toss-input"
                >
                  {creditCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      💳 {card.bankName} {card.cardName} (未出帳 NT$ {card.unbilledAmount.toLocaleString()})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* 備註 */}
          <div>
            <label className="block text-xs font-medium text-[#4E5968] dark:text-[#9BA4B0] mb-1">
              備註說明 (選填)
            </label>
            <input
              type="text"
              placeholder="例如：中油加油、超市採買、客戶聚餐..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="toss-input"
            />
          </div>

          <AttachmentPicker
            value={attachmentUrl}
            onChange={setAttachmentUrl}
            folder="receipt"
            label="發票 / 收據照片 (選填)"
          />

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition-colors shadow-xs"
          >
            確認儲存並連動餘額
          </button>
        </form>
      </div>
    </div>
  );
};
