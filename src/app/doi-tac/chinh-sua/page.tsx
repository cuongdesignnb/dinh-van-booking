import { PartnerPortal, type PartnerEditorRoute } from '@/components/partner/PartnerPortal';

const EDITOR_MODES: PartnerEditorRoute['mode'][] = ['property-create', 'room-create', 'profile', 'room', 'rate'];

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requestedMode = typeof params.mode === 'string' ? params.mode : 'profile';
  const mode = EDITOR_MODES.includes(requestedMode as PartnerEditorRoute['mode'])
    ? requestedMode as PartnerEditorRoute['mode']
    : 'profile';
  return <PartnerPortal editorRoute={{
    mode,
    propertyId: typeof params.property === 'string' ? params.property : undefined,
    roomTypeId: typeof params.room === 'string' ? params.room : undefined,
    ratePlanId: typeof params.rate === 'string' ? params.rate : undefined,
  }} />;
}
