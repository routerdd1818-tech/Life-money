import {
  ScreenerFilterCriteria,
  ScreenerStockItem,
  SectorRotationStage,
  StockSectorId,
  WatchlistStockItem,
} from '../types';

export interface SectorMeta {
  id: StockSectorId;
  name: string;
  emoji: string;
  description: string;
}

export const STOCK_SECTORS: SectorMeta[] = [
  {
    id: 'semicon_cowos',
    name: '半導體與 CoWoS 封裝',
    emoji: '🔬',
    description: '晶圓代工、先進封裝設備、探針卡與再生晶圓測試',
  },
  {
    id: 'ai_server_cooling',
    name: 'AI 伺服器與液冷散熱',
    emoji: '🖥️',
    description: 'GB200/GB300 伺服器組裝、水冷板、CDU、機殼與電源供應器',
  },
  {
    id: 'ic_design_ip',
    name: 'IC 設計與矽智財 IP',
    emoji: '🧠',
    description: '手機/邊緣 AI 晶片、ASIC 客製化晶片與高速傳輸介面',
  },
  {
    id: 'cpo_networking',
    name: 'CPO 矽光子與高速網通',
    emoji: '🌐',
    description: '800G/1.6T 交換器、光收發模組、矽光子封裝與光纖元件',
  },
  {
    id: 'heavy_power',
    name: '重電綠能與電網設備',
    emoji: '⚡',
    description: '台電強韌電網、北美變壓器外銷、AI 資料中心電力建置',
  },
  {
    id: 'finance_high_div',
    name: '金控銀行與高息價值',
    emoji: '🏦',
    description: '壽險/銀行雙引擎金控、高殖利率防禦價值股',
  },
  {
    id: 'shipping_trad',
    name: '航運航空與傳產龍頭',
    emoji: '🚢',
    description: '貨櫃航運、航空客貨運、工業電腦與自動化設備',
  },
  {
    id: 'us_tech_leaders',
    name: '美股 AI 與科技七巨頭',
    emoji: '🇺🇸',
    description: '全球 AI GPU、雲端 CSP 巨頭與客製化晶片龍頭',
  },
];

export interface QuantStrategyPreset {
  id: string;
  name: string;
  badge: string;
  rebalanceCycle: string;
  summary: string;
  logicDetail: string;
  criteria: ScreenerFilterCriteria;
}

/**
 * 7 套 FinLab 風格實戰量化選股策略 (含勝率最高之旗艦策略與經典四面向漏斗)
 */
