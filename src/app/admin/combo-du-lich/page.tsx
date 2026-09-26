import { AdminContentList } from '@/components/admin/content/AdminContentList';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  return <AdminContentList kind="combo" title="Combo du lịch" />;
}
