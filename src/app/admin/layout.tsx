import type { Metadata } from 'next';
import { AdminStoreProvider } from '@/components/admin/AdminStore';
import { AdminShell } from '@/components/admin/shell/AdminShell';
import '@/styles/admin.css';
import '@/styles/admin-ui.css';
import '@/styles/admin-overview.css';
import '@/styles/admin-bookings.css';
import '@/styles/admin-properties.css';
import '@/styles/admin-combos.css';
import '@/styles/admin-content.css';
import '@/styles/admin-crm.css';
import '@/styles/admin-responsive.css';

export const metadata: Metadata = {
  title: 'Quản trị — Đinh Vân Booking',
  // The admin is never indexed; this is not an access control.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dvb-admin">
      <AdminStoreProvider>
        <AdminShell>{children}</AdminShell>
      </AdminStoreProvider>
    </div>
  );
}
