'use client';

import { ImagePlus } from 'lucide-react';
import Image from 'next/image';
import { useId, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAdmin } from '../AdminStore';

const MAX_UPLOAD_BYTES = 3_000_000;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

/** Shared media picker for properties, combos, destinations and articles. */
export function MediaPicker({
  value,
  onChange,
  label = 'Thay đổi ảnh',
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const { data, commit, pushToast } = useAdmin();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const id = useId();

  return (
    <>
      <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setOpen(true)}>
        <ImagePlus size={14} aria-hidden="true" /> {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy={id} className="dialog--admin" size="lg">
        <h2 id={id} className="dialog__title">
          Thư viện ảnh
        </h2>
        <p className="adialog__note">
          Chọn ảnh có sẵn trong thư viện. Tệp tải lên chỉ được xem trước trong phiên làm việc này: chưa có API lưu trữ nên ảnh
          không được đẩy lên máy chủ.
        </p>
        <label className="afield">
          <span>Tải ảnh mới (xem trước)</span>
          <input
            type="file"
            accept={ALLOWED.join(',')}
            className="ainput"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!ALLOWED.includes(file.type)) {
                setError(`Tệp “${file.name}” không đúng định dạng (chỉ nhận JPG, PNG, WebP).`);
                return;
              }
              if (file.size > MAX_UPLOAD_BYTES) {
                setError(`Tệp “${file.name}” nặng ${(file.size / 1_000_000).toFixed(1)}MB, vượt giới hạn 3MB.`);
                return;
              }
              setError('');
              const url = URL.createObjectURL(file);
              void commit(
                'media',
                (draft) => {
                  draft.media.unshift({
                    id: `media-local-${Date.now().toString(36)}`,
                    file: file.name,
                    url,
                    kind: 'image',
                    width: 0,
                    height: 0,
                    bytes: file.size,
                    alt: '',
                    caption: 'Ảnh xem trước trong phiên làm việc (chưa upload)',
                    tags: ['local'],
                    uploadedAt: new Date().toISOString().slice(0, 10),
                  });
                },
                'Đã thêm ảnh xem trước (chưa tải lên máy chủ)',
              );
              onChange(url);
            }}
          />
          {error && (
            <span className="aerror" role="alert">
              {error}
            </span>
          )}
        </label>
        <ul className="mpicker">
          {data.media.slice(0, 24).map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className={`mpicker__item${value === m.url ? ' is-active' : ''}`}
                aria-pressed={value === m.url}
                onClick={() => {
                  onChange(m.url);
                  setOpen(false);
                  pushToast('Đã chọn ảnh trong bản demo');
                }}
              >
                <Image src={m.url} alt={m.alt} width={120} height={72} />
                <span>{m.file}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="adialog__actions">
          <button type="button" className="abtn abtn--ghost" onClick={() => setOpen(false)}>
            Đóng
          </button>
        </div>
      </Modal>
    </>
  );
}
