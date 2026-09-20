import { BOOKING_STATUS, CHANNEL_LABEL, PAYMENT_STATUS, formatDate } from '@/lib/admin/formatters';
import { bookingTotal, nightsOf } from '@/lib/admin/selectors';
import type { AdminData, Booking } from '@/lib/admin/types';

/** Anything a spreadsheet could read as a formula is prefixed with a quote. */
function csvCell(value: string | number) {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function bookingsToCsv(bookings: Booking[], data: AdminData) {
  const header = [
    'Mã đặt phòng',
    'Khách hàng',
    'Điện thoại (dữ liệu mẫu)',
    'Dịch vụ',
    'Ngày nhận',
    'Ngày trả',
    'Số đêm',
    'Số khách',
    'Tổng tiền (VND)',
    'Trạng thái đặt phòng',
    'Trạng thái thanh toán',
    'Nguồn',
  ];
  const rows = bookings.map((b) => {
    const customer = data.customers.find((c) => c.id === b.customerId);
    const service = b.comboId
      ? data.combos.find((c) => c.id === b.comboId)?.name
      : data.properties.find((p) => p.id === b.propertyId)?.name;
    return [
      b.code,
      customer?.name ?? '',
      customer?.phone ?? '',
      service ?? '',
      formatDate(b.checkIn),
      formatDate(b.checkOut),
      nightsOf(b),
      b.adults + b.children,
      bookingTotal(b),
      BOOKING_STATUS[b.status].label,
      PAYMENT_STATUS[b.paymentStatus].label,
      CHANNEL_LABEL[b.channel],
    ];
  });
  // BOM so Excel opens the Vietnamese text as UTF-8.
  return `﻿${[header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

export function downloadCsv(bookings: Booking[], data: AdminData, name: string) {
  const blob = new Blob([bookingsToCsv(bookings, data)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
