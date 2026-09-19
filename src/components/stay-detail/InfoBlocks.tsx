import { CigaretteOff, Hammer, LockKeyhole, PartyPopper, PawPrint, Volume1 } from 'lucide-react';
import { LeafSprig, SmallLeaf } from '@/components/ui/Decor';
import { HOUSE_RULES, STAY_NOTES } from '@/data/stays';

const RULE_ICONS = {
  smoke: CigaretteOff,
  pet: PawPrint,
  quiet: Volume1,
  party: PartyPopper,
  lock: LockKeyhole,
  fix: Hammer,
} as const;

export function HouseRules() {
  return (
    <section className="rules" aria-labelledby="rules-t">
      <h2 className="dsec-title" id="rules-t">
        Nội quy nhà nghỉ <SmallLeaf className="section-title__leaf" />
      </h2>
      <ul className="rules__list">
        {HOUSE_RULES.map((r) => {
          const Icon = RULE_ICONS[r.icon];
          return (
            <li key={r.text}>
              <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
              {r.text}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Informational checklist: the boxes are decorative, not form inputs. */
export function NotesPaper() {
  return (
    <section className="notes" aria-labelledby="notes-t">
      <LeafSprig className="notes__leaf" />
      <h2 className="notes__title handwritten" id="notes-t">
        Một vài lưu ý nhỏ...
      </h2>
      <ul className="notes__list">
        {STAY_NOTES.map((n) => (
          <li key={n}>
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
              <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {n}
          </li>
        ))}
      </ul>
      <p className="notes__thanks handwritten" aria-hidden="true">
        Cảm ơn bạn!
        <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
          <path
            d="M12 20.5s-7.5-4.6-8.9-9.4C2 7.4 4.6 4.5 7.6 4.9c1.9.2 3.4 1.6 4.4 3.3 1-1.7 2.5-3.1 4.4-3.3 3-.4 5.6 2.5 4.5 6.2-1.4 4.8-8.9 9.4-8.9 9.4Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      </p>
    </section>
  );
}
