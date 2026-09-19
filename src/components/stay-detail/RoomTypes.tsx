'use client';

import { Check, Mountain, Scaling, UserRound, Users } from 'lucide-react';
import Image from 'next/image';
import { SmallLeaf } from '@/components/ui/Decor';
import { formatVnd } from '@/lib/format';
import { ROOMS_ANCHOR } from './BookingCard';
import { capacityIssue, useBooking } from './BookingContext';

export function RoomTypes() {
  const { stay, room, selection, chooseRoom, issue } = useBooking();
  return (
    <section className="rooms" id={ROOMS_ANCHOR} aria-labelledby="rooms-title">
      <h2 className="dsec-title" id="rooms-title" tabIndex={-1}>
        Các loại phòng &amp; gói dịch vụ <SmallLeaf className="section-title__leaf" />
      </h2>
      {issue?.kind === 'room' && (
        <p className="rooms__hint" role="status">
          Chọn một loại phòng bên dưới để tiếp tục đặt phòng.
        </p>
      )}
      <ul className="rooms__list">
        {stay.roomTypes.map((r, i) => {
          const selected = room?.id === r.id;
          const tooSmall = capacityIssue(r, selection);
          return (
            <li key={r.id} className="rtype" data-selected={selected || undefined} data-reveal="card" style={{ '--d': `${i * 80}ms` } as React.CSSProperties}>
              <div className="rtype__media">
                <Image src={r.image.src} alt={r.image.alt} fill sizes="(max-width: 767px) 92vw, 236px" className="rtype__img" />
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
                  <p className="rtype__price">
                    <strong>{formatVnd(r.pricePerNight)}</strong> / đêm
                  </p>
                  <button
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
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
