'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { isReservedSlug, publicPath, slugFromTitle, slugify, type PublicContentKind } from '@/lib/slug';

type Props = {
  title: string;
  value: string;
  originalValue?: string | null;
  mode: 'create' | 'edit';
  kind: PublicContentKind;
  onChange: (slug: string) => void;
  disabled?: boolean;
};

export function AdminSlugField({ title, value, originalValue, mode, kind, onChange, disabled }: Props) {
  const normalized = value.trim() ? slugify(value) : '';
  const changed = mode === 'edit' && normalized !== (originalValue ?? '');
  const reserved = normalized !== '' && isReservedSlug(normalized);
  const invalid = !normalized || (mode === 'edit' && reserved);
  const preview = publicPath(kind, normalized || '…');

  return <div className="afield admin-slug-field">
    <label htmlFor={`admin-slug-${kind}`}>Slug đường dẫn</label>
    <div className="admin-slug-field__row">
      <input
        id={`admin-slug-${kind}`}
        className="ainput"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={160}
        required
        aria-invalid={invalid}
        aria-describedby={`admin-slug-help-${kind}`}
        disabled={disabled}
      />
      <button type="button" className="abtn abtn--ghost" onClick={() => onChange(slugFromTitle(title))} disabled={disabled || !title.trim()}>
        <RefreshCw size={15} aria-hidden="true" /> Tạo slug từ tiêu đề
      </button>
    </div>
    <span className="admin-slug-field__preview">URL: <code>{preview}</code></span>
    <small id={`admin-slug-help-${kind}`} className="ahint">
      {mode === 'create'
        ? 'Slug tự tạo từ tiêu đề đến khi bạn sửa thủ công. Lưu mới ghi đường dẫn.'
        : 'Đổi tiêu đề không đổi URL. Chỉ sửa slug hoặc bấm nút tạo lại nếu muốn đổi đường dẫn.'}
    </small>
    {!normalized && <small className="admin-slug-field__invalid">Nhập tiêu đề hoặc slug để tạo đường dẫn.</small>}
    {reserved && <small className={mode === 'edit' ? 'admin-slug-field__invalid' : 'ahint'}>
      {mode === 'edit' ? 'Slug này là đường dẫn hệ thống; hãy chọn slug khác.' : 'Slug này được bảo vệ; khi tạo mới server sẽ thêm hậu tố an toàn.'}
    </small>}
    {changed && <p className="admin-slug-field__warning" role="status">
      <AlertTriangle size={16} aria-hidden="true" /> Bạn đang thay đổi đường dẫn công khai. Đường dẫn cũ sẽ được giữ làm chuyển hướng sau khi lưu.
    </p>}
  </div>;
}
