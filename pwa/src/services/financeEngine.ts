import {
  AssetAccount,
  CalendarEventItem,
  CreditCard,
  DebtRecord,
  Installment,
  InsurancePolicy,
  MedicalRecord,
  NetWorthSnapshot,
  RecurringItem,
  SecurityHolding,
  VehicleProfile,
} from '../types';

export interface NetWorthSummary {
  cashAndBankTotal: number;
  investmentTotal: number;
  insuranceCashValueTotal: number;
  receivablesTotal: number;
  totalAssets: number;
  creditCardLiabilityTotal: number;
  debtLiabilityTotal: number;
  installmentRemainingTotal: number;
  totalLiabilities: number;
  netWorth: number;
}

export interface PassiveIncomeSummary {
  annualPassiveIncomeTwd: number;
  monthlyAveragePassiveIncomeTwd: number;
  monthlyFixedExpenseTwd: number;
  coverageRatioPct: number;
  monthlyBreakdown: number[]; // index 0 = 1月 ... index 11 = 12月
}

/**
 * 計算單張信用卡之總佔用額度與可用額度
 */
export function getCreditCardUtilization(
  card: CreditCard,
  installments: Installment[]
): {
  usedAmount: number;
  installmentUnpaidOnCard: number;
  availableCredit: number;
  utilizationPct: number;
} {
  const installmentUnpaidOnCard = installments
    .filter(
      (inst) =>
        !inst.isCompleted &&
        inst.paymentSourceType === 'credit_card' &&
        inst.paymentSourceId === card.id &&
        inst.occupyCreditLimit
    )
    .reduce((sum, inst) => {
      const remainingPeriods = Math.max(0, inst.totalPeriods - inst.paidPeriods);
      return sum + remainingPeriods * inst.periodAmount;
    }, 0);

  const usedAmount = card.currentBilledAmount + card.unbilledAmount + installmentUnpaidOnCard;
  const availableCredit = Math.max(0, card.creditLimit - usedAmount);
  const utilizationPct =
    card.creditLimit > 0 ? Math.min(100, Math.round((usedAmount / card.creditLimit) * 1000) / 10) : 0;

  return {
    usedAmount,
    installmentUnpaidOnCard,
    availableCredit,
    utilizationPct,
  };
}

/**
 * 計算全資產與負債總覽 (Net Worth Summary)
 */
export function calculateNetWorthSummary(params: {
  accounts: AssetAccount[];
  holdings: SecurityHolding[];
  policies: InsurancePolicy[];
  cards: CreditCard[];
  installments: Installment[];
  debts: DebtRecord[];
}): NetWorthSummary {
  const cashAndBankTotal = params.accounts.reduce((sum, a) => sum + a.balance, 0);
  const investmentTotal = params.holdings.reduce((sum, h) => sum + h.marketValueTwd, 0);
  const insuranceCashValueTotal = params.policies
    .filter((p) => p.isActive && p.includeInNetWorth && (p.estimatedCashValue || 0) > 0)
    .reduce((sum, p) => sum + (p.estimatedCashValue || 0), 0);

  const receivablesTotal = params.debts
    .filter((d) => !d.isSettled && d.type === 'they_owe')
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  const creditCardLiabilityTotal = params.cards.reduce(
    (sum, c) => sum + c.currentBilledAmount + c.unbilledAmount,
    0
  );

  const installmentRemainingTotal = params.installments
    .filter((i) => !i.isCompleted)
    .reduce((sum, i) => sum + Math.max(0, i.totalPeriods - i.paidPeriods) * i.periodAmount, 0);

  const debtLiabilityTotal = params.debts
    .filter((d) => !d.isSettled && d.type === 'i_owe')
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  const totalAssets =
    cashAndBankTotal + investmentTotal + insuranceCashValueTotal + receivablesTotal;
  const totalLiabilities =
    creditCardLiabilityTotal + debtLiabilityTotal + installmentRemainingTotal;
  const netWorth = totalAssets - totalLiabilities;

  return {
    cashAndBankTotal,
    investmentTotal,
    insuranceCashValueTotal,
    receivablesTotal,
    totalAssets,
    creditCardLiabilityTotal,
    debtLiabilityTotal,
    installmentRemainingTotal,
    totalLiabilities,
    netWorth,
  };
}

