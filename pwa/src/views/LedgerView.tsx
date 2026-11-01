import React, { useState } from 'react';
import {
  CheckCircle2,
  CreditCard as CreditCardIcon,
  Plus,
  Repeat,
  SplitSquareVertical,
  Trash2,
  Users,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { getCreditCardUtilization } from '../services/financeEngine';
import { DebtType, PaymentSourceType, RecurrenceCycle } from '../types';

type LedgerSubTab = 'transactions' | 'cards' | 'installments' | 'debts' | 'recurring';

interface LedgerViewProps {
  onOpenQuickEntry: () => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({ onOpenQuickEntry }) => {
  const {
    transactions,
    deleteTransaction,
    creditCards,
    upsertCreditCard,
    deleteCreditCard,
    payCreditCardBill,
    installments,
    upsertInstallment,
    deleteInstallment,
    payNextInstallmentPeriod,
    debtRecords,
    upsertDebtRecord,
    deleteDebtRecord,
    recordDebtRepayment,
    recurringItems,
    upsertRecurringItem,
    deleteRecurringItem,
    triggerRecurringItemNow,
    assetAccounts,
  } = useVault();

  const [subTab, setSubTab] = useState<LedgerSubTab>('transactions');

  // 新增信用卡表單狀態
  const [showAddCard, setShowAddCard] = useState(false);
  const [bankName, setBankName] = useState('');
  const [cardName, setCardName] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [creditLimit, setCreditLimit] = useState('200000');
  const [billedAmount, setBilledAmount] = useState('0');
  const [unbilledAmount, setUnbilledAmount] = useState('0');
  const [statementDay, setStatementDay] = useState('15');
  const [dueDay, setDueDay] = useState('5');
  const [autoPayAccId, setAutoPayAccId] = useState(assetAccounts[0]?.id || '');

  // 新增分期表單狀態
  const [showAddInst, setShowAddInst] = useState(false);
  const [instTitle, setInstTitle] = useState('');
  const [instTotalAmount, setInstTotalAmount] = useState('');
  const [instTotalPeriods, setInstTotalPeriods] = useState('12');
  const [instPaidPeriods, setInstPaidPeriods] = useState('0');
  const [instBillingDay, setInstBillingDay] = useState('15');
  const [instSourceType, setInstSourceType] = useState<PaymentSourceType>('credit_card');
  const [instSourceId, setInstSourceId] = useState(creditCards[0]?.id || '');
  const [instOccupyLimit, setInstOccupyLimit] = useState(true);

  // 新增借放款表單狀態
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [debtType, setDebtType] = useState<DebtType>('i_owe');
  const [debtTitle, setDebtTitle] = useState('');
  const [debtCounterparty, setDebtCounterparty] = useState('');
  const [debtTotal, setDebtTotal] = useState('');
  const [debtRemaining, setDebtRemaining] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtMonthlyDay, setDebtMonthlyDay] = useState('');
  const [debtMonthlyAmount, setDebtMonthlyAmount] = useState('');
  const [debtLinkedAccId, setDebtLinkedAccId] = useState(assetAccounts[0]?.id || '');
  const [repayAmountMap, setRepayAmountMap] = useState<Record<string, string>>({});

  // 新增固定收支表單狀態
  const [showAddRec, setShowAddRec] = useState(false);
  const [recTitle, setRecTitle] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recType, setRecType] = useState<'expense' | 'income'>('expense');
  const [recCycle, setRecCycle] = useState<RecurrenceCycle>('monthly');
  const [recDay, setRecDay] = useState('5');
  const [recEmoji, setRecEmoji] = useState('🔁');
  const [recSourceType, setRecSourceType] = useState<PaymentSourceType>('account');
  const [recSourceId, setRecSourceId] = useState(assetAccounts[0]?.id || '');

  // 本月收支統計
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const monthExpense = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonthPrefix))
    .reduce((s, t) => s + t.amount, 0);
  const monthIncome = transactions
    .filter((t) => t.type === 'income' && t.date.startsWith(currentMonthPrefix))
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4 pb-24">
      {/* 頂部子分頁切換器 */}
      <div className="toss-pill-bar">
        {(
          [
            { id: 'transactions', label: '日常收支' },
            { id: 'cards', label: '信用卡增減' },
            { id: 'installments', label: '分期紀錄' },
            { id: 'debts', label: '借放款紀錄' },
            { id: 'recurring', label: '固定收支' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`toss-pill-btn flex-1 ${
              subTab === tab.id ? 'toss-pill-btn-active' : 'toss-pill-btn-inactive'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. 日常收支明細 */}
      {subTab === 'transactions' && (
        <div className="space-y-4">
          <div className="toss-card p-4 flex items-center justify-between">
            <div className="grid grid-cols-2 gap-6 flex-1 tabular-nums">
              <div>
                <div className="text-xs text-[#8B95A1]">本月總支出</div>
                <div className="text-lg font-bold text-[#191F28] dark:text-[#F2F4F8]">
                  NT$ {monthExpense.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#8B95A1]">本月總收入</div>
                <div className="text-lg font-bold text-[#059669]">
                  +NT$ {monthIncome.toLocaleString()}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenQuickEntry}
              className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>新增記帳</span>
            </button>
          </div>

          <div className="toss-card divide-y divide-[#EAEDF2] dark:divide-[#262C36]">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8B95A1]">尚無記帳紀錄，點擊右上角新增</div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="p-3.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] flex items-center justify-center text-base shrink-0">
                      {tx.categoryEmoji}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-[#191F28] dark:text-[#F2F4F8] truncate">
                        {tx.categoryName}{' '}
                        {tx.notes ? (
                          <span className="font-normal text-[#4E5968] dark:text-[#9BA4B0]">
                            · {tx.notes}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-[#8B95A1] tabular-nums">
                        {tx.date} · {tx.paymentSourceName}
                        {tx.toAccountName ? ` → ${tx.toAccountName}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        tx.type === 'income'
                          ? 'text-[#059669]'
                          : tx.type === 'transfer'
                            ? 'text-[#4E5968] dark:text-[#9BA4B0]'
                            : 'text-[#191F28] dark:text-[#F2F4F8]'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                      NT$ {tx.amount.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteTransaction(tx.id)}
                      className="p-1.5 rounded-lg text-[#8B95A1] hover:text-[#F04452]"
                      title="刪除並回沖餘額"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. 信用卡額度與待繳增減管理 */}
      {subTab === 'cards' && (
        <div className="space-y-4">
          <div className="toss-card p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-[#8B95A1]">所有信用卡待繳總額 (已出帳 + 未出帳)</div>
              <div className="text-xl font-bold text-[#F04452] tabular-nums">
                NT${' '}
                {creditCards
                  .reduce((s, c) => s + c.currentBilledAmount + c.unbilledAmount, 0)
                  .toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddCard(!showAddCard)}
              className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>新增信用卡</span>
            </button>
          </div>

          {showAddCard && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!bankName || !cardName) return;
                upsertCreditCard({
                  id: `cc-${Date.now()}`,
                  bankName,
                  cardName,
                  lastFourDigits: lastFour || undefined,
                  creditLimit: Number(creditLimit) || 100000,
                  currentBilledAmount: Number(billedAmount) || 0,
                  unbilledAmount: Number(unbilledAmount) || 0,
                  statementDay: Number(statementDay) || 15,
                  dueDay: Number(dueDay) || 5,
                  autoPayAccountId: autoPayAccId || undefined,
                  colorHex: '#2563EB',
                  updatedAt: new Date().toISOString(),
                });
                setBankName('');
                setCardName('');
                setShowAddCard(false);
              }}
              className="toss-card p-4 space-y-3"
            >
              <div className="text-xs font-bold">新增信用卡檔案</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="發卡銀行 (例: 玉山銀行)"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="toss-input"
                />
                <input
                  type="text"
                  required
                  placeholder="卡片名稱 (例: Unicard)"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="toss-input"
                />
                <input
                  type="text"
                  placeholder="卡號末四碼 (選填)"
                  maxLength={4}
                  value={lastFour}
                  onChange={(e) => setLastFour(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <div>
                  <label className="text-[11px] text-[#8B95A1]">信用總額度</label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">本期已出帳待繳</label>
                  <input
                    type="number"
                    value={billedAmount}
                    onChange={(e) => setBilledAmount(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">目前未出帳累計</label>
                  <input
                    type="number"
                    value={unbilledAmount}
                    onChange={(e) => setUnbilledAmount(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">每月結帳日 (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={statementDay}
                    onChange={(e) => setStatementDay(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">每月繳款截止日 (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">自動扣繳銀行帳戶</label>
                  <select
                    value={autoPayAccId}
                    onChange={(e) => setAutoPayAccId(e.target.value)}
                    className="toss-input"
                  >
                    {assetAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
              >
                儲存信用卡
              </button>
            </form>
          )}

          <div className="space-y-3">
            {creditCards.map((card) => {
              const util = getCreditCardUtilization(card, installments);
              const autoAcc = assetAccounts.find((a) => a.id === card.autoPayAccountId);

              return (
                <div key={card.id} className="toss-card p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] flex items-center justify-center">
                        <CreditCardIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          {card.bankName} · {card.cardName}{' '}
                          {card.lastFourDigits ? (
                            <span className="text-xs font-normal text-[#8B95A1] tabular-nums">
                              ({card.lastFourDigits})
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-[#8B95A1] tabular-nums">
                          每月 {card.statementDay} 日結帳 · {card.dueDay} 日繳款截止
                          {autoAcc ? ` · 扣繳：${autoAcc.name}` : ''}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteCreditCard(card.id)}
                      className="p-1 text-[#8B95A1] hover:text-[#F04452]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 額度進度條 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs tabular-nums">
                      <span className="text-[#4E5968] dark:text-[#9BA4B0]">
                        已用額度 NT$ {util.usedAmount.toLocaleString()} ({util.utilizationPct}%)
                      </span>
                      <span className="text-[#8B95A1]">
                        可用額度 NT$ {util.availableCredit.toLocaleString()} / 總額度{' '}
                        {card.creditLimit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#F0F2F6] dark:bg-[#1F2631] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          util.utilizationPct > 80 ? 'bg-[#F04452]' : 'bg-[#2563EB]'
                        }`}
                        style={{ width: `${util.utilizationPct}%` }}
                      />
                    </div>
                  </div>

                  {/* 本期已出帳 vs 未出帳 vs 分期佔用 */}
                  <div className="grid grid-cols-3 gap-2 pt-1 tabular-nums">
                    <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                      <div className="text-[11px] text-[#8B95A1]">本期已出帳待繳</div>
                      <div className="text-sm font-bold text-[#F04452]">
                        ${card.currentBilledAmount.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                      <div className="text-[11px] text-[#8B95A1]">未出帳一般消費</div>
                      <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                        ${card.unbilledAmount.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                      <div className="text-[11px] text-[#8B95A1]">未到期分期佔用</div>
                      <div className="text-sm font-bold text-[#4E5968] dark:text-[#9BA4B0]">
                        ${util.installmentUnpaidOnCard.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* 一鍵繳卡費操作列 */}
                  {card.currentBilledAmount > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-[#EAEDF2] dark:border-[#262C36]">
                      <span className="text-xs text-[#4E5968] dark:text-[#9BA4B0]">
                        從 <strong>{autoAcc?.name || assetAccounts[0]?.name}</strong> 扣款沖銷本期帳單
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          payCreditCardBill(
                            card.id,
                            card.autoPayAccountId || assetAccounts[0]?.id || '',
                            card.currentBilledAmount
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-[#191F28] dark:bg-white text-white dark:text-[#191F28] text-xs font-semibold flex items-center gap-1 tabular-nums"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>一鍵繳清 ${card.currentBilledAmount.toLocaleString()}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. 分期付款紀錄 */}
      {subTab === 'installments' && (
        <div className="space-y-4">
          <div className="toss-card p-4 flex items-center justify-between">
            <div className="tabular-nums">
              <div className="text-xs text-[#8B95A1]">每月分期固定攤提 / 尚未繳清總尾款</div>
              <div className="text-lg font-bold text-[#191F28] dark:text-[#F2F4F8]">
                月付 NT${' '}
                {installments
                  .filter((i) => !i.isCompleted)
                  .reduce((s, i) => s + i.periodAmount, 0)
                  .toLocaleString()}{' '}
                <span className="text-xs font-normal text-[#8B95A1]">
                  (剩餘總尾款 $
                  {installments
                    .filter((i) => !i.isCompleted)
                    .reduce((s, i) => s + (i.totalPeriods - i.paidPeriods) * i.periodAmount, 0)
                    .toLocaleString()}
                  )
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddInst(!showAddInst)}
              className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>新增分期</span>
            </button>
          </div>

          {showAddInst && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const total = Number(instTotalAmount);
                const periods = Number(instTotalPeriods) || 12;
                const paid = Number(instPaidPeriods) || 0;
                if (!instTitle || total <= 0) return;

                const sourceName =
                  instSourceType === 'credit_card'
                    ? creditCards.find((c) => c.id === instSourceId)?.cardName || '信用卡'
                    : assetAccounts.find((a) => a.id === instSourceId)?.name || '銀行帳戶';

                upsertInstallment({
                  id: `inst-${Date.now()}`,
                  title: instTitle,
                  totalAmount: total,
                  totalPeriods: periods,
                  paidPeriods: paid,
                  periodAmount: Math.round(total / periods),
                  startDate: new Date().toISOString().slice(0, 10),
                  billingDay: Number(instBillingDay) || 15,
                  paymentSourceType: instSourceType,
                  paymentSourceId: instSourceId,
                  paymentSourceName: sourceName,
                  occupyCreditLimit: instOccupyLimit,
                  emoji: '📆',
                  colorHex: '#2563EB',
                  isCompleted: paid >= periods,
                });
                setInstTitle('');
                setInstTotalAmount('');
                setShowAddInst(false);
              }}
              className="toss-card p-4 space-y-3"
            >
              <div className="text-xs font-bold">新增分期付款計畫</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="分期項目名稱 (例: iPhone 17 Pro)"
                  value={instTitle}
                  onChange={(e) => setInstTitle(e.target.value)}
                  className="toss-input col-span-2"
                />
                <input
                  type="number"
                  required
                  placeholder="分期總金額"
                  value={instTotalAmount}
                  onChange={(e) => setInstTotalAmount(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <div>
                  <label className="text-[11px] text-[#8B95A1]">總期數</label>
                  <input
                    type="number"
                    min="1"
                    value={instTotalPeriods}
                    onChange={(e) => setInstTotalPeriods(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">已繳期數</label>
                  <input
                    type="number"
                    min="0"
                    value={instPaidPeriods}
                    onChange={(e) => setInstPaidPeriods(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">每月入帳/扣款日</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={instBillingDay}
                    onChange={(e) => setInstBillingDay(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">扣款方式</label>
                  <select
                    value={instSourceType}
                    onChange={(e) => {
                      const t = e.target.value as PaymentSourceType;
                      setInstSourceType(t);
                      setInstSourceId(
                        t === 'credit_card'
                          ? creditCards[0]?.id || ''
                          : assetAccounts[0]?.id || ''
                      );
                    }}
                    className="toss-input"
                  >
                    <option value="credit_card">信用卡分期</option>
                    <option value="account">銀行帳戶分期</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-[#8B95A1]">綁定卡片或帳戶</label>
                  <select
                    value={instSourceId}
                    onChange={(e) => setInstSourceId(e.target.value)}
                    className="toss-input"
                  >
                    {instSourceType === 'credit_card'
                      ? creditCards.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.bankName} {c.cardName}
                          </option>
                        ))
                      : assetAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                  </select>
                </div>
              </div>
              {instSourceType === 'credit_card' && (
                <label className="flex items-center gap-2 text-xs text-[#4E5968] dark:text-[#9BA4B0]">
                  <input
                    type="checkbox"
                    checked={instOccupyLimit}
                    onChange={(e) => setInstOccupyLimit(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span>未到期分期餘額佔用該張信用卡可用額度</span>
                </label>
              )}
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
              >
                儲存分期計畫
              </button>
            </form>
          )}

          <div className="space-y-3">
            {installments.map((inst) => {
              const pct = Math.min(100, Math.round((inst.paidPeriods / inst.totalPeriods) * 100));
              const remainingPeriods = Math.max(0, inst.totalPeriods - inst.paidPeriods);
              const remainingAmt = remainingPeriods * inst.periodAmount;

              return (
                <div key={inst.id} className="toss-card p-4 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] flex items-center justify-center text-base">
                        {inst.emoji || <SplitSquareVertical className="w-4 h-4 text-[#2563EB]" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          {inst.title}
                        </div>
                        <div className="text-[11px] text-[#8B95A1] tabular-nums">
                          每月 {inst.billingDay} 日扣款 · {inst.paymentSourceName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-[#F0F2F6] dark:bg-[#1F2631] text-xs font-bold tabular-nums">
                        {inst.paidPeriods} / {inst.totalPeriods} 期
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteInstallment(inst.id)}
                        className="p-1 text-[#8B95A1] hover:text-[#F04452]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-[#F0F2F6] dark:bg-[#1F2631] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#2563EB] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs tabular-nums pt-1">
                    <div className="text-[#4E5968] dark:text-[#9BA4B0]">
                      每期 <strong>NT$ {inst.periodAmount.toLocaleString()}</strong> · 剩餘尾款{' '}
                      <strong>NT$ {remainingAmt.toLocaleString()}</strong>
                    </div>
                    {!inst.isCompleted && (
                      <button
                        type="button"
                        onClick={() => payNextInstallmentPeriod(inst.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
                      >
                        繳納下一期
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. 借放款紀錄 (應收債權 / 應付貸款) */}
      {subTab === 'debts' && (
        <div className="space-y-4">
          <div className="toss-card p-4 flex items-center justify-between">
            <div className="grid grid-cols-2 gap-6 flex-1 tabular-nums">
              <div>
                <div className="text-xs text-[#8B95A1]">別人欠我 (應收債權)</div>
                <div className="text-lg font-bold text-[#059669]">
                  NT${' '}
                  {debtRecords
                    .filter((d) => !d.isSettled && d.type === 'they_owe')
                    .reduce((s, d) => s + d.remainingAmount, 0)
                    .toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#8B95A1]">我借入/貸款 (應付負債)</div>
                <div className="text-lg font-bold text-[#F04452]">
                  NT${' '}
                  {debtRecords
                    .filter((d) => !d.isSettled && d.type === 'i_owe')
                    .reduce((s, d) => s + d.remainingAmount, 0)
                    .toLocaleString()}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddDebt(!showAddDebt)}
              className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>新增借放款</span>
            </button>
          </div>

          {showAddDebt && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const total = Number(debtTotal);
                const rem = debtRemaining ? Number(debtRemaining) : total;
                if (!debtTitle || !debtCounterparty || total <= 0) return;

                upsertDebtRecord({
                  id: `debt-${Date.now()}`,
                  type: debtType,
                  title: debtTitle,
                  counterparty: debtCounterparty,
                  totalAmount: total,
                  remainingAmount: rem,
                  startDate: new Date().toISOString().slice(0, 10),
                  dueDate: debtDueDate || undefined,
                  monthlyPaymentDay: debtMonthlyDay ? Number(debtMonthlyDay) : undefined,
                  monthlyPaymentAmount: debtMonthlyAmount ? Number(debtMonthlyAmount) : undefined,
                  linkedAccountId: debtLinkedAccId || undefined,
                  isSettled: rem <= 0,
                  repayments: [],
                });
                setDebtTitle('');
                setDebtCounterparty('');
                setDebtTotal('');
                setDebtRemaining('');
                setShowAddDebt(false);
              }}
              className="toss-card p-4 space-y-3"
            >
              <div className="text-xs font-bold">新增借入貸款或借出債權</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDebtType('i_owe')}
                  className={`py-2 rounded-xl text-xs font-semibold border ${
                    debtType === 'i_owe'
                      ? 'border-[#F04452] bg-red-50/60 dark:bg-red-950/30 text-[#F04452]'
                      : 'border-[#EAEDF2] dark:border-[#262C36]'
                  }`}
                >
                  我借入 / 銀行貸款 (應付)
                </button>
                <button
                  type="button"
                  onClick={() => setDebtType('they_owe')}
                  className={`py-2 rounded-xl text-xs font-semibold border ${
                    debtType === 'they_owe'
                      ? 'border-[#059669] bg-emerald-50/60 dark:bg-emerald-950/30 text-[#059669]'
                      : 'border-[#EAEDF2] dark:border-[#262C36]'
                  }`}
                >
                  我借出 / 別人欠我 (應收)
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="項目名稱 (例: 車貸 / 借阿豪)"
                  value={debtTitle}
                  onChange={(e) => setDebtTitle(e.target.value)}
                  className="toss-input"
                />
                <input
                  type="text"
                  required
                  placeholder="對象 / 銀行名稱"
                  value={debtCounterparty}
                  onChange={(e) => setDebtCounterparty(e.target.value)}
                  className="toss-input"
                />
                <input
                  type="number"
                  required
                  placeholder="原始總金額"
                  value={debtTotal}
                  onChange={(e) => setDebtTotal(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <input
                  type="number"
                  placeholder="目前剩餘未還金額"
                  value={debtRemaining}
                  onChange={(e) => setDebtRemaining(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <input
                  type="date"
                  value={debtDueDate}
                  onChange={(e) => setDebtDueDate(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <select
                  value={debtLinkedAccId}
                  onChange={(e) => setDebtLinkedAccId(e.target.value)}
                  className="toss-input"
                >
                  {assetAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      連動：{a.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="每月扣款日 (1-31 選填)"
                  value={debtMonthlyDay}
                  onChange={(e) => setDebtMonthlyDay(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <input
                  type="number"
                  placeholder="每月固定攤還金額 (選填)"
                  value={debtMonthlyAmount}
                  onChange={(e) => setDebtMonthlyAmount(e.target.value)}
                  className="toss-input tabular-nums col-span-2"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
              >
                儲存借放款紀錄
              </button>
            </form>
          )}

          <div className="space-y-3">
            {debtRecords.map((debt) => {
              const paidPct =
                debt.totalAmount > 0
                  ? Math.min(
                      100,
                      Math.round(((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100)
                    )
                  : 100;

              return (
                <div key={debt.id} className="toss-card p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          debt.type === 'they_owe'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-[#059669]'
                            : 'bg-red-50 dark:bg-red-950/50 text-[#F04452]'
                        }`}
                      >
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          {debt.title}{' '}
                          <span className="text-xs font-normal text-[#8B95A1]">
                            · 對象：{debt.counterparty}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#8B95A1] tabular-nums">
                          原始總額 ${debt.totalAmount.toLocaleString()}
                          {debt.dueDate ? ` · 到期日 ${debt.dueDate}` : ''}
                          {debt.monthlyPaymentDay
                            ? ` · 每月 ${debt.monthlyPaymentDay} 日攤還 $${(debt.monthlyPaymentAmount || 0).toLocaleString()}`
                            : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          debt.type === 'they_owe' ? 'text-[#059669]' : 'text-[#F04452]'
                        }`}
                      >
                        剩 NT$ {debt.remainingAmount.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteDebtRecord(debt.id)}
                        className="p-1 text-[#8B95A1] hover:text-[#F04452]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-[#F0F2F6] dark:bg-[#1F2631] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        debt.type === 'they_owe' ? 'bg-[#059669]' : 'bg-[#2563EB]'
                      }`}
                      style={{ width: `${paidPct}%` }}
                    />
                  </div>

                  {!debt.isSettled && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        placeholder={
                          debt.monthlyPaymentAmount
                            ? `預設本期 $${debt.monthlyPaymentAmount}`
                            : '輸入還款/收款金額...'
                        }
                        value={repayAmountMap[debt.id] || ''}
                        onChange={(e) =>
                          setRepayAmountMap((prev) => ({ ...prev, [debt.id]: e.target.value }))
                        }
                        className="toss-input text-xs py-1.5 tabular-nums flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const amt =
                            Number(repayAmountMap[debt.id]) ||
                            debt.monthlyPaymentAmount ||
                            debt.remainingAmount;
                          if (amt <= 0) return;
                          recordDebtRepayment(debt.id, amt, debt.linkedAccountId);
                          setRepayAmountMap((prev) => ({ ...prev, [debt.id]: '' }));
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#191F28] dark:bg-white text-white dark:text-[#191F28] text-xs font-semibold shrink-0"
                      >
                        {debt.type === 'i_owe' ? '記錄還款並扣帳' : '記錄收款並入帳'}
                      </button>
                    </div>
                  )}

                  {debt.repayments.length > 0 && (
                    <div className="pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] space-y-1">
                      <div className="text-[11px] font-semibold text-[#8B95A1]">歷史還款紀錄</div>
                      {debt.repayments.slice(0, 3).map((r) => (
                        <div
                          key={r.id}
                          className="flex justify-between text-[11px] text-[#4E5968] dark:text-[#9BA4B0] tabular-nums"
                        >
                          <span>
                            {r.date} {r.accountName ? `(${r.accountName})` : ''} {r.notes || ''}
                          </span>
                          <span className="font-semibold">
                            ${r.amount.toLocaleString()} (餘 ${r.remainingAfter.toLocaleString()})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. 固定支出與固定收入 */}
      {subTab === 'recurring' && (
        <div className="space-y-4">
          <div className="toss-card p-4 flex items-center justify-between">
            <div className="tabular-nums">
              <div className="text-xs text-[#8B95A1]">每月固定支出總計 / 固定收入總計</div>
              <div className="text-sm sm:text-base font-bold">
                <span className="text-[#F04452] mr-3">
                  支出 NT${' '}
                  {recurringItems
                    .filter((r) => r.isActive && r.type === 'expense')
                    .reduce((s, r) => s + r.amount, 0)
                    .toLocaleString()}
                </span>
                <span className="text-[#059669]">
                  收入 +NT${' '}
                  {recurringItems
                    .filter((r) => r.isActive && r.type === 'income')
                    .reduce((s, r) => s + r.amount, 0)
                    .toLocaleString()}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddRec(!showAddRec)}
              className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>新增固定收支</span>
            </button>
          </div>

          {showAddRec && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amt = Number(recAmount);
                if (!recTitle || amt <= 0) return;

                const sourceName =
                  recSourceType === 'account'
                    ? assetAccounts.find((a) => a.id === recSourceId)?.name || '銀行帳戶'
                    : creditCards.find((c) => c.id === recSourceId)?.cardName || '信用卡';

                upsertRecurringItem({
                  id: `rec-${Date.now()}`,
                  title: recTitle,
                  amount: amt,
                  type: recType,
                  cycle: recCycle,
                  dayOfMonth: Number(recDay) || 5,
                  categoryName: recType === 'income' ? '固定收入' : '固定支出',
                  emoji: recEmoji || '🔁',
                  paymentSourceType: recSourceType,
                  paymentSourceId: recSourceId,
                  paymentSourceName: sourceName,
                  isActive: true,
                  autoRecord: true,
                });
                setRecTitle('');
                setRecAmount('');
                setShowAddRec(false);
              }}
              className="toss-card p-4 space-y-3"
            >
              <div className="text-xs font-bold">新增固定支出或固定收入</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="名稱 (例: 房租、Netflix)"
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  className="toss-input col-span-2"
                />
                <input
                  type="number"
                  required
                  placeholder="每期金額"
                  value={recAmount}
                  onChange={(e) => setRecAmount(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <input
                  type="text"
                  placeholder="圖示 Emoji"
                  value={recEmoji}
                  onChange={(e) => setRecEmoji(e.target.value)}
                  className="toss-input text-center"
                />
                <select
                  value={recType}
                  onChange={(e) => setRecType(e.target.value as 'expense' | 'income')}
                  className="toss-input"
                >
                  <option value="expense">固定支出</option>
                  <option value="income">固定收入</option>
                </select>
                <select
                  value={recCycle}
                  onChange={(e) => setRecCycle(e.target.value as RecurrenceCycle)}
                  className="toss-input"
                >
                  <option value="monthly">每月一次</option>
                  <option value="quarterly">每季一次</option>
                  <option value="yearly">每年一次</option>
                </select>
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="扣款日 (1-31)"
                  value={recDay}
                  onChange={(e) => setRecDay(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <select
                  value={recSourceType}
                  onChange={(e) => {
                    const t = e.target.value as PaymentSourceType;
                    setRecSourceType(t);
                    setRecSourceId(
                      t === 'account' ? assetAccounts[0]?.id || '' : creditCards[0]?.id || ''
                    );
                  }}
                  className="toss-input"
                >
                  <option value="account">銀行/現金帳戶</option>
                  <option value="credit_card">信用卡扣款</option>
                </select>
                <select
                  value={recSourceId}
                  onChange={(e) => setRecSourceId(e.target.value)}
                  className="toss-input col-span-2"
                >
                  {recSourceType === 'account'
                    ? assetAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))
                    : creditCards.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.bankName} {c.cardName}
                        </option>
                      ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
              >
                儲存固定項目
              </button>
            </form>
          )}

          <div className="space-y-2.5">
            {recurringItems.map((item) => (
              <div
                key={item.id}
                className="toss-card p-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] flex items-center justify-center text-base shrink-0">
                    {item.emoji || <Repeat className="w-4 h-4 text-[#2563EB]" />}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8] truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-[#8B95A1] tabular-nums">
                      每月 {item.dayOfMonth} 日 · {item.paymentSourceName}
                      {item.lastRecordedPeriod ? ` · 上次入帳 ${item.lastRecordedPeriod}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      item.type === 'income' ? 'text-[#059669]' : 'text-[#191F28] dark:text-[#F2F4F8]'
                    }`}
                  >
                    {item.type === 'income' ? '+' : '-'}NT$ {item.amount.toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => triggerRecurringItemNow(item.id)}
                    className="px-2.5 py-1 rounded-lg bg-[#F0F2F6] dark:bg-[#1F2631] hover:bg-[#2563EB] hover:text-white text-[11px] font-semibold transition-colors"
                  >
                    立即入帳
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteRecurringItem(item.id)}
                    className="p-1 text-[#8B95A1] hover:text-[#F04452]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
