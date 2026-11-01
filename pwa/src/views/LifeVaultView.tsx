import React, { useState } from 'react';
import {
  Bike,
  Car,
  Edit3,
  ExternalLink,
  Gauge,
  HeartPulse,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  Truck,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { AttachmentPicker } from '../components/AttachmentPicker';
import {
  InsuranceCategory,
  PaymentSourceType,
  PolicyPaymentCycle,
  VehicleProfile,
  VehicleType,
} from '../types';

type LifeSubTab = 'vehicle' | 'insurance' | 'medical';

const VEHICLE_TYPE_META: Record<VehicleType, { label: string; emoji: string }> = {
  sedan: { label: '轎車 / 掀背車', emoji: '🚗' },
  suv: { label: '休旅車 SUV', emoji: '🚙' },
  mpv: { label: '廂型車 / 商務 MPV', emoji: '🚐' },
  scooter: { label: '白牌普通重機', emoji: '🛵' },
  heavy_motor: { label: '黃/紅牌大型重機', emoji: '🏍️' },
  electric: { label: '純電動車 EV', emoji: '⚡' },
  truck: { label: '貨車 / 其他', emoji: '🚚' },
};

const generateDefaultConsumables = (type: VehicleType, currentKm: number) => {
  if (type === 'electric') {
    return [
      { id: 'c-cabin-filter', itemName: '冷氣/HEPA高效濾網', intervalKm: 20000, lastReplacedMileage: Math.max(0, currentKm - 8000), lastReplacedDate: '2025-08-01' },
      { id: 'c-brake-fluid', itemName: '煞車油與管路檢測', intervalKm: 40000, lastReplacedMileage: Math.max(0, currentKm - 15000), lastReplacedDate: '2025-03-10' },
      { id: 'c-tires', itemName: '四輪輪胎胎紋深度', intervalKm: 40000, lastReplacedMileage: Math.max(0, currentKm - 22000), lastReplacedDate: '2024-11-15' },
      { id: 'c-coolant', itemName: '三電系統專用冷卻液', intervalKm: 80000, lastReplacedMileage: Math.max(0, currentKm - 10000), lastReplacedDate: '2025-01-20' },
      { id: 'c-12v-battery', itemName: '低壓 12V 輔助電瓶', intervalKm: 50000, lastReplacedMileage: Math.max(0, currentKm - 15000), lastReplacedDate: '2024-06-01' },
    ];
  }
  if (type === 'scooter' || type === 'heavy_motor') {
    return [
      { id: 'c-oil', itemName: '機油更換', intervalKm: type === 'scooter' ? 1500 : 3000, lastReplacedMileage: Math.max(0, currentKm - 800), lastReplacedDate: '2026-01-10' },
      { id: 'c-gear-oil', itemName: '齒輪油更換', intervalKm: 3000, lastReplacedMileage: Math.max(0, currentKm - 1200), lastReplacedDate: '2025-11-15' },
      { id: 'c-air-filter', itemName: '空濾棉清潔更換', intervalKm: 5000, lastReplacedMileage: Math.max(0, currentKm - 2500), lastReplacedDate: '2025-09-01' },
      { id: 'c-spark-plug', itemName: '火星塞點火檢查', intervalKm: 10000, lastReplacedMileage: Math.max(0, currentKm - 4000), lastReplacedDate: '2025-05-20' },
      { id: 'c-belt', itemName: '傳動皮帶/普利珠磨耗', intervalKm: 20000, lastReplacedMileage: Math.max(0, currentKm - 12000), lastReplacedDate: '2024-10-10' },
      { id: 'c-tires', itemName: '前後輪胎胎紋深度', intervalKm: 12000, lastReplacedMileage: Math.max(0, currentKm - 6000), lastReplacedDate: '2025-04-12' },
    ];
  }
  return [
    { id: 'c-oil', itemName: '全合成機油與機油芯', intervalKm: 10000, lastReplacedMileage: Math.max(0, currentKm - 4800), lastReplacedDate: '2025-12-10' },
    { id: 'c-trans-fluid', itemName: '變速箱油 (ATF/CVT)', intervalKm: 40000, lastReplacedMileage: Math.max(0, currentKm - 22000), lastReplacedDate: '2024-08-15' },
    { id: 'c-brake-fluid', itemName: '煞車油 DOT4', intervalKm: 20000, lastReplacedMileage: Math.max(0, currentKm - 16000), lastReplacedDate: '2024-11-20' },
    { id: 'c-air-filter', itemName: '引擎進氣與冷氣濾網', intervalKm: 10000, lastReplacedMileage: Math.max(0, currentKm - 6000), lastReplacedDate: '2025-06-12' },
    { id: 'c-coolant', itemName: '水箱長效防凍冷卻液', intervalKm: 50000, lastReplacedMileage: Math.max(0, currentKm - 35000), lastReplacedDate: '2023-09-10' },
    { id: 'c-battery', itemName: '電瓶 (AGM/EFB 蓄電量)', intervalKm: 40000, lastReplacedMileage: Math.max(0, currentKm - 18000), lastReplacedDate: '2024-05-18' },
    { id: 'c-tires', itemName: '四輪輪胎磨耗與胎紋', intervalKm: 40000, lastReplacedMileage: Math.max(0, currentKm - 28000), lastReplacedDate: '2024-02-14' },
  ];
};

export const LifeVaultView: React.FC = () => {
  const {
    vehicles,
    upsertVehicle,
    deleteVehicle,
    addVehicleMaintenanceLog,
    insurancePolicies,
    upsertInsurancePolicy,
    deleteInsurancePolicy,
    medicalRecords,
    upsertMedicalRecord,
    deleteMedicalRecord,
    assetAccounts,
    creditCards,
  } = useVault();

  const [subTab, setSubTab] = useState<LifeSubTab>('vehicle');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  // 0. 車輛新增與編輯狀態
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehName, setVehName] = useState('');
  const [vehType, setVehType] = useState<VehicleType>('suv');
  const [vehPlate, setVehPlate] = useState('');
  const [vehBrand, setVehBrand] = useState('');
  const [vehModel, setVehModel] = useState('');
  const [vehCc, setVehCc] = useState('');
  const [vehMileage, setVehMileage] = useState('');
  const [vehNextInsp, setVehNextInsp] = useState('');
  const [vehInsurExp, setVehInsurExp] = useState('');

  const openCreateVehicleModal = () => {
    setEditingVehicleId(null);
    setVehName('');
    setVehType('suv');
    setVehPlate('');
    setVehBrand('');
    setVehModel('');
    setVehCc('2000');
    setVehMileage('30000');
    setVehNextInsp('');
    setVehInsurExp('');
    setShowVehicleModal(true);
  };

  const openEditVehicleModal = (v: VehicleProfile) => {
    setEditingVehicleId(v.id);
    setVehName(v.name);
    setVehType(v.vehicleType || 'suv');
    setVehPlate(v.licensePlate || '');
    setVehBrand(v.brand || '');
    setVehModel(v.modelName || '');
    setVehCc(v.displacementCc ? String(v.displacementCc) : '');
    setVehMileage(String(v.currentMileage || 0));
    setVehNextInsp(v.nextInspectionDate || '');
    setVehInsurExp(v.insuranceExpiryDate || '');
    setShowVehicleModal(true);
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehPlate.trim() || !vehName.trim()) return;

    const km = Number(vehMileage) || 0;
    const cc = vehCc ? Number(vehCc) : undefined;
    const cleanPlate = vehPlate.trim().toUpperCase();

    if (editingVehicleId) {
      const existing = vehicles.find((v) => v.id === editingVehicleId);
      if (existing) {
        upsertVehicle({
          ...existing,
          name: vehName.trim(),
          vehicleType: vehType,
          licensePlate: cleanPlate,
          brand: vehBrand.trim() || undefined,
          modelName: vehModel.trim() || undefined,
          displacementCc: cc,
          currentMileage: km,
          nextInspectionDate: vehNextInsp || undefined,
          insuranceExpiryDate: vehInsurExp || undefined,
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      const newId = `veh-${Date.now()}`;
      const newVeh: VehicleProfile = {
        id: newId,
        name: vehName.trim(),
        vehicleType: vehType,
        licensePlate: cleanPlate,
        brand: vehBrand.trim() || undefined,
        modelName: vehModel.trim() || undefined,
        displacementCc: cc,
        currentMileage: km,
        nextInspectionDate: vehNextInsp || undefined,
        insuranceExpiryDate: vehInsurExp || undefined,
        consumables: generateDefaultConsumables(vehType, km),
        logs: [],
        updatedAt: new Date().toISOString(),
      };
      upsertVehicle(newVeh);
      setSelectedVehicleId(newId);
    }

    setShowVehicleModal(false);
  };

  // 1. 汽車保養表單狀態
  const [showAddMaint, setShowAddMaint] = useState(false);
  const [maintDate, setMaintDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [maintMileage, setMaintMileage] = useState(() =>
    String(activeVehicle?.currentMileage || 50000)
  );
  const [maintShop, setMaintShop] = useState('');
  const [maintItemsText, setMaintItemsText] = useState('');
  const [maintCost, setMaintCost] = useState('');
  const [maintNextKm, setMaintNextKm] = useState('');
  const [maintNextDate, setMaintNextDate] = useState('');
  const [maintConsumableId, setMaintConsumableId] = useState('');
  const [maintAttachment, setMaintAttachment] = useState<string | undefined>(undefined);
  const [maintSyncLedger, setMaintSyncLedger] = useState(true);
  const [maintPayType, setMaintPayType] = useState<PaymentSourceType>('credit_card');
  const [maintPayId, setMaintPayId] = useState(creditCards[0]?.id || '');

  // 2. 保險保單表單狀態
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [insurerName, setInsurerName] = useState('');
  const [policyName, setPolicyName] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [polCategory, setPolCategory] = useState<InsuranceCategory>('medical');
  const [insuredPerson, setInsuredPerson] = useState('本人');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [paymentCycle, setPaymentCycle] = useState<PolicyPaymentCycle>('annual');
  const [nextPayDate, setNextPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [totalYears, setTotalYears] = useState('20');
  const [paidYears, setPaidYears] = useState('1');
  const [coverageSummary, setCoverageSummary] = useState('');
  const [includeNetWorth, setIncludeNetWorth] = useState(false);
  const [cashValue, setCashValue] = useState('');
  const [polPayType, setPolPayType] = useState<PaymentSourceType>('credit_card');
  const [polPayId, setPolPayId] = useState(creditCards[0]?.id || '');
  const [polAttachment, setPolAttachment] = useState<string | undefined>(undefined);
  const [polSyncNow, setPolSyncNow] = useState(false);

  // 3. 醫療回診表單狀態
  const [showAddMed, setShowAddMed] = useState(false);
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hospitalName, setHospitalName] = useState('');
  const [department, setDepartment] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [diagnosisSummary, setDiagnosisSummary] = useState('');
  const [doctorAdvice, setDoctorAdvice] = useState('');
  const [medCost, setMedCost] = useState('');
  const [nextApptDate, setNextApptDate] = useState('');
  const [nextApptTime, setNextApptTime] = useState('14:30');
  const [apptNumber, setApptNumber] = useState('');
  const [hasChronic, setHasChronic] = useState(false);
  const [refill2Date, setRefill2Date] = useState('');
  const [refill3Date, setRefill3Date] = useState('');
  const [medAttachment, setMedAttachment] = useState<string | undefined>(undefined);
  const [medSyncLedger, setMedSyncLedger] = useState(true);
  const [medPayType, setMedPayType] = useState<PaymentSourceType>('account');
  const [medPayId, setMedPayId] = useState(assetAccounts[0]?.id || '');

  // 圖片全螢幕預覽狀態
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <div className="space-y-4 pb-24">
      {/* 頂部子分頁切換器 */}
      <div className="toss-pill-bar">
        <button
          type="button"
          onClick={() => setSubTab('vehicle')}
          className={`toss-pill-btn flex-1 ${
            subTab === 'vehicle' ? 'toss-pill-btn-active' : 'toss-pill-btn-inactive'
          }`}
        >
          🚗 汽車保養資訊
        </button>
        <button
          type="button"
          onClick={() => setSubTab('insurance')}
          className={`toss-pill-btn flex-1 ${
            subTab === 'insurance' ? 'toss-pill-btn-active' : 'toss-pill-btn-inactive'
          }`}
        >
          🛡️ 保險保單紀錄
        </button>
        <button
          type="button"
          onClick={() => setSubTab('medical')}
          className={`toss-pill-btn flex-1 ${
            subTab === 'medical' ? 'toss-pill-btn-active' : 'toss-pill-btn-inactive'
          }`}
        >
          🏥 醫療回診與慢箋
        </button>
      </div>

      {/* =======================================================
          1. 汽車保養資訊紀錄與零件耗材預警
         ======================================================= */}
      {subTab === 'vehicle' && (
        <div className="space-y-4">
          {/* 車輛選擇與管理切換列 */}
          <div className="toss-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {vehicles.map((v) => {
                const meta = VEHICLE_TYPE_META[v.vehicleType || 'suv'] || {
                  label: '車輛',
                  emoji: '🚗',
                };
                const isSelected = v.id === activeVehicle?.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVehicleId(v.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#2563EB] text-white shadow-2xs font-bold'
                        : 'bg-[#F0F2F6] dark:bg-[#1F2631] text-[#4E5968] dark:text-[#9BA4B0] hover:text-[#191F28]'
                    }`}
                  >
                    <span>{meta.emoji}</span>
                    <span>{v.name}</span>
                    <span className="font-mono text-[11px] opacity-80">[{v.licensePlate}]</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={openCreateVehicleModal}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] text-xs font-semibold flex items-center justify-center gap-1.5 text-[#2563EB] hover:bg-[#F6F7F9] dark:hover:bg-[#1F2631] shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增愛車 (汽/機/電車)</span>
            </button>
          </div>

          {!activeVehicle ? (
            <div className="toss-card p-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] flex items-center justify-center">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                  尚未建立任何愛車資料
                </h4>
                <p className="text-xs text-[#8B95A1] mt-1">
                  支援休旅車、轎車、普通重機、大型重機、純電動車等車型與保養零件耗材監控
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateVehicleModal}
                className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>立即建立第一輛車</span>
              </button>
            </div>
          ) : (
            <>
              {/* 愛車主卡 */}
              <div className="toss-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] flex items-center justify-center text-xl shrink-0">
                      {VEHICLE_TYPE_META[activeVehicle.vehicleType || 'suv']?.emoji || '🚗'}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          {activeVehicle.name}
                        </span>
                        {/* 仿實體車牌框 */}
                        <span className="px-2 py-0.5 rounded-md border border-[#191F28] dark:border-white font-mono font-bold text-xs tracking-wider bg-white dark:bg-[#161B22] text-[#191F28] dark:text-white shadow-2xs">
                          {activeVehicle.licensePlate}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-[10px] font-semibold text-[#2563EB]">
                          {VEHICLE_TYPE_META[activeVehicle.vehicleType || 'suv']?.label || '車輛'}
                        </span>
                        {activeVehicle.brand && (
                          <span className="px-2 py-0.5 rounded bg-[#F0F2F6] dark:bg-[#1F2631] text-[10px] font-medium text-[#4E5968] dark:text-[#9BA4B0]">
                            {activeVehicle.brand} {activeVehicle.modelName || ''}
                          </span>
                        )}
                        {activeVehicle.displacementCc && (
                          <span className="text-[11px] text-[#8B95A1] tabular-nums">
                            {activeVehicle.displacementCc} cc
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[#8B95A1] tabular-nums mt-1.5 flex flex-wrap items-center gap-3">
                        <span>下次驗車：{activeVehicle.nextInspectionDate || '未設定'}</span>
                        <span>車險到期：{activeVehicle.insuranceExpiryDate || '未設定'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right tabular-nums shrink-0">
                    <div className="text-xs text-[#8B95A1]">目前總里程</div>
                    <div className="text-lg font-bold text-[#2563EB]">
                      {activeVehicle.currentMileage.toLocaleString()} km
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const nextKm = prompt(
                            '更新目前愛車總里程數 (km)：',
                            String(activeVehicle.currentMileage)
                          );
                          if (nextKm && !Number.isNaN(Number(nextKm))) {
                            upsertVehicle({
                              ...activeVehicle,
                              currentMileage: Number(nextKm),
                              updatedAt: new Date().toISOString(),
                            });
                          }
                        }}
                        className="text-[11px] font-semibold text-[#2563EB] underline"
                      >
                        更新里程
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditVehicleModal(activeVehicle)}
                        className="text-[11px] font-semibold text-[#4E5968] dark:text-[#9BA4B0] hover:text-[#191F28] flex items-center gap-0.5"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>編輯</span>
                      </button>
                      {vehicles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              confirm(
                                `確定要刪除車輛「${activeVehicle.name} (${activeVehicle.licensePlate})」嗎？`
                              )
                            ) {
                              deleteVehicle(activeVehicle.id);
                              setSelectedVehicleId(
                                vehicles.find((v) => v.id !== activeVehicle.id)?.id || ''
                              );
                            }
                          }}
                          className="text-[11px] font-semibold text-rose-500 hover:text-rose-600"
                        >
                          刪除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

          {/* 耗材更換里程雙軌追蹤 */}
          <div className="toss-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Gauge className="w-4 h-4 text-[#2563EB]" />
                <span>關鍵零件耗材壽命監控 (依目前里程自動推算)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeVehicle.consumables.map((con) => {
                const usedKm = activeVehicle.currentMileage - con.lastReplacedMileage;
                const interval = con.intervalKm || 10000;
                const remainingKm = interval - usedKm;
                const usedPct = Math.min(100, Math.max(0, Math.round((usedKm / interval) * 100)));
                const isDueSoon = remainingKm <= 1000;

                return (
                  <div
                    key={con.id}
                    className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#191F28] dark:text-[#F2F4F8]">
                        {con.itemName}
                      </span>
                      <span
                        className={`font-bold tabular-nums ${
                          isDueSoon ? 'text-amber-600 dark:text-amber-400' : 'text-[#059669]'
                        }`}
                      >
                        {remainingKm <= 0
                          ? `已超標 ${Math.abs(remainingKm).toLocaleString()} km`
                          : `剩 ${remainingKm.toLocaleString()} km`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#EAEDF2] dark:bg-[#262C36] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isDueSoon ? 'bg-amber-500' : 'bg-[#2563EB]'
                        }`}
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-[#8B95A1] tabular-nums">
                      <span>上次：{con.lastReplacedMileage.toLocaleString()} km</span>
                      <span>
                        下次建議：{(con.lastReplacedMileage + interval).toLocaleString()} km
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 新增保養維修紀錄按鈕與表單 */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8] flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-[#2563EB]" />
              <span>歷史進廠保養與維修履歷</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddMaint(!showAddMaint)}
              className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>新增保養紀錄</span>
            </button>
          </div>

          {showAddMaint && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const costNum = Number(maintCost) || 0;
                const kmNum = Number(maintMileage) || activeVehicle.currentMileage;
                if (!maintShop || !maintItemsText) return;

                addVehicleMaintenanceLog(
                  activeVehicle.id,
                  {
                    date: maintDate,
                    mileage: kmNum,
                    category: 'regular',
                    shopName: maintShop,
                    items: [
                      {
                        name: maintItemsText,
                        cost: costNum,
                        updatesConsumableId: maintConsumableId || undefined,
                      },
                    ],
                    totalCost: costNum,
                    nextDueMileage: maintNextKm ? Number(maintNextKm) : kmNum + 5000,
                    nextDueDate: maintNextDate || undefined,
                    attachmentUrl: maintAttachment,
                  },
                  {
                    enabled: maintSyncLedger,
                    paymentSourceType: maintPayType,
                    paymentSourceId: maintPayId,
                  }
                );
                setMaintShop('');
                setMaintItemsText('');
                setMaintCost('');
                setMaintAttachment(undefined);
                setShowAddMaint(false);
              }}
              className="toss-card p-4 space-y-3"
            >
              <div className="text-xs font-bold">新增汽車保養 / 維修工單</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] text-[#8B95A1]">進廠日期</label>
                  <input
                    type="date"
                    required
                    value={maintDate}
                    onChange={(e) => setMaintDate(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">進廠里程 (km)</label>
                  <input
                    type="number"
                    required
                    value={maintMileage}
                    onChange={(e) => setMaintMileage(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">保養廠 / 車行名稱</label>
                  <input
                    type="text"
                    required
                    placeholder="例: 原廠濱江廠 / 金弘笙"
                    value={maintShop}
                    onChange={(e) => setMaintShop(e.target.value)}
                    className="toss-input"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-[#8B95A1]">更換項目與耗材明細</label>
                  <input
                    type="text"
                    required
                    placeholder="例: 0W-20機油 x4、機油芯、冷氣濾網"
                    value={maintItemsText}
                    onChange={(e) => setMaintItemsText(e.target.value)}
                    className="toss-input"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">保養總費用 (NT$)</label>
                  <input
                    type="number"
                    required
                    placeholder="總金額"
                    value={maintCost}
                    onChange={(e) => setMaintCost(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">同步重置耗材壽命</label>
                  <select
                    value={maintConsumableId}
                    onChange={(e) => setMaintConsumableId(e.target.value)}
                    className="toss-input"
                  >
                    <option value="">不重置特定耗材</option>
                    {activeVehicle.consumables.map((c) => (
                      <option key={c.id} value={c.id}>
                        重置：{c.itemName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">下次建議保養里程</label>
                  <input
                    type="number"
                    placeholder="例: 55000"
                    value={maintNextKm}
                    onChange={(e) => setMaintNextKm(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">下次預約保養日 (連動行事曆)</label>
                  <input
                    type="date"
                    value={maintNextDate}
                    onChange={(e) => setMaintNextDate(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
              </div>

              <AttachmentPicker
                value={maintAttachment}
                onChange={setMaintAttachment}
                folder="vehicle"
                label="維修保養工單照片 (選填)"
              />

              {/* 跨模組同步記帳開關 */}
              <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={maintSyncLedger}
                    onChange={(e) => setMaintSyncLedger(e.target.checked)}
                  />
                  <span>同步寫入一筆「汽車保養維修」記帳支出並扣減帳戶/信用卡額度</span>
                </label>
                {maintSyncLedger && (
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={maintPayType}
                      onChange={(e) => {
                        const t = e.target.value as PaymentSourceType;
                        setMaintPayType(t);
                        setMaintPayId(
                          t === 'credit_card'
                            ? creditCards[0]?.id || ''
                            : assetAccounts[0]?.id || ''
                        );
                      }}
                      className="toss-input text-xs"
                    >
                      <option value="credit_card">刷信用卡</option>
                      <option value="account">銀行/現金扣款</option>
                    </select>
                    <select
                      value={maintPayId}
                      onChange={(e) => setMaintPayId(e.target.value)}
                      className="toss-input text-xs"
                    >
                      {maintPayType === 'credit_card'
                        ? creditCards.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.bankName} {c.cardName}
                            </option>
                          ))
                        : assetAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
              >
                儲存保養紀錄
              </button>
            </form>
          )}

          {/* 保養歷史列表 */}
          <div className="space-y-3">
            {activeVehicle.logs.map((log) => (
              <div key={log.id} className="toss-card p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8] tabular-nums">
                      {log.date} · {log.mileage.toLocaleString()} km 定保/維修
                    </div>
                    <div className="text-xs text-[#8B95A1]">{log.shopName}</div>
                  </div>
                  <div className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8] tabular-nums">
                    NT$ {log.totalCost.toLocaleString()}
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  {log.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-xs text-[#4E5968] dark:text-[#9BA4B0] tabular-nums"
                    >
                      <span>• {item.name}</span>
                      <span>${item.cost.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {(log.nextDueMileage || log.nextDueDate || log.attachmentUrl || log.notes) && (
                  <div className="pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8B95A1] tabular-nums">
                    <div>
                      {log.nextDueMileage
                        ? `下次建議里程：${log.nextDueMileage.toLocaleString()} km `
                        : ''}
                      {log.nextDueDate ? `· 下次預定日：${log.nextDueDate}` : ''}
                      {log.notes ? ` · ${log.notes}` : ''}
                    </div>
                    {log.attachmentUrl && (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(log.attachmentUrl || null)}
                        className="text-[#2563EB] font-semibold flex items-center gap-1"
                      >
                        <span>📎 查看工單照片</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
            </>
          )}
        </div>
      )}

      {/* =======================================================
          2. 保險保單管理中心
         ======================================================= */}
      {subTab === 'insurance' && (
        <div className="space-y-4">
          <div className="toss-card p-4 flex items-center justify-between">
            <div className="tabular-nums">
              <div className="text-xs text-[#8B95A1]">有效保單總數 / 儲蓄險保價金總計</div>
              <div className="text-lg font-bold text-[#191F28] dark:text-[#F2F4F8]">
                {insurancePolicies.length} 張有效保單 · 保價金 NT${' '}
                {insurancePolicies
                  .reduce((s, p) => s + (p.estimatedCashValue || 0), 0)
                  .toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddPolicy(!showAddPolicy)}
              className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>新增保單</span>
            </button>
          </div>

          {showAddPolicy && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!insurerName || !policyName) return;
                const sourceName =
                  polPayType === 'credit_card'
                    ? creditCards.find((c) => c.id === polPayId)?.cardName || '信用卡'
                    : assetAccounts.find((a) => a.id === polPayId)?.name || '銀行帳戶';

                upsertInsurancePolicy(
                  {
                    id: `pol-${Date.now()}`,
                    insurerName,
                    policyName,
                    policyNumber: policyNumber || undefined,
                    category: polCategory,
                    insuredPerson,
                    premiumAmount: Number(premiumAmount) || 0,
                    paymentCycle,
                    nextPaymentDate: nextPayDate,
                    startYear: new Date().getFullYear() - (Number(paidYears) || 1),
                    totalPaymentYears: Number(totalYears) || 20,
                    paidYears: Number(paidYears) || 1,
                    paymentSourceType: polPayType,
                    paymentSourceId: polPayId,
                    paymentSourceName: sourceName,
                    includeInNetWorth: includeNetWorth,
                    estimatedCashValue: cashValue ? Number(cashValue) : undefined,
                    coverageSummary: coverageSummary || undefined,
                    attachmentUrl: polAttachment,
                    isActive: true,
                  },
                  { enabled: polSyncNow }
                );
                setInsurerName('');
                setPolicyName('');
                setShowAddPolicy(false);
              }}
              className="toss-card p-4 space-y-3"
            >
              <div className="text-xs font-bold">新增保險保單紀錄</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="保險公司 (例: 富邦人壽)"
                  value={insurerName}
                  onChange={(e) => setInsurerName(e.target.value)}
                  className="toss-input"
                />
                <input
                  type="text"
                  required
                  placeholder="主約/險種名稱"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  className="toss-input col-span-2"
                />
                <input
                  type="text"
                  placeholder="保單號碼 (選填)"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  className="toss-input font-mono"
                />
                <select
                  value={polCategory}
                  onChange={(e) => setPolCategory(e.target.value as InsuranceCategory)}
                  className="toss-input"
                >
                  <option value="medical">醫療實支 / 住院險</option>
                  <option value="cancer_critical">重大傷病 / 癌症險</option>
                  <option value="accident">意外險</option>
                  <option value="savings_invest">儲蓄險 / 利變壽險</option>
                  <option value="life">定期/終身壽險</option>
                  <option value="car_property">汽車險 / 產險</option>
                </select>
                <input
                  type="text"
                  placeholder="被保險人 (例: 本人)"
                  value={insuredPerson}
                  onChange={(e) => setInsuredPerson(e.target.value)}
                  className="toss-input"
                />
                <div>
                  <label className="text-[11px] text-[#8B95A1]">每期保費 (NT$)</label>
                  <input
                    type="number"
                    required
                    value={premiumAmount}
                    onChange={(e) => setPremiumAmount(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">繳別</label>
                  <select
                    value={paymentCycle}
                    onChange={(e) => setPaymentCycle(e.target.value as PolicyPaymentCycle)}
                    className="toss-input"
                  >
                    <option value="annual">年繳</option>
                    <option value="semi_annual">半年繳</option>
                    <option value="quarterly">季繳</option>
                    <option value="monthly">月繳</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">下次應繳日期 (連動行事曆)</label>
                  <input
                    type="date"
                    value={nextPayDate}
                    onChange={(e) => setNextPayDate(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">已繳年期</label>
                  <input
                    type="number"
                    value={paidYears}
                    onChange={(e) => setPaidYears(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">總繳費年期</label>
                  <input
                    type="number"
                    value={totalYears}
                    onChange={(e) => setTotalYears(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">扣款來源</label>
                  <select
                    value={polPayType}
                    onChange={(e) => {
                      const t = e.target.value as PaymentSourceType;
                      setPolPayType(t);
                      setPolPayId(
                        t === 'credit_card'
                          ? creditCards[0]?.id || ''
                          : assetAccounts[0]?.id || ''
                      );
                    }}
                    className="toss-input"
                  >
                    <option value="credit_card">信用卡扣繳</option>
                    <option value="account">銀行帳戶扣繳</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    placeholder="保障內容摘要 (例: 實支實付雜費 20萬、住院日額 3,000)"
                    value={coverageSummary}
                    onChange={(e) => setCoverageSummary(e.target.value)}
                    className="toss-input"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={includeNetWorth}
                    onChange={(e) => setIncludeNetWorth(e.target.checked)}
                  />
                  <span>儲蓄險保價金計入個人總資產</span>
                </label>
                {includeNetWorth && (
                  <input
                    type="number"
                    placeholder="目前累積保價金 (NT$)"
                    value={cashValue}
                    onChange={(e) => setCashValue(e.target.value)}
                    className="toss-input w-44 py-1.5 tabular-nums"
                  />
                )}
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={polSyncNow}
                    onChange={(e) => setPolSyncNow(e.target.checked)}
                  />
                  <span>同時記一筆本期保費支出</span>
                </label>
              </div>

              <AttachmentPicker
                value={polAttachment}
                onChange={setPolAttachment}
                folder="insurance"
                label="保單首頁 / 保障條款照片附件 (選填)"
              />

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
              >
                儲存保單檔案
              </button>
            </form>
          )}

          <div className="space-y-3">
            {insurancePolicies.map((pol) => {
              const pct = Math.min(
                100,
                Math.round((pol.paidYears / Math.max(1, pol.totalPaymentYears)) * 100)
              );
              return (
                <div key={pol.id} className="toss-card p-4 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          {pol.insurerName} · {pol.policyName}
                        </div>
                        <div className="text-[11px] text-[#8B95A1] tabular-nums">
                          被保人：{pol.insuredPerson}
                          {pol.policyNumber ? ` · 保單號 ${pol.policyNumber}` : ''} · 扣款：
                          {pol.paymentSourceName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right tabular-nums">
                        <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          NT$ {pol.premiumAmount.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-[#8B95A1]">
                          下次繳費 {pol.nextPaymentDate}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteInsurancePolicy(pol.id)}
                        className="p-1 text-[#8B95A1] hover:text-[#F04452]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {pol.coverageSummary && (
                    <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] text-xs text-[#4E5968] dark:text-[#9BA4B0]">
                      保障重點：{pol.coverageSummary}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[#8B95A1] tabular-nums">
                      <span>
                        繳費進度：{pol.paidYears} / {pol.totalPaymentYears} 年 ({pct}%)
                      </span>
                      {pol.includeInNetWorth && pol.estimatedCashValue ? (
                        <span className="font-semibold text-[#059669]">
                          保價金現值 NT$ {pol.estimatedCashValue.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#F0F2F6] dark:bg-[#1F2631] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#2563EB]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {(pol.agentName || pol.attachmentUrl) && (
                    <div className="pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] flex items-center justify-between text-[11px] text-[#8B95A1]">
                      <div className="flex items-center gap-2">
                        {pol.agentName && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            業務：{pol.agentName} {pol.agentPhone || ''}
                          </span>
                        )}
                      </div>
                      {pol.attachmentUrl && (
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(pol.attachmentUrl || null)}
                          className="text-[#2563EB] font-semibold flex items-center gap-1"
                        >
                          <span>📎 查看保單照片</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =======================================================
          3. 醫療回診紀錄與慢性病連續處方箋領藥追蹤
         ======================================================= */}
      {subTab === 'medical' && (
        <div className="space-y-4">
          <div className="toss-card p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-[#8B95A1]">
                管理門診紀錄、下次回診預約提醒與慢性病處方箋領藥日期
              </div>
              <div className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8] tabular-nums">
                共 {medicalRecords.length} 筆就診與回診追蹤紀錄
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddMed(!showAddMed)}
              className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>新增看診/回診</span>
            </button>
          </div>

          {showAddMed && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!hospitalName || !department || !diagnosisSummary) return;

                upsertMedicalRecord(
                  {
                    id: `med-${Date.now()}`,
                    visitDate,
                    hospitalName,
                    department,
                    doctorName: doctorName || undefined,
                    diagnosisSummary,
                    doctorAdvice: doctorAdvice || undefined,
                    cost: Number(medCost) || 0,
                    nextAppointmentDate: nextApptDate || undefined,
                    nextAppointmentTime: nextApptDate ? nextApptTime : undefined,
                    appointmentNumber: apptNumber || undefined,
                    hasChronicPrescription: hasChronic,
                    refill2StartDate: hasChronic && refill2Date ? refill2Date : undefined,
                    refill3StartDate: hasChronic && refill3Date ? refill3Date : undefined,
                    attachmentUrl: medAttachment,
                  },
                  {
                    enabled: medSyncLedger,
                    paymentSourceType: medPayType,
                    paymentSourceId: medPayId,
                  }
                );
                setHospitalName('');
                setDepartment('');
                setDiagnosisSummary('');
                setMedAttachment(undefined);
                setShowAddMed(false);
              }}
              className="toss-card p-4 space-y-3"
            >
              <div className="text-xs font-bold">新增看診紀錄與下次回診提醒</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] text-[#8B95A1]">本次看診日期</label>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">醫院 / 診所名稱</label>
                  <input
                    type="text"
                    required
                    placeholder="例: 台大醫院 / 書田診所"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    className="toss-input"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">看診科別</label>
                  <input
                    type="text"
                    required
                    placeholder="例: 牙科 / 家醫科"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="toss-input"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">主治醫師</label>
                  <input
                    type="text"
                    placeholder="醫師姓名 (選填)"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="toss-input"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">掛號 + 自費金額 (NT$)</label>
                  <input
                    type="number"
                    placeholder="費用"
                    value={medCost}
                    onChange={(e) => setMedCost(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1]">下次回診日期 (自動入行事曆)</label>
                  <input
                    type="date"
                    value={nextApptDate}
                    onChange={(e) => setNextApptDate(e.target.value)}
                    className="toss-input tabular-nums"
                  />
                </div>
                {nextApptDate && (
                  <>
                    <div>
                      <label className="text-[11px] text-[#8B95A1]">回診時間</label>
                      <input
                        type="time"
                        value={nextApptTime}
                        onChange={(e) => setNextApptTime(e.target.value)}
                        className="toss-input tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#8B95A1]">預約診號</label>
                      <input
                        type="text"
                        placeholder="例: 16 號"
                        value={apptNumber}
                        onChange={(e) => setApptNumber(e.target.value)}
                        className="toss-input"
                      />
                    </div>
                  </>
                )}
                <div className="col-span-2 sm:col-span-3">
                  <label className="text-[11px] text-[#8B95A1]">診斷摘要</label>
                  <input
                    type="text"
                    required
                    placeholder="例: 定期洗牙、年度血脂檢查..."
                    value={diagnosisSummary}
                    onChange={(e) => setDiagnosisSummary(e.target.value)}
                    className="toss-input"
                  />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <label className="text-[11px] text-[#8B95A1]">醫囑與回診前注意事項</label>
                  <input
                    type="text"
                    placeholder="例: 下次回診前需空腹 8 小時抽血"
                    value={doctorAdvice}
                    onChange={(e) => setDoctorAdvice(e.target.value)}
                    className="toss-input"
                  />
                </div>
              </div>

              {/* 慢性病連續處方箋設定 */}
              <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={hasChronic}
                    onChange={(e) => setHasChronic(e.target.checked)}
                  />
                  <span>含有慢性病連續處方箋 (自動加入第 2、3 次領藥行事曆提醒)</span>
                </label>
                {hasChronic && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-[#8B95A1]">第 2 次領藥起始日</label>
                      <input
                        type="date"
                        value={refill2Date}
                        onChange={(e) => setRefill2Date(e.target.value)}
                        className="toss-input tabular-nums text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#8B95A1]">第 3 次領藥起始日</label>
                      <input
                        type="date"
                        value={refill3Date}
                        onChange={(e) => setRefill3Date(e.target.value)}
                        className="toss-input tabular-nums text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <AttachmentPicker
                value={medAttachment}
                onChange={setMedAttachment}
                folder="medical"
                label="醫療收據 / 藥單 / 檢查報告照片 (理賠與備查用)"
              />

              <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={medSyncLedger}
                    onChange={(e) => setMedSyncLedger(e.target.checked)}
                  />
                  <span>同步寫入一筆「醫療保健」記帳支出</span>
                </label>
                {medSyncLedger && (
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={medPayType}
                      onChange={(e) => {
                        const t = e.target.value as PaymentSourceType;
                        setMedPayType(t);
                        setMedPayId(
                          t === 'account'
                            ? assetAccounts[0]?.id || ''
                            : creditCards[0]?.id || ''
                        );
                      }}
                      className="toss-input text-xs"
                    >
                      <option value="account">現金 / 銀行帳戶</option>
                      <option value="credit_card">刷信用卡</option>
                    </select>
                    <select
                      value={medPayId}
                      onChange={(e) => setMedPayId(e.target.value)}
                      className="toss-input text-xs"
                    >
                      {medPayType === 'account'
                        ? assetAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))
                        : creditCards.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.bankName} {c.cardName}
                            </option>
                          ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
              >
                儲存看診與回診紀錄
              </button>
            </form>
          )}

          <div className="space-y-3">
            {medicalRecords.map((med) => (
              <div key={med.id} className="toss-card p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <HeartPulse className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                        {med.hospitalName} · {med.department}{' '}
                        {med.doctorName ? (
                          <span className="text-xs font-normal text-[#8B95A1]">
                            ({med.doctorName} 醫師)
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-[#8B95A1] tabular-nums">
                        看診日期：{med.visitDate} · 費用 NT$ {med.cost.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteMedicalRecord(med.id)}
                    className="p-1 text-[#8B95A1] hover:text-[#F04452]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-[#191F28] dark:text-[#F2F4F8] font-medium">
                  診斷：{med.diagnosisSummary}
                </div>

                {med.doctorAdvice && (
                  <div className="p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] text-xs text-[#4E5968] dark:text-[#9BA4B0]">
                    💡 醫囑與備忘：{med.doctorAdvice}
                  </div>
                )}

                {(med.nextAppointmentDate || med.hasChronicPrescription || med.attachmentUrl) && (
                  <div className="pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                    <div className="space-y-1">
                      {med.nextAppointmentDate && (
                        <div className="font-bold text-rose-600 dark:text-rose-400">
                          📅 下次回診：{med.nextAppointmentDate}{' '}
                          {med.nextAppointmentTime || ''}{' '}
                          {med.appointmentNumber ? `(${med.appointmentNumber})` : ''}
                        </div>
                      )}
                      {med.hasChronicPrescription && (
                        <div className="text-[11px] text-[#4E5968] dark:text-[#9BA4B0]">
                          💊 慢箋領藥：
                          {med.refill2StartDate ? `第2次 ${med.refill2StartDate} ` : ''}
                          {med.refill3StartDate ? `· 第3次 ${med.refill3StartDate}` : ''}
                        </div>
                      )}
                    </div>

                    {med.attachmentUrl && (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(med.attachmentUrl || null)}
                        className="text-[#2563EB] font-semibold flex items-center gap-1 text-xs"
                      >
                        <span>📎 查看收據/藥單</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 車輛建立與編輯彈跳視窗 */}
      {showVehicleModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowVehicleModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#161B22] rounded-2xl border border-[#EAEDF2] dark:border-[#262C36] p-5 max-h-[90vh] overflow-y-auto shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#EAEDF2] dark:border-[#262C36] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8]">
                  {editingVehicleId ? '編輯愛車資訊' : '新增愛車 (汽/機/電動車)'}
                </h3>
                <p className="text-xs text-[#8B95A1]">
                  設定車型、車牌號碼與目前里程，系統將自動啟動零件耗材更換週期監控
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVehicleModal(false)}
                className="p-1.5 rounded-lg text-[#8B95A1] hover:bg-[#F0F2F6] dark:hover:bg-[#1F2631]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="space-y-4">
              {/* 車型選擇 */}
              <div>
                <label className="block text-xs font-bold text-[#4E5968] dark:text-[#9BA4B0] mb-2">
                  選擇車型種類 (影響保養耗材規則推算)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { type: 'suv', label: '休旅車 SUV', emoji: '🚙' },
                      { type: 'sedan', label: '轎車 / 掀背', emoji: '🚗' },
                      { type: 'electric', label: '純電動車 EV', emoji: '⚡' },
                      { type: 'scooter', label: '普通重型機車', emoji: '🛵' },
                      { type: 'heavy_motor', label: '大型重機(紅/黃)', emoji: '🏍️' },
                      { type: 'mpv', label: '廂型 / MPV', emoji: '🚐' },
                      { type: 'truck', label: '貨車 / 其他', emoji: '🚚' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setVehType(opt.type)}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                        vehType === opt.type
                          ? 'border-[#2563EB] bg-blue-50/60 dark:bg-blue-950/40 text-[#2563EB] font-bold shadow-2xs'
                          : 'border-[#EAEDF2] dark:border-[#262C36] text-[#4E5968] dark:text-[#9BA4B0] hover:bg-[#F6F7F9] dark:hover:bg-[#1F2631]'
                      }`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="text-[11px]">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 車牌號碼 & 車輛自訂名稱 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#191F28] dark:text-[#F2F4F8] mb-1">
                    車牌號碼 <span className="text-[#F04452]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={vehPlate}
                    onChange={(e) => setVehPlate(e.target.value.toUpperCase())}
                    placeholder="例: ABC-8899 或 MMB-1234"
                    className="toss-input font-mono uppercase font-bold tracking-wider"
                  />
                  <span className="text-[10px] text-[#8B95A1] mt-0.5 block">
                    輸入完整車牌 (含英文字母與連字號)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#191F28] dark:text-[#F2F4F8] mb-1">
                    車輛自訂暱稱 <span className="text-[#F04452]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={vehName}
                    onChange={(e) => setVehName(e.target.value)}
                    placeholder="例: 小紅 RAV4、家庭用車、通勤勁戰"
                    className="toss-input"
                  />
                </div>
              </div>

              {/* 廠牌 & 車款型號 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8B95A1] mb-1">廠牌 (Brand)</label>
                  <input
                    type="text"
                    value={vehBrand}
                    onChange={(e) => setVehBrand(e.target.value)}
                    placeholder="例: Toyota, SYM, Tesla"
                    className="toss-input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8B95A1] mb-1">車款型號 (Model)</label>
                  <input
                    type="text"
                    value={vehModel}
                    onChange={(e) => setVehModel(e.target.value)}
                    placeholder="例: RAV4 Hybrid 2.5, Model Y"
                    className="toss-input"
                  />
                </div>
              </div>

              {/* 目前里程 & 排氣量 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#191F28] dark:text-[#F2F4F8] mb-1">
                    目前行駛總里程 (km)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={vehMileage}
                    onChange={(e) => setVehMileage(e.target.value)}
                    placeholder="例: 50000"
                    className="toss-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8B95A1] mb-1">
                    排氣量 (cc) / 馬力 (電動車免填)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={vehCc}
                    onChange={(e) => setVehCc(e.target.value)}
                    placeholder="例: 1987 (機車例: 158)"
                    className="toss-input tabular-nums"
                  />
                </div>
              </div>

              {/* 下次驗車日 & 車險到期日 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8B95A1] mb-1">下次定檢/驗車日</label>
                  <input
                    type="date"
                    value={vehNextInsp}
                    onChange={(e) => setVehNextInsp(e.target.value)}
                    className="toss-input tabular-nums text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8B95A1] mb-1">車險/強制險到期日</label>
                  <input
                    type="date"
                    value={vehInsurExp}
                    onChange={(e) => setVehInsurExp(e.target.value)}
                    className="toss-input tabular-nums text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#EAEDF2] dark:border-[#262C36] text-xs font-semibold hover:bg-[#F6F7F9] dark:hover:bg-[#1F2631]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold"
                >
                  {editingVehicleId ? '儲存變更' : '建立車輛並套用保養監控'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 單據照片放大燈箱 */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="max-w-2xl w-full bg-white dark:bg-[#161B22] rounded-2xl overflow-hidden p-3">
            <img
              src={lightboxUrl}
              alt="單據原圖"
              className="max-h-[80vh] w-auto mx-auto object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};
