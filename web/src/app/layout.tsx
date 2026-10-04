import type { Metadata, Viewport } from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './globals.css';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { AppShell } from '../components/app-shell';
import { AppThemeProvider } from '../theme/app-theme-provider';

export const metadata: Metadata = {
  title: { default: 'Apuração Eleições 2026', template: '%s | Apuração 2026' },
  description: 'Acompanhamento de resultados oficiais das Eleições Gerais de 2026.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#F8F8F6' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <AppThemeProvider>
            <AppShell>{children}</AppShell>
          </AppThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
