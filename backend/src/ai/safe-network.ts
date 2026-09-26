import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { BadRequestException } from '@nestjs/common';

function isPrivateAddress(address: string): boolean {
  const value = address.toLowerCase().split('%')[0];
  if (value === '::1' || value === '::' || value.startsWith('fc') || value.startsWith('fd') || /^fe[89ab]/.test(value)) return true;
  if (value.startsWith('::ffff:')) return isPrivateAddress(value.slice(7));
  if (isIP(value) !== 4) return false;
  const octets = value.split('.').map(Number);
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

export function validatePublicHttpsUrl(raw: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BadRequestException(`${label} không phải URL hợp lệ`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || !url.hostname
      || url.hostname === 'localhost' || url.hostname.endsWith('.localhost') || url.hostname.endsWith('.local')
      || isPrivateAddress(url.hostname)) {
    throw new BadRequestException(`${label} phải là HTTPS công khai, không chứa thông tin đăng nhập`);
  }
  return url;
}

export async function assertPublicHost(url: URL): Promise<void> {
  if (isIP(url.hostname)) {
    if (isPrivateAddress(url.hostname)) throw new BadRequestException('Địa chỉ ảnh từ nhà cung cấp không an toàn');
    return;
  }
  let records: Array<{ address: string }>;
  try {
    records = await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new BadRequestException('Không xác minh được máy chủ ảnh do nhà cung cấp trả về');
  }
  if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
    throw new BadRequestException('Máy chủ ảnh do nhà cung cấp trả về không phải địa chỉ công khai');
  }
}

export { isPrivateAddress };
