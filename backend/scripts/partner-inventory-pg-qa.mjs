import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Run only against a disposable PostgreSQL database. This script never selects a
// database URL itself; DB_* must point to the isolated QA container explicitly.
const [{ PrismaService }, { InventoryMutationService }, { AdminOperationsService }, { SheetsService }, { SheetsValuesProvider }, { PartnerService }, { PublicCatalogService }] = await Promise.all([
  import('../dist/prisma/prisma.service.js'),
  import('../dist/inventory/inventory-mutation.service.js'),
  import('../dist/admin-operations/admin-operations.service.js'),
  import('../dist/sheets/sheets.service.js'),
  import('../dist/sheets/sheets.provider.js'),
  import('../dist/partners/partner.service.js'),
  import('../dist/public/public-catalog.service.js'),
]);

if (process.env.DB_NAME !== 'dvb_partner_qa2' || process.env.DB_HOST !== '127.0.0.1') {
  throw new Error('Refusing to run: this acceptance script is restricted to DB_NAME=dvb_partner_qa2 on DB_HOST=127.0.0.1.');
}

const prisma = new PrismaService();
const inventory = new InventoryMutationService(prisma);
const settings = { get: async (key) => ({ 'sheetsSync.enabled': true, 'sheetsSync.importEnabled': true, 'partnerPortal.enabled': true, 'inventoryCalendar.enabled': true, 'publicAvailability.enabled': true, 'inventory.freshness': { nearTermDays: 7, nearTermFreshHours: 24, fartherFreshDays: 7 } }[key] ?? false) };
const operations = new AdminOperationsService(prisma, inventory, settings);
const partners = new PartnerService(prisma, settings, {}, inventory, {});
const publicCatalog = new PublicCatalogService(prisma, settings);
process.env.DVB_SHEETS_ADAPTER = 'fake';
const provider = new SheetsValuesProvider();
const sheets = new SheetsService(prisma, settings, inventory, provider);

const random = () => randomUUID().replaceAll('-', '');
const date = (value) => new Date(`${value}T00:00:00.000Z`);
const nextDate = (value) => { const next = date(value); next.setUTCDate(next.getUTCDate() + 1); return next.toISOString().slice(0, 10); };
const jsonDoc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Isolated QA fixture' }] }] };
const assertions = [];
function check(id, predicate, details) {
  assert.ok(predicate, `${id}: ${details}`);
  assertions.push({ id, details });
  console.log(`PASS ${id} — ${details}`);
}
// The Nest Prisma exception filter maps P2034/P2002 to HTTP 409. These direct
// service-level PostgreSQL tests assert the equivalent response class.
const errorStatus = (reason) => typeof reason?.getStatus === 'function' ? reason.getStatus()
  : ['P2034', 'P2002'].includes(reason?.code) || reason?.code === 'P2010' && reason?.meta?.driverAdapterError?.cause?.originalCode === '40001' ? 409 : null;
async function createStay({ dateText, capacity, label, publicationStatus = 'published' }) {
  const suffix = random().slice(0, 10).toUpperCase();
  const created = await prisma.property.create({ data: {
    code: `QA-${suffix}`, kind: 'homestay', area: 'Isolated QA', address: 'Not a real property',
    content: { create: { kind: 'stay', title: `QA fixture ${suffix}`, slugSource: `qa-fixture-${suffix.toLowerCase()}`, publicationStatus, bodyDocument: jsonDoc, routes: { create: { path: `/phong-nghi/qa-fixture-${suffix.toLowerCase()}` } } } },
    roomTypes: { create: { code: 'QA-ROOM', name: `QA room ${label}`, maxAdults: 2, maxChildren: 1, maxOccupancy: 3, capacityVerified: true } },
  }, include: { roomTypes: true, content: true } });
  const room = created.roomTypes[0];
  const rate = await prisma.ratePlan.create({ data: { roomTypeId: room.id, code: 'QA-RATE', name: 'QA rate', baseRateVnd: 10000n } });
  await prisma.inventoryDay.create({ data: { roomTypeId: room.id, stayDate: date(dateText), capacity, blockedCount: 0, heldCount: 0, reservedCount: 0, stopSell: false, lastConfirmedAt: new Date() } });
  return { property: created, room, rate, dateText };
}

async function createQuote(stay, ownerId) {
  const checkOut = nextDate(stay.dateText);
  const pricedSnapshot = {
    propertyId: stay.property.id, propertyName: stay.property.content.title, roomTypeId: stay.room.id,
    roomName: stay.room.name, ratePlanId: stay.rate.id, ratePlanVersion: stay.rate.version,
    quantity: 1, adults: 1, children: 0, maxAdultsPerRoom: 2, maxChildrenPerRoom: 1, maxOccupancyPerRoom: 3,
    checkIn: stay.dateText, checkOut, nights: [{ stayDate: stay.dateText, amountVnd: '10000', rateRuleId: null }],
    coupon: null, taxMode: 'inclusive', currency: 'VND',
  };
  return prisma.bookingQuote.create({ data: {
    requestSnapshot: { checkIn: stay.dateText, checkOut, roomTypeId: stay.room.id, quantity: 1 }, pricedSnapshot,
    pricingVersion: `${stay.rate.id}:${stay.rate.version}`, subtotalVnd: 10000n, discountVnd: 0n, totalVnd: 10000n, dueNowVnd: 3000n,
    ownerUserId: ownerId, expiresAt: new Date(Date.now() + 5 * 60_000),
  } });
}

