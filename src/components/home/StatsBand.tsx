import { CalendarCheck, Globe2, House, MapPinned, Smile, Star, UsersRound } from 'lucide-react';
import type { PublicRecord } from '@/lib/public-content';
import { publicText } from '@/lib/public-content';

const icons = { calendar: CalendarCheck, smile: Smile, star: Star, users: UsersRound, house: House, map: MapPinned, globe: Globe2 } as const;
type Stat = { id: string; icon: keyof typeof icons; value: string; label: string };

export function statItems(config: PublicRecord): Stat[] {
  return (Array.isArray(config.items) ? config.items : []).flatMap((value, index): Stat[] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    const stat = publicText(item.value);
    const label = publicText(item.label);
    const icon = String(item.icon);
    if (item.enabled === false || !stat || !label) return [];
    return [{ id: typeof item.id === 'string' ? item.id : `stat-${index}`, icon: (icon in icons ? icon : 'star') as Stat['icon'], value: stat, label }];
  });
}

/** Numbers entered by Admin (Cài đặt → Trang chủ). Hidden when none exist. */
export function StatsBand({ config }: { config: PublicRecord }) {
  const title = publicText(config.title);
  const note = publicText(config.note);
  const items = statItems(config);
  if (config.enabled !== true || !items.length) return null;
  return (
    <section className="hn" aria-labelledby={title ? 'stats-title' : undefined} aria-label={title ? undefined : 'Số liệu'}>
      <div className="hn__inner cp-shell">
        {(title || note) && <div className="hn__intro">
          {title && <h2 id="stats-title">{title}</h2>}
          {note && <p className="script">{note}</p>}
        </div>}
        <ul className="hn__list" data-count={items.length}>
          {items.map((item) => {
            const Icon = icons[item.icon];
            return (
              <li key={item.id}>
                <Icon size={30} strokeWidth={1.8} aria-hidden="true" />
                <span><strong>{item.value}</strong><small>{item.label}</small></span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
