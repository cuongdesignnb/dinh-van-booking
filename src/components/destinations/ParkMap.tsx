'use client';

import { ArrowRight, Clock3, Info, MapPin, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PARK_KIND_LABEL, PARK_MAP_NOTE, PARK_POINTS, type ParkPoint, type ParkPointKind } from '@/data/park-map';
import { PARK_GEO } from '@/data/park-map-geo';

const { W, H } = PARK_GEO;

const KINDS: Array<'all' | ParkPointKind> = ['all', 'cave', 'tree', 'nature', 'village', 'lake', 'service'];

export function ParkMap({ publishedSlugs }: { publishedSlugs: string[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kind, setKind] = useState<'all' | ParkPointKind>('all');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => PARK_POINTS.find((point) => point.id === selectedId) ?? null, [selectedId]);
  const published = useMemo(() => new Set(publishedSlugs), [publishedSlugs]);

  // Draw-in animation starts when the map scrolls into view.
  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } }, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selected) return;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const visible = (point: ParkPoint) => kind === 'all' || point.kind === kind;
  // Selecting a point zooms the map onto it so close-together points stay easy to tell apart.
  const zoom = selected ? 2.2 : 1;
  const zoomStyle = selected
    ? { transform: `translate(${(0.4 - selected.x / W) * 100}%, ${(0.5 - selected.y / H) * 100}%) scale(${zoom})`, transformOrigin: `${(selected.x / W) * 100}% ${(selected.y / H) * 100}%`, '--z': zoom } as React.CSSProperties
    : { '--z': 1 } as React.CSSProperties;
  const counts = useMemo(() => PARK_POINTS.reduce<Record<string, number>>((acc, point) => { acc[point.kind] = (acc[point.kind] ?? 0) + 1; return acc; }, {}), []);

  return (
    <section ref={rootRef} className={`park-map content-shell${inView ? ' is-in-view' : ''}`} aria-labelledby="park-map-title">
      <div className="park-map__head">
        <div>
          <p className="park-map__eyebrow">Bản đồ tương tác</p>
          <h2 id="park-map-title">Sơ đồ tham quan Vườn quốc gia Cúc Phương</h2>
          <p className="park-map__lead">Bấm vào từng điểm để xem thông tin và thời gian đi bộ. Ranh giới, đường và đường mòn theo dữ liệu bản đồ thật.</p>
        </div>
        <div className="park-map__filters" role="group" aria-label="Lọc điểm trên bản đồ">
          {KINDS.map((key) => (
            <button key={key} type="button" className={`park-map__chip park-map__chip--${key}${kind === key ? ' is-on' : ''}`} aria-pressed={kind === key} onClick={() => setKind(key)}>
              {key === 'all' ? 'Tất cả' : PARK_KIND_LABEL[key]}
              <span>{key === 'all' ? PARK_POINTS.length : counts[key] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="park-map__stage">
        <div className="park-map__canvas" style={{ aspectRatio: `${W} / ${H}` }}>
          <div className={`park-map__zoom${selected ? ' is-zoomed' : ''}`} style={zoomStyle}>
          <svg className="park-map__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bản đồ Vườn quốc gia Cúc Phương theo dữ liệu OpenStreetMap: ranh giới vườn, đường rừng Cúc Phương từ khu trung tâm du khách tới Trung tâm Bống, đường mòn, sông và hồ.">
            <defs>
              <pattern id="pm-dots" width="14" height="14" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.4" className="park-map__dot" />
              </pattern>
              <radialGradient id="pm-glow" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#3f7d5a" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#3f7d5a" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width={W} height={H} className="park-map__bg" />
            <ellipse cx={W * 0.48} cy={H * 0.5} rx={W * 0.48} ry={H * 0.46} fill="url(#pm-glow)" />
            <text x={W * 0.30} y={46} className="park-map__region">HÒA BÌNH</text>
            <text x={W * 0.86} y={H * 0.42} className="park-map__region">NINH BÌNH</text>
            <text x={W * 0.18} y={H * 0.86} className="park-map__region">THANH HÓA</text>

            <path d={PARK_GEO.roads} className="park-map__outer-road" />
            <path d={PARK_GEO.rivers} className="park-map__river" />

            <path d={PARK_GEO.boundary} className="park-map__park" />
            <path d={PARK_GEO.boundary} className="park-map__park-dots" fill="url(#pm-dots)" />
            <path d={PARK_GEO.boundary} className="park-map__border" pathLength={1} />

            <path d={PARK_GEO.lakes} className="park-map__lake" />
            <g className="park-map__trail-g"><path d={PARK_GEO.trails} className="park-map__trail" /></g>

            <path d={PARK_GEO.mainRoad} className="park-map__road-casing" />
            <path d={PARK_GEO.mainRoad} className="park-map__road" pathLength={1} />
          </svg>

          <ul className="park-map__pins">
            {PARK_POINTS.map((point, index) => {
              const shown = visible(point);
              const active = point.id === selectedId;
              return (
                <li
                  key={point.id}
                  className={`park-pin park-pin--${point.kind} park-pin--label-${point.labelSide ?? 'bottom'}${active ? ' is-active' : ''}${shown ? '' : ' is-dim'}${point.pinned || active || hoverId === point.id ? ' has-label' : ''}`}
                  style={{ left: `${(point.x / W) * 100}%`, top: `${(point.y / H) * 100}%`, animationDelay: `${1.2 + index * 0.05}s` }}
                >
                  <button
                    type="button"
                    className="park-pin__btn"
                    aria-label={`${point.name}${point.no ? ` (điểm ${point.no})` : ''}: ${PARK_KIND_LABEL[point.kind]}`}
                    aria-pressed={active}
                    tabIndex={shown ? 0 : -1}
                    onClick={() => setSelectedId(active ? null : point.id)}
                    onMouseEnter={() => setHoverId(point.id)}
                    onMouseLeave={() => setHoverId((current) => current === point.id ? null : current)}
                    onFocus={() => setHoverId(point.id)}
                    onBlur={() => setHoverId((current) => current === point.id ? null : current)}
                  >
                    <span className="park-pin__pulse" aria-hidden="true" />
                    <span className="park-pin__dot" aria-hidden="true">{point.no ?? ''}</span>
                  </button>
                  <span className="park-pin__label" aria-hidden="true">{point.name}</span>
                </li>
              );
            })}
          </ul>
          </div>

          <ul className="park-map__legend" aria-label="Chú giải">
            <li><span className="park-map__key park-map__key--road" />Đường rừng Cúc Phương</li>
            <li><span className="park-map__key park-map__key--trail" />Đường mòn đi bộ</li>
            <li><span className="park-map__key park-map__key--river" />Sông, hồ</li>
            <li><span className="park-map__key park-map__key--border" />Ranh giới vườn</li>
          </ul>

          {selected && (
            <div ref={panelRef} className="park-map__panel" role="dialog" aria-modal="false" aria-labelledby="park-map-panel-title" tabIndex={-1}>
              <button type="button" className="park-map__close" onClick={() => setSelectedId(null)} aria-label="Đóng thông tin"><X size={18} aria-hidden="true" /></button>
              <p className={`park-map__kind park-map__kind--${selected.kind}`}>{PARK_KIND_LABEL[selected.kind]}{selected.no ? ` · Điểm ${selected.no}` : ''}</p>
              <h3 id="park-map-panel-title">{selected.name}</h3>
              {selected.alt && <p className="park-map__alt">{selected.alt}</p>}
              {selected.approx && <p className="park-map__approx">Vị trí ước lượng theo sơ đồ của vườn.</p>}
              <p className="park-map__summary">{selected.summary}</p>
              {!!selected.routes?.length && <ul className="park-map__routes">
                {selected.routes.map((route) => <li key={route}><Clock3 size={15} aria-hidden="true" />{route}</li>)}
              </ul>}
              <div className="park-map__actions">
                {selected.destinationSlug && published.has(selected.destinationSlug) && <Link className="park-map__link" href={`/diem-den/${selected.destinationSlug}`}>Xem bài giới thiệu <ArrowRight size={15} aria-hidden="true" /></Link>}
                <Link className="park-map__link park-map__link--ghost" href="/lien-he">Nhờ Đinh Vân gợi ý lịch trình</Link>
              </div>
              <p className="park-map__note"><Info size={14} aria-hidden="true" /> Cần hướng dẫn viên của vườn khi đi các tuyến.</p>
            </div>
          )}
        </div>
        <p className="park-map__source"><MapPin size={14} aria-hidden="true" /> {PARK_MAP_NOTE} Nền bản đồ: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors.</p>
      </div>
    </section>
  );
}
