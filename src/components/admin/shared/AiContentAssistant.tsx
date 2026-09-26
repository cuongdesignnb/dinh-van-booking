'use client';

import { useId, useState } from 'react';
import { AlertCircle, ImagePlus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { ApiError, apiRequest } from '@/lib/api/client';

export type AiContentKind = 'article' | 'page' | 'stay' | 'combo' | 'destination';

export interface AiEditorContext {
  kind?: AiContentKind;
  title?: string;
  excerpt?: string;
  currentContentId?: string | null;
}

export interface AiGeneratedFields {
  title: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  links: Array<{ path: string; title: string; anchor: string; kind: string }>;
  images: Array<{ id: string; url: string; alt: string | null; caption: string | null; mediaId: string }>;
}

interface AiDraft extends AiGeneratedFields {
  bodyHtml: string;
  warnings: string[];
  saved: false;
  publicationStatus: 'draft';
}

const KIND_NAMES: Record<AiContentKind, string> = {
  article: 'bài viết',
  page: 'chuyên trang',
  stay: 'nơi lưu trú',
  combo: 'combo du lịch',
  destination: 'điểm đến',
};

export function AiContentAssistant({
  open,
  onClose,
  context,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  context: AiEditorContext;
  onApply: (bodyHtml: string, fields: AiGeneratedFields) => void;
}) {
  const titleId = useId();
  const [brief, setBrief] = useState('');
  const [generateImages, setGenerateImages] = useState(false);
  const [imageCount, setImageCount] = useState(1);
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!brief.trim()) {
      setError('Hãy mô tả chủ đề và điều bạn muốn người đọc nhận được.');
      return;
    }
    setBusy(true);
    setError('');
    setDraft(null);
    try {
      const result = await apiRequest<AiDraft>('/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          kind: context.kind ?? 'article',
          brief: brief.trim(),
          title: context.title ?? '',
          excerpt: context.excerpt ?? '',
          currentContentId: context.currentContentId ?? undefined,
          generateImages,
          imageCount: generateImages ? imageCount : 0,
        }),
      });
      setDraft(result);
    } catch (reason) {
      const message = reason instanceof ApiError || reason instanceof Error ? reason.message : 'Không thể tạo nội dung lúc này.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} size="xl" className="dialog--admin rte-ai-dialog">
      <div className="rte-ai">
        <header className="rte-ai__header">
          <span className="rte-ai__icon"><Sparkles size={19} aria-hidden="true" /></span>
          <div>
            <h2 id={titleId}>Trợ lý AI nội dung</h2>
            <p>Tạo bản xem trước cho {KIND_NAMES[context.kind ?? 'article']}. Nội dung chỉ vào editor khi bạn duyệt.</p>
          </div>
        </header>

        <div className="rte-ai__controls">
          <label className="afield">
            <span>Chủ đề và yêu cầu *</span>
            <textarea
              className="ainput"
              rows={4}
              maxLength={4000}
              data-autofocus
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder="Ví dụ: Viết hướng dẫn chọn homestay gần Vườn quốc gia Cúc Phương; nêu rõ đối tượng phù hợp, gợi ý chuẩn bị và tránh tự bịa giá/phòng còn trống."
            />
            <span className="ahint">Tối đa 4.000 ký tự. AI chỉ dùng route đang xuất bản để tạo liên kết nội bộ.</span>
          </label>

          <div className="rte-ai__image-options">
            <label className="rte-ai__check">
              <input type="checkbox" checked={generateImages} onChange={(event) => setGenerateImages(event.target.checked)} />
              <ImagePlus size={17} aria-hidden="true" />
              <span>Tạo ảnh minh hoạ và lưu vào Media Library</span>
            </label>
            {generateImages && (
              <label className="afield rte-ai__count">
                <span>Số ảnh (tối đa 3)</span>
                <select className="ainput" value={imageCount} onChange={(event) => setImageCount(Number(event.target.value))}>
                  <option value={1}>1 ảnh</option>
                  <option value={2}>2 ảnh</option>
                  <option value={3}>3 ảnh</option>
                </select>
              </label>
            )}
          </div>

          <div className="rte-ai__actions">
            <button type="button" className="abtn abtn--ghost" onClick={onClose} disabled={busy}>Đóng</button>
            <button type="button" className="abtn abtn--primary" onClick={() => void generate()} disabled={busy || !brief.trim()}>
              <Sparkles size={16} aria-hidden="true" /> {busy ? 'Đang tạo bản xem trước…' : draft ? 'Tạo lại bản xem trước' : 'Tạo bản xem trước'}
            </button>
          </div>
          {busy && <p className="rte-ai__note" role="status">Đang chờ nhà cung cấp AI. Nếu bật ảnh, ảnh được lưu thành WebP trong thư viện.</p>}
          {error && <p className="rte-ai__error" role="alert"><AlertCircle size={16} aria-hidden="true" />{error} <Link href="/admin/cai-dat">Mở cài đặt AI</Link></p>}
        </div>

        {draft && (
          <section className="rte-ai__result" aria-label="Bản xem trước AI">
            <div className="rte-ai__result-head">
              <div>
                <p className="rte-ai__eyebrow">BẢN NHÁP · CHƯA LƯU · CHƯA XUẤT BẢN</p>
                <h3>{draft.title}</h3>
                <p>{draft.excerpt}</p>
              </div>
              <button type="button" className="abtn abtn--primary" onClick={() => onApply(draft.bodyHtml, draft)}>
                Duyệt và đưa vào editor
              </button>
            </div>
            <div className="rte-ai__meta">
              <div><strong>Meta title</strong><span>{draft.metaTitle || 'Chưa tạo'}</span></div>
              <div><strong>Meta description</strong><span>{draft.metaDescription || 'Chưa tạo'}</span></div>
              {draft.links.length > 0 && <div><strong>Liên kết nội bộ thật</strong><span>{draft.links.map((link) => `${link.anchor} → ${link.path}`).join(' · ')}</span></div>}
              {draft.images.length > 0 && <div><strong>Ảnh đã thêm vào Media Library</strong><span>{draft.images.map((image) => `ALT: ${image.alt || '—'}`).join(' · ')}</span></div>}
            </div>
            {draft.warnings.map((warning) => <p className="rte-ai__warning" key={warning}>{warning}</p>)}
            <article className="rte-ai__preview rich-content" dangerouslySetInnerHTML={{ __html: draft.bodyHtml }} />
          </section>
        )}
      </div>
    </Modal>
  );
}
