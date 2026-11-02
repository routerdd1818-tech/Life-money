import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AssetAccount,
  CalendarEventItem,
  CashflowShortfallAlert,
  CreditCard,
  DebtRecord,
  ExchangeRatesTable,
  Installment,
  InsurancePolicy,
  LoanContract,
  MedicalRecord,
  NetWorthSnapshot,
  PaymentSourceType,
  RecurringItem,
  SavingsGoal,
  SecurityHolding,
  ScreenerStockItem,
  SupportedCurrency,
  TradePlanStage,
  Transaction,
  UserProfile,
  UserTradePlan,
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
import {
  DEFAULT_EXCHANGE_RATES,
  recalculateHoldingMetrics,
  syncAllHoldingsQuotes,
} from '../services/quoteService';
import { calculateLoanSchedule } from '../services/loanEngine';
import {
  getSupabaseClient,
  pullVaultFromSupabase,
  pushVaultToSupabase,
} from '../services/supabaseService';

const STORAGE_KEY = 'financelife_vault_v2';

function getRelativeDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_ACCOUNTS: AssetAccount[] = [];
const DEFAULT_LOANS: LoanContract[] = [];
const DEFAULT_SAVINGS_GOALS: SavingsGoal[] = [];
const DEFAULT_TRADE_PLANS: UserTradePlan[] = [];
const DEFAULT_CARDS: CreditCard[] = [];
const DEFAULT_INSTALLMENTS: Installment[] = [];
const DEFAULT_DEBTS: DebtRecord[] = [];
const DEFAULT_RECURRING: RecurringItem[] = [];
const DEFAULT_HOLDINGS: SecurityHolding[] = [];
const DEFAULT_VEHICLES: VehicleProfile[] = [];
const DEFAULT_POLICIES: InsurancePolicy[] = [];
const DEFAULT_MEDICAL: MedicalRecord[] = [];
const DEFAULT_TRANSACTIONS: Transaction[] = [];

