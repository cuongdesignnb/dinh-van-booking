import Image from 'next/image';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { PublicMediaAsset } from '@/lib/api/public';
import { publicRecord, publicText, richDocumentHasContent } from '@/lib/public-content';
import type { RichDocument } from '@/lib/content/rich-document';

export function ItineraryTabs({ config, image }: { config: Record<string, unknown>; image: PublicMediaAsset | null }) {
  const title = publicText(config.itineraryTitle);
  const subtitle = config.itinerarySubtitle;
  const itineraries = (Array.isArray(config.itineraries) ? config.itineraries : []).flatMap((value, index) => {
    const item = publicRecord(value);
    const label = publicText(item.label);
    const days = (Array.isArray(item.days) ? item.days : []).flatMap((dayValue, dayIndex) => {
      const day = publicRecord(dayValue);
      const activities = (Array.isArray(day.activities) ? day.activities : []).filter((entry): entry is string => typeof entry === 'string' && !!entry.trim());
      return activities.length ? [{ id: `${index}-${dayIndex}`, title: publicText(day.title), activities }] : [];
    });
    return item.enabled === false || !label || !days.length ? [] : [{ id: publicText(item.id) || `itinerary-${index}`, label, subtitle: publicText(item.subtitle), title: publicText(item.title), days }];
  });
  if (!title || !itineraries.length) return null;
  return <section className="itin" aria-labelledby="destination-itinerary-title">
    <h2 className="dsec-title" id="destination-itinerary-title">{title}</h2>
    {richDocumentHasContent(subtitle) ? <div className="dsec-sub"><RichContentRenderer document={subtitle as RichDocument} /></div> : publicText(subtitle) && <p className="dsec-sub">{publicText(subtitle)}</p>}
    <div className="itin__tabs" role="list">{itineraries.map((item) => <article className="itin__tab" key={item.id}>
      <h3>{item.label}</h3>{item.subtitle && <p>{item.subtitle}</p>}{item.title && <strong>{item.title}</strong>}
      {item.days.map((day) => <section key={day.id} className="itin__day">{day.title && <h4 className="itin__daytitle">{day.title}</h4>}<ul>{day.activities.map((activity, index) => <li key={`${activity}-${index}`}>{activity}</li>)}</ul></section>)}
    </article>)}</div>
    {image?.src && <figure className="itin__photo"><Image src={image.src} alt={image.alt ?? ''} fill sizes="(max-width: 767px) 100vw, 320px" unoptimized /></figure>}
  </section>;
}

export function Seasons({ config }: { config: Record<string, unknown> }) {
  const title = publicText(config.seasonsTitle);
  const subtitle = config.seasonsSubtitle;
  const items = (Array.isArray(config.seasons) ? config.seasons : []).flatMap((value, index) => {
    const item = publicRecord(value);
    const name = publicText(item.title);
    if (item.enabled === false || !name || !richDocumentHasContent(item.description)) return [];
    return [{ id: publicText(item.id) || `season-${index}`, name, description: item.description as RichDocument }];
  });
  if (!title || !items.length) return null;
  return <section className="seasons" aria-labelledby="destination-seasons-title">
    <h2 className="dsec-title" id="destination-seasons-title">{title}</h2>
    {richDocumentHasContent(subtitle) ? <div className="dsec-sub"><RichContentRenderer document={subtitle as RichDocument} /></div> : publicText(subtitle) && <p className="dsec-sub">{publicText(subtitle)}</p>}
    <ul className="seasons__grid">{items.map((item) => <li key={item.id} className="season"><h3 className="season__name">{item.name}</h3><RichContentRenderer document={item.description} /></li>)}</ul>
  </section>;
}

export function DestinationNote({ config, image }: { config: Record<string, unknown>; image: PublicMediaAsset | null }) {
  const title = publicText(config.noteTitle);
  const author = publicText(config.noteAuthor);
  const hasBody = richDocumentHasContent(config.noteBody);
  if (!title && !hasBody && !image?.src) return null;
  return <section className="note-card" aria-label={title || undefined}>
    <div className="note-card__body">
      {title && <h2 className="note-card__title">{title}</h2>}
      {hasBody && <div className="note-card__quote"><RichContentRenderer document={config.noteBody as RichDocument} /></div>}
      {author && <p className="note-card__by">— {author}</p>}
    </div>
    {image?.src && <Image src={image.src} alt={image.alt ?? ''} width={image.width ?? 1200} height={image.height ?? 800} className="note-card__img" unoptimized />}
  </section>;
}
