import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { RegisterServiceWorker } from '@/components/pwa/register-sw';
import { SyncQueueBootstrap } from '@/components/sync/sync-queue-bootstrap';
import { LanguageProvider } from '@/lib/i18n/context';
import { getServerLocale } from '@/lib/i18n/locale';
import { APP_BASE_PATH, APP_NAME } from '@/lib/app-config';
import './globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display'
});

const body = Inter({
  subsets: ['latin'],
  variable: '--font-body'
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`
  },
  description: 'PWA de discipline de trading pour prop firms.',
  manifest: `${APP_BASE_PATH}/manifest.json`,
  applicationName: APP_NAME
};

export const viewport: Viewport = {
  themeColor: '#0a0d12',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <LanguageProvider initialLocale={locale}>
          <RegisterServiceWorker />
          <SyncQueueBootstrap />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
