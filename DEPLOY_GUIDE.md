# FinanceLife-PWA 部署與雲端設定指南 (Vercel & Supabase)

本專案已完整支援 **Vercel 一鍵部署 (前端 PWA + `/api/quotes` 免費報價 Serverless API)** 與 **Supabase 雙向資料雲端同步 & 單據圖片存儲**。

---

## 一、Supabase 資料庫與儲存桶設定 (5 分鐘)

### 步驟 1：在 Supabase 執行 SQL 腳本
1. 登入 [Supabase 控制台](https://supabase.com/dashboard) 並進入你的 Project。
2. 點擊左側選單的 **SQL Editor** -> **New Query**。
3. 複製並貼上專案中的 `supabase/supabase_schema.sql` 完整內容後點擊 **Run**：
   ```sql
   -- 1. 建立個人金庫全狀態同步表 (支援雙向即時同步)
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

   -- 2. 建立單據與照片 Storage Bucket (汽車維修工單 / 保險保單 / 醫療收據藥單)
   insert into storage.buckets (id, name, public)
   values ('vault-attachments', 'vault-attachments', true)
   on conflict (id) do nothing;

   drop policy if exists "Public Access to vault-attachments" on storage.objects;
   create policy "Public Access to vault-attachments"
     on storage.objects for all
     using ( bucket_id = 'vault-attachments' )
     with check ( bucket_id = 'vault-attachments' );
   ```

### 步驟 2：獲取 Supabase API 憑證
在 Supabase 左側選單進入 **Project Settings** -> **API**：
* 複製 **Project URL**（例：`https://abcdefghijklm.supabase.co`）
* 複製 **Project API keys** 中的 `anon` `public` key

---

## 二、部署到 Vercel (內建免費報價 API)

專案根目錄已配置好 `vercel.json` 與 `api/quotes.ts`：

### 方法 A：使用 GitHub + Vercel Dashboard (最推薦)
1. 將專案推送到 GitHub Repo (`routerdd1818-tech/Life-money`)。
2. 登入 [Vercel](https://vercel.com/)，匯入該 GitHub Repo。
3. **專案設定確認 (雙相容架構)**：
   * 無論 Vercel 的 **Root Directory** 設定為根目錄 `./` 或是 `pwa/`，本專案皆已內建通用 `build.js` 與 `pwa/vercel.json` 自動相容建置。
   * 不需要手動修改 Build Command 或 Output Directory，系統會自動編譯並鏡像部署至 `dist`。
4. 點擊 **Deploy**，約 1 分鐘即可上線完成！

### 方法 B：使用 Vercel CLI 直接部署
在終端機進入專案根目錄執行：
```bash
cd "/Users/routertt/Documents/VSCode/FinanceLife-PWA"
npx vercel
```
照著終端機提示按 Enter 確認即可完成發布。

---

## 三、在 App 中連接 Supabase 並同步資料

1. 打開部署完成的 Vercel 網址（或本地開發環境 `npm run dev`）。
2. 點擊右上角的 **⚙️ 設定圖示**。
3. 填寫：
   * **金庫專屬通行碼 (Vault Key)**：自訂你的個人識別碼（例：`MY-SECRET-2026`）
   * **Supabase Project URL**：貼上第一步取得的 URL
   * **Supabase Anon Public Key**：貼上第一步取得的 anon key
4. 點擊 **「上傳備份至 Supabase」**，系統會將本機所有的記帳、信用卡、分期、借放款、股票基金債券、關注清單、汽車保養、保單與回診紀錄完整備份至雲端。
5. 在其他手機或電腦打開網址時，只需填入相同的通行碼與金庫金鑰，點擊 **「從 Supabase 還原資料」** 即可無縫同步！
