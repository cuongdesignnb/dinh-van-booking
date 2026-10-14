'use client';

import { ArrowRight, Bath, BedDouble, Check, DoorOpen, House, ImageOff, Images, Scaling, Users } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import Link from 'next/link';
import { useState } from 'react';
import type { ImageAsset } from '@/data/types';
import { formatVnd } from '@/lib/format';
import { stayContactHref } from '@/lib/contact/stay-contact';
import { roomUnitKindLabel } from '@/lib/room-unit-kind';
import { ROOMS_ANCHOR } from './BookingCard';
import { capacityIssue, useBooking } from './BookingContext';
import { GalleryDialog } from './PropertyGallery';
import { amenityIcon } from './amenityIcons';

function RoomAlbum({ images, name }: { images: ImageAsset[]; name: string }) {
  const [index, setIndex] = useState<number | null>(null);
  if (!images.length) return null;
  return <><button type="button" className="rtype__gallery" onClick={() => setIndex(0)}><Images size={15} aria-hidden="true" /> Xem {images.length} ảnh</button><GalleryDialog images={images} index={index} onIndex={setIndex} name={name} /></>;
}

function RoomCover({ image }: { image: ImageAsset }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <span className="rtype__image-fallback" role="img" aria-label={`Ảnh phòng chưa tải được: ${image.alt}`}><ImageOff size={25} aria-hidden="true" /> Ảnh phòng chưa tải được</span>
    : <Image src={image.src} alt={image.alt} fill sizes="(max-width: 767px) 92vw, 260px" className="rtype__img" onError={() => setFailed(true)} />;
}

export function RoomTypes({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { stay, room, selection, chooseRoom, issue } = useBooking();
  return (
    <section className="rooms stp-section" id={ROOMS_ANCHOR} aria-labelledby="rooms-title">
      <h2 className="stp-h2" id="rooms-title" tabIndex={-1}>
        {title || 'Chọn hạng phòng phù hợp'}
      </h2>
      {subtitle && <p className="stp-lead">{subtitle}</p>}
      {issue?.kind === 'room' && (
        <p className="rooms__hint" role="status">
          Chọn một loại phòng bên dưới để tiếp tục.
        </p>
      )}
      <ul className="stp-rooms">
        {stay.roomTypes.map((r) => {
          const selected = room?.id === r.id;
          const tooSmall = capacityIssue(r, selection);
          const unit = roomUnitKindLabel(r.unitKind);
          return (
            <li key={r.id} className="stp-room" data-selected={selected || undefined}>
              <div className="stp-room__media">
                <RoomCover image={r.image} />
                <RoomAlbum images={r.gallery ?? []} name={r.name} />
                {r.badge && <span className="rtype__badge">{r.badge}</span>}
                {selected && (
                  <span className="rtype__chosen">
                    <Check size={13} strokeWidth={3} aria-hidden="true" /> Đã chọn
                  </span>
                )}
              </div>
              <div className="stp-room__body">
                <h3 className="stp-room__name">{r.name}</h3>
                {r.description && <p className="stp-room__desc">{r.description}</p>}
                <ul className="stp-room__meta">
                  <li><Users size={16} aria-hidden="true" /> Tối đa {r.capacity} khách</li>
                  {r.view?.trim() && <li><BedDouble size={16} aria-hidden="true" /> {r.view}</li>}
                  {r.areaM2 > 0 && <li><Scaling size={15} aria-hidden="true" /> {r.areaM2}m²</li>}
                  {unit && <li><House size={15} aria-hidden="true" /> {unit}</li>}
                  {r.bedroomCount != null && <li><DoorOpen size={15} aria-hidden="true" /> {r.bedroomCount} phòng ngủ</li>}
                  {r.bathroomCount != null && <li><Bath size={15} aria-hidden="true" /> {r.bathroomCount} phòng tắm</li>}
                </ul>
                {!!r.amenities?.length && (
                  <ul className="stp-room__chips" aria-label={`Tiện nghi ${r.name}`}>
                    {r.amenities.slice(0, 4).map((amenity) => {
                      const Icon = amenityIcon(amenity.code);
                      return <li key={amenity.code}><Icon size={14} aria-hidden="true" /> {amenity.label}</li>;
                    })}
                  </ul>
                )}
                {tooSmall && selected && (
                  <p className="rtype__warn" role="status">
                    {tooSmall}
                  </p>
                )}
              </div>
              <div className="stp-room__side">
                <p className="stp-room__price">
                  {r.pricePerNight > 0 ? <><strong>{formatVnd(r.pricePerNight)}</strong> <span>/ đêm</span></> : <strong>Liên hệ báo giá</strong>}
                </p>
                {r.pricePerNight === 0
                  ? <Link href={stayContactHref(stay.slug, selection, r.id)} className="btn btn--primary stp-room__btn" aria-label={`Chọn ${r.name}, liên hệ nhận giá`}>Chọn phòng <ArrowRight size={16} aria-hidden="true" /></Link>
                  : <button
                      type="button"
                      className="btn btn--primary stp-room__btn"
                      aria-pressed={selected}
                      aria-label={`${selected ? 'Đã chọn' : 'Chọn'} ${r.name}`}
                      onClick={() => chooseRoom(r.id)}
                    >
                      {selected ? <><Check size={15} strokeWidth={3} aria-hidden="true" /> Đã chọn</> : <>Chọn phòng <ArrowRight size={16} aria-hidden="true" /></>}
                    </button>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
