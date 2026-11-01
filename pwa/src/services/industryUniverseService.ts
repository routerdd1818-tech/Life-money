/**
 * 台股全市場產業族群與題材概念分群服務 (Industry & Concept Universe Service)
 * 涵蓋全台股 3,578 檔標的，提供 32 大官方標準產業與 8 大主流熱門題材分類
 */

import universeData from '../data/taiwanStockUniverse.json';
import { TaiwanStockBasicInfo } from './stockUniverseService';

export interface IndustryGroupMeta {
  id: string;
  name: string;
  type: 'official' | 'concept';
  stockCount: number;
  description: string;
  badgeColor?: string;
}

// 題材概念股對應關鍵標的清單 (擴充主流題材)
const CONCEPT_MAPPINGS: Record<string, { name: string; desc: string; symbols: string[] }> = {
  concept_ai_server: {
    name: 'AI 伺服器與散熱',
    desc: 'GB200/B200 機櫃、液冷散熱、電源供應與伺服器組裝',
    symbols: ['2382', '3017', '3324', '2421', '6669', '3231', '2317', '2356', '2376', '3013', '8996'],
  },
  concept_cowos: {
    name: 'CoWoS 與先進封裝',
    desc: '台積電先進封裝供應鏈、濕製程設備、點膠機與測試介面',
    symbols: ['2330', '3131', '3583', '6187', '3711', '6515', '2449', '3680', '6640', '8028'],
  },
  concept_cpo: {
    name: 'CPO 矽光子與光通訊',
    desc: '共同封裝光學元件、光收發模組、雷射二極體與高頻交換器',
    symbols: ['2345', '3450', '4979', '3363', '6442', '3163', '4977', '6451'],
  },
  concept_robotics: {
    name: '機器人與工具機',
    desc: '人形機器人、AI 視覺感知、關節減速機與自動化工具機',
    symbols: ['2359', '4526', '6188', '2049', '4576', '1597', '8374', '2365', '4540'],
  },
  concept_ic_design: {
    name: 'IC 設計與矽智財 IP',
    desc: '手機晶片、ASIC 客製化晶片、高速傳輸與矽智財授權',
    symbols: ['2454', '3661', '3443', '3035', '3529', '6526', '6732', '3034', '2379', '8016'],
  },
  concept_power_grid: {
    name: '強韌電網與重電綠能',
    desc: '台電強韌電網計畫、變壓器、高壓開關、太陽能與離岸風電',
    symbols: ['1519', '1503', '1513', '1514', '1609', '1605', '9958', '3708', '6869', '1504'],
  },
  concept_low_orbit: {
    name: '低軌衛星與航太太空',
    desc: 'SpaceX / Oneweb 供應鏈、高頻微波元件與衛星天線地面接收端',
    symbols: ['3491', '2368', '6285', '2312', '4916', '3023', '2634'],
  },
  concept_high_dividend: {
    name: '熱門高股息人氣標的',
    desc: '全市場高現金殖利率、定期定額存股與熱門高息 ETF 成分股',
    symbols: ['00878', '0056', '00919', '00929', '2886', '2884', '2881', '2882', '2412', '3045'],
  },
};