async function createBooking(stay, quote, actor, idempotencyKey) {
  const contact = { fullName: 'QA Isolated', phone: `090${random().slice(0, 7)}`, email: `qa-${random().slice(0, 8)}@example.test` };
  return { result: await operations.createBookingFromQuote(quote.id, contact, idempotencyKey, { userId: actor.id, guestSessionId: null }, actor.id, 'website'), contact };
}

try {
  await prisma.$connect();
  const user = await prisma.user.create({ data: { email: `qa-${random()}@example.test`, fullName: 'Isolated QA Owner', passwordHash: 'not-a-login-hash' } });

  // CON-01: real booking hold path, twenty distinct quotes and idempotency keys.
  const con01 = await createStay({ dateText: '2027-01-10', capacity: 1, label: 'CON-01' });
  const quotes = await Promise.all(Array.from({ length: 20 }, () => createQuote(con01, user.id)));
  let releaseStart;
  const start = new Promise((resolve) => { releaseStart = resolve; });
  const contenders = quotes.map((quote, index) => (async () => {
    await start;
    const idempotencyKey = `qa-con01-${random()}`;
    const contact = { fullName: 'QA Isolated', phone: `091${String(index).padStart(7, '0')}`, email: `qa-con01-${index}@example.test` };
    const result = await operations.createBookingFromQuote(quote.id, contact, idempotencyKey, { userId: user.id, guestSessionId: null }, user.id, 'website');
    return { result, quoteId: quote.id, idempotencyKey, contact };
  })());
  const con01ResultsPromise = Promise.allSettled(contenders);
  releaseStart();
  const con01Results = await con01ResultsPromise;
  const con01Winners = con01Results.flatMap((result, index) => result.status === 'fulfilled' ? [{ ...result.value, quoteId: quotes[index].id }] : []);
  const con01Failures = con01Results.filter((result) => result.status === 'rejected');
  if (con01Winners.length !== 1) console.error('CON-01 diagnostics:', con01Failures.slice(0, 5).map((result) => ({ status: errorStatus(result.reason), message: result.reason?.message ?? String(result.reason) })));
  const con01Day = await prisma.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId: con01.room.id, stayDate: date(con01.dateText) } } });
  const con01Reservations = await prisma.inventoryReservation.count({ where: { bookingLine: { roomTypeId: con01.room.id }, status: 'held' } });
  check('CON-01', con01Winners.length === 1 && con01Failures.length === 19 && con01Failures.every((result) => errorStatus(result.reason) === 409) && con01Reservations === 1 && con01Day?.heldCount === 1 && con01Day.capacity >= con01Day.blockedCount + con01Day.heldCount + con01Day.reservedCount,
    `20 PostgreSQL booking requests → ${con01Winners.length} reservation, 19 domain 409s; held=${con01Day?.heldCount}, reserved=${con01Day?.reservedCount}`);
  const winner = con01Winners[0];
  const heldBeforeReplay = con01Day.heldCount;
  const replay = await operations.createBookingFromQuote(winner.quoteId, winner.contact, winner.idempotencyKey, { userId: user.id, guestSessionId: null }, user.id, 'website');
  const replayDay = await prisma.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId: con01.room.id, stayDate: date(con01.dateText) } } });
  check('CON-01-RETRY', replay.id === winner.result.id && replayDay?.heldCount === heldBeforeReplay && await prisma.inventoryReservation.count({ where: { bookingLine: { roomTypeId: con01.room.id } } }) === 1,
    'same idempotency key replays the original booking without a second reservation');

  // CON-02: a real booking hold races a partner ledger write against one remaining unit.
  const con02 = await createStay({ dateText: '2027-01-11', capacity: 1, label: 'CON-02' });
  const org = await prisma.partnerOrganization.create({ data: {
    name: `QA organization ${random().slice(0, 8)}`, contactName: user.fullName, email: `qa-org-${random()}@example.test`, phone: '0900000000',
    status: 'active', verificationStatus: 'verified', createdById: user.id,
  } });
  await prisma.partnerMembership.create({ data: { organizationId: org.id, userId: user.id, role: 'owner', status: 'active' } });
  await prisma.partnerPropertyGrant.create({ data: {
    organizationId: org.id, propertyId: con02.property.id, status: 'active', canReadInventory: true, canWriteInventory: true,
    canEditProfile: true, canEditRates: true,
    roomTypeScope: [con02.room.id], approvedById: user.id, approvedAt: new Date(),
  } });
  const con02Quote = await createQuote(con02, user.id);
  const con02Start = new Promise((resolve) => setTimeout(resolve, 0));
  const con02Race = await Promise.allSettled([
    con02Start.then(() => operations.createBookingFromQuote(con02Quote.id, { fullName: 'QA Booker', phone: `092${random().slice(0, 7)}` }, `qa-con02-book-${random()}`, { userId: user.id, guestSessionId: null }, user.id, 'website')),
    con02Start.then(() => inventory.setPartnerInventory({ organizationId: org.id, actorId: user.id, idempotencyKey: `qa-con02-partner-${random()}`, changes: [{ roomTypeId: con02.room.id, stayDate: con02.dateText, expectedVersion: 1, externalSoldCount: 1 }] })),
  ]);
  const con02Day = await prisma.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId: con02.room.id, stayDate: date(con02.dateText) } } });
  const con02Succeeded = con02Race.filter((result) => result.status === 'fulfilled').length;
  const con02Pass = con02Succeeded === 1 && !!con02Day && con02Day.version === 2 && con02Day.blockedCount + con02Day.heldCount + con02Day.reservedCount <= con02Day.capacity && con02Race.filter((result) => result.status === 'rejected').every((result) => errorStatus(result.reason) === 409);
  if (!con02Pass) console.error('CON-02 diagnostics:', con02Race.map((result) => result.status === 'fulfilled' ? { status: 'fulfilled' } : { status: errorStatus(result.reason), code: result.reason?.code, message: result.reason?.message?.split('\n')[0] ?? String(result.reason) }));
  check('CON-02', con02Pass,
    `booking and partner ledger had one winner, one conflict; version=${con02Day?.version}, blocked=${con02Day?.blockedCount}, held=${con02Day?.heldCount}`);

  const draftSearchStay = await createStay({ dateText: con02.dateText, capacity: 1, label: 'SEARCH-DRAFT', publicationStatus: 'draft' });
  await partners.assertCanSearchAvailability({ id: user.id });
  const scopedSearchDenied = await Promise.allSettled([partners.assertCanSearchAvailability({ id: (await prisma.user.create({ data: { email: `qa-search-outsider-${random()}@example.test`, fullName: 'Search outsider', passwordHash: 'not-a-login-hash' } })).id })]);
  const publicSearch = await publicCatalog.availability({ checkIn: con02.dateText, checkOut: nextDate(con02.dateText), rooms: '1', adults: '1', children: '0' });
  check('SEARCH-01/02/03', scopedSearchDenied[0].status === 'rejected' && errorStatus(scopedSearchDenied[0].reason) === 403 && publicSearch.items.some((item) => item.propertyId === con02.property.id) && publicSearch.items.every((item) => item.propertyId !== draftSearchStay.property.id) && publicSearch.items.every((item) => !('organizationId' in item) && !('guestDetails' in item)),
    'partner search requires approved membership; multi-night public DTO includes eligible records only and excludes draft/private scope fields');

  const crossMonthStay = await createStay({ dateText: '2027-01-31', capacity: 2, label: 'SEARCH-CROSS-MONTH' });
  await prisma.inventoryDay.create({ data: { roomTypeId: crossMonthStay.room.id, stayDate: date('2027-02-01'), capacity: 2, blockedCount: 0, heldCount: 0, reservedCount: 0, stopSell: false, lastConfirmedAt: new Date() } });
  const crossMonthSearch = await publicCatalog.availability({ checkIn: '2027-01-31', checkOut: '2027-02-02', rooms: '1', adults: '1', children: '0' });
  check('SEARCH-MULTI-NIGHT-CROSS-MONTH', crossMonthSearch.items.some((item) => item.propertyId === crossMonthStay.property.id && item.nights === 2),
    'a two-night availability query spanning January to February reads one shared nightly inventory source');

  // Authorization: membership, property grant, room scope, and revocation are
  // independently enforced even when the caller knows valid UUIDs.
  const unauthorizedUser = await prisma.user.create({ data: { email: `qa-outsider-${random()}@example.test`, fullName: 'Isolated outsider', passwordHash: 'not-a-login-hash' } });
  const changeFor = (organizationId, actorId, expectedVersion, externalSoldCount) => ({ organizationId, changes: [{ roomTypeId: con02.room.id, stayDate: con02.dateText, expectedVersion, externalSoldCount }] });
  const noMembership = await Promise.allSettled([partners.bulkInventory({ id: unauthorizedUser.id }, changeFor(org.id, unauthorizedUser.id, con02Day.version, 0), `qa-id-or-member-${random()}`)]);
  check('AUTH-IDOR-MEMBERSHIP', noMembership[0].status === 'rejected' && errorStatus(noMembership[0].reason) === 403,
    'a valid organization/property UUID cannot bypass active organization membership');
  const viewer = await prisma.user.create({ data: { email: `qa-viewer-${random()}@example.test`, fullName: 'Isolated viewer', passwordHash: 'not-a-login-hash' } });
  await prisma.partnerMembership.create({ data: { organizationId: org.id, userId: viewer.id, role: 'viewer', status: 'active' } });
  const viewerWrite = await Promise.allSettled([partners.bulkInventory({ id: viewer.id }, changeFor(org.id, viewer.id, con02Day.version, con02Day.blockedCount), `qa-viewer-write-${random()}`)]);
  check('AUTH-ROLE-VIEWER', viewerWrite[0].status === 'rejected' && errorStatus(viewerWrite[0].reason) === 403,
    'viewer membership cannot write inventory even when its organization has a writable property grant');
  const manager = await prisma.user.create({ data: { email: `qa-manager-${random()}@example.test`, fullName: 'Isolated manager', passwordHash: 'not-a-login-hash' } });
  await prisma.partnerMembership.create({ data: { organizationId: org.id, userId: manager.id, role: 'manager', status: 'active' } });
  const employee = await prisma.user.create({ data: { email: `qa-member-${random()}@example.test`, fullName: 'Registered partner member', passwordHash: 'not-a-login-hash' } });
  const addedMember = await partners.addOrganizationMember({ id: user.id }, org.id, { email: employee.email, role: 'viewer' });
  const ownerMemberList = await partners.organizationMembers({ id: user.id }, org.id);
  check('PARTNER-MEMBER-ADD', addedMember.userId === employee.id && addedMember.role === 'viewer' && addedMember.status === 'active' && ownerMemberList.items.some((item) => item.userId === employee.id),
    'owner can add a previously registered account and see the active membership');
  const managerMemberList = await Promise.allSettled([partners.organizationMembers({ id: manager.id }, org.id)]);
  check('PARTNER-MEMBER-OWNER-ONLY', managerMemberList[0].status === 'rejected' && errorStatus(managerMemberList[0].reason) === 403,
    'member-management list is restricted to the organization owner');
  const addedViewerWrite = await Promise.allSettled([partners.bulkInventory({ id: employee.id }, changeFor(org.id, employee.id, con02Day.version, con02Day.blockedCount), `qa-added-viewer-write-${random()}`)]);
  check('PARTNER-MEMBER-VIEWER-READONLY', addedViewerWrite[0].status === 'rejected' && errorStatus(addedViewerWrite[0].reason) === 403,
    'a viewer added through the owner UI cannot write inventory even with a writable organization grant');
  const revokedMember = await partners.updateOrganizationMember({ id: user.id }, org.id, employee.id, { action: 'revoke', expectedVersion: addedMember.version });
  const revokedRead = await Promise.allSettled([partners.inventoryRows({ id: employee.id }, { organizationId: org.id, propertyId: con02.property.id, from: con02.dateText, toExclusive: nextDate(con02.dateText) })]);
  const staleRestore = await Promise.allSettled([partners.updateOrganizationMember({ id: user.id }, org.id, employee.id, { action: 'restore', expectedVersion: addedMember.version })]);
  check('PARTNER-MEMBER-REVOKE-VERSION', revokedMember.status === 'revoked' && revokedRead[0].status === 'rejected' && errorStatus(revokedRead[0].reason) === 403 && staleRestore[0].status === 'rejected' && errorStatus(staleRestore[0].reason) === 409,
    'revocation blocks subsequent reads and stale membership updates conflict instead of overwriting');
  const restoredMember = await partners.updateOrganizationMember({ id: user.id }, org.id, employee.id, { action: 'restore', expectedVersion: revokedMember.version });
  check('PARTNER-MEMBER-RESTORE', restoredMember.status === 'active' && restoredMember.version === revokedMember.version + 1,
    'owner can restore a registered member using the current expected version');

  const partnerProperties = await partners.properties({ id: user.id });
  const partnerProperty = partnerProperties.items.find((item) => item.propertyId === con02.property.id);
  check('PARTNER-PROPERTY-SELECTOR', partnerProperty?.id === con02.property.id && partnerProperty.roomTypes.some((room) => room.id === con02.room.id && room.ratePlans.some((rate) => rate.id === con02.rate.id)),
    'granted property is addressable by propertyId and includes its granted room/rate editor data');

  const profileKey = `qa-revision-${random()}`;
  const profileInput = { organizationId: org.id, propertyId: con02.property.id, baseVersion: con02.property.version, contentBaseVersion: con02.property.content.version, proposed: {
    title: `${con02.property.content.title} updated`, houseRules: ['Giữ yên tĩnh sau 22:00'], notes: ['Liên hệ trước khi đến'],
  } };
  const profileRevision = await partners.submitRevision({ id: user.id }, profileInput, profileKey);
  const replayedProfileRevision = await partners.submitRevision({ id: user.id }, profileInput, profileKey);
  const mismatchedKeyReuse = await Promise.allSettled([partners.submitRevision({ id: user.id }, { ...profileInput, proposed: { title: 'different' } }, profileKey)]);
  const pendingNode = await prisma.contentNode.findUnique({ where: { id: con02.property.contentId }, select: { title: true, publicationStatus: true } });
  check('REV-IDEMPOTENCY-PENDING-ISOLATION', profileRevision.id === replayedProfileRevision.id && replayedProfileRevision.replayed === true && mismatchedKeyReuse[0].status === 'rejected' && errorStatus(mismatchedKeyReuse[0].reason) === 409 && pendingNode?.title === con02.property.content.title && profileRevision.status === 'pending',
    'same key replays once, a changed payload conflicts, and a pending profile revision leaves public content untouched');
  const approvedProfileRevision = await partners.reviewRevision(profileRevision.id, { action: 'approve', expectedVersion: 1 }, { id: user.id });
  const approvedProfile = await prisma.property.findUnique({ where: { id: con02.property.id }, include: { content: true } });
  const approvedPolicies = approvedProfile.approvedPolicies;
  check('REV-PROPERTY-APPROVAL', approvedProfileRevision.status === 'approved' && approvedProfile.content.title.endsWith('updated') && Array.isArray(approvedPolicies.houseRules) && approvedPolicies.houseRules[0]?.text === 'Giữ yên tĩnh sau 22:00' && approvedPolicies.notes[0] === 'Liên hệ trước khi đến',
    'moderator approval applies the profile and normalized policy lines to the existing public property');

  const baseForConflict = await prisma.property.findUniqueOrThrow({ where: { id: con02.property.id }, include: { content: true } });
  const conflictRevision = await partners.submitRevision({ id: user.id }, { organizationId: org.id, propertyId: con02.property.id, baseVersion: baseForConflict.version, contentBaseVersion: baseForConflict.content.version, proposed: { area: 'Partner suggestion that must not overwrite' } }, `qa-revision-conflict-${random()}`);
  await prisma.$transaction([
    prisma.property.update({ where: { id: con02.property.id }, data: { address: 'QA concurrent admin update', version: { increment: 1 } } }),
    prisma.contentNode.update({ where: { id: con02.property.contentId }, data: { version: { increment: 1 } } }),
  ]);
  const conflictReview = await partners.reviewRevision(conflictRevision.id, { action: 'approve', expectedVersion: 1 }, { id: user.id });
  const keptRevision = await prisma.partnerProfileRevision.findUniqueOrThrow({ where: { id: conflictRevision.id } });
  const addressAfterConflict = await prisma.property.findUniqueOrThrow({ where: { id: con02.property.id }, select: { address: true } });
  check('REV-CONFLICT-KEEP', conflictReview.status === 'conflict' && keptRevision.status === 'conflict' && addressAfterConflict.address === 'QA concurrent admin update' && (keptRevision.proposed.area === 'Partner suggestion that must not overwrite'),
    'stale approval records a conflict, preserves the proposal and leaves the concurrent admin value untouched');

  const roomRevision = await partners.submitRevision({ id: user.id }, { organizationId: org.id, propertyId: con02.property.id, roomTypeId: con02.room.id, baseVersion: con02.room.version, proposed: { name: `${con02.room.name} updated`, maxAdults: 3, maxChildren: 1 } }, `qa-room-revision-${random()}`);
  const approvedRoomRevision = await partners.reviewRevision(roomRevision.id, { action: 'approve', expectedVersion: 1 }, { id: user.id });
  const approvedRoom = await prisma.roomType.findUnique({ where: { id: con02.room.id } });
  check('REV-ROOM-APPROVAL', approvedRoomRevision.status === 'approved' && approvedRoom.name.endsWith('updated') && approvedRoom.maxOccupancy === 4,
    'reviewed room edits update the existing room type without cloning inventory or rates');

  const rateRevision = await partners.submitRevision({ id: user.id }, { organizationId: org.id, propertyId: con02.property.id, roomTypeId: con02.room.id, ratePlanId: con02.rate.id, baseVersion: con02.rate.version, proposed: { baseRateVnd: '12000', weekendRateVnd: '15000', breakfastIncluded: true, minStayNights: 2, maxStayNights: 5, inclusions: ['Bữa sáng'] } }, `qa-rate-revision-${random()}`);
  const approvedRateRevision = await partners.reviewRevision(rateRevision.id, { action: 'approve', expectedVersion: 1 }, { id: user.id });
  const approvedRate = await prisma.ratePlan.findUnique({ where: { id: con02.rate.id } });
  check('REV-RATE-APPROVAL', approvedRateRevision.status === 'approved' && approvedRate.baseRateVnd === 12000n && approvedRate.weekendRateVnd === 15000n && approvedRate.breakfastIncluded && approvedRate.minStayNights === 2 && approvedRate.maxStayNights === 5,
    'rate changes remain pending until approval, then update only allowlisted typed rate fields');

  const managerKey = `qa-manager-write-${random()}`;
  const managerInput = changeFor(org.id, manager.id, con02Day.version, con02Day.blockedCount);
  const managerWrite = await partners.bulkInventory({ id: manager.id }, managerInput, managerKey);
  const managerReplay = await partners.bulkInventory({ id: manager.id }, managerInput, managerKey);
  const con02AfterManager = await prisma.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId: con02.room.id, stayDate: date(con02.dateText) } } });
  check('AUTH-ROLE-MANAGER', managerReplay.replayed === true && managerWrite.items.length === 1 && managerWrite.items[0].version === con02AfterManager.version && con02AfterManager.blockedCount + con02AfterManager.heldCount + con02AfterManager.reservedCount <= con02AfterManager.capacity,
    'manager role writes only through approved grant/shared ledger; identical JSONB-backed bulk replay does not mutate again');
  const otherOrg = await prisma.partnerOrganization.create({ data: {
    name: `QA unrelated org ${random().slice(0, 8)}`, contactName: user.fullName, email: `qa-unrelated-${random()}@example.test`, phone: '0900000002',
    status: 'active', verificationStatus: 'verified', createdById: user.id,
  } });
  await prisma.partnerMembership.create({ data: { organizationId: otherOrg.id, userId: user.id, role: 'owner', status: 'active' } });
  const noGrant = await Promise.allSettled([partners.bulkInventory({ id: user.id }, changeFor(otherOrg.id, user.id, con02AfterManager.version, con02AfterManager.blockedCount), `qa-id-or-grant-${random()}`)]);
  check('AUTH-IDOR-GRANT', noGrant[0].status === 'rejected' && errorStatus(noGrant[0].reason) === 403,
    'an active member cannot edit a property without its separately approved grant');
  await prisma.partnerPropertyGrant.create({ data: {
    organizationId: otherOrg.id, propertyId: con02.property.id, status: 'active', canReadInventory: true, canWriteInventory: true,
    roomTypeScope: ['00000000-0000-4000-8000-000000000001'], approvedById: user.id, approvedAt: new Date(),
  } });
  const outOfScope = await Promise.allSettled([partners.bulkInventory({ id: user.id }, changeFor(otherOrg.id, user.id, con02AfterManager.version, con02AfterManager.blockedCount), `qa-id-or-scope-${random()}`)]);
  check('AUTH-IDOR-ROOM-SCOPE', outOfScope[0].status === 'rejected' && errorStatus(outOfScope[0].reason) === 403,
    'an active grant cannot mutate a room type outside its explicit roomTypeScope');
  await prisma.partnerPropertyGrant.update({ where: { id: (await prisma.partnerPropertyGrant.findUniqueOrThrow({ where: { organizationId_propertyId: { organizationId: org.id, propertyId: con02.property.id } } })).id }, data: { status: 'revoked', version: { increment: 1 } } });
  const afterRevoke = await Promise.allSettled([partners.bulkInventory({ id: user.id }, changeFor(org.id, user.id, con02AfterManager.version, con02AfterManager.blockedCount), `qa-revoked-grant-${random()}`)]);
  const con02AfterDenials = await prisma.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId: con02.room.id, stayDate: date(con02.dateText) } } });
  check('AUTH-GRANT-REVOCATION', afterRevoke[0].status === 'rejected' && errorStatus(afterRevoke[0].reason) === 403 && con02AfterDenials?.version === con02AfterManager.version && con02AfterDenials.blockedCount === con02AfterManager.blockedCount && con02AfterDenials.heldCount === con02AfterManager.heldCount,
    'revoked grant rejects subsequent mutations without changing any inventory counters');

  // CON-03A: explicit booking-row and inventory locks arbitrate confirm vs cancel.
  const con03a = await createStay({ dateText: '2027-01-12', capacity: 1, label: 'CON-03A' });
  const con03aQuote = await createQuote(con03a, user.id);
  const con03aBooking = await createBooking(con03a, con03aQuote, user, `qa-con03a-create-${random()}`);
  const actor = { id: user.id, fullName: user.fullName };
  const con03aRace = await Promise.allSettled([
    operations.transitionBooking(con03aBooking.result.id, { status: 'confirmed', expectedVersion: 1 }, actor),
    operations.transitionBooking(con03aBooking.result.id, { status: 'cancelled', reason: 'Isolated concurrency QA', expectedVersion: 1 }, actor),
  ]);
  const con03aDay = await prisma.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId: con03a.room.id, stayDate: date(con03a.dateText) } } });
  const con03aFinal = await prisma.booking.findUnique({ where: { id: con03aBooking.result.id }, include: { lines: { include: { reservations: true } } } });
  const con03aSuccessCount = con03aRace.filter((result) => result.status === 'fulfilled').length;
  check('CON-03A', con03aSuccessCount === 1 && !!con03aDay && con03aDay.heldCount === 0 && ((con03aFinal?.bookingStatus === 'confirmed' && con03aDay.reservedCount === 1) || (con03aFinal?.bookingStatus === 'cancelled' && con03aDay.reservedCount === 0)) && con03aFinal.lines[0].reservations.length === 1,
    `confirm/cancel produced one terminal winner (${con03aFinal?.bookingStatus}); held=${con03aDay?.heldCount}, reserved=${con03aDay?.reservedCount}`);

  // CON-03B: expire worker races cancellation, then retries without double release.
  const con03b = await createStay({ dateText: '2027-01-13', capacity: 1, label: 'CON-03B' });
  const con03bQuote = await createQuote(con03b, user.id);
  const con03bBooking = await createBooking(con03b, con03bQuote, user, `qa-con03b-create-${random()}`);
  const expiredAt = new Date(Date.now() - 60_000);
  await prisma.booking.update({ where: { id: con03bBooking.result.id }, data: { expiresAt: expiredAt } });
  await prisma.inventoryReservation.updateMany({ where: { bookingLine: { bookingId: con03bBooking.result.id }, status: 'held' }, data: { expiresAt: expiredAt } });
  const con03bRace = await Promise.allSettled([
    operations.expireHolds(),
    operations.transitionBooking(con03bBooking.result.id, { status: 'cancelled', reason: 'Expire/cancel race QA', expectedVersion: 1 }, actor),
  ]);
  await operations.expireHolds();
  const con03bDay = await prisma.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId: con03b.room.id, stayDate: date(con03b.dateText) } } });
  const con03bReservation = await prisma.inventoryReservation.findFirst({ where: { bookingLine: { bookingId: con03bBooking.result.id } } });
  const con03bFinal = await prisma.booking.findUnique({ where: { id: con03bBooking.result.id } });
  const con03bOutbox = await prisma.outboxEvent.count({ where: { aggregateId: con03b.room.id, eventType: 'inventory.changed' } });
  check('CON-03B', !!con03bFinal && ['cancelled', 'expired'].includes(con03bFinal.bookingStatus) && con03bReservation?.status === 'released' && con03bDay?.heldCount === 0 && con03bDay.reservedCount === 0 && con03bOutbox === 2 && con03bRace.filter((result) => result.status === 'fulfilled').length >= 1,
    `expire/cancel plus repeated expiry released exactly once; status=${con03bFinal?.bookingStatus}, held=${con03bDay?.heldCount}, outbox=${con03bOutbox}`);

  // CON-04: two admin writers race to open the same absent inventory day with expectedVersion=0.
  const con04 = await createStay({ dateText: '2027-01-14', capacity: 1, label: 'CON-04' });
  await prisma.inventoryDay.delete({ where: { roomTypeId_stayDate: { roomTypeId: con04.room.id, stayDate: date(con04.dateText) } } });
  const con04Input = { from: con04.dateText, to: nextDate(con04.dateText), capacity: 2, blockedCount: 0, stopSell: false, expectedVersions: { [con04.dateText]: 0 } };
  const con04Race = await Promise.allSettled([
    operations.updateInventory(con04.room.id, con04Input, user.id, `qa-con04-a-${random()}`),
    operations.updateInventory(con04.room.id, con04Input, user.id, `qa-con04-b-${random()}`),
  ]);
  const con04Day = await prisma.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId: con04.room.id, stayDate: date(con04.dateText) } } });
  check('CON-04', con04Race.filter((result) => result.status === 'fulfilled').length === 1 && con04Race.filter((result) => result.status === 'rejected' && errorStatus(result.reason) === 409).length === 1 && con04Day?.version === 1 && con04Day.capacity === 2 && !!con04Day.lastConfirmedAt && con04Day.lastConfirmedById === user.id && con04Day.lastConfirmedSource === 'admin',
    `one admin create won, stale missing-row writer received 409, and the committed admin update recorded confirmation provenance; version=${con04Day?.version}`);

  // Local fake adapter: projection never touches INPUT; command is immutable and applies once.
  const sheetsStay = await createStay({ dateText: '2027-01-15', capacity: 3, label: 'SHEETS-FAKE' });
  const sheetsOrg = await prisma.partnerOrganization.create({ data: {
    name: `QA Sheets org ${random().slice(0, 8)}`, contactName: user.fullName, email: `qa-sheets-${random()}@example.test`, phone: '0900000001',
    status: 'active', verificationStatus: 'verified', createdById: user.id,
  } });
  await prisma.partnerMembership.create({ data: { organizationId: sheetsOrg.id, userId: user.id, role: 'owner', status: 'active' } });
  await prisma.partnerPropertyGrant.create({ data: {
    organizationId: sheetsOrg.id, propertyId: sheetsStay.property.id, status: 'active', canReadInventory: true, canWriteInventory: true,
    roomTypeScope: [sheetsStay.room.id], approvedById: user.id, approvedAt: new Date(),
  } });
  const spreadsheetId = `qa${random()}`;
  const workbook = await sheets.createWorkbook({ spreadsheetId, title: 'Disposable QA January', periodStart: '2027-01-01', periodEndExclusive: '2027-02-01' }, user);
  const binding = await sheets.createBinding(workbook.id, {
    organizationId: sheetsOrg.id, propertyId: sheetsStay.property.id, sheetId: '8123', sheetTitle: 'QA input',
    outputRange: 'A1:L40', inputRange: 'N1:AC40', resultRange: 'AE1:AM40',
  }, user);
  await sheets.pause(workbook.id, 'export', false, user);
  await sheets.pause(workbook.id, 'import', false, user);
  await sheets.syncNow(workbook.id, 'export', user);
  const batch = await sheets.prepareDraft(binding.id, { roomTypeId: sheetsStay.room.id, from: sheetsStay.dateText, toExclusive: nextDate(sheetsStay.dateText) }, user);
  assert.equal(batch.projectionStatus, 'projected');
  const inputRange = "'QA input'!N2:AC2";
  const inputRow = [batch.batchId, null, sheetsStay.room.id, sheetsStay.dateText, 1, 0, 0, 0, false, 1, '', '', '', 'SET', 'isolated QA', ''];
  const draftItem = await prisma.sheetDraftItem.findFirstOrThrow({ where: { batchId: batch.batchId } });
  inputRow[1] = draftItem.id;
  provider.setFakeRange(spreadsheetId, inputRange, [inputRow]);
  await sheets.syncNow(workbook.id, 'export', user);
  const inputAfterExport = await provider.read(spreadsheetId, inputRange);
  check('SHEETS-FAKE-OUTPUT-ISOLATION', JSON.stringify(inputAfterExport) === JSON.stringify([inputRow]), 'export rewrote only OUTPUT while draft INPUT stayed byte-for-byte unchanged');

  inputRow[15] = 'GỬI';
  provider.setFakeRange(spreadsheetId, inputRange, [inputRow]);
  await sheets.syncNow(workbook.id, 'import', user);
  const afterApply = await prisma.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId: sheetsStay.room.id, stayDate: date(sheetsStay.dateText) } } });
  const appliedBatch = await prisma.sheetDraftBatch.findUnique({ where: { id: batch.batchId } });
  check('SHEETS-FAKE-APPLY', afterApply?.blockedCount === 1 && afterApply.version === 2 && appliedBatch?.status === 'applied' && appliedBatch.projectionStatus === 'projected',
    `one sent Sheet command updated PostgreSQL and froze baseline; blocked=${afterApply?.blockedCount}, version=${afterApply?.version}`);

  await sheets.syncNow(workbook.id, 'import', user);
  const afterDuplicatePoll = await prisma.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId: sheetsStay.room.id, stayDate: date(sheetsStay.dateText) } } });
  check('SHEETS-FAKE-REPLAY', afterDuplicatePoll?.blockedCount === 1 && afterDuplicatePoll.version === 2, 'duplicate poll restored the stored result without reapplying the ledger command');

  inputRow[9] = 0;
  provider.setFakeRange(spreadsheetId, inputRange, [inputRow]);
  await sheets.syncNow(workbook.id, 'import', user);
  const afterEditedPayload = await prisma.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId: sheetsStay.room.id, stayDate: date(sheetsStay.dateText) } } });
  const resultRows = await provider.read(spreadsheetId, "'QA input'!AE1:AM2");
  check('SHEETS-FAKE-IMMUTABLE', afterEditedPayload?.blockedCount === 1 && afterEditedPayload.version === 2 && resultRows[1]?.[4] === 'SUBMITTED_PAYLOAD_CHANGED', 'changed payload after GỬI was rejected and preserved as an explicit result');

  await sheets.syncNow(workbook.id, 'export', user);
  const outputRows = await provider.read(spreadsheetId, "'QA input'!A1:L40");
  check('SHEETS-FAKE-DB-OUTPUT', outputRows[1]?.[8] === 2 && outputRows[1]?.[11] === 2, 'exported availability/version were read back from PostgreSQL');

  const sseSession = await prisma.authSession.create({ data: {
    userId: user.id, tokenHash: `qa-${random()}`, csrfHash: `qa-${random()}`,
    expiresAt: new Date(Date.now() + 60 * 60_000), idleUntil: new Date(Date.now() + 30 * 60_000),
  } });
  const waiters = new Map();
  const observedEvents = [];
  await prisma.partnerPropertyGrant.create({ data: {
    organizationId: sheetsOrg.id, propertyId: draftSearchStay.property.id, status: 'active', canReadInventory: false,
    roomTypeScope: [draftSearchStay.room.id],
  } });
  const stream = partners.inventoryEventStream({ ...user, sessionId: sseSession.id });
  const subscription = stream.subscribe({ next: (event) => { observedEvents.push(event); const waiter = waiters.get(event.type); if (waiter) { waiters.delete(event.type); waiter(event); } } });
  const waitEvent = (type) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { waiters.delete(type); reject(new Error(`Timed out waiting for SSE ${type}`)); }, 8_000);
    waiters.set(type, (event) => { clearTimeout(timer); resolve(event); });
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  const liveDay = await prisma.inventoryDay.findUniqueOrThrow({ where: { roomTypeId_stayDate: { roomTypeId: sheetsStay.room.id, stayDate: date(sheetsStay.dateText) } } });
  const liveEventPromise = waitEvent('inventory.changed');
  await inventory.updateAdminRange(draftSearchStay.room.id, { from: draftSearchStay.dateText, to: nextDate(draftSearchStay.dateText), capacity: 1, expectedVersions: { [draftSearchStay.dateText]: 1 } }, user.id, `qa-sse-unreadable-${random()}`);
  await inventory.setPartnerInventory({ organizationId: sheetsOrg.id, actorId: user.id, idempotencyKey: `qa-sse-${random()}`, changes: [{ roomTypeId: sheetsStay.room.id, stayDate: sheetsStay.dateText, expectedVersion: liveDay.version, externalSoldCount: 1 }] });
  const liveEvent = await liveEventPromise;
  check('LIVE-SSE-SCOPE', liveEvent.data?.propertyId === sheetsStay.property.id && liveEvent.data?.roomTypeId === sheetsStay.room.id && liveEvent.data?.stayDate === sheetsStay.dateText && observedEvents.every((event) => event.data?.roomTypeId !== draftSearchStay.room.id),
    'partner SSE emits granted readable scope only; canReadInventory=false suppresses inventory invalidations');
  const revokedPromise = waitEvent('authorization_revoked');
  const businessToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const reminderDate = date(businessToday);
  reminderDate.setUTCDate(reminderDate.getUTCDate() + 3);
  const reminderDateText = reminderDate.toISOString().slice(0, 10);
  const reminderStay = await createStay({ dateText: reminderDateText, capacity: 2, label: 'REMINDER' });
  await prisma.partnerPropertyGrant.create({ data: {
    organizationId: sheetsOrg.id, propertyId: reminderStay.property.id, status: 'active', canReadInventory: true,
    roomTypeScope: [reminderStay.room.id], approvedById: user.id, approvedAt: new Date(),
  } });
  await prisma.inventoryDay.update({ where: { roomTypeId_stayDate: { roomTypeId: reminderStay.room.id, stayDate: date(reminderDateText) } }, data: { lastConfirmedAt: new Date(Date.now() - 2 * 86_400_000) } });
  const reminderRun = await partners.notifyStaleInventory();
  const reminderCount = await prisma.partnerNotification.count({ where: { organizationId: sheetsOrg.id, kind: 'inventory_confirmation_required' } });
  const reminderReplay = await partners.notifyStaleInventory();
  check('FRESHNESS-REMINDER', reminderRun.notificationsCreated === 1 && reminderCount === 1 && reminderReplay.notificationsCreated === 0,
    'stale near-term inventory creates one in-portal reminder and repeated worker runs deduplicate it');
  await prisma.partnerMembership.updateMany({ where: { userId: user.id, status: 'active' }, data: { status: 'revoked', revokedAt: new Date(), version: { increment: 1 } } });
  const revokedEvent = await revokedPromise;
  subscription.unsubscribe();
  check('LIVE-SSE-REVOCATION', revokedEvent.data?.reason === 'membership_inactive', 'open SSE observes revoked partner membership and closes its authorization scope');
  console.log(`QA_RESULT=PASS ASSERTIONS=${assertions.length} GOOGLE_SANDBOX_E2E=NOT_RUN`);
} finally {
  await prisma.$disconnect();
}
