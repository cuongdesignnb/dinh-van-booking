'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import type { Faq } from '@/data/types';

/** Accordion: one button per question controlling its own answer region. */
export function FaqList({
  items,
  variant = 'boxed',
  icon = 'chevron',
}: {
  items: Faq[];
  variant?: 'boxed' | 'compact';
  icon?: 'chevron' | 'plus' | 'circle';
}) {
  const uid = useId();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className={`faq faq--${variant} faq--icon-${icon}`}>
      {items.map((f) => {
        const expanded = open === f.id;
        return (
          <li key={f.id} className="faq__item" data-open={expanded || undefined}>
            <h3 className="faq__q">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`${uid}-${f.id}`}
                onClick={() => setOpen(expanded ? null : f.id)}
              >
                {icon === 'circle' && (
                  <span className="faq__circle" aria-hidden="true">
                    <ChevronDown size={10} strokeWidth={2.4} />
                  </span>
                )}
                <span>{f.question}</span>
                {icon === 'chevron' && <ChevronDown className="faq__chev" size={16} aria-hidden="true" />}
                {icon === 'plus' && <span className="faq__plus" aria-hidden="true" />}
              </button>
            </h3>
            <div id={`${uid}-${f.id}`} className="faq__a" role="region" hidden={!expanded}>
              <p>{f.answer}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
