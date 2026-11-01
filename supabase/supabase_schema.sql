-- =====================================================================
-- FinanceLife-PWA: 全方位個人財務資產與生活管家 Supabase Schema
-- 支援：記帳、信用卡額度週期、分期、借放款、固定收支、銀行/現金、
--       股票/ETF/基金/債券自動計價、汽車保養、保險保單、醫療回診、整合行事曆
-- =====================================================================

-- 1. 建立個人金庫全狀態同步表 (支援多使用者帳密/UUID 隔離，相容 vault_key)
create table if not exists public.user_vault_data (
  vault_key text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  email text,
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
  loans jsonb not null default '[]'::jsonb,
  savings_goals jsonb not null default '[]'::jsonb,
  trade_plans jsonb not null default '[]'::jsonb,
  exchange_rates jsonb not null default '{}'::jsonb,
  exchange_rate_usd_twd numeric not null default 32.18,
  updated_at timestamptz not null default now()
);

-- 若先前已存在該表，自動補充 user_id, email, loans, savings_goals, exchange_rates 欄位
alter table public.user_vault_data add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.user_vault_data add column if not exists email text;
alter table public.user_vault_data add column if not exists loans jsonb not null default '[]'::jsonb;
alter table public.user_vault_data add column if not exists savings_goals jsonb not null default '[]'::jsonb;
alter table public.user_vault_data add column if not exists trade_plans jsonb not null default '[]'::jsonb;
alter table public.user_vault_data add column if not exists exchange_rates jsonb not null default '{}'::jsonb;

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

-- =====================================================================
-- 3. 智慧同業比較與相對估值定價 (Peer Comparison & Relative Valuation)
-- =====================================================================

-- 3.1 股票同業與供應鏈/概念標籤表 (支援官方分類、概念股與 AI 演算法分群)
create table if not exists public.stock_peer_tags (
  stock_id varchar(20) not null,
  tag_name varchar(80) not null,
  tag_type varchar(30) default 'supply_chain', -- 'official' | 'supply_chain' | 'quant_cluster'
  primary key (stock_id, tag_name)
);

-- 3.2 每日估值與技術指標快照表 (供同業中位數與 ATR14 計算)
create table if not exists public.daily_stock_metrics (
  stock_id varchar(20) not null,
  trade_date date not null default current_date,
  close_price numeric(10, 2) not null,
  atr_14 numeric(10, 2),
  forward_pe numeric(10, 2),
  pb_ratio numeric(10, 2),
  peg_ratio numeric(10, 2),
  estimated_eps numeric(10, 2),
  rev_yoy_pct numeric(8, 2),
  opm_pct numeric(8, 2),
  roe_pct numeric(8, 2),
  inst_net_buy_5d_ratio numeric(8, 2),
  is_cyclical boolean default false,
  primary key (stock_id, trade_date)
);

-- 3.3 使用者交易計畫與動態止盈停損追蹤表
create table if not exists public.user_trade_plans (
  plan_id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  stock_id varchar(20) not null,
  peer_group_tag varchar(80),
  entry_price numeric(10, 2) not null,
  peer_fair_value numeric(10, 2), -- 同業中位數估值錨定之 TP2
  sl_price numeric(10, 2) not null,
  tp1_price numeric(10, 2) not null,
  tp2_price numeric(10, 2) not null,
  tp3_price numeric(10, 2) not null,
  current_stage varchar(30) default 'INITIAL', -- 'INITIAL' | 'TP1_HIT_BREAKEVEN' | 'TP2_HIT_TRAILING' | 'CLOSED'
  notes text,
  created_at timestamptz default now()
);

alter table public.stock_peer_tags enable row level security;
alter table public.daily_stock_metrics enable row level security;
alter table public.user_trade_plans enable row level security;

create policy "Allow read on stock_peer_tags" on public.stock_peer_tags for select using (true);
create policy "Allow read on daily_stock_metrics" on public.daily_stock_metrics for select using (true);
create policy "Allow user trade plans access" on public.user_trade_plans for all using (true) with check (true);

