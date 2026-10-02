import type { Metadata } from 'next';
import { AdminAuthGate } from '@/components/admin/AdminAuthGate';
import { AdminShell } from '@/components/admin/shell/AdminShell';
import '@/styles/admin.css';
import '@/styles/admin-ui.css';
import '@/styles/admin-overview.css';
import '@/styles/admin-bookings.css';
import '@/styles/admin-properties.css';
import '@/styles/admin-combos.css';
import '@/styles/admin-content.css';
import '@/styles/admin-crm.css';
import '@/styles/admin-editor.css';
import '@/styles/admin-ai.css';
import '@/styles/admin-media.css';
import '@/styles/admin-operations.css';
import '@/styles/admin-responsive.css';
import '@/styles/admin-toast.css';

export const metadata: Metadata = {
  title: 'Quản trị — Đinh Vân Booking',
  // The admin is never indexed; this is not an access control.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dvb-admin">
      <AdminAuthGate>
        <AdminShell>{children}</AdminShell>
      </AdminAuthGate>
    </div>
  );
}
