import { ChevronRight, House } from 'lucide-react';
import Link from 'next/link';

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items, variant = 'pill', home = false }: { items: Crumb[]; variant?: 'pill' | 'plain' | 'light'; home?: boolean }) {
  return (
    <nav className={`crumbs crumbs--${variant}`} aria-label="Đường dẫn">
      <ol>
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`}>
            {i > 0 && <ChevronRight className="crumbs__sep" size={12} strokeWidth={2.2} aria-hidden="true" />}
            {c.href ? (
              <Link href={c.href}>
                {home && i === 0 ? (
                  <>
                    <House size={14} aria-hidden="true" />
                    <span className="sr-only">{c.label}</span>
                  </>
                ) : (
                  c.label
                )}
              </Link>
            ) : (
              <span aria-current="page">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
