import { PropertyCatalogScreen } from '@/components/admin/properties/PropertyCatalogScreen';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  return <PropertyCatalogScreen />;
}
