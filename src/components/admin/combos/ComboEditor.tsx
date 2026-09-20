'use client';

import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { vnd } from '@/lib/admin/formatters';
import type { AdminCombo } from '@/lib/admin/types';
import { useAdmin } from '../AdminStore';
import { MediaPicker } from '../content/MediaPicker';
import { FormDrawer } from '../shared/ui';

interface Day {
  day: number;
  title: string;
  time: string;
  activities: string[];
}

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function ComboEditor({
  open,
  combo,
  onClose,
  onSaved,
}: {
  open: boolean;
  combo: AdminCombo | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { data, commit, busy } = useAdmin();
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    slug: '',
    cover: '',
    days: 2,
    nights: 1,
    price: 1290000,
    childPrice: 900000,
    audiences: [] as string[],
    summary: '',
    state: 'draft' as AdminCombo['state'],
    featured: false,
    includes: [] as string[],
    excludes: [] as string[],
  });
  const [itinerary, setItinerary] = useState<Day[]>([]);

  useEffect(() => {
    if (!open) return;
    setDirty(false);
    setError('');
    if (combo) {
      setForm({
        name: combo.name,
        slug: combo.slug,
        cover: combo.cover,
        days: combo.days,
        nights: combo.nights,
        price: combo.price,
        childPrice: combo.childPrice ?? 0,
        audiences: [...combo.audiences],
        summary: combo.summary,
        state: combo.state,
        featured: combo.featured,
        includes: [...combo.includes],
        excludes: [...combo.excludes],
      });
      setItinerary(structuredClone(combo.itinerary));
    } else {
      setForm({
        name: '',
        slug: '',
        cover: data.media[0]?.url ?? '',
        days: 2,
        nights: 1,
        price: 1290000,
        childPrice: 900000,
        audiences: ['Gia đình'],
        summary: '',
        state: 'draft',
        featured: false,
        includes: ['Xe du lịch đời mới', 'Lưu trú homestay 1 đêm'],
        excludes: ['Chi phí cá nhân'],
      });
      setItinerary([
        { day: 1, title: 'Ngày 1', time: '07:00 – 17:00', activities: ['Khởi hành'] },
        { day: 2, title: 'Ngày 2', time: '07:30 – 16:00', activities: ['Kết thúc hành trình'] },
      ]);
    }
  }, [open, combo, data.media]);

  const patch = (p: Partial<typeof form>) => {
    setForm((f) => {
      const next = { ...f, ...p };
      if (p.name !== undefined && !combo) next.slug = slugify(p.name);
      return next;
    });
    setDirty(true);
  };

  const moveDay = (index: number, dir: -1 | 1) => {
    setItinerary((list) => {
      const next = [...list];
      const target = index + dir;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((d, i) => ({ ...d, day: i + 1 }));
    });
    setDirty(true);
  };

  const save = async () => {
    if (!form.name.trim()) return setError('Nhập tên combo.');
    if (form.price <= 0) return setError('Giá phải lớn hơn 0.');
    if (itinerary.length !== form.days)
      return setError(`Thời lượng ${form.days} ngày nhưng lịch trình đang có ${itinerary.length} ngày. Hãy chỉnh cho khớp.`);
    const id = combo?.id ?? (slugify(form.name) || `combo-${Date.now().toString(36)}`);
    const err = await commit(
      'save-combo',
      (draft) => {
        const payload = {
          name: form.name.trim(),
          slug: form.slug || slugify(form.name),
          cover: form.cover,
          days: form.days,
          nights: form.nights,
          price: form.price,
          childPrice: form.childPrice || null,
          audiences: form.audiences,
          summary: form.summary,
          state: form.state,
          featured: form.featured,
          includes: form.includes,
          excludes: form.excludes,
          itinerary,
        };
        if (combo) {
          const c = draft.combos.find((x) => x.id === combo.id);
          if (!c) return 'Không tìm thấy combo.';
          Object.assign(c, payload);
        } else {
          draft.combos.unshift({
            id,
            area: 'Ninh Bình',
            gallery: [form.cover],
            tags: [],
            priceUnit: 'person',
            bookings: 0,
            views: 0,
            revenue: 0,
            badge: null,
            destinationIds: [],
            propertyIds: [],
            promotion: null,
            terms: ['Giá mới chỉ áp dụng cho đơn mới; đơn đã chốt giữ giá cũ.'],
            ...payload,
          });
        }
      },
      combo ? 'Đã lưu combo trong bản demo' : 'Đã tạo combo mới trong bản demo',
    );
    if (!err) {
      setDirty(false);
      onSaved(id);
      onClose();
    }
  };

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      dirty={dirty}
      wide
      title={combo ? `Chỉnh sửa ${combo.name}` : 'Tạo combo mới'}
      subtitle="Chỉnh sửa catalogue không làm thay đổi giá của các đơn đã chốt."
      footer={
        <>
          <button type="button" className="abtn abtn--ghost" onClick={onClose}>
            Đóng
          </button>
          <button type="button" className="abtn abtn--primary" onClick={save} disabled={busy === 'save-combo'}>
            {busy === 'save-combo' ? 'Đang lưu…' : 'Lưu combo (bản demo)'}
          </button>
        </>
      }
    >
      <div className="cb__editor">
        <div className="pr__form2">
          <label className="afield">
            <span>Tên combo *</span>
            <input className="ainput" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
          </label>
          <label className="afield">
            <span>Slug</span>
            <input className="ainput" value={form.slug} onChange={(e) => patch({ slug: e.target.value })} />
          </label>
          <label className="afield">
            <span>Số ngày</span>
            <input type="number" min={1} max={7} className="ainput" value={form.days} onChange={(e) => patch({ days: Number(e.target.value) })} />
          </label>
          <label className="afield">
            <span>Số đêm</span>
            <input type="number" min={0} max={6} className="ainput" value={form.nights} onChange={(e) => patch({ nights: Number(e.target.value) })} />
          </label>
          <label className="afield">
            <span>Giá / người (VND)</span>
            <input type="number" min={0} step={10000} className="ainput" value={form.price} onChange={(e) => patch({ price: Number(e.target.value) })} />
          </label>
          <label className="afield">
            <span>Giá trẻ em (VND)</span>
            <input type="number" min={0} step={10000} className="ainput" value={form.childPrice} onChange={(e) => patch({ childPrice: Number(e.target.value) })} />
          </label>
          <label className="afield pr__full">
            <span>Mô tả ngắn</span>
            <textarea className="ainput" rows={2} value={form.summary} onChange={(e) => patch({ summary: e.target.value })} />
          </label>
          <label className="afield">
            <span>Trạng thái</span>
            <select className="ainput" value={form.state} onChange={(e) => patch({ state: e.target.value as AdminCombo['state'] })}>
              <option value="draft">Bản nháp</option>
              <option value="selling">Đang bán</option>
              <option value="paused">Tạm dừng</option>
            </select>
          </label>
          <label className="afield afield--check">
            <input type="checkbox" checked={form.featured} onChange={(e) => patch({ featured: e.target.checked })} />
            <span>Hiển thị nổi bật trên trang chủ</span>
          </label>
          <div className="afield pr__full">
            <span>Ảnh bìa</span>
            <MediaPicker value={form.cover} onChange={(url) => patch({ cover: url })} />
          </div>
        </div>

        <section className="cb__itin-editor">
          <header>
            <h3>Lịch trình ({itinerary.length} ngày)</h3>
            <button
              type="button"
              className="abtn abtn--soft abtn--sm"
              onClick={() => {
                setItinerary((l) => [...l, { day: l.length + 1, title: `Ngày ${l.length + 1}`, time: '08:00 – 17:00', activities: [''] }]);
                setDirty(true);
              }}
            >
              <Plus size={13} aria-hidden="true" /> Thêm ngày
            </button>
          </header>
          <ol>
            {itinerary.map((d, i) => (
              <li key={i}>
                <div className="cb__itin-head">
                  <input
                    className="ainput"
                    value={d.title}
                    aria-label={`Tiêu đề ngày ${i + 1}`}
                    onChange={(e) => {
                      const v = e.target.value;
                      setItinerary((l) => l.map((x, xi) => (xi === i ? { ...x, title: v } : x)));
                      setDirty(true);
                    }}
                  />
                  <input
                    className="ainput cb__itin-time"
                    value={d.time}
                    aria-label={`Khung giờ ngày ${i + 1}`}
                    onChange={(e) => {
                      const v = e.target.value;
                      setItinerary((l) => l.map((x, xi) => (xi === i ? { ...x, time: v } : x)));
                      setDirty(true);
                    }}
                  />
                  <button type="button" className="icon-btn" aria-label={`Đưa ngày ${i + 1} lên trên`} onClick={() => moveDay(i, -1)}>
                    <ChevronUp size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Đưa ngày ${i + 1} xuống dưới`} onClick={() => moveDay(i, 1)}>
                    <ChevronDown size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Xóa ngày ${i + 1}`}
                    onClick={() => {
                      setItinerary((l) => l.filter((_, xi) => xi !== i).map((x, xi) => ({ ...x, day: xi + 1 })));
                      setDirty(true);
                    }}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
                <textarea
                  className="ainput"
                  rows={3}
                  aria-label={`Hoạt động ngày ${i + 1}, mỗi dòng một hoạt động`}
                  value={d.activities.join('\n')}
                  onChange={(e) => {
                    const v = e.target.value.split('\n');
                    setItinerary((l) => l.map((x, xi) => (xi === i ? { ...x, activities: v } : x)));
                    setDirty(true);
                  }}
                />
              </li>
            ))}
          </ol>
          <p className="ahint">Mỗi dòng trong ô nội dung là một hoạt động trong ngày.</p>
        </section>

        <section className="cb__incl-editor">
          <label className="afield">
            <span>Dịch vụ bao gồm (mỗi dòng một mục)</span>
            <textarea className="ainput" rows={4} value={form.includes.join('\n')} onChange={(e) => patch({ includes: e.target.value.split('\n') })} />
          </label>
          <label className="afield">
            <span>Dịch vụ không bao gồm</span>
            <textarea className="ainput" rows={4} value={form.excludes.join('\n')} onChange={(e) => patch({ excludes: e.target.value.split('\n') })} />
          </label>
          <p className="ahint">
            Giá hiện tại: {vnd(form.price)} / người. Thay đổi chỉ áp dụng cho đơn mới.
          </p>
        </section>
      </div>
      {error && (
        <p className="aerror" role="alert">
          {error}
        </p>
      )}
    </FormDrawer>
  );
}
