import { AdminContentList } from '@/components/admin/content/AdminContentList';

export default function Page() {
  return <AdminContentList kind="article" title="Nội dung website" routeMode="create" basePath="/admin/noi-dung" />;
}
