'use client';

import { ArrowLeft, Camera, ExternalLink, Save } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlbumEditor, type AlbumItem } from '@/components/admin/media/AlbumEditor';
import { ListCard, ListToolbar, PageActions, foldText } from '@/components/admin/shared/ListKit';
import { useAdminToast } from '@/components/admin/toast/useAdminToast';
import { ApiError, apiRequest } from '@/lib/api/client';
import { PARK_COMMONS_PHOTOS, PARK_KIND_LABEL, PARK_POINTS, PARK_STAYS, type ParkPoint } from '@/data/park-map';

const SETTING_KEY = 'catalog.destinationsPage';
const POINTS: ParkPoint[] = [...PARK_POINTS, ...PARK_STAYS];

type SettingView = { key: string; value: Record<string, unknown>; version: number };
type MediaDetail = { id: string; url: string; altText: string | null; originalFilename: string };
type Albums = Record<string, AlbumItem[]>;

function storedAlbums(value: unknown): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const entry of Array.isArray(value) ? value : []) {
    if (!entry || typeof entry !== 'object') continue;
    const { pointId, photos } = entry as { pointId?: unknown; photos?: unknown };
    if (typeof pointId !== 'string') continue;
    result[pointId] = (Array.isArray(photos) ? photos : []).flatMap((photo) => {
      const id = photo && typeof photo === 'object' ? (photo as { mediaId?: unknown }).mediaId : null;
      return typeof id === 'string' && id ? [id] : [];
    });
  }
  return result;
}

const fingerprint = (albums: Albums) => JSON.stringify(POINTS.map((point) => (albums[point.id] ?? []).map((item) => item.mediaId)));

