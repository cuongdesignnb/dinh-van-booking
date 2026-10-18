'use client';

import { useState, type ComponentType } from 'react';
import { ABOUT_SAMPLE } from '@/lib/about-sample';
import { richDocumentToText } from '@/lib/content/rich-document';

/**
 * Structured editor for the `about.page` setting (/ve-minh). Every leaf field
 * is rendered by the shared settings `ValueField`, so short texts are inputs,
 * long texts use the existing TipTap editor and every image uses the Media
 * Library picker. This component only adds the page structure, SEO length
 * hints and list controls (add, remove, reorder by buttons or drag handle).
 */

type FieldProps = { settingKey: string; path: string; value: unknown; onChange: (next: unknown) => void; disabled: boolean };
type Rec = Record<string, unknown>;
type ListName = 'highlights' | 'storyPhotos' | 'values' | 'services' | 'faqs';

const KEY = 'about.page';
const BRAND_SUFFIX = ' | Cúc Phương Travel';

const LISTS: Record<ListName, { label: string; item: string; add: string; max: number; prefix: string; fields: string[]; template: () => Rec; titleKey: string }> = {
  highlights: { label: 'Ba điểm nổi bật dưới nút', item: 'Điểm nổi bật', add: '+ Thêm điểm nổi bật', max: 3, prefix: 'highlight', fields: ['enabled', 'icon', 'title', 'text'], titleKey: 'title', template: () => ({ enabled: true, icon: 'heart', title: '', text: '' }) },
  storyPhotos: { label: 'Ảnh polaroid', item: 'Ảnh', add: '+ Thêm ảnh', max: 2, prefix: 'photo', fields: ['enabled', 'imageMediaId', 'caption'], titleKey: 'caption', template: () => ({ enabled: true, imageMediaId: null, caption: '' }) },
  values: { label: 'Các giá trị', item: 'Giá trị', add: '+ Thêm giá trị', max: 4, prefix: 'value', fields: ['enabled', 'icon', 'title', 'text'], titleKey: 'title', template: () => ({ enabled: true, icon: 'check', title: '', text: '' }) },
  services: { label: 'Các thẻ hỗ trợ', item: 'Thẻ hỗ trợ', add: '+ Thêm thẻ', max: 4, prefix: 'service', fields: ['enabled', 'icon', 'title', 'text', 'linkTarget'], titleKey: 'title', template: () => ({ enabled: true, icon: 'bed', title: '', text: '', linkTarget: '' }) },
  faqs: { label: 'Câu hỏi và trả lời', item: 'Câu hỏi', add: '+ Thêm câu hỏi', max: 12, prefix: 'faq', fields: ['enabled', 'question', 'answer'], titleKey: 'question', template: () => ({ enabled: true, question: '', answer: { type: 'doc', content: [{ type: 'paragraph' }] } }) },
};

const SECTIONS: Array<{ id: string; title: string; hint?: string; fields: string[]; list?: ListName }> = [
  { id: 'hero', title: 'Đầu trang', hint: 'Ảnh lớn bên phải nên là ảnh dọc/ngang chụp chính bạn giữa thiên nhiên Cúc Phương. Tiêu đề H1 nên có từ khoá “Cúc Phương”.', fields: ['enabled', 'title', 'intro', 'heroImageMediaId', 'primaryCtaLabel', 'primaryCtaTarget', 'contactCtaLabel', 'heroScript', 'heroNote'], list: 'highlights' },
  { id: 'story', title: 'Câu chuyện của mình', hint: 'Kể bằng giọng người bản địa: bạn sinh ra, lớn lên và gắn bó với Cúc Phương thế nào. Hai ảnh polaroid hiện bên trái; chưa có ảnh thì dùng ảnh chân dung người tư vấn.', fields: ['storyEyebrow', 'storyTitle', 'story'], list: 'storyPhotos' },
  { id: 'values', title: 'Giá trị mình theo đuổi', fields: ['valuesEyebrow', 'valuesTitle', 'valuesIntro'], list: 'values' },
  { id: 'services', title: 'Mình có thể hỗ trợ bạn điều gì?', hint: 'Chỉ giữ những dịch vụ bạn thực sự cung cấp. Đường dẫn chỉ nhận trang nội bộ, ví dụ /phong-nghi.', fields: ['servicesTitle', 'servicesIntro'], list: 'services' },
  { id: 'faq', title: 'Câu hỏi thường gặp', hint: 'Các câu hỏi đang hiển thị cũng được đưa vào dữ liệu FAQPage cho Google.', fields: ['showFaq', 'faqTitle', 'faqIntro'], list: 'faqs' },
  { id: 'contact', title: 'Khối liên hệ', hint: 'Email, Facebook, số điện thoại, Zalo và địa chỉ lấy từ Cài đặt › Thương hiệu (Liên hệ, Mạng xã hội). Chỉ ghi giờ hỗ trợ bạn thực sự trực.', fields: ['contactEyebrow', 'contactTitle', 'contactText', 'contactZaloLabel', 'contactNote', 'contactImageMediaId'] },
  { id: 'seo', title: 'SEO & chia sẻ', fields: ['seoTitle', 'seoDescription', 'ogDescription', 'ogImageMediaId', 'areaServed'] },
];

