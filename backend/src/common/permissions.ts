/** Permission codes are the single vocabulary used by guards, seeds and the admin UI. */
export const PERMISSIONS = {
  dashboardRead: 'dashboard.read',
  bookingRead: 'booking.read',
  bookingWrite: 'booking.write',
  bookingCancel: 'booking.cancel',
  inventoryRead: 'inventory.read',
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
  couponRead: 'coupon.read',
  couponWrite: 'coupon.write',
  financeRead: 'finance.read',
  financeWrite: 'finance.write',
  refundApprove: 'refund.approve',
  reportRead: 'report.read',
  settingsRead: 'settings.read',
  settingsWrite: 'settings.write',
  userRead: 'user.read',
  userWrite: 'user.write',
  auditRead: 'audit.read',
  partnerRead: 'partner.read',
  partnerReview: 'partner.review',
  partnerGrant: 'partner.grant',
  sheetsRead: 'sheets.read',
  sheetsManage: 'sheets.manage',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_MODULES: Record<PermissionCode, string> = {
  'dashboard.read': 'dashboard',
  'booking.read': 'booking', 'booking.write': 'booking', 'booking.cancel': 'booking',
  'inventory.read': 'inventory', 'inventory.write': 'inventory',
  'catalog.read': 'catalog', 'catalog.write': 'catalog',
  'content.read': 'content', 'content.write': 'content', 'content.publish': 'content',
  'media.read': 'media', 'media.write': 'media', 'media.delete': 'media',
  'crm.read': 'crm', 'crm.write': 'crm',
  'coupon.read': 'coupon', 'coupon.write': 'coupon',
  'finance.read': 'finance', 'finance.write': 'finance', 'refund.approve': 'finance',
  'report.read': 'report',
  'settings.read': 'settings', 'settings.write': 'settings',
  'user.read': 'user', 'user.write': 'user',
  'audit.read': 'audit',
  'partner.read': 'partners', 'partner.review': 'partners', 'partner.grant': 'partners',
  'sheets.read': 'sheets', 'sheets.manage': 'sheets',
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
    'dashboard.read', 'booking.read', 'booking.write', 'booking.cancel', 'inventory.read', 'inventory.write',
    'catalog.read', 'catalog.write', 'content.read', 'media.read', 'media.write',
    'crm.read', 'crm.write', 'coupon.read', 'coupon.write', 'settings.read',
  ],
  editor: [
    'dashboard.read', 'content.read', 'content.write', 'content.publish', 'catalog.read',
    'media.read', 'media.write', 'media.delete', 'settings.read', 'booking.read',
  ],
  accountant: ['dashboard.read', 'finance.read', 'finance.write', 'refund.approve', 'report.read', 'coupon.read', 'booking.read', 'crm.read', 'settings.read', 'audit.read'],
  viewer: ['dashboard.read', 'booking.read', 'inventory.read', 'catalog.read', 'content.read', 'media.read', 'crm.read', 'coupon.read', 'settings.read'],
};

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Chủ sở hữu',
  operator: 'Vận hành',
  editor: 'Biên tập',
  accountant: 'Kế toán',
  viewer: 'Chỉ xem',
};
