// =====================================================================
// FinanceLife-PWA 全領域嚴格型別定義 (Strict Domain Types - Zero `any`)
// =====================================================================

export type MainTabId = 'overview' | 'ledger' | 'portfolio' | 'screener' | 'life' | 'calendar';

// ==========================================
// 1. 帳務、信用卡、分期、借放款、固定收支
// ==========================================

export type TransactionType = 'expense' | 'income' | 'transfer';
export type PaymentSourceType = 'account' | 'credit_card';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;                    // YYYY-MM-DD
  categoryName: string;
  categoryEmoji: string;
  paymentSourceType: PaymentSourceType;
  paymentSourceId: string;         // 對應 AssetAccount.id 或 CreditCard.id
  paymentSourceName: string;
  toAccountId?: string;            // 若 type === 'transfer'，轉入之銀行/現金帳戶 ID
  toAccountName?: string;
  notes?: string;
  attachmentUrl?: string;          // 單據/發票照片 URL (Supabase Storage 或壓縮 DataURL)
  linkedModule?: 'vehicle' | 'insurance' | 'medical' | 'installment' | 'debt' | 'recurring' | 'dividend';
  linkedRecordId?: string;
  createdAt: string;
}

export interface CreditCard {
  id: string;
  bankName: string;                // 例: '玉山銀行', '國泰世華'
  cardName: string;                // 例: 'Unicard', 'CUBE卡'
  lastFourDigits?: string;         // 例: '8812'
  creditLimit: number;             // 信用總額度 (例: 200000)
  currentBilledAmount: number;     // 本期已出帳待繳金額
  unbilledAmount: number;          // 未出帳消費金額 (日常刷卡自動累加)
  statementDay: number;            // 每月結帳日 (1-31)
  dueDay: number;                  // 每月最後繳款日 (1-31)
  autoPayAccountId?: string;       // 自動扣繳銀行帳戶 ID (用於現金流預警比對)
  colorHex: string;
  notes?: string;
  updatedAt: string;
}

export interface Installment {
  id: string;
  title: string;                   // 例: 'MacBook Pro 14" M4', '富邦產險車險分期'
  totalAmount: number;             // 分期總額
  totalPeriods: number;            // 總期數 (例: 12)
  paidPeriods: number;             // 已繳期數 (例: 4)
  periodAmount: number;            // 每期應繳金額
  startDate: string;               // 首期起算日 YYYY-MM-DD
  billingDay: number;              // 每月扣款/入帳日 (1-31)
  paymentSourceType: PaymentSourceType;
  paymentSourceId: string;         // 綁定之信用卡 ID 或銀行帳戶 ID
  paymentSourceName: string;
  occupyCreditLimit: boolean;      // 若為信用卡分期，未到期餘額是否佔用信用卡可用額度
  emoji: string;
  colorHex: string;
  isCompleted: boolean;
  notes?: string;
}

export type DebtType = 'i_owe' | 'they_owe'; // 'i_owe' (我借入/貸款/欠款) | 'they_owe' (我借出/應收款)

export interface DebtRepayment {
  id: string;
  date: string;                    // YYYY-MM-DD
  amount: number;
  accountId?: string;              // 還款/收款連動之銀行或現金帳戶 ID
  accountName?: string;
  remainingAfter: number;
  notes?: string;
}

export interface DebtRecord {
  id: string;
  type: DebtType;
  title: string;                   // 例: '銀行低利信貸', '借給阿豪週轉'
  counterparty: string;            // 對象名稱或銀行
  totalAmount: number;
  remainingAmount: number;
  interestRate?: number;           // 年利率 % (選填)
  startDate: string;               // YYYY-MM-DD
  dueDate?: string;                // 預計結清日或下次還款日 YYYY-MM-DD
  monthlyPaymentDay?: number;      // 若為按月攤還貸款，每月扣款日 (1-31)
  monthlyPaymentAmount?: number;   // 每月應還金額
  linkedAccountId?: string;        // 預設扣款/入帳銀行帳戶 ID
  isSettled: boolean;
  repayments: DebtRepayment[];
  notes?: string;
}

