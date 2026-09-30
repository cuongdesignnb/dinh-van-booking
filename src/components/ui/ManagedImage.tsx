import NextImage, { type ImageProps } from 'next/image';
import { mediaAlt } from '@/lib/media-alt';

/** The browser reaches /media through the gateway; Next's web container does not. */
export function isManagedMediaUrl(src: string): boolean {
  return src.startsWith('/media/');
}

export default function ManagedImage({ src, unoptimized, alt, ...props }: ImageProps) {
  return <NextImage src={src} alt={mediaAlt(alt)} unoptimized={unoptimized || (typeof src === 'string' && isManagedMediaUrl(src))} {...props} />;
}
