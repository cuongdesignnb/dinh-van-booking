'use client';

import { useContext } from 'react';
import { AdminToastContext } from './AdminToastProvider';

export function useAdminToast() {
  const toast = useContext(AdminToastContext);
  if (!toast) throw new Error('useAdminToast phải được dùng bên trong AdminToastProvider.');
  return toast;
}
