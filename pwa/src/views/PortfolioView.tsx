import React, { useState } from 'react';
import {
  BarChart3,
  Building2,
  Coins,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { findSecurityPreset, SECURITY_PRESETS } from '../services/quoteService';
import { BankAccountType, DividendFrequency, InvestmentCategory, QuoteCurrency } from '../types';

type PortfolioSubTab = 'holdings' | 'accounts' | 'dividends' | 'networth';

export const PortfolioView: React.FC = () => {
  const {
    securityHoldings,
    upsertSecurityHolding,
    deleteSecurityHolding,
    assetAccounts,
    upsertAssetAccount,
    deleteAssetAccount,
    netWorthSummary,
    passiveIncomeSummary,
    netWorthSnapshots,
    exchangeRateUsdTwd,
    isQuoteSyncing,
    refreshQuotes,
  } = useVault();

  const [subTab, setSubTab] = useState<PortfolioSubTab>('holdings');
  const [filterCat, setFilterCat] = useState<'all' | InvestmentCategory>('all');

  // 新增投資部位狀態
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InvestmentCategory>('stock');
  const [units, setUnits] = useState('1000');
  const [costBasis, setCostBasis] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currency, setCurrency] = useState<QuoteCurrency>('TWD');
  const [divFreq, setDivFreq] = useState<DividendFrequency>('quarterly');
  const [yieldPct, setYieldPct] = useState('3.5');

  // 新增銀行/現金帳戶狀態
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<BankAccountType>('bank');
  const [accBalance, setAccBalance] = useState('');
  const [accLastFour, setAccLastFour] = useState('');
  const [accEmoji, setAccEmoji] = useState('🏦');

  // 當使用者輸入股票/基金/債券代號時，自動比對內建熱門庫帶入名稱與預設參考價
  const handleSymbolChange = (val: string) => {
    setSymbol(val);
    const preset = findSecurityPreset(val);
    if (preset) {
      setName(preset.name);
      setCategory(preset.category);
      setCurrency(preset.currency);
      setCurrentPrice(String(preset.defaultPrice));
      if (!costBasis) setCostBasis(String(preset.defaultPrice));
      setDivFreq(preset.dividendFrequency);
      setYieldPct(String(preset.estimatedAnnualYieldPct));
    }
  };

  const filteredHoldings =
    filterCat === 'all'
      ? securityHoldings
      : securityHoldings.filter((h) => h.category === filterCat);

  const totalCostTwd = securityHoldings.reduce(
    (s, h) => s + Math.round(h.units * h.costBasisPerUnit * h.exchangeRateToTwd),
    0
  );
  const totalPnlTwd = netWorthSummary.investmentTotal - totalCostTwd;
  const totalReturnPct =
    totalCostTwd > 0 ? Math.round((totalPnlTwd / totalCostTwd) * 10000) / 100 : 0;

  return (
    <div className="space-y-4 pb-24">
      {/* 子分頁切換 */}
      <div className="toss-pill-bar">
        {(
          [
            { id: 'holdings', label: '股票/基金/債券' },
            { id: 'accounts', label: '銀行與現金' },
            { id: 'dividends', label: '股息債息月曆' },
            { id: 'networth', label: '淨值走勢' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`toss-pill-btn flex-1 ${
              subTab === tab.id ? 'toss-pill-btn-active' : 'toss-pill-btn-inactive'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. 股票 / ETF / 基金 / 債券 自動計價部位 */}
      {subTab === 'holdings' && (
        <div className="space-y-4">
          <div className="toss-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[#8B95A1]">
                  證券投資總市值 (免費 API 自動計價 · 1 USD = {exchangeRateUsdTwd.toFixed(2)} TWD)
                </div>
                <div className="text-2xl font-bold tabular-nums text-[#191F28] dark:text-[#F2F4F8]">
                  NT$ {netWorthSummary.investmentTotal.toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isQuoteSyncing}
                  onClick={() => void refreshQuotes()}
                  className="px-3 py-2 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631] text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isQuoteSyncing ? 'animate-spin text-[#2563EB]' : ''}`} />
                  <span>重算現值</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddHolding(!showAddHolding)}
                  className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>新增標的</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2.5 border-t border-[#EAEDF2] dark:border-[#262C36] text-xs tabular-nums">
              <span className="text-[#4E5968] dark:text-[#9BA4B0]">
                投入總成本：NT$ {totalCostTwd.toLocaleString()}
              </span>
              <span
                className={`font-bold ${
                  totalPnlTwd >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                }`}
              >
                未實現損益：{totalPnlTwd >= 0 ? '▲ +' : '▼ '}
                NT$ {totalPnlTwd.toLocaleString()} ({totalReturnPct >= 0 ? '+' : ''}
                {totalReturnPct}%)
              </span>
            </div>
          </div>

          {showAddHolding && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const u = Number(units);
                const cost = Number(costBasis);
                const price = Number(currentPrice) || cost;
                if (!symbol || !name || u <= 0) return;

                const preset = findSecurityPreset(symbol);
                upsertSecurityHolding({
                  id: `hold-${Date.now()}`,
                  symbol: symbol.trim().toUpperCase(),
                  name: name.trim(),
                  category,
                  units: u,
                  costBasisPerUnit: cost,
                  currentPrice: price,
                  currency,
                  exchangeRateToTwd: currency === 'USD' ? exchangeRateUsdTwd : 1,
                  dividendFrequency: divFreq,
                  estimatedAnnualYieldPct: Number(yieldPct) || 0,
                  dividendMonths: preset?.dividendMonths,
                  lastQuotedAt: new Date().toISOString(),
                  quoteSource: 'yahoo',
                });
                setSymbol('');
                setName('');
                setShowAddHolding(false);
                setTimeout(() => void refreshQuotes(), 200);
              }}
              className="toss-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">
                  輸入股票 / ETF / 基金 / 債券代號 (自動抓取最新收盤價)
                </span>
                <span className="text-[11px] text-[#2563EB] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  支援 .TW / .TWO / 美股 / 基金代號
                </span>
              </div>

              {/* 熱門代號一鍵帶入膠囊 */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {SECURITY_PRESETS.slice(0, 10).map((p) => (
                  <button
                    key={p.symbol}
                    type="button"
                    onClick={() => handleSymbolChange(p.symbol)}
                    className="px-2.5 py-1 rounded-lg bg-[#F0F2F6] dark:bg-[#1F2631] hover:bg-[#2563EB] hover:text-white text-[11px] font-medium whitespace-nowrap transition-colors"
                  >
                    {p.symbol.replace(/\.(TW|TWO)$/, '')} {p.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] text-[#8B95A1]">代號 (Symbol / ISIN)</label>
                  <input
                    type="text"
                    required
                    placeholder="例: 2330, 00679B, VOO"
                    value={symbol}
                    onChange={(e) => handleSymbolChange(e.target.value)}
                    className="toss-input uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">標的名稱</label>
                  <input
                    type="text"
                    required
                    placeholder="例: 台積電 / 元大美債20年"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="toss-input"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">資產類別</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as InvestmentCategory)}
                    className="toss-input"
                  >
                    <option value="stock">股票 (Stock)</option>
                    <option value="etf">股票型 ETF</option>
                    <option value="bond">債券 / 債券 ETF</option>
                    <option value="fund">共同基金 (Fund)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">持有股數 / 單位數</label>
                  <input
                    type="number"
                    required
                    step="any"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">買進平均成本 (原幣)</label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="平均買進價"
                    value={costBasis}
                    onChange={(e) => setCostBasis(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">目前單價/淨值 (自動更新)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="儲存後自動抓最新價"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">計價幣別</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as QuoteCurrency)}
                    className="toss-input"
                  >
                    <option value="TWD">新台幣 (TWD)</option>
                    <option value="USD">美元 (USD 自動折算台幣)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">配息頻率</label>
                  <select
                    value={divFreq}
                    onChange={(e) => setDivFreq(e.target.value as DividendFrequency)}
                    className="toss-input"
                  >
                    <option value="monthly">月配息</option>
                    <option value="quarterly">季配息</option>
                    <option value="semi_annual">半年配</option>
                    <option value="annual">年配息</option>
                    <option value="none">不配息 / 累積型</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">預估年化配息率 (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={yieldPct}
                    onChange={(e) => setYieldPct(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
              >
                加入投資組合並同步最新報價
              </button>
            </form>
          )}

          {/* 類別篩選膠囊 */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'all', label: '全部部位' },
                { id: 'stock', label: '個股' },
                { id: 'etf', label: '市值/高息 ETF' },
                { id: 'bond', label: '債券 / 債券ETF' },
                { id: 'fund', label: '共同基金' },
              ] as const
            ).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilterCat(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterCat === c.id
                    ? 'bg-[#191F28] dark:bg-white text-white dark:text-[#191F28]'
                    : 'bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] text-[#4E5968] dark:text-[#9BA4B0]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredHoldings.map((h) => {
              const catBadge =
                h.category === 'bond'
                  ? '債券/債ETF'
                  : h.category === 'fund'
                    ? '共同基金'
                    : h.category === 'etf'
                      ? 'ETF'
                      : '股票';

              return (
                <div key={h.id} className="toss-card p-4 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          {h.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#F0F2F6] dark:bg-[#1F2631] text-[11px] font-mono text-[#4E5968] dark:text-[#9BA4B0]">
                          {h.symbol}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-[10px] font-semibold text-[#2563EB]">
                          {catBadge}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8B95A1] tabular-nums mt-0.5">
                        持有 {h.units.toLocaleString()} 單位 · 成本 {h.currency}{' '}
                        {h.costBasisPerUnit.toLocaleString()}
                        {h.estimatedAnnualYieldPct
                          ? ` · 預估殖利率 ${h.estimatedAnnualYieldPct}%`
                          : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right tabular-nums">
                        <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          NT$ {h.marketValueTwd.toLocaleString()}
                        </div>
                        <div
                          className={`text-xs font-bold ${
                            h.unrealizedPnlTwd >= 0 ? 'text-[#F04452]' : 'text-[#059669]'
                          }`}
                        >
                          {h.unrealizedPnlTwd >= 0 ? '▲ +' : '▼ '}
                          {h.unrealizedPnlTwd.toLocaleString()} ({h.unrealizedReturnPct >= 0 ? '+' : ''}
                          {h.unrealizedReturnPct}%)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteSecurityHolding(h.id)}
                        className="p-1 text-[#8B95A1] hover:text-[#F04452]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] text-xs text-[#4E5968] dark:text-[#9BA4B0] tabular-nums">
                    <span>
                      最新現價：
                      <strong className="text-[#191F28] dark:text-white ml-1">
                        {h.currency} {h.currentPrice.toLocaleString()}
                      </strong>
                      {h.previousClose ? (
                        <span className="text-[11px] text-[#8B95A1] ml-1.5">
                          (昨收 {h.previousClose})
                        </span>
                      ) : null}
                    </span>
                    <span className="text-[11px] text-[#8B95A1]">
                      更新於 {new Date(h.lastQuotedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. 銀行帳戶與現金管理 */}
      {subTab === 'accounts' && (
        <div className="space-y-4">
          <div className="toss-card p-4 flex items-center justify-between">
            <div className="tabular-nums">
              <div className="text-xs text-[#8B95A1]">銀行活定存 + 交割戶 + 現金 + 電子支付總計</div>
              <div className="text-2xl font-bold text-[#191F28] dark:text-[#F2F4F8]">
                NT$ {netWorthSummary.cashAndBankTotal.toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddAcc(!showAddAcc)}
              className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>新增帳戶</span>
            </button>
          </div>

          {showAddAcc && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!accName) return;
                upsertAssetAccount({
                  id: `acc-${Date.now()}`,
                  name: accName,
                  type: accType,
                  balance: Number(accBalance) || 0,
                  accountLastFour: accLastFour || undefined,
                  colorHex: '#2563EB',
                  emoji: accEmoji || '🏦',
                  updatedAt: new Date().toISOString(),
                });
                setAccName('');
                setAccBalance('');
                setShowAddAcc(false);
              }}
              className="toss-card p-4 space-y-3"
            >
              <div className="text-xs font-bold">新增銀行帳戶或現金錢包</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="帳戶名稱 (例: 永豐大戶)"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="toss-input"
                />
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as BankAccountType)}
                  className="toss-input"
                >
                  <option value="bank">銀行存款帳戶</option>
                  <option value="brokerage_cash">證券交割戶</option>
                  <option value="cash">實體現金錢包</option>
                  <option value="digital_wallet">電子支付 (Line Pay等)</option>
                </select>
                <input
                  type="number"
                  required
                  placeholder="目前餘額 (TWD)"
                  value={accBalance}
                  onChange={(e) => setAccBalance(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <input
                  type="text"
                  maxLength={4}
                  placeholder="帳號末四碼 (選填)"
                  value={accLastFour}
                  onChange={(e) => setAccLastFour(e.target.value)}
                  className="toss-input tabular-nums"
                />
                <input
                  type="text"
                  placeholder="圖示 Emoji"
                  value={accEmoji}
                  onChange={(e) => setAccEmoji(e.target.value)}
                  className="toss-input text-center"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
              >
                儲存帳戶
              </button>
            </form>
          )}

          <div className="space-y-3">
            {assetAccounts.map((acc) => (
              <div
                key={acc.id}
                className="toss-card p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] flex items-center justify-center text-lg">
                    {acc.emoji || <Building2 className="w-5 h-5 text-[#2563EB]" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                      {acc.name}{' '}
                      {acc.accountLastFour ? (
                        <span className="text-xs font-normal text-[#8B95A1] tabular-nums">
                          ({acc.accountLastFour})
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-[#8B95A1]">
                      {acc.type === 'bank'
                        ? '銀行存款'
                        : acc.type === 'brokerage_cash'
                          ? '證券交割戶'
                          : acc.type === 'cash'
                            ? '現金錢包'
                            : '行動電子支付'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right tabular-nums">
                    <div className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8]">
                      NT$ {acc.balance.toLocaleString()}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = prompt(`校準「${acc.name}」目前實際餘額：`, String(acc.balance));
                        if (nextVal !== null && !Number.isNaN(Number(nextVal))) {
                          upsertAssetAccount({
                            ...acc,
                            balance: Number(nextVal),
                            updatedAt: new Date().toISOString(),
                          });
                        }
                      }}
                      className="text-[11px] text-[#2563EB] font-medium"
                    >
                      一鍵校準餘額
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteAssetAccount(acc.id)}
                    className="p-1 text-[#8B95A1] hover:text-[#F04452]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. 擴充功能 #3：股息 / 債息被動收入 12 個月現金流月曆 */}
      {subTab === 'dividends' && (
        <div className="space-y-4">
          <div className="toss-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold">年度股息與債息現金流預估</h3>
              </div>
              <span className="text-xs font-bold text-[#2563EB] tabular-nums">
                固定支出覆蓋率 {passiveIncomeSummary.coverageRatioPct}%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 tabular-nums">
              <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                <div className="text-[11px] text-[#8B95A1]">預估年領總息收</div>
                <div className="text-base font-bold text-[#191F28] dark:text-white">
                  ${passiveIncomeSummary.annualPassiveIncomeTwd.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                <div className="text-[11px] text-[#8B95A1]">平均每月被動收入</div>
                <div className="text-base font-bold text-[#059669]">
                  +${passiveIncomeSummary.monthlyAveragePassiveIncomeTwd.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
                <div className="text-[11px] text-[#8B95A1]">每月剛性固定支出</div>
                <div className="text-base font-bold text-[#F04452]">
                  -${passiveIncomeSummary.monthlyFixedExpenseTwd.toLocaleString()}
                </div>
              </div>
            </div>

            {/* 1~12 月配息柱狀分佈 */}
            <div className="pt-3">
              <div className="text-xs font-semibold text-[#4E5968] dark:text-[#9BA4B0] mb-3">
                1 ~ 12 月預估領息月曆 (TWD)
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 tabular-nums">
                {passiveIncomeSummary.monthlyBreakdown.map((amt, idx) => {
                  const maxMonth = Math.max(...passiveIncomeSummary.monthlyBreakdown, 1);
                  const barPct = Math.round((amt / maxMonth) * 100);
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] space-y-1.5"
                    >
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-[#4E5968] dark:text-[#9BA4B0]">
                          {idx + 1} 月
                        </span>
                        <span className="font-bold text-[#191F28] dark:text-white">
                          ${amt.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#EAEDF2] dark:bg-[#262C36] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#2563EB]"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. 每日淨值快照與資產結構 */}
      {subTab === 'networth' && (
        <div className="space-y-4">
          <div className="toss-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold">資產負債結構與每日淨值紀錄</h3>
              </div>
              <span className="text-xs text-[#8B95A1] tabular-nums">
                淨值 NT$ {netWorthSummary.netWorth.toLocaleString()}
              </span>
            </div>

            <div className="space-y-2 tabular-nums text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#EAEDF2] dark:border-[#262C36]">
                <span className="text-[#4E5968] dark:text-[#9BA4B0]">銀行存款與現金總計</span>
                <span className="font-bold">NT$ {netWorthSummary.cashAndBankTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EAEDF2] dark:border-[#262C36]">
                <span className="text-[#4E5968] dark:text-[#9BA4B0]">股票 / ETF / 基金 / 債券現值</span>
                <span className="font-bold text-[#2563EB]">
                  NT$ {netWorthSummary.investmentTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EAEDF2] dark:border-[#262C36]">
                <span className="text-[#4E5968] dark:text-[#9BA4B0]">儲蓄險保單價值準備金</span>
                <span className="font-bold">
                  NT$ {netWorthSummary.insuranceCashValueTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EAEDF2] dark:border-[#262C36]">
                <span className="text-[#4E5968] dark:text-[#9BA4B0]">應收債權 (別人欠我)</span>
                <span className="font-bold text-[#059669]">
                  +NT$ {netWorthSummary.receivablesTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EAEDF2] dark:border-[#262C36]">
                <span className="text-[#4E5968] dark:text-[#9BA4B0]">信用卡已出帳与未出帳負債</span>
                <span className="font-bold text-[#F04452]">
                  -NT$ {netWorthSummary.creditCardLiabilityTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#4E5968] dark:text-[#9BA4B0]">分期尾款與借入貸款餘額</span>
                <span className="font-bold text-[#F04452]">
                  -NT${' '}
                  {(
                    netWorthSummary.debtLiabilityTotal + netWorthSummary.installmentRemainingTotal
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#EAEDF2] dark:border-[#262C36] space-y-2">
              <div className="text-xs font-semibold text-[#8B95A1] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>歷史每日淨值快照</span>
              </div>
              {netWorthSnapshots.map((snap) => (
                <div
                  key={snap.date}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] text-xs tabular-nums"
                >
                  <span className="font-medium">{snap.date}</span>
                  <span className="font-bold text-[#191F28] dark:text-white">
                    NT$ {snap.netWorth.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