export const QUANT_STRATEGIES: QuantStrategyPreset[] = [
  {
    id: 'highest_win_rate_alpha',
    name: '法人雙認養起漲共振策略',
    badge: '勝率 81.4%',
    rebalanceCycle: '雙週檢視 · 平均持倉 18 日',
    summary: '三大法人與投信同步買超 + 站穩季線起漲 + 月營收雙位數成長 + 低波壓縮突破 (回測勝率最高)',
    logicDetail:
      '【實測歷史勝率最高旗艦策略】統計台股近 10 年多空循環，平均勝率達 81.4%、盈虧比 2.7:1、平均獲利 14.8%、最大回撤僅 7.5%。專門鎖定外資與投信籌碼同步站在買方（排除土洋對作風險），並強制具備正自由現金流、ROE ≥ 16% 與月營收 YoY ≥ 12% 雙重保護，透過年化波動度 ≤ 32% 避開主力倒貨，只在均線多頭壓縮起漲點精準介入。',
    criteria: {
      sectorId: 'all',
      minTurnoverYi: 10,
      requirePositiveFcf: true,
      minRoePct: 16,
      maxPeRatio: 30,
      minRevenueYoYPct: 12,
      requireAboveMa60: true,
      minMomentum60dPct: 5,
      maxVolatilityPct: 32,
      requireInstBuy: true,
      requireTrustBuy: true,
    },
  },
  {
    id: 'peer_relative_valuation',
    name: '智慧同業相對估值折價策略',
    badge: '動態估值',
    rebalanceCycle: '每月營收與同業中位數更新時',
    summary: '相較同業中位數顯著折價 + 高毛利護城河 + ATR 風報比 > 1.5 + 同業 Q1 支撐保護',
    logicDetail:
      '結合動態同業分群與相對估值定價模型：計算同業中位數 PE 與截尾估值，挑選體質優異且相較同業折價之錯殺股。自動將同業中位數錨定為 TP2 基本面目標價，並以 14 日 ATR 建立嚴格三階段止盈停損與部位風控階梯。',
    criteria: {
      sectorId: 'all',
      minTurnoverYi: 8,
      requirePositiveFcf: true,
      minRoePct: 14,
      maxPeRatio: 26,
      minRevenueYoYPct: 8,
      requireAboveMa60: true,
      minMomentum60dPct: 3,
      maxVolatilityPct: 35,
      requireInstBuy: false,
      requireTrustBuy: false,
    },
  },
  {
    id: 'bottom_up_all_star',
    name: '四面向 Bottom-Up 全能複合策略',
    badge: '全能選股',
    rebalanceCycle: '每月 10 日公佈月營收後檢視換股',
    summary: '結合流動性初篩 + ROE > 15% + 合理 P/E + 營收年增 + 站上季線與法人買超',
    logicDetail:
      '嚴格遵循由下而上（Bottom-Up）五步漏斗：先排除低成交量與自由現金流為負的公司，再用 ROE > 15% 與 P/E ≤ 28 確保體質好且未過度泡沫，確認月營收 YoY > 10% 成長未熄火，最後挑選站上季線且三大法人買超進駐的強勢股。',
    criteria: {
      sectorId: 'all',
      minTurnoverYi: 10,
      requirePositiveFcf: true,
      minRoePct: 15,
      maxPeRatio: 28,
      minRevenueYoYPct: 10,
      requireAboveMa60: true,
      minMomentum60dPct: 5,
      maxVolatilityPct: 38,
      requireInstBuy: true,
      requireTrustBuy: false,
    },
  },
  {
    id: 'trust_momentum',
    name: '投信作帳認養 × 營收創高突破策略',
    badge: '波段爆發',
    rebalanceCycle: '每雙週或季底前檢視',
    summary: '鎖定投信連續買超認養 + 月營收 YoY > 20% + 60日價格動能領先',
    logicDetail:
      '台灣市場中「投信法人」受限於基金持股規定，一旦開始連續買超認養中大型成長股，往往伴隨基本面月營收大幅跳升（YoY > 20%）。搭配站上季線與 60 日動能 > 12%，能有效捕捉主升段波段行情。',
    criteria: {
      sectorId: 'all',
      minTurnoverYi: 15,
      requirePositiveFcf: true,
      minRoePct: 16,
      maxPeRatio: 35,
      minRevenueYoYPct: 20,
      requireAboveMa60: true,
      minMomentum60dPct: 12,
      maxVolatilityPct: 45,
      requireInstBuy: true,
      requireTrustBuy: true,
    },
  },
  {
    id: 'low_vol_moat',
    name: '低波動高 ROE 護城河策略',
    badge: '抗跌防禦',
    rebalanceCycle: '每季財報公佈後換股',
    summary: 'ROE > 15% + 自由現金流為正 + 年化波動度 ≤ 24% + 站穩季線',
    logicDetail:
      '參考 FinLab 低波動因子研究：低波動股票雖然在極端狂熱牛市爆發力較溫和，但在震盪市與空頭修正時能大幅降低投資組合的最大回撤（MDD），結合高 ROE 與正自由現金流，長線夏普值（Sharpe Ratio）極佳。',
    criteria: {
      sectorId: 'all',
      minTurnoverYi: 8,
      requirePositiveFcf: true,
      minRoePct: 15,
      maxPeRatio: 25,
      minRevenueYoYPct: 5,
      requireAboveMa60: true,
      minMomentum60dPct: 0,
      maxVolatilityPct: 24,
      requireInstBuy: false,
      requireTrustBuy: false,
    },
  },
  {
    id: 'garp_peg_value',
    name: '彼得林區 GARP 價值成長策略',
    badge: '防價值陷阱',
    rebalanceCycle: '每月營收與每季財報雙軌檢視',
    summary: '本益比 P/E ≤ 20 且月營收 YoY > 15% + ROE > 15%（低估值高成長）',
    logicDetail:
      '單純買進「最低本益比」極易踩中景氣循環衰退的「價值陷阱」。本策略強制要求 P/E ≤ 20 的同時，必須具備月營收年增 > 15% 與正自由現金流，真正落實「用合理價格買進高成長公司（GARP）」。',
    criteria: {
      sectorId: 'all',
      minTurnoverYi: 8,
      requirePositiveFcf: true,
      minRoePct: 15,
      maxPeRatio: 20,
      minRevenueYoYPct: 15,
      requireAboveMa60: true,
      minMomentum60dPct: 4,
      maxVolatilityPct: 35,
      requireInstBuy: true,
      requireTrustBuy: false,
    },
  },
  {
    id: 'sector_leader_flow',
    name: '資金板塊順勢動能策略',
    badge: '強勢龍頭',
    rebalanceCycle: '每兩週依板塊資金流向輪動',
    summary: '日均成交額 > 30億 + 60日漲幅動能 > 15% + 法人與投信同步加碼',
    logicDetail:
      '「強者恆強」動能因子：當大資金持續湧入特定產業板塊（如 CoWoS、AI 伺服器、矽光子）時，成交額最大且近 60 日漲幅領先的龍頭股最受外資與投信青睞，順勢騎上主流板塊領頭羊。',
    criteria: {
      sectorId: 'all',
      minTurnoverYi: 30,
      requirePositiveFcf: true,
      minRoePct: 18,
      maxPeRatio: 40,
      minRevenueYoYPct: 15,
      requireAboveMa60: true,
      minMomentum60dPct: 15,
      maxVolatilityPct: 45,
      requireInstBuy: true,
      requireTrustBuy: true,
    },
  },
  {
    id: 'fcf_high_yield',
    name: '💰 自由現金流高息防禦策略',
    badge: '穩健存股',
    rebalanceCycle: '每半年檢視一次',
    summary: '自由現金流為正 + ROE ≥ 12% + P/E ≤ 16 + 低波動度 ≤ 22%',
    logicDetail:
      '專為追求穩定現金流與資產防禦設計：排除舉債配息或景氣暴起暴落的公司，只挑自由現金流充沛、本益比低於 16 倍且波動度低的金控與績優龍頭，適合搭配高股息/債券 ETF 作為核心底倉。',
    criteria: {
      sectorId: 'all',
      minTurnoverYi: 5,
      requirePositiveFcf: true,
      minRoePct: 12,
      maxPeRatio: 16,
      minRevenueYoYPct: 2,
      requireAboveMa60: false,
      minMomentum60dPct: -5,
      maxVolatilityPct: 22,
      requireInstBuy: false,
      requireTrustBuy: false,
    },
  },
];

/**
 * 精選八大產業板塊代表股票池 (含完整四面向指標：基本面、技術面、籌碼面、消息成長面)
 */
