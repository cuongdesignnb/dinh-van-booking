/**
 * Decorative "hoa lá cành và gió" layer for the public homepage. Pure SVG + CSS:
 * the existing MotionController adds `.is-in` when a sprig scrolls into view,
 * and everything stays static (sprigs) or hidden (breeze) under reduced motion.
 * All markup is aria-hidden and ignores the pointer.
 */
import type { CSSProperties } from 'react';

const LEAF = 'M0 0C-9-9-10-25 0-36C10-25 9-9 0 0Z';
const RIB = 'M0-2V-30';

/** Leaf positions along the vine: [x, y, rotation, scale]. Up-leaves lean with the wind. */
const LEAVES: ReadonlyArray<readonly [number, number, number, number]> = [
  [22, 50, 28, 0.62],
  [40, 47, 152, 0.56],
  [62, 41, 36, 0.66],
  [86, 36, 162, 0.58],
  [128, 42, 30, 0.64],
  [152, 50, 148, 0.56],
  [178, 50, 40, 0.6],
  [204, 42, 156, 0.52],
  [232, 31, 34, 0.5],
];

/** Flower positions: [x, y, size]. */
const FLOWERS: ReadonlyArray<readonly [number, number, number]> = [
  [108, 35, 0.78],
  [214, 38, 0.68],
  [256, 25, 0.86],
];

const style = (vars: Record<string, string | number>) => vars as CSSProperties;

function Flower({ x, y, size, index }: { x: number; y: number; size: number; index: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <g className="nm__flower" style={style({ '--i': index })}>
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse key={angle} className="nm__petal" cx="0" cy="-7" rx="4.2" ry="7.2" transform={`rotate(${angle})`} />
        ))}
        <circle className="nm__pistil" r="3.2" />
      </g>
    </g>
  );
}

/**
 * A flowering vine that grows in from the screen edge along the gap above a
 * section, with gusts of wind and a few leaves blown off its tip.
 */
export function NatureSprig({ side = 'left' }: { side?: 'left' | 'right' }) {
  return (
    <div className={`nm nm--${side}`} data-reveal="nature" aria-hidden="true">
      <svg className="nm__svg" viewBox="0 0 270 80" focusable="false">
        <g className="nm__wind">
          <path pathLength={1} d="M18 16C64 4 104 26 150 14S222 2 266 10" />
          <path pathLength={1} d="M70 66C112 58 140 74 182 64S236 52 268 58" />
          <path pathLength={1} d="M120 6C150 0 176 12 204 6S244 -2 266 2" />
        </g>
        <g className="nm__plant">
          <path className="nm__stem" pathLength={1} d="M0 54C38 52 70 30 108 36S168 60 212 40S248 22 260 25" />
          <path className="nm__stem nm__stem--twig" pathLength={1} d="M150 50C160 60 172 64 186 62" />
          {LEAVES.map(([x, y, rotate, scale], index) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
              <g className={`nm__leaf${index % 3 === 1 ? ' nm__leaf--alt' : ''}`} style={style({ '--i': index })}>
                <path d={LEAF} />
                <path className="nm__rib" d={RIB} />
              </g>
            </g>
          ))}
          {FLOWERS.map(([x, y, size], index) => <Flower key={`${x}-${y}`} x={x} y={y} size={size} index={index} />)}
        </g>
        <g className="nm__drift">
          {[0, 1, 2].map((index) => (
            <g key={index} transform={`translate(${226 + index * 12} ${34 - index * 6})`}>
              <g className="nm__flyer" style={style({ '--i': index })}>
                <path d={LEAF} transform="scale(0.42)" />
              </g>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

/** Leaves, petals and wind lines drifting across the hero image. */
const BREEZE_ITEMS: ReadonlyArray<{ kind: 'leaf' | 'petal'; top: number; delay: number; duration: number; size: number; spin: number }> = [
  { kind: 'leaf', top: 18, delay: 0, duration: 15, size: 18, spin: 320 },
  { kind: 'petal', top: 34, delay: 3.5, duration: 17, size: 12, spin: -260 },
  { kind: 'leaf', top: 62, delay: 6, duration: 14, size: 15, spin: 280 },
  { kind: 'petal', top: 12, delay: 9, duration: 18, size: 11, spin: 300 },
  { kind: 'leaf', top: 46, delay: 11.5, duration: 16, size: 20, spin: -340 },
  { kind: 'petal', top: 74, delay: 13, duration: 15, size: 10, spin: 240 },
  { kind: 'leaf', top: 28, delay: 16, duration: 17, size: 14, spin: 300 },
];

export function NatureBreeze({ className }: { className?: string }) {
  return (
    <div className={`nb${className ? ` ${className}` : ''}`} aria-hidden="true">
      <svg className="nb__gusts" viewBox="0 0 1440 600" preserveAspectRatio="none" focusable="false">
        <path pathLength={1} d="M-40 170C220 120 420 220 700 160S1140 90 1480 150" />
        <path pathLength={1} d="M-40 330C260 290 520 380 820 320S1220 260 1480 300" />
        <path pathLength={1} d="M-40 470C200 440 480 520 760 470S1160 410 1480 450" />
      </svg>
      {BREEZE_ITEMS.map((item, index) => (
        <span
          key={index}
          className={`nb__item nb__item--${item.kind}`}
          style={style({ '--top': `${item.top}%`, '--delay': `${item.delay}s`, '--dur': `${item.duration}s`, '--size': `${item.size}px`, '--spin': `${item.spin}deg` })}
        >
          <svg viewBox="-12 -38 24 40" focusable="false">
            {item.kind === 'leaf'
              ? <><path d={LEAF} /><path className="nb__rib" d={RIB} /></>
              : <ellipse cx="0" cy="-18" rx="7" ry="11" />}
          </svg>
        </span>
      ))}
    </div>
  );
}
