/**
 * ETF 專區與成分穿透引擎 (ETF Command Center & Penetration Engine)
 * 涵蓋：
 * 1. 台股與美股熱門 ETF 智慧成分字典 (前十大持股權重、發行投信、內扣費用率、配息月份、折溢價率)
 * 2. 個人投資組合底層成分股穿透與集中度/重疊警報 (Overlap & Concentration Scanner)
 * 3. 配息月曆矩陣與「月月領息」時間軸組建器 (Monthly Cashflow Matrix)
 * 4. ETF 股息再投入滾利模擬器 (DRIP Compound Growth Simulator)
 */

import { EtfProfile, SecurityHolding } from '../types';

export const ETF_PROFILES: EtfProfile[] = [
  // 1. 台股市值型
  {
    symbol: '0050.TW',
    name: '元大台灣卓越50',
    category: 'market_cap',
    issuer: '元大投信',
    expenseRatioPct: 0.43,
    nav: 196.2,
    marketPrice: 196.5,
    premiumDiscountPct: 0.15, // 溢價 0.15%
    dividendYieldPct: 3.2,
    dividendFrequency: 'semi_annual',
    dividendMonths: [1, 7],
    description: '涵蓋台灣上市前50大龍頭企業，台積電佔比逾56%，與大盤高度同步',
    topHoldings: [
      { symbol: '2330.TW', name: '台積電', weightPct: 56.4, sector: '半導體' },
      { symbol: '2454.TW', name: '聯發科', weightPct: 5.1, sector: 'IC設計' },
      { symbol: '2317.TW', name: '鴻海', weightPct: 4.8, sector: '電子代工' },
      { symbol: '2308.TW', name: '台達電', weightPct: 2.1, sector: '電源散熱' },
      { symbol: '2382.TW', name: '廣達', weightPct: 1.8, sector: 'AI伺服器' },
      { symbol: '2881.TW', name: '富邦金', weightPct: 1.6, sector: '金融保險' },
      { symbol: '2882.TW', name: '國泰金', weightPct: 1.5, sector: '金融保險' },
      { symbol: '2891.TW', name: '中信金', weightPct: 1.4, sector: '金融保險' },
      { symbol: '3711.TW', name: '日月光投控', weightPct: 1.2, sector: '半導體封測' },
      { symbol: '2603.TW', name: '長榮', weightPct: 1.1, sector: '航運貨櫃' },
    ],
  },
  {
    symbol: '006208.TW',
    name: '富邦台灣采吉50',
    category: 'market_cap',
    issuer: '富邦投信',
    expenseRatioPct: 0.24,
    nav: 114.3,
    marketPrice: 114.5,
    premiumDiscountPct: 0.17,
    dividendYieldPct: 3.1,
    dividendFrequency: 'semi_annual',
    dividendMonths: [7, 11],
    description: '低內扣費版本台灣50指數，長期投資與定期定額首選',
    topHoldings: [
      { symbol: '2330.TW', name: '台積電', weightPct: 56.2, sector: '半導體' },
      { symbol: '2454.TW', name: '聯發科', weightPct: 5.0, sector: 'IC設計' },
      { symbol: '2317.TW', name: '鴻海', weightPct: 4.7, sector: '電子代工' },
      { symbol: '2308.TW', name: '台達電', weightPct: 2.1, sector: '電源散熱' },
      { symbol: '2382.TW', name: '廣達', weightPct: 1.8, sector: 'AI伺服器' },
      { symbol: '2881.TW', name: '富邦金', weightPct: 1.6, sector: '金融保險' },
      { symbol: '2882.TW', name: '國泰金', weightPct: 1.5, sector: '金融保險' },
      { symbol: '2891.TW', name: '中信金', weightPct: 1.4, sector: '金融保險' },
      { symbol: '3711.TW', name: '日月光投控', weightPct: 1.2, sector: '半導體封測' },
      { symbol: '2603.TW', name: '長榮', weightPct: 1.1, sector: '航運貨櫃' },
    ],
  },

  // 2. 台股高股息型
  {
    symbol: '00878.TW',
    name: '國泰台灣ESG永續高股息',
    category: 'high_dividend',
    issuer: '國泰投信',
    expenseRatioPct: 0.28,
    nav: 22.88,
    marketPrice: 22.85,
    premiumDiscountPct: -0.13, // 折價 0.13%
    dividendYieldPct: 7.2,
    dividendFrequency: 'quarterly',
    dividendMonths: [2, 5, 8, 11],
    description: '首檔突破百萬受益人之季配息高股息ETF，重視過去三年配息穩定度與ESG評級',
    topHoldings: [
      { symbol: '2382.TW', name: '廣達', weightPct: 4.3, sector: 'AI伺服器' },
      { symbol: '3231.TW', name: '緯創', weightPct: 4.1, sector: 'AI伺服器' },
      { symbol: '2357.TW', name: '華碩', weightPct: 3.9, sector: '電腦周邊' },
      { symbol: '2301.TW', name: '光寶科', weightPct: 3.8, sector: '電源系統' },
      { symbol: '2412.TW', name: '中華電', weightPct: 3.6, sector: '電信電信' },
      { symbol: '2881.TW', name: '富邦金', weightPct: 3.5, sector: '金融保險' },
      { symbol: '2882.TW', name: '國泰金', weightPct: 3.4, sector: '金融保險' },
      { symbol: '2308.TW', name: '台達電', weightPct: 3.3, sector: '電源散熱' },
      { symbol: '2891.TW', name: '中信金', weightPct: 3.2, sector: '金融保險' },
      { symbol: '2379.TW', name: '瑞昱', weightPct: 3.1, sector: 'IC設計' },
    ],
  },
  {
    symbol: '0056.TW',
    name: '元大台灣高股息',
    category: 'high_dividend',
    issuer: '元大投信',
    expenseRatioPct: 0.35,
    nav: 37.8,
    marketPrice: 37.9,
    premiumDiscountPct: 0.26,
    dividendYieldPct: 7.8,
    dividendFrequency: 'quarterly',
    dividendMonths: [1, 4, 7, 10],
    description: '歷史最悠久高股息ETF，預測未來一年現金股利殖利率最高前50檔',
    topHoldings: [
      { symbol: '2382.TW', name: '廣達', weightPct: 4.2, sector: 'AI伺服器' },
      { symbol: '2454.TW', name: '聯發科', weightPct: 3.8, sector: 'IC設計' },
      { symbol: '2357.TW', name: '華碩', weightPct: 3.5, sector: '電腦周邊' },
      { symbol: '2603.TW', name: '長榮', weightPct: 3.4, sector: '航運貨櫃' },
      { symbol: '3231.TW', name: '緯創', weightPct: 3.2, sector: 'AI伺服器' },
      { symbol: '2301.TW', name: '光寶科', weightPct: 3.0, sector: '電源系統' },
      { symbol: '2881.TW', name: '富邦金', weightPct: 2.9, sector: '金融保險' },
      { symbol: '2891.TW', name: '中信金', weightPct: 2.8, sector: '金融保險' },
      { symbol: '2379.TW', name: '瑞昱', weightPct: 2.7, sector: 'IC設計' },
      { symbol: '2303.TW', name: '聯電', weightPct: 2.5, sector: '半導體' },
    ],
  },
  {
    symbol: '00919.TW',
    name: '群益台灣精選高息',
    category: 'high_dividend',
    issuer: '群益投信',
    expenseRatioPct: 0.30,
    nav: 23.4,
    marketPrice: 23.45,
    premiumDiscountPct: 0.21,
    dividendYieldPct: 10.2,
    dividendFrequency: 'quarterly',
    dividendMonths: [3, 6, 9, 12],
    description: '精準卡位董事會已宣告股利之標的，配息爆發力強勁',
    topHoldings: [
      { symbol: '2603.TW', name: '長榮', weightPct: 10.5, sector: '航運貨櫃' },
      { symbol: '2454.TW', name: '聯發科', weightPct: 8.9, sector: 'IC設計' },
      { symbol: '2382.TW', name: '廣達', weightPct: 6.8, sector: 'AI伺服器' },
      { symbol: '2357.TW', name: '華碩', weightPct: 5.9, sector: '電腦周邊' },
      { symbol: '2609.TW', name: '陽明', weightPct: 5.5, sector: '航運貨櫃' },
      { symbol: '2303.TW', name: '聯電', weightPct: 5.2, sector: '半導體' },
      { symbol: '2891.TW', name: '中信金', weightPct: 4.8, sector: '金融保險' },
      { symbol: '3231.TW', name: '緯創', weightPct: 4.5, sector: 'AI伺服器' },
      { symbol: '2379.TW', name: '瑞昱', weightPct: 4.1, sector: 'IC設計' },
      { symbol: '2404.TW', name: '漢唐', weightPct: 3.8, sector: '半導體無塵室' },
    ],
  },
  {
    symbol: '00929.TW',
    name: '復華台灣科技優息',
    category: 'high_dividend',
    issuer: '復華投信',
    expenseRatioPct: 0.33,
    nav: 18.25,
    marketPrice: 18.28,
    premiumDiscountPct: 0.16,
    dividendYieldPct: 8.5,
    dividendFrequency: 'monthly',
    dividendMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    description: '首檔月配型台股高股息ETF，專注電子科技高息股，搭配ROE與低波動篩選',
    topHoldings: [
      { symbol: '2454.TW', name: '聯發科', weightPct: 8.5, sector: 'IC設計' },
      { symbol: '2382.TW', name: '廣達', weightPct: 8.2, sector: 'AI伺服器' },
      { symbol: '2357.TW', name: '華碩', weightPct: 7.8, sector: '電腦周邊' },
      { symbol: '2301.TW', name: '光寶科', weightPct: 7.2, sector: '電源系統' },
      { symbol: '2303.TW', name: '聯電', weightPct: 6.5, sector: '半導體' },
      { symbol: '2379.TW', name: '瑞昱', weightPct: 6.1, sector: 'IC設計' },
      { symbol: '3034.TW', name: '聯詠', weightPct: 5.5, sector: 'IC設計' },
      { symbol: '3702.TW', name: '大聯大', weightPct: 4.8, sector: 'IC通路' },
      { symbol: '6669.TW', name: '緯穎', weightPct: 4.2, sector: 'AI伺服器' },
      { symbol: '2449.TW', name: '京元電子', weightPct: 3.9, sector: '半導體測試' },
    ],
  },

  // 3. 債券型
  {
    symbol: '00679B.TWO',
    name: '元大美債20年',
    category: 'bond',
    issuer: '元大投信',
    expenseRatioPct: 0.14,
    nav: 30.12,
    marketPrice: 30.15,
    premiumDiscountPct: 0.10,
    dividendYieldPct: 4.5,
    dividendFrequency: 'quarterly',
    dividendMonths: [2, 5, 8, 11],
    description: '追蹤美國長天期公債指數，降息循環受惠資產，避險防禦核心配置',
    topHoldings: [
      { symbol: 'US-T20', name: '美國財政部20年期以上公債券組', weightPct: 99.8, sector: '美國政府公債' },
    ],
  },
  {
    symbol: '00937B.TWO',
    name: '群益ESG投等債20+',
    category: 'bond',
    issuer: '群益投信',
    expenseRatioPct: 0.16,
    nav: 15.65,
    marketPrice: 15.68,
    premiumDiscountPct: 0.19,
    dividendYieldPct: 6.2,
    dividendFrequency: 'monthly',
    dividendMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    description: '全球前瞻 ESG 投資等級公司債，月月配息，具備防禦性與穩定高債息',
    topHoldings: [
      { symbol: 'CORP-ESG', name: '國際頂級企業ESG長天期公司債組', weightPct: 99.5, sector: '投資等級公司債' },
    ],
  },

  // 4. 美股大盤與科技龍頭
  {
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    category: 'us_broad',
    issuer: 'Vanguard',
    expenseRatioPct: 0.03,
    nav: 524.5,
    marketPrice: 524.8,
    premiumDiscountPct: 0.06,
    dividendYieldPct: 1.4,
    dividendFrequency: 'quarterly',
    dividendMonths: [3, 6, 9, 12],
    description: '巴菲特最推崇的標普500指數ETF，超低內扣費用率 0.03%',
    topHoldings: [
      { symbol: 'AAPL', name: 'Apple 蘋果', weightPct: 7.2, sector: '消費電子' },
      { symbol: 'MSFT', name: 'Microsoft 微軟', weightPct: 6.8, sector: '軟體雲端' },
      { symbol: 'NVDA', name: 'NVIDIA 輝達', weightPct: 6.5, sector: 'AI半導體' },
      { symbol: 'AMZN', name: 'Amazon 亞馬遜', weightPct: 3.8, sector: '電商雲端' },
      { symbol: 'META', name: 'Meta 臉書', weightPct: 2.6, sector: '社群網路' },
      { symbol: 'GOOGL', name: 'Alphabet 谷歌', weightPct: 2.4, sector: '網路科技' },
      { symbol: 'BRK.B', name: 'Berkshire 波克夏', weightPct: 1.8, sector: '多元金融' },
      { symbol: 'TSLA', name: 'Tesla 特斯拉', weightPct: 1.7, sector: '電動車' },
      { symbol: 'AVGO', name: 'Broadcom 博通', weightPct: 1.6, sector: '網通晶片' },
      { symbol: 'JPM', name: 'JPMorgan 摩根大通', weightPct: 1.4, sector: '投資銀行' },
    ],
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust (Nasdaq 100)',
    category: 'tech_theme',
    issuer: 'Invesco',
    expenseRatioPct: 0.20,
    nav: 495.2,
    marketPrice: 495.4,
    premiumDiscountPct: 0.04,
    dividendYieldPct: 0.6,
    dividendFrequency: 'quarterly',
    dividendMonths: [4, 7, 10, 12],
    description: '聚焦那斯達克非金融前100大科技創新龍頭，全球科技牛市發動機',
    topHoldings: [
      { symbol: 'AAPL', name: 'Apple 蘋果', weightPct: 8.9, sector: '消費電子' },
      { symbol: 'MSFT', name: 'Microsoft 微軟', weightPct: 8.2, sector: '軟體雲端' },
      { symbol: 'NVDA', name: 'NVIDIA 輝達', weightPct: 7.8, sector: 'AI半導體' },
      { symbol: 'AMZN', name: 'Amazon 亞馬遜', weightPct: 5.2, sector: '電商雲端' },
      { symbol: 'META', name: 'Meta 臉書', weightPct: 4.8, sector: '社群網路' },
      { symbol: 'AVGO', name: 'Broadcom 博通', weightPct: 4.5, sector: '網通晶片' },
      { symbol: 'GOOGL', name: 'Alphabet 谷歌', weightPct: 3.2, sector: '網路科技' },
      { symbol: 'TSLA', name: 'Tesla 特斯拉', weightPct: 3.1, sector: '電動車' },
      { symbol: 'COST', name: 'Costco 好市多', weightPct: 2.8, sector: '倉儲量販' },
      { symbol: 'AMD', name: 'AMD 超微半導體', weightPct: 2.1, sector: '處理器' },
    ],
  },
  {
    symbol: 'SCHD',
    name: 'Schwab U.S. Dividend Equity ETF',
    category: 'high_dividend',
    issuer: 'Charles Schwab',
    expenseRatioPct: 0.06,
    nav: 82.4,
    marketPrice: 82.5,
    premiumDiscountPct: 0.12,
    dividendYieldPct: 3.6,
    dividendFrequency: 'quarterly',
    dividendMonths: [3, 6, 9, 12],
    description: '嚴格篩選連續10年配息成長之優質美股企業，兼顧股利率與股價成長性',
    topHoldings: [
      { symbol: 'LMT', name: 'Lockheed Martin 洛克希德馬丁', weightPct: 4.2, sector: '國防航太' },
      { symbol: 'HD', name: 'Home Depot 家得寶', weightPct: 4.1, sector: '修繕零售' },
      { symbol: 'CSCO', name: 'Cisco 思科', weightPct: 4.0, sector: '網通設備' },
      { symbol: 'VZ', name: 'Verizon 威瑞森', weightPct: 3.9, sector: '通訊服務' },
      { symbol: 'ABBV', name: 'AbbVie 艾伯維', weightPct: 3.8, sector: '生物製藥' },
      { symbol: 'TXN', name: 'Texas Instruments 德儀', weightPct: 3.7, sector: '類比晶片' },
      { symbol: 'CVX', name: 'Chevron 雪佛龍', weightPct: 3.6, sector: '傳統能源' },
      { symbol: 'PFE', name: 'Pfizer 輝瑞', weightPct: 3.5, sector: '西藥研發' },
      { symbol: 'KO', name: 'Coca-Cola 可口可樂', weightPct: 3.4, sector: '民生飲料' },
      { symbol: 'PEP', name: 'PepsiCo 百事可樂', weightPct: 3.3, sector: '休閒食品' },
    ],
  },
];

