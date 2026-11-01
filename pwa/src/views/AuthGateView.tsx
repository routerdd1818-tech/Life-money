import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { BrandLogo } from '../components/BrandLogo';

export const AuthGateView: React.FC = () => {
  const { signInWithEmail, signUpWithEmail } = useVault();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setFeedback({ ok: false, msg: '請輸入電子郵件與密碼' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      if (authMode === 'signin') {
        const res = await signInWithEmail(email.trim(), password.trim());
        setFeedback({ ok: res.ok, msg: res.message });
      } else {
        const res = await signUpWithEmail(
          email.trim(),
          password.trim(),
          displayName.trim() || undefined
        );
        setFeedback({ ok: res.ok, msg: res.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await signInWithEmail('demo@financelife.app', 'demo123456');
      setFeedback({ ok: res.ok, msg: res.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0E1116] flex flex-col justify-center items-center px-4 py-8 text-[#191F28] dark:text-[#F2F4F8]">
      {/* 登入卡片主容器 */}
      <div className="w-full max-w-md toss-card p-6 sm:p-8 space-y-6 shadow-xl border border-[#EAEDF2] dark:border-[#262C36] animate-fade-in">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <BrandLogo className="w-14 h-14 rounded-2xl shadow-md" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#191F28] dark:text-[#F2F4F8]">
            FinanceLife 財務與生活金庫
          </h1>
          <p className="text-xs text-[#8B95A1] max-w-xs mx-auto">
            個人淨資產總覽 · 信用卡分期雙軌 · 智慧同業估值定價 · 生活保養管家
          </p>

          <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-[#2563EB] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>端到端加密金庫 · 存取需完成身分驗證</span>
          </div>
        </div>

        {/* 登入 / 註冊 切換 Tab */}
        <div className="flex items-center p-1 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631]">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setFeedback(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              authMode === 'signin'
                ? 'bg-white dark:bg-[#161B22] text-[#2563EB] shadow-xs'
                : 'text-[#4E5968] dark:text-[#9BA4B0] hover:text-[#191F28]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>登入金庫</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setFeedback(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              authMode === 'signup'
                ? 'bg-white dark:bg-[#161B22] text-[#2563EB] shadow-xs'
                : 'text-[#4E5968] dark:text-[#9BA4B0] hover:text-[#191F28]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>註冊新帳號</span>
          </button>
        </div>

        {/* 回饋提示訊息 */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium border flex items-start gap-2 ${
              feedback.ok
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
            }`}
          >
            <div className="shrink-0 mt-0.5 font-bold">
              {feedback.ok ? '✓' : '✕'}
            </div>
            <div>{feedback.msg}</div>
          </div>
        )}

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {authMode === 'signup' && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#4E5968] dark:text-[#9BA4B0]">
                顯示名稱 / 暱稱
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例: 王小明、投資金庫"
                  className="toss-input pl-9 text-xs"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#4E5968] dark:text-[#9BA4B0]">
              電子郵件 (Email)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="toss-input pl-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#4E5968] dark:text-[#9BA4B0]">
              帳號密碼
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼 (至少 6 位)"
                className="toss-input pl-9 pr-9 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{authMode === 'signin' ? '登入金庫' : '立即註冊並進入'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 示範帳號一鍵體驗 */}
        <div className="pt-2 border-t border-[#EAEDF2] dark:border-[#262C36] text-center space-y-2">
          <div className="text-[11px] text-[#8B95A1]">
            尚未註冊或想直接體驗功能？
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleDemoSignIn}
            className="w-full py-2.5 px-3 rounded-xl bg-[#F0F2F6] dark:bg-[#1F2631] hover:bg-gray-200 dark:hover:bg-gray-800 text-[#191F28] dark:text-[#F2F4F8] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>以示範帳號一鍵登入 (Demo Account)</span>
          </button>
        </div>

        {/* 底部隱私與安全說明 */}
        <div className="text-center text-[10px] text-[#8B95A1] pt-1">
          登入後所有記帳、資產與生活隱私資料皆透過專屬身分隔離保護
        </div>
      </div>
    </div>
  );
};
