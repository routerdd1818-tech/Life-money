import {
  AssetAccount,
  CashflowShortfallAlert,
  CreditCard,
  DebtRecord,
  Installment,
  InsurancePolicy,
  RecurringItem,
  UpcomingDeductionItem,
} from '../types';

/**
 * 計算下一次特定每月日期 (1~31) 距離今天的日期與天數
 */
function getNextDayOfMonthInfo(dayOfMonth: number, refDate: Date): { dateStr: string; daysUntil: number } {
  const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const y = today.getFullYear();
  const m = today.getMonth();

  const maxDayThisMonth = new Date(y, m + 1, 0).getDate();
  let candidate = new Date(y, m, Math.min(dayOfMonth, maxDayThisMonth));

  if (candidate < today) {
    const maxDayNextMonth = new Date(y, m + 2, 0).getDate();
    candidate = new Date(y, m + 1, Math.min(dayOfMonth, maxDayNextMonth));
  }

  const diffMs = candidate.getTime() - today.getTime();
  const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const yyyy = candidate.getFullYear();
  const mm = String(candidate.getMonth() + 1).padStart(2, '0');
  const dd = String(candidate.getDate()).padStart(2, '0');

  return {
    dateStr: `${yyyy}-${mm}-${dd}`,
    daysUntil,
  };
}

function getDaysUntilIsoDate(isoDateStr: string, refDate: Date): number {
  const parts = isoDateStr.split('-').map(Number);
  if (parts.length !== 3) return 999;
  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 擴充功能 #4：智慧現金流水位預警引擎
 * 掃描未來 7 天內所有綁定「銀行/現金帳戶」的自動扣款（卡費、固定支出、分期、貸款、保費）
 * 比對該銀行帳戶目前餘額，若餘額不足則產生預警與缺口金額
 */
export function evaluateCashflowShortfalls(params: {
  accounts: AssetAccount[];
  cards: CreditCard[];
  recurringItems: RecurringItem[];
  installments: Installment[];
  debts: DebtRecord[];
  policies: InsurancePolicy[];
  lookaheadDays?: number;
}): {
  shortfallAlerts: CashflowShortfallAlert[];
  allUpcomingDeductions: Array<UpcomingDeductionItem & { accountName: string }>;
} {
  const windowDays = params.lookaheadDays ?? 7;
  const now = new Date();
  const deductionsByAccount = new Map<string, UpcomingDeductionItem[]>();
  const allUpcomingDeductions: Array<UpcomingDeductionItem & { accountName: string }> = [];

  const accountMap = new Map<string, AssetAccount>();
  for (const acc of params.accounts) {
    accountMap.set(acc.id, acc);
    deductionsByAccount.set(acc.id, []);
  }

  const pushDeduction = (accountId: string | undefined, item: UpcomingDeductionItem) => {
    if (!accountId) return;
    const acc = accountMap.get(accountId);
    if (!acc) return;
    const list = deductionsByAccount.get(accountId) || [];
    list.push(item);
    deductionsByAccount.set(accountId, list);
    allUpcomingDeductions.push({ ...item, accountName: acc.name });
  };

  // 1. 信用卡本期已出帳待繳金額 (若有綁定自動扣繳帳戶)
  for (const card of params.cards) {
    if (card.currentBilledAmount <= 0 || !card.autoPayAccountId) continue;
    const { dateStr, daysUntil } = getNextDayOfMonthInfo(card.dueDay, now);
    if (daysUntil >= 0 && daysUntil <= windowDays) {
      pushDeduction(card.autoPayAccountId, {
        id: `alert-cc-${card.id}`,
        title: `${card.bankName} ${card.cardName} 卡費自動扣繳`,
        date: dateStr,
        daysUntil,
        amount: card.currentBilledAmount,
        sourceType: 'credit_card',
        emoji: '💳',
      });
    }
  }

  // 2. 固定支出 (綁定銀行帳戶者)
  for (const rec of params.recurringItems) {
    if (!rec.isActive || rec.type !== 'expense' || rec.paymentSourceType !== 'account') continue;
    const { dateStr, daysUntil } = getNextDayOfMonthInfo(rec.dayOfMonth, now);
    if (daysUntil >= 0 && daysUntil <= windowDays) {
      pushDeduction(rec.paymentSourceId, {
        id: `alert-rec-${rec.id}`,
        title: `固定扣款：${rec.title}`,
        date: dateStr,
        daysUntil,
        amount: rec.amount,
        sourceType: 'recurring',
        emoji: rec.emoji || '🔁',
      });
    }
  }

  // 3. 直接從銀行帳戶扣款之分期付款
  for (const inst of params.installments) {
    if (inst.isCompleted || inst.paymentSourceType !== 'account') continue;
    const { dateStr, daysUntil } = getNextDayOfMonthInfo(inst.billingDay, now);
    if (daysUntil >= 0 && daysUntil <= windowDays) {
      pushDeduction(inst.paymentSourceId, {
        id: `alert-inst-${inst.id}`,
        title: `分期扣款：${inst.title}`,
        date: dateStr,
        daysUntil,
        amount: inst.periodAmount,
        sourceType: 'installment',
        emoji: inst.emoji || '📆',
      });
    }
  }

  // 4. 借放款/信貸車貸每月自動扣款
  for (const debt of params.debts) {
    if (
      debt.isSettled ||
      debt.type !== 'i_owe' ||
      !debt.linkedAccountId ||
      !debt.monthlyPaymentDay ||
      !debt.monthlyPaymentAmount
    ) {
      continue;
    }
    const { dateStr, daysUntil } = getNextDayOfMonthInfo(debt.monthlyPaymentDay, now);
    if (daysUntil >= 0 && daysUntil <= windowDays) {
      pushDeduction(debt.linkedAccountId, {
        id: `alert-debt-${debt.id}`,
        title: `貸款扣款：${debt.title}`,
        date: dateStr,
        daysUntil,
        amount: debt.monthlyPaymentAmount,
        sourceType: 'debt',
        emoji: '🤝',
      });
    }
  }

  // 5. 保單續期保費 (若綁定銀行帳戶且下次繳費日在 7 天內)
  for (const pol of params.policies) {
    if (!pol.isActive || pol.paymentSourceType !== 'account' || !pol.nextPaymentDate) continue;
    const daysUntil = getDaysUntilIsoDate(pol.nextPaymentDate, now);
    if (daysUntil >= 0 && daysUntil <= windowDays) {
      pushDeduction(pol.paymentSourceId, {
        id: `alert-pol-${pol.id}`,
        title: `保費扣款：${pol.insurerName} ${pol.policyName}`,
        date: pol.nextPaymentDate,
        daysUntil,
        amount: pol.premiumAmount,
        sourceType: 'insurance',
        emoji: '🛡️',
      });
    }
  }

  const shortfallAlerts: CashflowShortfallAlert[] = [];
  for (const acc of params.accounts) {
    const items = deductionsByAccount.get(acc.id) || [];
    if (items.length === 0) continue;
    const requiredAmount7Days = items.reduce((s, i) => s + i.amount, 0);
    if (requiredAmount7Days > acc.balance) {
      shortfallAlerts.push({
        accountId: acc.id,
        accountName: acc.name,
        accountEmoji: acc.emoji,
        currentBalance: acc.balance,
        requiredAmount7Days,
        shortfallAmount: requiredAmount7Days - acc.balance,
        items: items.sort((a, b) => a.daysUntil - b.daysUntil),
      });
    }
  }

  return {
    shortfallAlerts,
    allUpcomingDeductions: allUpcomingDeductions.sort((a, b) => a.daysUntil - b.daysUntil),
  };
}
