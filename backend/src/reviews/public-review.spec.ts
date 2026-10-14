import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PublicCatalogService } from '../public/public-catalog.service';

type ToReview = (row: unknown) => Record<string, unknown> & { photos: Array<{ src: string }> };
const toReview = (PublicCatalogService.prototype as unknown as { toReview: ToReview }).toReview.bind({});

const media = (storageKey: string, visibility: string) => ({
  position: 0,
  media: { storageKey, altText: null, originalFilename: 'a.webp', width: 800, height: 600, visibility, processingStatus: 'ready', isDemo: false },
});

test('public reviews never expose the phone and only show approved (public) photos', () => {
  const view = toReview({
    id: 'r1', authorName: 'Lan', rating: 5, body: 'Rất đẹp và yên tĩnh', stayedAt: null, contentId: 'c1',
    isVerified: true, source: 'invite', ownerReply: 'Cảm ơn Lan!', ownerReplyAt: new Date('2026-10-15T00:00:00Z'), createdAt: new Date('2026-10-14T00:00:00Z'),
    reviewerPhone: '0912345678', ipHash: 'x',
    media: [media('2026/10/public.webp', 'public'), media('2026/10/private.webp', 'private')],
  });
  const json = JSON.stringify(view);
  assert.equal(json.includes('0912345678'), false);
  assert.equal('reviewerPhone' in view || 'phone' in view || 'ipHash' in view, false);
  assert.deepEqual(view.photos.map((photo) => photo.src), ['/media/2026/10/public.webp']);
  assert.equal(view.verified, true);
  assert.equal(view.ownerReply, 'Cảm ơn Lan!');
});