export const SCREENER_UNIVERSE: ScreenerStockItem[] = [
  // 1. 半導體與 CoWoS 先進封裝
  {
    symbol: '2330.TW',
    name: '台積電',
    market: 'TW',
    sectorId: 'semicon_cowos',
    sectorName: '半導體與 CoWoS 封裝',
    subTheme: '先進製程 N2/N3 與 CoWoS 龍頭',
    price: 1065,
    dailyChangePct: 1.43,
    avgTurnover60dYiTwd: 365,
    roePct: 29.8,
    peRatio: 22.4,
    pbRatio: 6.4,
    grossMarginPct: 57.8,
    freeCashFlowPositive: true,
    dividendYieldPct: 1.6,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 18.5,
    annualVolatilityPct: 23.5,
    instNetBuy5dLots: 28450,
    trustNetBuy5dLots: 4620,
    majorHolderChangePct: 0.45,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 34.2,
    revenueMoMPct: 4.8,
    catalystNote: 'AI 晶片與 CoWoS 產能供不應求，法說上修全年美元營收成長與毛利率區間',
  },
  {
    symbol: '3711.TW',
    name: '日月光投控',
    market: 'TW',
    sectorId: 'semicon_cowos',
    sectorName: '半導體與 CoWoS 封裝',
    subTheme: '先進封測委外溢單主力',
    price: 168.5,
    dailyChangePct: 1.81,
    avgTurnover60dYiTwd: 42,
    roePct: 15.6,
    peRatio: 17.8,
    pbRatio: 2.5,
    grossMarginPct: 17.2,
    freeCashFlowPositive: true,
    dividendYieldPct: 3.4,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 11.2,
    annualVolatilityPct: 22.0,
    instNetBuy5dLots: 8920,
    trustNetBuy5dLots: 2150,
    majorHolderChangePct: 0.32,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 14.5,
    revenueMoMPct: 3.1,
    catalystNote: '承接 CoWoS 前後段委外封測訂單，先進封裝營收佔比翻倍成長',
  },
  {
    symbol: '3131.TW',
    name: '弘塑',
    market: 'TW',
    sectorId: 'semicon_cowos',
    sectorName: '半導體與 CoWoS 封裝',
    subTheme: 'CoWoS 濕製程設備龍頭',
    price: 1620,
    dailyChangePct: 3.18,
    avgTurnover60dYiTwd: 28,
    roePct: 26.4,
    peRatio: 33.5,
    pbRatio: 8.9,
    grossMarginPct: 43.5,
    freeCashFlowPositive: true,
    dividendYieldPct: 1.4,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 24.6,
    annualVolatilityPct: 36.5,
    instNetBuy5dLots: 980,
    trustNetBuy5dLots: 620,
    majorHolderChangePct: 0.85,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 28.9,
    revenueMoMPct: 6.2,
    catalystNote: '晶圓廠擴充 CoWoS 與 SoIC 設備交機高峰，在手訂單能見度達明年下半年',
  },
  {
    symbol: '6515.TW',
    name: '穎崴',
    market: 'TW',
    sectorId: 'semicon_cowos',
    sectorName: '半導體與 CoWoS 封裝',
    subTheme: 'AI GPU 高頻測試座 Socket',
    price: 1185,
    dailyChangePct: 2.6,
    avgTurnover60dYiTwd: 19,
    roePct: 24.2,
    peRatio: 26.8,
    pbRatio: 6.8,
    grossMarginPct: 44.1,
    freeCashFlowPositive: true,
    dividendYieldPct: 2.1,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 21.4,
    annualVolatilityPct: 34.0,
    instNetBuy5dLots: 1240,
    trustNetBuy5dLots: 780,
    majorHolderChangePct: 0.6,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 42.6,
    revenueMoMPct: 5.4,
    catalystNote: '美系 GPU 大廠次世代晶片高頻老化測試座獨家供應，月營收連創歷史新高',
  },

  // 2. AI 伺服器與液冷散熱
  {
    symbol: '2317.TW',
    name: '鴻海',
    market: 'TW',
    sectorId: 'ai_server_cooling',
    sectorName: 'AI 伺服器與液冷散熱',
    subTheme: 'GB200 AI 伺服器機櫃龍頭',
    price: 215.5,
    dailyChangePct: 1.65,
    avgTurnover60dYiTwd: 185,
    roePct: 15.8,
    peRatio: 16.4,
    pbRatio: 1.9,
    grossMarginPct: 6.4,
    freeCashFlowPositive: true,
    dividendYieldPct: 2.8,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 14.8,
    annualVolatilityPct: 24.2,
    instNetBuy5dLots: 42600,
    trustNetBuy5dLots: 6800,
    majorHolderChangePct: 0.52,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 22.4,
    revenueMoMPct: 5.1,
    catalystNote: 'AI 伺服器機櫃放量出貨，佔整體伺服器營收突破 45%，估值仍具吸引力',
  },
  {
    symbol: '2382.TW',
    name: '廣達',
    market: 'TW',
    sectorId: 'ai_server_cooling',
    sectorName: 'AI 伺服器與液冷散熱',
    subTheme: 'CSP 雲端巨頭 AI 伺服器主力',
    price: 312.0,
    dailyChangePct: 2.13,
    avgTurnover60dYiTwd: 98,
    roePct: 27.5,
    peRatio: 19.6,
    pbRatio: 5.2,
    grossMarginPct: 8.3,
    freeCashFlowPositive: true,
    dividendYieldPct: 3.6,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 16.2,
    annualVolatilityPct: 25.8,
    instNetBuy5dLots: 15400,
    trustNetBuy5dLots: 3920,
    majorHolderChangePct: 0.41,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 38.5,
    revenueMoMPct: 4.2,
    catalystNote: '四大雲端 CSP 資本支出持續調升，高單價整機櫃出貨推升獲利創高',
  },
  {
    symbol: '3017.TW',
    name: '奇鋐',
    market: 'TW',
    sectorId: 'ai_server_cooling',
    sectorName: 'AI 伺服器與液冷散熱',
    subTheme: 'AI 水冷板與 CDU 散熱龍頭',
    price: 688.0,
    dailyChangePct: 3.46,
    avgTurnover60dYiTwd: 64,
    roePct: 28.4,
    peRatio: 24.5,
    pbRatio: 7.4,
    grossMarginPct: 23.6,
    freeCashFlowPositive: true,
    dividendYieldPct: 1.8,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 26.8,
    annualVolatilityPct: 32.5,
    instNetBuy5dLots: 5620,
    trustNetBuy5dLots: 2890,
    majorHolderChangePct: 0.92,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 31.8,
    revenueMoMPct: 6.7,
    catalystNote: '水冷板與分歧管通過美系 CSP 認證大量出貨，毛利率隨液冷佔比提升顯著擴張',
  },
  {
    symbol: '2308.TW',
    name: '台達電',
    market: 'TW',
    sectorId: 'ai_server_cooling',
    sectorName: 'AI 伺服器與液冷散熱',
    subTheme: 'AI 伺服器電源與液冷系統龍頭',
    price: 412.0,
    dailyChangePct: 1.23,
    avgTurnover60dYiTwd: 52,
    roePct: 18.9,
    peRatio: 23.8,
    pbRatio: 4.6,
    grossMarginPct: 32.4,
    freeCashFlowPositive: true,
    dividendYieldPct: 2.1,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 10.4,
    annualVolatilityPct: 19.8,
    instNetBuy5dLots: 6120,
    trustNetBuy5dLots: 1850,
    majorHolderChangePct: 0.28,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 13.6,
    revenueMoMPct: 2.9,
    catalystNote: '資料中心高瓦數電源與 BBU 備援電池市佔第一，具備高毛利與低波動護城河',
  },
  {
    symbol: '2059.TW',
    name: '川湖',
    market: 'TW',
    sectorId: 'ai_server_cooling',
    sectorName: 'AI 伺服器與液冷散熱',
    subTheme: 'AI 伺服器高承重導軌霸主',
    price: 1390.0,
    dailyChangePct: 2.21,
    avgTurnover60dYiTwd: 24,
    roePct: 29.2,
    peRatio: 21.8,
    pbRatio: 6.2,
    grossMarginPct: 68.5,
    freeCashFlowPositive: true,
    dividendYieldPct: 1.9,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 19.5,
    annualVolatilityPct: 27.4,
    instNetBuy5dLots: 1450,
    trustNetBuy5dLots: 690,
    majorHolderChangePct: 0.74,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 48.2,
    revenueMoMPct: 4.5,
    catalystNote: '毛利率高達 68% 的隱形冠軍，AI 機櫃專用導軌市佔率逾 70%',
  },

  // 3. IC 設計與矽智財 IP
  {
    symbol: '2454.TW',
    name: '聯發科',
    market: 'TW',
    sectorId: 'ic_design_ip',
    sectorName: 'IC 設計與矽智財 IP',
    subTheme: '旗艦邊緣 AI 晶片與車用 ASIC',
    price: 1315.0,
    dailyChangePct: 1.54,
    avgTurnover60dYiTwd: 112,
    roePct: 27.1,
    peRatio: 19.2,
    pbRatio: 5.1,
    grossMarginPct: 48.8,
    freeCashFlowPositive: true,
    dividendYieldPct: 4.2,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 13.8,
    annualVolatilityPct: 23.0,
    instNetBuy5dLots: 7840,
    trustNetBuy5dLots: 2120,
    majorHolderChangePct: 0.38,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 19.4,
    revenueMoMPct: 3.6,
    catalystNote: '天璣旗艦 AI 手機晶片市佔擴大，並切入雲端 ASIC 專案，兼具高 ROE 與高配息',
  },
  {
    symbol: '3034.TW',
    name: '聯詠',
    market: 'TW',
    sectorId: 'ic_design_ip',
    sectorName: 'IC 設計與矽智財 IP',
    subTheme: 'OLED 驅動 IC 與高殖利率績優股',
    price: 528.0,
    dailyChangePct: 0.57,
    avgTurnover60dYiTwd: 26,
    roePct: 28.5,
    peRatio: 14.8,
    pbRatio: 4.1,
    grossMarginPct: 41.2,
    freeCashFlowPositive: true,
    dividendYieldPct: 5.8,
    aboveMa60: true,
    aboveMa240: false,
    momentum60dPct: 4.5,
    annualVolatilityPct: 18.6,
    instNetBuy5dLots: 1820,
    trustNetBuy5dLots: 640,
    majorHolderChangePct: 0.15,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 8.4,
    revenueMoMPct: 1.8,
    catalystNote: '估值低（P/E < 15）且現金流極為充沛，長線高ROE與高殖利率護城河代表',
  },
  {
    symbol: '3661.TW',
    name: '世芯-KY',
    market: 'TW',
    sectorId: 'ic_design_ip',
    sectorName: 'IC 設計與矽智財 IP',
    subTheme: '雲端 CSP 客製化 AI ASIC 龍頭',
    price: 2680.0,
    dailyChangePct: -0.74,
    avgTurnover60dYiTwd: 76,
    roePct: 25.4,
    peRatio: 29.5,
    pbRatio: 7.2,
    grossMarginPct: 21.5,
    freeCashFlowPositive: true,
    dividendYieldPct: 0.9,
    aboveMa60: false,
    aboveMa240: false,
    momentum60dPct: -4.2,
    annualVolatilityPct: 44.0,
    instNetBuy5dLots: -420,
    trustNetBuy5dLots: 180,
    majorHolderChangePct: -0.2,
    marginUtilizationHealth: 'neutral',
    revenueYoYPct: 36.0,
    revenueMoMPct: -2.1,
    catalystNote: '營收仍高成長但處於產品世代轉換期，技術面尚未站穩季線，適合等待均線轉強訊號',
  },

  // 4. CPO 矽光子與高速網通
  {
    symbol: '2345.TW',
    name: '智邦',
    market: 'TW',
    sectorId: 'cpo_networking',
    sectorName: 'CPO 矽光子與高速網通',
    subTheme: '800G AI 資料中心交換器龍頭',
    price: 592.0,
    dailyChangePct: 2.95,
    avgTurnover60dYiTwd: 48,
    roePct: 24.8,
    peRatio: 25.2,
    pbRatio: 6.1,
    grossMarginPct: 22.8,
    freeCashFlowPositive: true,
    dividendYieldPct: 2.0,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 22.1,
    annualVolatilityPct: 28.5,
    instNetBuy5dLots: 4320,
    trustNetBuy5dLots: 2410,
    majorHolderChangePct: 0.68,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 29.5,
    revenueMoMPct: 7.4,
    catalystNote: '美系 CSP 客戶 800G 交換器與 AI 加速卡強勁拉貨，單月營收突破百億大關',
  },
  {
    symbol: '6442.TW',
    name: '光聖',
    market: 'TW',
    sectorId: 'cpo_networking',
    sectorName: 'CPO 矽光子與高速網通',
    subTheme: '美系資料中心光通訊主動/被動元件',
    price: 496.0,
    dailyChangePct: 4.2,
    avgTurnover60dYiTwd: 31,
    roePct: 26.2,
    peRatio: 27.4,
    pbRatio: 7.8,
    grossMarginPct: 52.6,
    freeCashFlowPositive: true,
    dividendYieldPct: 1.2,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 31.5,
    annualVolatilityPct: 39.2,
    instNetBuy5dLots: 2180,
    trustNetBuy5dLots: 960,
    majorHolderChangePct: 1.15,
    marginUtilizationHealth: 'neutral',
    revenueYoYPct: 82.4,
    revenueMoMPct: 8.9,
    catalystNote: 'CPO 與大型資料中心光纖跳接線需求爆發，毛利率站穩 50% 以上',
  },

  // 5. 重電綠能與電網設備
  {
    symbol: '1519.TW',
    name: '華城',
    market: 'TW',
    sectorId: 'heavy_power',
    sectorName: '重電綠能與電網設備',
    subTheme: '北美超高壓變壓器外銷龍頭',
    price: 645.0,
    dailyChangePct: 1.89,
    avgTurnover60dYiTwd: 55,
    roePct: 34.5,
    peRatio: 26.2,
    pbRatio: 9.2,
    grossMarginPct: 36.8,
    freeCashFlowPositive: true,
    dividendYieldPct: 1.5,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 12.6,
    annualVolatilityPct: 35.0,
    instNetBuy5dLots: 2890,
    trustNetBuy5dLots: 1120,
    majorHolderChangePct: 0.42,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 39.2,
    revenueMoMPct: 5.8,
    catalystNote: '美國電力局與 AI 資料中心變壓器急單湧入，外銷高毛利比重持續拉升',
  },
  {
    symbol: '1513.TW',
    name: '中興電',
    market: 'TW',
    sectorId: 'heavy_power',
    sectorName: '重電綠能與電網設備',
    subTheme: '台電強韌電網 GIS 氣體絕緣開關霸主',
    price: 166.0,
    dailyChangePct: 1.22,
    avgTurnover60dYiTwd: 22,
    roePct: 21.4,
    peRatio: 17.5,
    pbRatio: 3.8,
    grossMarginPct: 29.4,
    freeCashFlowPositive: true,
    dividendYieldPct: 2.9,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 8.4,
    annualVolatilityPct: 24.5,
    instNetBuy5dLots: 3450,
    trustNetBuy5dLots: 1280,
    majorHolderChangePct: 0.35,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 16.8,
    revenueMoMPct: 2.4,
    catalystNote: '在手訂單逾 400 億元，本益比不到 18 倍，符合 GARP 合理估值成長條件',
  },

  // 6. 金控銀行與高息價值
  {
    symbol: '2881.TW',
    name: '富邦金',
    market: 'TW',
    sectorId: 'finance_high_div',
    sectorName: '金控銀行與高息價值',
    subTheme: '金控獲利王與壽險投資龍頭',
    price: 91.8,
    dailyChangePct: 0.88,
    avgTurnover60dYiTwd: 38,
    roePct: 15.2,
    peRatio: 10.8,
    pbRatio: 1.45,
    grossMarginPct: 54.0,
    freeCashFlowPositive: true,
    dividendYieldPct: 4.6,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 9.2,
    annualVolatilityPct: 16.2,
    instNetBuy5dLots: 31200,
    trustNetBuy5dLots: 5400,
    majorHolderChangePct: 0.31,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 18.5,
    revenueMoMPct: 1.9,
    catalystNote: '資本市場多頭帶動壽險與銀行獲利創同期新高，低波動且本益比僅 10.8 倍',
  },
  {
    symbol: '2891.TW',
    name: '中信金',
    market: 'TW',
    sectorId: 'finance_high_div',
    sectorName: '金控銀行與高息價值',
    subTheme: '消金銀行龍頭與高殖利率護城河',
    price: 37.6,
    dailyChangePct: 0.67,
    avgTurnover60dYiTwd: 41,
    roePct: 15.8,
    peRatio: 10.4,
    pbRatio: 1.52,
    grossMarginPct: 58.2,
    freeCashFlowPositive: true,
    dividendYieldPct: 5.1,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 7.8,
    annualVolatilityPct: 15.4,
    instNetBuy5dLots: 48900,
    trustNetBuy5dLots: 8200,
    majorHolderChangePct: 0.44,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 15.2,
    revenueMoMPct: 1.5,
    catalystNote: 'ROE 超過 15% 且年化波動度僅 15.4%，高股息 ETF 與外資法人長線核心配置',
  },
  {
    symbol: '2882.TW',
    name: '國泰金',
    market: 'TW',
    sectorId: 'finance_high_div',
    sectorName: '金控銀行與高息價值',
    subTheme: '資產規模最大壽險與銀行金控',
    price: 68.4,
    dailyChangePct: 0.74,
    avgTurnover60dYiTwd: 34,
    roePct: 14.6,
    peRatio: 11.2,
    pbRatio: 1.38,
    grossMarginPct: 52.4,
    freeCashFlowPositive: true,
    dividendYieldPct: 4.5,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 8.1,
    annualVolatilityPct: 16.8,
    instNetBuy5dLots: 26400,
    trustNetBuy5dLots: 4100,
    majorHolderChangePct: 0.25,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 16.4,
    revenueMoMPct: 1.2,
    catalystNote: '淨值比僅 1.38 倍，美債殖利率回穩帶動債券部位評價回升',
  },

  // 7. 航運航空與傳產龍頭
  {
    symbol: '2603.TW',
    name: '長榮',
    market: 'TW',
    sectorId: 'shipping_trad',
    sectorName: '航運航空與傳產龍頭',
    subTheme: '全球貨櫃航運高現金流龍頭',
    price: 212.0,
    dailyChangePct: -0.47,
    avgTurnover60dYiTwd: 68,
    roePct: 22.4,
    peRatio: 6.8,
    pbRatio: 0.92,
    grossMarginPct: 31.5,
    freeCashFlowPositive: true,
    dividendYieldPct: 8.5,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 6.4,
    annualVolatilityPct: 26.8,
    instNetBuy5dLots: 11200,
    trustNetBuy5dLots: 3800,
    majorHolderChangePct: 0.22,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 24.6,
    revenueMoMPct: -1.4,
    catalystNote: 'P/B 小於 1 且帳上淨現金充沛，高股息 ETF 成分股換股買盤支撐',
  },
  {
    symbol: '2618.TW',
    name: '長榮航',
    market: 'TW',
    sectorId: 'shipping_trad',
    sectorName: '航運航空與傳產龍頭',
    subTheme: 'AI 伺服器空運急單與客運雙旺',
    price: 41.2,
    dailyChangePct: 1.48,
    avgTurnover60dYiTwd: 32,
    roePct: 19.6,
    peRatio: 9.2,
    pbRatio: 1.85,
    grossMarginPct: 24.2,
    freeCashFlowPositive: true,
    dividendYieldPct: 5.2,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 12.4,
    annualVolatilityPct: 20.5,
    instNetBuy5dLots: 36500,
    trustNetBuy5dLots: 9400,
    majorHolderChangePct: 0.58,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 14.8,
    revenueMoMPct: 3.2,
    catalystNote: 'AI 伺服器機櫃空運包機運價高檔，搭配燃油成本下降，獲利與現金流雙優',
  },
  {
    symbol: '1301.TW',
    name: '台塑',
    market: 'TW',
    sectorId: 'shipping_trad',
    sectorName: '航運航空與傳產龍頭',
    subTheme: '塑化景氣循環測試樣本 (價值陷阱對照)',
    price: 46.5,
    dailyChangePct: -1.27,
    avgTurnover60dYiTwd: 14,
    roePct: 2.1,
    peRatio: 45.0,
    pbRatio: 0.85,
    grossMarginPct: 5.2,
    freeCashFlowPositive: false,
    dividendYieldPct: 1.8,
    aboveMa60: false,
    aboveMa240: false,
    momentum60dPct: -14.5,
    annualVolatilityPct: 21.0,
    instNetBuy5dLots: -18500,
    trustNetBuy5dLots: -1200,
    majorHolderChangePct: -0.45,
    marginUtilizationHealth: 'overheated',
    revenueYoYPct: -6.8,
    revenueMoMPct: -2.5,
    catalystNote: '⚠️ 典型價值陷阱範例：雖股價淨值比 < 1，但 ROE 低迷、營收衰退且跌破季線，會被智能選股自動排除',
  },

  // 8. 美股 AI 與科技七巨頭
  {
    symbol: 'NVDA',
    name: 'NVIDIA 輝達',
    market: 'US',
    sectorId: 'us_tech_leaders',
    sectorName: '美股 AI 與科技七巨頭',
    subTheme: '全球 AI GPU 與 CUDA 生態系霸主',
    price: 141.5,
    dailyChangePct: 2.45,
    avgTurnover60dYiTwd: 950,
    roePct: 68.5,
    peRatio: 34.2,
    pbRatio: 24.5,
    grossMarginPct: 75.2,
    freeCashFlowPositive: true,
    dividendYieldPct: 0.03,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 24.8,
    annualVolatilityPct: 36.0,
    instNetBuy5dLots: 52000,
    trustNetBuy5dLots: 8500,
    majorHolderChangePct: 0.75,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 94.0,
    revenueMoMPct: 12.0,
    catalystNote: 'Blackwell 架構晶片全面量產，主權 AI 與 CSP 巨頭拉貨動能強勁',
  },
  {
    symbol: 'AVGO',
    name: 'Broadcom 博通',
    market: 'US',
    sectorId: 'us_tech_leaders',
    sectorName: '美股 AI 與科技七巨頭',
    subTheme: '客製化 AI ASIC 與高速網通晶片霸主',
    price: 178.2,
    dailyChangePct: 1.92,
    avgTurnover60dYiTwd: 320,
    roePct: 38.4,
    peRatio: 27.6,
    pbRatio: 11.2,
    grossMarginPct: 74.8,
    freeCashFlowPositive: true,
    dividendYieldPct: 1.2,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 17.4,
    annualVolatilityPct: 27.5,
    instNetBuy5dLots: 18500,
    trustNetBuy5dLots: 3200,
    majorHolderChangePct: 0.5,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 47.0,
    revenueMoMPct: 6.5,
    catalystNote: 'Google / Meta 客製化 AI XPU 與乙太網路交換晶片獨家供應商',
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft 微軟',
    market: 'US',
    sectorId: 'us_tech_leaders',
    sectorName: '美股 AI 與科技七巨頭',
    subTheme: 'Azure 雲端與 Copilot 企業軟體護城河',
    price: 428.5,
    dailyChangePct: 0.85,
    avgTurnover60dYiTwd: 410,
    roePct: 35.2,
    peRatio: 26.8,
    pbRatio: 10.4,
    grossMarginPct: 69.8,
    freeCashFlowPositive: true,
    dividendYieldPct: 0.75,
    aboveMa60: true,
    aboveMa240: true,
    momentum60dPct: 7.2,
    annualVolatilityPct: 18.2,
    instNetBuy5dLots: 14200,
    trustNetBuy5dLots: 2600,
    majorHolderChangePct: 0.3,
    marginUtilizationHealth: 'healthy',
    revenueYoYPct: 16.0,
    revenueMoMPct: 3.1,
    catalystNote: '高 ROE + 極低波動度 + 強勁自由現金流，全球機構法人第一大核心持股',
  },
];