const DEFAULT_SETTINGS: VaultSettings = {
  vaultKey: 'MY-VAULT-2026',
  ownerName: '我的財務與生活金庫',
  supabaseUrl:
    (import.meta.env.VITE_SUPABASE_URL as string) ||
    'https://vkrgscbtgrimktqkwqma.supabase.co',
  supabaseAnonKey:
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcmdzY2J0Z3JpbWt0cWt3cW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1MTg1OTAsImV4cCI6MjEwOTA5NDU5MH0.oUGS-_GkfVljxifze9rW6TcE5Bi2fYqOHrB22J2GHfo',
  finMindToken:
    (import.meta.env.VITE_FINMIND_TOKEN as string) ||
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoidGFuZzkyMTExOCIsImVtYWlsIjoidGFuZ2doZ2hAZ21haWwuY29tIiwidG9rZW5fdmVyc2lvbiI6MH0.eV8XmNzmgJGDp2azc5NoX8jgg1PYQNdbn9Cc9CecpH0',
  geminiApiKey: (import.meta.env.VITE_GEMINI_API_KEY as string) || '',
  theme: 'light',
  autoSyncEnabled: false,
  autoRefreshOnOpen: true,
  autoRefreshIntervalMinutes: 5,
  lastQuoteRefreshedAt: new Date().toISOString(),
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
  currentUser: UserProfile | null;
  exchangeRateUsdTwd: number;
  exchangeRates: ExchangeRatesTable;
  loans: LoanContract[];
  savingsGoals: SavingsGoal[];
  tradePlans: UserTradePlan[];
  settings: VaultSettings;
  isHydrated: boolean;
  isQuoteSyncing: boolean;
  isCloudSyncing: boolean;

  // Computed Engines
  netWorthSummary: NetWorthSummary;
  passiveIncomeSummary: PassiveIncomeSummary;
  shortfallAlerts: CashflowShortfallAlert[];

  // Actions - Auth (帳號密碼登錄)
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<{ ok: boolean; message: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ ok: boolean; message: string }>;
  signOut: () => Promise<void>;

  // Actions - Screener, Watchlist & Trade Plans (同業估值與動態交易計畫)
  upsertWatchlistItem: (item: WatchlistStockItem) => void;
  deleteWatchlistItem: (id: string) => void;
  upsertScreenerStock: (stock: ScreenerStockItem) => void;
  upsertTradePlan: (plan: UserTradePlan) => void;
  deleteTradePlan: (id: string) => void;
  updateTradePlanStage: (id: string, stage: TradePlanStage) => void;

  // Actions - Loans (房貸/車貸/信貸與逐期攤還雙軌記帳)
  upsertLoan: (loan: LoanContract) => void;
  deleteLoan: (id: string) => void;
  recordLoanPayment: (loanId: string, periodNumber: number, fromAccountId?: string) => void;

  // Actions - Savings Goals (存錢目標與專款累積)
  upsertSavingsGoal: (goal: SavingsGoal) => void;
  deleteSavingsGoal: (id: string) => void;
  depositToSavingsGoal: (goalId: string, amount: number, fromAccountId?: string, note?: string) => void;

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
  deleteVehicle: (id: string) => void;
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
  const [screenerStocks, setScreenerStocks] = useState<ScreenerStockItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistStockItem[]>(DEFAULT_WATCHLIST);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [exchangeRateUsdTwd, setExchangeRateUsdTwd] = useState<number>(32.18);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRatesTable>(DEFAULT_EXCHANGE_RATES);
  const [loans, setLoans] = useState<LoanContract[]>(DEFAULT_LOANS);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(DEFAULT_SAVINGS_GOALS);
  const [tradePlans, setTradePlans] = useState<UserTradePlan[]>(DEFAULT_TRADE_PLANS);
  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isQuoteSyncing, setIsQuoteSyncing] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // 1. 初始化讀取 LocalStorage 與 Supabase Auth 狀態
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('financelife_user_session');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
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
        if (Array.isArray(parsed.loans)) setLoans(parsed.loans);
        if (Array.isArray(parsed.savingsGoals)) setSavingsGoals(parsed.savingsGoals);
        if (Array.isArray(parsed.tradePlans)) setTradePlans(parsed.tradePlans);
        if (parsed.exchangeRates) setExchangeRates(parsed.exchangeRates);
        if (typeof parsed.exchangeRateUsdTwd === 'number')
          setExchangeRateUsdTwd(parsed.exchangeRateUsdTwd);
        if (parsed.settings) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...parsed.settings,
            supabaseUrl: parsed.settings.supabaseUrl || DEFAULT_SETTINGS.supabaseUrl,
            supabaseAnonKey: parsed.settings.supabaseAnonKey || DEFAULT_SETTINGS.supabaseAnonKey,
            finMindToken: parsed.settings.finMindToken || DEFAULT_SETTINGS.finMindToken,
            geminiApiKey: parsed.settings.geminiApiKey || DEFAULT_SETTINGS.geminiApiKey,
          });
        }
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
        loans,
        exchangeRates,
      }),
    [assetAccounts, securityHoldings, insurancePolicies, creditCards, installments, debtRecords, loans, exchangeRates]
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
      loans,
      savingsGoals,
      tradePlans,
      exchangeRates,
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
    loans,
    savingsGoals,
    tradePlans,
    exchangeRates,
    exchangeRateUsdTwd,
    settings,
    netWorthSummary,
  ]);

  // 5. 啟動時自動向免費報價 API 更新一次最新股價/債券ETF/基金淨值與匯率
  useEffect(() => {
    if (!isHydrated) return;
    if (settings.autoRefreshOnOpen !== false) {
      void refreshQuotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  // 6. 監聽 PWA 切換回前景 / 瀏覽器分頁重新 Focus 時自動更新
  useEffect(() => {
    if (!isHydrated || settings.autoRefreshOnOpen === false) return;

    let lastActiveCheck = Date.now();

    const handleResumeOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const elapsedMs = Date.now() - lastActiveCheck;
        // 若切回 App 且距離上次檢查超過 60 秒，自動觸發即時資料同步
        if (elapsedMs > 60_000) {
          lastActiveCheck = Date.now();
          void refreshQuotes();
        }
      }
    };

    document.addEventListener('visibilitychange', handleResumeOrFocus);
    window.addEventListener('focus', handleResumeOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleResumeOrFocus);
      window.removeEventListener('focus', handleResumeOrFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, settings.autoRefreshOnOpen]);

  // 7. 定時固定自動輪詢更新 (預設每 5 分鐘在前景自動拉取最新匯率與股價)
  useEffect(() => {
    if (!isHydrated) return;
    const intervalMinutes = settings.autoRefreshIntervalMinutes ?? 5;
    if (intervalMinutes <= 0) return;

    const intervalMs = intervalMinutes * 60 * 1000;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshQuotes();
      }
    }, intervalMs);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, settings.autoRefreshIntervalMinutes]);

  const refreshQuotes = async () => {
    if (isQuoteSyncing) return;
    setIsQuoteSyncing(true);
    try {
      // 收集持倉、關注清單與全選股池股票代碼一次性向 API 請求，保證自選與排行全面自動更新
      const extraSyms = Array.from(
        new Set([
          ...watchlist.map((w) => w.symbol),
          ...screenerStocks.map((s) => s.symbol),
        ])
      );

      const { updatedHoldings, exchangeRateUsdTwd: liveFx, exchangeRates: liveRates, apiQuotes, refreshedAt } =
        await syncAllHoldingsQuotes(securityHoldings, exchangeRateUsdTwd, exchangeRates, extraSyms);

      setSecurityHoldings(updatedHoldings);
      setExchangeRateUsdTwd(liveFx);
      if (liveRates) setExchangeRates(liveRates);

      setSettings((prev) => ({
        ...prev,
        lastQuoteRefreshedAt: refreshedAt,
      }));

      // 同步把最新報價映射到選股池與關注清單 (支援純數字代碼與 .TW 雙向索引)
      const priceMap = new Map<string, { price: number; prevClose?: number }>();
      for (const h of updatedHoldings) {
        const clean = h.symbol.replace(/\.(TW|TWO)$/i, '').toUpperCase();
        priceMap.set(h.symbol.toUpperCase(), {
          price: h.currentPrice,
          prevClose: h.previousClose,
        });
        priceMap.set(clean, {
          price: h.currentPrice,
          prevClose: h.previousClose,
        });
      }
      for (const [sym, q] of Object.entries(apiQuotes)) {
        if (q.price > 0) {
          const clean = sym.replace(/\.(TW|TWO)$/i, '').toUpperCase();
          priceMap.set(sym.toUpperCase(), {
            price: q.price,
            prevClose: q.previousClose,
          });
          priceMap.set(clean, {
            price: q.price,
            prevClose: q.previousClose,
          });
        }
      }

      if (priceMap.size > 0) {
        setScreenerStocks((prev) =>
          prev.map((s) => {
            const clean = s.symbol.replace(/\.(TW|TWO)$/i, '').toUpperCase();
            const hit = priceMap.get(s.symbol.toUpperCase()) || priceMap.get(clean);
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
            const clean = w.symbol.replace(/\.(TW|TWO)$/i, '').toUpperCase();
            const hit = priceMap.get(w.symbol.toUpperCase()) || priceMap.get(clean);
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

  // =====================================================
  // 貸款試算與逐期攤還雙軌記帳 (Loans & Amortization)
  // =====================================================

  const upsertLoan = (loan: LoanContract) => {
    setLoans((prev) => {
      const exists = prev.some((l) => l.id === loan.id);
      return exists ? prev.map((l) => (l.id === loan.id ? loan : l)) : [loan, ...prev];
    });
  };

  const deleteLoan = (id: string) => {
    setLoans((prev) => prev.filter((l) => l.id !== id));
  };

  const recordLoanPayment = (loanId: string, periodNumber: number, fromAccountId?: string) => {
    setLoans((prev) =>
      prev.map((l) => {
        if (l.id !== loanId) return l;
        const periodIdx = l.schedule.findIndex((s) => s.period === periodNumber);
        if (periodIdx === -1) return l;

        const period = l.schedule[periodIdx];
        if (period.isPaid) return l;

        const nowStr = new Date().toISOString().slice(0, 10);
        const updatedSchedule = [...l.schedule];
        const txId = `tx-loan-${l.id}-${periodNumber}`;
        updatedSchedule[periodIdx] = {
          ...period,
          isPaid: true,
          paidDate: nowStr,
          linkedTransactionId: txId,
        };

        const newRemaining = Math.max(0, l.currentRemainingPrincipal - period.principalPayment);
        const isAllPaid = updatedSchedule.every((s) => s.isPaid) || newRemaining === 0;

        const targetAccId = fromAccountId || l.autoDeductAccountId;
        const targetAcc = assetAccounts.find((a) => a.id === targetAccId);

        // 雙軌拆帳：
        // 1. 利息支出 (損益 Expense)：計入日常記帳生活花費
        if (period.interestPayment > 0) {
          const defaultSource = targetAcc || assetAccounts[0];
          addTransaction({
            type: 'expense',
            amount: period.interestPayment,
            date: nowStr,
            categoryName: '房貸車貸利息支出',
            categoryEmoji: '🏦',
            paymentSourceType: 'account',
            paymentSourceId: defaultSource ? defaultSource.id : '',
            paymentSourceName: defaultSource ? defaultSource.name : '銀行自動扣繳',
            notes: `${l.title} 第 ${periodNumber} 期利息支出 (本期本金 $${period.principalPayment.toLocaleString()})`,
            linkedModule: 'debt',
            linkedRecordId: l.id,
          });
        }

        // 2. 本金扣抵負債 + 銀行存款扣繳 (若有綁定存款帳戶，扣除整筆本息 totalPayment)
        if (targetAcc) {
          setAssetAccounts((accs) =>
            accs.map((a) =>
              a.id === targetAcc.id
                ? {
                    ...a,
                    balance: a.balance - period.totalPayment,
                    updatedAt: new Date().toISOString(),
                  }
                : a
            )
          );
        }

        return {
          ...l,
          currentRemainingPrincipal: newRemaining,
          status: isAllPaid ? 'settled' : 'active',
          schedule: updatedSchedule,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // =====================================================
  // 存錢目標與專款累積 (Savings Goals)
  // =====================================================

  const upsertSavingsGoal = (goal: SavingsGoal) => {
    setSavingsGoals((prev) => {
      const exists = prev.some((g) => g.id === goal.id);
      return exists ? prev.map((g) => (g.id === goal.id ? goal : g)) : [goal, ...prev];
    });
  };

  const deleteSavingsGoal = (id: string) => {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const depositToSavingsGoal = (
    goalId: string,
    amount: number,
    fromAccountId?: string,
    note?: string
  ) => {
    if (amount <= 0) return;
    const nowStr = new Date().toISOString().slice(0, 10);

    setSavingsGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const newAmt = g.currentAmount + amount;
        return {
          ...g,
          currentAmount: newAmt,
          isCompleted: newAmt >= g.targetAmount,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    if (fromAccountId) {
      const targetAcc = assetAccounts.find((a) => a.id === fromAccountId);
      if (targetAcc) {
        setAssetAccounts((accs) =>
          accs.map((a) =>
            a.id === targetAcc.id
              ? {
                  ...a,
                  balance: a.balance - amount,
                  updatedAt: new Date().toISOString(),
                }
              : a
          )
        );

        addTransaction({
          type: 'expense',
          amount,
          date: nowStr,
          categoryName: '存錢計畫專款',
          categoryEmoji: '🎯',
          paymentSourceType: 'account',
          paymentSourceId: targetAcc.id,
          paymentSourceName: targetAcc.name,
          notes: note || '存入夢想存錢目標專款',
          linkedModule: 'recurring',
          linkedRecordId: goalId,
        });
      }
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

  const deleteVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
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

  const upsertScreenerStock = (stock: ScreenerStockItem) => {
    setScreenerStocks((prev) => {
      const idx = prev.findIndex(
        (s) => s.symbol.toUpperCase() === stock.symbol.toUpperCase()
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...stock };
        return next;
      }
      return [stock, ...prev];
    });
  };

  const upsertTradePlan = (plan: UserTradePlan) => {
    setTradePlans((prev) => {
      const exists = prev.some(
        (p) => p.id === plan.id || p.symbol.toUpperCase() === plan.symbol.toUpperCase()
      );
      return exists
        ? prev.map((p) =>
            p.id === plan.id || p.symbol.toUpperCase() === plan.symbol.toUpperCase() ? plan : p
          )
        : [plan, ...prev];
    });
  };

  const deleteTradePlan = (id: string) => {
    setTradePlans((prev) => prev.filter((p) => p.id !== id));
  };

  const updateTradePlanStage = (id: string, stage: TradePlanStage) => {
    setTradePlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stage, updatedAt: new Date().toISOString() } : p))
    );
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
      const res = await pushVaultToSupabase(
        settings,
        {
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
          trade_plans: tradePlans,
          loans,
          savings_goals: savingsGoals,
          exchange_rates: exchangeRates,
          exchange_rate_usd_twd: exchangeRateUsdTwd,
        },
        currentUser?.id,
        currentUser?.email
      );
      if (res.ok && res.syncedAt) {
        updateSettings({ lastSyncedAt: res.syncedAt });
      }
      return { ok: res.ok, message: res.message };
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // =====================================================
  // 多使用者帳號密碼登錄 / 註冊 / 登出邏輯
  // =====================================================

  const signUpWithEmail = async (
    email: string,
    pass: string,
    displayName?: string
  ): Promise<{ ok: boolean; message: string }> => {
    const supabase = getSupabaseClient(settings);
    if (!supabase) {
      // 離線多帳號模擬模式 (即使未連線 Supabase 也能切換多使用者)
      const mockUser: UserProfile = {
        id: `usr-${Date.now()}`,
        email,
        username: email.split('@')[0],
        displayName: displayName || email.split('@')[0],
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(mockUser);
      localStorage.setItem('financelife_user_session', JSON.stringify(mockUser));
      updateSettings({ vaultKey: `VAULT-${mockUser.username.toUpperCase()}`, ownerName: mockUser.displayName });
      return { ok: true, message: `註冊成功！已切換至「${mockUser.displayName}」專屬金庫` };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      });

      if (error) {
        return { ok: false, message: error.message };
      }

      if (data?.user) {
        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          username: (data.user.email || email).split('@')[0],
          displayName: displayName || (data.user.email || email).split('@')[0],
          createdAt: data.user.created_at,
        };
        setCurrentUser(profile);
        localStorage.setItem('financelife_user_session', JSON.stringify(profile));
        updateSettings({
          vaultKey: `VAULT-${profile.id.slice(0, 8).toUpperCase()}`,
          ownerName: profile.displayName,
        });
        return { ok: true, message: `註冊並登錄成功！歡迎 ${profile.displayName}` };
      }

      return { ok: true, message: '請至信箱點擊確認信完成驗證後登錄' };
    } catch (err) {
      return { ok: false, message: `註冊異常：${String(err)}` };
    }
  };

  const signInWithEmail = async (
    email: string,
    pass: string
  ): Promise<{ ok: boolean; message: string }> => {
    const supabase = getSupabaseClient(settings);
    if (!supabase) {
      // 離線多帳號切換
      const mockUser: UserProfile = {
        id: `usr-${email.replace(/[^a-zA-Z0-9]/g, '')}`,
        email,
        username: email.split('@')[0],
        displayName: email.split('@')[0],
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(mockUser);
      localStorage.setItem('financelife_user_session', JSON.stringify(mockUser));
      updateSettings({ vaultKey: `VAULT-${mockUser.username.toUpperCase()}`, ownerName: mockUser.displayName });
      return { ok: true, message: `登入成功！已切換為「${mockUser.displayName}」帳號` };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        return { ok: false, message: error.message };
      }

      if (data?.user) {
        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          username: (data.user.email || email).split('@')[0],
          displayName:
            data.user.user_metadata?.display_name || (data.user.email || email).split('@')[0],
          createdAt: data.user.created_at,
        };
        setCurrentUser(profile);
        localStorage.setItem('financelife_user_session', JSON.stringify(profile));
        const userVaultKey = `VAULT-${profile.id.slice(0, 8).toUpperCase()}`;
        updateSettings({
          vaultKey: userVaultKey,
          ownerName: profile.displayName,
        });

        // 登入後自動嘗試抓取該帳號在 Supabase 的金庫資料
        setTimeout(() => {
          void pullVaultFromSupabase({ ...settings, vaultKey: userVaultKey }).then((res) => {
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
              if (Array.isArray(d.loans)) setLoans(d.loans);
              if (Array.isArray(d.savings_goals)) setSavingsGoals(d.savings_goals);
              if (d.exchange_rates) setExchangeRates(d.exchange_rates);
            }
          });
        }, 300);

        return { ok: true, message: `登入成功！已同步 ${profile.displayName} 的專屬資料` };
      }

      return { ok: false, message: '登入失敗，查無使用者' };
    } catch (err) {
      return { ok: false, message: `登入異常：${String(err)}` };
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseClient(settings);
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    setCurrentUser(null);
    localStorage.removeItem('financelife_user_session');
    updateSettings({ vaultKey: 'DEFAULT-VAULT', ownerName: '訪客金庫' });
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
        if (Array.isArray(d.loans)) setLoans(d.loans);
        if (Array.isArray(d.savings_goals)) setSavingsGoals(d.savings_goals);
        if (d.exchange_rates) setExchangeRates(d.exchange_rates);
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
        loans,
        savingsGoals,
        tradePlans,
        exchangeRates,
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
      if (Array.isArray(parsed.loans)) setLoans(parsed.loans);
      if (Array.isArray(parsed.savingsGoals)) setSavingsGoals(parsed.savingsGoals);
      if (parsed.exchangeRates) setExchangeRates(parsed.exchangeRates);
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
        loans,
        savingsGoals,
        tradePlans,
        exchangeRates,
        currentUser,
        exchangeRateUsdTwd,
        settings,
        isHydrated,
        isQuoteSyncing,
        isCloudSyncing,
        netWorthSummary,
        passiveIncomeSummary,
        shortfallAlerts,
        signUpWithEmail,
        signInWithEmail,
        signOut,
        upsertWatchlistItem,
        deleteWatchlistItem,
        upsertScreenerStock,
        upsertTradePlan,
        deleteTradePlan,
        updateTradePlanStage,
        upsertLoan,
        deleteLoan,
        recordLoanPayment,
        upsertSavingsGoal,
        deleteSavingsGoal,
        depositToSavingsGoal,
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
        deleteVehicle,
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
