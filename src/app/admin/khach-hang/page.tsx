import { CrmScreen } from '@/components/admin/crm/CrmScreen';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  return <CrmScreen defaultTab="customers" />;
}
