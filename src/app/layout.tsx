import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '@/styles/globals.css';
import { AppProvider } from '@/context/AppContext';
import { AppShell } from '@/components/AppShell';
import { TransactionModal } from '@/components/TransactionModal';
import { CommandPalette } from '@/components/CommandPalette';
import { ImportModal } from '@/components/ImportModal';
import { AccountModal } from '@/components/AccountModal';
import { GlobalCategoryModal } from '@/components/CategoryModal';
import { ToastContainer } from '@/components/ToastContainer';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6f8' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0c10' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Bagstack | Personal Financial Command Center',
  description: 'Production-grade personal finance command center with deterministic financial math, accounts, budgets, goals, and analytics.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Bagstack',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var saved = localStorage.getItem('fm_theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var theme = saved && saved !== 'system' ? saved : (prefersDark ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', theme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <AppProvider>
          <AppShell>
            {children}
          </AppShell>
          <TransactionModal />
          <CommandPalette />
          <ImportModal />
          <AccountModal />
          <GlobalCategoryModal />
          <ToastContainer />
        </AppProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
