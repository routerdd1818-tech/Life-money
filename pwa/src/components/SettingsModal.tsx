import React, { useState } from 'react';
import {
  Check,
  Clock,
  CloudDownload,
  CloudUpload,
  Copy,
  Download,
  KeyRound,
  LogOut,
  Moon,
  RefreshCw,
  Sun,
  Upload,
  User,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    updateSettings,
    syncToCloud,
    restoreFromCloud,
    isCloudSyncing,
    isQuoteSyncing,
    refreshQuotes,
    exchangeRateUsdTwd,
    exchangeRates,
    exportVaultJson,
    importVaultJson,
    currentUser,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  } = useVault();

  const [statusMessage, setStatusMessage] = useState<string>('');
  const [importText, setImportText] = useState<string>('');

  // 帳號密碼登錄與切換狀態
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showSwitchForm, setShowSwitchForm] = useState(false);

  if (!isOpen) return null;

  const handleCloudUpload = async () => {
    setStatusMessage('正在同步至 Supabase 雲端...');
    const res = await syncToCloud();
    setStatusMessage(res.message);
  };

  const handleCloudRestore = async () => {
    setStatusMessage('正在從 Supabase 讀取備份...');
    const res = await restoreFromCloud();
    setStatusMessage(res.message);
  };

  const handleDownloadJson = () => {
    const json = exportVaultJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financelife-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) return;

    setAuthLoading(true);
    setAuthFeedback(null);

    if (authMode === 'signin') {
      const res = await signInWithEmail(authEmail.trim(), authPassword.trim());
      setAuthLoading(false);
      setAuthFeedback({ ok: res.ok, msg: res.message });
      if (res.ok) {
        setShowSwitchForm(false);
        setAuthPassword('');
      }
    } else {
      const res = await signUpWithEmail(
        authEmail.trim(),
        authPassword.trim(),
        authDisplayName.trim() || undefined
      );
      setAuthLoading(false);
      setAuthFeedback({ ok: res.ok, msg: res.message });
      if (res.ok) {
        setShowSwitchForm(false);
        setAuthPassword('');
      }
    }
  };

  const handleSignOut = async () => {
    if (confirm('確定要登出目前帳號嗎？登出後將切換為訪客獨立金庫。')) {
      await signOut();
      setShowSwitchForm(true);
      setAuthFeedback({ ok: true, msg: '已安全登出' });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#161B22] rounded-2xl border border-[#EAEDF2] dark:border-[#262C36] p-5 max-h-[90vh] overflow-y-auto shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#EAEDF2] dark:border-[#262C36] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8]">
              雲端同步與金庫設定
            </h3>
            <p className="text-xs text-[#8B95A1]">
              多使用者帳密登錄、Supabase 雙向備份與深淺色主題管理
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8B95A1] hover:bg-[#F0F2F6] dark:hover:bg-[#1F2631]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================
            1. 帳號密碼登錄 / 註冊 / 多使用者身分管理
           ======================================================== */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/70 to-indigo-50/40 dark:from-blue-950/30 dark:to-[#161B22] border border-blue-100 dark:border-blue-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#2563EB]" />
              <span className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                使用者身分與帳戶權限
              </span>
            </div>
            {currentUser && !showSwitchForm && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                <Check className="w-3 h-3" />
                已登錄
              </span>
            )}
          </div>

          {currentUser && !showSwitchForm ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-white dark:bg-[#1F2631] p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm">
                    {(currentUser.displayName || currentUser.username || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                      {currentUser.displayName || currentUser.username}
                    </div>
                    <div className="text-[11px] text-[#8B95A1] font-mono">
                      {currentUser.email}
                    </div>
                  </div>
                </div>

                <div className="text-right tabular-nums">
                  <div className="text-[10px] text-[#8B95A1]">專屬金庫識別碼</div>
                  <div className="text-xs font-mono font-bold text-[#2563EB]">
                    {settings.vaultKey}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSwitchForm(true)}
                  className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-[#1F2631] border border-[#EAEDF2] dark:border-[#262C36] text-xs font-semibold text-[#4E5968] dark:text-[#9BA4B0] hover:text-[#191F28]"
                >
                  切換其他帳號
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 flex items-center gap-1 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>登出</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center p-1 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthFeedback(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    authMode === 'signin'
                      ? 'bg-white dark:bg-[#161B22] text-[#2563EB] shadow-2xs font-bold'
                      : 'text-[#4E5968] dark:text-[#9BA4B0]'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>登入帳號</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthFeedback(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    authMode === 'signup'
                      ? 'bg-white dark:bg-[#161B22] text-[#2563EB] shadow-2xs font-bold'
                      : 'text-[#4E5968] dark:text-[#9BA4B0]'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>註冊新使用者</span>
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-2.5">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-[11px] text-[#8B95A1] mb-1">
                      顯示名稱 / 暱稱 (Display Name)
                    </label>
                    <input
                      type="text"
                      value={authDisplayName}
                      onChange={(e) => setAuthDisplayName(e.target.value)}
                      placeholder="例: 小明、爸爸的帳冊"
                      className="toss-input text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] text-[#8B95A1] mb-1">
                    電子郵件 (Email) <span className="text-[#F04452]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="toss-input text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#8B95A1] mb-1">
                    帳號密碼 (Password) <span className="text-[#F04452]">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="至少 6 位數密碼"
                    className="toss-input text-xs font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {currentUser && (
                    <button
                      type="button"
                      onClick={() => setShowSwitchForm(false)}
                      className="py-2 px-3 rounded-xl border border-[#EAEDF2] dark:border-[#262C36] text-xs font-semibold"
                    >
                      返回目前使用者
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="flex-1 py-2 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {authMode === 'signin' ? (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{authLoading ? '驗證登錄中...' : '登入並載入專屬金庫'}</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{authLoading ? '註冊中...' : '完成註冊並開通金庫'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {authFeedback && (
            <div
              className={`p-2.5 rounded-xl text-xs font-medium ${
                authFeedback.ok
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#059669]'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-[#F04452]'
              }`}
            >
              {authFeedback.msg}
            </div>
          )}
        </div>

        {/* 外觀主題 */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631]">
          <div>
            <div className="text-sm font-semibold">介面主題模式</div>
            <div className="text-xs text-[#8B95A1]">Toss 淺色帳冊 / 深邃石墨模式</div>
          </div>
          <button
            type="button"
            onClick={() =>
              updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
            }
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] text-xs font-semibold flex items-center gap-2"
          >
            {settings.theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>切換為淺色模式</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#2563EB]" />
                <span>切換為深色模式</span>
              </>
            )}
          </button>
        </div>

        {/* 即時行情與牌告匯率固定更新設定 */}
        <div className="space-y-3 p-3.5 rounded-2xl bg-[#F6F7F9] dark:bg-[#1F2631] border border-[#EAEDF2] dark:border-[#262C36]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#2563EB]" />
              <div className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                即時行情與牌告匯率自動更新設定
              </div>
            </div>
            <button
              type="button"
              disabled={isQuoteSyncing}
              onClick={() => void refreshQuotes()}
              className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-[#2563EB] text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isQuoteSyncing ? 'animate-spin' : ''}`} />
              <span>{isQuoteSyncing ? '更新中...' : '立即手動刷新'}</span>
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* 開啟 PWA / 切換前景時自動更新開關 */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36]">
              <div>
                <div className="font-semibold text-[#191F28] dark:text-[#F2F4F8]">
                  打開 PWA 或切換回前景時自動更新
                </div>
                <div className="text-[11px] text-[#8B95A1]">
                  每次重新開啟 App 或切換回畫面，自動拉取最新匯率與持股現價
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateSettings({
                    autoRefreshOnOpen: !(settings.autoRefreshOnOpen ?? true),
                  })
                }
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  (settings.autoRefreshOnOpen ?? true) ? 'bg-[#2563EB]' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    (settings.autoRefreshOnOpen ?? true) ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* 定時自動輪詢頻率下拉選單 */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36]">
              <div>
                <div className="font-semibold text-[#191F28] dark:text-[#F2F4F8]">
                  背景固定定時自動輪詢更新
                </div>
                <div className="text-[11px] text-[#8B95A1]">
                  在 App 開啟期間，每隔固定週期在背景自動更新匯率與報價
                </div>
              </div>
              <select
                value={settings.autoRefreshIntervalMinutes ?? 5}
                onChange={(e) =>
                  updateSettings({
                    autoRefreshIntervalMinutes: Number(e.target.value),
                  })
                }
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-[#F6F7F9] dark:bg-[#1F2631] text-xs font-semibold text-[#191F28] dark:text-[#F2F4F8]"
              >
                <option value={0}>關閉定時 (僅手動/開App)</option>
                <option value={3}>每 3 分鐘</option>
                <option value={5}>每 5 分鐘 (推薦)</option>
                <option value={10}>每 10 分鐘</option>
                <option value={30}>每 30 分鐘</option>
              </select>
            </div>

            {/* 即時牌告匯率快速看板與最後更新時間 */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#8B95A1]">
                <span>即時牌告匯率 (以台幣計)：</span>
                <span className="tabular-nums">
                  最後更新：{settings.lastQuoteRefreshedAt ? new Date(settings.lastQuoteRefreshedAt).toLocaleTimeString('zh-TW') : '未更新'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center text-xs tabular-nums font-mono">
                <div className="p-1 rounded bg-gray-50 dark:bg-gray-800/60">
                  <div className="text-[10px] text-[#8B95A1]">USD</div>
                  <div className="font-bold">{exchangeRateUsdTwd.toFixed(2)}</div>
                </div>
                <div className="p-1 rounded bg-gray-50 dark:bg-gray-800/60">
                  <div className="text-[10px] text-[#8B95A1]">JPY</div>
                  <div className="font-bold">{(exchangeRates.JPY || 0.215).toFixed(4)}</div>
                </div>
                <div className="p-1 rounded bg-gray-50 dark:bg-gray-800/60">
                  <div className="text-[10px] text-[#8B95A1]">CNY</div>
                  <div className="font-bold">{(exchangeRates.CNY || 4.45).toFixed(2)}</div>
                </div>
                <div className="p-1 rounded bg-gray-50 dark:bg-gray-800/60">
                  <div className="text-[10px] text-[#8B95A1]">KRW</div>
                  <div className="font-bold">{(exchangeRates.KRW || 0.0235).toFixed(4)}</div>
                </div>
                <div className="p-1 rounded bg-gray-50 dark:bg-gray-800/60">
                  <div className="text-[10px] text-[#8B95A1]">VND</div>
                  <div className="font-bold">{(exchangeRates.VND || 0.00128).toFixed(5)}</div>
                </div>
              </div>
            </div>

            {/* FinMind 官方台股量化資料庫設定 */}
            <div className="p-3 rounded-xl bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#191F28] dark:text-[#F2F4F8] text-xs">
                    FinMind 官方台股量化 API 串接
                  </div>
                  <div className="text-[11px] text-[#8B95A1]">
                    整合台股日K線、三大法人每日買賣超明細與個股月營收 YoY
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-[#059669]">
                  {settings.finMindToken ? '會員 600次/h' : '免密 300次/h'}
                </span>
              </div>

              <div>
                <input
                  type="password"
                  value={settings.finMindToken || ''}
                  onChange={(e) => updateSettings({ finMindToken: e.target.value })}
                  placeholder="FinMind API Token (選填，不填亦可享每小時300次免費額度)"
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-[#F6F7F9] dark:bg-[#1F2631] text-xs font-mono text-[#191F28] dark:text-[#F2F4F8]"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#8B95A1]">
                <span>系統預設免 Token 即可開箱即用</span>
                <a
                  href="https://finmind.github.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2563EB] hover:underline"
                >
                  前往 FinMind 官方取得免費 Token ↗
                </a>
              </div>
            </div>

            {/* 富果 Fugle 官方開放行情 API 設定 (選填) */}
            <div className="p-3 rounded-xl bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#191F28] dark:text-[#F2F4F8] text-xs flex items-center gap-1.5">
                    <span>富果 Fugle 官方即時盤中行情專線</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-100 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300">
                      即時專線
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8B95A1]">
                    支援全台股即時盤中撮合價、五檔與量能；未填寫則自動走證交所 TWSE MIS + Yahoo 免費雙軌
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-[#2563EB]">
                  {settings.fugleApiKey ? '已啟用富果專線' : '走官方雙軌'}
                </span>
              </div>

              <div>
                <input
                  type="password"
                  value={settings.fugleApiKey || ''}
                  onChange={(e) => updateSettings({ fugleApiKey: e.target.value })}
                  placeholder="輸入富果 Fugle API Key (選填，享有官方穩定專線)"
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-[#F6F7F9] dark:bg-[#1F2631] text-xs font-mono text-[#191F28] dark:text-[#F2F4F8]"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#8B95A1]">
                <span>免費申請富果會員即可取得開放行情 API Key</span>
                <a
                  href="https://developer.fugle.tw/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2563EB] hover:underline"
                >
                  前往 Fugle 富果開發者中心申請 ↗
                </a>
              </div>
            </div>

            {/* Google Gemini AI 大語言模型設定 */}
            <div className="p-3 rounded-xl bg-white dark:bg-[#161B22] border border-[#EAEDF2] dark:border-[#262C36] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#191F28] dark:text-[#F2F4F8] text-xs flex items-center gap-1.5">
                    <span>Google Gemini AI 操盤手大模型</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      gemini-3.5-flash-lite
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8B95A1]">
                    結合個股籌碼、同業折溢價中位數與即時新聞，生成深度質化操盤觀點
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
                  {settings.geminiApiKey ? '已啟用' : '使用系統金鑰'}
                </span>
              </div>

              <div>
                <input
                  type="password"
                  value={settings.geminiApiKey || ''}
                  onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
                  placeholder="輸入 Google Gemini API Key (可使用個人免費金鑰)"
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-[#F6F7F9] dark:bg-[#1F2631] text-xs font-mono text-[#191F28] dark:text-[#F2F4F8]"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#8B95A1]">
                <span>系統已內建專屬 API Key，開箱即可自動生成</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2563EB] hover:underline"
                >
                  前往 Google AI Studio 申請免費 Key ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Supabase 設定 */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-[#4E5968] dark:text-[#9BA4B0]">
            Supabase 雲端資料庫連線設定
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#8B95A1] mb-1">金庫專屬通行碼 (Vault Key)</label>
              <input
                type="text"
                value={settings.vaultKey}
                onChange={(e) => updateSettings({ vaultKey: e.target.value })}
                placeholder="例: MY-VAULT-2026"
                className="toss-input font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8B95A1] mb-1">金庫顯示名稱</label>
              <input
                type="text"
                value={settings.ownerName}
                onChange={(e) => updateSettings({ ownerName: e.target.value })}
                className="toss-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#8B95A1] mb-1">Supabase Project URL</label>
            <input
              type="url"
              value={settings.supabaseUrl}
              onChange={(e) => updateSettings({ supabaseUrl: e.target.value })}
              placeholder="https://xxxx.supabase.co"
              className="toss-input font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs text-[#8B95A1] mb-1">Supabase Anon Public Key</label>
            <input
              type="password"
              value={settings.supabaseAnonKey}
              onChange={(e) => updateSettings({ supabaseAnonKey: e.target.value })}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              className="toss-input font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              disabled={isCloudSyncing}
              onClick={handleCloudUpload}
              className="py-2.5 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <CloudUpload className="w-4 h-4" />
              <span>上傳備份至 Supabase</span>
            </button>
            <button
              type="button"
              disabled={isCloudSyncing}
              onClick={handleCloudRestore}
              className="py-2.5 px-3 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631] hover:bg-[#E2E8F0] dark:hover:bg-[#2D3748] text-[#191F28] dark:text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <CloudDownload className="w-4 h-4" />
              <span>從 Supabase 還原資料</span>
            </button>
          </div>

          {settings.lastSyncedAt && (
            <div className="text-[11px] text-[#8B95A1] tabular-nums">
              上次雲端同步時間：{new Date(settings.lastSyncedAt).toLocaleString('zh-TW')}
            </div>
          )}

          {statusMessage && (
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-300 text-xs font-medium">
              {statusMessage}
            </div>
          )}
        </div>

        {/* 本地 JSON 匯出匯入 */}
        <div className="space-y-2.5 pt-2 border-t border-[#EAEDF2] dark:border-[#262C36]">
          <div className="text-xs font-bold text-[#4E5968] dark:text-[#9BA4B0]">
            離線 JSON 完整備份與還原
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownloadJson}
              className="flex-1 py-2 px-3 rounded-xl border border-[#EAEDF2] dark:border-[#262C36] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#F6F7F9] dark:hover:bg-[#1F2631]"
            >
              <Download className="w-4 h-4 text-[#2563EB]" />
              <span>下載完整 JSON 備份檔</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(exportVaultJson());
                setStatusMessage('已複製完整 JSON 至剪貼簿');
              }}
              className="py-2 px-3 rounded-xl border border-[#EAEDF2] dark:border-[#262C36] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#F6F7F9] dark:hover:bg-[#1F2631]"
            >
              <Copy className="w-4 h-4" />
              <span>複製 JSON</span>
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="貼上備份 JSON 內容以還原..."
              className="toss-input text-xs flex-1"
            />
            <button
              type="button"
              onClick={() => {
                if (!importText.trim()) return;
                const ok = importVaultJson(importText);
                setStatusMessage(ok ? '已成功從 JSON 還原所有資料！' : 'JSON 格式無效');
                if (ok) setImportText('');
              }}
              className="px-3.5 py-2 rounded-xl bg-[#191F28] dark:bg-white text-white dark:text-[#191F28] text-xs font-semibold flex items-center gap-1 shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>還原</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};