/**
 * 依代號尋找 ETF 詳細資料
 */
export function findEtfProfile(symbol: string): EtfProfile | undefined {
  const clean = symbol.trim().toUpperCase();
  const base = clean.replace(/\.(TW|TWO)$/, '');
  return ETF_PROFILES.find(
    (e) =>
      e.symbol.toUpperCase() === clean ||
      e.symbol.toUpperCase().replace(/\.(TW|TWO)$/, '') === base
  );
}

/**
 * 分析使用者現有投資組合中所有 ETF 的底層成分股穿透與重疊度 (Overlap & Duplication Scanner)
 */
export function analyzePortfolioEtfOverlap(
  userHoldings: SecurityHolding[],
  exchangeRateUsdTwd: number
): {
  totalPortfolioTwd: number;
  etfHoldingsCount: number;
  topPenetratedStocks: Array<{
    symbol: string;
    name: string;
    sector: string;
    totalExposedTwd: number;
    exposedPct: number;
    sourceEtfs: string[];
  }>;
  alerts: string[];
} {
  let totalPortfolioTwd = 0;
  const etfHoldings: Array<{ holding: SecurityHolding; profile: EtfProfile; valueTwd: number }> = [];

  for (const h of userHoldings) {
    const fx = h.currency === 'USD' ? exchangeRateUsdTwd : 1;
    const val = h.units * h.currentPrice * fx;
    totalPortfolioTwd += val;

    const profile = findEtfProfile(h.symbol);
    if (profile) {
      etfHoldings.push({ holding: h, profile, valueTwd: val });
    }
  }

  // 聚合各 ETF 底層成分股
  const stockMap: Record<
    string,
    {
      name: string;
      sector: string;
      totalExposedTwd: number;
      sourceEtfs: Set<string>;
    }
  > = {};

  for (const { profile, valueTwd } of etfHoldings) {
    for (const item of profile.topHoldings) {
      const stockVal = valueTwd * (item.weightPct / 100);
      if (!stockMap[item.symbol]) {
        stockMap[item.symbol] = {
          name: item.name,
          sector: item.sector,
          totalExposedTwd: 0,
          sourceEtfs: new Set(),
        };
      }
      stockMap[item.symbol].totalExposedTwd += stockVal;
      stockMap[item.symbol].sourceEtfs.add(profile.name);
    }
  }

  // 加上使用者持有的「個股直接部位」
  for (const h of userHoldings) {
    if (h.category === 'stock') {
      const fx = h.currency === 'USD' ? exchangeRateUsdTwd : 1;
      const val = h.units * h.currentPrice * fx;
      if (!stockMap[h.symbol]) {
        stockMap[h.symbol] = {
          name: h.name,
          sector: '個人自選持股',
          totalExposedTwd: 0,
          sourceEtfs: new Set(),
        };
      }
      stockMap[h.symbol].totalExposedTwd += val;
      stockMap[h.symbol].sourceEtfs.add('個人直接持股');
    }
  }

  const sortedList = Object.entries(stockMap)
    .map(([symbol, info]) => ({
      symbol,
      name: info.name,
      sector: info.sector,
      totalExposedTwd: Math.round(info.totalExposedTwd),
      exposedPct:
        totalPortfolioTwd > 0
          ? Math.round((info.totalExposedTwd / totalPortfolioTwd) * 1000) / 10
          : 0,
      sourceEtfs: Array.from(info.sourceEtfs),
    }))
    .sort((a, b) => b.totalExposedTwd - a.totalExposedTwd);

  const alerts: string[] = [];
  const topStock = sortedList[0];
  if (topStock && topStock.exposedPct > 35) {
    alerts.push(
      `⚠️ 單一成分「${topStock.name}」在全資產穿透佔比達 ${topStock.exposedPct}%（來自 ${topStock.sourceEtfs.join(' + ')}），集中度偏高！`
    );
  }

  // 檢查是否同時持有 0050 與 006208 (高度重複)
  const has0050 = userHoldings.some((h) => h.symbol.includes('0050'));
  const has006208 = userHoldings.some((h) => h.symbol.includes('006208'));
  if (has0050 && has006208) {
    alerts.push('💡 同時持有 0050 與 006208，兩者追蹤同一台灣50指數，建議整合至單一低內扣標的以簡化管理。');
  }

  return {
    totalPortfolioTwd,
    etfHoldingsCount: etfHoldings.length,
    topPenetratedStocks: sortedList.slice(0, 10),
    alerts,
  };
}

