'use client';

import { AlertTriangle, History, Link2, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { ApiError, apiRequest } from '@/lib/api/client';
import { publicPath, type PublicContentKind } from '@/lib/slug';
import { useSeoContext } from './useSeoContext';

/**
 * Slug = URL asset, independent of the title. Typing a title never changes it,
 * and Save never sends it. Only "Generate" creates or changes the slug:
 * - create form: Generate asks the API for a candidate (collision → visible
 *   -2 suggestion) and the result is sent once with "Lưu bản nháp";
 * - edit form: Generate previews, asks for confirmation (always for a public
 *   URL) and applies through the dedicated endpoint; the old URL becomes a
 *   permanent 308 redirect straight to the new one.
 */

type SlugPreview = {
  slug: string;
  path: string;
  currentSlug: string | null;
  currentPath: string | null;
  unchanged: boolean;
  available: boolean;
  reserved: boolean;
  conflict: boolean;
  reactivatesHistory: boolean;
  suggestion: string | null;
  suggestionPath: string | null;
  isPublished: boolean;
  requiresConfirmation: boolean;
};

export type GenerateSlugResult = {
  slug: string;
  path: string;
  previousPath: string | null;
  redirectCreated: boolean;
  version: number;
  unchanged: boolean;
};

type RouteEntry = { path: string; isCurrent: boolean; redirectStatus: number | null; createdAt: string; replacedAt: string | null; actor: string | null };

type CreateProps = {
  mode: 'create';
  kind: PublicContentKind;
  title: string;
  /** '' until Generate succeeds. */
  value: string;
  onChange: (slug: string) => void;
  /** e.g. '/content/slug/preview' (body gets `kind`) or '/properties/slug/preview'. */
  previewEndpoint: string;
  previewBody?: Record<string, unknown>;
  disabled?: boolean;
};

type EditProps = {
  mode: 'edit';
  kind: PublicContentKind;
  title: string;
  /** Saved slug (null = not generated yet). */
  value: string | null;
  currentPath: string | null;
  published: boolean;
  expectedVersion: number;
  /** e.g. `/content/${id}` or `/properties/${id}`; `/slug/preview`, `/slug/generate`, `/routes` are appended. */
  endpointBase: string;
  onGenerated: (result: GenerateSlugResult) => void;
  /** Unsaved form changes would conflict with the version bump; ask the user to save first. */
  dirty?: boolean;
  disabled?: boolean;
};

function apiMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.payload && typeof reason.payload === 'object') {
    const message = (reason.payload as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return reason instanceof Error ? reason.message : 'Không thể tạo đường dẫn.';
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString('vi-VN') : '—';
}

export function AdminSlugField(props: CreateProps | EditProps) {
  const id = useId();
  const { origin } = useSeoContext();
  const [source, setSource] = useState('');
  const [preview, setPreview] = useState<SlugPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'info' | 'success'; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [routes, setRoutes] = useState<{ current: RouteEntry | null; history: RouteEntry[] } | null>(null);

  const editBase = props.mode === 'edit' ? props.endpointBase : null;
  const loadRoutes = useCallback(async () => {
    if (!editBase) return;
    try {
      setRoutes(await apiRequest<{ current: RouteEntry | null; history: RouteEntry[] }>(`${editBase}/routes`));
    } catch {
      setRoutes(null);
    }
  }, [editBase]);
  useEffect(() => { void loadRoutes(); }, [loadRoutes]);

  const effectiveSource = source.trim() || props.title.trim();
  const hasSlug = !!props.value;
  const currentPath = props.mode === 'edit'
    ? props.currentPath ?? (props.value ? publicPath(props.kind, props.value) : null)
    : props.value ? publicPath(props.kind, props.value) : null;
  const disabled = props.disabled || busy;

  const requestPreview = async (sourceText: string): Promise<SlugPreview | null> => {
    if (!sourceText) {
      setMessage({ tone: 'error', text: 'Nhập tiêu đề (hoặc cụm từ tạo đường dẫn) rồi bấm Generate.' });
      return null;
    }
    const endpoint = props.mode === 'create' ? props.previewEndpoint : `${props.endpointBase}/slug/preview`;
    const body = props.mode === 'create' ? { ...(props.previewBody ?? {}), source: sourceText } : { source: sourceText };
    return apiRequest<SlugPreview>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  };

  const generate = async (sourceText = effectiveSource) => {
    setBusy(true); setMessage(null); setConfirming(false);
    try {
      const result = await requestPreview(sourceText);
      if (!result) return;
      setPreview(result);
      if (result.reserved) {
        setMessage({ tone: 'error', text: `“${result.slug}” là đường dẫn hệ thống. Hãy nhập cụm từ khác.` });
      } else if (result.unchanged) {
        setMessage({ tone: 'info', text: 'Đường dẫn không đổi.' });
      } else if (result.conflict) {
        setMessage({ tone: 'error', text: `${result.path} đã thuộc nội dung khác (kể cả URL cũ đang chuyển hướng).${result.suggestionPath ? ` Đề xuất: ${result.suggestionPath}` : ''}` });
      } else if (props.mode === 'create') {
        props.onChange(result.slug);
        setMessage({ tone: 'success', text: 'Đã tạo đường dẫn. Đường dẫn được lưu cùng bản nháp.' });
      } else {
        setConfirming(true);
      }
    } catch (reason) {
      setMessage({ tone: 'error', text: apiMessage(reason) });
    } finally { setBusy(false); }
  };

  const takeSuggestion = () => {
    if (!preview?.suggestion) return;
    if (props.mode === 'create') {
      props.onChange(preview.suggestion);
      setPreview({ ...preview, slug: preview.suggestion, path: preview.suggestionPath ?? preview.path, conflict: false, available: true });
      setMessage({ tone: 'success', text: `Đã dùng đường dẫn ${preview.suggestionPath}. Đường dẫn được lưu cùng bản nháp.` });
    } else {
      setSource(preview.suggestion);
      void generate(preview.suggestion);
    }
  };

  const apply = async () => {
    if (props.mode !== 'edit' || !preview) return;
    setBusy(true); setMessage(null);
    try {
      const result = await apiRequest<GenerateSlugResult>(`${props.endpointBase}/slug/generate`, {
        method: 'POST',
        body: JSON.stringify({ source: preview.slug, expectedVersion: props.expectedVersion, ...(preview.requiresConfirmation ? { confirmPublicChange: true } : {}) }),
      });
      setConfirming(false); setPreview(null); setSource('');
      props.onGenerated(result);
      setMessage({
        tone: 'success',
        text: result.redirectCreated
          ? `Đã đổi đường dẫn. ${result.previousPath} chuyển hướng vĩnh viễn (308) tới ${result.path}.`
          : `Đã tạo đường dẫn ${result.path}.`,
      });
      void loadRoutes();
    } catch (reason) {
      setMessage({ tone: 'error', text: apiMessage(reason) });
    } finally { setBusy(false); }
  };

  const buttonLabel = hasSlug ? 'Generate lại slug' : 'Generate';

  return <div className="afield admin-slug-field" data-testid="slug-field">
    <span className="admin-slug-field__label" id={`${id}-label`}>Đường dẫn (slug)</span>
    <div className="admin-slug-field__current">
      <Link2 size={15} aria-hidden="true" />
      {hasSlug
        ? <code data-testid="slug-current">{currentPath}</code>
        : <span className="abadge abadge--neutral" data-testid="slug-current">Chưa tạo</span>}
      {hasSlug && origin && <span className="admin-slug-field__url">{origin}{currentPath}</span>}
    </div>
    <div className="admin-slug-field__row">
      <input
        id={`${id}-source`}
        className="ainput"
        value={source}
        onChange={(event) => setSource(event.target.value)}
        maxLength={300}
        placeholder={props.title.trim() ? `Mặc định theo tiêu đề: ${props.title.trim()}` : 'Cụm từ tạo đường dẫn (mặc định theo tiêu đề)'}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-help`}
        disabled={disabled}
        data-testid="slug-source"
      />
      <button
        type="button"
        className="abtn abtn--ghost"
        onClick={() => void generate()}
        disabled={disabled || (props.mode === 'edit' && props.dirty) || !effectiveSource}
        data-testid="slug-generate"
      >
        <Wand2 size={15} aria-hidden="true" /> {busy ? 'Đang tạo…' : buttonLabel}
      </button>
    </div>
    <small id={`${id}-help`} className="ahint">
      Sửa tiêu đề, nội dung, SEO, ảnh hay trạng thái <strong>không</strong> đổi đường dẫn. Chỉ nút Generate tạo hoặc đổi slug.
      {props.mode === 'edit' && props.dirty ? ' Lưu các thay đổi khác trước khi Generate lại.' : ''}
    </small>
    {preview && !preview.reserved && !preview.unchanged && <span className="admin-slug-field__preview">Xem trước: <code>{origin ?? ''}{preview.path}</code></span>}
    {message && <p className={`admin-slug-field__msg admin-slug-field__msg--${message.tone}`} role={message.tone === 'error' ? 'alert' : 'status'} data-testid="slug-message">
      {message.tone === 'error' && <AlertTriangle size={15} aria-hidden="true" />} {message.text}
      {preview?.conflict && preview.suggestion && <button type="button" className="abtn abtn--ghost abtn--sm" onClick={takeSuggestion} disabled={disabled}>Dùng {preview.suggestion}</button>}
    </p>}
    {props.mode === 'edit' && confirming && preview && <div className="admin-slug-field__confirm" role="alertdialog" aria-labelledby={`${id}-confirm`} data-testid="slug-confirm">
      <strong id={`${id}-confirm`}>{props.published && preview.currentPath ? 'Bạn sắp thay đổi URL công khai.' : preview.currentPath ? 'Đổi đường dẫn của nội dung này?' : 'Tạo đường dẫn cho nội dung này?'}</strong>
      <dl>
        {preview.currentPath && <><dt>URL cũ</dt><dd><code>{preview.currentPath}</code></dd></>}
        <dt>URL mới</dt><dd><code>{preview.path}</code></dd>
      </dl>
      {preview.currentPath && <p>Hệ thống sẽ giữ redirect vĩnh viễn từ URL cũ sang URL mới.</p>}
      {preview.reactivatesHistory && <p className="ahint">Đây là một URL cũ của chính nội dung này; nó sẽ trở lại thành URL hiện tại.</p>}
      <div className="admin-slug-field__confirm-actions">
        <button type="button" className="abtn abtn--ghost" onClick={() => setConfirming(false)} disabled={busy}>Huỷ</button>
        <button type="button" className="abtn abtn--primary" onClick={() => void apply()} disabled={busy} data-testid="slug-apply">
          {preview.currentPath ? 'Generate & đổi URL' : 'Generate'}
        </button>
      </div>
    </div>}
    {props.mode === 'edit' && routes && routes.history.length > 0 && <details className="admin-slug-field__history" data-testid="slug-history">
      <summary><History size={14} aria-hidden="true" /> Lịch sử đường dẫn ({routes.history.length} URL cũ)</summary>
      <table>
        <thead><tr><th scope="col">URL</th><th scope="col">Chuyển hướng</th><th scope="col">Ngày đổi</th><th scope="col">Người đổi</th></tr></thead>
        <tbody>
          {routes.current && <tr><td><code>{routes.current.path}</code></td><td>URL hiện tại</td><td>{formatDate(routes.current.createdAt)}</td><td>—</td></tr>}
          {routes.history.map((entry) => <tr key={entry.path}>
            <td><code>{entry.path}</code></td>
            <td>{entry.redirectStatus ?? 308} → URL hiện tại</td>
            <td>{formatDate(entry.replacedAt)}</td>
            <td>{entry.actor ?? '—'}</td>
          </tr>)}
        </tbody>
      </table>
    </details>}
  </div>;
}