export type RecurrenceCycle = 'monthly' | 'quarterly' | 'yearly';

export interface RecurringItem {
  id: string;
  title: string;                   // 例: '房租', 'Netflix + Spotify', '中華電信 5G', '固定月薪'
  amount: number;
  type: 'expense' | 'income';
  cycle: RecurrenceCycle;
  dayOfMonth: number;              // 扣款/入帳日 (1-31)
  monthOfYear?: number;            // 若為 yearly/quarterly，指定月份 (1-12)
  categoryName: string;
  emoji: string;
  paymentSourceType: PaymentSourceType;
  paymentSourceId: string;
  paymentSourceName: string;
  isActive: boolean;
  autoRecord: boolean;
  lastRecordedPeriod?: string;     // 例: '2026-11'
  notes?: string;
}

// ==========================================
// 2. 資產帳戶與投資組合 (股票/ETF/基金/債券)
// ==========================================

export type BankAccountType = 'cash' | 'bank' | 'digital_wallet' | 'brokerage_cash';
export type SupportedCurrency = 'TWD' | 'USD' | 'JPY' | 'CNY' | 'KRW' | 'VND';

export interface ExchangeRatesTable {
  USD: number; // 1 USD in TWD (e.g. 32.2)
  JPY: number; // 1 JPY in TWD (e.g. 0.215)
  CNY: number; // 1 CNY in TWD (e.g. 4.45)
  KRW: number; // 1 KRW in TWD (e.g. 0.0235)
  VND: number; // 1 VND in TWD (e.g. 0.00128)
  TWD: number; // 1
  updatedAt: string;
}

export interface AssetAccount {
  id: string;
  name: string;                    // 例: '錢包現金', '台新 Richart', '國泰交割戶', 'Line Pay'
  type: BankAccountType;
  balance: number;                 // 當前原幣別餘額
  currency?: SupportedCurrency;    // 幣別 (預設 'TWD', 支援 USD, JPY, CNY, KRW, VND)
  bankCode?: string;               // 例: '812', '013'
  accountLastFour?: string;        // 例: '5566'
  interestRate?: number;           // 高利活存利率 % (選填)
  colorHex: string;
  emoji: string;
  updatedAt: string;
}

export type InvestmentCategory = 'stock' | 'etf' | 'fund' | 'bond';
export type QuoteCurrency = 'TWD' | 'USD';
export type DividendFrequency = 'none' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface SecurityHolding {
  id: string;
  symbol: string;                  // 代號：'2330.TW', '0050.TW', '00679B.TWO', 'VOO', 'TLT' 或基金統編/ISIN
  name: string;                    // 名稱：'台積電', '元大美債20年', '安聯台灣科技基金'
  category: InvestmentCategory;    // 股票 | ETF | 基金 | 債券
  units: number;                   // 持有股數 / 基金單位數 / 債券張數
  costBasisPerUnit: number;        // 原幣別買進平均成本
  currentPrice: number;            // 原幣別最新單價/淨值
  previousClose?: number;          // 原幣別昨收價 (計算今日漲跌)
  currency: QuoteCurrency;         // 'TWD' | 'USD'
  exchangeRateToTwd: number;       // 換算台幣匯率 (TWD 為 1，USD 自動抓即時匯率如 32.18)
  marketValueTwd: number;          // 自動計算：units * currentPrice * exchangeRateToTwd
  unrealizedPnlTwd: number;        // 自動計算：未實現損益 (TWD)
  unrealizedReturnPct: number;     // 自動計算：報酬率 %
  // 擴充功能 #3：股息 / 債息被動收入統計
  dividendFrequency?: DividendFrequency;
  estimatedAnnualYieldPct?: number;// 預估年化殖利率/配息率 % (例: 4.8)
  dividendMonths?: number[];       // 配息月份 (例: [2, 5, 8, 11] 或月配 [1..12])
  linkedAccountId?: string;        // 交割/配息入帳銀行 ID
  lastQuotedAt: string;            // ISO 時間
  quoteSource?: 'yahoo' | 'twse' | 'tpex' | 'fund_api' | 'manual';
}

