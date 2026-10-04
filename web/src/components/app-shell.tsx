'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  Armchair, Gauge, Landmark, Map, Menu, Search, UserRound, X,
} from 'lucide-react';
import { appRoutes, routeFromPath } from '../app/routes';
import { useAppTheme } from '../theme/app-theme-provider';
import { ThemeSwitch } from './theme-switch';

const routeIcons = [Gauge, UserRound, Landmark, Armchair, Map, Search];

function Brand({ compact = false }: { compact?: boolean }) {
  const { mode } = useAppTheme();
  return (
    <Stack spacing={0.5} sx={{ width: '100%', overflow: 'hidden', alignItems: compact ? 'center' : 'flex-start' }}>
      <Box sx={{ width: 138, height: 110.92, position: 'relative', overflow: 'hidden' }}>
        <Box
          component="img"
          src={`/brand/missao-${mode}.svg`}
          alt="Missão — Apuração 2026"
          sx={{ position: 'absolute', left: '2.34%', top: '3.2%' }}
        />
      </Box>
      {!compact && (
        <Typography variant="caption" sx={{ fontSize: 10, letterSpacing: '0.6px', color: 'text.secondary' }}>
          APURAÇÃO 2026
        </Typography>
      )}
    </Stack>
  );
}

function Navigation({ current, onNavigate }: {
  current: string;
  onNavigate?: () => void;
}) {
  return (
    <Stack component="nav" aria-label="Navegação principal" spacing={0.5} sx={{ width: '100%' }}>
      {appRoutes.map((route, index) => {
        const Icon = routeIcons[index];
        const selected = route.href === current;
        return (
          <ButtonBase
            component={Link}
            href={route.href}
            key={route.href}
            onClick={onNavigate}
            aria-current={selected ? 'page' : undefined}
            aria-label={route.label}
            title={route.label}
            sx={{
              minHeight: 42,
              width: '100%',
              justifyContent: { xs: 'flex-start', sm: 'center', md: 'flex-start' },
              gap: { xs: 1.25, sm: 0, md: 1.25 },
              px: { xs: 1.5, sm: 1, md: 1.5 },
              borderRadius: '10px',
              color: selected ? 'text.primary' : 'text.secondary',
              bgcolor: selected ? 'action.selected' : 'transparent',
              fontSize: 13,
              fontWeight: selected ? 600 : 500,
              transition: 'background-color 180ms ease-out, color 180ms ease-out',
              '&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' },
              '&:focus-visible': { outline: '3px solid', outlineColor: 'info.main', outlineOffset: 2 },
            }}
          >
            <Icon aria-hidden size={18} strokeWidth={2.1} />
            <Box component="span" aria-hidden sx={{ display: { xs: 'inline', sm: 'none', md: 'inline' } }}>{route.label}</Box>
          </ButtonBase>
        );
      })}
    </Stack>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <Stack
      component="aside"
      aria-label="Barra lateral"
      sx={{
        display: { xs: 'none', sm: 'flex' },
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        flex: '0 0 auto',
        width: { sm: 72, md: 240 },
        height: '100dvh',
        minHeight: 680,
        overflowY: 'auto',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        px: { sm: 1.25, md: 2 },
        pt: 3,
        pb: 2.5,
      }}
    >
      <Stack spacing={2.25} sx={{ flex: 1 }}>
        <Box sx={{ display: { sm: 'none', md: 'block' } }}><Brand /></Box>
        <Box sx={{ display: { xs: 'none', sm: 'block', md: 'none' } }}><Brand compact /></Box>
        <Navigation current={pathname} />
        <Box sx={{ display: { sm: 'none', md: 'block' }, mt: 'auto !important' }}>
          <Divider sx={{ mb: 1.5 }} />
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Fonte</Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>Tribunal Superior Eleitoral</Typography>
        </Box>
      </Stack>
    </Stack>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const route = routeFromPath(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary' }}>
      <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
      <Sidebar pathname={route.href} />

      <Box component="main" id="conteudo" tabIndex={-1} sx={{ flex: 1, minWidth: 0, px: { xs: 2, sm: 2.5, md: 3.5 }, pt: { xs: 2, md: 2.5 }, pb: 3.5 }}>
        <Stack spacing={2.25} sx={{ maxWidth: 1800, mx: 'auto' }}>
          <Stack
            component="header"
            direction="row"
            spacing={1.5}
            sx={{ minHeight: { xs: 70, md: 70 }, width: '100%', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1} sx={{ minWidth: 0, alignItems: 'center' }}>
              <IconButton
                aria-label="Abrir navegação"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(true)}
                sx={{ display: { xs: 'inline-flex', sm: 'none' }, ml: -1, flex: '0 0 auto' }}
              >
                <Menu aria-hidden size={21} />
              </IconButton>
              <Typography component="h1" variant="h1" sx={{ overflowWrap: 'anywhere' }}>{route.title}</Typography>
            </Stack>
            <ThemeSwitch />
          </Stack>

          {children}
        </Stack>
      </Box>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        slotProps={{ paper: { sx: { width: 280, p: 2, bgcolor: 'background.paper' } } }}
      >
        <Stack spacing={2.25} sx={{ height: '100%' }}>
          <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Brand />
            <IconButton aria-label="Fechar navegação" onClick={() => setMobileOpen(false)}>
              <X aria-hidden size={20} />
            </IconButton>
          </Stack>
          <Navigation current={route.href} onNavigate={() => setMobileOpen(false)} />
          <Box sx={{ mt: 'auto !important' }}>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Fonte</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>Tribunal Superior Eleitoral</Typography>
          </Box>
        </Stack>
      </Drawer>
    </Box>
  );
}
