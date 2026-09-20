import { PropertiesScreen } from '@/components/admin/properties/PropertiesScreen';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  return <PropertiesScreen />;
}