/** Media and on/off state are the owner's; the sample only fills text and lists. */
function withSample(current: Rec): Rec {
  const keepMedia = (rows: unknown, sample: unknown) => (Array.isArray(sample) ? sample.map((row, index) => {
    const existing = Array.isArray(rows) && isRecord(rows[index]) ? rows[index] as Rec : null;
    return isRecord(row) && existing && 'imageMediaId' in row ? { ...row, imageMediaId: existing.imageMediaId ?? null } : row;
  }) : sample);
  const next: Rec = { ...current };
  for (const [key, value] of Object.entries(ABOUT_SAMPLE)) next[key] = key === 'storyPhotos' ? keepMedia(current.storyPhotos, value) : structuredClone(value);
  return next;
}

function isRecord(value: unknown): value is Rec {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function plain(value: unknown): string {
  return typeof value === 'string' ? value.trim() : richDocumentToText(value);
}

function words(value: unknown): number {
  return plain(value).split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/** Live length hint; `min`/`max` are the recommended range, not a hard limit. */
function Meter({ count, unit, min, max, note }: { count: number; unit: string; min?: number; max: number; note?: string }) {
  const ok = count > 0 && count <= max && (min === undefined || count >= min);
  return (
    <small className="about-form__meter" data-state={count === 0 ? 'empty' : ok ? 'ok' : 'warn'}>
      {count} {unit} · nên {min !== undefined ? `${min}–${max}` : `tối đa ${max}`}{note ? ` ${note}` : ''}
    </small>
  );
}

function meterFor(key: string, value: unknown) {
  switch (key) {
    case 'intro': return <Meter count={words(value)} unit="từ (không tính dấu câu)" min={60} max={90} />;
    case 'story': return <Meter count={words(value)} unit="từ (không tính dấu câu)" min={250} max={400} />;
    case 'seoTitle': return <Meter count={plain(value).length + (plain(value) ? BRAND_SUFFIX.length : 0)} unit="ký tự" max={60} note="(đã gồm “| Cúc Phương Travel”)" />;
    case 'seoDescription': return <Meter count={plain(value).length} unit="ký tự" min={150} max={160} />;
    case 'ogDescription': return <Meter count={plain(value).length} unit="ký tự" max={120} />;
    default: return null;
  }
}

/**
 * The Admin shell scrolls an inner panel, so a plain `#hash` jump (or
 * scrollIntoView) would also scroll the locked outer document. Scroll only the
 * nearest scrollable ancestor, then move focus to the section for keyboard users.
 */
function jumpTo(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  let scroller = target.parentElement;
  while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
  const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  // Keep the section legend clear of the sticky section nav.
  const offset = (target.closest('.about-form')?.querySelector('.about-form__nav')?.getBoundingClientRect().height ?? 0) + 16;
  if (scroller) scroller.scrollTo({ top: target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - offset, behavior });
  else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior });
  target.focus({ preventScroll: true });
}

function newId(prefix: string, rows: unknown[]): string {
  const taken = new Set(rows.map((row) => (isRecord(row) ? row.id : null)));
  for (let n = rows.length + 1; ; n += 1) if (!taken.has(`${prefix}-${n}`)) return `${prefix}-${n}`;
}

