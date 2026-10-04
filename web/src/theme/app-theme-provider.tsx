'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import type { AppColorMode } from './create-app-theme';
import { createAppTheme } from './create-app-theme';

type AppThemeContextValue = { mode: AppColorMode; toggleMode: () => void };
const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppColorMode>('light');
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const context = useMemo<AppThemeContextValue>(() => ({
    mode,
    toggleMode: () => setMode((current) => current === 'light' ? 'dark' : 'light'),
  }), [mode]);

  return (
    <AppThemeContext.Provider value={context}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div data-theme={mode}>{children}</div>
      </ThemeProvider>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) throw new Error('useAppTheme precisa estar dentro de AppThemeProvider.');
  return context;
}
