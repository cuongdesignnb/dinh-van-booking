'use client';

import { AlertTriangle, CheckCircle2, CircleAlert } from 'lucide-react';
import { schemaStatus, MIN_SUBSTANTIVE_TEXT, type SchemaInputs } from '@/lib/seo/schema-rules';
import { fullSeoTitle, useSeoContext } from './useSeoContext';

type Props = {
  kind: SchemaInputs['kind'];
  title: string;
  metaTitle: string;
  metaDescription: string;
  /** Current public path (null = slug not generated yet). */
  path: string | null;
  hasCover: boolean;
  bodyText: string;
  noindex: boolean;
  schema?: Pick<SchemaInputs, 'propertyKind' | 'roomTypeCount' | 'itineraryDays' | 'authorName'>;
};

const TITLE_MAX = 60;
const DESCRIPTION_MIN = 70;
const DESCRIPTION_MAX = 160;

/**
 * Read-only SEO panel: Google-style preview, canonical/robots preview, warnings
 * (never blocks saving a draft) and the structured data the page will emit.
 * JSON-LD is generated from typed DB fields; there is no free JSON-LD input.
 */
export function AdminSeoPanel({ kind, title, metaTitle, metaDescription, path, hasCover, bodyText, noindex, schema }: Props) {
  const context = useSeoContext();
  const shownTitle = fullSeoTitle(metaTitle.trim() || title.trim(), context);
  const description = metaDescription.trim();
  const textLength = bodyText.replace(/\s+/g, ' ').trim().length;
  const url = path ? `${context.origin ?? ''}${path}` : null;

  const warnings: string[] = [];
  if (!metaTitle.trim()) warnings.push('Tiêu đề SEO đang trống (sẽ dùng tiêu đề nội dung).');
  if (shownTitle.length > TITLE_MAX) warnings.push(`Tiêu đề hiển thị dài ${shownTitle.length} ký tự (nên ≤ ${TITLE_MAX}).`);
  if (!description) warnings.push('Mô tả SEO đang trống.');
  else if (description.length < DESCRIPTION_MIN) warnings.push(`Mô tả SEO quá ngắn (${description.length} ký tự, nên ${DESCRIPTION_MIN}–${DESCRIPTION_MAX}).`);
  else if (description.length > DESCRIPTION_MAX) warnings.push(`Mô tả SEO quá dài (${description.length} ký tự, nên ≤ ${DESCRIPTION_MAX}).`);
  if (description && description.toLocaleLowerCase('vi') === (metaTitle.trim() || title.trim()).toLocaleLowerCase('vi')) warnings.push('Mô tả SEO trùng tiêu đề.');
  if (!hasCover) warnings.push('Chưa có ảnh đại diện (dùng làm ảnh chia sẻ OG/Twitter).');
  if (!path) warnings.push('Chưa Generate đường dẫn: chưa thể xuất bản.');
  if (noindex) warnings.push('Đang bật noindex: trang sẽ không vào Google và sitemap.');
  if (textLength < MIN_SUBSTANTIVE_TEXT) warnings.push(`Nội dung mỏng (${textLength} ký tự, cần ≥ ${MIN_SUBSTANTIVE_TEXT} để được index và có schema).`);

  const status = schemaStatus({ kind, hasSlug: !!path, hasCover, bodyTextLength: textLength, noindex, ...schema });
  const missingSchema = status.filter((item) => !item.ok && item.note?.startsWith('thiếu'));
  if (missingSchema.length) warnings.push(`Schema thiếu dữ liệu: ${missingSchema.map((item) => `${item.type} (${item.note})`).join('; ')}.`);

  const robots = noindex
    ? 'noindex, follow (nội dung này tắt lập chỉ mục)'
    : context.indexingAllowed ? 'index, follow' : 'noindex, follow (toàn site chưa được Owner bật index)';

  return <section className="admin-seo-panel" aria-labelledby={`seo-panel-${kind}`} data-testid="seo-panel">
    <h4 id={`seo-panel-${kind}`}>SEO: xem trước và kiểm tra</h4>
    <div className="admin-seo-panel__serp" aria-label="Xem trước kết quả Google">
      <span className="admin-seo-panel__serp-url">{url ?? 'Chưa có đường dẫn'}</span>
      <strong className="admin-seo-panel__serp-title">{shownTitle || 'Chưa có tiêu đề'}</strong>
      <span className="admin-seo-panel__serp-desc">{description || 'Chưa có mô tả SEO.'}</span>
    </div>
    <dl className="admin-seo-panel__facts">
      <dt>Canonical</dt>
      <dd>{path && context.canonicalApproved ? <code>{url}</code> : path ? 'Chưa phát: domain chính thức chưa được Owner duyệt' : 'Chưa có (chưa Generate đường dẫn)'}</dd>
      <dt>Robots</dt>
      <dd>{robots}</dd>
      <dt>Ảnh OG</dt>
      <dd>{hasCover ? 'Ảnh đại diện' : 'Chưa có (dùng ảnh OG mặc định của site nếu có)'}</dd>
    </dl>
    {warnings.length > 0 && <ul className="admin-seo-panel__warnings" data-testid="seo-warnings">
      {warnings.map((warning) => <li key={warning}><AlertTriangle size={14} aria-hidden="true" /> {warning}</li>)}
    </ul>}
    <div className="admin-seo-panel__schema" data-testid="seo-schema-status">
      <strong>Schema (JSON-LD tự sinh từ dữ liệu)</strong>
      <ul>
        {status.map((item) => <li key={item.type} className={item.ok ? 'is-ok' : 'is-missing'}>
          {item.ok ? <CheckCircle2 size={14} aria-hidden="true" /> : <CircleAlert size={14} aria-hidden="true" />}
          <span>{item.ok ? '✓' : '!'} {item.type}{item.note ? `: ${item.note}` : ''}</span>
        </li>)}
      </ul>
    </div>
  </section>;
}
