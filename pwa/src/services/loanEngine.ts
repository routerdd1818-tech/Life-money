/**
 * 貸款試算、還款進度時程與記帳整合引擎 (Loan & Debt Engine)
 * 涵蓋：
 * 1. 四大主流還款演算法：本息均攤 (Equal Payment)、本金均攤 (Equal Principal)、寬限期 (Grace Period)、先還利息 (Interest-Only)
 * 2. 階梯利率 (Tiered Rate) 與機動浮動利率支援
 * 3. 台灣主流房貸方案庫 (新青安、首購公教、理財型房貸)
 * 4. 車貸 0 利率話術 vs 現金折價之真實年化利率 (IRR) 精算
 * 5. 房貸轉增貸省息與回本年限試算 (Refinance Evaluator)
 * 6. 逐期攤還時程表產生 (Amortization Schedule) 與雙軌記帳拆帳邏輯 (本金減負債 / 利息進支出)
 */

import {
  LoanContract,
  LoanSchedulePeriod,
  LoanTierRate,
  LoanType,
  RateType,
  RepaymentMethod,
} from '../types';

export interface LoanCalcInput {
  totalPrincipal: number;          // 貸款總金額 (TWD)
  totalMonths: number;             // 貸款期數 (月)
  annualRatePct: number;          // 基準年利率 % (例: 2.185)
  repaymentMethod: RepaymentMethod;// 還款模式
  gracePeriodMonths?: number;      // 寬限期月數 (若適用)
  rateType?: RateType;             // 固定 / 階梯
  tieredRates?: LoanTierRate[];    // 階梯利率分段
  startDate?: string;              // YYYY-MM-DD
  monthlyPaymentDay?: number;      // 每月扣款日 (1-31)
}

export interface LoanCalcResult {
  monthlyPaymentFirst: number;     // 首期還款金額
  monthlyPaymentAfterGrace: number;// 寬限期後月還款金額 (若適用)
  totalInterest: number;           // 累計應繳總利息
  totalRepayment: number;          // 本息累計總償還金額
  schedule: LoanSchedulePeriod[];  // 逐期攤還明細
}

/**
 * 依期數取得當期適用之年利率
 */
export function getRateForPeriod(
  period: number,
  baseRatePct: number,
  tieredRates?: LoanTierRate[]
): number {
  if (!tieredRates || tieredRates.length === 0) return baseRatePct;
  const hit = tieredRates.find((t) => period >= t.startMonth && period <= t.endMonth);
  return hit ? hit.annualRatePct : baseRatePct;
}

/**
 * 核心：計算貸款逐期攤還時程表與總利息
 */
