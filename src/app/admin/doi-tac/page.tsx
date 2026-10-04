import { PartnerAdminScreen } from '@/components/admin/partners/PartnerAdminScreen';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <PartnerAdminScreen initialTab={params.tab === 'grants' ? 'grants' : undefined} initialGrantId={typeof params.grant === 'string' ? params.grant : undefined} />;
}
