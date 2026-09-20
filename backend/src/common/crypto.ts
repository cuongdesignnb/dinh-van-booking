import { createHash, randomBytes, scrypt as scryptCb, type ScryptOptions, timingSafeEqual } from 'node:crypto';

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (error, derived) =>
      error ? reject(error) : resolve(derived),
    );
  });
}
const KEY_LENGTH = 64;
const PARAMS = { N: 16384, r: 8, p: 1 };

/** scrypt keeps password storage strong without pulling in a native dependency. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(plain.normalize('NFKC'), salt, KEY_LENGTH, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64');
  const derived = await scrypt(plain.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Opaque session/access tokens: random value to the client, hash in the database. */
export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** IPs are only ever stored hashed, so logs and exports carry no raw address. */
export function hashIp(ip: string | undefined, secret: string): string | null {
  if (!ip) return null;
  return createHash('sha256').update(`${secret}:${ip}`).digest('hex').slice(0, 32);
}