// 官方產業標準化歸納群組
export const OFFICIAL_INDUSTRY_GROUPS: Array<{
  id: string;
  name: string;
  matcher: (sector: string) => boolean;
  desc: string;
}> = [
  {
    id: 'ind_semicon',
    name: '半導體業',
    matcher: (s) => s.includes('半導體'),
    desc: '晶圓代工、IC 製造、記憶體與半導體封裝測試',
  },
  {
    id: 'ind_computer',
    name: '電腦及週邊設備',
    matcher: (s) => s.includes('電腦及週邊') || s.includes('電腦週邊'),
    desc: '筆記型電腦、伺服器、機殼、滑鼠鍵盤與工業電腦',
  },
  {
    id: 'ind_components',
    name: '電子零組件業',
    matcher: (s) => s.includes('電子零組件'),
    desc: '被動元件、連接器、散熱零組件、PCB 電路板與石英晶體',
  },
  {
    id: 'ind_opto',
    name: '光電業',
    matcher: (s) => s.includes('光電'),
    desc: '面板、LED、光學鏡頭、光感測與投影模組',
  },
  {
    id: 'ind_comm',
    name: '通信網路業',
    matcher: (s) => s.includes('通信網路'),
    desc: '電信運營商、網通路由器、光纖設備與無線通訊模組',
  },
  {
    id: 'ind_machinery',
    name: '電機機械',
    matcher: (s) => s.includes('電機機械') || s.includes('工具機'),
    desc: '精密機械、自動化設備、重電馬達與數控機床',
  },
  {
    id: 'ind_biomed',
    name: '生技醫療業',
    matcher: (s) => s.includes('生技') || s.includes('化學生技醫療'),
    desc: '新藥研發、醫療器材、醫美保健與學名藥廠',
  },
  {
    id: 'ind_finance',
    name: '金融保險業',
    matcher: (s) => s.includes('金融'),
    desc: '金控集團、商業銀行、產險人壽與綜合證券商',
  },
  {
    id: 'ind_shipping',
    name: '航運業',
    matcher: (s) => s.includes('航運'),
    desc: '貨櫃航運、散裝散貨船、航空客貨運與倉儲物流',
  },
  {
    id: 'ind_construction',
    name: '建材營造業',
    matcher: (s) => s.includes('建材營造'),
    desc: '土地開發、住宅商辦建案推案與基礎工程工程營造',
  },
  {
    id: 'ind_steel',
    name: '鋼鐵工業',
    matcher: (s) => s.includes('鋼鐵'),
    desc: '熱軋冷軋鋼板、不銹鋼、螺絲螺帽與鋼結構工程',
  },
  {
    id: 'ind_etf',
    name: '指數型基金 ETF',
    matcher: (s) => s.toUpperCase().includes('ETF') || s.includes('基金'),
    desc: '台美股市值型、高股息型、美債型與海外產業型 ETF',
  },
  {
    id: 'ind_auto',
    name: '汽車工業',
    matcher: (s) => s.includes('汽車'),
    desc: '整車製造、汽車車燈、輪圈、車載電子與保險桿售後維修',
  },
  {
    id: 'ind_chemicals',
    name: '化學與塑膠',
    matcher: (s) => s.includes('化學') || s.includes('塑膠'),
    desc: '特用化學品、石化原料、工程塑膠與電子級化學溶劑',
  },
  {
    id: 'ind_green',
    name: '綠能與環保',
    matcher: (s) => s.includes('綠能') || s.includes('環保'),
    desc: '廢棄物清理回收、太陽能儲能案場與水資源處理',
  },
  {
    id: 'ind_tourism',
    name: '觀光餐旅與飯店',
    matcher: (s) => s.includes('觀光'),
    desc: '連鎖餐飲餐食、觀光渡假飯店、旅行社機票出入境業務',
  },
  {
    id: 'ind_cloud_software',
    name: '數位雲端與資訊軟體',
    matcher: (s) => s.includes('數位雲端') || s.includes('資訊服務') || s.includes('電子商務'),
    desc: 'SaaS 軟體雲端服務、資安防護、系統整合與電商金流',
  },
  {
    id: 'ind_textile',
    name: '紡織纖維',
    matcher: (s) => s.includes('紡織'),
    desc: '聚酯加工絲、尼龍機能布料與成衣代工組裝',
  },
  {
    id: 'ind_food',
    name: '食品工業',
    matcher: (s) => s.includes('食品'),
    desc: '食用油脂、麵粉飼料、肉品加工與休閒烘焙飲料',
  },
  {
    id: 'ind_elec_dist',
    name: '電子通路業',
    matcher: (s) => s.includes('電子通路'),
    desc: '半導體零組件代理經銷、IC 通路與被動元件批發',
  },
  {
    id: 'ind_cable',
    name: '電器電纜',
    matcher: (s) => s.includes('電器電纜'),
    desc: '特高壓電纜、漆包線、銅線棒與建築用配線',
  },
  {
    id: 'ind_culture',
    name: '文化創意業',
    matcher: (s) => s.includes('文化創意'),
    desc: '手機遊戲研發發行、文創演藝與影視內容製作',
  },
  {
    id: 'ind_sports',
    name: '運動休閒類',
    matcher: (s) => s.includes('運動休閒'),
    desc: '高級自行車成車零件、健身器材製造與高爾夫球頭製造',
  },
  {
    id: 'ind_home',
    name: '居家生活類',
    matcher: (s) => s.includes('居家生活'),
    desc: '品牌家飾寢具、居家生活百貨與廚衛五金設備',
  },
  {
    id: 'ind_rubber',
    name: '橡膠工業',
    matcher: (s) => s.includes('橡膠'),
    desc: '轎車休旅輪胎、工業用傳動橡膠皮帶與輸送帶',
  },
  {
    id: 'ind_cement_glass',
    name: '水泥與玻璃陶瓷',
    matcher: (s) => s.includes('水泥') || s.includes('玻璃陶瓷'),
    desc: '生力水泥混泥土、浮法平板玻璃與建材磁磚',
  },
  {
    id: 'ind_gas_oil',
    name: '油電燃氣業',
    matcher: (s) => s.includes('油電燃氣'),
    desc: '天然氣管線民生瓦斯、加油站油品批發與發電廠',
  },
  {
    id: 'ind_paper',
    name: '造紙工業',
    matcher: (s) => s.includes('造紙'),
    desc: '工業用紙箱包裝紙、家庭生活衛生紙與文化用紙',
  },
  {
    id: 'ind_innovative',
    name: '創新板專區',
    matcher: (s) => s.includes('創新板') || s.includes('創新版'),
    desc: '新興前瞻科技、高技術門檻與快速成長潛力創新企業',
  },
  {
    id: 'ind_other_elec',
    name: '其他電子與工業',
    matcher: (s) => s.includes('其他電子') || s.includes('電子工業'),
    desc: '綜合電子製造、精密零配件加工與跨領域科技產業',
  },
  {
    id: 'ind_misc',
    name: '其他綜合傳產',
    matcher: () => true, // 兜底
    desc: '其他未分類製造業與綜合多元化業務企業',
  },
];

