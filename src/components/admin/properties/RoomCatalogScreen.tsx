'use client';

import { ArrowLeft, BedDouble, ImagePlus, Pencil, Plus, RefreshCw } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { KIND_LABEL } from '@/lib/admin/formatters';
import { roomUnitKindLabel } from '@/lib/room-unit-kind';
import { RoomTypeEditor, type PropertyRoom } from './RoomTypeEditor';

type Property = {
  id: string;
  title: string;
  code: string;
  kind: string;
  publicationStatus: string;
  operatingStatus: string;
  roomTypes: PropertyRoom[];
};

const priceLabel = (amount: number | undefined) => amount === undefined
  ? 'Chưa có giá'
  : amount === 0 ? 'Liên hệ để nhận giá' : `${new Intl.NumberFormat('vi-VN').format(amount)}đ / đêm`;

export function RoomCatalogScreen({ routeMode, routeRoomId }: { routeMode?: 'create' | 'edit'; routeRoomId?: string } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('property') ?? '';
  const legacyRoomId = searchParams.get('room');
  const roomId = routeMode === 'create' ? 'create' : routeMode === 'edit' ? routeRoomId ?? null : legacyRoomId;
  const addingDistinctRoom = searchParams.get('new') === '1';
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState('');
  const propertySelectRef = useRef<HTMLSelectElement>(null);
  const [promptProperty, setPromptProperty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createSequence, setCreateSequence] = useState(0);

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const response = await apiRequest<{ items: Property[] }>('/properties');
      setProperties(response.items);
      return true;
    } catch (reason) {
      setProperties([]);
      setError(reason instanceof Error ? reason.message : 'Không tải được hạng phòng.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (routeMode || !legacyRoomId) return;
    const propertyQuery = `${propertyId ? `?property=${encodeURIComponent(propertyId)}` : ''}${addingDistinctRoom ? `${propertyId ? '&' : '?'}new=1` : ''}`;
    router.replace(legacyRoomId === 'create'
      ? `/admin/hang-phong/them${propertyQuery}`
      : `/admin/hang-phong/${encodeURIComponent(legacyRoomId)}${propertyQuery}`);
  }, [addingDistinctRoom, legacyRoomId, propertyId, routeMode, router]);

  const selected = properties.find((property) => property.id === propertyId);
  const editing = selected?.roomTypes.find((room) => room.id === roomId);
  const chooseExistingFirst = roomId === 'create' && Boolean(selected?.roomTypes.length) && !addingDistinctRoom;
  const rooms = useMemo(() => properties.flatMap((property) => property.roomTypes.map((room) => ({ property, room })))
    .filter(({ property, room }) => (!propertyId || property.id === propertyId)
      && `${property.title} ${property.code} ${room.name} ${room.code}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))), [properties, propertyId, search]);
  const withoutRooms = properties.filter((property) => property.roomTypes.length === 0 && (!propertyId || property.id === propertyId));
  const totalRooms = properties.reduce((count, property) => count + property.roomTypes.length, 0);
  const hiddenRooms = properties.reduce((count, property) => count + property.roomTypes.filter((room) => room.status !== 'active').length, 0);
  const missingProperties = properties.filter((property) => property.roomTypes.length === 0).length;
  const goToList = () => router.push(propertyId ? `/admin/hang-phong?property=${encodeURIComponent(propertyId)}` : '/admin/hang-phong');
  const openRoom = (targetPropertyId: string, targetRoomId: string, createDistinct = false) => {
    setNotice(null);
    setPromptProperty(false);
    const propertyQuery = `?property=${encodeURIComponent(targetPropertyId)}${createDistinct && targetRoomId === 'create' ? '&new=1' : ''}`;
    router.push(targetRoomId === 'create' ? `/admin/hang-phong/them${propertyQuery}` : `/admin/hang-phong/${encodeURIComponent(targetRoomId)}${propertyQuery}`);
  };
  const afterSaved = async (savedRoomId: string, addAnother = false) => {
    if (await load()) {
      setCreateSequence((current) => current + 1);
      if (addAnother) {
        setNotice('Đã lưu hạng phòng. Tiếp tục tạo hạng khác cho cùng nơi lưu trú.');
        router.replace(`/admin/hang-phong/them?property=${encodeURIComponent(propertyId)}&new=1`);
      }
      else if (roomId === 'create') router.replace(`/admin/hang-phong/${encodeURIComponent(savedRoomId)}?property=${encodeURIComponent(propertyId)}`);
    }
  };

  return <section className="property-catalog room-catalog">
    {roomId ? <div className="admin-form-page__head">
      <button type="button" className="abtn abtn--ghost admin-form-page__back" onClick={goToList}><ArrowLeft size={16} aria-hidden="true" /> Quay lại danh sách hạng phòng</button>
      <div className="admin-form-page__title"><h2>{chooseExistingFirst ? `Hạng phòng của ${selected?.title ?? 'nơi lưu trú'}` : roomId === 'create' ? `Hạng phòng mới · ${selected?.title ?? 'nơi lưu trú'}` : `Chỉnh sửa hạng phòng · ${selected?.title ?? 'nơi lưu trú'}`}</h2><p>Một nơi lưu trú có nhiều hạng; mỗi hạng có giá, sức chứa, số phòng/căn và album riêng.</p></div>
    </div> : <div className="settings-screen__head">
      <div><h2>Hạng phòng</h2><p className="ahint">Quản lý hạng phòng theo từng nơi lưu trú: sức chứa, giá, số phòng và album ảnh. Quỹ phòng theo ngày nằm ở mục “Quỹ phòng”.</p></div>
      <button type="button" className="abtn abtn--ghost" onClick={() => void load()} disabled={loading}><RefreshCw size={15} aria-hidden="true" /> Tải lại</button>
    </div>}

    {error && <div className="acard room-catalog__error-state" role="alert">
      <p className="settings-screen__message settings-screen__message--error">Không tải được danh sách hạng phòng từ API. {error}</p>
      <button type="button" className="abtn abtn--primary" onClick={() => void load()}><RefreshCw size={15} aria-hidden="true" /> Tải lại danh sách</button>
    </div>}
    {notice && <p className="settings-screen__message settings-screen__message--success" role="status">{notice}</p>}

    {error ? null : roomId ? (loading ? <div className="acard apending">Đang tải hạng phòng…</div>
      : !selected || (roomId !== 'create' && !editing) ? <div className="acard apending">Không tìm thấy hạng phòng hoặc nơi lưu trú. <button type="button" className="abtn abtn--ghost" onClick={() => router.push('/admin/hang-phong')}>Về danh sách</button></div>
        : <>
          <div className="acard room-catalog__property-context" aria-label="Nơi lưu trú của hạng phòng">
            <div><span className="room-catalog__eyebrow">Đang quản lý hạng phòng của</span><h3>{selected.title}</h3><p className="ahint">{KIND_LABEL[selected.kind as keyof typeof KIND_LABEL] ?? selected.kind} · Mã cơ sở {selected.code} · {selected.publicationStatus === 'published' ? 'Đã xuất bản' : 'Bản nháp'} · {selected.operatingStatus === 'active' ? 'Đang vận hành' : 'Chưa mở bán'}</p></div>
            <div className="room-catalog__context-actions"><Link className="abtn abtn--ghost abtn--sm" href={`/admin/phong-nghi/${encodeURIComponent(selected.id)}`}>Xem nơi lưu trú</Link>{roomId === 'create' && <Link className="abtn abtn--ghost abtn--sm" href="/admin/hang-phong">Chọn nơi lưu trú khác</Link>}</div>
            <div className="room-catalog__existing"><strong>Hạng phòng hiện có ({selected.roomTypes.length})</strong>{selected.roomTypes.length > 0 && roomId === 'create' && <p className="room-catalog__existing-guidance">Đây là các hạng riêng của {selected.title}. Hãy chọn “Sửa hạng này” để bổ sung giá, sức chứa, số căn và ảnh cho đúng hạng; chỉ tạo mới nếu còn hạng khác chưa có trong danh sách.</p>}{selected.roomTypes.length ? <ul>{selected.roomTypes.map((item) => <li key={item.id}>
              <button type="button" onClick={() => openRoom(selected.id, item.id)} aria-label={`Sửa hạng ${item.name}`} aria-pressed={roomId === item.id}><strong>{item.name}</strong><span>{item.code} · {item.status === 'active' ? 'Đang hoạt động' : 'Tạm ẩn'}</span><span className="room-catalog__edit-link"><Pencil size={13} aria-hidden="true" /> Sửa hạng này</span></button>
              <p><span>{roomUnitKindLabel(item.unitKind) ?? 'Chưa phân loại'}</span><span>{item.bedroomCount == null ? 'Chưa rõ số phòng ngủ' : `${item.bedroomCount} phòng ngủ`}</span><span>{item.areaSqm ? `${item.areaSqm}m²` : 'Chưa có diện tích'}</span><span>{item.capacityVerified && item.maxOccupancy !== null ? `${item.maxOccupancy} khách` : 'Sức chứa chờ xác minh'}</span><span>{item.unitCount ? `${item.unitCount} phòng/căn` : 'Chưa có số phòng/căn'}</span><span>{priceLabel(item.rate?.baseRateVnd)}</span></p>
            </li>)}</ul> : <p className="ahint">Chưa có hạng phòng. Hãy tạo hạng đầu tiên sau khi đã xác minh thông tin.</p>}</div>
          </div>
          {chooseExistingFirst ? <div className="acard room-catalog__create-choice">
            <div><h3>Chưa thấy đúng hạng cần quản lý?</h3><p>Chỉ thêm một hạng hoàn toàn mới khi cơ sở xác nhận hạng đó có thật. Không tạo lại các hạng đã liệt kê ở trên, cũng không dùng chung giá hoặc quỹ phòng giữa các hạng.</p></div>
            <button type="button" className="abtn abtn--primary" onClick={() => openRoom(selected.id, 'create', true)}><Plus size={16} aria-hidden="true" /> Tạo hạng khác cho {selected.title}</button>
          </div> : <>
            {roomId === 'create' && <p className="room-catalog__new-guidance" role="note">Bạn đang thêm <strong>hạng phòng thứ {selected.roomTypes.length + 1}</strong> cho <strong>{selected.title}</strong>. Mỗi hạng được lưu độc lập: kiểu chỗ ở, sức chứa, tiện nghi, giá, số phòng/căn và album riêng.</p>}
            <RoomTypeEditor key={`${selected.id}-${roomId}-${createSequence}`} propertyId={selected.id} propertyName={selected.title} propertyKind={selected.kind} existingRooms={selected.roomTypes} room={editing} onEditExisting={(existingRoomId) => openRoom(selected.id, existingRoomId)} onSaved={afterSaved} onCancel={goToList} />
          </>}
        </>)
      : <>
        {!loading && <div className="room-catalog__summary" role="group" aria-label="Tổng quan hạng phòng">
          <div><strong>{properties.length}</strong><span>Nơi lưu trú</span></div>
          <div><strong>{totalRooms}</strong><span>Hạng phòng đã tạo</span></div>
          <div><strong>{hiddenRooms}</strong><span>Hạng phòng tạm ẩn</span></div>
          <div><strong>{missingProperties}</strong><span>Nơi lưu trú chưa có hạng phòng</span></div>
        </div>}
        <div className="acard room-catalog__toolbar">
          <label className="afield"><span>Tìm hạng phòng</span><input className="ainput" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên, mã hạng phòng hoặc nơi lưu trú" /></label>
          <label className="afield"><span>Nơi lưu trú</span><select ref={propertySelectRef} className="ainput" value={propertyId} onChange={(event) => { setPromptProperty(false); router.replace(event.target.value ? `/admin/hang-phong?property=${encodeURIComponent(event.target.value)}` : '/admin/hang-phong'); }}><option value="">Tất cả nơi lưu trú</option>{properties.map((property) => <option value={property.id} key={property.id}>{property.title} ({property.roomTypes.length})</option>)}</select></label>
          <button type="button" className="abtn abtn--primary" onClick={() => { if (selected) openRoom(selected.id, 'create', true); else { setPromptProperty(true); propertySelectRef.current?.focus(); } }}><Plus size={16} aria-hidden="true" /> {selected ? 'Thêm hạng cho cơ sở này' : 'Chọn cơ sở để thêm hạng'}</button>
        </div>
        {!selected && !loading && <p className="ahint room-catalog__instruction" role={promptProperty ? 'status' : undefined}>{promptProperty ? 'Hãy chọn nơi lưu trú trong ô phía trên, rồi bấm “Thêm hạng phòng”.' : 'Đang xem tất cả hạng phòng. Chọn nơi lưu trú ở trên để thêm hạng phòng; bản nháp/tạm ẩn chưa hiện ngoài website.'}</p>}
        {loading ? <div className="acard apending">Đang tải danh sách hạng phòng…</div> : <>
          <p className="ahint room-catalog__count">{rooms.length} hạng phòng · {withoutRooms.length} nơi lưu trú chưa có hạng phòng{search && ' · kết quả theo từ khóa'}</p>
          {rooms.length > 0 ? <div className="room-catalog__groups">
            {properties.filter((property) => rooms.some((item) => item.property.id === property.id)).map((group) => <section className="room-catalog__group" key={group.id} aria-label={`Hạng phòng của ${group.title}`}>
              <div className="room-catalog__group-head"><div><span className="room-catalog__eyebrow">Nơi lưu trú</span><h3>{group.title}</h3><p>{rooms.filter((item) => item.property.id === group.id).length} hạng phòng · {group.code}</p></div><button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => openRoom(group.id, 'create', true)}><Plus size={14} aria-hidden="true" /> Thêm hạng cho nơi này</button></div>
              <div className="property-catalog__list">{rooms.filter((item) => item.property.id === group.id).map(({ property, room }) => <article className="acard room-catalog__card" key={room.id}>
              <div className="room-catalog__image">{room.gallery[0]?.url ? <Image src={room.gallery[0].url} alt={room.gallery[0].alt || room.name} width={144} height={108} unoptimized /> : <span><ImagePlus size={22} aria-hidden="true" /> Chưa có ảnh</span>}</div>
              <div className="room-catalog__body"><div className="room-catalog__title"><div><h3>{room.name}</h3><p className="ahint">{property.title} · {room.code}</p></div><span className="abadge abadge--neutral">{room.status === 'active' ? 'Đang hoạt động' : 'Tạm ẩn'}</span></div>
                <p className="room-catalog__facts"><span>{roomUnitKindLabel(room.unitKind) ?? 'Chưa phân loại kiểu chỗ ở'}</span><span>{room.bedroomCount == null ? 'Chưa rõ số phòng ngủ' : `${room.bedroomCount} phòng ngủ`}</span><span>{room.bathroomCount == null ? 'Chưa rõ số phòng tắm' : `${room.bathroomCount} phòng tắm`}</span><span><BedDouble size={15} aria-hidden="true" /> {room.unitCount ? `${room.unitCount} phòng/căn` : 'Chưa có số phòng/căn'}</span><span>{priceLabel(room.rate?.baseRateVnd)}</span><span>{room.capacityVerified && room.maxAdults !== null && room.maxChildren !== null ? `${room.maxAdults + room.maxChildren} khách tối đa` : 'Sức chứa chờ xác minh'}</span><span>{room.gallery.length} ảnh album</span></p>
                <p className="ahint">{property.publicationStatus === 'published' ? 'Nơi lưu trú đã xuất bản' : 'Nơi lưu trú còn là bản nháp'} · {property.operatingStatus === 'active' ? 'Đang vận hành' : 'Chưa mở bán'}</p>
              <div className="room-catalog__actions"><button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => openRoom(property.id, room.id)}><Pencil size={14} aria-hidden="true" /> Sửa hạng phòng</button><Link className="abtn abtn--ghost abtn--sm" href={`/admin/phong-nghi/${encodeURIComponent(property.id)}`}>Xem nơi lưu trú</Link></div>
              </div>
              </article>)}</div>
            </section>)}
          </div> : <div className="acard apending">{search ? 'Không có hạng phòng phù hợp với từ khóa.' : 'Chưa có hạng phòng cho nơi lưu trú này.'}</div>}
          {withoutRooms.length > 0 && !search && <div className="acard room-catalog__missing"><h3>Nơi lưu trú chưa có hạng phòng</h3><p className="ahint">Chỉ thêm hạng phòng khi đã xác minh thông tin thực tế. Bản nháp chưa xuất hiện trên website.</p><ul>{withoutRooms.map((property) => <li key={property.id}><span>{property.title}</span><button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => openRoom(property.id, 'create')}><Plus size={14} aria-hidden="true" /> Thêm</button></li>)}</ul></div>}
        </>}
      </>}
  </section>;
}
