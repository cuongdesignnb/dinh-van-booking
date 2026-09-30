'use client';

import { Bold, Eye, Italic, Link2, List, Trash2, X } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import { useEffect, useRef, useState } from 'react';
import { DEMO_TODAY } from '@/data/admin/fixture-clock';
import { DEST_CATEGORY_LABEL } from '@/lib/admin/formatters';
import { seoChecklist } from '@/lib/admin/selectors';
import type { AdminDestination } from '@/lib/admin/types';
import { useAdmin } from '../AdminStore';
import { ConfirmDialog, Panel } from '../shared/ui';
import { MediaPicker } from './MediaPicker';

const TABS = [
  { id: 'general', label: 'Thông tin chung' },
  { id: 'media', label: 'Hình ảnh & media' },
  { id: 'content', label: 'Nội dung chi tiết' },
  { id: 'seo', label: 'SEO' },
] as const;

const SITE_URL = 'https://dinhvanbooking.example/diem-den';

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

interface Form {
  name: string;
  slug: string;
  category: AdminDestination['category'];
  publication: AdminDestination['publication'];
  shortDescription: string;
  content: string;
  image: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  ogImage: string | null;
}

const EMPTY: Form = {
  name: '',
  slug: '',
  category: 'nature',
  publication: 'draft',
  shortDescription: '',
  content: '',
  image: '',
  tags: [],
  seoTitle: '',
  seoDescription: '',
  ogImage: null,
};

