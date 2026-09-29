'use client';

import { Check, ImageOff, Images, Mountain, Scaling, UserRound, Users } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import Link from 'next/link';
import { useState } from 'react';
import { SmallLeaf } from '@/components/ui/Decor';
import type { ImageAsset } from '@/data/types';
import { formatVnd } from '@/lib/format';
import { ROOMS_ANCHOR } from './BookingCard';
import { capacityIssue, useBooking } from './BookingContext';
import { GalleryDialog } from './PropertyGallery';

function RoomAlbum({ images, name }: { images: ImageAsset[]; name: string }) {
  const [index, setIndex] = useState<number | null>(null);
  if (!images.length) return null;
  return <><button type="button" className="rtype__gallery" onClick={() => setIndex(0)}><Images size={15} aria-hidden="true" /> Xem {images.length} ảnh</button><GalleryDialog images={images} index={index} onIndex={setIndex} name={name} /></>;
}

function RoomCover({ image }: { image: ImageAsset }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <span className="rtype__image-fallback" role="img" aria-label={`Ảnh phòng chưa tải được: ${image.alt}`}><ImageOff size={25} aria-hidden="true" /> Ảnh phòng chưa tải được</span>
    : <Image src={image.src} alt={image.alt} fill sizes="(max-width: 767px) 92vw, 236px" className="rtype__img" onError={() => setFailed(true)} />;
}

export function RoomTypes({ title }: { title?: string }) {
  const { stay, room, selection, chooseRoom, issue } = useBooking();
  return (
    <section className="rooms" id={ROOMS_ANCHOR} aria-labelledby="rooms-title">
      <h2 className="dsec-title" id="rooms-title" tabIndex={-1}>
        {title || 'Hạng phòng'} <SmallLeaf className="section-title__leaf" />
      </h2>
      {issue?.kind === 'room' && (
        <p className="rooms__hint" role="status">
          Chọn một loại phòng bên dưới để tiếp tục đặt phòng.
        </p>
      )}
      <ul className="rooms__list">
        {stay.roomTypes.map((r) => {
          const selected = room?.id === r.id;
          const tooSmall = capacityIssue(r, selection);
          return (
            <li key={r.id} className="rtype" data-selected={selected || undefined}>
              <div className="rtype__media">
                <RoomCover image={r.image} />
                <RoomAlbum images={r.gallery ?? []} name={r.name} />
                {r.badge && <span className="rtype__badge">{r.badge}</span>}
                {selected && (
                  <span className="rtype__chosen">
                    <Check size={13} strokeWidth={3} aria-hidden="true" /> Đã chọn
                  </span>
                )}
              </div>
              <div className="rtype__body">
                <h3 className="rtype__name">{r.name}</h3>
                <ul className="rtype__meta">
                  <li>
                    {r.capacity > 2 ? <Users size={14} aria-hidden="true" /> : <UserRound size={14} aria-hidden="true" />}
                    {r.capacity > 2 && r.capacity < 4 ? `2 - ${r.capacity}` : r.capacity} người
                  </li>
                  <li>
                    <Scaling size={13} aria-hidden="true" /> {r.areaM2}m²
                  </li>
                  <li>
                    <Mountain size={14} aria-hidden="true" /> {r.view}
                  </li>
                </ul>
                <p className="rtype__desc">{r.description}</p>
                {tooSmall && selected && (
                  <p className="rtype__warn" role="status">
                    {tooSmall}
                  </p>
                )}
                <div className="rtype__foot">
                  <p className="rtype__price">{r.pricePerNight > 0 ? <><strong>{formatVnd(r.pricePerNight)}</strong> / đêm</> : <strong>Liên hệ để nhận giá</strong>}</p>
                  {r.pricePerNight === 0 ? <Link href="/lien-he" className="btn btn--primary rtype__btn">Liên hệ</Link> : <button
                    type="button"
                    className="btn btn--primary rtype__btn"
                    aria-pressed={selected}
                    aria-label={`${selected ? 'Đã chọn' : 'Chọn'} ${r.name}`}
                    onClick={() => chooseRoom(r.id)}
                  >
                    {selected ? (
                      <>
                        <Check size={14} strokeWidth={3} aria-hidden="true" /> Đã chọn
                      </>
                    ) : (
                      'Chọn phòng'
                    )}
                  </button>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
