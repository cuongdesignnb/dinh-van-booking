import { PendingModule } from '@/components/admin/shell/AdminShell';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  return <PendingModule title="Quản lý đặt phòng" />;
}
