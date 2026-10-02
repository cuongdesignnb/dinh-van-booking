import { AdminContentList } from '@/components/admin/content/AdminContentList';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminContentList kind="combo" title="Combo du lịch" routeMode="edit" routeId={id} basePath="/admin/combo-du-lich" />;
}
