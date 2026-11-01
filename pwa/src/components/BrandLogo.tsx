import React from 'react';

interface BrandLogoProps {
  className?: string;
}

/**
 * FinanceLife 金庫盾牌 × 量化階梯動能 專屬向量識別圖標
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({ className = 'w-8 h-8' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      className={`${className} shrink-0 select-none`}
      aria-label="FinanceLife Logo"
    >
      <defs>
        <linearGradient id="flBg" x1="64" y1="32" x2="448" y2="480" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="48%" stopColor="#1E3A8A" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="flShield" x1="120" y1="88" x2="392" y2="424" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="flGlass" x1="140" y1="100" x2="372" y2="412" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.96" />
        </linearGradient>
        <linearGradient id="flBar1" x1="176" y1="268" x2="176" y2="348" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="flBar2" x1="244" y1="224" x2="244" y2="348" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="flBar3" x1="312" y1="168" x2="312" y2="348" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
      </defs>

      <rect width="512" height="512" rx="116" fill="url(#flBg)" />
      <path
        d="M256 80L392 134V254C392 340.5 334.2 407.2 256 432C177.8 407.2 120 340.5 120 254V134L256 80Z"
        fill="url(#flGlass)"
        stroke="url(#flShield)"
        strokeWidth="10"
        strokeLinejoin="round"
      />
      <rect x="172" y="264" width="38" height="86" rx="10" fill="url(#flBar1)" />
      <rect x="237" y="214" width="38" height="136" rx="10" fill="url(#flBar2)" />
      <rect x="302" y="162" width="38" height="188" rx="10" fill="url(#flBar3)" />
      <path
        d="M166 236L230 190L270 210L346 134"
        stroke="#34D399"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M308 134H346V172"
        stroke="#34D399"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