export function calculateLoanSchedule(input: LoanCalcInput): LoanCalcResult {
  const {
    totalPrincipal,
    totalMonths,
    annualRatePct,
    repaymentMethod,
    gracePeriodMonths = 0,
    tieredRates,
    startDate = new Date().toISOString().slice(0, 10),
    monthlyPaymentDay = 15,
  } = input;

  if (totalPrincipal <= 0 || totalMonths <= 0) {
    return {
      monthlyPaymentFirst: 0,
      monthlyPaymentAfterGrace: 0,
      totalInterest: 0,
      totalRepayment: 0,
      schedule: [],
    };
  }

  const schedule: LoanSchedulePeriod[] = [];
  let remainingPrincipal = totalPrincipal;
  let totalInterest = 0;

  const startDt = new Date(startDate);
  const startYear = startDt.getFullYear();
  const startMonth = startDt.getMonth(); // 0-based

  // 1. 本息均攤 (Equal Payment) 或 寬限期後本息均攤
  if (repaymentMethod === 'equal_payment' || repaymentMethod === 'grace_period') {
    const graceMonths = repaymentMethod === 'grace_period' ? Math.min(totalMonths - 1, Math.max(0, gracePeriodMonths)) : 0;
    const amortMonths = totalMonths - graceMonths;

    // 寬限期後之等額本息公式：PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
    const calcPmt = (p: number, rMonthly: number, n: number) => {
      if (rMonthly <= 0) return p / n;
      const factor = Math.pow(1 + rMonthly, n);
      return (p * (rMonthly * factor)) / (factor - 1);
    };

    let pmtAfterGrace = 0;

    for (let i = 1; i <= totalMonths; i++) {
      const currentYearRate = getRateForPeriod(i, annualRatePct, tieredRates);
      const monthlyRate = currentYearRate / 100 / 12;

      // 產生該期扣款預計日期
      const payDt = new Date(startYear, startMonth + i - 1, monthlyPaymentDay);
      const paymentDate = payDt.toISOString().slice(0, 10);

      // 當期利息
      const interest = Math.round(remainingPrincipal * monthlyRate);

      let principal = 0;
      let totalPay = 0;

      if (i <= graceMonths) {
        // 寬限期中：只還利息，不還本金
        principal = 0;
        totalPay = interest;
      } else {
        // 寬限期後：重新推算剩餘期數之本息均攤
        if (pmtAfterGrace === 0 || tieredRates?.length) {
          const remainingAmortMonths = totalMonths - i + 1;
          pmtAfterGrace = calcPmt(remainingPrincipal, monthlyRate, remainingAmortMonths);
        }

        totalPay = Math.round(pmtAfterGrace);
        principal = totalPay - interest;

        // 最後一期清帳調整
        if (i === totalMonths || principal > remainingPrincipal) {
          principal = remainingPrincipal;
          totalPay = principal + interest;
        }
      }

      remainingPrincipal = Math.max(0, remainingPrincipal - principal);
      totalInterest += interest;

      schedule.push({
        period: i,
        paymentDate,
        totalPayment: totalPay,
        principalPayment: principal,
        interestPayment: interest,
        remainingPrincipal,
        isPaid: false,
      });
    }

    const firstPeriod = schedule[0]?.totalPayment || 0;
    const afterGracePeriod = graceMonths > 0 && schedule[graceMonths] ? schedule[graceMonths].totalPayment : firstPeriod;

    return {
      monthlyPaymentFirst: firstPeriod,
      monthlyPaymentAfterGrace: afterGracePeriod,
      totalInterest,
      totalRepayment: totalPrincipal + totalInterest,
      schedule,
    };
  }

  // 2. 本金均攤 (Equal Principal)
  if (repaymentMethod === 'equal_principal') {
    const fixedPrincipalPerMonth = Math.floor(totalPrincipal / totalMonths);

    for (let i = 1; i <= totalMonths; i++) {
      const currentYearRate = getRateForPeriod(i, annualRatePct, tieredRates);
      const monthlyRate = currentYearRate / 100 / 12;

      const payDt = new Date(startYear, startMonth + i - 1, monthlyPaymentDay);
      const paymentDate = payDt.toISOString().slice(0, 10);

      const interest = Math.round(remainingPrincipal * monthlyRate);
      let principal = fixedPrincipalPerMonth;

      if (i === totalMonths || principal > remainingPrincipal) {
        principal = remainingPrincipal;
      }

      const totalPay = principal + interest;
      remainingPrincipal = Math.max(0, remainingPrincipal - principal);
      totalInterest += interest;

      schedule.push({
        period: i,
        paymentDate,
        totalPayment: totalPay,
        principalPayment: principal,
        interestPayment: interest,
        remainingPrincipal,
        isPaid: false,
      });
    }

    return {
      monthlyPaymentFirst: schedule[0]?.totalPayment || 0,
      monthlyPaymentAfterGrace: schedule[schedule.length - 1]?.totalPayment || 0,
      totalInterest,
      totalRepayment: totalPrincipal + totalInterest,
      schedule,
    };
  }

  // 3. 先還利息 (Interest-Only / 循環理財型)
  const monthlyRate = annualRatePct / 100 / 12;
  const monthlyInterest = Math.round(totalPrincipal * monthlyRate);

  for (let i = 1; i <= totalMonths; i++) {
    const payDt = new Date(startYear, startMonth + i - 1, monthlyPaymentDay);
    const paymentDate = payDt.toISOString().slice(0, 10);
    const isLast = i === totalMonths;
    const principal = isLast ? totalPrincipal : 0;
    const totalPay = monthlyInterest + principal;
    totalInterest += monthlyInterest;

    schedule.push({
      period: i,
      paymentDate,
      totalPayment: totalPay,
      principalPayment: principal,
      interestPayment: monthlyInterest,
      remainingPrincipal: isLast ? 0 : totalPrincipal,
      isPaid: false,
    });
  }

  return {
    monthlyPaymentFirst: monthlyInterest,
    monthlyPaymentAfterGrace: monthlyInterest + totalPrincipal,
    totalInterest,
    totalRepayment: totalPrincipal + totalInterest,
    schedule,
  };
}

/**
 * 試算：車貸「0 利率專案」vs「現金購車折價」真實年化利率 (IRR)
 * 很多車廠宣稱「70萬36期0利率」，實質上需要放棄現金折扣 (例如現金折 7 萬)
 * 實質上是借 (700,000 - 70,000) = 630,000，每期還款 (700,000 / 36) = 19,444
 */