export interface NetWorthSnapshot {
  date: string;                    // YYYY-MM-DD
  cashAndBankTotal: number;
  investmentTotal: number;
  insuranceCashValueTotal: number; // 保單價值準備金
  receivablesTotal: number;        // 別人欠我
  creditCardLiabilityTotal: number;// 信用卡未繳
  debtLiabilityTotal: number;      // 我欠別人/貸款
  netWorth: number;                // 總淨值
}

// ==========================================
// 3. 汽車保養與耗材追蹤 (Vehicle Maintenance)
// ==========================================

export interface VehicleConsumableRule {
  id: string;
  itemName: string;                // 例: '全合成機油 0W-20', '變速箱油', '煞車油', '輪胎對調', '冷氣濾網', '電瓶'
  intervalKm?: number;             // 每幾公里更換 (例: 5000 或 10000)
  intervalMonths?: number;         // 或每幾個月更換 (例: 6 或 12)
  lastReplacedDate: string;        // 上次更換日期 YYYY-MM-DD
  lastReplacedMileage: number;     // 上次更換時里程 (km)
}

export interface VehicleMaintenanceItem {
  name: string;                    // 例: 'Mobil 1 0W-20 機油 x4', '原廠機油芯', '工資'
  cost: number;
  updatesConsumableId?: string;    // 若對應耗材規則，自動更新該耗材的 lastReplacedMileage 與日期
}

export interface VehicleMaintenanceLog {
  id: string;
  vehicleId: string;
  date: string;                    // YYYY-MM-DD
  mileage: number;                 // 進廠時里程數
  category: 'regular' | 'repair' | 'tire_battery' | 'inspection' | 'tax_fuel';
  shopName: string;                // 保養廠/車行名稱
  items: VehicleMaintenanceItem[];
  totalCost: number;
  nextDueMileage?: number;         // 技師建議下次保養里程
  nextDueDate?: string;            // 技師建議下次保養日期 YYYY-MM-DD
  attachmentUrl?: string;          // 擴充功能 #5：維修工單照片附件
  linkedTransactionId?: string;    // 同步記帳之 Transaction ID
  notes?: string;
}

export type VehicleType =
  | 'sedan'        // 轎車 / 掀背車
  | 'suv'          // 休旅車 SUV
  | 'mpv'          // 廂型車 / 商旅 MPV
  | 'scooter'      // 白牌普通重型機車
  | 'heavy_motor'  // 黃/紅牌大型重型機車
  | 'electric'     // 純電動車 (EV)
  | 'truck';       // 貨車 / 其他

export interface VehicleProfile {
  id: string;
  name: string;                    // 車輛自訂名稱 (例: '小紅 RAV4', '通勤勁戰')
  vehicleType: VehicleType;        // 車型種類
  brand?: string;                  // 廠牌 (例: 'Toyota', 'Honda', 'SYM', 'Gogoro', 'Tesla')
  modelName?: string;              // 車款型號 (例: 'RAV4 Hybrid 2.5', 'Jet SL 158')
  licensePlate: string;            // 車牌號碼 (例: 'ABC-8899', 'MMB-1234')
  displacementCc?: number;         // 排氣量 cc (推算稅金)
  currentMileage: number;          // 目前總里程 (km)
  nextInspectionDate?: string;     // 下次驗車到期日 YYYY-MM-DD
  insuranceExpiryDate?: string;    // 強制險/任意險到期日 YYYY-MM-DD
  licenseTaxMonth?: number;        // 牌照稅月份 (預設 4 月)
  fuelTaxMonth?: number;           // 燃料稅月份 (預設 7 月)
  consumables: VehicleConsumableRule[];
  logs: VehicleMaintenanceLog[];
  updatedAt: string;
}

// ==========================================
// 4. 保險保單管理 (Insurance Policies)
// ==========================================

export type InsuranceCategory = 'medical' | 'accident' | 'cancer_critical' | 'life' | 'savings_invest' | 'car_property';
export type PolicyPaymentCycle = 'annual' | 'semi_annual' | 'quarterly' | 'monthly';