// 將全體 3,578 檔標的依官方分類預先歸組 (補齊標準 symbol: 如 4526.TW)
const allStocksUniverse: TaiwanStockBasicInfo[] = (universeData as Array<{
  id: string;
  name: string;
  sector: string;
  market: 'TWSE' | 'TPEx';
}>).map((item) => ({
  id: item.id,
  name: item.name,
  sector: item.sector || '其他',
  market: item.market || 'TWSE',
  symbol: `${item.id}.${item.market === 'TPEx' ? 'TWO' : 'TW'}`,
}));

const groupedOfficialStocks: Record<string, TaiwanStockBasicInfo[]> = {};

// 初始化分類桶
OFFICIAL_INDUSTRY_GROUPS.forEach((g) => {
  groupedOfficialStocks[g.id] = [];
});

// 分群分配
allStocksUniverse.forEach((stock) => {
  const sName = stock.sector || '';
  let assigned = false;
  for (const g of OFFICIAL_INDUSTRY_GROUPS) {
    if (g.id === 'ind_misc') continue; // 保留給最後兜底
    if (g.matcher(sName)) {
      groupedOfficialStocks[g.id].push(stock);
      assigned = true;
      break;
    }
  }
  if (!assigned) {
    groupedOfficialStocks['ind_misc'].push(stock);
  }
});

/**
 * 取得所有官方產業群組資訊
 */
export function getAllIndustryGroups(): IndustryGroupMeta[] {
  return OFFICIAL_INDUSTRY_GROUPS.map((g) => ({
    id: g.id,
    name: g.name,
    type: 'official' as const,
    stockCount: groupedOfficialStocks[g.id]?.length || 0,
    description: g.desc,
  })).filter((g) => g.stockCount > 0);
}

/**
 * 取得熱門前瞻題材概念群組清單
 */
export function getAllConceptGroups(): IndustryGroupMeta[] {
  return Object.entries(CONCEPT_MAPPINGS).map(([id, info]) => {
    const matchedCount = allStocksUniverse.filter((s) => info.symbols.includes(s.id)).length;
    return {
      id,
      name: info.name,
      type: 'concept' as const,
      stockCount: matchedCount || info.symbols.length,
      description: info.desc,
    };
  });
}

export interface SubCategoryMeta {
  id: string;
  name: string;
  badge?: string;
}

