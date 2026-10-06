import { NextResponse, type NextRequest } from 'next/server';
import { ALWAYS_NOINDEX_PATTERN, CONTENT_SECTIONS as SECTION_BY_KIND, PUBLIC_ROUTES, RESERVED_ROOT_SEGMENTS } from '@/lib/routes';

const ROOT_RESERVED = new Set<string>([
  ...RESERVED_ROOT_SEGMENTS, 'robots.txt', 'sitemap.xml', 'favicon.ico', 'icon.svg', 'apple-icon.png',
]);
const CONTENT_SECTIONS = new Set<string>([...Object.values(SECTION_BY_KIND).filter(Boolean), PUBLIC_ROUTES.staticPages]);

function decodeSegment(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function isContentPath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 1) {
    const decoded = decodeSegment(segments[0]);
    if (!decoded || decoded.includes('/')) return false;
    const slug = decoded.toLowerCase();
    return !ROOT_RESERVED.has(slug) && !slug.includes('.') && /^[a-z0-9-]+$/.test(slug);
  }
  if (segments.length !== 2 || !CONTENT_SECTIONS.has(`/${segments[0]}`)) return false;
  const decoded = decodeSegment(segments[1]);
  return !!decoded && !decoded.includes('/') && /^[a-z0-9-]+$/i.test(decoded);
}

/** Human routes are lowercase; `/Phong-Nghi` → 308 `/phong-nghi` (one hop, query kept). */
function lowercaseRedirect(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!/[A-Z]/.test(pathname.replace(/%[0-9a-f]{2}/gi, '')) || /^\/(?:api|media|_next)(?:\/|$)/i.test(pathname) || /\.[a-z0-9]+$/i.test(pathname)) return null;
  const target = request.nextUrl.clone();
  target.pathname = pathname.toLowerCase();
  return NextResponse.redirect(target, 308);
}

export async function middleware(request: NextRequest) {
  const lowercase = lowercaseRedirect(request);
  if (lowercase) return lowercase;
  const response = NextResponse.next();
  if (ALWAYS_NOINDEX_PATTERN.test(request.nextUrl.pathname)) {
    // Private/transactional routes stay out of search even after indexing is enabled.
    response.headers.set('X-Robots-Tag', 'noindex, follow');
  } else if (process.env.SEO_INDEXING_ALLOWED !== 'true') {
    response.headers.set('X-Robots-Tag', 'noindex, follow');
  }

  if (!isContentPath(request.nextUrl.pathname)) return response;
  const apiBase = process.env.INTERNAL_API_BASE_URL;
  if (!apiBase) return response;

  const lookup = new URL(`${apiBase.replace(/\/$/, '')}/public/routes/resolve`);
  lookup.searchParams.set('path', request.nextUrl.pathname);
  try {
    const result = await fetch(lookup, { cache: 'no-store', headers: { accept: 'application/json' } });
    if (result.status === 404) return response;
    if (!result.ok) return serviceUnavailable();
    const resolution = await result.json() as { kind?: string; path?: string; status?: number };
    if (resolution.kind !== 'redirect') return response;
    if (!resolution.path || !resolution.path.startsWith('/') || resolution.path.startsWith('//')) return serviceUnavailable();
    const status = resolution.status === 301 ? 301 : 308;
    const target = request.nextUrl.clone();
    target.pathname = resolution.path;
    target.search = '';
    return NextResponse.redirect(target, status);
  } catch {
    return serviceUnavailable();
  }
}

function serviceUnavailable() {
  return new NextResponse('Public content service temporarily unavailable', {
    status: 503,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|media/|api/).*)'],
};
