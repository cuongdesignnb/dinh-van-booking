import { BookingsScreen } from '@/components/admin/bookings/BookingsScreen';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  return <BookingsScreen />;
}
