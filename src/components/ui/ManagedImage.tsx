import NextImage, { type ImageProps } from 'next/image';
import { mediaAlt } from '@/lib/media-alt';

/** The browser reaches /media through the gateway; Next's web container does not. */
export function isManagedMediaUrl(src: string): boolean {
  return src.startsWith('/media/');
}

/** Remote files (e.g. Wikimedia Commons) are served as-is: the optimizer has no allow-list for them. */
function isRemoteUrl(src: string): boolean {
  return /^https?:\/\//.test(src);
}

export default function ManagedImage({ src, unoptimized, alt, ...props }: ImageProps) {
  return <NextImage src={src} alt={mediaAlt(alt)} unoptimized={unoptimized || (typeof src === 'string' && (isManagedMediaUrl(src) || isRemoteUrl(src)))} {...props} />;
}
