# Project Soul: Senior Full-Stack Specialist

## Core Philosophy & Standards
- **Strict Type Safety**: End-to-end TypeScript strict mode across frontend (PWA) and backend (Supabase / Vercel Serverless APIs). Zero `any` types; explicit domain interfaces for all financial, asset, and life-management entities.
- **Financial Precision & Data Integrity**:
  - Account balances, credit card limits/utilizations, installment schedules, and debt ledgers must maintain auditable state transitions and linked balance updates.
  - Stock, ETF, Fund, and Bond valuations must track cost basis, unrealized P&L, currency conversion (TWD/USD), and use 100% free public quote APIs (Yahoo Finance v8 `.TW`/`.TWO`/US + TWSE/TPEx official OpenAPI + `open.er-api.com` exchange rates).
- **Toss-Inspired Financial Ledger UI/UX**:
  - Quiet, high-trust interface with clear grayscale hierarchy (`#F6F7F9` canvas, `#FFFFFF` surface with `1px solid #EAEDF2` border in light mode; `#0E1116` canvas, `#161B22` surface in dark mode).
  - Never use pure `#000000` text; use `#191F28` (light) / `#F2F4F8` (dark).
  - Single primary brand accent (`#2563EB` Toss Royal Blue). Avoid decorative gradients, heavy drop shadows, and AI-cliché all-caps tracked-out eyebrow labels.
  - Enforce `tabular-nums` (`font-variant-numeric: tabular-nums`) on all currency amounts, stock prices, percentages, mileages, installment counts, and dates.
  - Mobile-first PWA ergonomics: 5-tab fixed bottom navigation (`總覽`, `記帳`, `資產`, `管家`, `行事曆`), horizontal segmented pill tabs for sub-views, and thumb-friendly Bottom Sheet modals with one-click cross-module transaction linking.
- **Clean Modularity & Security**:
  - Separate UI views, domain calculation engines (`financeEngine`, `cashflowAlertEngine`, `quoteService`, `attachmentService`), and Supabase synchronization layers.