export interface SubCategoryDefinition {
  id: string;
  name: string;
  matcher: (stock: TaiwanStockBasicInfo) => boolean;
}

export const GROUP_SUBCATEGORIES: Record<string, SubCategoryDefinition[]> = {
  ind_semicon: [
    {
      id: 'sub_ic_design',
      name: 'IC 設計',
      matcher: (s) =>
        ['2454', '3034', '2379', '3661', '3443', '3035', '3529', '6526', '6732', '8016', '6415', '3227', '4968', '6237', '5471', '3141', '6462', '4961', '3545', '8054', '6531', '3014'].includes(s.id) ||
        s.name.includes('科') || s.name.includes('芯') || s.name.includes('智') || s.name.includes('原') || s.name.includes('創'),
    },
    {
      id: 'sub_foundry',
      name: '晶圓代工',
      matcher: (s) => ['2330', '2303', '5347', '6770', '3707', '2337', '2344'].includes(s.id),
    },
    {
      id: 'sub_packaging',
      name: '封裝測試',
      matcher: (s) =>
        ['3711', '2449', '6239', '8150', '3264', '6257', '6515', '6683', '8110', '6525', '3374'].includes(s.id) ||
        s.name.includes('封') || s.name.includes('測') || s.name.includes('詮'),
    },
    {
      id: 'sub_equipment',
      name: '設備與材料',
      matcher: (s) =>
        ['3131', '3583', '6187', '6640', '3680', '8028', '1560', '5483', '6488', '5387', '3413', '8299', '2404', '3555'].includes(s.id) ||
        s.name.includes('設備') || s.name.includes('材料') || s.name.includes('晶'),
    },
  ],
  ind_computer: [
    {
      id: 'sub_ai_servers',
      name: 'AI 伺服器/組裝',
      matcher: (s) => ['2382', '2317', '3231', '6669', '2356', '2376', '2357', '2377', '3706', '2301', '2324'].includes(s.id),
    },
    {
      id: 'sub_chassis',
      name: '機殼與散熱電源',
      matcher: (s) => ['3013', '8210', '6117', '2308', '3017', '2421', '3005', '6125'].includes(s.id),
    },
    {
      id: 'sub_ipc',
      name: '工業電腦 IPC',
      matcher: (s) => ['2395', '6414', '6245', '8050', '3088', '5258', '6579', '3594', '4916'].includes(s.id) || s.name.includes('研') || s.name.includes('樺'),
    },
  ],
  ind_components: [
    {
      id: 'sub_cooling',
      name: '散熱元件',
      matcher: (s) => ['3017', '3324', '2421', '8996', '3653', '6230', '3013', '2486'].includes(s.id),
    },
    {
      id: 'sub_pcb',
      name: 'PCB 與載板',
      matcher: (s) => ['3037', '8046', '3189', '2368', '2383', '6274', '6213', '5469', '8155', '4958', '3044'].includes(s.id) || s.name.includes('電') || s.name.includes('光'),
    },
    {
      id: 'sub_passive',
      name: '被動元件',
      matcher: (s) => ['2327', '2492', '6173', '2375', '2456', '2478', '6207', '3026'].includes(s.id),
    },
    {
      id: 'sub_connectors',
      name: '連接器與線纜',
      matcher: (s) => ['3533', '3665', '3023', '6290', '3689', '6197', '3217'].includes(s.id),
    },
  ],
  ind_comm: [
    {
      id: 'sub_cpo',
      name: 'CPO 矽光子',
      matcher: (s) => ['4979', '3363', '3163', '4977', '6442', '6451', '3450', '2345'].includes(s.id),
    },
    {
      id: 'sub_networking',
      name: '網通設備',
      matcher: (s) => ['2345', '5388', '6285', '3596', '2332', '3704', '2444'].includes(s.id),
    },
    {
      id: 'sub_telecom',
      name: '電信與衛星',
      matcher: (s) => ['2412', '3045', '4904', '3491', '2312', '4916'].includes(s.id),
    },
  ],
  ind_machinery: [
    {
      id: 'sub_heavy_electric',
      name: '重電綠能電網',
      matcher: (s) => ['1519', '1503', '1513', '1514', '1504', '1516', '1609', '1605'].includes(s.id),
    },
    {
      id: 'sub_robotics',
      name: '機器人與工具機',
      matcher: (s) => ['4526', '2049', '4576', '1597', '2359', '6188', '8374', '2365', '4540', '4566', '1582'].includes(s.id),
    },
  ],
  ind_biomed: [
    {
      id: 'sub_new_drug',
      name: '新藥研發/CDMO',
      matcher: (s) => ['6446', '6550', '4743', '6472', '1795', '4162', '6589', '6712'].includes(s.id),
    },
    {
      id: 'sub_med_devices',
      name: '醫療器材',
      matcher: (s) => ['4104', '4736', '1789', '4105', '6491', '1786', '4107'].includes(s.id),
    },
  ],
  ind_finance: [
    {
      id: 'sub_fin_holding',
      name: '金控集團',
      matcher: (s) => ['2881', '2882', '2886', '2884', '2891', '2892', '2880', '2887', '2883', '2885', '2890', '5880'].includes(s.id) || s.name.includes('金控') || s.name.includes('金'),
    },
    {
      id: 'sub_banking_securities',
      name: '銀行與證券',
      matcher: (s) => ['2801', '2834', '2855', '6005', '2838', '2812', '2845', '2851', '5876'].includes(s.id) || s.name.includes('銀') || s.name.includes('證'),
    },
  ],
  ind_shipping: [
    {
      id: 'sub_marine',
      name: '貨櫃散裝',
      matcher: (s) => ['2603', '2609', '2615', '2606', '2605', '2637', '2612', '2617'].includes(s.id),
    },
    {
      id: 'sub_aviation',
      name: '航空客貨',
      matcher: (s) => ['2618', '2610', '2645', '2646'].includes(s.id),
    },
  ],
};

