'use client';

import { ImagePlus, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { MediaLibrary, type MediaAsset } from './MediaLibrary';

export function MediaPicker({
  value,
  onChange,
  onMediaChange,
  mediaId,
  label = 'Chọn ảnh',
  uploadAltText,
  disabled = false,
}: {
  value?: string | null;
  onChange?: (url: string) => void;
  onMediaChange?: (asset: MediaAsset | null) => void;
  mediaId?: string | null;
  label?: string;
  uploadAltText?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const url = value ?? '';

  const select = (asset: MediaAsset) => {
    onChange?.(asset.url);
    onMediaChange?.(asset);
    setOpen(false);
  };

  const clear = () => {
    onChange?.('');
    onMediaChange?.(null);
  };

  return (
    <div className="media-picker">
      {url ? (
        <div className="media-picker__preview">
          <Image src={url} alt="Ảnh đã chọn" width={180} height={112} unoptimized />
        </div>
      ) : (
        <div className="media-picker__empty">Chưa chọn ảnh</div>
      )}
      <div className="media-picker__actions">
        <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setOpen(true)} disabled={disabled}>
          <ImagePlus size={14} aria-hidden="true" /> {url ? 'Đổi ảnh' : label}
        </button>
        {url && (
          <button type="button" className="abtn abtn--ghost abtn--sm" onClick={clear} disabled={disabled}>
            <X size={14} aria-hidden="true" /> Bỏ ảnh
          </button>
        )}
      </div>
      <p className="ahint media-picker__hint">Chọn lại ảnh từ thư viện hoặc tải ảnh mới trong thư viện. Tệp mới sẽ lưu dưới dạng WebP.</p>
      <MediaLibrary
        mode="modal"
        open={open}
        onClose={() => setOpen(false)}
        onSelect={select}
        selectedId={mediaId}
        initialAltText={uploadAltText}
      />
    </div>
  );
}
