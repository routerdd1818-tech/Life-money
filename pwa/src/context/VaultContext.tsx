import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AssetAccount,
  CalendarEventItem,
  CashflowShortfallAlert,
  CreditCard,
  DebtRecord,
  Installment,
  InsurancePolicy,
  MedicalRecord,
  NetWorthSnapshot,
  PaymentSourceType,
  RecurringItem,
  SecurityHolding,
  ScreenerStockItem,
  Transaction,
  VaultSettings,
  VehicleMaintenanceLog,
  VehicleProfile,
  WatchlistStockItem,
} from '../types';
import {
  DEFAULT_WATCHLIST,
  SCREENER_UNIVERSE,
} from '../services/stockScreenerEngine';
import {
  calculateNetWorthSummary,
  calculatePassiveIncomeSummary,
  NetWorthSummary,
  PassiveIncomeSummary,
  upsertTodayNetWorthSnapshot,
} from '../services/financeEngine';
import { evaluateCashflowShortfalls } from '../services/cashflowAlertEngine';
import { recalculateHoldingMetrics, syncAllHoldingsQuotes } from '../services/quoteService';
import { pullVaultFromSupabase, pushVaultToSupabase } from '../services/supabaseService';

const STORAGE_KEY = 'financelife_vault_v1';

function getRelativeDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_ACCOUNTS: AssetAccount[] = [
  {
    id: 'acc-richart',
    name: '台新 Richart 活存',
    type: 'bank',
    balance: 24500, // 故意設計略低於未來7天大額卡費+保費，以展示智慧現金流水位預警
    bankCode: '812',
    accountLastFour: '5588',
    interestRate: 3.5,
    colorHex: '#2563EB',
    emoji: '🏦',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc-cathay',
    name: '國泰世華 證券交割/薪轉',
    type: 'brokerage_cash',
    balance: 685000,
    bankCode: '013',
    accountLastFour: '1092',
    interestRate: 1.5,
    colorHex: '#059669',
    emoji: '🏛️',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc-cash',
    name: '隨身錢包現金',
    type: 'cash',
    balance: 6800,
    colorHex: '#475569',
    emoji: '💵',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc-linepay',
    name: 'LINE Pay / 一卡通マネー',
    type: 'digital_wallet',
    balance: 4200,
    colorHex: '#10B981',
    emoji: '📱',
    updatedAt: new Date().toISOString(),
  },
];

const todayDay = new Date().getDate();
const dueSoonDay = ((todayDay + 3 - 1) % 28) + 1;

