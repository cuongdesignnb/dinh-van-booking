'use client';

import { ArrowLeft, BedDouble, ImagePlus, Pencil, Plus, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RoomTypeEditor, type PropertyRoom } from './RoomTypeEditor';

type Property = {
  id: string;
  title: string;
  code: string;
  publicationStatus: string;
  operatingStatus: string;
  roomTypes: PropertyRoom[];
};

const priceLabel = (amount: number | undefined) => amount === undefined
  ? 'Chưa có giá'
  : amount === 0 ? 'Liên hệ để nhận giá' : `${new Intl.NumberFormat('vi-VN').format(amount)}đ / đêm`;

export function RoomCatalogScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('property') ?? '';
  const roomId = searchParams.get('room');
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<{ items: Property[] }>('/properties');
      setProperties(response.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được hạng phòng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selected = properties.find((property) => property.id === propertyId);
  const editing = selected?.roomTypes.find((room) => room.id === roomId);
  const rooms = useMemo(() => properties.flatMap((property) => property.roomTypes.map((room) => ({ property, room })))
    .filter(({ property, room }) => (!propertyId || property.id === propertyId)
      && `${property.title} ${property.code} ${room.name} ${room.code}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))), [properties, propertyId, search]);
  const withoutRooms = properties.filter((property) => property.roomTypes.length === 0 && (!propertyId || property.id === propertyId));
  const goToList = () => router.push(propertyId ? `${pathname}?property=${encodeURIComponent(propertyId)}` : pathname);
  const openRoom = (targetPropertyId: string, targetRoomId: string) => {
    setNotice(null);
    router.push(`${pathname}?property=${encodeURIComponent(targetPropertyId)}&room=${encodeURIComponent(targetRoomId)}`);
  };
  const afterSaved = async () => {
    await load();
    setNotice('Đã lưu hạng phòng vào hệ thống.');
    goToList();
  };

  return <section className="property-catalog room-catalog">
    {roomId ? <div className="admin-form-page__head">
      <button type="button" className="abtn abtn--ghost admin-form-page__back" onClick={goToList}><ArrowLeft size={16} aria-hidden="true" /> Quay lại danh sách hạng phòng</button>
      <div className="admin-form-page__title"><h2>{roomId === 'create' ? 'Thêm hạng phòng' : 'Chỉnh sửa hạng phòng'}</h2><p>{selected?.title ?? 'Đang tải nơi lưu trú…'}</p></div>
    </div> : <div className="settings-screen__head">
      <div><h2>Hạng phòng</h2><p className="ahint">Quản lý hạng phòng theo từng nơi lưu trú: sức chứa, giá, số phòng và album ảnh. Quỹ phòng theo ngày nằm ở mục “Quỹ phòng”.</p></div>
      <button type="button" className="abtn abtn--ghost" onClick={() => void load()} disabled={loading}><RefreshCw size={15} aria-hidden="true" /> Tải lại</button>
    </div>}

    {error && <p className="settings-screen__message settings-screen__message--error" role="alert">{error}</p>}
    {notice && <p className="settings-screen__message settings-screen__message--success" role="status">{notice}</p>}

    {roomId ? (loading ? <div className="acard apending">Đang tải hạng phòng…</div>
      : !selected || (roomId !== 'create' && !editing) ? <div className="acard apending">Không tìm thấy hạng phòng hoặc nơi lưu trú. <button type="button" className="abtn abtn--ghost" onClick={() => router.push(pathname)}>Về danh sách</button></div>
        : <RoomTypeEditor key={`${selected.id}-${roomId}`} propertyId={selected.id} room={editing} onSaved={afterSaved} onCancel={goToList} />)
      : <>
        <div className="acard room-catalog__toolbar">
          <label className="afield"><span>Tìm hạng phòng</span><input className="ainput" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên, mã hạng phòng hoặc nơi lưu trú" /></label>
          <label className="afield"><span>Nơi lưu trú</span><select className="ainput" value={propertyId} onChange={(event) => router.replace(event.target.value ? `${pathname}?property=${encodeURIComponent(event.target.value)}` : pathname)}><option value="">Tất cả nơi lưu trú</option>{properties.map((property) => <option value={property.id} key={property.id}>{property.title} ({property.roomTypes.length})</option>)}</select></label>
          <button type="button" className="abtn abtn--primary" disabled={!selected} onClick={() => selected && openRoom(selected.id, 'create')}><Plus size={16} aria-hidden="true" /> Thêm hạng phòng</button>
        </div>
        {!selected && !loading && <p className="ahint room-catalog__instruction">Chọn một nơi lưu trú ở trên để thêm hạng phòng; hoặc dùng nút “Thêm” ở danh sách nơi lưu trú chưa có hạng phòng bên dưới.</p>}
        {loading ? <div className="acard apending">Đang tải danh sách hạng phòng…</div> : <>
          <p className="ahint room-catalog__count">{rooms.length} hạng phòng · {withoutRooms.length} nơi lưu trú chưa có hạng phòng{search && ' · kết quả theo từ khóa'}</p>
          {rooms.length > 0 ? <div className="property-catalog__list">
            {rooms.map(({ property, room }) => <article className="acard room-catalog__card" key={room.id}>
              <div className="room-catalog__image">{room.gallery[0]?.url ? <Image src={room.gallery[0].url} alt={room.gallery[0].alt || room.name} width={144} height={108} unoptimized /> : <span><ImagePlus size={22} aria-hidden="true" /> Chưa có ảnh</span>}</div>
              <div className="room-catalog__body"><div className="room-catalog__title"><div><h3>{room.name}</h3><p className="ahint">{property.title} · {room.code}</p></div><span className="abadge abadge--neutral">{room.status === 'active' ? 'Đang hoạt động' : 'Tạm ẩn'}</span></div>
                <p className="room-catalog__facts"><span><BedDouble size={15} aria-hidden="true" /> {room.unitCount} phòng</span><span>{priceLabel(room.rate?.baseRateVnd)}</span><span>{room.unitCount === 0 && room.status !== 'active' ? 'Sức chứa chờ xác minh' : `${room.maxAdults + room.maxChildren} khách tối đa`}</span><span>{room.gallery.length} ảnh album</span></p>
                <p className="ahint">{property.publicationStatus === 'published' ? 'Nơi lưu trú đã xuất bản' : 'Nơi lưu trú còn là bản nháp'} · {property.operatingStatus === 'active' ? 'Đang vận hành' : 'Chưa mở bán'}</p>
                <div className="room-catalog__actions"><button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => openRoom(property.id, room.id)}><Pencil size={14} aria-hidden="true" /> Sửa hạng phòng</button><Link className="abtn abtn--ghost abtn--sm" href={`/admin/phong-nghi?edit=${encodeURIComponent(property.id)}`}>Xem nơi lưu trú</Link></div>
              </div>
            </article>)}
          </div> : <div className="acard apending">{search ? 'Không có hạng phòng phù hợp với từ khóa.' : 'Chưa có hạng phòng cho nơi lưu trú này.'}</div>}
          {withoutRooms.length > 0 && !search && <div className="acard room-catalog__missing"><h3>Nơi lưu trú chưa có hạng phòng</h3><p className="ahint">Chỉ thêm hạng phòng khi đã xác minh thông tin thực tế. Bản nháp chưa xuất hiện trên website.</p><ul>{withoutRooms.map((property) => <li key={property.id}><span>{property.title}</span><button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => openRoom(property.id, 'create')}><Plus size={14} aria-hidden="true" /> Thêm</button></li>)}</ul></div>}
        </>}
      </>}
  </section>;
}
