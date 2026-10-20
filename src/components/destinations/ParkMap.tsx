'use client';

import { ArrowRight, BedDouble, Clock3, ExternalLink, Images, Info, LocateFixed, MapPin, Minus, Navigation, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import Image from '@/components/ui/ManagedImage';
import { GalleryDialog } from '@/components/stay-detail/PropertyGallery';
import { PARK_COMMONS_PHOTOS, PARK_KIND_LABEL, PARK_MAP_NOTE, PARK_POINTS, PARK_STAYS, type ParkPhoto, type ParkPoint, type ParkPointKind } from '@/data/park-map';
import { PARK_GEO } from '@/data/park-map-geo';

const { W, H } = PARK_GEO;
const KINDS: ParkPointKind[] = ['cave', 'tree', 'nature', 'village', 'lake', 'service', 'stay'];
const ALL_POINTS: ParkPoint[] = [...PARK_POINTS, ...PARK_STAYS];
const MIN_Z = 1;
const MAX_Z = 6;

type View = { z: number; x: number; y: number };
type Box = { cw: number; ch: number; ww: number; wh: number; ox: number; oy: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * @param photos Albums the team picked in Admin › Điểm đến › Ảnh trên bản đồ, keyed by point id.
 *   A point without its own album falls back to verified Wikimedia Commons photos, if any.
 */
export function ParkMap({ publishedSlugs, photos = {} }: { publishedSlugs: string[]; photos?: Record<string, ParkPhoto[]> }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kind, setKind] = useState<'all' | ParkPointKind>('all');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [inView, setInView] = useState(false);
  const [view, setView] = useState<View>({ z: 1, x: 0, y: 0 });
  const [animate, setAnimate] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const [wheelHint, setWheelHint] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; view: View; dist?: number; moved: boolean } | null>(null);
  const selected = useMemo(() => ALL_POINTS.find((point) => point.id === selectedId) ?? null, [selectedId]);
  const published = useMemo(() => new Set(publishedSlugs), [publishedSlugs]);
  const photosFor = useCallback((id: string): ParkPhoto[] => (photos[id]?.length ? photos[id] : PARK_COMMONS_PHOTOS[id] ?? []), [photos]);
  const selectedPhotos = selected ? photosFor(selected.id) : [];
  const counts = useMemo(() => ALL_POINTS.reduce<Record<string, number>>((acc, point) => { acc[point.kind] = (acc[point.kind] ?? 0) + 1; return acc; }, {}), []);

  // Draw-in animation starts when the map scrolls into view.
  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } }, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // The map is drawn "contain"-style inside the canvas; keep its pixel box in sync with the layout.
  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const measure = () => {
      const cw = node.clientWidth;
      const ch = node.clientHeight;
      const ww = Math.min(cw, (ch * W) / H);
      const wh = (ww * H) / W;
      setBox({ cw, ch, ww, wh, ox: (cw - ww) / 2, oy: (ch - wh) / 2 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const limit = useCallback((next: View): View => {
    if (!box) return next;
    const z = clamp(next.z, MIN_Z, MAX_Z);
    // Allow panning until the map edge reaches the canvas edge.
    const minX = Math.min(0, box.cw - box.ox - box.ww * z) - box.ww * 0.15;
    const maxX = Math.max(0, -box.ox) + box.ww * 0.15;
    const minY = Math.min(0, box.ch - box.oy - box.wh * z) - box.wh * 0.15;
    const maxY = Math.max(0, -box.oy) + box.wh * 0.15;
    return z === 1 ? { z, x: 0, y: 0 } : { z, x: clamp(next.x, minX, maxX), y: clamp(next.y, minY, maxY) };
  }, [box]);

  /** Zoom keeping the canvas point (cx, cy) fixed. */
  const zoomAt = useCallback((factor: number, cx: number, cy: number, smooth = true) => {
    if (!box) return;
    setAnimate(smooth);
    setView((current) => {
      const z = clamp(current.z * factor, MIN_Z, MAX_Z);
      const px = cx - box.ox;
      const py = cy - box.oy;
      return limit({ z, x: px - ((px - current.x) * z) / current.z, y: py - ((py - current.y) * z) / current.z });
    });
  }, [box, limit]);

  const focusPoint = useCallback((point: ParkPoint) => {
    if (!box) return;
    const z = Math.max(view.z, 2.6);
    // Centre the point in the area the info card leaves free (the card sits on the right).
    const wide = box.cw > 560;
    const card = wide ? Math.min(360, box.cw - 32) + 16 : 0;
    const targetX = (box.cw - card) / 2 - box.ox;
    const targetY = (wide ? box.ch * 0.5 : box.ch * 0.42) - box.oy;
    setAnimate(true);
    setView(limit({ z, x: targetX - (point.x / W) * box.ww * z, y: targetY - (point.y / H) * box.wh * z }));
  }, [box, limit, view.z]);

  const select = useCallback((point: ParkPoint | null) => {
    setSelectedId(point?.id ?? null);
    setGalleryIndex(null);
    if (point) focusPoint(point);
  }, [focusPoint]);

  const reset = () => { setAnimate(true); setView({ z: 1, x: 0, y: 0 }); setSelectedId(null); };

  useEffect(() => {
    if (!selected) return;
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('.dialog--gallery[open]')) setSelectedId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  // Ctrl/⌘ + wheel zooms; a plain wheel keeps scrolling the page and shows a hint.
  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    let hintTimer = 0;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        setWheelHint(true);
        window.clearTimeout(hintTimer);
        hintTimer = window.setTimeout(() => setWheelHint(false), 1400);
        return;
      }
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      zoomAt(event.deltaY < 0 ? 1.25 : 0.8, event.clientX - rect.left, event.clientY - rect.top, false);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => { node.removeEventListener('wheel', onWheel); window.clearTimeout(hintTimer); };
  }, [zoomAt]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, a, .park-map__panel')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointers.current.set(event.pointerId, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    event.currentTarget.setPointerCapture(event.pointerId);
    const pts = [...pointers.current.values()];
    const center = pts.length === 2 ? { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } : pts[0];
    gesture.current = { x: center.x, y: center.y, view, dist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : undefined, moved: false };
    setAnimate(false);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId) || !gesture.current || !box) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointers.current.set(event.pointerId, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    const pts = [...pointers.current.values()];
    const start = gesture.current;
    if (pts.length === 2 && start.dist) {
      const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const z = clamp(start.view.z * (Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) / start.dist), MIN_Z, MAX_Z);
      const px = start.x - box.ox;
      const py = start.y - box.oy;
      start.moved = true;
      setView(limit({ z, x: center.x - box.ox - ((px - start.view.x) * z) / start.view.z, y: center.y - box.oy - ((py - start.view.y) * z) / start.view.z }));
      return;
    }
    const dx = pts[0].x - start.x;
    const dy = pts[0].y - start.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) start.moved = true;
    if (start.view.z > 1) setView(limit({ z: start.view.z, x: start.view.x + dx, y: start.view.y + dy }));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
  };

  const visible = (point: ParkPoint) => kind === 'all' || point.kind === kind;
  const worldStyle: CSSProperties | undefined = box
    ? { left: box.ox, top: box.oy, width: box.ww, height: box.wh, transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, '--z': view.z } as CSSProperties
    : undefined;

  return (
    <section ref={rootRef} className={`park-map content-shell${inView ? ' is-in-view' : ''}`} aria-labelledby="park-map-title">
      <div className="park-map__head">
        <div>
          <p className="park-map__eyebrow">Bản đồ tương tác</p>
          <h2 id="park-map-title">Sơ đồ tham quan Vườn quốc gia Cúc Phương</h2>
        </div>
        <ol className="park-map__howto" aria-label="Cách dùng bản đồ">
          <li><span>1</span>Chọn điểm trong danh sách hoặc bấm trên bản đồ</li>
          <li><span>2</span>Kéo để di chuyển, nút + / − để phóng to</li>
          <li><span>3</span>Xem thông tin, thời gian đi bộ và chỉ đường</li>
        </ol>
      </div>

      <div className="park-map__layout">
        <aside className="park-map__list" aria-label="Danh sách điểm">
          <div className="park-map__filters" role="group" aria-label="Lọc theo loại">
            <button type="button" className={`park-map__chip${kind === 'all' ? ' is-on' : ''}`} aria-pressed={kind === 'all'} onClick={() => setKind('all')}>Tất cả <span>{ALL_POINTS.length}</span></button>
            {KINDS.map((key) => (
              <button key={key} type="button" className={`park-map__chip park-map__chip--${key}${kind === key ? ' is-on' : ''}`} aria-pressed={kind === key} onClick={() => setKind(key)}>
                <i className={`park-map__swatch park-map__swatch--${key}`} aria-hidden="true" />{PARK_KIND_LABEL[key]} <span>{counts[key] ?? 0}</span>
              </button>
            ))}
          </div>
          <ul className="park-map__items">
            {ALL_POINTS.filter(visible).map((point) => (
              <li key={point.id}>
                <button type="button" className={`park-map__item${point.id === selectedId ? ' is-on' : ''}`} onClick={() => select(point)} onMouseEnter={() => setHoverId(point.id)} onMouseLeave={() => setHoverId(null)}>
                  <i className={`park-map__badge park-map__badge--${point.kind}${point.approx ? ' is-approx' : ''}`} aria-hidden="true">{point.kind === 'stay' ? <BedDouble size={11} strokeWidth={2.4} /> : point.no ?? ''}</i>
                  <span><strong>{point.name}</strong><small>{PARK_KIND_LABEL[point.kind]}{point.approx ? ' · vị trí gần đúng' : ''}</small></span>
                  {photosFor(point.id)[0] && <Image className="park-map__thumb" src={photosFor(point.id)[0].thumb ?? photosFor(point.id)[0].src} alt="" width={44} height={44} loading="lazy" />}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="park-map__stage">
          <div
            ref={canvasRef}
            className={`park-map__canvas${view.z > 1 ? ' is-zoomed' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {box && <div className={`park-map__world${animate ? ' is-animating' : ''}`} style={worldStyle}>
              <svg className="park-map__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bản đồ Vườn quốc gia Cúc Phương theo dữ liệu OpenStreetMap: ranh giới vườn, đường rừng Cúc Phương, đường mòn, sông và hồ.">
                <defs>
                  <pattern id="pm-dots" width="14" height="14" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.4" className="park-map__dot" />
                  </pattern>
                  <radialGradient id="pm-glow" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor="#3f7d5a" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#3f7d5a" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect x={-W} y={-H} width={W * 3} height={H * 3} className="park-map__bg" />
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
                {ALL_POINTS.map((point, index) => {
                  const shown = visible(point);
                  const active = point.id === selectedId;
                  const cover = photosFor(point.id)[0];
                  return (
                    <li
                      key={point.id}
                      className={`park-pin park-pin--${point.kind} park-pin--label-${point.labelSide ?? 'bottom'}${point.approx ? ' is-approx' : ''}${cover ? ' has-photo' : ''}${active ? ' is-active' : ''}${shown ? '' : ' is-dim'}${(point.pinned && view.z < 2) || active || hoverId === point.id ? ' has-label' : ''}`}
                      style={{ left: `${(point.x / W) * 100}%`, top: `${(point.y / H) * 100}%`, animationDelay: `${1.2 + index * 0.04}s` }}
                    >
                      <button
                        type="button"
                        className="park-pin__btn"
                        aria-label={`${point.name}${point.no ? ` (điểm ${point.no})` : ''}: ${PARK_KIND_LABEL[point.kind]}`}
                        aria-pressed={active}
                        tabIndex={shown ? 0 : -1}
                        onClick={() => (active ? setSelectedId(null) : select(point))}
                        onMouseEnter={() => setHoverId(point.id)}
                        onMouseLeave={() => setHoverId((current) => current === point.id ? null : current)}
                        onFocus={() => setHoverId(point.id)}
                        onBlur={() => setHoverId((current) => current === point.id ? null : current)}
                      >
                        <span className="park-pin__pulse" aria-hidden="true" />
                        <span className="park-pin__dot" aria-hidden="true" style={cover ? { backgroundImage: `url("${cover.thumb ?? cover.src}")` } : undefined}>
                          {cover ? (point.no ? <span className="park-pin__no">{point.no}</span> : null) : point.kind === 'stay' ? <BedDouble size={12} strokeWidth={2.4} /> : point.no ?? ''}
                        </span>
                      </button>
                      <span className="park-pin__label" aria-hidden="true">{point.name}</span>
                    </li>
                  );
                })}
              </ul>
            </div>}

            <div className="park-map__controls" role="group" aria-label="Phóng to, thu nhỏ">
              <button type="button" onClick={() => box && zoomAt(1.5, box.cw / 2, box.ch / 2)} aria-label="Phóng to" disabled={view.z >= MAX_Z}><Plus size={18} aria-hidden="true" /></button>
              <button type="button" onClick={() => box && zoomAt(1 / 1.5, box.cw / 2, box.ch / 2)} aria-label="Thu nhỏ" disabled={view.z <= MIN_Z}><Minus size={18} aria-hidden="true" /></button>
              <button type="button" onClick={reset} aria-label="Xem toàn bộ vườn" title="Xem toàn bộ vườn"><LocateFixed size={17} aria-hidden="true" /></button>
            </div>

            <ul className="park-map__legend" aria-label="Chú giải">
              <li><span className="park-map__key park-map__key--road" />Đường rừng Cúc Phương</li>
              <li><span className="park-map__key park-map__key--trail" />Đường mòn đi bộ</li>
              <li><span className="park-map__key park-map__key--river" />Sông, hồ</li>
              <li><span className="park-map__key park-map__key--border" />Ranh giới vườn</li>
              <li><span className="park-map__key park-map__key--approx" />Vị trí gần đúng</li>
            </ul>

            <p className={`park-map__wheel-hint${wheelHint ? ' is-on' : ''}`} aria-hidden="true">Giữ Ctrl (⌘ trên Mac) và cuộn để phóng to bản đồ</p>

            {selected && (
              <div ref={panelRef} className="park-map__panel" role="dialog" aria-modal="false" aria-labelledby="park-map-panel-title" tabIndex={-1}>
                <button type="button" className="park-map__close" onClick={() => setSelectedId(null)} aria-label="Đóng thông tin"><X size={18} aria-hidden="true" /></button>
                {selectedPhotos.length > 0 && <div className="park-map__media">
                  <button type="button" className="park-map__cover" onClick={() => setGalleryIndex(0)} aria-label={`Xem album ảnh ${selected.name} (${selectedPhotos.length} ảnh)`}>
                    <Image key={selectedPhotos[0].src} src={selectedPhotos[0].src} alt={selectedPhotos[0].alt} fill sizes="360px" />
                    <span className="park-map__count"><Images size={14} aria-hidden="true" /> {selectedPhotos.length > 1 ? `Xem album · ${selectedPhotos.length} ảnh` : 'Xem ảnh lớn'}</span>
                  </button>
                  {selectedPhotos.length > 1 && <ul className="park-map__strip" aria-label="Ảnh khác">
                    {selectedPhotos.slice(1, 5).map((photo, index) => <li key={photo.src}>
                      <button type="button" onClick={() => setGalleryIndex(index + 1)} aria-label={`Xem ảnh ${index + 2}: ${photo.alt}`}>
                        <Image src={photo.thumb ?? photo.src} alt="" fill sizes="80px" />
                        {index === 3 && selectedPhotos.length > 5 && <span>+{selectedPhotos.length - 5}</span>}
                      </button>
                    </li>)}
                  </ul>}
                  {selectedPhotos[0].credit && <p className="park-map__credit">Ảnh: {selectedPhotos[0].href ? <a href={selectedPhotos[0].href} target="_blank" rel="noreferrer">{selectedPhotos[0].credit}</a> : selectedPhotos[0].credit}</p>}
                </div>}
                <p className={`park-map__kind park-map__kind--${selected.kind}`}>{PARK_KIND_LABEL[selected.kind]}{selected.no ? ` · Điểm ${selected.no}` : ''}</p>
                <h3 id="park-map-panel-title">{selected.name}</h3>
                {selected.alt && <p className="park-map__alt">{selected.alt}</p>}
                {selected.approx && <p className="park-map__approx">Vị trí gần đúng theo sơ đồ của vườn, chưa có toạ độ chính xác.</p>}
                <p className="park-map__summary">{selected.summary}</p>
                {!!selected.routes?.length && <ul className="park-map__routes">
                  {selected.routes.map((route) => <li key={route}><Clock3 size={15} aria-hidden="true" />{route}</li>)}
                </ul>}
                {selected.kind === 'stay' ? <>
                  <div className="park-map__actions">
                    {selected.lat !== undefined && selected.lng !== undefined && <a className="park-map__link" href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer"><Navigation size={15} aria-hidden="true" /> Chỉ đường <ExternalLink size={13} aria-hidden="true" /></a>}
                    <Link className="park-map__link park-map__link--ghost" href="/lien-he">Nhờ Đinh Vân tư vấn chỗ nghỉ</Link>
                  </div>
                  <p className="park-map__note"><Info size={14} aria-hidden="true" /> Dữ liệu từ OpenStreetMap, có thể chưa đầy đủ hoặc đã thay đổi.</p>
                </> : <>
                  <div className="park-map__actions">
                    {selected.destinationSlug && published.has(selected.destinationSlug) && <Link className="park-map__link" href={`/diem-den/${selected.destinationSlug}`}>Xem bài giới thiệu <ArrowRight size={15} aria-hidden="true" /></Link>}
                    <Link className="park-map__link park-map__link--ghost" href="/lien-he">Nhờ Đinh Vân gợi ý lịch trình</Link>
                  </div>
                  <p className="park-map__note"><Info size={14} aria-hidden="true" /> Cần hướng dẫn viên của vườn khi đi các tuyến.</p>
                </>}
              </div>
            )}
          </div>
          {selected && selectedPhotos.length > 0 && <GalleryDialog
            images={selectedPhotos.map((photo) => ({ src: photo.src, alt: photo.alt, width: photo.width, height: photo.height, caption: photo.credit ? `${photo.alt} — Ảnh: ${photo.credit}` : photo.alt }))}
            index={galleryIndex}
            onIndex={setGalleryIndex}
            name={selected.name}
          />}
          <p className="park-map__source"><MapPin size={14} aria-hidden="true" /><span>{PARK_MAP_NOTE} Nền bản đồ: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors.</span></p>
        </div>
      </div>
    </section>
  );
}
