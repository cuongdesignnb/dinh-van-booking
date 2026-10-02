import { AdminContentList } from '@/components/admin/content/AdminContentList';

export default function Page() {
  return <AdminContentList kind="destination" title="Điểm đến" routeMode="create" basePath="/admin/diem-den" />;
}
