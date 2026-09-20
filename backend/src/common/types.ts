import type { PermissionCode } from './permissions';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: PermissionCode[];
  sessionId: string;
}

export interface RequestContext {
  requestId: string;
  ip?: string;
  userAgent?: string;
}

/** Envelope every list endpoint returns, so the admin tables share one shape. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