/**
 * 擴充功能 #3：計算股息 / 債息被動收入 12 個月分佈與「固定剛性支出覆蓋率」
 */
export function calculatePassiveIncomeSummary(
  holdings: SecurityHolding[],
  recurringItems: RecurringItem[],
  installments: Installment[]
): PassiveIncomeSummary {
  const monthlyBreakdown = Array<number>(12).fill(0);
  let annualPassiveIncomeTwd = 0;

  for (const h of holdings) {
    const yieldPct = h.estimatedAnnualYieldPct || 0;
    if (yieldPct <= 0 || h.marketValueTwd <= 0) continue;

    const annualDiv = Math.round(h.marketValueTwd * (yieldPct / 100));
    annualPassiveIncomeTwd += annualDiv;

    const months =
      h.dividendMonths && h.dividendMonths.length > 0
        ? h.dividendMonths
        : h.dividendFrequency === 'monthly'
          ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
          : h.dividendFrequency === 'quarterly'
            ? [3, 6, 9, 12]
            : h.dividendFrequency === 'semi_annual'
              ? [1, 7]
              : [7];

    const perPayout = Math.round(annualDiv / months.length);
    for (const m of months) {
      if (m >= 1 && m <= 12) {
        monthlyBreakdown[m - 1] += perPayout;
      }
    }
  }

  const monthlyAveragePassiveIncomeTwd = Math.round(annualPassiveIncomeTwd / 12);

  // 計算每月固定剛性支出 (含每月固定支出 + 季/年攤提 + 進行中分期每期金額)
  const recurringMonthlyExpense = recurringItems
    .filter((r) => r.isActive && r.type === 'expense')
    .reduce((sum, r) => {
      if (r.cycle === 'monthly') return sum + r.amount;
      if (r.cycle === 'quarterly') return sum + Math.round(r.amount / 3);
      return sum + Math.round(r.amount / 12);
    }, 0);

  const activeInstallmentMonthly = installments
    .filter((i) => !i.isCompleted)
    .reduce((sum, i) => sum + i.periodAmount, 0);

  const monthlyFixedExpenseTwd = recurringMonthlyExpense + activeInstallmentMonthly;
  const coverageRatioPct =
    monthlyFixedExpenseTwd > 0
      ? Math.round((monthlyAveragePassiveIncomeTwd / monthlyFixedExpenseTwd) * 1000) / 10
      : 0;

  return {
    annualPassiveIncomeTwd,
    monthlyAveragePassiveIncomeTwd,
    monthlyFixedExpenseTwd,
    coverageRatioPct,
    monthlyBreakdown,
  };
}

/**
 * 產生指定月份之 YYYY-MM-DD 字串
 */
