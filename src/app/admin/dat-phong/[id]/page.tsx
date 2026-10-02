import { AdminOperationsScreen } from '@/components/admin/operations/AdminOperationsScreen';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminOperationsScreen section="bookings" bookingRouteMode="edit" bookingId={id} />;
}
