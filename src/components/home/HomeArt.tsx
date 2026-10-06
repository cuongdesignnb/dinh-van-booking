/** Decorative SVGs for the public site. All aria-hidden. */

/** Outlined leaf used beside section headings. */
export function SectionLeaf({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 44 44" aria-hidden="true" focusable="false">
      <path d="M22 40C11.5 31.5 9 20.5 15 11.5 17 8.5 19.4 6 22 4c2.6 2 5 4.5 7 7.5 6 9 3.5 20-7 28.5Z" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M22 40V10M22 18l-5-4M22 25l-6.5-5M22 32l-6-4.5M22 21l5.5-4.5M22 28.5l6-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Pale watercolour-like forest edges for light sections. */
export function ForestWash({ className }: { className?: string }) {
  const pine = (x: number, base: number, h: number, w: number) =>
    `M${x} ${base - h} L${x - w * 0.32} ${base - h * 0.62} L${x - w * 0.16} ${base - h * 0.64} L${x - w * 0.42} ${base - h * 0.32} L${x - w * 0.2} ${base - h * 0.34} L${x - w * 0.5} ${base} L${x + w * 0.5} ${base} L${x + w * 0.2} ${base - h * 0.34} L${x + w * 0.42} ${base - h * 0.32} L${x + w * 0.16} ${base - h * 0.64} L${x + w * 0.32} ${base - h * 0.62} Z`;
  const left = [[30, 300, 210, 90], [95, 300, 150, 70], [150, 300, 110, 56], [-10, 300, 170, 80]];
  const right = [[1410, 300, 200, 90], [1345, 300, 140, 66], [1290, 300, 100, 52], [1460, 300, 160, 80]];
  return (
    <svg className={className} viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <filter id="wash-blur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <path d="M0 300V230c120-30 220-10 330-34 140-30 230 6 360-12 140-20 250-46 400-18 120 22 220 6 350-14V300Z" fill="#dfe9dc" opacity="0.55" />
      <g filter="url(#wash-blur)" fill="#b9cdb5" opacity="0.55">
        {left.map(([x, b, h, w]) => <path key={`l${x}`} d={pine(x, b, h, w)} />)}
        {right.map(([x, b, h, w]) => <path key={`r${x}`} d={pine(x, b, h, w)} />)}
      </g>
      <path d="M0 300v-36c150-18 280 10 440-6 170-16 310 8 470-4 190-14 350 12 530-8V300Z" fill="#e8efe4" opacity="0.8" />
    </svg>
  );
}

/** Hand-drawn heart flourish after script notes. */
export function ScriptHeart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 22" aria-hidden="true" focusable="false">
      <path d="M12 20S2.5 13.8 2.5 7.6C2.5 4.6 4.7 2.5 7.3 2.5c2 0 3.6 1.2 4.7 3 1.1-1.8 2.7-3 4.7-3 2.6 0 4.8 2.1 4.8 5.1C21.5 13.8 12 20 12 20Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

const initials = (name: string) => {
  const words = name.split(/\s+/).filter(Boolean);
  return words.slice(-2).map((word) => word.charAt(0).toUpperCase()).join('');
};

/** Illustrated monogram ("ĐV" over hills) used while no advisor photo has been uploaded. */
export function AdvisorMonogram({ name, className, idPrefix = 'ha' }: { name: string; className?: string; idPrefix?: string }) {
  const sky = `${idPrefix}-sky`;
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3efe2" />
          <stop offset="1" stopColor="#dfe9dc" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${sky})`} />
      <path d="M0 150 40 104l22 24 34-46 40 52 22-20 42 36v50H0Z" fill="#b9cdb5" />
      <path d="M0 168c34-12 66-12 100-2s68 8 100-6v40H0Z" fill="#8fb08e" />
      <path d="M0 184c40-8 80-6 120 2 30 6 56 4 80-2v16H0Z" fill="#5e8a6a" />
      <text x="100" y="92" textAnchor="middle" fontFamily="'Playfair Display', Georgia, serif" fontSize="58" fontWeight="600" fill="#1f4d3a">{initials(name)}</text>
    </svg>
  );
}