function formatYearMonthDay(year: number, month1Based: number, day: number): string {
  const maxDay = new Date(year, month1Based, 0).getDate();
  const safeDay = Math.min(Math.max(1, day), maxDay);
  const mm = String(month1Based).padStart(2, '0');
  const dd = String(safeDay).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * 全域整合行事曆事件聚合器：
 * 將「自訂行程、信用卡結帳/繳款、分期扣款、借放款到期、固定收支、汽車保養/驗車/保險、保單續期扣款、醫療回診/慢箋領藥」
 * 自動投影至指定年份與月份 (及前後各 1 個月)
 */
export function buildUnifiedCalendarEvents(params: {
  targetYear: number;
  targetMonth1Based: number; // 1 ~ 12
  manualEvents: CalendarEventItem[];
  cards: CreditCard[];
  installments: Installment[];
  debts: DebtRecord[];
  recurringItems: RecurringItem[];
  vehicles: VehicleProfile[];
  policies: InsurancePolicy[];
  medicalRecords: MedicalRecord[];
}): CalendarEventItem[] {
  const events: CalendarEventItem[] = [...params.manualEvents];

  // 產生前一個月、當月、下一個月三個月份的週期性事件，方便首頁「未來7日」與跨月月曆檢視
  const monthOffsets = [-1, 0, 1];
  for (const offset of monthOffsets) {
    const d = new Date(params.targetYear, params.targetMonth1Based - 1 + offset, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;

    // 1. 信用卡結帳日與繳款截止日
    for (const card of params.cards) {
      events.push({
        id: `cc-stmt-${card.id}-${y}-${m}`,
        title: `${card.bankName} ${card.cardName} 結帳日`,
        date: formatYearMonthDay(y, m, card.statementDay),
        source: 'credit_card',
        sourceRecordId: card.id,
        amount: card.unbilledAmount,
        colorHex: '#64748B',
        emoji: '🧾',
        notes: `未出帳累計 NT$ ${card.unbilledAmount.toLocaleString()}`,
      });

      events.push({
        id: `cc-due-${card.id}-${y}-${m}`,
        title: `${card.bankName} ${card.cardName} 繳款截止`,
        date: formatYearMonthDay(y, m, card.dueDay),
        source: 'credit_card',
        sourceRecordId: card.id,
        amount: card.currentBilledAmount,
        colorHex: '#F04452',
        emoji: '💳',
        notes: `本期應繳 NT$ ${card.currentBilledAmount.toLocaleString()}`,
      });
    }

    // 2. 分期付款每月扣款日
    for (const inst of params.installments) {
      if (inst.isCompleted) continue;
      events.push({
        id: `inst-${inst.id}-${y}-${m}`,
        title: `分期：${inst.title} (${inst.paidPeriods + 1}/${inst.totalPeriods}期)`,
        date: formatYearMonthDay(y, m, inst.billingDay),
        source: 'installment',
        sourceRecordId: inst.id,
        amount: inst.periodAmount,
        colorHex: '#7C3AED',
        emoji: inst.emoji || '📆',
        notes: `透過 ${inst.paymentSourceName} 扣款`,
      });
    }

    // 3. 固定收支扣款/入帳日
    for (const rec of params.recurringItems) {
      if (!rec.isActive) continue;
      if (rec.cycle === 'yearly' && rec.monthOfYear && rec.monthOfYear !== m) continue;
      events.push({
        id: `rec-${rec.id}-${y}-${m}`,
        title: `${rec.type === 'income' ? '固定收入' : '固定支出'}：${rec.title}`,
        date: formatYearMonthDay(y, m, rec.dayOfMonth),
        source: 'recurring',
        sourceRecordId: rec.id,
        amount: rec.amount,
        colorHex: rec.type === 'income' ? '#059669' : '#2563EB',
        emoji: rec.emoji || '🔁',
        notes: `${rec.paymentSourceName}`,
      });
    }

    // 4. 按月攤還貸款扣款日
    for (const debt of params.debts) {
      if (debt.isSettled) continue;
      if (debt.monthlyPaymentDay && debt.monthlyPaymentAmount) {
        events.push({
          id: `debt-mo-${debt.id}-${y}-${m}`,
          title: `${debt.type === 'i_owe' ? '貸款還款' : '應收分期'}：${debt.title}`,
          date: formatYearMonthDay(y, m, debt.monthlyPaymentDay),
          source: 'debt',
          sourceRecordId: debt.id,
          amount: debt.monthlyPaymentAmount,
          colorHex: '#D97706',
          emoji: '🤝',
          notes: `對象：${debt.counterparty} (剩餘 $${debt.remainingAmount.toLocaleString()})`,
        });
      }
    }
  }

  // 5. 借放款單次到期日
  for (const debt of params.debts) {
    if (!debt.isSettled && debt.dueDate) {
      events.push({
        id: `debt-due-${debt.id}`,
        title: `${debt.type === 'i_owe' ? '還款到期' : '收款到期'}：${debt.title}`,
        date: debt.dueDate,
        source: 'debt',
        sourceRecordId: debt.id,
        amount: debt.remainingAmount,
        colorHex: '#D97706',
        emoji: '🤝',
        notes: `對象：${debt.counterparty}`,
      });
    }
  }

  // 6. 汽車驗車日、車險到期日、下次定保預定日
  for (const v of params.vehicles) {
    if (v.nextInspectionDate) {
      events.push({
        id: `veh-insp-${v.id}`,
        title: `🚗 ${v.name} (${v.licensePlate}) 定期驗車到期`,
        date: v.nextInspectionDate,
        source: 'vehicle',
        sourceRecordId: v.id,
        colorHex: '#0D9488',
        emoji: '🚗',
      });
    }
    if (v.insuranceExpiryDate) {
      events.push({
        id: `veh-ins-${v.id}`,
        title: `🛡️ ${v.name} 車險續保到期`,
        date: v.insuranceExpiryDate,
        source: 'vehicle',
        sourceRecordId: v.id,
        colorHex: '#0D9488',
        emoji: '🚗',
      });
    }
    for (const log of v.logs) {
      if (log.nextDueDate) {
        events.push({
          id: `veh-log-due-${log.id}`,
          title: `🔧 ${v.name} 預約定期保養`,
          date: log.nextDueDate,
          source: 'vehicle',
          sourceRecordId: v.id,
          colorHex: '#0D9488',
          emoji: '🔧',
          notes: log.nextDueMileage ? `或達 ${log.nextDueMileage.toLocaleString()} km` : undefined,
        });
      }
    }
  }

  // 7. 保單下次應繳保費日
  for (const pol of params.policies) {
    if (!pol.isActive || !pol.nextPaymentDate) continue;
    events.push({
      id: `pol-pay-${pol.id}`,
      title: `🛡️ 保費扣款：${pol.insurerName} ${pol.policyName}`,
      date: pol.nextPaymentDate,
      source: 'insurance',
      sourceRecordId: pol.id,
      amount: pol.premiumAmount,
      colorHex: '#4F46E5',
      emoji: '🛡️',
      notes: `被保人：${pol.insuredPerson} · 扣款：${pol.paymentSourceName}`,
    });
  }

  // 8. 醫療回診日與慢箋領藥日
  for (const med of params.medicalRecords) {
    if (med.nextAppointmentDate) {
      events.push({
        id: `med-next-${med.id}`,
        title: `🏥 回診：${med.hospitalName} ${med.department}`,
        date: med.nextAppointmentDate,
        time: med.nextAppointmentTime,
        source: 'medical',
        sourceRecordId: med.id,
        colorHex: '#E11D48',
        emoji: '🏥',
        notes: `${med.doctorName ? `${med.doctorName} 醫師 ` : ''}${med.appointmentNumber ? `(${med.appointmentNumber}) ` : ''}${med.doctorAdvice || ''}`,
      });
    }
    if (med.hasChronicPrescription && med.refill2StartDate) {
      events.push({
        id: `med-refill2-${med.id}`,
        title: `💊 慢箋第 2 次領藥：${med.hospitalName}`,
        date: med.refill2StartDate,
        source: 'medical',
        sourceRecordId: med.id,
        colorHex: '#E11D48',
        emoji: '💊',
      });
    }
    if (med.hasChronicPrescription && med.refill3StartDate) {
      events.push({
        id: `med-refill3-${med.id}`,
        title: `💊 慢箋第 3 次領藥：${med.hospitalName}`,
        date: med.refill3StartDate,
        source: 'medical',
        sourceRecordId: med.id,
        colorHex: '#E11D48',
        emoji: '💊',
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 更新或寫入今日淨值快照
 */
export function upsertTodayNetWorthSnapshot(
  snapshots: NetWorthSnapshot[],
  summary: NetWorthSummary
): NetWorthSnapshot[] {
  const today = new Date().toISOString().slice(0, 10);
  const newSnap: NetWorthSnapshot = {
    date: today,
    cashAndBankTotal: summary.cashAndBankTotal,
    investmentTotal: summary.investmentTotal,
    insuranceCashValueTotal: summary.insuranceCashValueTotal,
    receivablesTotal: summary.receivablesTotal,
    creditCardLiabilityTotal: summary.creditCardLiabilityTotal,
    debtLiabilityTotal: summary.debtLiabilityTotal + summary.installmentRemainingTotal,
    netWorth: summary.netWorth,
  };

  const filtered = snapshots.filter((s) => s.date !== today);
  return [...filtered, newSnap].sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
}