/** Admin › Điểm đến › Ảnh trên bản đồ: one photo album per point of the park map on /diem-den. */
export function ParkMapPhotosEditor() {
  const toast = useAdminToast();
  const [setting, setSetting] = useState<SettingView | null>(null);
  const [albums, setAlbums] = useState<Albums>({});
  const [saved, setSaved] = useState('');
  const [selectedId, setSelectedId] = useState(POINTS[0].id);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const next = await apiRequest<SettingView>(`/settings/${encodeURIComponent(SETTING_KEY)}`);
      const stored = storedAlbums(next.value.mapPoints);
      const ids = [...new Set(Object.values(stored).flat())];
      const details = new Map<string, MediaDetail>();
      await Promise.all(ids.map(async (id) => {
        try {
          details.set(id, await apiRequest<MediaDetail>(`/media/${encodeURIComponent(id)}`));
        } catch {
          // A photo deleted from the library simply drops out of the album.
        }
      }));
      const loaded: Albums = {};
      for (const [pointId, mediaIds] of Object.entries(stored)) {
        loaded[pointId] = mediaIds.flatMap((id) => {
          const media = details.get(id);
          return media ? [{ mediaId: id, url: media.url, alt: media.altText || media.originalFilename }] : [];
        });
      }
      setSetting(next);
      setAlbums(loaded);
      setSaved(fingerprint(loaded));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được ảnh bản đồ.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const dirty = !!setting && fingerprint(albums) !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = async () => {
    if (!setting) return;
    setSaving(true);
    setError(null);
    try {
      const mapPoints = POINTS.flatMap((point) => {
        const items = albums[point.id] ?? [];
        return items.length ? [{ pointId: point.id, photos: items.map((item) => ({ mediaId: item.mediaId })) }] : [];
      });
      await apiRequest(`/settings/${encodeURIComponent(SETTING_KEY)}`, {
        method: 'PUT',
        body: JSON.stringify({ value: { ...setting.value, mapPoints }, expectedVersion: setting.version }),
      }, { quiet: true });
      toast.success('Đã lưu ảnh trên bản đồ.');
      await load();
    } catch (reason) {
      const conflict = reason instanceof ApiError && reason.status === 409;
      const text = conflict ? 'Trang điểm đến vừa được sửa ở nơi khác. Hãy tải lại trang rồi thêm ảnh lại.' : reason instanceof Error ? reason.message : 'Không lưu được.';
      setError(text); // apiRequest already shows the error toast.
    } finally {
      setSaving(false);
    }
  };

  const needle = foldText(search.trim());
  const visible = useMemo(() => POINTS.filter((point) => !needle || foldText(`${point.name} ${point.alt ?? ''}`).includes(needle)), [needle]);
  const selected = POINTS.find((point) => point.id === selectedId) ?? POINTS[0];
  const own = albums[selected.id] ?? [];
  const fallback = PARK_COMMONS_PHOTOS[selected.id] ?? [];
  const withPhotos = POINTS.filter((point) => (albums[point.id]?.length ?? 0) > 0).length;

  return (
    <section className="pmphotos">
      <PageActions>
        <Link className="abtn abtn--ghost" href="/admin/diem-den"><ArrowLeft size={16} aria-hidden="true" /> Danh sách điểm đến</Link>
        <a className="abtn abtn--ghost" href="/diem-den#park-map-title" target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" /> Xem bản đồ</a>
        <button type="button" className="abtn abtn--primary" onClick={save} disabled={!dirty || saving}><Save size={16} aria-hidden="true" /> {saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
      </PageActions>
      {error && <p className="settings-screen__message settings-screen__message--error" role="alert">{error}</p>}

      <div className="pmphotos__layout">
        <ListCard className="pmphotos__list">
          <ListToolbar search={search} onSearch={setSearch} placeholder="Tìm điểm trên bản đồ" />
          <p className="pmphotos__summary">{withPhotos}/{POINTS.length} điểm đã có album riêng{dirty ? ' · có thay đổi chưa lưu' : ''}</p>
          <ul>
            {visible.map((point) => {
              const count = albums[point.id]?.length ?? 0;
              const cover = albums[point.id]?.[0]?.url ?? PARK_COMMONS_PHOTOS[point.id]?.[0]?.thumb;
              return (
                <li key={point.id}>
                  <button type="button" className={`pmphotos__item${point.id === selected.id ? ' is-on' : ''}`} onClick={() => setSelectedId(point.id)} aria-current={point.id === selected.id}>
                    {cover
                      // eslint-disable-next-line @next/next/no-img-element -- tiny preview of a library or Commons file
                      ? <img src={cover} alt="" width={40} height={40} loading="lazy" />
                      : <span className="pmphotos__empty" aria-hidden="true"><Camera size={16} /></span>}
                    <span>
                      <strong>{point.no ? `${point.no}. ` : ''}{point.name}</strong>
                      <small>{PARK_KIND_LABEL[point.kind]} · {count ? `${count} ảnh` : PARK_COMMONS_PHOTOS[point.id] ? `${PARK_COMMONS_PHOTOS[point.id].length} ảnh Commons` : 'chưa có ảnh'}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </ListCard>

        <div className="pmphotos__detail">
          <header>
            <p className="pmphotos__kind">{PARK_KIND_LABEL[selected.kind]}{selected.no ? ` · Điểm ${selected.no}` : ''}</p>
            <h2>{selected.name}</h2>
            <p className="ahint">{selected.summary}</p>
          </header>
          <AlbumEditor
            label={`Album ảnh “${selected.name}”`}
            items={own}
            onChange={(items) => setAlbums((current) => ({ ...current, [selected.id]: items }))}
            hint="Ảnh đầu tiên hiện trên ghim bản đồ và làm ảnh bìa trong khung thông tin; cả album mở khi khách bấm vào ảnh. Chỉ dùng ảnh chụp đúng địa điểm này và nhớ điền mô tả ảnh (alt) trong thư viện."
          />
          {fallback.length > 0 && <div className="pmphotos__fallback">
            <p><strong>{own.length ? 'Đang ẩn' : 'Đang hiển thị'} {fallback.length} ảnh từ Wikimedia Commons</strong> {own.length ? '— album riêng ở trên được ưu tiên.' : '— sẽ được thay khi bạn thêm album riêng.'}</p>
            <ul>
              {fallback.map((photo) => <li key={photo.src}>
                {/* eslint-disable-next-line @next/next/no-img-element -- Commons preview */}
                <img src={photo.thumb ?? photo.src} alt={photo.alt} width={96} height={72} loading="lazy" />
                <small>{photo.credit}</small>
              </li>)}
            </ul>
          </div>}
        </div>
      </div>
    </section>
  );
}
