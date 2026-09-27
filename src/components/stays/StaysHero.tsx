import Image from 'next/image';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import type { PublicMediaAsset } from '@/lib/api/public';
import type { PublicRecord } from '@/lib/public-content';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { RichDocument } from '@/lib/content/rich-document';
import { richDocumentHasContent } from '@/lib/public-content';

export function StaysHero({ config, image }: { config: PublicRecord; image: PublicMediaAsset | null }) {
  const title = typeof config.heroTitle === 'string' ? config.heroTitle.trim() : '';
  const kicker = typeof config.heroKicker === 'string' ? config.heroKicker.trim() : '';
  const note = typeof config.heroNote === 'string' ? config.heroNote.trim() : '';
  if (!title) return null;
  return (
    <section className="phero phero--stays" aria-labelledby="stays-title">
      <div className="phero__media" aria-hidden="true">
        {image?.src && <Image src={image.src} alt={image.alt ?? ''} fill priority sizes="100vw" className="phero__img" unoptimized />}
        <div className="phero__shade" />
      </div>
      <div className="phero__inner content-shell">
        <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Phòng nghỉ' }]} />
        <h1 id="stays-title" className="phero__title" data-reveal="fade-up">
          {title}
        </h1>
        {kicker && <p className="phero__script handwritten" data-reveal="write" style={{ '--d': '150ms' } as React.CSSProperties}>{kicker}</p>}
        {richDocumentHasContent(config.heroDescription) && <div className="phero__text" data-reveal="fade-up" style={{ '--d': '300ms' } as React.CSSProperties}><RichContentRenderer document={config.heroDescription as RichDocument} /></div>}
        {note && <p className="phero__note handwritten">{note}</p>}
      </div>
    </section>
  );
}
