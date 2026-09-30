'use client';

import Image from '@/components/ui/ManagedImage';
import { useEffect, useState } from 'react';
import { KIND_LABEL } from '@/lib/admin/formatters';
import type { Property } from '@/lib/admin/types';
import { useAdmin } from '../AdminStore';
import { FormDrawer } from '../shared/ui';
import { MediaPicker } from '../content/MediaPicker';

const TABS = [
  { id: 'general', label: 'Thông tin chung' },
  { id: 'rooms', label: 'Loại phòng' },
  { id: 'media', label: 'Ảnh & tiện ích' },
  { id: 'policy', label: 'Chính sách' },
  { id: 'seo', label: 'SEO' },
] as const;

const AMENITIES: { id: string; label: string }[] = [
  { id: 'wifi', label: 'Wi-Fi miễn phí' },
  { id: 'breakfast', label: 'Bữa sáng' },
  { id: 'view', label: 'View rừng / núi' },
  { id: 'kitchen', label: 'Có bếp' },
  { id: 'family', label: 'Phù hợp gia đình' },
  { id: 'parking', label: 'Chỗ đậu xe' },
  { id: 'eco', label: 'Thân thiện môi trường' },
  { id: 'pool', label: 'Hồ bơi' },
];

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function PropertyEditor({
  open,
  property,
  onClose,
  onSaved,
}: {
  open: boolean;
  property: Property | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { data, commit, busy } = useAdmin();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('general');
  const [dirty, setDirty] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '',
    slug: '',
    code: '',
    kind: 'homestay' as Property['kind'],
    area: 'Cúc Phương',
    address: '',
    shortDescription: '',
    description: '',
    cover: '',
    amenities: [] as string[],
    publication: 'draft' as Property['publication'],
    featured: false,
    checkIn: '14:00',
    checkOut: '12:00',
    maxGuests: 4,
    policyNote: '',
    seoTitle: '',
    seoDescription: '',
  });

  useEffect(() => {
    if (!open) return;
    setTab('general');
    setDirty(false);
    setErrors({});
    setSlugTouched(Boolean(property));
    setForm(
      property
        ? {
            name: property.name,
            slug: property.slug,
            code: property.code,
            kind: property.kind,
            area: property.area,
            address: property.address,
            shortDescription: property.shortDescription,
            description: property.description,
            cover: property.cover,
            amenities: [...property.amenities],
            publication: property.publication,
            featured: property.featured,
            checkIn: property.policies.checkIn,
            checkOut: property.policies.checkOut,
            maxGuests: property.policies.maxGuests,
            policyNote: property.policies.note,
            seoTitle: property.seo.title,
            seoDescription: property.seo.description,
          }
        : {
            name: '',
            slug: '',
            code: `PN-${String(data.properties.length + 1).padStart(2, '0')}`,
            kind: 'homestay',
            area: 'Cúc Phương',
            address: '',
            shortDescription: '',
            description: '',
            cover: data.media[0]?.url ?? '',
            amenities: [],
            publication: 'draft',
            featured: false,
            checkIn: '14:00',
            checkOut: '12:00',
            maxGuests: 4,
            policyNote: '',
            seoTitle: '',
            seoDescription: '',
          },
    );
  }, [open, property, data.media, data.properties.length]);

  const patch = (p: Partial<typeof form>) => {
    setForm((f) => {
      const next = { ...f, ...p };
      // The slug follows the name only until somebody edits it by hand.
      if (p.name !== undefined && !slugTouched && !property) next.slug = slugify(p.name);
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Nhập tên nơi lưu trú.';
    if (!form.slug.trim()) e.slug = 'Nhập slug.';
    if (data.properties.some((p) => p.slug === form.slug && p.id !== property?.id)) e.slug = 'Slug đã tồn tại.';
    setErrors(e);
    if (Object.keys(e).length) {
      setTab('general');
      return;
    }
    const id = property?.id ?? (slugify(form.name) || `noi-luu-tru-${Date.now().toString(36)}`);
    const err = await commit(
      'save-property',
      (draft) => {
        const payload = {
          name: form.name.trim(),
          slug: form.slug.trim(),
          code: form.code,
          kind: form.kind,
          area: form.area,
          address: form.address,
          shortDescription: form.shortDescription,
          description: form.description,
          cover: form.cover,
          amenities: form.amenities,
          publication: form.publication,
          featured: form.featured,
          policies: { checkIn: form.checkIn, checkOut: form.checkOut, maxGuests: form.maxGuests, note: form.policyNote },
          seo: { title: form.seoTitle, description: form.seoDescription },
        };
        if (property) {
          const p = draft.properties.find((x) => x.id === property.id);
          if (!p) return 'Không tìm thấy nơi lưu trú.';
          Object.assign(p, payload);
        } else {
          draft.properties.push({
            id,
            gallery: [],
            rating: 0,
            reviewCount: 0,
            fromPrice: 0,
            state: 'active',
            pinned: false,
            ...payload,
          });
        }
      },
      property ? 'Đã lưu nơi lưu trú trong bản demo' : 'Đã thêm nơi lưu trú vào bản demo',
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
      title={property ? `Chỉnh sửa ${property.name}` : 'Thêm nơi lưu trú'}
      subtitle="Thay đổi chỉ áp dụng cho dữ liệu mẫu trong máy; website thật không bị ảnh hưởng."
      footer={
        <>
          <button type="button" className="abtn abtn--ghost" onClick={onClose}>
            Đóng
          </button>
          <button type="button" className="abtn abtn--primary" onClick={save} disabled={busy === 'save-property' || !dirty}>
            {busy === 'save-property' ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </>
      }
    >
      <div className="ptabs" role="tablist" aria-label="Phần thông tin">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'is-active' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="pr__form2">
          <label className="afield">
            <span>Tên nơi lưu trú *</span>
            <input className="ainput" value={form.name} onChange={(e) => patch({ name: e.target.value })} aria-invalid={Boolean(errors.name)} />
            {errors.name && <span className="aerror">{errors.name}</span>}
          </label>
          <label className="afield">
            <span>Slug *</span>
            <input
              className="ainput"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                patch({ slug: e.target.value });
              }}
              aria-invalid={Boolean(errors.slug)}
            />
            {errors.slug && <span className="aerror">{errors.slug}</span>}
          </label>
          <label className="afield">
            <span>Mã nội bộ</span>
            <input className="ainput" value={form.code} onChange={(e) => patch({ code: e.target.value })} />
          </label>
          <label className="afield">
            <span>Loại lưu trú</span>
            <select className="ainput" value={form.kind} onChange={(e) => patch({ kind: e.target.value as Property['kind'] })}>
              {Object.entries(KIND_LABEL).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="afield">
            <span>Khu vực</span>
            <input className="ainput" value={form.area} onChange={(e) => patch({ area: e.target.value })} />
          </label>
          <label className="afield">
            <span>Địa chỉ mô tả</span>
            <input className="ainput" value={form.address} onChange={(e) => patch({ address: e.target.value })} />
          </label>
          <label className="afield pr__full">
            <span>Mô tả ngắn</span>
            <textarea className="ainput" rows={2} value={form.shortDescription} onChange={(e) => patch({ shortDescription: e.target.value })} />
          </label>
          <label className="afield pr__full">
            <span>Mô tả chi tiết</span>
            <textarea className="ainput" rows={4} value={form.description} onChange={(e) => patch({ description: e.target.value })} />
          </label>
          <label className="afield">
            <span>Trạng thái hiển thị</span>
            <select className="ainput" value={form.publication} onChange={(e) => patch({ publication: e.target.value as Property['publication'] })}>
              <option value="draft">Bản nháp</option>
              <option value="published">Đang hiển thị</option>
              <option value="hidden">Tạm ẩn</option>
            </select>
          </label>
          <label className="afield afield--check">
            <input type="checkbox" checked={form.featured} onChange={(e) => patch({ featured: e.target.checked })} />
            <span>Nổi bật trên trang chủ (khác với ghim nội bộ)</span>
          </label>
        </div>
      )}

      {tab === 'rooms' && (
        <div className="pr__rooms-tab">
          <p className="ahint">Loại phòng được quản lý trong bảng “Loại phòng &amp; Quy định giá” ở cuối trang, cùng dữ liệu.</p>
          <ul className="pr__room-list">
            {data.roomTypes
              .filter((t) => t.propertyId === property?.id)
              .map((t) => (
                <li key={t.id}>
                  <strong>{t.name}</strong>
                  <span className="numeric">{t.units} phòng · tối đa {t.capacityMax} khách</span>
                </li>
              ))}
            {!property && <li>Lưu nơi lưu trú trước, sau đó thêm loại phòng.</li>}
          </ul>
        </div>
      )}

      {tab === 'media' && (
        <div className="pr__media-tab">
          <div className="pr__cover">
            {form.cover ? <Image src={form.cover} alt="Ảnh đại diện đang chọn" width={220} height={130} /> : <span>Chưa chọn ảnh</span>}
          </div>
          <MediaPicker value={form.cover} onChange={(url) => patch({ cover: url })} />
          <fieldset className="pr__amenities">
            <legend>Tiện ích</legend>
            {AMENITIES.map((a) => (
              <label key={a.id}>
                <input
                  type="checkbox"
                  checked={form.amenities.includes(a.id)}
                  onChange={(e) =>
                    patch({ amenities: e.target.checked ? [...form.amenities, a.id] : form.amenities.filter((x) => x !== a.id) })
                  }
                />
                {a.label}
              </label>
            ))}
          </fieldset>
        </div>
      )}

      {tab === 'policy' && (
        <div className="pr__form2">
          <label className="afield">
            <span>Giờ nhận phòng</span>
            <input type="time" className="ainput" value={form.checkIn} onChange={(e) => patch({ checkIn: e.target.value })} />
          </label>
          <label className="afield">
            <span>Giờ trả phòng</span>
            <input type="time" className="ainput" value={form.checkOut} onChange={(e) => patch({ checkOut: e.target.value })} />
          </label>
          <label className="afield">
            <span>Số khách tối đa / phòng</span>
            <input type="number" min={1} max={12} className="ainput" value={form.maxGuests} onChange={(e) => patch({ maxGuests: Number(e.target.value) })} />
          </label>
          <label className="afield pr__full">
            <span>Ghi chú chính sách</span>
            <textarea className="ainput" rows={3} value={form.policyNote} onChange={(e) => patch({ policyNote: e.target.value })} />
          </label>
          <p className="ahint pr__full">
            Thông tin liên hệ chủ cơ sở lấy từ cấu hình chung; bản demo chưa có số điện thoại thật nên trường này để trống.
          </p>
        </div>
      )}

      {tab === 'seo' && (
        <div className="pr__form2">
          <label className="afield pr__full">
            <span>Meta title</span>
            <input className="ainput" value={form.seoTitle} onChange={(e) => patch({ seoTitle: e.target.value })} maxLength={70} />
            <span className="ahint">{form.seoTitle.length}/70 ký tự</span>
          </label>
          <label className="afield pr__full">
            <span>Meta description</span>
            <textarea className="ainput" rows={3} value={form.seoDescription} onChange={(e) => patch({ seoDescription: e.target.value })} maxLength={160} />
            <span className="ahint">{form.seoDescription.length}/160 ký tự</span>
          </label>
          <p className="ahint pr__full">Số ký tự chỉ là gợi ý hiển thị, không đảm bảo thứ hạng tìm kiếm.</p>
        </div>
      )}
    </FormDrawer>
  );
}