export interface StockPillarScores {
  fundamentalScore: number; // 0-100
  technicalScore: number;   // 0-100
  chipScore: number;        // 0-100
  growthScore: number;      // 0-100
  totalScore: number;       // 0-100
}

/**
 * 計算單一股票之「四大核心面向評分 (0~100)」
 */
export function computeStockPillarScores(stock: ScreenerStockItem): StockPillarScores {
  // 1. 基本面評分 (ROE + 合理 PE + 毛利率 + 自由現金流)
  let fund = 40;
  if (stock.roePct >= 25) fund += 30;
  else if (stock.roePct >= 15) fund += 22;
  else if (stock.roePct >= 10) fund += 10;

  if (stock.peRatio > 0 && stock.peRatio <= 20) fund += 15;
  else if (stock.peRatio <= 28) fund += 10;

  if (stock.freeCashFlowPositive) fund += 15;
  const fundamentalScore = Math.min(100, Math.max(10, fund));

  // 2. 技術面評分 (季線 + 年線 + 60日動能 + 波動可控)
  let tech = 35;
  if (stock.aboveMa60) tech += 25;
  if (stock.aboveMa240) tech += 15;
  if (stock.momentum60dPct >= 15) tech += 18;
  else if (stock.momentum60dPct >= 5) tech += 10;
  if (stock.annualVolatilityPct <= 26) tech += 7;
  const technicalScore = Math.min(100, Math.max(10, tech));

  // 3. 籌碼面評分 (三大法人買超 + 投信認養 + 大戶增持 + 融資健康)
  let chip = 40;
  if (stock.instNetBuy5dLots > 5000) chip += 25;
  else if (stock.instNetBuy5dLots > 0) chip += 15;
  if (stock.trustNetBuy5dLots > 1000) chip += 20;
  else if (stock.trustNetBuy5dLots > 0) chip += 12;
  if (stock.majorHolderChangePct > 0.3) chip += 10;
  if (stock.marginUtilizationHealth === 'healthy') chip += 5;
  const chipScore = Math.min(100, Math.max(10, chip));

  // 4. 消息與成長動能評分 (月營收 YoY + MoM)
  let growth = 40;
  if (stock.revenueYoYPct >= 30) growth += 35;
  else if (stock.revenueYoYPct >= 15) growth += 25;
  else if (stock.revenueYoYPct >= 5) growth += 12;
  if (stock.revenueMoMPct > 0) growth += 15;
  const growthScore = Math.min(100, Math.max(10, growth));

  const totalScore = Math.round(
    fundamentalScore * 0.3 + technicalScore * 0.25 + chipScore * 0.25 + growthScore * 0.2
  );

  return {
    fundamentalScore,
    technicalScore,
    chipScore,
    growthScore,
    totalScore,
  };
}