export function calculateCarLoanZeroRateVsCashDiscount(params: {
  carPrice: number;             // 車輛原牌價 (例: 1000000)
  zeroRateLoanAmount: number;   // 0利率分期額度 (例: 700000)
  zeroRatePeriods: number;      // 0利率期數 (例: 36)
  cashDiscountAmount: number;   // 若選現金買折讓金額 (例: 70000)
}): {
  realMonthlyPayment: number;
  actualLoanReceived: number;
  impliedAnnualRatePct: number;
  recommendation: string;
} {
  const { zeroRateLoanAmount, zeroRatePeriods, cashDiscountAmount } = params;
  if (zeroRatePeriods <= 0 || zeroRateLoanAmount <= 0) {
    return {
      realMonthlyPayment: 0,
      actualLoanReceived: 0,
      impliedAnnualRatePct: 0,
      recommendation: '請填入有效分期額度與期數',
    };
  }

  const monthlyPayment = zeroRateLoanAmount / zeroRatePeriods;
  // 實質拿到的貸款淨值 = 分期總額 - 喪失的現金折讓
  const actualNetLoan = zeroRateLoanAmount - cashDiscountAmount;

  if (actualNetLoan <= 0) {
    return {
      realMonthlyPayment: monthlyPayment,
      actualLoanReceived: actualNetLoan,
      impliedAnnualRatePct: 99.9,
      recommendation: '現金折價已超越貸款金額，絕對不宜辦理分期！',
    };
  }

  // 二分逼近法求解月利率 r: actualNetLoan = sum(monthlyPayment / (1+r)^t)
  let low = 0.0001;
  let high = 0.05; // 月利率 5% -> 年化 60%
  let rMid = 0.005;

  for (let iter = 0; iter < 40; iter++) {
    rMid = (low + high) / 2;
    let npv = 0;
    for (let t = 1; t <= zeroRatePeriods; t++) {
      npv += monthlyPayment / Math.pow(1 + rMid, t);
    }

    if (Math.abs(npv - actualNetLoan) < 0.1) break;
    if (npv > actualNetLoan) {
      low = rMid;
    } else {
      high = rMid;
    }
  }

  const impliedAnnualRatePct = Math.round(rMid * 12 * 1000) / 10;
  let recommendation = '';

  if (impliedAnnualRatePct < 2.5) {
    recommendation = `實質年利率約 ${impliedAnnualRatePct}%，比一般信貸划算，可考慮選 0 利率專案！`;
  } else if (impliedAnnualRatePct < 4.0) {
    recommendation = `實質年利率約 ${impliedAnnualRatePct}%。若個人信貸可談到 2.2%~2.6%，建議選「現金折價 + 辦信貸」更省錢！`;
  } else {
    recommendation = `實質年利率高達 ${impliedAnnualRatePct}%！表面 0 利率實質利息高昂，強烈建議爭取現金折價！`;
  }

  return {
    realMonthlyPayment: Math.round(monthlyPayment),
    actualLoanReceived: actualNetLoan,
    impliedAnnualRatePct,
    recommendation,
  };
}

/**
 * 試算：房貸轉增貸省息效益與回本年限 (Refinance Evaluator)
 */
export function calculateRefinanceSavings(params: {
  currentRemaining: number;     // 現有未償本金 (例: 8000000)
  currentRatePct: number;       // 現有年利率 % (例: 2.45)
  remainingMonths: number;      // 剩餘期數 (例: 300)
  newRatePct: number;           // 新銀行年利率 % (例: 2.185)
  newTotalMonths: number;       // 新銀行申請年期 (例: 360)
  switchingCosts: number;       // 轉貸規費與代書費 (例: 15000)
}): {
  currentMonthlyPayment: number;
  newMonthlyPayment: number;
  monthlyCashflowDiff: number;
  breakEvenMonths: number;
  totalInterestSaved: number;
  worthIt: boolean;
} {
  const {
    currentRemaining,
    currentRatePct,
    remainingMonths,
    newRatePct,
    newTotalMonths,
    switchingCosts,
  } = params;

  const currentResult = calculateLoanSchedule({
    totalPrincipal: currentRemaining,
    totalMonths: remainingMonths,
    annualRatePct: currentRatePct,
    repaymentMethod: 'equal_payment',
  });

  const newResult = calculateLoanSchedule({
    totalPrincipal: currentRemaining,
    totalMonths: newTotalMonths,
    annualRatePct: newRatePct,
    repaymentMethod: 'equal_payment',
  });

  const currentMonthlyPayment = currentResult.monthlyPaymentFirst;
  const newMonthlyPayment = newResult.monthlyPaymentFirst;
  const monthlyCashflowDiff = currentMonthlyPayment - newMonthlyPayment;

  // 相同期數下的純利息差額
  const monthlyInterestDiff =
    (currentRemaining * (currentRatePct / 100)) / 12 -
    (currentRemaining * (newRatePct / 100)) / 12;

  const breakEvenMonths =
    monthlyInterestDiff > 0 ? Math.ceil(switchingCosts / monthlyInterestDiff) : 999;
  const totalInterestSaved = Math.max(0, currentResult.totalInterest - newResult.totalInterest);

  return {
    currentMonthlyPayment,
    newMonthlyPayment,
    monthlyCashflowDiff,
    breakEvenMonths,
    totalInterestSaved,
    worthIt: monthlyInterestDiff > 0 && breakEvenMonths <= 24,
  };
}

