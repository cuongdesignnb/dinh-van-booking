'use client';

import { ArrowRight } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { DemoNote, Modal } from '@/components/ui/Modal';
import type { Faq } from '@/data/types';
import { FaqList } from './FaqList';

/** FAQ preview + "Xem tất cả" dialog with the full list. */
export function FaqCard({
  title,
  items,
  preview = 5,
  className = '',
  icon = 'circle',
  variant = 'compact',
  moreLabel = 'Xem tất cả câu hỏi',
  decoration,
  subtitle,
}: {
  title: ReactNode;
  items: Faq[];
  preview?: number;
  className?: string;
  icon?: 'chevron' | 'plus' | 'circle';
  variant?: 'boxed' | 'compact';
  moreLabel?: string;
  decoration?: ReactNode;
  subtitle?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className={`faq-card ${className}`} aria-labelledby={`${id}-t`}>
      <div className="faq-card__head">
        <h2 className="faq-card__title" id={`${id}-t`}>
          {title}
          {decoration}
        </h2>
        <button type="button" className="link-more faq-card__more" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          {moreLabel} <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      {subtitle && <p className="faq-card__sub">{subtitle}</p>}
      <FaqList items={items.slice(0, preview)} icon={icon} variant={variant} />
      <Modal open={open} onClose={() => setOpen(false)} labelledBy={`${id}-d`}>
        <h2 id={`${id}-d`} className="dialog__title">
          Câu hỏi thường gặp
        </h2>
        <DemoNote>Câu trả lời mang tính định hướng; điều kiện cụ thể sẽ được xác nhận khi tư vấn.</DemoNote>
        <FaqList items={items} icon="chevron" variant="boxed" />
      </Modal>
    </section>
  );
}
