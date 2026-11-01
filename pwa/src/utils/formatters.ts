/**
 * 財務資料與時間顯示格式化共用工具
 */

/**
 * 將 ISO 時間字串格式化為「YYYY/MM/DD HH:mm」，精準至分鐘
 */
export function formatDataTimestamp(isoString?: string): string {
  const d = isoString ? new Date(isoString) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    const Y = now.getFullYear();
    const M = String(now.getMonth() + 1).padStart(2, '0');
    const D = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${Y}/${M}/${D} ${h}:${m}`;
  }
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${Y}/${M}/${D} ${h}:${m}`;
}

/**
 * 計算距離當前經過分鐘數，顯示人性化「X 分鐘前」或「剛剛」
 */
export function formatMinutesAgo(isoString?: string): string {
  if (!isoString) return '剛剛';
  try {
    const d = new Date(isoString);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin <= 0) return '剛剛';
    if (diffMin < 60) return `${diffMin} 分鐘前`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} 小時前`;
    return formatDataTimestamp(isoString);
  } catch {
    return '剛剛';
  }
}
