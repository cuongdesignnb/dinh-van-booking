const STAR = 'M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z';

/** Five filled/partial stars. Decorative; always pair with a text rating. */
export function Stars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <span className="stars" aria-hidden="true" style={{ '--star': `${size}px` } as React.CSSProperties}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="stars__slot">
            <svg viewBox="0 0 24 24" focusable="false" className="stars__bg">
              <path d={STAR} />
            </svg>
            <span className="stars__fill" style={{ width: `${fill * 100}%` }}>
              <svg viewBox="0 0 24 24" focusable="false">
                <path d={STAR} />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}
