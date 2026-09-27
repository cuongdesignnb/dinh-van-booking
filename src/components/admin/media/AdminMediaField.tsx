'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { MediaLibrary, type MediaAsset } from './MediaLibrary';

export type MediaGuidance = {
  width: number;
  height: number;
  ratio?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
  note?: string;
};

function formatBytes(value: string): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminMediaField({
  label,
  mediaId,
  valueUrl,
  disabled = false,
  guidance,
  uploadAltText,
  chooseLabel,
  onChange,
}: {
  label: string;
  mediaId?: string | null;
  valueUrl?: string | null;
  disabled?: boolean;
  guidance: MediaGuidance;
  uploadAltText?: string;
  chooseLabel?: string;
  onChange: (asset: MediaAsset | null) => void;
}) {
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mediaId) {
      setAsset(null);
      return;
    }
    let current = true;
    setLoading(true);
    void apiRequest<MediaAsset>(`/media/${encodeURIComponent(mediaId)}`)
      .then((next) => { if (current) setAsset(next); })
      .catch(() => { if (current) setAsset(null); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [mediaId]);

  const actualRatio = asset?.width && asset?.height ? asset.width / asset.height : null;
  const expectedRatio = guidance.ratio ?? guidance.width / guidance.height;
  const ratioMismatch = actualRatio !== null && Math.abs(actualRatio - expectedRatio) / expectedRatio > 0.08;
  const undersized = !!asset?.width && !!asset?.height && (asset.width < guidance.width || asset.height < guidance.height);
  const orientation = guidance.orientation ?? (guidance.width === guidance.height ? 'square' : guidance.width > guidance.height ? 'landscape' : 'portrait');
  const orientationLabel = orientation === 'landscape' ? 'ảnh ngang' : orientation === 'portrait' ? 'ảnh dọc' : 'ảnh vuông';
  const previewUrl = asset?.url ?? valueUrl ?? '';

  const choose = (next: MediaAsset | null) => {
    setAsset(next);
    onChange(next);
  };

  return (
    <div className="settings-media-field">
      <p className="ahint">Khuyến nghị: {guidance.width} × {guidance.height} px · tỷ lệ {expectedRatio.toFixed(2)}:1 · {orientationLabel}.{guidance.note ? ` ${guidance.note}` : ''}</p>
      {previewUrl ? (
        <div className="settings-media-field__selected">
          <Image src={previewUrl} alt={asset?.altText ?? label} width={120} height={76} unoptimized />
          <span>
            <strong>{asset?.originalFilename ?? (mediaId ? 'Ảnh đã chọn trong thư viện' : 'Ảnh đã chọn')}</strong>
            <small>{asset?.width && asset.height ? `${asset.width} × ${asset.height} px` : loading ? 'Đang tải thông tin ảnh…' : 'Chưa tải được metadata kích thước'} · {asset ? formatBytes(asset.byteSize) : '—'}</small>
            <small>ALT: {asset?.altText || 'Chưa có ALT'}{asset?.caption ? ` · ${asset.caption}` : ''}</small>
          </span>
        </div>
      ) : <p className="ahint">Chưa chọn ảnh.</p>}
      {(undersized || ratioMismatch) && <p className="admin-media-field__warning" role="note">
        {[undersized ? `Ảnh nhỏ hơn khuyến nghị ${guidance.width} × ${guidance.height} px` : '', ratioMismatch ? `Tỷ lệ ảnh hiện tại ${actualRatio?.toFixed(2)}:1 khác tỷ lệ khuyến nghị ${expectedRatio.toFixed(2)}:1` : ''].filter(Boolean).join(' · ')}. Ảnh có thể bị crop; vẫn có thể lưu nếu bố cục phù hợp.
      </p>}
      <div className="settings-media-field__actions">
        <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setOpen(true)} disabled={disabled}>{chooseLabel ?? (mediaId ? 'Thay ảnh từ thư viện' : 'Chọn từ thư viện ảnh')}</button>
        <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setOpen(true)} disabled={disabled}>Tải ảnh mới</button>
        {(mediaId || previewUrl) && <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => choose(null)} disabled={disabled}>Gỡ ảnh</button>}
      </div>
      <MediaLibrary
        mode="modal"
        open={open}
        onClose={() => setOpen(false)}
        selectedId={mediaId}
        title={`Chọn ${label.toLocaleLowerCase('vi-VN')}`}
        initialAltText={uploadAltText ?? label}
        onSelect={(next) => { choose(next); setOpen(false); }}
      />
    </div>
  );
}
