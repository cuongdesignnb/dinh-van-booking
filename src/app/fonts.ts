import { Dancing_Script, Playfair_Display, Roboto_Condensed } from 'next/font/google';

export const displayFont = Playfair_Display({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['600', '700'],
  style: 'normal',
  display: 'swap',
  variable: '--font-dvb-display',
});

export const uiFont = Roboto_Condensed({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  // Real italic face for quotes (no synthetic slant).
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-dvb-ui',
});

export const scriptFont = Dancing_Script({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '600'],
  style: 'normal',
  display: 'swap',
  variable: '--font-dvb-script',
});
