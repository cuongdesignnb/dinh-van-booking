import NextImage, { type ImageProps } from 'next/image';

/** The browser reaches /media through the gateway; Next's web container does not. */
export function isManagedMediaUrl(src: string): boolean {
  return src.startsWith('/media/');
}

export default function ManagedImage({ src, unoptimized, ...props }: ImageProps) {
  return <NextImage src={src} unoptimized={unoptimized || (typeof src === 'string' && isManagedMediaUrl(src))} {...props} />;
}