const DEFAULT_CARDS: CreditCard[] = [
  {
    id: 'cc-esun',
    bankName: '玉山銀行',
    cardName: 'Unicard 鈦金卡',
    lastFourDigits: '8812',
    creditLimit: 200000,
    currentBilledAmount: 28600,
    unbilledAmount: 9450,
    statementDay: 15,
    dueDay: dueSoonDay, // 3天後截止繳款，觸發台新 Richart 現金流水位預警
    autoPayAccountId: 'acc-richart',
    colorHex: '#1E293B',
    notes: '主力日常消費與行動支付綁定',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cc-cathay',
    bankName: '國泰世華',
    cardName: 'CUBE 尊御卡',
    lastFourDigits: '3309',
    creditLimit: 300000,
    currentBilledAmount: 14200,
    unbilledAmount: 6800,
    statementDay: 22,
    dueDay: 10,
    autoPayAccountId: 'acc-cathay',
    colorHex: '#2563EB',
    notes: '百貨、加油、旅遊與保費分期專用',
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_INSTALLMENTS: Installment[] = [
  {
    id: 'inst-macbook',
    title: 'MacBook Pro 14" M4 零利率分期',
    totalAmount: 54000,
    totalPeriods: 12,
    paidPeriods: 4,
    periodAmount: 4500,
    startDate: getRelativeDateStr(-120),
    billingDay: 15,
    paymentSourceType: 'credit_card',
    paymentSourceId: 'cc-esun',
    paymentSourceName: '玉山銀行 Unicard',
    occupyCreditLimit: true,
    emoji: '💻',
    colorHex: '#2563EB',
    isCompleted: false,
    notes: '官網 12 期零利率，未到期額度計入玉山卡佔用額度',
  },
  {
    id: 'inst-car-ins',
    title: '富邦乙式車體險 6 期分期',
    totalAmount: 21000,
    totalPeriods: 6,
    paidPeriods: 2,
    periodAmount: 3500,
    startDate: getRelativeDateStr(-60),
    billingDay: 22,
    paymentSourceType: 'credit_card',
    paymentSourceId: 'cc-cathay',
    paymentSourceName: '國泰世華 CUBE卡',
    occupyCreditLimit: true,
    emoji: '🚗',
    colorHex: '#059669',
    isCompleted: false,
  },
];

const DEFAULT_DEBTS: DebtRecord[] = [
  {
    id: 'debt-car-loan',
    type: 'i_owe',
    title: '和潤汽車低利專案貸款',
    counterparty: '和潤企業',
    totalAmount: 480000,
    remainingAmount: 220000,
    interestRate: 2.15,
    startDate: '2025-05-10',
    dueDate: '2028-05-10',
    monthlyPaymentDay: 10,
    monthlyPaymentAmount: 10000,
    linkedAccountId: 'acc-cathay',
    isSettled: false,
    repayments: [
      {
        id: 'rep-1',
        date: getRelativeDateStr(-22),
        amount: 10000,
        accountId: 'acc-cathay',
        accountName: '國泰世華 證券交割/薪轉',
        remainingAfter: 220000,
        notes: '第 26 期自動扣繳',
      },
    ],
    notes: '每月 10 號由國泰世華自動扣款',
  },
  {
    id: 'debt-friend',
    type: 'they_owe',
    title: '代墊東京機票與住宿尾款',
    counterparty: '陳阿豪',
    totalAmount: 32000,
    remainingAmount: 16000,
    startDate: getRelativeDateStr(-20),
    dueDate: getRelativeDateStr(10),
    linkedAccountId: 'acc-richart',
    isSettled: false,
    repayments: [
      {
        id: 'rep-2',
        date: getRelativeDateStr(-10),
        amount: 16000,
        accountId: 'acc-richart',
        accountName: '台新 Richart 活存',
        remainingAfter: 16000,
        notes: '先轉帳還一半',
      },
    ],
    notes: '預計發薪日結清剩餘 $16,000',
  },
];

const DEFAULT_RECURRING: RecurringItem[] = [
  {
    id: 'rec-salary',
    title: '本業固定月薪入帳',
    amount: 78000,
    type: 'income',
    cycle: 'monthly',
    dayOfMonth: 5,
    categoryName: '薪資收入',
    emoji: '💼',
    paymentSourceType: 'account',
    paymentSourceId: 'acc-cathay',
    paymentSourceName: '國泰世華 證券交割/薪轉',
    isActive: true,
    autoRecord: true,
  },
  {
    id: 'rec-rent',
    title: '房屋租金與管理費',
    amount: 16500,
    type: 'expense',
    cycle: 'monthly',
    dayOfMonth: 6,
    categoryName: '居住房租',
    emoji: '🏠',
    paymentSourceType: 'account',
    paymentSourceId: 'acc-cathay',
    paymentSourceName: '國泰世華 證券交割/薪轉',
    isActive: true,
    autoRecord: true,
  },
  {
    id: 'rec-telecom',
    title: '中華電信 5G 與光世代',
    amount: 1399,
    type: 'expense',
    cycle: 'monthly',
    dayOfMonth: 18,
    categoryName: '通訊網路',
    emoji: '📶',
    paymentSourceType: 'credit_card',
    paymentSourceId: 'cc-esun',
    paymentSourceName: '玉山銀行 Unicard',
    isActive: true,
    autoRecord: true,
  },
  {
    id: 'rec-sub',
    title: 'Netflix + YouTube Premium + iCloud',
    amount: 780,
    type: 'expense',
    cycle: 'monthly',
    dayOfMonth: 25,
    categoryName: '數位訂閱',
    emoji: '🎬',
    paymentSourceType: 'credit_card',
    paymentSourceId: 'cc-esun',
    paymentSourceName: '玉山銀行 Unicard',
    isActive: true,
    autoRecord: true,
  },
];

const DEFAULT_HOLDINGS: SecurityHolding[] = [
  recalculateHoldingMetrics({
    id: 'hold-2330',
    symbol: '2330.TW',
    name: '台積電',
    category: 'stock',
    units: 1000,
    costBasisPerUnit: 845.0,
    currentPrice: 1065.0,
    previousClose: 1050.0,
    currency: 'TWD',
    exchangeRateToTwd: 1,
    marketValueTwd: 1065000,
    unrealizedPnlTwd: 220000,
    unrealizedReturnPct: 26.04,
    dividendFrequency: 'quarterly',
    estimatedAnnualYieldPct: 1.6,
    dividendMonths: [3, 6, 9, 12],
    linkedAccountId: 'acc-cathay',
    lastQuotedAt: new Date().toISOString(),
    quoteSource: 'yahoo',
  }),
  recalculateHoldingMetrics({
    id: 'hold-0050',
    symbol: '0050.TW',
    name: '元大台灣50',
    category: 'etf',
    units: 3000,
    costBasisPerUnit: 158.0,
    currentPrice: 196.5,
    previousClose: 194.0,
    currency: 'TWD',
    exchangeRateToTwd: 1,
    marketValueTwd: 589500,
    unrealizedPnlTwd: 115500,
    unrealizedReturnPct: 24.37,
    dividendFrequency: 'semi_annual',
    estimatedAnnualYieldPct: 2.8,
    dividendMonths: [1, 7],
    linkedAccountId: 'acc-cathay',
    lastQuotedAt: new Date().toISOString(),
    quoteSource: 'yahoo',
  }),
  recalculateHoldingMetrics({
    id: 'hold-00679b',
    symbol: '00679B.TWO',
    name: '元大美債20年',
    category: 'bond',
    units: 20000,
    costBasisPerUnit: 29.1,
    currentPrice: 29.85,
    previousClose: 29.7,
    currency: 'TWD',
    exchangeRateToTwd: 1,
    marketValueTwd: 597000,
    unrealizedPnlTwd: 15000,
    unrealizedReturnPct: 2.58,
    dividendFrequency: 'quarterly',
    estimatedAnnualYieldPct: 4.5,
    dividendMonths: [2, 5, 8, 11],
    linkedAccountId: 'acc-cathay',
    lastQuotedAt: new Date().toISOString(),
    quoteSource: 'yahoo',
  }),
  recalculateHoldingMetrics({
    id: 'hold-00937b',
    symbol: '00937B.TWO',
    name: '群益ESG投等債20+',
    category: 'bond',
    units: 25000,
    costBasisPerUnit: 15.5,
    currentPrice: 15.92,
    previousClose: 15.88,
    currency: 'TWD',
    exchangeRateToTwd: 1,
    marketValueTwd: 398000,
    unrealizedPnlTwd: 10500,
    unrealizedReturnPct: 2.71,
    dividendFrequency: 'monthly',
    estimatedAnnualYieldPct: 6.1,
    dividendMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    linkedAccountId: 'acc-cathay',
    lastQuotedAt: new Date().toISOString(),
    quoteSource: 'yahoo',
  }),
  recalculateHoldingMetrics({
    id: 'hold-voo',
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    category: 'etf',
    units: 20,
    costBasisPerUnit: 465.0,
    currentPrice: 536.0,
    previousClose: 532.5,
    currency: 'USD',
    exchangeRateToTwd: 32.18,
    marketValueTwd: 344970,
    unrealizedPnlTwd: 45696,
    unrealizedReturnPct: 15.27,
    dividendFrequency: 'quarterly',
    estimatedAnnualYieldPct: 1.3,
    dividendMonths: [3, 6, 9, 12],
    linkedAccountId: 'acc-cathay',
    lastQuotedAt: new Date().toISOString(),
    quoteSource: 'yahoo',
  }),
  recalculateHoldingMetrics({
    id: 'hold-fund-allianz',
    symbol: '0P00006B05.TW',
    name: '安聯台灣科技基金',
    category: 'fund',
    units: 1200,
    costBasisPerUnit: 215.0,
    currentPrice: 248.6,
    previousClose: 246.2,
    currency: 'TWD',
    exchangeRateToTwd: 1,
    marketValueTwd: 298320,
    unrealizedPnlTwd: 40320,
    unrealizedReturnPct: 15.63,
    dividendFrequency: 'none',
    estimatedAnnualYieldPct: 0,
    dividendMonths: [],
    linkedAccountId: 'acc-cathay',
    lastQuotedAt: new Date().toISOString(),
    quoteSource: 'fund_api',
  }),
];

const DEFAULT_VEHICLES: VehicleProfile[] = [
  {
    id: 'veh-rav4',
    name: 'Toyota RAV4 2.5 Hybrid',
    licensePlate: 'ABC-8899',
    currentMileage: 49680,
    nextInspectionDate: '2027-03-15',
    insuranceExpiryDate: '2027-01-20',
    licenseTaxMonth: 4,
    fuelTaxMonth: 7,
    consumables: [
      {
        id: 'con-oil',
        itemName: '0W-20 全合成機油 & 機油芯',
        intervalKm: 5000,
        intervalMonths: 6,
        lastReplacedDate: getRelativeDateStr(-150),
        lastReplacedMileage: 45000,
      },
      {
        id: 'con-atf',
        itemName: '變速箱油 & 煞車油',
        intervalKm: 40000,
        intervalMonths: 24,
        lastReplacedDate: '2025-11-12',
        lastReplacedMileage: 40000,
      },
      {
        id: 'con-tire',
        itemName: '米其林輪胎前後對調 & 定位',
        intervalKm: 10000,
        intervalMonths: 12,
        lastReplacedDate: '2025-11-12',
        lastReplacedMileage: 40000,
      },
      {
        id: 'con-ac',
        itemName: 'PM2.5 活性碳冷氣濾網',
        intervalKm: 15000,
        intervalMonths: 12,
        lastReplacedDate: getRelativeDateStr(-150),
        lastReplacedMileage: 45000,
      },
    ],
    logs: [
      {
        id: 'vlog-1',
        vehicleId: 'veh-rav4',
        date: getRelativeDateStr(-150),
        mileage: 45000,
        category: 'regular',
        shopName: '國都豐田 濱江服務廠',
        items: [
          { name: '0W-20 全合成機油 x4.5L', cost: 2450, updatesConsumableId: 'con-oil' },
          { name: '原廠機油濾清器 & 放油塞墊片', cost: 380 },
          { name: 'PM2.5 活性碳冷氣濾網', cost: 850, updatesConsumableId: 'con-ac' },
          { name: '定保工資', cost: 600 },
        ],
        totalCost: 4280,
        nextDueMileage: 50000,
        nextDueDate: getRelativeDateStr(6),
        notes: '技師提醒下次 50,000 km 需檢查前輪來令片厚度',
      },
      {
        id: 'vlog-2',
        vehicleId: 'veh-rav4',
        date: '2025-11-12',
        mileage: 40000,
        category: 'regular',
        shopName: '國都豐田 濱江服務廠',
        items: [
          { name: '4萬公里大保養套餐 (機油/煞車油/變速箱油)', cost: 9800, updatesConsumableId: 'con-atf' },
          { name: '四輪平衡對調與 3D 定位', cost: 1600, updatesConsumableId: 'con-tire' },
        ],
        totalCost: 11400,
        nextDueMileage: 45000,
        notes: '電瓶健康度 88% 正常',
      },
    ],
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_POLICIES: InsurancePolicy[] = [
  {
    id: 'pol-fubon-med',
    insurerName: '富邦人壽',
    policyName: '享安心住院醫療實支實付 (HSN)',
    policyNumber: 'FB-90283716',
    category: 'medical',
    insuredPerson: '本人',
    beneficiary: '法定繼承人',
    agentName: '林雅筑 主任',
    agentPhone: '0912-345-678',
    premiumAmount: 18400,
    paymentCycle: 'annual',
    nextPaymentDate: getRelativeDateStr(12),
    startYear: 2021,
    totalPaymentYears: 20,
    paidYears: 5,
    paymentSourceType: 'credit_card',
    paymentSourceId: 'cc-cathay',
    paymentSourceName: '國泰世華 CUBE卡',
    includeInNetWorth: false,
    coverageSummary: '病房費 $3,000/日、醫療雜費實支實付上限 20 萬、門診手術雜費 10 萬',
    isActive: true,
    notes: '正本理賠，看診或牙周手術記帳後可調閱收據申請',
  },
  {
    id: 'pol-cathay-save',
    insurerName: '國泰人壽',
    policyName: '美利雙收美元利率變動型終身壽險',
    policyNumber: 'CX-55192088',
    category: 'savings_invest',
    insuredPerson: '本人',
    beneficiary: '母親',
    agentName: '陳建宏 襄理',
    agentPhone: '0928-888-168',
    premiumAmount: 65000,
    paymentCycle: 'annual',
    nextPaymentDate: '2027-06-15',
    startYear: 2022,
    totalPaymentYears: 6,
    paidYears: 5,
    paymentSourceType: 'account',
    paymentSourceId: 'acc-cathay',
    paymentSourceName: '國泰世華 證券交割/薪轉',
    includeInNetWorth: true,
    estimatedCashValue: 335000,
    coverageSummary: '美元宣告利率 3.95%，目前已累積保單價值準備金約 NT$ 335,000',
    isActive: true,
    notes: '明年繳滿第 6 年即期滿複利滾存',
  },
];

const DEFAULT_MEDICAL: MedicalRecord[] = [
  {
    id: 'med-dental',
    visitDate: getRelativeDateStr(-25),
    hospitalName: '台大醫院 牙科部',
    department: '牙周病科',
    doctorName: '張博鈞',
    diagnosisSummary: '半年定期洗牙與右下智齒牙齦追蹤',
    doctorAdvice: '下次回診進行局部深層牙結石刮除，治療後 2 小時勿進食熱食',
    cost: 250,
    nextAppointmentDate: getRelativeDateStr(2),
    nextAppointmentTime: '14:30',
    appointmentNumber: '16 號',
    hasChronicPrescription: false,
    linkedPolicyId: 'pol-fubon-med',
  },
  {
    id: 'med-clinic',
    visitDate: getRelativeDateStr(-18),
    hospitalName: '書田泌尿科眼科診所',
    department: '家醫與新陳代謝科',
    doctorName: '李婉萍',
    diagnosisSummary: '年度血脂追蹤與高純度魚油/降膽固醇慢箋開立',
    doctorAdvice: '已開立 3 個月慢性病連續處方箋；下次抽血回診前請空腹 8 小時',
    cost: 520,
    nextAppointmentDate: getRelativeDateStr(65),
    nextAppointmentTime: '09:30',
    appointmentNumber: '08 號',
    hasChronicPrescription: true,
    refill2StartDate: getRelativeDateStr(5),
    refill3StartDate: getRelativeDateStr(35),
  },
];

const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    type: 'expense',
    amount: 320,
    date: getRelativeDateStr(0),
    categoryName: '餐飲美食',
    categoryEmoji: '🍱',
    paymentSourceType: 'account',
    paymentSourceId: 'acc-linepay',
    paymentSourceName: 'LINE Pay / 一卡通マネー',
    notes: '商業午餐與美式咖啡',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-2',
    type: 'expense',
    amount: 1480,
    date: getRelativeDateStr(-1),
    categoryName: '交通加油',
    categoryEmoji: '⛽',
    paymentSourceType: 'credit_card',
    paymentSourceId: 'cc-cathay',
    paymentSourceName: '國泰世華 CUBE卡',
    notes: '中油直營 95 無鉛加滿 46.5L',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-3',
    type: 'income',
    amount: 13500,
    date: getRelativeDateStr(-3),
    categoryName: '股息債息',
    categoryEmoji: '💰',
    paymentSourceType: 'account',
    paymentSourceId: 'acc-cathay',
    paymentSourceName: '國泰世華 證券交割/薪轉',
    notes: '00679B 元大美債20年 & 00937B 配息入帳',
    linkedModule: 'dividend',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_SETTINGS: VaultSettings = {
  vaultKey: 'MY-VAULT-2026',
  ownerName: '我的財務與生活金庫',
  supabaseUrl: '',
  supabaseAnonKey: '',
  theme: 'light',
  autoSyncEnabled: false,
};

interface VaultContextValue {
  // State
  transactions: Transaction[];
  creditCards: CreditCard[];
  installments: Installment[];
  debtRecords: DebtRecord[];
  recurringItems: RecurringItem[];
  assetAccounts: AssetAccount[];
  securityHoldings: SecurityHolding[];
  netWorthSnapshots: NetWorthSnapshot[];
  vehicles: VehicleProfile[];
  insurancePolicies: InsurancePolicy[];
  medicalRecords: MedicalRecord[];
  manualCalendarEvents: CalendarEventItem[];
  screenerStocks: ScreenerStockItem[];
  watchlist: WatchlistStockItem[];
  exchangeRateUsdTwd: number;
  settings: VaultSettings;
  isQuoteSyncing: boolean;
  isCloudSyncing: boolean;

  // Computed Engines
  netWorthSummary: NetWorthSummary;
  passiveIncomeSummary: PassiveIncomeSummary;
  shortfallAlerts: CashflowShortfallAlert[];

  // Actions - Screener & Watchlist
  upsertWatchlistItem: (item: WatchlistStockItem) => void;
  deleteWatchlistItem: (id: string) => void;

  // Actions - Ledger & Credit
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => string;
  deleteTransaction: (id: string) => void;
  upsertCreditCard: (card: CreditCard) => void;
  deleteCreditCard: (id: string) => void;
  payCreditCardBill: (cardId: string, fromAccountId: string, amount: number) => void;
  upsertInstallment: (inst: Installment) => void;
  deleteInstallment: (id: string) => void;
  payNextInstallmentPeriod: (installmentId: string) => void;
  upsertDebtRecord: (debt: DebtRecord) => void;
  deleteDebtRecord: (id: string) => void;
  recordDebtRepayment: (debtId: string, amount: number, accountId?: string, notes?: string) => void;
  upsertRecurringItem: (item: RecurringItem) => void;
  deleteRecurringItem: (id: string) => void;
  triggerRecurringItemNow: (itemId: string) => void;

  // Actions - Portfolio & Accounts
  upsertAssetAccount: (acc: AssetAccount) => void;
  deleteAssetAccount: (id: string) => void;
  upsertSecurityHolding: (holding: Omit<SecurityHolding, 'marketValueTwd' | 'unrealizedPnlTwd' | 'unrealizedReturnPct'>) => void;
  deleteSecurityHolding: (id: string) => void;
  refreshQuotes: () => Promise<void>;

  // Actions - Life Vault (Vehicle / Insurance / Medical / Calendar)
  upsertVehicle: (v: VehicleProfile) => void;
  addVehicleMaintenanceLog: (
    vehicleId: string,
    log: Omit<VehicleMaintenanceLog, 'id' | 'vehicleId'>,
    syncLedger?: { enabled: boolean; paymentSourceType: PaymentSourceType; paymentSourceId: string }
  ) => void;
  upsertInsurancePolicy: (
    pol: InsurancePolicy,
    syncLedgerNow?: { enabled: boolean }
  ) => void;
  deleteInsurancePolicy: (id: string) => void;
  upsertMedicalRecord: (
    med: MedicalRecord,
    syncLedger?: { enabled: boolean; paymentSourceType: PaymentSourceType; paymentSourceId: string }
  ) => void;
  deleteMedicalRecord: (id: string) => void;
  upsertManualCalendarEvent: (ev: CalendarEventItem) => void;
  deleteManualCalendarEvent: (id: string) => void;

  // Settings & Cloud Sync
  updateSettings: (partial: Partial<VaultSettings>) => void;
  syncToCloud: () => Promise<{ ok: boolean; message: string }>;
  restoreFromCloud: () => Promise<{ ok: boolean; message: string }>;
  exportVaultJson: () => string;
  importVaultJson: (rawJson: string) => boolean;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(DEFAULT_TRANSACTIONS);
  const [creditCards, setCreditCards] = useState<CreditCard[]>(DEFAULT_CARDS);
  const [installments, setInstallments] = useState<Installment[]>(DEFAULT_INSTALLMENTS);
  const [debtRecords, setDebtRecords] = useState<DebtRecord[]>(DEFAULT_DEBTS);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>(DEFAULT_RECURRING);
  const [assetAccounts, setAssetAccounts] = useState<AssetAccount[]>(DEFAULT_ACCOUNTS);
  const [securityHoldings, setSecurityHoldings] = useState<SecurityHolding[]>(DEFAULT_HOLDINGS);
  const [netWorthSnapshots, setNetWorthSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [vehicles, setVehicles] = useState<VehicleProfile[]>(DEFAULT_VEHICLES);
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>(DEFAULT_POLICIES);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(DEFAULT_MEDICAL);
  const [manualCalendarEvents, setManualCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [screenerStocks, setScreenerStocks] = useState<ScreenerStockItem[]>(SCREENER_UNIVERSE);
  const [watchlist, setWatchlist] = useState<WatchlistStockItem[]>(DEFAULT_WATCHLIST);
  const [exchangeRateUsdTwd, setExchangeRateUsdTwd] = useState<number>(32.18);
  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isQuoteSyncing, setIsQuoteSyncing] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // 1. 初始化讀取 LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
        if (Array.isArray(parsed.creditCards)) setCreditCards(parsed.creditCards);
        if (Array.isArray(parsed.installments)) setInstallments(parsed.installments);
        if (Array.isArray(parsed.debtRecords)) setDebtRecords(parsed.debtRecords);
        if (Array.isArray(parsed.recurringItems)) setRecurringItems(parsed.recurringItems);
        if (Array.isArray(parsed.assetAccounts)) setAssetAccounts(parsed.assetAccounts);
        if (Array.isArray(parsed.securityHoldings)) setSecurityHoldings(parsed.securityHoldings);
        if (Array.isArray(parsed.netWorthSnapshots)) setNetWorthSnapshots(parsed.netWorthSnapshots);
        if (Array.isArray(parsed.vehicles)) setVehicles(parsed.vehicles);
        if (Array.isArray(parsed.insurancePolicies)) setInsurancePolicies(parsed.insurancePolicies);
        if (Array.isArray(parsed.medicalRecords)) setMedicalRecords(parsed.medicalRecords);
        if (Array.isArray(parsed.manualCalendarEvents))
          setManualCalendarEvents(parsed.manualCalendarEvents);
        if (Array.isArray(parsed.watchlist)) setWatchlist(parsed.watchlist);
        if (typeof parsed.exchangeRateUsdTwd === 'number')
          setExchangeRateUsdTwd(parsed.exchangeRateUsdTwd);
        if (parsed.settings) setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
      }
    } catch {
      // use defaults
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // 2. 主題切換 (Light / Dark)
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // 3. 計算淨值與被動收入及 7 日現金流預警
  const netWorthSummary = useMemo(
    () =>
      calculateNetWorthSummary({
        accounts: assetAccounts,
        holdings: securityHoldings,
        policies: insurancePolicies,
        cards: creditCards,
        installments,
        debts: debtRecords,
      }),
    [assetAccounts, securityHoldings, insurancePolicies, creditCards, installments, debtRecords]
  );

  const passiveIncomeSummary = useMemo(
    () => calculatePassiveIncomeSummary(securityHoldings, recurringItems, installments),
    [securityHoldings, recurringItems, installments]
  );

  const { shortfallAlerts } = useMemo(
    () =>
      evaluateCashflowShortfalls({
        accounts: assetAccounts,
        cards: creditCards,
        recurringItems,
        installments,
        debts: debtRecords,
        policies: insurancePolicies,
      }),
    [assetAccounts, creditCards, recurringItems, installments, debtRecords, insurancePolicies]
  );

  // 4. 自動更新今日淨值快照與寫入 LocalStorage
  useEffect(() => {
    if (!isHydrated) return;
    const updatedSnaps = upsertTodayNetWorthSnapshot(netWorthSnapshots, netWorthSummary);
    if (
      updatedSnaps.length !== netWorthSnapshots.length ||
      updatedSnaps[updatedSnaps.length - 1]?.netWorth !==
        netWorthSnapshots[netWorthSnapshots.length - 1]?.netWorth
    ) {
      setNetWorthSnapshots(updatedSnaps);
    }

    const payload = {
      transactions,
      creditCards,
      installments,
      debtRecords,
      recurringItems,
      assetAccounts,
      securityHoldings,
      netWorthSnapshots: updatedSnaps,
      vehicles,
      insurancePolicies,
      medicalRecords,
      manualCalendarEvents,
      watchlist,
      exchangeRateUsdTwd,
      settings,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    isHydrated,
    transactions,
    creditCards,
    installments,
    debtRecords,
    recurringItems,
    assetAccounts,
    securityHoldings,
    vehicles,
    insurancePolicies,
    medicalRecords,
    manualCalendarEvents,
    watchlist,
    exchangeRateUsdTwd,
    settings,
    netWorthSummary,
  ]);

  // 5. 啟動時自動向免費報價 API 更新一次最新股價/債券ETF/基金淨值與匯率
  useEffect(() => {
    if (!isHydrated) return;
    void refreshQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  const refreshQuotes = async () => {
    if (isQuoteSyncing) return;
    setIsQuoteSyncing(true);
    try {
      const { updatedHoldings, exchangeRateUsdTwd: liveFx } = await syncAllHoldingsQuotes(
        securityHoldings,
        exchangeRateUsdTwd
      );
      setSecurityHoldings(updatedHoldings);
      setExchangeRateUsdTwd(liveFx);

      // 同步把最新報價映射到選股池與關注清單
      const priceMap = new Map<string, { price: number; prevClose?: number }>();
      for (const h of updatedHoldings) {
        priceMap.set(h.symbol.toUpperCase(), {
          price: h.currentPrice,
          prevClose: h.previousClose,
        });
      }

      if (priceMap.size > 0) {
        setScreenerStocks((prev) =>
          prev.map((s) => {
            const hit = priceMap.get(s.symbol.toUpperCase());
            if (!hit) return s;
            const dailyChangePct =
              hit.prevClose && hit.prevClose > 0
                ? Math.round(((hit.price - hit.prevClose) / hit.prevClose) * 10000) / 100
                : s.dailyChangePct;
            return { ...s, price: hit.price, dailyChangePct };
          })
        );
        setWatchlist((prev) =>
          prev.map((w) => {
            const hit = priceMap.get(w.symbol.toUpperCase());
            return hit ? { ...w, currentPrice: hit.price } : w;
          })
        );
      }
    } finally {
      setIsQuoteSyncing(false);
    }
  };

  // =====================================================
  // 核心帳務與帳戶餘額 / 信用卡額度連動邏輯
  // =====================================================

  const addTransaction = (txInput: Omit<Transaction, 'id' | 'createdAt'>): string => {
    const newId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newTx: Transaction = {
      ...txInput,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);

    // 連動更新銀行/現金帳戶餘額 或 信用卡未出帳金額
    if (txInput.type === 'transfer' && txInput.paymentSourceType === 'account' && txInput.toAccountId) {
      setAssetAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === txInput.paymentSourceId) {
            return { ...acc, balance: acc.balance - txInput.amount, updatedAt: new Date().toISOString() };
          }
          if (acc.id === txInput.toAccountId) {
            return { ...acc, balance: acc.balance + txInput.amount, updatedAt: new Date().toISOString() };
          }
          return acc;
        })
      );
    } else if (txInput.paymentSourceType === 'account') {
      const delta = txInput.type === 'income' ? txInput.amount : -txInput.amount;
      setAssetAccounts((prev) =>
        prev.map((acc) =>
          acc.id === txInput.paymentSourceId
            ? { ...acc, balance: acc.balance + delta, updatedAt: new Date().toISOString() }
            : acc
        )
      );
    } else if (txInput.paymentSourceType === 'credit_card') {
      // 刷卡消費增加未出帳金額；刷退(income)減少未出帳金額
      const delta = txInput.type === 'expense' ? txInput.amount : -txInput.amount;
      setCreditCards((prev) =>
        prev.map((card) =>
          card.id === txInput.paymentSourceId
            ? {
                ...card,
                unbilledAmount: Math.max(0, card.unbilledAmount + delta),
                updatedAt: new Date().toISOString(),
              }
            : card
        )
      );
    }

    return newId;
  };

  const deleteTransaction = (id: string) => {
    const target = transactions.find((t) => t.id === id);
    if (!target) return;

    setTransactions((prev) => prev.filter((t) => t.id !== id));

    // 反向沖銷餘額
    if (target.type === 'transfer' && target.paymentSourceType === 'account' && target.toAccountId) {
      setAssetAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === target.paymentSourceId) return { ...acc, balance: acc.balance + target.amount };
          if (acc.id === target.toAccountId) return { ...acc, balance: acc.balance - target.amount };
          return acc;
        })
      );
    } else if (target.paymentSourceType === 'account') {
      const reverseDelta = target.type === 'income' ? -target.amount : target.amount;
      setAssetAccounts((prev) =>
        prev.map((acc) =>
          acc.id === target.paymentSourceId ? { ...acc, balance: acc.balance + reverseDelta } : acc
        )
      );
    } else if (target.paymentSourceType === 'credit_card') {
      const reverseDelta = target.type === 'expense' ? -target.amount : target.amount;
      setCreditCards((prev) =>
        prev.map((card) =>
          card.id === target.paymentSourceId
            ? { ...card, unbilledAmount: Math.max(0, card.unbilledAmount + reverseDelta) }
            : card
        )
      );
    }
  };

  const upsertCreditCard = (card: CreditCard) => {
    setCreditCards((prev) => {
      const exists = prev.some((c) => c.id === card.id);
      return exists ? prev.map((c) => (c.id === card.id ? card : c)) : [...prev, card];
    });
  };

  const deleteCreditCard = (id: string) => {
    setCreditCards((prev) => prev.filter((c) => c.id !== id));
  };

  const payCreditCardBill = (cardId: string, fromAccountId: string, amount: number) => {
    const card = creditCards.find((c) => c.id === cardId);
    const acc = assetAccounts.find((a) => a.id === fromAccountId);
    if (!card || !acc || amount <= 0) return;

    // 扣減銀行帳戶餘額
    setAssetAccounts((prev) =>
      prev.map((a) =>
        a.id === fromAccountId
          ? { ...a, balance: a.balance - amount, updatedAt: new Date().toISOString() }
          : a
      )
    );

    // 沖銷信用卡本期已出帳金額（若溢繳則連同未出帳一併沖銷）
    setCreditCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        const remainingAfterBilled = amount - c.currentBilledAmount;
        const newBilled = Math.max(0, c.currentBilledAmount - amount);
        const newUnbilled =
          remainingAfterBilled > 0
            ? Math.max(0, c.unbilledAmount - remainingAfterBilled)
            : c.unbilledAmount;
        return {
          ...c,
          currentBilledAmount: newBilled,
          unbilledAmount: newUnbilled,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    // 產生繳卡費紀錄
    const newTx: Transaction = {
      id: `tx-ccpay-${Date.now()}`,
      type: 'expense',
      amount,
      date: new Date().toISOString().slice(0, 10),
      categoryName: '繳信用卡費',
      categoryEmoji: '💳',
      paymentSourceType: 'account',
      paymentSourceId: acc.id,
      paymentSourceName: acc.name,
      notes: `繳納 ${card.bankName} ${card.cardName} 帳單`,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const upsertInstallment = (inst: Installment) => {
    setInstallments((prev) => {
      const exists = prev.some((i) => i.id === inst.id);
      return exists ? prev.map((i) => (i.id === inst.id ? inst : i)) : [inst, ...prev];
    });
  };

  const deleteInstallment = (id: string) => {
    setInstallments((prev) => prev.filter((i) => i.id !== id));
  };

  const payNextInstallmentPeriod = (installmentId: string) => {
    const inst = installments.find((i) => i.id === installmentId);
    if (!inst || inst.isCompleted) return;

    const nextPaid = inst.paidPeriods + 1;
    const isCompleted = nextPaid >= inst.totalPeriods;

    setInstallments((prev) =>
      prev.map((i) =>
        i.id === installmentId ? { ...i, paidPeriods: nextPaid, isCompleted } : i
      )
    );

    addTransaction({
      type: 'expense',
      amount: inst.periodAmount,
      date: new Date().toISOString().slice(0, 10),
      categoryName: '分期扣款',
      categoryEmoji: inst.emoji || '📆',
      paymentSourceType: inst.paymentSourceType,
      paymentSourceId: inst.paymentSourceId,
      paymentSourceName: inst.paymentSourceName,
      notes: `${inst.title} (第 ${nextPaid}/${inst.totalPeriods} 期)`,
      linkedModule: 'installment',
      linkedRecordId: inst.id,
    });
  };

  const upsertDebtRecord = (debt: DebtRecord) => {
    setDebtRecords((prev) => {
      const exists = prev.some((d) => d.id === debt.id);
      return exists ? prev.map((d) => (d.id === debt.id ? debt : d)) : [debt, ...prev];
    });
  };

  const deleteDebtRecord = (id: string) => {
    setDebtRecords((prev) => prev.filter((d) => d.id !== id));
  };

  const recordDebtRepayment = (
    debtId: string,
    amount: number,
    accountId?: string,
    notes?: string
  ) => {
    const debt = debtRecords.find((d) => d.id === debtId);
    if (!debt || amount <= 0) return;

    const newRemaining = Math.max(0, debt.remainingAmount - amount);
    const isSettled = newRemaining === 0;
    const targetAccId = accountId || debt.linkedAccountId;
    const targetAcc = assetAccounts.find((a) => a.id === targetAccId);

    const repaymentItem = {
      id: `rep-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      amount,
      accountId: targetAcc?.id,
      accountName: targetAcc?.name,
      remainingAfter: newRemaining,
      notes,
    };

    setDebtRecords((prev) =>
      prev.map((d) =>
        d.id === debtId
          ? {
              ...d,
              remainingAmount: newRemaining,
              isSettled,
              repayments: [repaymentItem, ...d.repayments],
            }
          : d
      )
    );

    if (targetAcc) {
      addTransaction({
        type: debt.type === 'i_owe' ? 'expense' : 'income',
        amount,
        date: repaymentItem.date,
        categoryName: debt.type === 'i_owe' ? '貸款/欠款償還' : '借出款項收回',
        categoryEmoji: '🤝',
        paymentSourceType: 'account',
        paymentSourceId: targetAcc.id,
        paymentSourceName: targetAcc.name,
        notes: `${debt.title} (${debt.counterparty}) ${notes || ''}`.trim(),
        linkedModule: 'debt',
        linkedRecordId: debt.id,
      });
    }
  };

  const upsertRecurringItem = (item: RecurringItem) => {
    setRecurringItems((prev) => {
      const exists = prev.some((r) => r.id === item.id);
      return exists ? prev.map((r) => (r.id === item.id ? item : r)) : [item, ...prev];
    });
  };

  const deleteRecurringItem = (id: string) => {
    setRecurringItems((prev) => prev.filter((r) => r.id !== id));
  };

  const triggerRecurringItemNow = (itemId: string) => {
    const item = recurringItems.find((r) => r.id === itemId);
    if (!item) return;

    const periodKey = new Date().toISOString().slice(0, 7);
    setRecurringItems((prev) =>
      prev.map((r) => (r.id === itemId ? { ...r, lastRecordedPeriod: periodKey } : r))
    );

    addTransaction({
      type: item.type,
      amount: item.amount,
      date: new Date().toISOString().slice(0, 10),
      categoryName: item.categoryName,
      categoryEmoji: item.emoji || '🔁',
      paymentSourceType: item.paymentSourceType,
      paymentSourceId: item.paymentSourceId,
      paymentSourceName: item.paymentSourceName,
      notes: `[固定收支入帳] ${item.title}`,
      linkedModule: 'recurring',
      linkedRecordId: item.id,
    });
  };

  // =====================================================
  // 資產帳戶與證券投資管理
  // =====================================================

  const upsertAssetAccount = (acc: AssetAccount) => {
    setAssetAccounts((prev) => {
      const exists = prev.some((a) => a.id === acc.id);
      return exists ? prev.map((a) => (a.id === acc.id ? acc : a)) : [...prev, acc];
    });
  };

  const deleteAssetAccount = (id: string) => {
    setAssetAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const upsertSecurityHolding = (
    rawHolding: Omit<SecurityHolding, 'marketValueTwd' | 'unrealizedPnlTwd' | 'unrealizedReturnPct'>
  ) => {
    const computed = recalculateHoldingMetrics(
      {
        ...rawHolding,
        marketValueTwd: 0,
        unrealizedPnlTwd: 0,
        unrealizedReturnPct: 0,
      },
      rawHolding.currentPrice,
      exchangeRateUsdTwd
    );

    setSecurityHoldings((prev) => {
      const exists = prev.some((h) => h.id === computed.id);
      return exists ? prev.map((h) => (h.id === computed.id ? computed : h)) : [computed, ...prev];
    });
  };

  const deleteSecurityHolding = (id: string) => {
    setSecurityHoldings((prev) => prev.filter((h) => h.id !== id));
  };

  // =====================================================
  // 生活管家 (汽車保養、保險保單、醫療回診、整合行事曆)
  // =====================================================

  const upsertVehicle = (v: VehicleProfile) => {
    setVehicles((prev) => {
      const exists = prev.some((item) => item.id === v.id);
      return exists ? prev.map((item) => (item.id === v.id ? v : item)) : [...prev, v];
    });
  };

  const addVehicleMaintenanceLog = (
    vehicleId: string,
    logInput: Omit<VehicleMaintenanceLog, 'id' | 'vehicleId'>,
    syncLedger?: { enabled: boolean; paymentSourceType: PaymentSourceType; paymentSourceId: string }
  ) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;

    let linkedTxId: string | undefined;
    if (syncLedger?.enabled && logInput.totalCost > 0) {
      const sourceName =
        syncLedger.paymentSourceType === 'account'
          ? assetAccounts.find((a) => a.id === syncLedger.paymentSourceId)?.name || '銀行帳戶'
          : creditCards.find((c) => c.id === syncLedger.paymentSourceId)
            ? `${creditCards.find((c) => c.id === syncLedger.paymentSourceId)?.bankName} ${creditCards.find((c) => c.id === syncLedger.paymentSourceId)?.cardName}`
            : '信用卡';

      linkedTxId = addTransaction({
        type: 'expense',
        amount: logInput.totalCost,
        date: logInput.date,
        categoryName: '汽車保養維修',
        categoryEmoji: '🚗',
        paymentSourceType: syncLedger.paymentSourceType,
        paymentSourceId: syncLedger.paymentSourceId,
        paymentSourceName: sourceName,
        notes: `[${vehicle.name}] ${logInput.shopName} (${logInput.mileage.toLocaleString()} km) - ${logInput.items.map((i) => i.name).join('、')}`,
        attachmentUrl: logInput.attachmentUrl,
        linkedModule: 'vehicle',
      });
    }

    const newLog: VehicleMaintenanceLog = {
      ...logInput,
      id: `vlog-${Date.now()}`,
      vehicleId,
      linkedTransactionId: linkedTxId,
    };

    const updatedConsumableIds = new Set(
      logInput.items.map((i) => i.updatesConsumableId).filter(Boolean)
    );

    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id !== vehicleId) return v;
        return {
          ...v,
          currentMileage: Math.max(v.currentMileage, logInput.mileage),
          consumables: v.consumables.map((con) =>
            updatedConsumableIds.has(con.id)
              ? {
                  ...con,
                  lastReplacedDate: logInput.date,
                  lastReplacedMileage: logInput.mileage,
                }
              : con
          ),
          logs: [newLog, ...v.logs],
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const upsertInsurancePolicy = (
    pol: InsurancePolicy,
    syncLedgerNow?: { enabled: boolean }
  ) => {
    setInsurancePolicies((prev) => {
      const exists = prev.some((p) => p.id === pol.id);
      return exists ? prev.map((p) => (p.id === pol.id ? pol : p)) : [pol, ...prev];
    });

    if (syncLedgerNow?.enabled && pol.premiumAmount > 0) {
      addTransaction({
        type: 'expense',
        amount: pol.premiumAmount,
        date: new Date().toISOString().slice(0, 10),
        categoryName: '保險保費',
        categoryEmoji: '🛡️',
        paymentSourceType: pol.paymentSourceType,
        paymentSourceId: pol.paymentSourceId,
        paymentSourceName: pol.paymentSourceName,
        notes: `[保單繳費] ${pol.insurerName} - ${pol.policyName} (${pol.insuredPerson})`,
        attachmentUrl: pol.attachmentUrl,
        linkedModule: 'insurance',
        linkedRecordId: pol.id,
      });
    }
  };

  const deleteInsurancePolicy = (id: string) => {
    setInsurancePolicies((prev) => prev.filter((p) => p.id !== id));
  };

  const upsertMedicalRecord = (
    med: MedicalRecord,
    syncLedger?: { enabled: boolean; paymentSourceType: PaymentSourceType; paymentSourceId: string }
  ) => {
    let linkedTxId = med.linkedTransactionId;

    if (syncLedger?.enabled && med.cost > 0 && !linkedTxId) {
      const sourceName =
        syncLedger.paymentSourceType === 'account'
          ? assetAccounts.find((a) => a.id === syncLedger.paymentSourceId)?.name || '銀行/現金'
          : creditCards.find((c) => c.id === syncLedger.paymentSourceId)?.cardName || '信用卡';

      linkedTxId = addTransaction({
        type: 'expense',
        amount: med.cost,
        date: med.visitDate,
        categoryName: '醫療保健',
        categoryEmoji: '🏥',
        paymentSourceType: syncLedger.paymentSourceType,
        paymentSourceId: syncLedger.paymentSourceId,
        paymentSourceName: sourceName,
        notes: `[醫療回診] ${med.hospitalName} ${med.department} - ${med.diagnosisSummary}`,
        attachmentUrl: med.attachmentUrl,
        linkedModule: 'medical',
        linkedRecordId: med.id,
      });
    }

    const finalMed: MedicalRecord = {
      ...med,
      linkedTransactionId: linkedTxId,
    };

    setMedicalRecords((prev) => {
      const exists = prev.some((m) => m.id === finalMed.id);
      return exists ? prev.map((m) => (m.id === finalMed.id ? finalMed : m)) : [finalMed, ...prev];
    });
  };

  const deleteMedicalRecord = (id: string) => {
    setMedicalRecords((prev) => prev.filter((m) => m.id !== id));
  };

  const upsertManualCalendarEvent = (ev: CalendarEventItem) => {
    setManualCalendarEvents((prev) => {
      const exists = prev.some((e) => e.id === ev.id);
      return exists ? prev.map((e) => (e.id === ev.id ? ev : e)) : [ev, ...prev];
    });
  };

  const deleteManualCalendarEvent = (id: string) => {
    setManualCalendarEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const upsertWatchlistItem = (item: WatchlistStockItem) => {
    setWatchlist((prev) => {
      const exists = prev.some(
        (w) => w.id === item.id || w.symbol.toUpperCase() === item.symbol.toUpperCase()
      );
      return exists
        ? prev.map((w) =>
            w.id === item.id || w.symbol.toUpperCase() === item.symbol.toUpperCase() ? item : w
          )
        : [item, ...prev];
    });
  };

  const deleteWatchlistItem = (id: string) => {
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
  };

  // =====================================================
  // 系統設定與 Supabase 雙向同步
  // =====================================================

  const updateSettings = (partial: Partial<VaultSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const syncToCloud = async () => {
    setIsCloudSyncing(true);
    try {
      const res = await pushVaultToSupabase(settings, {
        transactions,
        credit_cards: creditCards,
        installments,
        debt_records: debtRecords,
        recurring_items: recurringItems,
        asset_accounts: assetAccounts,
        security_holdings: securityHoldings,
        net_worth_snapshots: netWorthSnapshots,
        vehicles,
        insurance_policies: insurancePolicies,
        medical_records: medicalRecords,
        manual_calendar_events: manualCalendarEvents,
        watchlist,
        exchange_rate_usd_twd: exchangeRateUsdTwd,
      });
      if (res.ok && res.syncedAt) {
        updateSettings({ lastSyncedAt: res.syncedAt });
      }
      return { ok: res.ok, message: res.message };
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const restoreFromCloud = async () => {
    setIsCloudSyncing(true);
    try {
      const res = await pullVaultFromSupabase(settings);
      if (res.ok && res.data) {
        const d = res.data;
        setTransactions(d.transactions || []);
        setCreditCards(d.credit_cards || []);
        setInstallments(d.installments || []);
        setDebtRecords(d.debt_records || []);
        setRecurringItems(d.recurring_items || []);
        setAssetAccounts(d.asset_accounts || []);
        setSecurityHoldings(d.security_holdings || []);
        setNetWorthSnapshots(d.net_worth_snapshots || []);
        setVehicles(d.vehicles || []);
        setInsurancePolicies(d.insurance_policies || []);
        setMedicalRecords(d.medical_records || []);
        setManualCalendarEvents(d.manual_calendar_events || []);
        if (Array.isArray(d.watchlist)) setWatchlist(d.watchlist);
        if (typeof d.exchange_rate_usd_twd === 'number') {
          setExchangeRateUsdTwd(d.exchange_rate_usd_twd);
        }
        updateSettings({ lastSyncedAt: d.updated_at, ownerName: d.owner_name });
      }
      return { ok: res.ok, message: res.message };
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const exportVaultJson = () => {
    return JSON.stringify(
      {
        transactions,
        creditCards,
        installments,
        debtRecords,
        recurringItems,
        assetAccounts,
        securityHoldings,
        netWorthSnapshots,
        vehicles,
        insurancePolicies,
        medicalRecords,
        manualCalendarEvents,
        watchlist,
        exchangeRateUsdTwd,
        settings,
      },
      null,
      2
    );
  };

  const importVaultJson = (rawJson: string): boolean => {
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
      if (Array.isArray(parsed.creditCards)) setCreditCards(parsed.creditCards);
      if (Array.isArray(parsed.installments)) setInstallments(parsed.installments);
      if (Array.isArray(parsed.debtRecords)) setDebtRecords(parsed.debtRecords);
      if (Array.isArray(parsed.recurringItems)) setRecurringItems(parsed.recurringItems);
      if (Array.isArray(parsed.assetAccounts)) setAssetAccounts(parsed.assetAccounts);
      if (Array.isArray(parsed.securityHoldings)) setSecurityHoldings(parsed.securityHoldings);
      if (Array.isArray(parsed.netWorthSnapshots)) setNetWorthSnapshots(parsed.netWorthSnapshots);
      if (Array.isArray(parsed.vehicles)) setVehicles(parsed.vehicles);
      if (Array.isArray(parsed.insurancePolicies)) setInsurancePolicies(parsed.insurancePolicies);
      if (Array.isArray(parsed.medicalRecords)) setMedicalRecords(parsed.medicalRecords);
      if (Array.isArray(parsed.manualCalendarEvents))
        setManualCalendarEvents(parsed.manualCalendarEvents);
      if (Array.isArray(parsed.watchlist)) setWatchlist(parsed.watchlist);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <VaultContext.Provider
      value={{
        transactions,
        creditCards,
        installments,
        debtRecords,
        recurringItems,
        assetAccounts,
        securityHoldings,
        netWorthSnapshots,
        vehicles,
        insurancePolicies,
        medicalRecords,
        manualCalendarEvents,
        screenerStocks,
        watchlist,
        exchangeRateUsdTwd,
        settings,
        isQuoteSyncing,
        isCloudSyncing,
        netWorthSummary,
        passiveIncomeSummary,
        shortfallAlerts,
        upsertWatchlistItem,
        deleteWatchlistItem,
        addTransaction,
        deleteTransaction,
        upsertCreditCard,
        deleteCreditCard,
        payCreditCardBill,
        upsertInstallment,
        deleteInstallment,
        payNextInstallmentPeriod,
        upsertDebtRecord,
        deleteDebtRecord,
        recordDebtRepayment,
        upsertRecurringItem,
        deleteRecurringItem,
        triggerRecurringItemNow,
        upsertAssetAccount,
        deleteAssetAccount,
        upsertSecurityHolding,
        deleteSecurityHolding,
        refreshQuotes,
        upsertVehicle,
        addVehicleMaintenanceLog,
        upsertInsurancePolicy,
        deleteInsurancePolicy,
        upsertMedicalRecord,
        deleteMedicalRecord,
        upsertManualCalendarEvent,
        deleteManualCalendarEvent,
        updateSettings,
        syncToCloud,
        restoreFromCloud,
        exportVaultJson,
        importVaultJson,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) {
    throw new Error('useVault must be used inside VaultProvider');
  }
  return ctx;
}