/**
 * 台灣主流房貸與車貸市場規格預設範本
 */
export const LOAN_MARKET_PRESETS: Array<{
  id: string;
  title: string;
  loanType: LoanType;
  repaymentMethod: RepaymentMethod;
  defaultPrincipal: number;
  defaultMonths: number;
  defaultRatePct: number;
  gracePeriodMonths: number;
  tieredRates?: LoanTierRate[];
  badge: string;
  description: string;
  highlights: string[];
}> = [
  {
    id: 'preset-qing-an',
    title: '🏠 財政部新青年安心成家房貸 (新青安)',
    loanType: 'mortgage',
    repaymentMethod: 'grace_period',
    defaultPrincipal: 10000000,
    defaultMonths: 480, // 40 年
    defaultRatePct: 1.775,
    gracePeriodMonths: 60, // 5 年寬限期
    tieredRates: [
      { startMonth: 1, endMonth: 36, annualRatePct: 1.775 },
      { startMonth: 37, endMonth: 480, annualRatePct: 2.15 },
    ],
    badge: '政府利息補貼 · 40年期',
    description: '本人與配偶子女無自用住宅首選，最高1000萬、最長40年與5年寬限期',
    highlights: ['前5年只繳息月付約 $14,792', '第6年起本息攤還約 $32,150', '補貼利率至2026/07'],
  },
  {
    id: 'preset-gong-jiao',
    title: '🏫 公教員工築巢優利貸 / 首購地板價',
    loanType: 'mortgage',
    repaymentMethod: 'equal_payment',
    defaultPrincipal: 12000000,
    defaultMonths: 360, // 30 年
    defaultRatePct: 2.185,
    gracePeriodMonths: 36, // 3 年
    badge: '公教專屬 · 央行地板價',
    description: '軍公教人員與各大優質首購專案，目前央行規定之最低地板利率 2.185%',
    highlights: ['30年本息均攤月繳約 $45,510', '免開辦費與優惠帳管費', '還款彈性高'],
  },
  {
    id: 'preset-wealth-revolving',
    title: '🔄 理財型房貸 (抵押循環額度)',
    loanType: 'revolving',
    repaymentMethod: 'interest_only',
    defaultPrincipal: 3000000,
    defaultMonths: 84, // 7 年續約
    defaultRatePct: 2.45,
    gracePeriodMonths: 84,
    badge: '按日計息 · 隨借隨還',
    description: '已清償之房貸本金轉為備用循環額度，有動用才計息，適合投資與週轉備用金',
    highlights: ['借 100 萬動用一個月利息約 $2,041', '無提前清償違約金', '資金調度超靈活'],
  },
  {
    id: 'preset-car-zero-rate',
    title: '🚗 新車 70 萬 36 期 0 利率分期',
    loanType: 'car',
    repaymentMethod: 'equal_principal',
    defaultPrincipal: 700000,
    defaultMonths: 36,
    defaultRatePct: 0,
    gracePeriodMonths: 0,
    badge: '原廠專案 · 留意折價陷阱',
    description: '新車業務常推之 0 利率購車專案，請務必搭配現金折價試算真實年利率',
    highlights: ['每月固定本金 $19,444', '需注意是否少拿 5~8 萬現金折價', '換算實質利率常達 3.8%~5.2%'],
  },
  {
    id: 'preset-personal-credit-car',
    title: '🛡️ 優質個人信用貸款 (買車替代方案)',
    loanType: 'personal',
    repaymentMethod: 'equal_payment',
    defaultPrincipal: 800000,
    defaultMonths: 84, // 7 年
    defaultRatePct: 2.18,
    gracePeriodMonths: 0,
    badge: '免動保設定 · 賣車自由',
    description: '以個人優質信用直接借款買車，免付 5,000 元動保設定費，車輛無抵押權隨時可轉賣',
    highlights: ['7年期月繳約 $10,290', '車輛所有權完全自由', '利率往往比中古車貸更便宜'],
  },
];