/**
 * 試算：ETF 股息再投入滾利模擬 (DRIP Compound Growth Simulator)
 * 比較：有再投入 (DRIP) vs 領息花掉 (Cash Out) 在 5, 10, 15, 20 年後的總價值
 */
export function simulateEtfDripGrowth(params: {
  initialInvestment: number;       // 期初單筆投入 (例: 500000)
  monthlyContribution: number;     // 每月定期定額 (例: 15000)
  annualPriceAppreciationPct: number; // 年化股價成長率 % (例: 6.0)
  annualDividendYieldPct: number;  // 年化配息率 % (例: 6.5)
  years: number;                   // 模擬年期 (5, 10, 15, 20)
}): {
  withDripFinalValue: number;
  withoutDripFinalValue: number;
  dripExtraWealth: number;
  totalInvestedCost: number;
  annualComparison: Array<{
    year: number;
    withDripValue: number;
    withoutDripValue: number;
    cumulativeDividendsWithoutDrip: number;
  }>;
} {
  const {
    initialInvestment,
    monthlyContribution,
    annualPriceAppreciationPct,
    annualDividendYieldPct,
    years,
  } = params;

  const totalReturnAnnual = (annualPriceAppreciationPct + annualDividendYieldPct) / 100;
  const priceApprecAnnual = annualPriceAppreciationPct / 100;
  const divYieldAnnual = annualDividendYieldPct / 100;

  let valDrip = initialInvestment;
  let valNoDrip = initialInvestment;
  let cumDivNoDrip = 0;
  let totalCost = initialInvestment;

  const annualComparison: Array<{
    year: number;
    withDripValue: number;
    withoutDripValue: number;
    cumulativeDividendsWithoutDrip: number;
  }> = [];

  for (let y = 1; y <= years; y++) {
    // 每年 12 個月加計定期定額
    const annualContrib = monthlyContribution * 12;
    totalCost += annualContrib;

    // DRIP 模式：總報酬率 (價差+股息) 全數複利滾入
    valDrip = (valDrip + annualContrib) * (1 + totalReturnAnnual);

    // 非 DRIP 模式：僅價差複利，股息領出現金
    const baseNoDrip = valNoDrip + annualContrib;
    const yearDividend = baseNoDrip * divYieldAnnual;
    cumDivNoDrip += yearDividend;
    valNoDrip = baseNoDrip * (1 + priceApprecAnnual);

    annualComparison.push({
      year: y,
      withDripValue: Math.round(valDrip),
      withoutDripValue: Math.round(valNoDrip),
      cumulativeDividendsWithoutDrip: Math.round(cumDivNoDrip),
    });
  }

  const withDripFinalValue = Math.round(valDrip);
  const withoutDripFinalValue = Math.round(valNoDrip);
  const dripExtraWealth = withDripFinalValue - (withoutDripFinalValue + Math.round(cumDivNoDrip));

  return {
    withDripFinalValue,
    withoutDripFinalValue,
    dripExtraWealth,
    totalInvestedCost: totalCost,
    annualComparison,
  };
}