function ListEditor({ name, rows, onChange, disabled, Field }: { name: ListName; rows: unknown[]; onChange: (rows: unknown[]) => void; disabled: boolean; Field: ComponentType<FieldProps> }) {
  const spec = LISTS[name];
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const ids = rows.map((row, index) => (isRecord(row) && typeof row.id === 'string' ? row.id : `#${index}`));
  const unique = new Set(ids).size === ids.length;
  return (
    <section className="settings-form__array about-form__list" data-about-list={name}>
      <div className="about-form__list-head">
        <h4>{spec.label}</h4>
        <span className="ahint">{rows.length}/{spec.max} mục · kéo ⠿ hoặc dùng ↑ ↓ để đổi thứ tự</span>
      </div>
      {!rows.length && <p className="ahint">Chưa có mục nào. Khối trống sẽ tự ẩn trên website.</p>}
      <ol className="settings-form__repeat-list about-form__items">
        {rows.map((row, index) => {
          const record = isRecord(row) ? row : {};
          const title = plain(record[spec.titleKey]) || `${spec.item} mới (chưa có tiêu đề)`;
          const update = (key: string, next: unknown) => onChange(rows.map((entry, rowIndex) => (rowIndex === index ? { ...record, [key]: next } : entry)));
          return (
            <li
              key={unique ? ids[index] : index}
              className="settings-form__repeat-item about-form__item"
              data-dragging={dragFrom === index || undefined}
              onDragOver={(event) => { if (dragFrom !== null) event.preventDefault(); }}
              onDrop={(event) => { event.preventDefault(); if (dragFrom !== null) onChange(moveItem(rows, dragFrom, index)); setDragFrom(null); }}
            >
              <div className="about-form__item-head">
                <span
                  className="settings-form__drag-handle"
                  draggable={!disabled}
                  title="Kéo để đổi thứ tự"
                  aria-hidden="true"
                  onDragStart={(event) => { setDragFrom(index); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(index)); }}
                  onDragEnd={() => setDragFrom(null)}
                >⠿</span>
                <span className="settings-form__order-number">{index + 1}</span>
                <strong className="about-form__item-title">{title}</strong>
                {record.enabled === false && <span className="about-form__badge">Đang ẩn</span>}
                <span className="about-form__item-actions">
                  <button type="button" className="abtn abtn--ghost abtn--sm" aria-label={`Chuyển ${spec.item.toLowerCase()} ${index + 1} lên`} disabled={disabled || index === 0} onClick={() => onChange(moveItem(rows, index, index - 1))}>↑</button>
                  <button type="button" className="abtn abtn--ghost abtn--sm" aria-label={`Chuyển ${spec.item.toLowerCase()} ${index + 1} xuống`} disabled={disabled || index === rows.length - 1} onClick={() => onChange(moveItem(rows, index, index + 1))}>↓</button>
                  <button type="button" className="abtn abtn--ghost abtn--sm" aria-label={`Xoá ${spec.item.toLowerCase()} ${index + 1}`} disabled={disabled} onClick={() => { if (window.confirm(`Xoá “${title}”? Thay đổi chỉ có hiệu lực sau khi bấm lưu.`)) onChange(rows.filter((_, rowIndex) => rowIndex !== index)); }}>Xoá</button>
                </span>
              </div>
              <div className="settings-form__grid">
                {spec.fields.map((key) => (
                  <Field key={key} settingKey={KEY} path={`${name}[${index}].${key}`} value={record[key] ?? null} onChange={(next) => update(key, next)} disabled={disabled} />
                ))}
              </div>
              {name === 'values' && <Meter count={words(record.text)} unit="từ" min={25} max={40} />}
            </li>
          );
        })}
      </ol>
      <button type="button" className="abtn abtn--ghost abtn--sm" disabled={disabled || rows.length >= spec.max} onClick={() => onChange([...rows, { id: newId(spec.prefix, rows), ...spec.template() }])}>{spec.add}</button>
    </section>
  );
}

export function AboutPageForm({ value, onChange, disabled, Field }: { value: unknown; onChange: (value: unknown) => void; disabled: boolean; Field: ComponentType<FieldProps> }) {
  const root = isRecord(value) ? value : {};
  const set = (key: string, next: unknown) => onChange({ ...root, [key]: next });
  return (
    <div className="settings-form about-form" data-about-form>
      <div className="about-form__sample">
        <p className="ahint">Chưa có nội dung? Điền sẵn nội dung mẫu theo bố cục trang (giọng người bản địa Cúc Phương), rồi sửa lại cho đúng với bạn trước khi lưu. Ảnh và trạng thái bật/tắt được giữ nguyên.</p>
        <button
          type="button"
          className="abtn abtn--ghost abtn--sm"
          disabled={disabled}
          onClick={() => { if (window.confirm('Điền nội dung mẫu sẽ thay chữ hiện có trong form (ảnh giữ nguyên). Chưa có gì được lưu cho tới khi bạn bấm Lưu. Tiếp tục?')) onChange(withSample(root)); }}
        >Điền nội dung mẫu</button>
      </div>
      <nav className="about-form__nav" aria-label="Các phần của trang Về mình">
        {SECTIONS.map((section, index) => <a key={section.id} href={`#about-form-${section.id}`} onClick={(event) => { event.preventDefault(); jumpTo(`about-form-${section.id}`); }}>{index + 1}. {section.title}</a>)}
        <a href="/ve-minh" target="_blank" rel="noopener">Xem trang ↗</a>
      </nav>
      {SECTIONS.map((section, index) => (
        <fieldset key={section.id} id={`about-form-${section.id}`} tabIndex={-1} className="settings-form__section about-form__section">
          <legend>{index + 1}. {section.title}</legend>
          {section.hint && <p className="ahint">{section.hint}</p>}
          <div className="settings-form__grid">
            {section.fields.map((key) => {
              const meter = meterFor(key, root[key]);
              const field = <Field key={key} settingKey={KEY} path={key} value={root[key] ?? null} onChange={(next) => set(key, next)} disabled={disabled} />;
              if (!meter) return field;
              return <div key={key} className={`about-form__metered${['intro', 'story', 'seoDescription', 'ogDescription'].includes(key) ? ' settings-form__field--wide' : ''}`}>{field}{meter}</div>;
            })}
          </div>
          {section.list && <ListEditor name={section.list} rows={Array.isArray(root[section.list]) ? root[section.list] as unknown[] : []} onChange={(rows) => set(section.list!, rows)} disabled={disabled} Field={Field} />}
        </fieldset>
      ))}
    </div>
  );
}