export interface InsurancePolicy {
  id: string;
  insurerName: string;             // 保險公司：'富邦人壽', '國泰人壽', '全球人壽'
  policyName: string;              // 主約/險種名稱
  policyNumber?: string;           // 保單號碼
  category: InsuranceCategory;
  insuredPerson: string;           // 被保險人 (例: '本人', '母親', '愛車 ABC-8899')
  beneficiary?: string;            // 受益人
  agentName?: string;              // 業務員姓名
  agentPhone?: string;             // 業務員電話
  premiumAmount: number;           // 每期保費金額 (TWD)
  paymentCycle: PolicyPaymentCycle;
  nextPaymentDate: string;         // 下次應繳費日期 YYYY-MM-DD
  startYear: number;               // 投保起始年份 (例: 2021)
  totalPaymentYears: number;       // 總繳費年期 (例: 20 年期；若為一年期產險/定期險則為 1)
  paidYears: number;               // 已繳年期
  paymentSourceType: PaymentSourceType;
  paymentSourceId: string;         // 扣款信用卡或銀行帳戶 ID
  paymentSourceName: string;
  includeInNetWorth: boolean;      // 若為儲蓄險/投資型，是否將保單價值計入個人總資產
  estimatedCashValue?: number;     // 保單目前解約金/保價金現值
  coverageSummary?: string;        // 保障重點備註 (例: '實支實付雜費 20萬、住院日額 3,000')
  attachmentUrl?: string;          // 擴充功能 #5：保單首頁/條款照片或截圖
  isActive: boolean;
  notes?: string;
}

// ==========================================
// 5. 醫療與回診追蹤 (Medical & Clinic Tracker)
// ==========================================

export interface MedicalRecord {
  id: string;
  visitDate: string;               // 看診日期 YYYY-MM-DD
  hospitalName: string;            // 醫院/診所名稱 (例: '台大醫院', '好心肝門診中心')
  department: string;              // 科別 (例: '牙科', '家醫科', '骨科')
  doctorName?: string;             // 主治醫師
  diagnosisSummary: string;        // 診斷或症狀摘要
  doctorAdvice?: string;           // 醫囑與用藥備忘 (例: '下次需空腹 8 小時抽血')
  cost: number;                    // 掛號費 + 自費總額
  // 回診預約連動
  nextAppointmentDate?: string;    // 下次回診日期 YYYY-MM-DD
  nextAppointmentTime?: string;    // 下次回診時間 HH:mm (例: '14:30')
  appointmentNumber?: string;      // 預約診號 (例: '28 號')
  // 慢性病連續處方箋領藥追蹤
  hasChronicPrescription?: boolean;
  refill2StartDate?: string;       // 慢箋第二次領藥起日 YYYY-MM-DD
  refill3StartDate?: string;       // 慢箋第三次領藥起日 YYYY-MM-DD
  attachmentUrl?: string;          // 擴充功能 #5：收據/藥單/檢查報告照片
  linkedTransactionId?: string;    // 同步記帳之 Transaction ID
  linkedPolicyId?: string;         // 可申請理賠之對應保單 ID (選填)
}

// ==========================================
// 6. 全域整合行事曆 (Unified Calendar)
// ==========================================

export type CalendarEventSource =
  | 'manual'        // 使用者自訂行程
  | 'credit_card'   // 信用卡結帳日 / 繳款截止日
  | 'installment'   // 分期扣款日
  | 'debt'          // 借放款到期 / 還款日
  | 'recurring'     // 固定收支扣款日
  | 'vehicle'       // 汽車定保預定日 / 驗車日 / 保險到期日
  | 'insurance'     // 保單續期保費扣款日
  | 'medical';      // 醫院回診日 / 慢箋領藥日

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string;                    // YYYY-MM-DD
  endDate?: string;                // YYYY-MM-DD
  time?: string;                   // HH:mm
  source: CalendarEventSource;
  sourceRecordId?: string;
  amount?: number;                 // 若為財務/保費/卡費事件，顯示涉及金額
  colorHex: string;
  emoji: string;
  isCompleted?: boolean;
  notes?: string;
}

