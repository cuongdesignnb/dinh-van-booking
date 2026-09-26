import assert from 'node:assert/strict';
import test from 'node:test';
import { ContentService } from './content.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SettingsService } from '../settings/settings.service';

const service = new ContentService(undefined as unknown as PrismaService, undefined as unknown as SettingsService);
const longBody = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thông tin lưu trú đã được xác minh và sẵn sàng xuất bản.' }] }],
};

const validCover = {
  mediaId: 'media-id',
  role: 'cover',
  media: { storageKey: 'cover.webp', isDemo: false, visibility: 'public', processingStatus: 'ready' },
};

function node(property: Parameters<ContentService['publishChecklist']>[0]['property']) {
  return {
    kind: 'stay',
    title: 'Cơ sở Cúc Phương',
    slugSource: 'co-so-cuc-phuong',
    metaTitle: 'Cơ sở Cúc Phương',
    metaDescription: 'Mô tả cơ sở lưu trú Cúc Phương đã được xác minh.',
    bodyDocument: longBody,
    media: [validCover],
    property,
  };
}

test('stay publish checklist rejects an imported incomplete property', () => {
  const problems = service.publishChecklist(
    node({ operatingStatus: 'pending_verification', roomTypes: [] }),
  );
  assert.ok(problems.includes('Nơi lưu trú chưa được kích hoạt'));
  assert.ok(problems.includes('Chưa có hạng phòng hoạt động'));
  assert.ok(problems.includes('Chưa có đơn vị phòng hoạt động'));
  assert.ok(problems.includes('Chưa có giá phòng hợp lệ'));
});

test('stay publish checklist accepts a complete verified fixture', () => {
  const problems = service.publishChecklist(
    node({
      operatingStatus: 'active',
      roomTypes: [
        {
          status: 'active',
          units: [{ id: 'unit-id' }],
          ratePlans: [{ baseRateVnd: 650000n }],
        },
      ],
    }),
  );
  assert.deepEqual(problems, []);
});

test('stay publish checklist rejects units and rates that exist only on separate room types', () => {
  const problems = service.publishChecklist(
    node({
      operatingStatus: 'active',
      roomTypes: [
        { status: 'active', units: [{ id: 'unit-id' }], ratePlans: [] },
        { status: 'active', units: [], ratePlans: [{ baseRateVnd: 650000n }] },
      ],
    }),
  );
  assert.ok(problems.includes('Cần ít nhất một hạng phòng có cả đơn vị phòng và giá hợp lệ'));
});