/**
 * 取得指定群組支援的次級小分類清單 (包含全部、上市、上櫃與專屬業務領域)
 */
export function getSubCategoriesForGroup(groupId: string): SubCategoryMeta[] {
  const baseSubCategories: SubCategoryMeta[] = [
    { id: 'all', name: '全部' },
    { id: 'twse', name: '上市' },
    { id: 'tpex', name: '上櫃' },
  ];

  const specific = GROUP_SUBCATEGORIES[groupId];
  if (specific && specific.length > 0) {
    return [
      ...baseSubCategories,
      ...specific.map((s) => ({ id: s.id, name: s.name })),
    ];
  }

  return baseSubCategories;
}

/**
 * 根據群組 ID 與次級小分類 ID 取得該族群內的所有標的（支援搜尋過濾）
 */
export function getFilteredStocksInGroup(
  groupId: string,
  subCategoryId = 'all',
  searchKeyword = '',
  limit = 120
): TaiwanStockBasicInfo[] {
  let list: TaiwanStockBasicInfo[] = [];

  if (groupId.startsWith('concept_')) {
    const concept = CONCEPT_MAPPINGS[groupId];
    if (concept) {
      list = allStocksUniverse.filter((s) => concept.symbols.includes(s.id));
    }
  } else {
    list = groupedOfficialStocks[groupId] || [];
  }

  // 1. 次級小分類過濾
  if (subCategoryId === 'twse') {
    list = list.filter((s) => s.market === 'TWSE');
  } else if (subCategoryId === 'tpex') {
    list = list.filter((s) => s.market === 'TPEx');
  } else if (subCategoryId !== 'all') {
    const specificDefs = GROUP_SUBCATEGORIES[groupId];
    const def = specificDefs?.find((d) => d.id === subCategoryId);
    if (def) {
      list = list.filter((s) => def.matcher(s));
    }
  }

  // 2. 關鍵字搜尋過濾
  const q = searchKeyword.trim().toLowerCase();
  if (!q) {
    return list.slice(0, limit);
  }

  return list
    .filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
    )
    .slice(0, limit);
}

/**
 * 根據群組 ID 取得該族群內的所有標的（支援搜尋過濾）
 */
export function getStocksInGroup(
  groupId: string,
  searchKeyword = '',
  limit = 80
): TaiwanStockBasicInfo[] {
  return getFilteredStocksInGroup(groupId, 'all', searchKeyword, limit);
}
