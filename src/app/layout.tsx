import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { AppProvider } from '@/context/AppContext';
import { AppShell } from '@/components/AppShell';
import { TransactionModal } from '@/components/TransactionModal';
import { CommandPalette } from '@/components/CommandPalette';
import { ImportModal } from '@/components/ImportModal';
import { AccountModal } from '@/components/AccountModal';
import { ToastContainer } from '@/components/ToastContainer';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#0a0b0e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Ledgr | Personal Financial Command Center',
  description: 'Production-grade personal finance command center with deterministic financial math, accounts, budgets, goals, and analytics.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ledgr',
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
    <html lang="en" className={inter.className} suppressHydrationWarning>
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
          <ToastContainer />
        </AppProvider>
      </body>
    </html>
  );
}
