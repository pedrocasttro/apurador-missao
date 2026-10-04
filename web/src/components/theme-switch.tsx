'use client';

import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { Moon, Sun } from 'lucide-react';
import { useAppTheme } from '../theme/app-theme-provider';

export function ThemeSwitch() {
  const { mode, toggleMode } = useAppTheme();
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{ border: 1, borderColor: 'divider', borderRadius: '10px', px: 1, py: 0.5, minHeight: 38, alignItems: 'center' }}
    >
      {mode === 'light' ? <Sun aria-hidden size={16} /> : <Moon aria-hidden size={16} />}
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>Tema</Typography>
      <Switch
        size="small"
        checked={mode === 'dark'}
        onChange={toggleMode}
        slotProps={{ input: { 'aria-label': 'Tema escuro' } }}
      />
    </Stack>
  );
}