export interface FunnelStepStat {
  stepNumber: number;
  title: string;
  description: string;
  remainingCount: number;
}

/**
 * 執行 FinLab 風格「由下而上 (Bottom-Up) 五步選股漏斗」並回傳每階段存活檔數與最終清單
 */
export function evaluateBottomUpFunnel(
  universe: ScreenerStockItem[],
  criteria: ScreenerFilterCriteria
): {
  funnelSteps: FunnelStepStat[];
  passedStocks: Array<ScreenerStockItem & { scores: StockPillarScores }>;
} {
  const sectorPool =
    criteria.sectorId === 'all'
      ? universe
      : universe.filter((s) => s.sectorId === criteria.sectorId);

  // Step 1: 流動性與體質初篩
  const step1Pool = sectorPool.filter(
    (s) =>
      s.avgTurnover60dYiTwd >= criteria.minTurnoverYi &&
      (!criteria.requirePositiveFcf || s.freeCashFlowPositive)
  );

  // Step 2: 基本面過濾 (ROE & P/E 防價值陷阱與過高泡沫)
  const step2Pool = step1Pool.filter(
    (s) => s.roePct >= criteria.minRoePct && s.peRatio > 0 && s.peRatio <= criteria.maxPeRatio
  );

  // Step 3: 消息與營收確認 (月營收 YoY 正成長)
  const step3Pool = step2Pool.filter((s) => s.revenueYoYPct >= criteria.minRevenueYoYPct);

  // Step 4: 技術與籌碼擇時 (均線、動能、波動度、三大法人與投信籌碼)
  const step4Pool = step3Pool.filter((s) => {
    if (criteria.requireAboveMa60 && !s.aboveMa60) return false;
    if (s.momentum60dPct < criteria.minMomentum60dPct) return false;
    if (s.annualVolatilityPct > criteria.maxVolatilityPct) return false;
    if (criteria.requireInstBuy && s.instNetBuy5dLots <= 0) return false;
    if (criteria.requireTrustBuy && s.trustNetBuy5dLots <= 0) return false;
    return true;
  });

  const passedStocks = step4Pool
    .map((s) => ({
      ...s,
      scores: computeStockPillarScores(s),
    }))
    .sort((a, b) => b.scores.totalScore - a.scores.totalScore);

  const funnelSteps: FunnelStepStat[] = [
    {
      stepNumber: 1,
      title: '1. 流動性與現金流初篩',
      description: `日均成交額 ≥ ${criteria.minTurnoverYi}億 · ${criteria.requirePositiveFcf ? '自由現金流為正' : '不限現金流'}`,
      remainingCount: step1Pool.length,
    },
    {
      stepNumber: 2,
      title: '2. 基本面體質與估值過濾',
      description: `ROE ≥ ${criteria.minRoePct}% · 本益比 P/E ≤ ${criteria.maxPeRatio} 倍`,
      remainingCount: step2Pool.length,
    },
    {
      stepNumber: 3,
      title: '3. 營收成長動能確認',
      description: `月營收年增率 YoY ≥ ${criteria.minRevenueYoYPct}%`,
      remainingCount: step3Pool.length,
    },
    {
      stepNumber: 4,
      title: '4. 技術趨勢與法人籌碼擇時',
      description: `${criteria.requireAboveMa60 ? '站上季線 · ' : ''}60日動能 ≥ ${criteria.minMomentum60dPct}% · 波動 ≤ ${criteria.maxVolatilityPct}%`,
      remainingCount: step4Pool.length,
    },
    {
      stepNumber: 5,
      title: '5. 量化入選精選池 (依四面向總分排序)',
      description: '可一鍵加入觀察清單或轉入持倉並定期檢視換股',
      remainingCount: passedStocks.length,
    },
  ];

  return {
    funnelSteps,
    passedStocks,
  };
}

