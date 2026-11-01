-- =====================================================================
-- FinanceLife-PWA: 全方位個人財務資產與生活管家 Supabase Schema
-- 支援：記帳、信用卡額度週期、分期、借放款、固定收支、銀行/現金、
--       股票/ETF/基金/債券自動計價、汽車保養、保險保單、醫療回診、整合行事曆
-- =====================================================================

-- 1. 建立個人金庫全狀態同步表 (Local-First 雙向即時同步)
create table if not exists public.user_vault_data (
  vault_key text primary key,
  owner_name text not null default '我的財務與生活管家',
  transactions jsonb not null default '[]'::jsonb,
  credit_cards jsonb not null default '[]'::jsonb,
  installments jsonb not null default '[]'::jsonb,
  debt_records jsonb not null default '[]'::jsonb,
  recurring_items jsonb not null default '[]'::jsonb,
  asset_accounts jsonb not null default '[]'::jsonb,
  security_holdings jsonb not null default '[]'::jsonb,
  net_worth_snapshots jsonb not null default '[]'::jsonb,
  vehicles jsonb not null default '[]'::jsonb,
  insurance_policies jsonb not null default '[]'::jsonb,
  medical_records jsonb not null default '[]'::jsonb,
  manual_calendar_events jsonb not null default '[]'::jsonb,
  watchlist jsonb not null default '[]'::jsonb,
  exchange_rate_usd_twd numeric not null default 32.18,
  updated_at timestamptz not null default now()
);

-- 啟用 RLS 並允許金庫識別碼讀寫
alter table public.user_vault_data enable row level security;

drop policy if exists "Allow public read/write by vault_key" on public.user_vault_data;
create policy "Allow public read/write by vault_key"
  on public.user_vault_data
  for all
  using (true)
  with check (true);

-- 2. 建立單據與附件 Storage Bucket (汽車維修工單 / 保險保單 / 醫療收據藥單)
insert into storage.buckets (id, name, public)
values ('vault-attachments', 'vault-attachments', true)
on conflict (id) do nothing;

drop policy if exists "Public Access to vault-attachments" on storage.objects;
create policy "Public Access to vault-attachments"
  on storage.objects for all
  using ( bucket_id = 'vault-attachments' )
  with check ( bucket_id = 'vault-attachments' );
