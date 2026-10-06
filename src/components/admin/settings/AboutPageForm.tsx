'use client';

import { useState, type ComponentType } from 'react';
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
type ListName = 'values' | 'steps' | 'areas' | 'faqs';

const KEY = 'about.page';
const BRAND_SUFFIX = ' | Cúc Phương Travel';

const LISTS: Record<ListName, { label: string; item: string; add: string; max: number; prefix: string; fields: string[]; template: () => Rec; titleKey: string }> = {
  values: { label: 'Các giá trị', item: 'Giá trị', add: '+ Thêm giá trị', max: 8, prefix: 'value', fields: ['enabled', 'icon', 'title', 'text'], titleKey: 'title', template: () => ({ enabled: true, icon: 'check', title: '', text: '' }) },
  steps: { label: 'Các bước', item: 'Bước', add: '+ Thêm bước', max: 8, prefix: 'step', fields: ['enabled', 'title', 'text'], titleKey: 'title', template: () => ({ enabled: true, title: '', text: '' }) },
  areas: { label: 'Các thẻ địa phương', item: 'Thẻ', add: '+ Thêm thẻ', max: 8, prefix: 'area', fields: ['enabled', 'icon', 'title', 'text', 'imageMediaId', 'linkLabel', 'linkTarget'], titleKey: 'title', template: () => ({ enabled: true, icon: 'trees', title: '', text: '', linkLabel: '', linkTarget: '', imageMediaId: null }) },
  faqs: { label: 'Câu hỏi và trả lời', item: 'Câu hỏi', add: '+ Thêm câu hỏi', max: 12, prefix: 'faq', fields: ['enabled', 'question', 'answer'], titleKey: 'question', template: () => ({ enabled: true, question: '', answer: { type: 'doc', content: [{ type: 'paragraph' }] } }) },
};

const SECTIONS: Array<{ id: string; title: string; hint?: string; fields: string[]; list?: ListName }> = [
  { id: 'hero', title: 'Đầu trang', hint: 'Tiêu đề H1 nên chứa từ khoá chính, ví dụ “Đặt phòng Cúc Phương”.', fields: ['enabled', 'heroEyebrow', 'title', 'intro', 'heroImageMediaId', 'phoneCtaLabel', 'zaloCtaLabel', 'contactCtaLabel'] },
  { id: 'story', title: 'Câu chuyện', fields: ['storyTitle', 'greeting', 'story', 'portraitMediaId', 'quote', 'signatureNote'] },
  { id: 'values', title: 'Giá trị', fields: ['valuesTitle', 'valuesIntro'], list: 'values' },
  { id: 'steps', title: 'Cách mình đồng hành', fields: ['stepsTitle', 'stepsIntro'], list: 'steps' },
  { id: 'areas', title: 'Hiểu Cúc Phương như người nhà', hint: 'Chỉ ghi thông tin công khai đã kiểm chứng; liên kết chỉ nhận đường dẫn nội bộ.', fields: ['areasTitle', 'areasIntro'], list: 'areas' },
  { id: 'faq', title: 'Câu hỏi thường gặp', hint: 'Các câu hỏi đang hiển thị cũng được đưa vào dữ liệu FAQPage cho Google.', fields: ['showFaq', 'faqTitle'], list: 'faqs' },
  { id: 'cta', title: 'Dải kêu gọi cuối trang', fields: ['ctaTitle', 'ctaText', 'ctaStaysLabel'] },
  { id: 'seo', title: 'SEO & chia sẻ', fields: ['seoTitle', 'seoDescription', 'ogDescription', 'ogImageMediaId', 'areaServed'] },
];

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
    case 'intro': return <Meter count={words(value)} unit="từ" min={60} max={90} />;
    case 'story': return <Meter count={words(value)} unit="từ" min={250} max={400} />;
    case 'seoTitle': return <Meter count={plain(value).length + (plain(value) ? BRAND_SUFFIX.length : 0)} unit="ký tự" max={60} note="(đã gồm “| Cúc Phương Travel”)" />;
    case 'seoDescription': return <Meter count={plain(value).length} unit="ký tự" min={150} max={160} />;
    case 'ogDescription': return <Meter count={plain(value).length} unit="ký tự" max={120} />;
    default: return null;
  }
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
      <nav className="about-form__nav" aria-label="Các phần của trang Về mình">
        {SECTIONS.map((section, index) => <a key={section.id} href={`#about-form-${section.id}`}>{index + 1}. {section.title}</a>)}
        <a href="/ve-minh" target="_blank" rel="noopener">Xem trang ↗</a>
      </nav>
      {SECTIONS.map((section, index) => (
        <fieldset key={section.id} id={`about-form-${section.id}`} className="settings-form__section about-form__section">
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
