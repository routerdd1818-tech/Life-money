import { createClient } from '@supabase/supabase-js';
import { VaultSettings } from '../types';

/**
 * 擴充功能 #5：單據照片/附件 (汽車維修工單、保單首頁、醫療收據/處方箋) 壓縮與雲端上傳服務
 * 1. 先透過 HTML5 Canvas 將高解析度手機照片壓縮至最大邊長 1280px (JPEG 0.78)，體積縮小 85% 以上
 * 2. 若已配置 Supabase，上傳至 `vault-attachments` Bucket 並回傳 Public URL
 * 3. 若未配置或離線，直接回傳壓縮後之輕量 DataURL，確保離線 100% 可用
 */
export async function compressImageFile(file: File, maxDimension = 1280, quality = 0.78): Promise<{
  dataUrl: string;
  blob: Blob;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('無法讀取圖片檔案'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('圖片格式無法解析'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('瀏覽器 Canvas 初始化失敗'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('圖片壓縮失敗'));
              return;
            }
            resolve({ dataUrl, blob });
          },
          'image/jpeg',
          quality
        );
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function processAndUploadAttachment(
  file: File,
  settings: VaultSettings,
  folder: 'vehicle' | 'insurance' | 'medical' | 'receipt'
): Promise<string> {
  const { dataUrl, blob } = await compressImageFile(file);

  if (settings.supabaseUrl && settings.supabaseAnonKey) {
    try {
      const supabase = createClient(settings.supabaseUrl, settings.supabaseAnonKey);
      const fileName = `${settings.vaultKey || 'default'}/${folder}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}.jpg`;

      const { error } = await supabase.storage
        .from('vault-attachments')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (!error) {
        const { data } = supabase.storage.from('vault-attachments').getPublicUrl(fileName);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
      }
    } catch {
      // 網路異常或未建立 Bucket 時自動回退至壓縮 DataURL
    }
  }

  return dataUrl;
}
