'use client';

import { ArrowDown, ArrowUp, Images, Plus, Trash2 } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import { useState } from 'react';
import { MediaLibrary, type MediaAsset } from './MediaLibrary';

export type AlbumItem = { mediaId: string; url: string; alt?: string };

export function AlbumEditor({ label, items, onChange }: {
  label: string;
  items: AlbumItem[];
  onChange: (items: AlbumItem[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const move = (index: number, nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const changed = [...items];
    [changed[index], changed[nextIndex]] = [changed[nextIndex], changed[index]];
    onChange(changed);
  };
  const add = (asset: MediaAsset) => {
    if (!items.some((item) => item.mediaId === asset.id)) {
      onChange([...items, { mediaId: asset.id, url: asset.url, alt: asset.altText || asset.originalFilename }]);
    }
    setOpen(false);
  };
  return <section className="album-editor" aria-label={label}>
    <div className="album-editor__head"><div><h4><Images size={18} aria-hidden="true" /> {label}</h4><p className="ahint">Ảnh trong album có thể dùng lại từ thư viện; kéo thứ tự bằng các nút mũi tên. Ảnh bìa được quản lý riêng.</p></div><button type="button" className="abtn abtn--ghost" onClick={() => setOpen(true)}><Plus size={15} aria-hidden="true" /> Thêm ảnh</button></div>
    {items.length ? <ol className="album-editor__list">{items.map((item, index) => <li key={item.mediaId}>
      <Image src={item.url} alt={item.alt || `Ảnh album ${index + 1}`} width={112} height={76} unoptimized />
      <span className="album-editor__name">{item.alt || `Ảnh ${index + 1}`}</span>
      <div className="album-editor__actions">
        <button type="button" className="abtn abtn--ghost abtn--sm" aria-label={`Đưa ảnh ${index + 1} lên trước`} disabled={index === 0} onClick={() => move(index, index - 1)}><ArrowUp size={14} /></button>
        <button type="button" className="abtn abtn--ghost abtn--sm" aria-label={`Đưa ảnh ${index + 1} xuống sau`} disabled={index === items.length - 1} onClick={() => move(index, index + 1)}><ArrowDown size={14} /></button>
        <button type="button" className="abtn abtn--danger abtn--sm" aria-label={`Bỏ ảnh ${index + 1} khỏi album`} onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14} /></button>
      </div>
    </li>)}</ol> : <p className="album-editor__empty">Chưa có ảnh trong album. Bấm “Thêm ảnh” để chọn từ thư viện.</p>}
    <MediaLibrary mode="modal" open={open} onClose={() => setOpen(false)} onSelect={add} title={`Chọn ảnh cho ${label.toLowerCase()}`} />
  </section>;
}
