import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { validate } from 'class-validator';
import { PartnerService } from './partner.service';
import { AdminPartnerController } from './partner.controller';
import { CreateManualPartnerGrantDto, CreateManualPartnerOrganizationDto } from './partner.dto';
import { REQUIRED_PERMISSIONS } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types';

const id = '2c6a1a30-c739-49a1-bd8a-7b6de7b665ff';
const actor = { id, permissions: ['partner.grant'] } as AuthenticatedUser;
test('manual endpoints require grant; organization create requires BOTH review and grant', () => {
  for (const method of ['userCandidates', 'propertyCandidates', 'createManualGrant'] as const) assert.deepEqual(Reflect.getMetadata(REQUIRED_PERMISSIONS, AdminPartnerController.prototype[method]), ['partner.grant']);
  assert.deepEqual(Reflect.getMetadata(REQUIRED_PERMISSIONS, AdminPartnerController.prototype.createManualOrganization), ['partner.review', 'partner.grant']);
});
test('manual DTO validates explicit UUID scopes, rejects wildcard, duplicates, unverified org and wrong roles', async () => {
  const grant = Object.assign(new CreateManualPartnerGrantDto(), { userId: id, organizationId: id, propertyId: id, roomTypeScope: [id] });
  assert.equal((await validate(grant)).length, 0);
  grant.roomTypeScope = ['*']; assert((await validate(grant)).length);
  grant.roomTypeScope = [id, id]; assert((await validate(grant)).length);
  const org = Object.assign(new CreateManualPartnerOrganizationDto(), { userId: id, name: 'QA', organizationType: 'property_owner', contactName: 'QA', phone: '0900000000', membershipRole: 'owner', manuallyVerified: true });
  assert.equal((await validate(org)).length, 0);
  org.manuallyVerified = false; assert((await validate(org)).length);
  org.manuallyVerified = true; org.membershipRole = 'admin'; assert((await validate(org)).length);
});
test('service denies missing permissions, invalid expiry and write without read before any DB mutation', async () => {
  const service = Object.create(PartnerService.prototype) as PartnerService;
  const grant = { userId: id, organizationId: id, propertyId: id, roomTypeScope: [id] };
  await assert.rejects(() => service.createManualGrant(grant, { ...actor, permissions: [] }), /Không đủ quyền/);
  await assert.rejects(() => service.createManualGrant({ ...grant, canReadInventory: false, canWriteInventory: true }, actor), /cần đi cùng/);
  await assert.rejects(() => service.createManualGrant({ ...grant, expiresAt: 'invalid' }, actor), /Thời hạn/);
  await assert.rejects(() => service.createManualOrganization({} as CreateManualPartnerOrganizationDto, actor), /Không đủ quyền/);
});
test('user candidate search is bounded, select-only and never returns credential fields', async () => {
  const service = Object.create(PartnerService.prototype) as PartnerService;
  Object.defineProperty(service, 'prisma', { value: { user: { findMany: async (query: { take: number; select: Record<string, unknown> }) => {
    assert.equal(query.take, 20); assert.equal('passwordHash' in query.select, false); assert.equal('sessions' in query.select, false);
    return [{ id, email: 'qa@example.test', fullName: 'QA', disabledAt: null, partnerMemberships: [{ status: 'active', organization: { id, name: 'QA org', status: 'active' } }] }];
  } } } });
  assert.deepEqual(await service.adminUserCandidates('a'), { items: [] });
  const result = await service.adminUserCandidates('qa'); assert.deepEqual(Object.keys(result.items[0]).sort(), ['disabled', 'email', 'fullName', 'id', 'partnerOrganizations']);
});