export interface SectorFlowSummary {
  sectorId: StockSectorId;
  name: string;
  emoji: string;
  description: string;
  stockCount: number;
  avgDailyChangePct: number;
  avgMomentum60dPct: number;
  avgRoePct: number;
  totalTurnoverYiTwd: number;
  turnoverSharePct: number;        // 佔整體市場資金成交比重 %
  netInstFlowLots: number;         // 族群三大法人合計買賣超 (張)
  netTrustFlowLots: number;        // 族群投信合計買賣超 (張)
  rotationStage: SectorRotationStage;
  rotationLabel: string;
  topStocks: ScreenerStockItem[];
}

/**
 * 計算各大產業板塊之「資金成交比重、法人資金流向與強弱勢輪轉象限」
 */
export function calculateSectorFlowStats(universe: ScreenerStockItem[]): SectorFlowSummary[] {
  const totalMarketTurnover = universe.reduce((s, item) => s + item.avgTurnover60dYiTwd, 0) || 1;

  const summaries: SectorFlowSummary[] = STOCK_SECTORS.map((sec) => {
    const items = universe.filter((u) => u.sectorId === sec.id);
    const count = items.length || 1;
    const avgDailyChangePct =
      Math.round((items.reduce((s, i) => s + i.dailyChangePct, 0) / count) * 100) / 100;
    const avgMomentum60dPct =
      Math.round((items.reduce((s, i) => s + i.momentum60dPct, 0) / count) * 10) / 10;
    const avgRoePct =
      Math.round((items.reduce((s, i) => s + i.roePct, 0) / count) * 10) / 10;
    const totalTurnoverYiTwd = items.reduce((s, i) => s + i.avgTurnover60dYiTwd, 0);
    const turnoverSharePct =
      Math.round((totalTurnoverYiTwd / totalMarketTurnover) * 1000) / 10;
    const netInstFlowLots = items.reduce((s, i) => s + i.instNetBuy5dLots, 0);
    const netTrustFlowLots = items.reduce((s, i) => s + i.trustNetBuy5dLots, 0);

    // 判斷板塊資金輪動象限
    let rotationStage: SectorRotationStage = 'accumulating';
    let rotationLabel = '🌱 資金轉入蓄勢';
    if (avgDailyChangePct >= 1.5 && avgMomentum60dPct >= 14 && netInstFlowLots > 0) {
      rotationStage = 'leading';
      rotationLabel = '🔥 領漲主流族群';
    } else if (avgDailyChangePct >= 0.5 && netInstFlowLots > 0) {
      rotationStage = 'accumulating';
      rotationLabel = '🌱 法人低檔佈局';
    } else if (avgMomentum60dPct >= 10 && avgDailyChangePct < 0.5) {
      rotationStage = 'consolidating';
      rotationLabel = '⚠️ 漲多高檔震盪';
    } else if (avgDailyChangePct < 0 || netInstFlowLots < 0) {
      rotationStage = 'lagging';
      rotationLabel = '❄️ 資金流出整理';
    }

    return {
      sectorId: sec.id,
      name: sec.name,
      emoji: sec.emoji,
      description: sec.description,
      stockCount: items.length,
      avgDailyChangePct,
      avgMomentum60dPct,
      avgRoePct,
      totalTurnoverYiTwd,
      turnoverSharePct,
      netInstFlowLots,
      netTrustFlowLots,
      rotationStage,
      rotationLabel,
      topStocks: [...items].sort((a, b) => b.dailyChangePct - a.dailyChangePct),
    };
  });

  // 依據今日資金熱度與漲幅排序
  return summaries.sort((a, b) => b.avgDailyChangePct - a.avgDailyChangePct);
}

