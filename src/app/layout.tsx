import type { Metadata, Viewport } from 'next';
import { siteConfig, isPreview } from '@/config/site';
import { motionBootScript } from '@/components/ui/MotionController';
import { displayFont, scriptFont, uiFont } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: `${siteConfig.name} — Đặt phòng Cúc Phương, Ninh Bình`,
  description: siteConfig.description,
  robots: isPreview ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = {
  themeColor: '#194526',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      className={`${displayFont.variable} ${uiFont.variable} ${scriptFont.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
