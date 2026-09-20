import { ContentScreen } from '@/components/admin/content/ContentScreen';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  return <ContentScreen defaultTab="articles" />;
}
