'use client';

import { useId, useState } from 'react';
import { DemoNote, Modal } from './Modal';

export const POLICIES = {
  terms: 'Điều khoản dịch vụ',
  cancel: 'Chính sách hủy phòng',
  privacy: 'Chính sách bảo mật',
  payment: 'Chính sách thanh toán',
} as const;

export type PolicyId = keyof typeof POLICIES;

/** Opens the policy text. None has been approved yet, so it says so plainly. */
export function PolicyLink({ policy, className, label }: { policy: PolicyId; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button type="button" className={className} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {label ?? POLICIES[policy]}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy={id}>
        <h2 id={id} className="dialog__title">
          {POLICIES[policy]}
        </h2>
        <DemoNote tone="info">Nội dung đang được cập nhật và cần chủ website duyệt trước khi công bố.</DemoNote>
        <p>
          Trong bản xem trước này, website chưa nhận đặt phòng hay thanh toán. Mọi điều kiện cụ thể sẽ được Đinh Vân
          trao đổi trực tiếp khi tư vấn.
        </p>
      </Modal>
    </>
  );
}
