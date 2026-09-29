'use client';

import { ChevronLeft, ChevronRight, ImageOff, Images } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import { useEffect, useId, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import type { ImageAsset } from '@/data/types';

/**
 * Large image + up to three thumbnails. Counts ("+N", "Xem tất cả N ảnh")
 * come from the real gallery length — never from the mockup's "28 ảnh".
 */
export function PropertyGallery({ images, note, name }: { images: ImageAsset[]; note?: string; name: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [main, ...rest] = images;
  const thumbs = rest.slice(0, 3);
  const hidden = images.length - 1 - thumbs.length;
  if (!main) {
    return (
      <div className="gallery gallery--empty" role="img" aria-label="Chưa có ảnh cho chỗ nghỉ này">
        Chưa có ảnh cho chỗ nghỉ này
      </div>
    );
  }
  return (
    <div className={`gallery gallery--${Math.min(images.length, 4)}`}>
      <button type="button" className="gallery__main" onClick={() => setIndex(0)} aria-label={failed[main.src] ? `Ảnh chưa tải được: ${main.alt}. Xem album` : `Xem ảnh lớn: ${main.alt}`}>
        {failed[main.src] ? <span className="gallery__image-fallback"><ImageOff size={30} aria-hidden="true" /> Ảnh tạm thời không hiển thị</span>
          : <Image src={main.src} alt={main.alt} fill priority sizes="(max-width: 767px) 100vw, 530px" className="gallery__img" onError={() => setFailed((current) => ({ ...current, [main.src]: true }))} />}
        {note && !failed[main.src] && (
          <span className="gallery__note handwritten" aria-hidden="true">
            {note.split('\n').map((line, i, all) => (
              <span key={line}>
                {i === 0 ? '“' : ''}
                {line}
                {i === all.length - 1 ? '”' : ''}
              </span>
            ))}
            <svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
              <path
                d="M12 20.5s-7.5-4.6-8.9-9.4C2 7.4 4.6 4.5 7.6 4.9c1.9.2 3.4 1.6 4.4 3.3 1-1.7 2.5-3.1 4.4-3.3 3-.4 5.6 2.5 4.5 6.2-1.4 4.8-8.9 9.4-8.9 9.4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </span>
        )}
      </button>
      {thumbs.map((t, i) => {
        const last = i === thumbs.length - 1 && hidden > 0;
        return (
          <button
            key={t.src}
            type="button"
            className="gallery__thumb"
            onClick={() => setIndex(i + 1)}
            aria-label={last ? `Xem thêm ${hidden} ảnh` : `Xem ảnh: ${t.alt}`}
          >
            {failed[t.src] ? <span className="gallery__image-fallback"><ImageOff size={20} aria-hidden="true" /> Ảnh chưa tải được</span>
              : <Image src={t.src} alt="" fill sizes="(max-width: 767px) 33vw, 192px" className="gallery__img" onError={() => setFailed((current) => ({ ...current, [t.src]: true }))} />}
            {last && <span className="gallery__more">+{hidden}</span>}
          </button>
        );
      })}
      <button type="button" className="gallery__all" onClick={() => setIndex(0)}>
        <Images size={15} aria-hidden="true" /> Xem tất cả {images.length} ảnh
      </button>
      <GalleryDialog images={images} index={index} onIndex={setIndex} name={name} />
    </div>
  );
}

export function GalleryDialog({
  images,
  index,
  onIndex,
  name,
}: {
  images: ImageAsset[];
  index: number | null;
  onIndex: (i: number | null) => void;
  name: string;
}) {
  const titleId = useId();
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const start = useRef<number | null>(null);
  const i = index ?? 0;
  const go = (delta: number) => {
    setDir(delta > 0 ? 'next' : 'prev');
    onIndex((i + delta + images.length) % images.length);
  };

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const img = images[i];
  const neighbours = images.length > 1
    ? Array.from(new Map([images[(i + 1) % images.length], images[(i - 1 + images.length) % images.length]]
      .filter((candidate) => candidate && candidate.src !== img?.src)
      .map((candidate) => [candidate.src, candidate])).values())
    : [];
  return (
    <Modal open={index !== null} onClose={() => onIndex(null)} labelledBy={titleId} size="xl" className="dialog--gallery">
      <h2 id={titleId} className="dialog__title">
        Ảnh {name}
      </h2>
      <div
        className="gview"
        onPointerDown={(e) => (start.current = e.clientX)}
        onPointerUp={(e) => {
          if (start.current === null) return;
          const dx = e.clientX - start.current;
          start.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
      >
        {img && (
          <figure className="gview__figure" key={img.src} data-dir={dir}>
            {failed[img.src] ? (
              <div className="gview__fallback" role="img" aria-label={img.alt}>
                Không tải được ảnh
              </div>
            ) : (
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(max-width: 1040px) 100vw, 980px"
                className="gview__img"
                onError={() => setFailed((f) => ({ ...f, [img.src]: true }))}
              />
            )}
            <figcaption className="gview__cap">
              <span>{img.caption ?? img.alt}</span>
              <span aria-live="polite">
                {i + 1} / {images.length}
              </span>
            </figcaption>
          </figure>
        )}
        {images.length > 1 && (
          <>
            <button type="button" className="gview__nav gview__nav--prev" onClick={() => go(-1)} aria-label="Ảnh trước">
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <button type="button" className="gview__nav gview__nav--next" onClick={() => go(1)} aria-label="Ảnh sau" data-autofocus>
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          </>
        )}
        {/* Preload only the adjacent images. */}
        <div hidden>
          {neighbours.map((n) => (
            <Image key={n.src} src={n.src} alt="" width={40} height={30} loading="eager" />
          ))}
        </div>
      </div>
      <ul className="gview__thumbs">
        {images.map((t, n) => (
          <li key={t.src}>
            <button type="button" aria-current={n === i || undefined} aria-label={`Ảnh ${n + 1}: ${t.alt}`} onClick={() => onIndex(n)}>
              <Image src={t.src} alt="" fill sizes="80px" />
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
