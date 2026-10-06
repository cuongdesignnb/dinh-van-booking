import { Heart, Leaf, ShieldCheck, Users } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { PublicMediaAsset } from '@/lib/api/public';
import type { PublicRecord } from '@/lib/public-content';
import type { RichDocument } from '@/lib/content/rich-document';
import { publicText, richDocumentHasContent } from '@/lib/public-content';
import { ScriptHeart } from './HomeArt';

const TRUST_ICONS = { leaf: Leaf, heart: Heart, users: Users, shield: ShieldCheck } as const;
type TrustIcon = keyof typeof TRUST_ICONS;

export function trustItems(config: PublicRecord) {
  if (config.enabled !== true) return [];
  return (Array.isArray(config.items) ? config.items : []).flatMap((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    const icon = String(item.icon) as TrustIcon;
    const label = publicText(item.line1);
    const detail = publicText(item.line2);
    if (item.enabled === false || !(icon in TRUST_ICONS) || !(label || detail)) return [];
    return [{ id: typeof item.id === 'string' ? item.id : `trust-${index}`, icon, label: label || detail, detail: label ? detail : '' }];
  });
}

export function HeroSection({ config, trust, image, mobileImage }: {
  config: PublicRecord;
  trust: PublicRecord | null;
  image: PublicMediaAsset | null;
  mobileImage: PublicMediaAsset | null;
}) {
  const titleLine1 = publicText(config.titleLine1);
  const titleLine2 = publicText(config.titleLine2);
  const kicker = publicText(config.kicker);
  const signature = publicText(config.signature);
  const note = publicText(config.note);
  if (config.enabled !== true || !titleLine1) return null;
  const items = trust ? trustItems(trust) : [];
  return (
    <section className="hh" aria-labelledby="hero-title">
      <div className="hh__media" aria-hidden="true">
        {image?.src && <Image src={image.src} alt="" fill priority sizes="100vw" className={`hh__img${mobileImage?.src ? ' hh__img--desktop' : ''}`} unoptimized />}
        {mobileImage?.src && <Image src={mobileImage.src} alt="" fill sizes="100vw" className="hh__img hh__img--mobile" unoptimized />}
      </div>
      <div className="hh__inner">
        <div className="hh__copy">
          {kicker && <p className="eyebrow hh__eyebrow">{kicker}</p>}
          <h1 id="hero-title" className="hh__title">
            <span>{titleLine1}</span>
            {titleLine2 && <span>{titleLine2}</span>}
          </h1>
          {richDocumentHasContent(config.description) && <div className="hh__lead"><RichContentRenderer document={config.description as RichDocument} /></div>}
          {items.length > 0 && <ul className="hh__trust" aria-label="Cam kết">
            {items.map((item) => {
              const Icon = TRUST_ICONS[item.icon];
              return (
                <li key={item.id}>
                  <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
                  <span>{item.label}{item.detail && <small>{item.detail}</small>}</span>
                </li>
              );
            })}
          </ul>}
        </div>
        {(signature || note) && <div className="hh__notes">
          {signature && <p className="hh__note hh__note--sm script">“{signature}” <ScriptHeart className="hh__heart" /></p>}
          {note && <p className="hh__note hh__note--lg script">{note} <ScriptHeart className="hh__heart" /></p>}
        </div>}
      </div>
    </section>
  );
}
