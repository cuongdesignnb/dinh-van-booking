import { serializeJsonLd, type JsonValue } from '@/lib/seo/schema';

export function JsonLd({ data }: { data: JsonValue | null }) {
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
