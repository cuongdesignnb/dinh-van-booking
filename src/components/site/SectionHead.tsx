import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SectionLeaf } from '@/components/home/HomeArt';

/** Leaf icon + serif title + subtitle, optional "Xem tất cả" link (homepage pattern). */
export function SectionHead({ id, title, sub, link, level = 2, children }: {
  id?: string;
  title: string;
  sub?: ReactNode;
  link?: { href: string; label: string } | null;
  level?: 2 | 3;
  children?: ReactNode;
}) {
  const Heading = level === 3 ? 'h3' : 'h2';
  return (
    <div className="cp-head">
      <div className="cp-head__title">
        <SectionLeaf className="cp-head__icon" />
        <div>
          <Heading id={id}>{title}</Heading>
          {sub && <div className="cp-head__sub">{sub}</div>}
        </div>
      </div>
      {children}
      {link && <Link href={link.href} className="link-more">{link.label} <ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" /></Link>}
    </div>
  );
}
