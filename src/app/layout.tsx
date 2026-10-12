import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { AlertsProvider } from '@/contexts/AlertsContext';
import WebMcp from '@/components/WebMcp';
import { ToastProvider } from '@/components/ui/Toast';
import { SignInProvider } from '@/components/auth/SignIn';
import AppChrome from '@/components/shell/AppChrome';
import { themeInitScript } from '@/lib/theme-script';
import { getSiteUrl } from '@/lib/site';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

const description =
  'Find open source issues that match your stack, track them until the PR merges, and keep every program deadline from GSoC to Hacktoberfest in view.';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'Orion — the open source contributor workspace',
    template: '%s · Orion',
  },
  description,
  applicationName: 'Orion',
  keywords: ['open source', 'good first issue', 'GitHub', 'GSoC', 'Hacktoberfest', 'bounties', 'contributing'],
  // No og:title/description here: pages inherit openGraph, and a shared
  // title would label every page "Orion" in link previews.
  openGraph: {
    type: 'website',
    siteName: 'Orion',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@dazzbuilds',
  },
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <ToastProvider>
          <AuthProvider>
            <SignInProvider>
              <WorkspaceProvider>
                <AlertsProvider>
                  <AppChrome>{children}</AppChrome>
                  <WebMcp />
                </AlertsProvider>
              </WorkspaceProvider>
            </SignInProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
