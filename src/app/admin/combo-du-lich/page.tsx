import { CombosScreen } from '@/components/admin/combos/CombosScreen';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  return <CombosScreen />;
}
