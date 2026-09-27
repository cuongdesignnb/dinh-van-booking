'use client';

import { Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { BrandIcon, brandTitle, type BrandName } from '@/components/ui/BrandIcons';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ForestSilhouette, LeafSprig } from '@/components/ui/Decor';
import { useSiteData } from '@/components/site/SiteDataProvider';
import type { PublicNavigationItem } from '@/lib/api/public';
import { publicSetting, publicText } from '@/lib/public-content';

const SOCIAL = ['facebook', 'instagram', 'youtube', 'tiktok'] as const satisfies readonly BrandName[];

export function SiteFooter({ variant = 'default', navigation }: { variant?: 'default' | 'checkout'; navigation: PublicNavigationItem[] }) {
  const { contact, social, publicSite } = useSiteData();
  const footer = publicSetting(publicSite, 'site.footer');
  const quote = publicText(footer.quote);
  const quoteAuthor = publicText(footer.quoteAuthor);
  const motto = publicText(footer.motto);
  const copyright = publicText(footer.copyrightText).replaceAll('{year}', String(new Date().getFullYear()));
  const contacts = [
    contact.phone ? { key: 'phone', icon: <Phone size={14} fill="currentColor" strokeWidth={0} aria-hidden="true" />, label: contact.phone, href: `tel:${contact.phone}` } : null,
    contact.zaloUrl ? { key: 'zalo', icon: <span className="zalo-mini" aria-hidden="true"><BrandIcon name="zalo" size={13} /></span>, label: contact.zaloUrl, href: contact.zaloUrl } : null,
    contact.email ? { key: 'email', icon: <Mail size={14} aria-hidden="true" />, label: contact.email, href: `mailto:${contact.email}` } : null,
    contact.address ? { key: 'address', icon: <MapPin size={14} aria-hidden="true" />, label: contact.address, href: contact.mapUrl ?? null } : null,
  ].filter((item): item is NonNullable<typeof item> => !!item);
  const activeSocial = SOCIAL.filter((name) => !!social[name]);
  return (
    <footer className={`footer footer--${variant}`}>
      <ForestSilhouette className="footer__forest" />
      <LeafSprig className="footer__leaf" />
      <div className="footer__inner">
        <div className="footer__main">
          <div className="footer__brand">
            <BrandLogo variant="footer" />
          </div>

          <nav className="footer__col" aria-labelledby="f-links">
            <h2 className="footer__title" id="f-links">
              Liên kết nhanh
            </h2>
            {navigation.length > 0 && <ul className="footer__links">
              {navigation.map((item) => <li key={`${item.href}-${item.label}`}><Link href={item.href}>{item.label}</Link></li>)}
            </ul>}
          </nav>

          <div className="footer__col">
            <h2 className="footer__title">Thông tin liên hệ</h2>
            {contacts.length > 0 && <ul className="footer__contact">
              {contacts.map((item) => <li key={item.key}>{item.icon}{item.href ? <a href={item.href}>{item.label}</a> : <span>{item.label}</span>}</li>)}
            </ul>}
          </div>

          <div className="footer__col">
            <h2 className="footer__title">Theo dõi mình</h2>
            {activeSocial.length > 0 && <ul className="footer__social">
              {activeSocial.map((name) => {
                const url = social[name];
                if (!url) return null;
                return (
                  <li key={name}>
                      <a
                        className="social-btn"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={brandTitle(name)}
                      >
                        <BrandIcon name={name} size={17} />
                      </a>
                  </li>
                );
              })}
            </ul>}
          </div>

          {(quote || quoteAuthor) && <div className="footer__quote">
            {quote && <p className="handwritten">{quote}</p>}
            {quoteAuthor && <p className="footer__quote-by">— {quoteAuthor}</p>}
          </div>}
        </div>

        <div className="footer__bottom">
          {copyright && <p className="footer__copy">{copyright}</p>}
          {motto && <p className="footer__motto">{motto}</p>}
        </div>
      </div>
    </footer>
  );
}
