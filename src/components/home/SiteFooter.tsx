import { Mail, MapPin, Phone } from 'lucide-react';
import { ActionButton } from '@/components/ui/ActionButton';
import { BrandIcon, brandTitle, type BrandName } from '@/components/ui/BrandIcons';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ForestSilhouette, LeafSprig } from '@/components/ui/Decor';
import { siteConfig } from '@/config/site';

const SOCIAL = ['facebook', 'instagram', 'youtube', 'tiktok'] as const satisfies readonly BrandName[];

export function SiteFooter() {
  const { previewLabels: p, social } = siteConfig;
  return (
    <footer className="footer">
      <ForestSilhouette className="footer__forest" />
      <LeafSprig className="footer__leaf" />
      <div className="footer__inner">
        <div className="footer__brand">
          <BrandLogo variant="footer" />
          <p className="footer__copy">© {new Date().getFullYear()} Đinh Vân Booking. All rights reserved.</p>
        </div>

        <nav className="footer__col" aria-labelledby="f-links">
          <h2 className="footer__title" id="f-links">
            Liên kết nhanh
          </h2>
          <ul className="footer__links">
            <li>
              <a href="#top">Trang chủ</a>
            </li>
            <li>
              <a href="#phong-nghi">Phòng nghỉ</a>
            </li>
            <li>
              <ActionButton action={{ type: 'combo' }} className="footer__linkbtn">
                Combo du lịch
              </ActionButton>
            </li>
            <li>
              <a href="#diem-den">Điểm đến</a>
            </li>
            <li>
              <a href="#lien-he">Liên hệ</a>
            </li>
            <li>
              <ActionButton action={{ type: 'all-destinations' }} className="footer__linkbtn">
                Blog du lịch
              </ActionButton>
            </li>
          </ul>
        </nav>

        <div className="footer__col">
          <h2 className="footer__title">Thông tin liên hệ</h2>
          <ul className="footer__contact" aria-describedby="f-contact-note">
            <li>
              <Phone size={14} fill="currentColor" strokeWidth={0} aria-hidden="true" /> {p.phone}
            </li>
            <li>
              <span className="zalo-mini" aria-hidden="true">
                <BrandIcon name="zalo" size={13} />
              </span>
              {p.zalo}
            </li>
            <li>
              <Mail size={14} aria-hidden="true" /> {p.email}
            </li>
            <li>
              <MapPin size={14} aria-hidden="true" /> {p.address}
            </li>
          </ul>
          <p id="f-contact-note" className="sr-only">
            Thông tin liên hệ minh họa, đang được cập nhật.
          </p>
        </div>

        <div className="footer__col">
          <h2 className="footer__title">Theo dõi mình</h2>
          <ul className="footer__social">
            {SOCIAL.map((name) => {
              const url = social[name];
              return (
                <li key={name}>
                  {url ? (
                    <a
                      className="social-btn"
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={brandTitle(name)}
                    >
                      <BrandIcon name={name} size={17} />
                    </a>
                  ) : (
                    <ActionButton
                      action={{ type: 'contact', channel: 'social' }}
                      className="social-btn"
                      label={`${brandTitle(name)} (đang cập nhật)`}
                    >
                      <BrandIcon name={name} size={17} />
                    </ActionButton>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="footer__quote">
          <p className="handwritten">
            “Những chuyến đi không chỉ để đến,
            <br /> mà còn để yêu thêm cuộc sống này.”
          </p>
          <p className="footer__quote-by">— Đinh Vân Booking</p>
        </div>
        <p className="footer__motto">Du lịch bản địa - Lan tỏa những giá trị thật</p>
      </div>
    </footer>
  );
}
