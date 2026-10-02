import { PropertyCatalogScreen } from '@/components/admin/properties/PropertyCatalogScreen';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PropertyCatalogScreen routeMode="edit" routeId={id} />;
}
