import { AdminOperationsScreen } from '@/components/admin/operations/AdminOperationsScreen';

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Reading the params keeps this route dynamic so client islands never bail
  // out of server rendering.
  await searchParams;
  return <AdminOperationsScreen section="dashboard" />;
}
