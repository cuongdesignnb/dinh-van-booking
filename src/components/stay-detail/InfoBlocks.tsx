import { CigaretteOff, Hammer, Info, LockKeyhole, PartyPopper, PawPrint, Volume1 } from 'lucide-react';

const RULE_ICONS = {
  smoke: CigaretteOff,
  pet: PawPrint,
  quiet: Volume1,
  party: PartyPopper,
  lock: LockKeyhole,
  fix: Hammer,
} as const;

export function HouseRules({ rules, title }: { rules: { icon: string; text: string }[]; title?: string }) {
  if (!rules.length) return null;
  return (
    <section className="rules" aria-labelledby="rules-t">
      <h2 className="dsec-title" id="rules-t">
        {title || 'Nội quy'}
      </h2>
      <ul className="rules__list">
        {rules.map((r) => {
          const Icon = RULE_ICONS[r.icon as keyof typeof RULE_ICONS] ?? LockKeyhole;
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
export function NotesPaper({ notes, title, thanks }: { notes: string[]; title?: string; thanks?: string }) {
  if (!notes.length) return null;
  return (
    <section className="notes" aria-labelledby="notes-t">
      <h2 className="notes__title" id="notes-t">{title || 'Lưu ý'}</h2>
      <ul className="notes__list">
        {notes.map((n) => <li key={n}><Info size={16} aria-hidden="true" />{n}</li>)}
      </ul>
      {thanks && <p className="notes__thanks script">{thanks}</p>}
    </section>
  );
}
