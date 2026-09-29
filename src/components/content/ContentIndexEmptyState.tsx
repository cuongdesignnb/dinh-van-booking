import { ArrowRight, BookOpenText, FileText } from 'lucide-react';
import Link from 'next/link';

export function ContentIndexEmptyState({ kind }: { kind: 'article' | 'page' }) {
  const isArticle = kind === 'article';
  const Icon = isArticle ? BookOpenText : FileText;
  return <section className="static-page__empty-state" aria-labelledby="content-index-empty-title">
    <span className="static-page__empty-icon" aria-hidden="true"><Icon size={30} strokeWidth={1.6} /></span>
    <div className="static-page__empty-copy">
      <h2 id="content-index-empty-title">{isArticle ? 'Chưa có bài viết để xem' : 'Chuyên trang đang được cập nhật'}</h2>
      <p>{isArticle ? 'Các bài viết sẽ xuất hiện ở đây khi được xuất bản.' : 'Các trang thông tin sẽ xuất hiện ở đây khi được xuất bản.'}</p>
    </div>
    <div className="static-page__empty-actions">
      <Link href="/">Về trang chủ <ArrowRight size={16} aria-hidden="true" /></Link>
      <Link href="/lien-he">Liên hệ hỗ trợ</Link>
    </div>
  </section>;
}
