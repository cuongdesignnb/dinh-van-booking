import Image from 'next/image';
import { FallingLeaves } from '@/components/ui/Decor';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { PublicMediaAsset } from '@/lib/api/public';
import type { PublicRecord } from '@/lib/public-content';
import type { RichDocument } from '@/lib/content/rich-document';
import { richDocumentHasContent } from '@/lib/public-content';

const d = (ms: number) => ({ '--d': `${ms}ms` }) as React.CSSProperties;

export function HeroSection({ config, image, mobileImage }: { config: PublicRecord; image: PublicMediaAsset | null; mobileImage: PublicMediaAsset | null }) {
  const titleLine1 = typeof config.titleLine1 === 'string' ? config.titleLine1.trim() : '';
  const titleLine2 = typeof config.titleLine2 === 'string' ? config.titleLine2.trim() : '';
  const kicker = typeof config.kicker === 'string' ? config.kicker.trim() : '';
  const signature = typeof config.signature === 'string' ? config.signature.trim() : '';
  const note = typeof config.note === 'string' ? config.note.trim() : '';
  if (config.enabled !== true || !titleLine1) return null;
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__media" aria-hidden="true">
        <div className="hero__canvas" data-parallax>
          {image?.src && <Image
            src={image.src}
            alt={image.alt ?? ''}
            fill
            priority
            sizes="100vw"
            className={`hero__img${mobileImage?.src ? ' hero__img--desktop' : ''}`}
            unoptimized
          />}
          {mobileImage?.src && <Image src={mobileImage.src} alt={mobileImage.alt ?? ''} fill sizes="100vw" className="hero__img hero__img--mobile" unoptimized />}
          <span className="hero__sun" />
          <span className="hero__lantern hero__lantern--1" />
          <span className="hero__lantern hero__lantern--2" />
          <span className="hero__lantern hero__lantern--3" />
          <span className="hero__mist" />
        </div>
        <div className="hero__shade" />
        <FallingLeaves />
      </div>

      <div className="hero__inner">
        <div className="hero__copy">
          {kicker && <p className="hero__kicker handwritten" data-reveal="write" style={d(80)}>{kicker}</p>}
          <h1 id="hero-title" className="hero__title">
            <span className="line-mask" data-reveal="mask" style={d(260)}>
              <span>{titleLine1}</span>
            </span>
            <span className="line-mask" data-reveal="mask" style={d(380)}>
              <span>{titleLine2}</span>
            </span>
          </h1>
          {signature && <p className="hero__signature handwritten" data-reveal="write" style={d(620)}>{signature}</p>}
          {richDocumentHasContent(config.description) && <div className="hero__sub" data-reveal="fade-up" style={d(800)}><RichContentRenderer document={config.description as RichDocument} /></div>}
        </div>

        {note && <p className="hero__note handwritten" data-reveal="write" style={d(1100)}>{note}</p>}
      </div>
    </section>
  );
}
