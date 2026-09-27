import { AdminOperationsScreen } from '@/components/admin/operations/AdminOperationsScreen';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  return <AdminOperationsScreen section="bookings" />;
}
