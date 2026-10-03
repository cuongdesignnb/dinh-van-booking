import { PartnerPortal } from '@/components/partner/PartnerPortal';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <PartnerPortal initialPropertyId={typeof params.property === 'string' ? params.property : undefined} />;
}
