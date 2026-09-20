/** Permission codes are the single vocabulary used by guards, seeds and the admin UI. */
export const PERMISSIONS = {
  bookingRead: 'booking.read',
  bookingWrite: 'booking.write',
  bookingCancel: 'booking.cancel',
  inventoryWrite: 'inventory.write',
  catalogRead: 'catalog.read',
  catalogWrite: 'catalog.write',
  contentRead: 'content.read',
  contentWrite: 'content.write',
  contentPublish: 'content.publish',
  mediaRead: 'media.read',
  mediaWrite: 'media.write',
  mediaDelete: 'media.delete',
  crmRead: 'crm.read',
  crmWrite: 'crm.write',
  financeRead: 'finance.read',
  financeWrite: 'finance.write',
  settingsRead: 'settings.read',
  settingsWrite: 'settings.write',
  userRead: 'user.read',
  userWrite: 'user.write',
  auditRead: 'audit.read',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_MODULES: Record<PermissionCode, string> = {
  'booking.read': 'booking', 'booking.write': 'booking', 'booking.cancel': 'booking',
  'inventory.write': 'inventory',
  'catalog.read': 'catalog', 'catalog.write': 'catalog',
  'content.read': 'content', 'content.write': 'content', 'content.publish': 'content',
  'media.read': 'media', 'media.write': 'media', 'media.delete': 'media',
  'crm.read': 'crm', 'crm.write': 'crm',
  'finance.read': 'finance', 'finance.write': 'finance',
  'settings.read': 'settings', 'settings.write': 'settings',
  'user.read': 'user', 'user.write': 'user',
  'audit.read': 'audit',
};

export const ROLES = {
  owner: 'owner',
  operator: 'operator',
  editor: 'editor',
  accountant: 'accountant',
  viewer: 'viewer',
} as const;

const ALL = Object.values(PERMISSIONS) as PermissionCode[];

export const ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  owner: ALL,
  operator: [
    'booking.read', 'booking.write', 'booking.cancel', 'inventory.write',
    'catalog.read', 'catalog.write', 'content.read', 'media.read', 'media.write',
    'crm.read', 'crm.write', 'finance.read', 'settings.read',
  ],
  editor: [
    'content.read', 'content.write', 'content.publish', 'catalog.read',
    'media.read', 'media.write', 'media.delete', 'settings.read', 'booking.read',
  ],
  accountant: ['finance.read', 'finance.write', 'booking.read', 'crm.read', 'settings.read', 'audit.read'],
  viewer: ['booking.read', 'catalog.read', 'content.read', 'media.read', 'crm.read', 'settings.read'],
};

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Chủ sở hữu',
  operator: 'Vận hành',
  editor: 'Biên tập',
  accountant: 'Kế toán',
  viewer: 'Chỉ xem',
};
