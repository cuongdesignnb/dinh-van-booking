import { AdminContentList } from '@/components/admin/content/AdminContentList';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminContentList kind="article" title="Nội dung website" routeMode="edit" routeId={id} basePath="/admin/noi-dung" />;
}