export function DestinationEditor({
  destination,
  creating,
  onSelect,
  onClose,
  onPreview,
  asDrawer,
}: {
  destination?: AdminDestination | null;
  creating?: boolean;
  onSelect: (id: string) => void;
  onClose?: () => void;
  onPreview: (d: AdminDestination) => void;
  asDrawer?: boolean;
}) {
  const { data, commit, busy } = useAdmin();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('general');
  const [form, setForm] = useState<Form>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmSwitch, setConfirmSwitch] = useState<string | null>(null);
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const currentId = useRef<string | null>(null);

  useEffect(() => {
    if (asDrawer && !creating) return;
    const source = destination ?? null;
    if (source && currentId.current === source.id) return;
    currentId.current = source?.id ?? null;
    setTab('general');
    setDirty(false);
    setErrors({});
    setSlugTouched(Boolean(source));
    setForm(
      source
        ? {
            name: source.name,
            slug: source.slug,
            category: source.category,
            publication: source.publication,
            shortDescription: source.shortDescription,
            content: source.content,
            image: source.image,
            tags: [...source.tags],
            seoTitle: source.seo.title,
            seoDescription: source.seo.description,
            ogImage: source.seo.ogImage,
          }
        : { ...EMPTY, image: data.media[0]?.url ?? '' },
    );
  }, [destination, creating, asDrawer, data.media]);

  if (asDrawer && !creating) return null;
  if (!asDrawer && !destination) return null;

  const patch = (p: Partial<Form>) => {
    setForm((f) => {
      const next = { ...f, ...p };
      if (p.name !== undefined && !slugTouched) next.slug = slugify(p.name);
      return next;
    });
    setDirty(true);
  };

  const checklist = seoChecklist({
    name: form.name,
    shortDescription: form.shortDescription,
    image: form.image,
    category: form.category,
    content: form.content,
    tags: form.tags,
    seo: { title: form.seoTitle, description: form.seoDescription, ogImage: form.ogImage },
  });

  const wrap = (before: string, after = before) => {
    const el = contentRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const next = `${value.slice(0, s)}${before}${value.slice(s, e)}${after}${value.slice(e)}`;
    patch({ content: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, e + before.length);
    });
  };

  const save = async (publish?: boolean) => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Tên điểm đến là bắt buộc.';
    if (!form.slug.trim()) e.slug = 'Slug là bắt buộc.';
    if (data.destinations.some((d) => d.slug === form.slug && d.id !== destination?.id)) e.slug = 'Slug này đã được dùng.';
    if (form.shortDescription.length > 200) e.short = 'Mô tả ngắn tối đa 200 ký tự.';
    setErrors(e);
    if (Object.keys(e).length) {
      setTab('general');
      return;
    }
    const id = destination?.id ?? (slugify(form.name) || `diem-den-${Date.now().toString(36)}`);
    const err = await commit(
      'save-destination',
      (draft) => {
        const payload = {
          name: form.name.trim(),
          slug: form.slug.trim(),
          category: form.category,
          publication: publish ? ('published' as const) : form.publication,
          shortDescription: form.shortDescription,
          content: form.content,
          image: form.image,
          tags: form.tags,
          updatedAt: DEMO_TODAY,
          seo: { title: form.seoTitle, description: form.seoDescription, ogImage: form.ogImage },
        };
        if (destination) {
          const d = draft.destinations.find((x) => x.id === destination.id);
          if (!d) return 'Không tìm thấy điểm đến.';
          Object.assign(d, payload);
        } else {
          draft.destinations.unshift({ id, gallery: [form.image], views: 0, ...payload });
        }
      },
      publish ? 'Đã xuất bản trong bản demo (website thật chưa thay đổi)' : 'Đã lưu thay đổi trong bản demo',
    );
    if (!err) {
      setDirty(false);
      onSelect(id);
      onClose?.();
    }
  };

  const body = (
    <>
      <div className="ct__etabs" role="tablist" aria-label="Phần nội dung">
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
        <div className="ct__form">
          <div className="ct__thumbrow">
            <div className="ct__thumb-lg">
              {form.image ? <Image src={form.image} alt="Ảnh đại diện" width={120} height={96} /> : <span>Chưa có ảnh</span>}
            </div>
            <MediaPicker value={form.image} onChange={(url) => patch({ image: url })} />
          </div>
          <label className="afield">
            <span>Tiêu đề *</span>
            <input className="ainput" value={form.name} onChange={(e) => patch({ name: e.target.value })} aria-invalid={Boolean(errors.name)} />
            {errors.name && <span className="aerror">{errors.name}</span>}
          </label>
          <label className="afield">
            <span>Slug (đường dẫn) *</span>
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
            {destination?.publication === 'published' && form.slug !== destination.slug && (
              <span className="ahint">
                Slug của trang đã xuất bản sẽ đổi. Cần tạo chuyển hướng ở backend; bản demo chỉ ghi nhận thay đổi, chưa tạo
                redirect thật.
              </span>
            )}
          </label>
          <div className="ct__form2">
            <label className="afield">
              <span>Danh mục *</span>
              <select className="ainput" value={form.category} onChange={(e) => patch({ category: e.target.value as Form['category'] })}>
                {Object.entries(DEST_CATEGORY_LABEL).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="afield">
              <span>Trạng thái</span>
              <select className="ainput" value={form.publication} onChange={(e) => patch({ publication: e.target.value as Form['publication'] })}>
                <option value="draft">Bản nháp</option>
                <option value="published">Đang hiển thị</option>
                <option value="hidden">Tạm ẩn</option>
              </select>
            </label>
          </div>
          <label className="afield">
            <span>Mô tả ngắn *</span>
            <textarea className="ainput" rows={3} maxLength={200} value={form.shortDescription} onChange={(e) => patch({ shortDescription: e.target.value })} />
            <span className="ahint ct__counter">{form.shortDescription.length}/200</span>
            {errors.short && <span className="aerror">{errors.short}</span>}
          </label>
          <div className="afield">
            <span>Thẻ nội dung</span>
            <ul className="ct__tags">
              {form.tags.map((t) => (
                <li key={t}>
                  {t}
                  <button type="button" onClick={() => patch({ tags: form.tags.filter((x) => x !== t) })} aria-label={`Xóa thẻ ${t}`}>
                    <X size={11} aria-hidden="true" />
                  </button>
                </li>
              ))}
              <li className="ct__tag-add">
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagDraft.trim()) {
                      e.preventDefault();
                      patch({ tags: [...new Set([...form.tags, tagDraft.trim()])] });
                      setTagDraft('');
                    }
                  }}
                  placeholder="Thêm thẻ…"
                  aria-label="Thêm thẻ nội dung"
                />
              </li>
            </ul>
          </div>
        </div>
      )}

      {tab === 'media' && (
        <div className="ct__form">
          <div className="ct__thumbrow">
            <div className="ct__thumb-lg">{form.image && <Image src={form.image} alt="Ảnh đại diện" width={160} height={110} />}</div>
            <div>
              <MediaPicker value={form.image} onChange={(url) => patch({ image: url })} label="Chọn ảnh đại diện" />
              <MediaPicker value={form.ogImage ?? ''} onChange={(url) => patch({ ogImage: url })} label="Chọn ảnh chia sẻ (OG)" />
            </div>
          </div>
          <p className="ahint">
            Ảnh được dùng ở: danh sách điểm đến, trang chi tiết và thẻ chia sẻ mạng xã hội. Ảnh tải lên chỉ tồn tại trong phiên
            làm việc này.
          </p>
        </div>
      )}

      {tab === 'content' && (
        <div className="ct__form">
          <div className="ct__toolbar" role="toolbar" aria-label="Định dạng nội dung">
            <button type="button" onClick={() => wrap('**')} aria-label="In đậm">
              <Bold size={14} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => wrap('_')} aria-label="In nghiêng">
              <Italic size={14} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => wrap('\n- ', '')} aria-label="Danh sách">
              <List size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                const url = window.prompt('Nhập đường dẫn (https://…)');
                if (!url) return;
                if (!/^https?:\/\//i.test(url)) {
                  window.alert('Chỉ chấp nhận đường dẫn http(s).');
                  return;
                }
                wrap('[', `](${url})`);
              }}
              aria-label="Chèn liên kết"
            >
              <Link2 size={14} aria-hidden="true" />
            </button>
          </div>
          <textarea
            ref={contentRef}
            className="ainput ct__content"
            rows={12}
            value={form.content}
            onChange={(e) => patch({ content: e.target.value })}
            aria-label="Nội dung chi tiết"
          />
          <p className="ahint">Nội dung lưu ở dạng văn bản có đánh dấu đơn giản; hệ thống không chèn HTML thô chưa kiểm tra.</p>
        </div>
      )}

      {tab === 'seo' && (
        <div className="ct__form">
          <label className="afield">
            <span>Meta title</span>
            <input className="ainput" maxLength={70} value={form.seoTitle} onChange={(e) => patch({ seoTitle: e.target.value })} />
            <span className="ahint ct__counter">{form.seoTitle.length}/70</span>
          </label>
          <label className="afield">
            <span>Meta description</span>
            <textarea className="ainput" rows={3} maxLength={160} value={form.seoDescription} onChange={(e) => patch({ seoDescription: e.target.value })} />
            <span className="ahint ct__counter">{form.seoDescription.length}/160</span>
          </label>
          <div className="afield">
            <span>Ảnh chia sẻ (OG image)</span>
            <MediaPicker value={form.ogImage ?? ''} onChange={(url) => patch({ ogImage: url })} label={form.ogImage ? 'Đổi ảnh chia sẻ' : 'Chọn ảnh chia sẻ'} />
          </div>
        </div>
      )}

      <div className="ct__seo-preview">
        <header>
          <h3>Xem trước SEO (mô phỏng)</h3>
          <div className="ct__device" role="group" aria-label="Kiểu xem trước">
            <button type="button" aria-pressed={deviceView === 'desktop'} onClick={() => setDeviceView('desktop')}>
              Desktop
            </button>
            <button type="button" aria-pressed={deviceView === 'mobile'} onClick={() => setDeviceView('mobile')}>
              Mobile
            </button>
          </div>
        </header>
        <div className={`ct__serp ct__serp--${deviceView}`}>
          <p className="ct__serp-url">
            {SITE_URL}/{form.slug || 'duong-dan'}
          </p>
          <p className="ct__serp-title">{form.seoTitle || form.name || 'Tiêu đề trang'}</p>
          <p className="ct__serp-desc">{form.seoDescription || form.shortDescription || 'Mô tả sẽ hiển thị ở đây.'}</p>
        </div>
        <p className="ahint">Đây là mô phỏng hiển thị, không đảm bảo Google hiển thị đúng như vậy. Tên miền dùng giá trị preview.</p>
      </div>

      <div className="ct__checklist">
        <h3>Checklist xuất bản</h3>
        <ul>
          {checklist.map((c) => (
            <li key={c.id} className={c.ok ? 'is-ok' : undefined}>
              <span aria-hidden="true">{c.ok ? '✓' : '○'}</span> {c.label}
            </li>
          ))}
        </ul>
        <p className="ahint">{checklist.filter((c) => c.ok).length}/{checklist.length} trường cơ bản đã có.</p>
      </div>

      <footer className="ct__editor-foot">
        <div>
          <button
            type="button"
            className="abtn abtn--danger abtn--sm"
            disabled={!destination}
            onClick={() => setConfirmSwitch('delete')}
          >
            <Trash2 size={13} aria-hidden="true" /> Xóa
          </button>
        </div>
        <div className="ct__editor-actions">
          <button
            type="button"
            className="abtn abtn--ghost"
            onClick={() =>
              destination
                ? onPreview({ ...destination, ...{ name: form.name, shortDescription: form.shortDescription, content: form.content, image: form.image } })
                : undefined
            }
          >
            <Eye size={14} aria-hidden="true" /> Xem trước
          </button>
          <button type="button" className="abtn abtn--primary" disabled={!dirty || busy === 'save-destination'} onClick={() => save()}>
            {busy === 'save-destination' ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </footer>

      <ConfirmDialog
        open={confirmSwitch === 'delete'}
        onClose={() => setConfirmSwitch(null)}
        tone="danger"
        title="Xóa điểm đến"
        confirmLabel="Xóa"
        onConfirm={async () => {
          if (!destination) return;
          await commit(
            'del-dest',
            (draft) => {
              draft.destinations = draft.destinations.filter((d) => d.id !== destination.id);
            },
            'Đã xóa điểm đến khỏi bản demo',
          );
          setConfirmSwitch(null);
        }}
      >
        <p>Xóa “{destination?.name}” khỏi dữ liệu mẫu?</p>
      </ConfirmDialog>
    </>
  );

  if (asDrawer) {
    return (
      <div className="ct__drawer">
        <Panel title="Thêm điểm đến" action={<button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng"><X size={16} aria-hidden="true" /></button>}>
          {body}
        </Panel>
      </div>
    );
  }

  return (
    <Panel
      title="Chỉnh sửa điểm đến"
      className="ct__editor"
      action={
        <button type="button" className="icon-btn" onClick={() => onClose?.()} aria-label="Đóng trình soạn thảo">
          <X size={16} aria-hidden="true" />
        </button>
      }
    >
      {body}
    </Panel>
  );
}
