import { siFacebook, siInstagram, siTiktok, siYoutube, siZalo } from 'simple-icons';

/** Brand marks from simple-icons (CC0), rendered as inline SVG. */
const icons = {
  facebook: siFacebook,
  instagram: siInstagram,
  youtube: siYoutube,
  tiktok: siTiktok,
  zalo: siZalo,
} as const;

export type BrandName = keyof typeof icons;

export function BrandIcon({ name, size = 18 }: { name: BrandName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className="brand-icon"
    >
      <path d={icons[name].path} />
    </svg>
  );
}

export const brandTitle = (name: BrandName) => icons[name].title;
