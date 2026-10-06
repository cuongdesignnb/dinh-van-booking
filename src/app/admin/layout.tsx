import type { Metadata } from 'next';
import { AdminAuthGate } from '@/components/admin/AdminAuthGate';
import { buildPrivateMetadata } from '@/lib/seo/metadata';
import { AdminShell } from '@/components/admin/shell/AdminShell';
import '@/styles/admin.css';
import '@/styles/admin-shell.css';
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
import '@/styles/admin-partners.css';
import '@/styles/admin-refresh.css';

// The admin is never indexed (noindex, nofollow; robots.txt also disallows it); this is not an access control.
export function generateMetadata(): Promise<Metadata> {
  return buildPrivateMetadata('Quản trị');
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dvb-admin">
      <AdminAuthGate>
        <AdminShell>{children}</AdminShell>
      </AdminAuthGate>
    </div>
  );
}
