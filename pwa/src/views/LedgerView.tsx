import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard as CreditCardIcon,
  Landmark,
  Plus,
  Repeat,
  Sparkles,
  SplitSquareVertical,
  Trash2,
  Users,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { getCreditCardUtilization } from '../services/financeEngine';
import {
  calculateCarLoanZeroRateVsCashDiscount,
  calculateLoanSchedule,
  calculateRefinanceSavings,
  LOAN_MARKET_PRESETS,
} from '../services/loanEngine';
import {
  DebtType,
  LoanContract,
  LoanType,
  PaymentSourceType,
  RateType,
  RecurrenceCycle,
  RepaymentMethod,
} from '../types';

type LedgerSubTab = 'transactions' | 'cards' | 'installments' | 'debts' | 'loans' | 'recurring';

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
    loans,
    upsertLoan,
    deleteLoan,
    recordLoanPayment,
  } = useVault();

  const [subTab, setSubTab] = useState<LedgerSubTab>('transactions');

  // 貸款試算與攤還狀態
  const [loanMode, setLoanMode] = useState<'contracts' | 'simulator'>('contracts');
  const [loanTitle, setLoanTitle] = useState('青埔自住 新青安房貸');
  const [loanType, setLoanType] = useState<LoanType>('mortgage');
  const [loanBank, setLoanBank] = useState('臺灣銀行');
  const [loanPrincipal, setLoanPrincipal] = useState('10000000');
  const [loanMonths, setLoanMonths] = useState('480');
  const [loanRatePct, setLoanRatePct] = useState('1.775');
  const [loanRepaymentMethod, setLoanRepaymentMethod] = useState<RepaymentMethod>('grace_period');
  const [loanGraceMonths, setLoanGraceMonths] = useState('60');
  const [loanStartDate, setLoanStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [loanPaymentDay, setLoanPaymentDay] = useState('10');
  const [loanAutoPayAccId, setLoanAutoPayAccId] = useState(assetAccounts[0]?.id || '');
  const [loanExpandedContractId, setLoanExpandedContractId] = useState<string | null>(
    loans[0]?.id || null
  );
  const [loanSelectedPresetId, setLoanSelectedPresetId] = useState('preset-qing-an');

  // 車貸 0 利率與轉貸評估狀態
  const [carCashDiscount, setCarCashDiscount] = useState('60000');
  const [showCarIrrTool, setShowCarIrrTool] = useState(false);
  const [refinanceSwitchingCost, setRefinanceSwitchingCost] = useState('25000');
  const [refinanceNewRate, setRefinanceNewRate] = useState('2.185');
  const [showRefinanceTool, setShowRefinanceTool] = useState(false);

  // 貸款即時試算
  const simulatedLoanResult = useMemo(() => {
    return calculateLoanSchedule({
      totalPrincipal: Number(loanPrincipal) || 0,
      totalMonths: Number(loanMonths) || 12,
      annualRatePct: Number(loanRatePct) || 0,
      repaymentMethod: loanRepaymentMethod,
      gracePeriodMonths: Number(loanGraceMonths) || 0,
      startDate: loanStartDate,
      monthlyPaymentDay: Number(loanPaymentDay) || 1,
    });
  }, [
    loanPrincipal,
    loanMonths,
    loanRatePct,
    loanRepaymentMethod,
    loanGraceMonths,
    loanStartDate,
    loanPaymentDay,
  ]);

  // 車貸 0 利率真實 IRR 試算
  const carIrrResult = useMemo(() => {
    if (loanType !== 'car') return null;
    return calculateCarLoanZeroRateVsCashDiscount({
      carPrice: Number(loanPrincipal) || 700000,
      zeroRateLoanAmount: Number(loanPrincipal) || 700000,
      zeroRatePeriods: Number(loanMonths) || 36,
      cashDiscountAmount: Number(carCashDiscount) || 0,
    });
  }, [loanType, loanPrincipal, loanMonths, carCashDiscount]);

  // 轉增貸評估試算
  const refinanceResult = useMemo(() => {
    return calculateRefinanceSavings({
      currentRemaining: Number(loanPrincipal) || 10000000,
      currentRatePct: Number(loanRatePct) || 2.45,
      remainingMonths: Number(loanMonths) || 360,
      newRatePct: Number(refinanceNewRate) || 2.185,
      newTotalMonths: Number(loanMonths) || 360,
      switchingCosts: Number(refinanceSwitchingCost) || 25000,
    });
  }, [loanPrincipal, loanRatePct, loanMonths, refinanceNewRate, refinanceSwitchingCost]);

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
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#EBEFE6]/50 dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] overflow-x-auto no-scrollbar">
        {(
          [
            { id: 'transactions', label: '日常收支' },
            { id: 'cards', label: '信用卡' },
            { id: 'installments', label: '分期紀錄' },
            { id: 'debts', label: '借放款' },
            { id: 'loans', label: '🏦 貸款試算攤還' },
            { id: 'recurring', label: '固定收支' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 ${
              subTab === tab.id
                ? 'bg-white dark:bg-[#21262D] text-[#191F28] dark:text-[#F2F4F8] shadow-sm font-bold'
                : 'text-[#6B7684] dark:text-[#8B949E] hover:text-[#191F28] dark:hover:text-white'
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

      {/* 5. 🏦 貸款試算、還款進度與雙軌記帳 (Loans & Amortization) */}
      {subTab === 'loans' && (
        <div className="space-y-4">
          {/* 模式切換按鈕 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-[#F0F2F6] dark:bg-[#1F2631] p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setLoanMode('contracts')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  loanMode === 'contracts'
                    ? 'bg-white dark:bg-[#262C36] shadow-sm text-[#2563EB]'
                    : 'text-[#8B95A1]'
                }`}
              >
                📋 正式貸款合約 ({loans.length})
              </button>
              <button
                type="button"
                onClick={() => setLoanMode('simulator')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  loanMode === 'simulator'
                    ? 'bg-white dark:bg-[#262C36] shadow-sm text-[#2563EB]'
                    : 'text-[#8B95A1]'
                }`}
              >
                🏦 房貸車貸試算機
              </button>
            </div>
            {loanMode === 'contracts' && (
              <button
                type="button"
                onClick={() => setLoanMode('simulator')}
                className="px-3 py-1.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增貸款試算</span>
              </button>
            )}
          </div>

          {/* 模式一：正式貸款合約管理 (我的貸款負債) */}
          {loanMode === 'contracts' && (
            <div className="space-y-4">
              <div className="toss-card p-4 flex items-center justify-between">
                <div className="tabular-nums">
                  <div className="text-xs text-[#8B95A1]">生效中貸款未償本金總負債</div>
                  <div className="text-2xl font-bold text-[#F04452]">
                    -NT${' '}
                    {loans
                      .filter((l) => l.status === 'active')
                      .reduce((sum, l) => sum + l.currentRemainingPrincipal, 0)
                      .toLocaleString()}
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] font-bold">
                  {loans.filter((l) => l.status === 'active').length} 筆履約中
                </span>
              </div>

              {loans.length === 0 ? (
                <div className="toss-card p-8 text-center text-xs text-[#8B95A1] space-y-2">
                  <Landmark className="w-8 h-8 text-[#8B95A1] mx-auto opacity-40" />
                  <div>目前尚無正式貸款合約</div>
                  <button
                    type="button"
                    onClick={() => setLoanMode('simulator')}
                    className="px-3 py-1.5 rounded-xl bg-[#2563EB] text-white font-semibold text-xs inline-block mt-1"
                  >
                    開啟房貸/車貸試算並建立合約
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {loans.map((loan) => {
                    const nextUnpaidPeriod =
                      loan.schedule.find((s) => !s.isPaid) || loan.schedule[loan.schedule.length - 1];
                    const paidCount = loan.schedule.filter((s) => s.isPaid).length;
                    const progressPct = Math.round((paidCount / loan.totalMonths) * 100);
                    const isExpanded = loanExpandedContractId === loan.id;

                    return (
                      <div key={loan.id} className="toss-card p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-sm font-bold text-[#2563EB]">
                                🏦
                              </span>
                              <div>
                                <h4 className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8] flex items-center gap-1.5">
                                  <span>{loan.title}</span>
                                  {loan.status === 'settled' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                      已全數清償 🎉
                                    </span>
                                  )}
                                </h4>
                                <div className="text-xs text-[#8B95A1] tabular-nums mt-0.5">
                                  {loan.bankName} · 年利率 {loan.annualRatePct}% ·{' '}
                                  {loan.repaymentMethod === 'grace_period'
                                    ? `寬限期 ${loan.gracePeriodMonths} 月`
                                    : loan.repaymentMethod === 'equal_payment'
                                      ? '本息均攤'
                                      : loan.repaymentMethod === 'equal_principal'
                                        ? '本金均攤'
                                        : '先還利息'}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="text-right tabular-nums">
                            <div className="text-base font-bold text-[#F04452]">
                              剩餘 NT$ {loan.currentRemainingPrincipal.toLocaleString()}
                            </div>
                            <div className="text-xs text-[#8B95A1]">
                              總額 NT$ {loan.totalPrincipal.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* 還款進度條 */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs tabular-nums text-[#8B95A1]">
                            <span>
                              已還 {paidCount} / {loan.totalMonths} 期 ({progressPct}%)
                            </span>
                            <span>每月 {loan.monthlyPaymentDay} 日扣款</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#EAEDF2] dark:bg-[#262C36] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* 當期應繳款項與一鍵雙軌記帳扣款 */}
                        {loan.status === 'active' && nextUnpaidPeriod && (
                          <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] flex items-center justify-between gap-3 text-xs tabular-nums">
                            <div>
                              <div className="font-bold text-[#191F28] dark:text-white">
                                第 {nextUnpaidPeriod.period} 期待繳 (應繳日: {nextUnpaidPeriod.paymentDate})
                              </div>
                              <div className="text-[11px] text-[#8B95A1] mt-0.5">
                                本期本金 NT$ {nextUnpaidPeriod.principalPayment.toLocaleString()} + 利息 NT${' '}
                                {nextUnpaidPeriod.interestPayment.toLocaleString()}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                recordLoanPayment(
                                  loan.id,
                                  nextUnpaidPeriod.period,
                                  loan.autoDeductAccountId || assetAccounts[0]?.id
                                );
                                alert(
                                  `✅ 繳款成功！本金 NT$ ${nextUnpaidPeriod.principalPayment.toLocaleString()} 扣減負債，利息 NT$ ${nextUnpaidPeriod.interestPayment.toLocaleString()} 計入記帳支出，並已自銀行存款扣繳！`
                                );
                              }}
                              className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white font-bold text-xs whitespace-nowrap shadow-sm hover:bg-blue-700 transition-colors"
                            >
                              繳納本期款項 NT$ {nextUnpaidPeriod.totalPayment.toLocaleString()}
                            </button>
                          </div>
                        )}

                        {/* 展開逐期攤還時程表 */}
                        <div className="pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setLoanExpandedContractId(isExpanded ? null : loan.id)
                            }
                            className="text-[#2563EB] font-semibold flex items-center gap-1"
                          >
                            <span>{isExpanded ? '收合逐期攤還表' : '展開逐期攤還時程表明細'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`確定要刪除「${loan.title}」合約嗎？`)) {
                                deleteLoan(loan.id);
                              }
                            }}
                            className="text-[#8B95A1] hover:text-[#F04452] p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] max-h-64 overflow-y-auto space-y-1 text-xs tabular-nums pr-1">
                            <div className="grid grid-cols-5 text-[11px] font-bold text-[#8B95A1] pb-1 border-b border-[#EAEDF2] dark:border-[#262C36]">
                              <span>期數</span>
                              <span>應還本金</span>
                              <span>應繳利息</span>
                              <span>剩餘本金</span>
                              <span className="text-right">狀態</span>
                            </div>
                            {loan.schedule.map((item) => (
                              <div
                                key={item.period}
                                className={`grid grid-cols-5 py-1.5 items-center border-b border-[#EAEDF2]/50 dark:border-[#262C36]/50 ${
                                  item.isPaid ? 'text-[#8B95A1] line-through' : 'font-medium'
                                }`}
                              >
                                <span>第 {item.period} 期</span>
                                <span>${item.principalPayment.toLocaleString()}</span>
                                <span className="text-[#F04452]">${item.interestPayment.toLocaleString()}</span>
                                <span>${item.remainingPrincipal.toLocaleString()}</span>
                                <span className="text-right">
                                  {item.isPaid ? (
                                    <span className="text-emerald-600 font-bold">已繳納 ✓</span>
                                  ) : (
                                    <span className="text-[#2563EB] font-bold">待繳</span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 模式二：房貸/車貸試算機 (Loan Simulator) */}
          {loanMode === 'simulator' && (
            <div className="space-y-4">
              {/* 快速市場預設方案套用 */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#4E5968] dark:text-[#9BA4B0]">
                  快速套用市場主流房貸與車貸規格：
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {LOAN_MARKET_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setLoanSelectedPresetId(p.id);
                        setLoanTitle(p.title.replace(/^[^\s]+\s*/, ''));
                        setLoanType(p.loanType);
                        setLoanPrincipal(String(p.defaultPrincipal));
                        setLoanMonths(String(p.defaultMonths));
                        setLoanRatePct(String(p.defaultRatePct));
                        setLoanRepaymentMethod(p.repaymentMethod);
                        setLoanGraceMonths(String(p.gracePeriodMonths));
                      }}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        loanSelectedPresetId === p.id
                          ? 'border-[#2563EB] bg-blue-50/50 dark:bg-blue-950/30'
                          : 'border-[#EAEDF2] dark:border-[#262C36] bg-[#FFFFFF] dark:bg-[#161B22]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#191F28] dark:text-white">
                          {p.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-[#2563EB] font-bold">
                          {p.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8B95A1] line-clamp-1">
                        {p.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 試算表單 */}
              <div className="toss-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-[#2563EB]" />
                    <h3 className="text-sm font-bold">貸款自訂參數試算</h3>
                  </div>
                  <span className="text-xs text-[#8B95A1]">逐期精算攤還表</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="text-[11px] text-[#8B95A1] block mb-1">貸款名稱</label>
                    <input
                      type="text"
                      required
                      value={loanTitle}
                      onChange={(e) => setLoanTitle(e.target.value)}
                      className="toss-input"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#8B95A1] block mb-1">貸款種類</label>
                    <select
                      value={loanType}
                      onChange={(e) => setLoanType(e.target.value as LoanType)}
                      className="toss-input"
                    >
                      <option value="mortgage">🏠 房屋貸款</option>
                      <option value="car">🚗 汽車貸款</option>
                      <option value="personal">🛡️ 個人信用貸款</option>
                      <option value="revolving">🔄 理財型抵押貸款</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#8B95A1] block mb-1">承辦金融機構</label>
                    <input
                      type="text"
                      value={loanBank}
                      onChange={(e) => setLoanBank(e.target.value)}
                      className="toss-input"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#8B95A1] block mb-1">貸款總金額 (NT$)</label>
                    <input
                      type="number"
                      step="100000"
                      value={loanPrincipal}
                      onChange={(e) => setLoanPrincipal(e.target.value)}
                      className="toss-input tabular-nums font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#8B95A1] block mb-1">總期數 (月)</label>
                    <input
                      type="number"
                      step="12"
                      value={loanMonths}
                      onChange={(e) => setLoanMonths(e.target.value)}
                      className="toss-input tabular-nums font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#8B95A1] block mb-1">基準年利率 (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={loanRatePct}
                      onChange={(e) => setLoanRatePct(e.target.value)}
                      className="toss-input tabular-nums font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#8B95A1] block mb-1">還款方式</label>
                    <select
                      value={loanRepaymentMethod}
                      onChange={(e) => setLoanRepaymentMethod(e.target.value as RepaymentMethod)}
                      className="toss-input"
                    >
                      <option value="grace_period">寬限期 (前幾年只繳利息)</option>
                      <option value="equal_payment">本息均攤 (每月固定還款)</option>
                      <option value="equal_principal">本金均攤 (本金固定利息遞減)</option>
                      <option value="interest_only">先還利息 (隨借隨還理財型)</option>
                    </select>
                  </div>
                  {loanRepaymentMethod === 'grace_period' && (
                    <div>
                      <label className="text-[11px] text-[#8B95A1] block mb-1">寬限期月數</label>
                      <input
                        type="number"
                        step="12"
                        value={loanGraceMonths}
                        onChange={(e) => setLoanGraceMonths(e.target.value)}
                        className="toss-input tabular-nums"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-[11px] text-[#8B95A1] block mb-1">起貸日期</label>
                    <input
                      type="date"
                      value={loanStartDate}
                      onChange={(e) => setLoanStartDate(e.target.value)}
                      className="toss-input"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#8B95A1] block mb-1">每月扣款日</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={loanPaymentDay}
                      onChange={(e) => setLoanPaymentDay(e.target.value)}
                      className="toss-input tabular-nums"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-[#8B95A1] block mb-1">
                      預設扣款銀行存款帳戶 (自動雙軌記帳)
                    </label>
                    <select
                      value={loanAutoPayAccId}
                      onChange={(e) => setLoanAutoPayAccId(e.target.value)}
                      className="toss-input"
                    >
                      {assetAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} (餘額 NT$ {a.balance.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 專屬：車貸 0 利率 IRR 試算拆解工具 */}
                {loanType === 'car' && (
                  <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>🚗 車貸 0 利率話術拆解器 (現金折價真實 IRR 計算)</span>
                      </div>
                      <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-bold">
                        防坑必算
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-amber-800 dark:text-amber-300 block mb-0.5">
                          若改用現金買車，業務給的現金折價金額 (NT$)
                        </label>
                        <input
                          type="number"
                          step="10000"
                          value={carCashDiscount}
                          onChange={(e) => setCarCashDiscount(e.target.value)}
                          className="toss-input bg-white dark:bg-[#161B22] tabular-nums font-bold"
                        />
                      </div>
                      {carIrrResult && (
                        <div className="p-2 rounded-lg bg-white dark:bg-[#161B22] flex flex-col justify-center tabular-nums">
                          <div className="text-[10px] text-[#8B95A1]">真實年化利率 (IRR)</div>
                          <div className="text-base font-bold text-[#F04452]">
                            實質年息 {carIrrResult.impliedAnnualRatePct}%
                          </div>
                        </div>
                      )}
                    </div>
                    {carIrrResult && (
                      <p className="text-[11px] text-amber-800 dark:text-amber-300">
                        {carIrrResult.recommendation}
                      </p>
                    )}
                  </div>
                )}

                {/* 轉貸省息試算器折疊開關 */}
                <div className="pt-2 border-t border-[#EAEDF2] dark:border-[#262C36]">
                  <button
                    type="button"
                    onClick={() => setShowRefinanceTool(!showRefinanceTool)}
                    className="text-xs text-[#2563EB] font-bold flex items-center gap-1"
                  >
                    <span>{showRefinanceTool ? '收合轉貸評估' : '🔄 轉貸省息與手續費損益兩平評估'}</span>
                    {showRefinanceTool ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showRefinanceTool && (
                    <div className="mt-2 p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2 tabular-nums">
                        <div>
                          <label className="text-[10px] text-[#8B95A1] block mb-0.5">
                            轉貸新手續費規費 (例: 代書/塗銷 $25,000)
                          </label>
                          <input
                            type="number"
                            value={refinanceSwitchingCost}
                            onChange={(e) => setRefinanceSwitchingCost(e.target.value)}
                            className="toss-input"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#8B95A1] block mb-0.5">
                            新銀行提供的優惠年利率 (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={refinanceNewRate}
                            onChange={(e) => setRefinanceNewRate(e.target.value)}
                            className="toss-input"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#161B22] tabular-nums space-y-1">
                        <div className="flex justify-between font-bold">
                          <span>每月可省下利息差額：</span>
                          <span className="text-[#059669]">
                            +NT$ {Math.round(refinanceResult.monthlyCashflowDiff).toLocaleString()}/月
                          </span>
                        </div>
                        <div className="flex justify-between text-[#8B95A1]">
                          <span>手續費回本損益兩平期間：</span>
                          <span className="font-semibold text-[#191F28] dark:text-white">
                            約 {refinanceResult.breakEvenMonths} 個月
                          </span>
                        </div>
                        <div className="flex justify-between text-[#8B95A1]">
                          <span>總計省息總額：</span>
                          <span className="font-semibold text-[#2563EB]">
                            NT$ {refinanceResult.totalInterestSaved.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold mt-1 text-[#2563EB]">
                          {refinanceResult.worthIt
                            ? '💡 評估結果：利差大於轉貸成本，建議申請轉貸！'
                            : '⚠️ 評估結果：利差有限，手續費回本期過長，不建議轉貸。'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 試算結果大卡片 */}
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-3">
                  <div className="text-xs font-bold text-[#2563EB]">本方案試算還款總覽</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 tabular-nums text-center text-xs">
                    <div className="p-2 rounded-lg bg-white dark:bg-[#161B22]">
                      <div className="text-[10px] text-[#8B95A1]">首期每月還款</div>
                      <div className="text-base font-bold text-[#191F28] dark:text-white">
                        ${simulatedLoanResult.monthlyPaymentFirst.toLocaleString()}
                      </div>
                    </div>
                    {loanRepaymentMethod === 'grace_period' && (
                      <div className="p-2 rounded-lg bg-white dark:bg-[#161B22]">
                        <div className="text-[10px] text-[#8B95A1]">寬限期後月繳</div>
                        <div className="text-base font-bold text-[#F04452]">
                          ${simulatedLoanResult.monthlyPaymentAfterGrace.toLocaleString()}
                        </div>
                      </div>
                    )}
                    <div className="p-2 rounded-lg bg-white dark:bg-[#161B22]">
                      <div className="text-[10px] text-[#8B95A1]">累計應繳總利息</div>
                      <div className="text-base font-bold text-[#F04452]">
                        ${simulatedLoanResult.totalInterest.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-[#161B22]">
                      <div className="text-[10px] text-[#8B95A1]">本息總償還額</div>
                      <div className="text-base font-bold text-[#2563EB]">
                        ${simulatedLoanResult.totalRepayment.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const newContract: LoanContract = {
                        id: `loan-${Date.now()}`,
                        title: loanTitle || '個人貸款合約',
                        loanType,
                        bankName: loanBank || '指定銀行',
                        totalPrincipal: Number(loanPrincipal) || 0,
                        currentRemainingPrincipal: Number(loanPrincipal) || 0,
                        totalMonths: Number(loanMonths) || 12,
                        repaymentMethod: loanRepaymentMethod,
                        gracePeriodMonths: Number(loanGraceMonths) || 0,
                        annualRatePct: Number(loanRatePct) || 0,
                        rateType: 'fixed',
                        startDate: loanStartDate,
                        monthlyPaymentDay: Number(loanPaymentDay) || 1,
                        autoDeductAccountId: loanAutoPayAccId || undefined,
                        schedule: simulatedLoanResult.schedule,
                        status: 'active',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      };
                      upsertLoan(newContract);
                      setLoanExpandedContractId(newContract.id);
                      setLoanMode('contracts');
                      alert(`✅ 已將「${newContract.title}」成功建立為正式貸款合約並列入負債管理！`);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>💾 將此試算成果建立為正式貸款合約 (存入我的負債)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. 固定支出與固定收入 */}
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