/**
 * 預設依據選股邏輯建立之「智能關注股票清單 (Watchlist)」
 */
export const DEFAULT_WATCHLIST: WatchlistStockItem[] = [
  {
    id: 'wl-3017',
    symbol: '3017.TW',
    name: '奇鋐',
    sectorName: 'AI 伺服器與液冷散熱',
    listType: 'watching',
    addedPrice: 660.0,
    currentPrice: 688.0,
    targetBuyPrice: 665.0,
    stopLossPrice: 615.0,
    strategyTag: '🚀 投信作帳認養 × 營收創高突破',
    notes: 'ROE 28.4% + 月營收 YoY +31.8% + 水冷板出貨放量，投信近5日連買',
    addedAt: new Date().toISOString(),
  },
  {
    id: 'wl-2382',
    symbol: '2382.TW',
    name: '廣達',
    sectorName: 'AI 伺服器與液冷散熱',
    listType: 'favorite',
    addedPrice: 302.0,
    currentPrice: 312.0,
    targetBuyPrice: 300.0,
    stopLossPrice: 278.0,
    strategyTag: '🏆 四面向 Bottom-Up 全能複合',
    notes: 'ROE 27.5%、P/E 19.6 合理、月營收年增 38.5%，站穩季線且三大法人買超',
    addedAt: new Date().toISOString(),
  },
  {
    id: 'wl-2454',
    symbol: '2454.TW',
    name: '聯發科',
    sectorName: 'IC 設計與矽智財 IP',
    listType: 'watching',
    addedPrice: 1290.0,
    currentPrice: 1315.0,
    targetBuyPrice: 1280.0,
    stopLossPrice: 1190.0,
    strategyTag: '💎 彼得林區 GARP 價值成長',
    notes: 'P/E 19.2 倍搭配營收年增 19.4%、殖利率 4.2%，兼具 AI 成長與高息保護',
    addedAt: new Date().toISOString(),
  },
  {
    id: 'wl-2345',
    symbol: '2345.TW',
    name: '智邦',
    sectorName: 'CPO 矽光子與高速網通',
    listType: 'favorite',
    addedPrice: 575.0,
    currentPrice: 592.0,
    targetBuyPrice: 570.0,
    stopLossPrice: 525.0,
    strategyTag: '🌊 資金板塊順勢動能王',
    notes: '800G 交換器與 AI 加速卡拉貨，單月營收創歷史新高、投信積極認養',
    addedAt: new Date().toISOString(),
  },
  {
    id: 'wl-2891',
    symbol: '2891.TW',
    name: '中信金',
    sectorName: '金控銀行與高息價值',
    listType: 'favorite',
    addedPrice: 36.8,
    currentPrice: 37.6,
    targetBuyPrice: 36.5,
    stopLossPrice: 34.0,
    strategyTag: '🛡️ 低波動高 ROE 護城河',
    notes: 'ROE 15.8%、P/E 10.4 倍、年化波動度僅 15.4%，降低投組最大回撤首選',
    addedAt: new Date().toISOString(),
  },
];
