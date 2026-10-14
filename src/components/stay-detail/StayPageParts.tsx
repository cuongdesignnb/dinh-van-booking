'use client';

import { ArrowRight, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from '@/components/ui/ManagedImage';
import { AdvisorMonogram } from '@/components/home/HomeArt';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { ChatCta, useChatEnabled } from '@/components/chat/ChatCta';
import { useSiteData } from '@/components/site/SiteDataProvider';
import type { RichDocument } from '@/lib/content/rich-document';
import { richDocumentToText } from '@/lib/content/rich-document';
import { publicAsset, publicSetting, publicText, richDocumentHasContent } from '@/lib/public-content';

export type SectionTab = { id: string; label: string };

/** In-page section navigation; the active tab follows the scroll position. */
export function SectionTabs({ items }: { items: SectionTab[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const sections = items.map((item) => document.getElementById(item.id)).filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-140px 0px -55% 0px' },
    );
    sections.forEach((section) => io.observe(section));
    return () => io.disconnect();
  }, [items]);
  if (items.length < 2) return null;
  return (
    <nav className="stp-tabs" aria-label="Mục trong trang">
      <ul className="stp-tabs__list">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className="stp-tabs__link" aria-current={active === item.id ? 'location' : undefined} onClick={() => setActive(item.id)}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function useAdvisor() {
  const site = useSiteData();
  const config = publicSetting(site.publicSite, 'home.contactPanel');
  return {
    site,
    config,
    enabled: config.enabled === true,
    name: publicText(config.advisorName),
    role: publicText(config.advisorRole),
    title: publicText(config.title),
    note: publicText(config.note),
    description: config.description,
    image: publicAsset(site.publicSite, config.imageMediaId),
    portrait: publicAsset(site.publicSite, config.advisorImageMediaId),
  };
}

/** Advisor line under the booking card. */
export function AdvisorMini() {
  const { enabled, name, role, description, portrait } = useAdvisor();
  if (!enabled || !name) return null;
  const text = richDocumentHasContent(description) ? richDocumentToText(description as RichDocument) : '';
  return (
    <div className="stp-advisor">
      <span className="stp-advisor__avatar">
        {portrait?.src
          ? <Image src={portrait.src} alt="" width={56} height={56} unoptimized />
          : <AdvisorMonogram name={name} idPrefix="stp-adv" />}
        <span className="stp-advisor__dot" aria-hidden="true" />
      </span>
      <div className="stp-advisor__body">
        <p className="stp-advisor__name"><strong>{name}</strong>{role && <span> · {role}</span>}</p>
        {text && <p className="stp-advisor__text">{text}</p>}
      </div>
    </div>
  );
}

/** Label for the "ask the advisor" action, e.g. "Nhờ Đinh Vân tư vấn". */
export function useAdvisorAskLabel(): string {
  const { name } = useAdvisor();
  return name ? `Nhờ ${name} tư vấn` : 'Nhờ tư vấn';
}

/** Closing advisor band: the live chat when it is on; otherwise Zalo, then phone, then the contact form. */
export function AdvisorBand({ contactHref, draft }: { contactHref: string; draft?: string }) {
  const { site, enabled, name, title, note, description, image } = useAdvisor();
  const chat = useChatEnabled();
  if (!enabled || !title) return null;
  const zalo = site.contact.zaloUrl;
  const phone = site.contact.phone;
  const label = name ? `Trao đổi cùng ${name}` : 'Liên hệ tư vấn';
  const cta = chat
    ? <ChatCta className="btn btn--primary stp-band__btn" href={contactHref} draft={draft}><MessageCircle size={18} aria-hidden="true" /> {label} <ArrowRight size={17} aria-hidden="true" /></ChatCta>
    : zalo
    ? <a className="btn btn--primary stp-band__btn" href={zalo} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden="true" /> {label} <ArrowRight size={17} aria-hidden="true" /></a>
    : phone
      ? <a className="btn btn--primary stp-band__btn" href={`tel:${phone}`}><MessageCircle size={18} aria-hidden="true" /> {label} <ArrowRight size={17} aria-hidden="true" /></a>
      : <Link className="btn btn--primary stp-band__btn" href={contactHref}><MessageCircle size={18} aria-hidden="true" /> {label} <ArrowRight size={17} aria-hidden="true" /></Link>;
  return (
    <section className="stp-band" aria-labelledby="stp-band-t">
      {image?.src && <div className="stp-band__media"><Image src={image.src} alt={image.alt ?? ''} fill sizes="(max-width: 767px) 100vw, 340px" className="stp-band__img" unoptimized /></div>}
      <div className="stp-band__body">
        <h2 className="stp-band__title" id="stp-band-t">{title}</h2>
        {richDocumentHasContent(description) && <div className="stp-band__text"><RichContentRenderer document={description as RichDocument} /></div>}
      </div>
      <div className="stp-band__action">
        {cta}
        {note && <p className="stp-band__note">{note}</p>}
      </div>
    </section>
  );
}
