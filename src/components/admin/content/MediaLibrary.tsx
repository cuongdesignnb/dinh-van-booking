'use client';

import { Images, Search, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { formatDate, searchKey } from '@/lib/admin/formatters';
import { useAdmin } from '../AdminStore';
import { ConfirmDialog, EmptyState, Panel } from '../shared/ui';

const MAX_UPLOAD_BYTES = 3_000_000;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export function MediaLibrary() {
  const { data, commit, busy } = useAdmin();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');

  const list = data.media.filter((m) => !q || searchKey(`${m.file} ${m.alt}`).includes(searchKey(q)));
  const current = data.media.find((m) => m.id === detail);

  /** Which records still point at an asset — used before deleting. */
  const usedBy = (url: string) => [
    ...data.properties.filter((p) => p.cover === url).map((p) => `Nơi lưu trú: ${p.name}`),
    ...data.combos.filter((c) => c.cover === url || c.gallery.includes(url)).map((c) => `Combo: ${c.name}`),
    ...data.destinations.filter((d) => d.image === url || d.seo.ogImage === url).map((d) => `Điểm đến: ${d.name}`),
    ...data.articles.filter((a) => a.cover === url).map((a) => `Bài viết: ${a.title}`),
  ];

  return (
    <div className="ct__grid ct__grid--media">
      <Panel
        icon={<Images size={18} aria-hidden="true" />}
        title={`Thư viện ảnh (${list.length})`}
        action={
          <div className="ct__list-tools">
            <span className="bk__search ct__search">
              <Search size={14} aria-hidden="true" />
              <input className="ainput" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên tệp…" aria-label="Tìm ảnh" />
            </span>
            <label className="abtn abtn--primary abtn--sm ct__upload">
              <Upload size={14} aria-hidden="true" /> Tải ảnh lên
              <input
                type="file"
                accept={ALLOWED.join(',')}
                multiple
                onChange={(e) => {
                  const files = [...(e.target.files ?? [])];
                  const bad = files.filter((f) => !ALLOWED.includes(f.type) || f.size > MAX_UPLOAD_BYTES);
                  if (bad.length) {
                    setUploadError(
                      bad
                        .map((f) => `${f.name}: ${!ALLOWED.includes(f.type) ? 'định dạng không hỗ trợ' : 'vượt quá 3MB'}`)
                        .join('; '),
                    );
                  } else setUploadError('');
                  const ok = files.filter((f) => ALLOWED.includes(f.type) && f.size <= MAX_UPLOAD_BYTES);
                  if (!ok.length) return;
                  void commit(
                    'upload',
                    (draft) => {
                      for (const f of ok) {
                        draft.media.unshift({
                          id: `media-local-${Math.random().toString(36).slice(2, 8)}`,
                          file: f.name,
                          url: URL.createObjectURL(f),
                          kind: 'image',
                          width: 0,
                          height: 0,
                          bytes: f.size,
                          alt: '',
                          caption: 'Ảnh xem trước trong phiên làm việc (chưa upload lên máy chủ)',
                          tags: ['local'],
                          uploadedAt: new Date().toISOString().slice(0, 10),
                        });
                      }
                    },
                    `Đã thêm ${ok.length} ảnh xem trước (chưa tải lên máy chủ)`,
                  );
                }}
              />
            </label>
          </div>
        }
      >
        {uploadError && (
          <p className="aerror" role="alert">
            Không nhận được tệp: {uploadError}
          </p>
        )}
        {list.length ? (
          <ul className="mgrid">
            {list.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={`mgrid__item${detail === m.id ? ' is-active' : ''}`}
                  onClick={() => setDetail(m.id)}
                  aria-pressed={detail === m.id}
                >
                  <Image src={m.url} alt={m.alt} width={160} height={104} />
                  <span>{m.file}</span>
                </button>
                <label className="mgrid__check">
                  <input
                    type="checkbox"
                    checked={selected.includes(m.id)}
                    onChange={(e) => setSelected((s) => (e.target.checked ? [...s, m.id] : s.filter((x) => x !== m.id)))}
                    aria-label={`Chọn ${m.file}`}
                  />
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Không có ảnh nào khớp từ khóa." />
        )}
        {selected.length > 0 && <p className="ct__bulk">Đã chọn {selected.length} ảnh.</p>}
      </Panel>

      <Panel title="Chi tiết tệp">
        {current ? (
          <div className="mdetail">
            <Image src={current.url} alt={current.alt} width={300} height={180} />
            <dl className="bk__dl">
              <dt>Tên tệp</dt>
              <dd>{current.file}</dd>
              <dt>Dung lượng</dt>
              <dd className="numeric">{(current.bytes / 1000).toFixed(0)} KB</dd>
              <dt>Ngày thêm</dt>
              <dd className="numeric">{formatDate(current.uploadedAt)}</dd>
              <dt>Đang dùng ở</dt>
              <dd>{usedBy(current.url).join(', ') || 'Chưa gắn vào nội dung nào'}</dd>
            </dl>
            <label className="afield">
              <span>Alt (mô tả ảnh)</span>
              <input
                className="ainput"
                defaultValue={current.alt}
                onBlur={(e) =>
                  commit(
                    'alt',
                    (draft) => {
                      const m = draft.media.find((x) => x.id === current.id);
                      if (m) m.alt = e.target.value;
                    },
                    'Đã lưu mô tả ảnh trong bản demo',
                  )
                }
              />
            </label>
            <button type="button" className="abtn abtn--danger abtn--sm" onClick={() => setDeleting(current.id)}>
              <Trash2 size={13} aria-hidden="true" /> Xóa ảnh
            </button>
          </div>
        ) : (
          <EmptyState title="Chọn một ảnh để xem chi tiết." />
        )}
      </Panel>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        busy={busy === 'del-media'}
        tone="danger"
        title="Xóa ảnh khỏi thư viện"
        confirmLabel="Xóa ảnh"
        onConfirm={async () => {
          const id = deleting;
          if (!id) return;
          await commit(
            'del-media',
            (draft) => {
              const m = draft.media.find((x) => x.id === id);
              if (!m) return 'Không tìm thấy ảnh.';
              const uses = usedBy(m.url);
              if (uses.length) return `Ảnh đang được dùng ở: ${uses.join(', ')}. Hãy thay ảnh khác trước khi xóa.`;
              draft.media = draft.media.filter((x) => x.id !== id);
            },
            'Đã xóa ảnh khỏi thư viện demo',
          );
          setDeleting(null);
          setDetail(null);
        }}
      >
        <p>Ảnh sẽ bị gỡ khỏi thư viện dữ liệu mẫu.</p>
        <p className="adialog__note">Nếu ảnh đang được dùng, hệ thống sẽ báo và không xóa.</p>
      </ConfirmDialog>
    </div>
  );
}