// ==========================================
// 7. 現金流水位預警與系統設定
// ==========================================

export interface UpcomingDeductionItem {
  id: string;
  title: string;
  date: string;                    // YYYY-MM-DD
  daysUntil: number;
  amount: number;
  sourceType: 'credit_card' | 'recurring' | 'installment' | 'debt' | 'insurance';
  emoji: string;
}

export interface CashflowShortfallAlert {
  accountId: string;
  accountName: string;
  accountEmoji: string;
  currentBalance: number;
  requiredAmount7Days: number;
  shortfallAmount: number;         // 缺口金額 (requiredAmount7Days - currentBalance)
  items: UpcomingDeductionItem[];
}

export interface VaultSettings {
  vaultKey: string;
  ownerName: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  theme: 'light' | 'dark';
  autoSyncEnabled: boolean;
  lastSyncedAt?: string;
}

// ==========================================
// 8. 智能量化選股、四大面向因子與板塊資金輪動
// ==========================================

export type StockSectorId =
  | 'semicon_cowos'     // 半導體與 CoWoS 先進封裝
  | 'ai_server_cooling' // AI 伺服器與液冷散熱
  | 'ic_design_ip'      // IC 設計與矽智財 IP
  | 'cpo_networking'    // CPO 矽光子與高速網通
  | 'heavy_power'       // 重電綠能與電網設備
  | 'finance_high_div'  // 金控銀行與高息價值
  | 'shipping_trad'     // 航運與傳產龍頭
  | 'us_tech_leaders';  // 美股 AI 與科技巨頭

export type SectorRotationStage =
  | 'leading'           // 🔥 領漲主流 (資金流入 + 動能強勁)
  | 'accumulating'      // 🌱 資金轉入蓄勢 (低檔轉強 + 法人佈局)
  | 'consolidating'     // ⚠️ 高檔震盪分歧 (漲多整理)
  | 'lagging';          // ❄️ 資金流出整理 (動能偏弱)

export interface ScreenerStockItem {
  symbol: string;                  // 例: '2330.TW', '3017.TW', '2382.TW'
  name: string;                    // 例: '台積電', '奇鋐', '廣達'
  market: 'TW' | 'US';
  sectorId: StockSectorId;
  sectorName: string;
  subTheme: string;                // 細分題材 (例: 'CoWoS 龍頭', '水冷散熱模組', 'AI 伺服器代工')
  price: number;
  dailyChangePct: number;          // 今日漲跌幅 %
  avgTurnover60dYiTwd: number;     // 近 60 日平均成交額 (億台幣) — Step 1 流動性初篩
  // 1. 基本面 (Fundamental)
  roePct: number;                  // ROE 股東權益報酬率 % (建議 > 15%)
  peRatio: number;                 // 本益比 P/E
  pbRatio: number;                 // 股價淨值比 P/B
  grossMarginPct: number;          // 毛利率 %
  freeCashFlowPositive: boolean;   // 自由現金流是否為正
  dividendYieldPct: number;        // 現金殖利率 %
  // 2. 技術面 (Technical)
  aboveMa60: boolean;              // 是否站上季線 (60MA 中期多頭)
  aboveMa240: boolean;             // 是否站上年線 (240MA 長期多頭)
  momentum60dPct: number;          // 近 60 日價格漲幅動能 %
  annualVolatilityPct: number;     // 年化波動度 % (低波動因子參考 < 25%)
  // 3. 籌碼面 (Chip / Institutional)
  instNetBuy5dLots: number;        // 三大法人近 5 日買賣超 (張)
  trustNetBuy5dLots: number;       // 投信近 5 日買賣超 (張，投信認養/作帳指標)
  majorHolderChangePct: number;    // 千張大戶持股近月增減 %
  marginUtilizationHealth: 'healthy' | 'neutral' | 'overheated'; // 融資使用率健康度
  // 4. 消息與成長動能 (Growth & Catalyst)
  revenueYoYPct: number;           // 最新月營收年增率 YoY %
  revenueMoMPct: number;           // 最新月營收月增率 MoM %
  catalystNote: string;            // 法說展望與產業利基摘要
}

