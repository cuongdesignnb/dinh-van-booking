'use client';

import { ArrowDown, ArrowUp, FilePlus2, Link2, Plus, RefreshCw, RotateCcw, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';

type MenuItem = {
  id: string;
  label: string;
  contentId: string | null;
  externalUrl: string | null;
  href: string | null;
  position: number;
  enabled: boolean;
};

type MenuPayload = { key: string; name: string; isDefault: boolean; items: MenuItem[] };
type PublishedPage = { id: string; title: string; slug: string; path: string; publishAt: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SYSTEM_ROUTES = [
  { label: 'Tra cứu phòng', href: '/lich-phong' },
  { label: 'Cổng đối tác', href: '/doi-tac' },
];
const hasRoute = (items: MenuItem[], href: string) => items.some((item) =>
  (item.externalUrl ?? item.href)?.split(/[?#]/)[0].replace(/\/+$/, '') === href,
);

function messageFor(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Không thể hoàn tất thao tác.';
}

export function MenuManager() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [pages, setPages] = useState<PublishedPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [selectedSystemRoute, setSelectedSystemRoute] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadFailed(false);
    try {
      const [menu, content] = await Promise.all([
        apiRequest<MenuPayload>('/navigation/primary'),
        apiRequest<{ items: PublishedPage[] }>('/content?kind=page&status=published&page=1&pageSize=100'),
      ]);
      setItems(menu.items);
      setIsDefault(menu.isDefault);
      setPages(content.items.filter((page) => !page.publishAt || new Date(page.publishAt).getTime() <= Date.now()));
    } catch (reason) {
      setError(messageFor(reason));
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateItem = (index: number, patch: Partial<MenuItem>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    setItems((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addPage = () => {
    const page = pages.find((item) => item.id === selectedPageId);
    if (!page || items.some((item) => item.contentId === page.id)) return;
    setItems((current) => [...current, {
      id: `new-${page.id}`,
      label: page.title,
      contentId: page.id,
      externalUrl: null,
      href: page.path,
      position: current.length,
      enabled: true,
    }]);
    setSelectedPageId('');
    setNotice(null);
  };

  const removeItem = (index: number) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));

  const addSystemRoute = () => {
    const route = SYSTEM_ROUTES.find((item) => item.href === selectedSystemRoute);
    if (!route) return;
    setItems((current) => hasRoute(current, route.href) ? current : [...current, {
      id: `new-system-${route.href}`, label: route.label, contentId: null,
      externalUrl: route.href, href: route.href, position: current.length, enabled: true,
    }]);
    setSelectedSystemRoute('');
    setNotice(null);
  };

  const reset = async () => {
    if (!window.confirm('Khôi phục Menu chính về các liên kết mặc định của website?')) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const restored = await apiRequest<MenuPayload>('/navigation/primary', { method: 'DELETE' });
      setItems(restored.items);
      setIsDefault(restored.isDefault);
      setNotice('Đã khôi phục các liên kết mặc định của website.');
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await apiRequest<MenuPayload>('/navigation/primary', {
        method: 'PUT',
        body: JSON.stringify({
          items: items.map((item) => ({
            ...(UUID.test(item.id) ? { id: item.id } : {}),
            label: item.label,
            contentId: item.contentId,
            externalUrl: item.externalUrl,
            enabled: item.enabled,
          })),
        }),
      });
      setItems(saved.items);
      setIsDefault(false);
      setNotice('Đã lưu Menu chính; các liên kết đang bật sẽ xuất hiện theo thứ tự mới.');
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="menu-manager">
      <div className="settings-screen__head">
        <div>
          <h2>Quản lý Menu website</h2>
          <p className="ahint">Sắp xếp liên kết hệ thống và chuyên trang trên menu đầu trang. Chuyên trang cần được xuất bản để hiển thị cho khách.</p>
        </div>
        <div className="menu-manager__head-actions">
          <button type="button" className="abtn abtn--ghost" onClick={() => void load()} disabled={loading || saving}><RefreshCw size={15} aria-hidden="true" /> Tải lại</button>
          {!loading && !loadFailed && !isDefault && <button type="button" className="abtn abtn--ghost" onClick={() => void reset()} disabled={saving}><RotateCcw size={15} aria-hidden="true" /> Khôi phục mặc định</button>}
          <button type="button" className="abtn abtn--primary" onClick={() => void save()} disabled={loading || saving || loadFailed}><Save size={15} aria-hidden="true" /> {saving ? 'Đang lưu…' : 'Lưu Menu'}</button>
        </div>
      </div>

      {error && <p className="settings-screen__message settings-screen__message--error" role="alert">{error}</p>}
      {notice && <p className="settings-screen__message settings-screen__message--success" role="status">{notice}</p>}
      {isDefault && <p className="menu-manager__default">Đang dùng menu mặc định của website. Bấm “Lưu Menu” để bắt đầu quản lý thứ tự và chuyên trang.</p>}

      <div className="acard menu-manager__add">
        <label className="afield" htmlFor="menu-system-picker">
          <span>Thêm liên kết hệ thống</span>
          <select id="menu-system-picker" className="ainput" value={selectedSystemRoute} onChange={(event) => setSelectedSystemRoute(event.target.value)} disabled={loading || saving || loadFailed || SYSTEM_ROUTES.every((route) => hasRoute(items, route.href))}>
            <option value="">Chọn trang hệ thống…</option>
            {SYSTEM_ROUTES.filter((route) => !hasRoute(items, route.href)).map((route) => <option key={route.href} value={route.href}>{route.label} — {route.href}</option>)}
          </select>
        </label>
        <button type="button" className="abtn abtn--ghost" onClick={addSystemRoute} disabled={!selectedSystemRoute || saving || loadFailed}><Plus size={15} aria-hidden="true" /> Thêm liên kết hệ thống</button>
      </div>

      <div className="acard menu-manager__add">
        <label className="afield" htmlFor="menu-page-picker">
          <span>Thêm chuyên trang vào menu</span>
          <select id="menu-page-picker" className="ainput" value={selectedPageId} onChange={(event) => setSelectedPageId(event.target.value)} disabled={loading || saving || !pages.some((page) => !items.some((item) => item.contentId === page.id))}>
            <option value="">Chọn chuyên trang đã xuất bản…</option>
            {pages.filter((page) => !items.some((item) => item.contentId === page.id)).map((page) => <option key={page.id} value={page.id}>{page.title} — {page.path}</option>)}
          </select>
        </label>
        <button type="button" className="abtn abtn--ghost" onClick={addPage} disabled={!selectedPageId || saving}><Plus size={15} aria-hidden="true" /> Thêm vào menu</button>
        <Link href="/admin/chuyen-trang?action=create" className="menu-manager__create-link"><FilePlus2 size={15} aria-hidden="true" /> Tạo chuyên trang mới</Link>
      </div>

      {loading ? <div className="acard apending">Đang tải Menu website…</div> : loadFailed ? <div className="acard apending menu-manager__error-state">Không tải được Menu từ API. Bấm “Tải lại” để thử lại.</div> : !items.length ? <div className="acard apending menu-manager__empty"><Link2 size={21} aria-hidden="true" /><div><h3>Menu hiện chưa có mục nào</h3><p>Chọn một chuyên trang đã xuất bản ở phía trên để thêm liên kết.</p></div></div> : (
        <div className="menu-manager__list">
          {items.map((item, index) => (
            <article className="acard menu-manager__item" key={item.id}>
              <div className="menu-manager__order">
                <button type="button" className="abtn abtn--ghost abtn--sm" aria-label={`Đưa ${item.label} lên`} onClick={() => moveItem(index, -1)} disabled={index === 0 || saving}><ArrowUp size={15} aria-hidden="true" /></button>
                <span>{index + 1}</span>
                <button type="button" className="abtn abtn--ghost abtn--sm" aria-label={`Đưa ${item.label} xuống`} onClick={() => moveItem(index, 1)} disabled={index === items.length - 1 || saving}><ArrowDown size={15} aria-hidden="true" /></button>
              </div>
              <div className="menu-manager__item-body">
                <label className="afield">
                  <span>Tên hiển thị</span>
                  <input className="ainput" value={item.label} onChange={(event) => updateItem(index, { label: event.target.value })} maxLength={100} disabled={saving} />
                </label>
                <p className="ahint"><Link2 size={13} aria-hidden="true" /> {item.href ?? (item.contentId ? 'Trang chưa xuất bản hoặc chưa có đường dẫn' : 'Liên kết chưa hợp lệ')}</p>
              </div>
              <label className="atoggle menu-manager__visible">
                <input type="checkbox" checked={item.enabled} onChange={(event) => updateItem(index, { enabled: event.target.checked })} disabled={saving} />
                <span className="atoggle__track"><span className="atoggle__thumb" /></span>
                <span className="atoggle__text"><strong>Hiển thị</strong></span>
              </label>
              <button type="button" className="abtn abtn--danger abtn--sm menu-manager__remove" onClick={() => removeItem(index)} disabled={saving} aria-label={`Xoá ${item.label} khỏi menu`}><Trash2 size={15} aria-hidden="true" /> Bỏ khỏi menu</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
