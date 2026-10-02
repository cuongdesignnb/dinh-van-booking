import { RoomCatalogScreen } from '@/components/admin/properties/RoomCatalogScreen';

export default async function Page({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <RoomCatalogScreen routeMode="edit" routeRoomId={roomId} />;
}
