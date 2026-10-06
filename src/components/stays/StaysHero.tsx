import { PageHero } from '@/components/site/PageHero';
import type { PublicMediaAsset } from '@/lib/api/public';
import type { PublicRecord } from '@/lib/public-content';
import { publicText } from '@/lib/public-content';

export function StaysHero({ config, image }: { config: PublicRecord; image: PublicMediaAsset | null }) {
  const title = publicText(config.heroTitle);
  if (!title) return null;
  return (
    <PageHero
      id="stays-title"
      title={title}
      eyebrow={publicText(config.heroKicker)}
      lead={config.heroDescription}
      image={image}
      crumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Lưu trú' }]}
    />
  );
}
