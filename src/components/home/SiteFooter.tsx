'use client';

import { Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { BrandIcon, brandTitle, type BrandName } from '@/components/ui/BrandIcons';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useSiteData } from '@/components/site/SiteDataProvider';
import type { PublicNavigationItem } from '@/lib/api/public';
import { publicSetting, publicText } from '@/lib/public-content';

const SOCIAL = ['facebook', 'instagram', 'youtube', 'tiktok'] as const satisfies readonly BrandName[];

export function SiteFooter({ variant = 'default', navigation }: { variant?: 'default' | 'checkout'; navigation: PublicNavigationItem[] }) {
  const { contact, social, publicSite } = useSiteData();
  const footer = publicSetting(publicSite, 'site.footer');
  const motto = publicText(footer.motto) || publicText(footer.quote);
  const copyright = publicText(footer.copyrightText).replaceAll('{year}', String(new Date().getFullYear()));
  const phone = contact.hotline || contact.phone;
  const activeSocial = SOCIAL.filter((name) => !!social[name]);
  return (
    <footer className={`sf sf--${variant}`}>
      <div className="sf__inner">
        <Link href="/" className="sf__brand" aria-label="Về trang chủ">
          <BrandLogo variant="footer" />
        </Link>

        {navigation.length > 0 && <nav className="sf__nav" aria-label="Liên kết chân trang">
          <ul>{navigation.map((item) => <li key={`${item.href}-${item.label}`}><Link href={item.href}>{item.label}</Link></li>)}</ul>
        </nav>}

        {(phone || contact.email || contact.address) && <ul className="sf__contact" aria-label="Thông tin liên hệ">
          {phone && <li><Phone size={16} aria-hidden="true" /><a href={`tel:${phone.replace(/\s+/g, '')}`}>{phone}</a></li>}
          {contact.email && <li><Mail size={16} aria-hidden="true" /><a href={`mailto:${contact.email}`}>{contact.email}</a></li>}
          {contact.address && <li><MapPin size={16} aria-hidden="true" />{contact.mapUrl ? <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer">{contact.address}</a> : <span>{contact.address}</span>}</li>}
        </ul>}

        {(activeSocial.length > 0 || contact.zaloUrl) && <ul className="sf__social" aria-label="Mạng xã hội">
          {activeSocial.map((name) => (
            <li key={name}>
              <a href={social[name] ?? undefined} target="_blank" rel="noopener noreferrer" aria-label={brandTitle(name)}>
                <BrandIcon name={name} size={18} />
              </a>
            </li>
          ))}
          {contact.zaloUrl && <li><a href={contact.zaloUrl} target="_blank" rel="noopener noreferrer" aria-label="Zalo"><BrandIcon name="zalo" size={18} /></a></li>}
        </ul>}

        {motto && <p className="sf__motto script">{motto}</p>}
      </div>
      {copyright && <p className="sf__copy">{copyright}</p>}
    </footer>
  );
}
