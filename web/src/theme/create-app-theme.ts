import { createTheme } from '@mui/material/styles';

export type AppColorMode = 'light' | 'dark';

const foundations = {
  brand: '#FDBF35',
  black: '#0A0A0A',
  white: '#FFFFFF',
  light: {
    background: '#F8F8F6', surface: '#FFFFFF', surfaceVariant: '#F2F1EE',
    primarySoft: '#FFF6D8', text: '#0A0A0A', textSecondary: '#5E5E5E',
    border: '#E5E3DE',
  },
  dark: {
    background: '#0A0A0A', surface: '#151515', surfaceVariant: '#1D1D1D',
    primarySoft: '#30270C', text: '#F7F7F7', textSecondary: '#BDBDBD',
    border: '#2A2A2A',
  },
  status: {
    light: { success: '#027A48', warning: '#B54708', error: '#B42318', info: '#175CD3' },
    dark: { success: '#58D68D', warning: '#F5B041', error: '#FF7A70', info: '#7EB6FF' },
  },
} as const;

export function createAppTheme(mode: AppColorMode) {
  const colors = foundations[mode];
  const status = foundations.status[mode];

  return createTheme({
    breakpoints: { values: { xs: 0, sm: 768, md: 1200, lg: 1440, xl: 1920 } },
    palette: {
      mode,
      primary: { main: foundations.brand, contrastText: foundations.black },
      background: { default: colors.background, paper: colors.surface },
      text: { primary: colors.text, secondary: colors.textSecondary, disabled: mode === 'light' ? '#77746F' : '#858585' },
      divider: colors.border,
      success: { main: status.success, contrastText: mode === 'light' ? foundations.white : foundations.black },
      warning: { main: status.warning, contrastText: mode === 'light' ? foundations.white : foundations.black },
      error: { main: status.error, contrastText: mode === 'light' ? foundations.white : foundations.black },
      info: { main: status.info, contrastText: mode === 'light' ? foundations.white : foundations.black },
      action: {
        hover: mode === 'light' ? 'rgba(10, 10, 10, 0.045)' : 'rgba(255, 255, 255, 0.07)',
        selected: mode === 'light' ? colors.primarySoft : colors.primarySoft,
        focus: mode === 'light' ? 'rgba(10, 10, 10, 0.16)' : 'rgba(255, 255, 255, 0.22)',
      },
    },
    typography: {
      fontFamily: 'Inter, Arial, sans-serif',
      h1: { fontSize: '24px', fontWeight: 700, lineHeight: '32px' },
      h2: { fontSize: '20px', fontWeight: 600, lineHeight: '28px' },
      body1: { fontSize: '14px', lineHeight: '20px' },
      body2: { fontSize: '12px', lineHeight: '18px' },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: colors.background, color: colors.text },
          '*': { boxSizing: 'border-box' },
          '::selection': { backgroundColor: foundations.brand, color: foundations.black },
          ':focus-visible': { outline: `3px solid ${status.info}`, outlineOffset: '2px' },
        },
      },
      MuiCard: { styleOverrides: { root: { borderRadius: 14, boxShadow: 'none' } } },
      MuiPaper: { styleOverrides: { outlined: { borderColor: colors.border } } },
      MuiSwitch: {
        styleOverrides: {
          root: { width: 42, height: 30, padding: 3, overflow: 'visible' },
          switchBase: {
            padding: 5,
            '&.Mui-checked': { transform: 'translateX(12px)', color: foundations.black },
            '&.Mui-checked + .MuiSwitch-track': { backgroundColor: foundations.brand, opacity: 1 },
          },
          thumb: { width: 18, height: 18, boxShadow: '0 1px 3px rgba(0,0,0,.2)' },
          track: { borderRadius: 12, backgroundColor: mode === 'light' ? '#D6D3CC' : '#454545', opacity: 1 },
        },
      },
    },
  });
}

export { foundations };
