'use client';

import { AdminMediaField } from './AdminMediaField';
import type { MediaAsset } from './MediaLibrary';

export function MediaPicker({
  value,
  onChange,
  onMediaChange,
  mediaId,
  label = 'Chọn ảnh',
  uploadAltText,
  disabled = false,
  recommendedWidth = 1200,
  recommendedHeight = 800,
  recommendedRatio,
  guidanceNote,
}: {
  value?: string | null;
  onChange?: (url: string) => void;
  onMediaChange?: (asset: MediaAsset | null) => void;
  mediaId?: string | null;
  label?: string;
  uploadAltText?: string;
  disabled?: boolean;
  recommendedWidth?: number;
  recommendedHeight?: number;
  recommendedRatio?: number;
  guidanceNote?: string;
}) {
  return (
    <AdminMediaField
      label={label}
      mediaId={mediaId}
      valueUrl={value}
      disabled={disabled}
      uploadAltText={uploadAltText}
      guidance={{ width: recommendedWidth, height: recommendedHeight, ratio: recommendedRatio, note: guidanceNote }}
      onChange={(asset) => {
        onChange?.(asset?.url ?? '');
        onMediaChange?.(asset);
      }}
      chooseLabel={label}
    />
  );
}
