import { InquiryInbox } from '@/components/admin/crm/InquiryInbox';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  return <InquiryInbox />;
}
