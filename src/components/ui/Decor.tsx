/** Decorative, low-contrast SVG layers. All aria-hidden. */

export function LeafSprig({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 160" aria-hidden="true" focusable="false">
      <path d="M60 158 C58 110 60 70 72 20" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M62 120 C30 118 14 96 10 70 C38 72 56 92 62 120 Z" fill="currentColor" />
      <path d="M64 92 C92 88 108 66 112 40 C86 44 68 64 64 92 Z" fill="currentColor" />
      <path d="M68 58 C46 52 38 34 38 14 C58 20 68 36 68 58 Z" fill="currentColor" />
    </svg>
  );
}

export function SmallLeaf({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M20.5 3.5C12 3.2 5.3 7.6 4.6 15.4c-.1 1.2 0 2.4.3 3.6 1-3.6 3.6-6.7 7.3-8.4-3 2.3-5 5.3-5.8 8.9 1.2.5 2.5.7 3.8.6 7.2-.6 10.6-7.6 10.3-16.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function FallingLeaves() {
  return (
    <div className="falling-leaves" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className={`falling-leaves__leaf falling-leaves__leaf--${i + 1}`}>
          <SmallLeaf />
        </span>
      ))}
    </div>
  );
}

export function ForestSilhouette({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1448 120"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="forest__far"
        d="M0 70 L90 40 L170 62 L260 22 L360 58 L450 34 L560 66 L660 28 L760 60 L860 30 L980 64 L1090 26 L1190 58 L1300 34 L1448 60 L1448 120 L0 120 Z"
      />
      <path
        className="forest__near"
        d="M0 96 C60 84 90 92 130 80 L140 66 L150 80 C190 74 230 88 280 84 L292 64 L304 84 C360 90 420 78 480 86 L490 70 L500 86 C570 92 640 80 700 88 L712 68 L724 88 C800 94 880 82 950 90 L960 72 L970 90 C1050 94 1130 82 1200 88 L1212 66 L1224 88 C1300 94 1380 84 1448 90 L1448 120 L0 120 Z"
      />
    </svg>
  );
}
