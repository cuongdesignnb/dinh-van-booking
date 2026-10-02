import { AdminContentList } from '@/components/admin/content/AdminContentList';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminContentList kind="destination" title="Điểm đến" routeMode="edit" routeId={id} basePath="/admin/diem-den" />;
}