export interface ScreenerFilterCriteria {
  sectorId: 'all' | StockSectorId;
  minTurnoverYi: number;           // Step 1: 最低日均成交額 (億)
  requirePositiveFcf: boolean;     // Step 1/2: 要求自由現金流為正
  minRoePct: number;               // Step 2: 最低 ROE (%)
  maxPeRatio: number;              // Step 2: 最高本益比 P/E (防過高泡沫)
  minRevenueYoYPct: number;        // Step 3: 最低月營收年增率 YoY (%)
  requireAboveMa60: boolean;       // Step 4: 必須站上季線 (MA60)
  minMomentum60dPct: number;       // Step 4: 最低 60 日價格動能 (%)
  maxVolatilityPct: number;        // Step 4: 最高年化波動度 (%)
  requireInstBuy: boolean;         // Step 4: 三大法人近 5 日買超 > 0
  requireTrustBuy: boolean;        // Step 4: 投信近 5 日認養買超 > 0
}

export type WatchlistType = 'watching' | 'favorite';

export interface WatchlistStockItem {
  id: string;
  symbol: string;
  name: string;
  sectorName: string;
  listType: WatchlistType;         // 'watching' (觀察清單) | 'favorite' (喜好/自選核心清單)
  addedPrice: number;
  currentPrice: number;
  targetBuyPrice?: number;         // 理想觀察買點
  stopLossPrice?: number;          // 紀律停損點
  strategyTag: string;             // 選入之策略名稱 (例: 'Bottom-Up 四面向全能', '投信作帳突破')
  notes?: string;
  addedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

// ==========================================
// 8. 存錢計畫 (Savings Goals / Target Vaults)
// ==========================================

export type SavingsGoalCategory =
  | 'house_downpayment' // 買房頭期款
  | 'car_purchase'      // 購車基金
  | 'travel'            // 旅遊玩樂
  | 'emergency_fund'    // 緊急備用金
  | 'education'         // 進修與留學
  | 'retirement'        // 退休養老
  | 'custom';           // 自訂計畫

export interface SavingsGoal {
  id: string;
  title: string;                   // 計畫名稱 (例: '買房頭期款 200萬', '日本賞楓 10萬')
  category: SavingsGoalCategory;
  emoji: string;
  targetAmount: number;            // 目標總金額 (TWD)
  currentAmount: number;           // 目前已存金額 (TWD)
  targetDate: string;              // 預計達成日 YYYY-MM-DD
  linkedAccountId?: string;        // 專款專用綁定之銀行/數位帳戶 ID (選填)
  monthlyPlannedContribution?: number; // 每月預計提撥金額
  colorHex: string;
  notes?: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 9. 貸款試算與正式合約 (Loan & Debt Engine)
// ==========================================

export type LoanType = 'mortgage' | 'car' | 'personal' | 'revolving';
export type RepaymentMethod = 'equal_payment' | 'equal_principal' | 'grace_period' | 'interest_only';
export type RateType = 'fixed' | 'floating' | 'tiered';

export interface LoanTierRate {
  startMonth: number;              // 起始期數 (例: 1)
  endMonth: number;                // 結束期數 (例: 36)
  annualRatePct: number;           // 該階段年利率 % (例: 1.775)
}

export interface LoanSchedulePeriod {
  period: number;                 // 期數 (第 1 期 ... 第 360 期)
  paymentDate: string;            // 應繳日期 YYYY-MM-DD
  totalPayment: number;           // 本期應繳總額
  principalPayment: number;       // 本期應還本金 (減少貸款本金負債)
  interestPayment: number;        // 本期利息支出 (計入日常記帳生活花費)
  remainingPrincipal: number;     // 繳後剩餘本金
  isPaid: boolean;                // 是否已繳納
  paidDate?: string;              // 實際繳納日期
  linkedTransactionId?: string;   // 連動記帳之 Transaction ID
}

export interface LoanContract {
  id: string;
  title: string;                  // 貸款名稱 (例: '新青安房貸-青埔', 'Model Y 購車分期')
  loanType: LoanType;             // 房貸 | 車貸 | 信貸 | 理財型
  bankName: string;               // 承辦銀行 (例: '臺灣銀行', '玉山銀行')
  totalPrincipal: number;         // 原始貸款總本金 (例: 10000000)
  currentRemainingPrincipal: number; // 目前剩餘未償本金
  totalMonths: number;            // 總期數 (例: 360 個月 / 30 年)
  repaymentMethod: RepaymentMethod; // 還款模式 (本息均攤 / 本金均攤 / 寬限期 / 先還利息)
  gracePeriodMonths: number;      // 寬限期月數 (例: 36 或 60)
  annualRatePct: number;          // 基準年利率 % (例: 2.185)
  rateType: RateType;             // 固定 / 浮動 / 階梯
  tieredRates?: LoanTierRate[];   // 階梯利率分段設定
  startDate: string;              // 起貸日 YYYY-MM-DD
  monthlyPaymentDay: number;      // 每月扣款日 (1-31)
  autoDeductAccountId?: string;   // 綁定扣繳之銀行帳戶 ID
  schedule: LoanSchedulePeriod[]; // 逐期攤還表
  notes?: string;
  status: 'active' | 'settled';
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 10. 投資報酬率演算法與 ETF 專區
// ==========================================

export interface EtfHoldingPenetration {
  symbol: string;                 // 成分股代號 (例: '2330.TW', 'NVDA')
  name: string;                   // 成分股名稱 (例: '台積電', '輝達')
  weightPct: number;              // 佔 ETF 權重百分比 (例: 56.4)
  sector: string;                 // 產業族群 (例: '半導體', '科技')
}

export interface EtfProfile {
  symbol: string;                 // ETF 代號 (例: '0050.TW', 'VOO', '00878.TW')
  name: string;                   // ETF 名稱 (例: '元大台灣50', '國泰永續高股息')
  category: 'market_cap' | 'high_dividend' | 'bond' | 'tech_theme' | 'us_broad';
  issuer: string;                 // 發行投信 (例: '元大投信', '國泰投信', 'Vanguard')
  expenseRatioPct: number;        // 總內扣費用率 % (例: 0.32, 0.03)
  topHoldings: EtfHoldingPenetration[]; // 前十大成分股
  dividendFrequency: DividendFrequency;
  dividendMonths: number[];       // 配息月份
  nav: number;                    // 官方淨值 (TWD/USD)
  marketPrice: number;            // 市價
  premiumDiscountPct: number;     // 折溢價率 % (市價 - 淨值) / 淨值 * 100
  dividendYieldPct: number;       // 年化殖利率 %
  description: string;
}

export interface InvestmentPeriodReturn {
  label: string;                  // '2024 Q1', '2024 Q2', '2024 全部', '2025 年'
  periodType: 'quarter' | 'year' | 'standard';
  startValue: number;
  endValue: number;
  cashFlow: number;               // 淨入金 (+) 或 出金 (-)
  returnTwd: number;              // 絕對獲利金額
  twrrPct: number;                // 時間加權報酬率 %
  benchmarkTaiexPct?: number;     // 同期加權指數報酬 %
  alphaPct?: number;              // 超額報酬 %
}

export interface InvestmentReturnSummary {
  twrrPct: number;                // 總累積時間加權報酬率 % (排除出入金)
  mwrrPct: number;                // 金額加權報酬率 / 內部報酬率 IRR %
  simpleReturnPct: number;        // 簡單持有報酬率 %
  cagrPct: number;                // 年化複合成長率 %
  totalCostTwd: number;           // 累計投入本金 (TWD)
  currentMarketValueTwd: number;  // 目前持倉總現值 (TWD)
  totalPnlTwd: number;            // 未實現損益 (TWD)
  totalDividendsTwd: number;      // 累計已領股息/債息 (TWD)
  benchmarkTaiexPct: number;      // 大盤加權指數對比 %
  alphaTaiexPct: number;          // 對比大盤超額 Alpha %
  periodBreakdowns: InvestmentPeriodReturn[];
}

