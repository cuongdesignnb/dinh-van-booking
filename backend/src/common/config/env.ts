import { readFileSync } from 'node:fs';

/** Reads a secret from a file when `<name>_FILE` is set, else from the variable. */
export function readSecret(name: string): string {
  const fromFile = process.env[`${name}_FILE`];
  if (fromFile) return readFileSync(fromFile, 'utf8').trim();
  const direct = process.env[name];
  if (direct) return direct;
  throw new Error(`Missing secret ${name} (set ${name} or ${name}_FILE)`);
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) throw new Error(`${name} must be an integer`);
  return parsed;
}

export function buildDatabaseUrl(): string {
  const host = required('DB_HOST');
  const port = int('DB_PORT', 5432);
  const name = required('DB_NAME');
  const user = required('DB_USER');
  const password = readSecret('DB_PASSWORD');
  const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
  return `postgresql://${auth}@${host}:${port}/${encodeURIComponent(name)}`;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  businessTimezone: string;
  currency: string;
  databaseUrl: string;
  redisUrl: string;
  sessionSecret: string;
  sessionTtlMinutes: number;
  sessionIdleMinutes: number;
  guestSessionTtlMinutes: number;
  quoteTtlMinutes: number;
  holdTtlMinutes: number;
  mediaRoot: string;
  mediaPublicBase: string;
  mediaMaxBytes: number;
  allowDemoData: boolean;
  publicOrigins: string[];
}

export function loadConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'production',
    port: int('API_PORT', 3001),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    businessTimezone: process.env.BUSINESS_TIMEZONE ?? 'Asia/Ho_Chi_Minh',
    currency: process.env.CURRENCY ?? 'VND',
    databaseUrl: buildDatabaseUrl(),
    redisUrl: process.env.REDIS_URL ?? 'redis://redis:6379',
    sessionSecret: readSecret('SESSION_SECRET'),
    sessionTtlMinutes: int('SESSION_TTL_MINUTES', 720),
    sessionIdleMinutes: int('SESSION_IDLE_MINUTES', 60),
    guestSessionTtlMinutes: int('GUEST_SESSION_TTL_MINUTES', 1440),
    quoteTtlMinutes: int('QUOTE_TTL_MINUTES', 20),
    holdTtlMinutes: int('HOLD_TTL_MINUTES', 20),
    mediaRoot: process.env.MEDIA_ROOT ?? '/var/lib/dvb/media',
    mediaPublicBase: process.env.MEDIA_PUBLIC_BASE ?? '/media',
    mediaMaxBytes: int('MEDIA_MAX_BYTES', 10 * 1024 * 1024),
    allowDemoData: process.env.ALLOW_DEMO_DATA === 'true',
    publicOrigins: (process.env.PUBLIC_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  };
}

export const APP_CONFIG = 'APP_CONFIG';
