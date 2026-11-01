import React, { useState } from 'react';
import { CloudDownload, CloudUpload, Copy, Download, Moon, Sun, Upload, X } from 'lucide-react';
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
    exportVaultJson,
    importVaultJson,
  } = useVault();

  const [statusMessage, setStatusMessage] = useState<string>('');
  const [importText, setImportText] = useState<string>('');

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
              支援 Supabase 雲端雙向備份、深淺色外觀與離線 JSON 匯出
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
