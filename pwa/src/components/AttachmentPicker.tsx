import React, { useRef, useState } from 'react';
import { Camera, ExternalLink, Image as ImageIcon, Loader2, Trash2, X } from 'lucide-react';
import { processAndUploadAttachment } from '../services/attachmentService';
import { useVault } from '../context/VaultContext';

interface AttachmentPickerProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  folder: 'vehicle' | 'insurance' | 'medical' | 'receipt';
  label?: string;
}

export const AttachmentPicker: React.FC<AttachmentPickerProps> = ({
  value,
  onChange,
  folder,
  label = '單據 / 照片附件 (工單、保單或收據)',
}) => {
  const { settings } = useVault();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const url = await processAndUploadAttachment(file, settings, folder);
      onChange(url);
    } catch (err) {
      alert(`圖片處理失敗：${String(err)}`);
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[#4E5968] dark:text-[#9BA4B0]">
        {label}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!value ? (
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => inputRef.current?.click()}
          className="w-full py-2.5 px-3.5 rounded-xl border border-dashed border-[#CBD5E1] dark:border-[#334155] bg-[#F6F7F9] dark:bg-[#1F2631] text-xs font-medium text-[#4E5968] dark:text-[#9BA4B0] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
              <span>壓縮並處理單據照片中...</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              <span>拍照或選取單據照片 (自動智慧壓縮)</span>
            </>
          )}
        </button>
      ) : (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#1F2631] border border-[#EAEDF2] dark:border-[#262C36]">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-2.5 text-left group"
          >
            <img
              src={value}
              alt="附件縮圖"
              className="w-10 h-10 rounded-lg object-cover border border-[#EAEDF2] dark:border-[#262C36]"
            />
            <div>
              <div className="text-xs font-semibold text-[#191F28] dark:text-[#F2F4F8] group-hover:text-[#2563EB] flex items-center gap-1">
                <span>已綁定單據照片</span>
                <ExternalLink className="w-3 h-3" />
              </div>
              <div className="text-[11px] text-[#8B95A1]">點擊放大檢視原圖</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="p-2 rounded-lg text-[#8B95A1] hover:text-[#F04452] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="移除附件"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {previewOpen && value && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[88vh] bg-white dark:bg-[#161B22] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAEDF2] dark:border-[#262C36]">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ImageIcon className="w-4 h-4 text-[#2563EB]" />
                <span>單據附件檢視</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#F0F2F6] dark:hover:bg-[#1F2631]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-black/90 flex items-center justify-center max-h-[78vh] overflow-auto">
              <img src={value} alt="單據全圖" className="max-h-[72vh] w-auto object-contain rounded" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
