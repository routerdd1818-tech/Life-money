import { createClient } from '@supabase/supabase-js';
import {
  AssetAccount,
  CalendarEventItem,
  CreditCard,
  DebtRecord,
  ExchangeRatesTable,
  Installment,
  InsurancePolicy,
  LoanContract,
  MedicalRecord,
  NetWorthSnapshot,
  RecurringItem,
  SavingsGoal,
  SecurityHolding,
  Transaction,
  UserTradePlan,
  VaultSettings,
  VehicleProfile,
  WatchlistStockItem,
} from '../types';

export interface CloudVaultPayload {
  vault_key: string;
  user_id?: string;
  email?: string;
  owner_name: string;
  transactions: Transaction[];
  credit_cards: CreditCard[];
  installments: Installment[];
  debt_records: DebtRecord[];
  recurring_items: RecurringItem[];
  asset_accounts: AssetAccount[];
  security_holdings: SecurityHolding[];
  net_worth_snapshots: NetWorthSnapshot[];
  vehicles: VehicleProfile[];
  insurance_policies: InsurancePolicy[];
  medical_records: MedicalRecord[];
  manual_calendar_events: CalendarEventItem[];
  watchlist?: WatchlistStockItem[];
  trade_plans?: UserTradePlan[];
  loans?: LoanContract[];
  savings_goals?: SavingsGoal[];
  exchange_rates?: ExchangeRatesTable;
  exchange_rate_usd_twd: number;
  updated_at: string;
}

export function getSupabaseClient(settings: VaultSettings) {
  if (!settings.supabaseUrl || !settings.supabaseAnonKey) return null;
  return createClient(settings.supabaseUrl.trim(), settings.supabaseAnonKey.trim(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export async function pushVaultToSupabase(
  settings: VaultSettings,
  payload: Omit<CloudVaultPayload, 'vault_key' | 'owner_name' | 'updated_at'>,
  userId?: string,
  userEmail?: string
): Promise<{ ok: boolean; message: string; syncedAt?: string }> {
  if (!settings.supabaseUrl || !settings.supabaseAnonKey || !settings.vaultKey) {
    return { ok: false, message: '請先於設定中填寫 Supabase URL、Anon Key 與金庫通行碼' };
  }

  try {
    const supabase = getSupabaseClient(settings);
    if (!supabase) return { ok: false, message: 'Supabase 客戶端初始化失敗' };

    const nowIso = new Date().toISOString();
    const row: CloudVaultPayload = {
      vault_key: settings.vaultKey.trim(),
      user_id: userId,
      email: userEmail,
      owner_name: settings.ownerName || '我的財務與生活管家',
      ...payload,
      updated_at: nowIso,
    };

    const { error } = await supabase.from('user_vault_data').upsert(row, {
      onConflict: 'vault_key',
    });

    if (error) {
      return { ok: false, message: `雲端上傳失敗：${error.message}` };
    }

    return { ok: true, message: '已成功同步至 Supabase 雲端金庫', syncedAt: nowIso };
  } catch (err) {
    return { ok: false, message: `連線異常：${String(err)}` };
  }
}

export async function pullVaultFromSupabase(
  settings: VaultSettings
): Promise<{ ok: boolean; message: string; data?: CloudVaultPayload }> {
  if (!settings.supabaseUrl || !settings.supabaseAnonKey || !settings.vaultKey) {
    return { ok: false, message: '請先於設定中填寫 Supabase URL、Anon Key 與金庫通行碼' };
  }

  try {
    const supabase = getSupabaseClient(settings);
    if (!supabase) return { ok: false, message: 'Supabase 客戶端初始化失敗' };

    const { data, error } = await supabase
      .from('user_vault_data')
      .select('*')
      .eq('vault_key', settings.vaultKey.trim())
      .maybeSingle();

    if (error) {
      return { ok: false, message: `雲端讀取失敗：${error.message}` };
    }
    if (!data) {
      return { ok: false, message: `找不到通行碼「${settings.vaultKey}」的雲端備份紀錄` };
    }

    return {
      ok: true,
      message: '已成功從 Supabase 載入最新資料',
      data: data as CloudVaultPayload,
    };
  } catch (err) {
    return { ok: false, message: `連線異常：${String(err)}` };
  }
}
