import { getContrastRatio } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { createAppTheme } from '../src/theme/create-app-theme';

describe('Foundations — contraste de leitura nos dois temas', () => {
  for (const mode of ['light', 'dark'] as const) {
    it(`${mode}: textos normais e ações atendem contraste AA`, () => {
      const { palette } = createAppTheme(mode);
      for (const surface of [palette.background.default, palette.background.paper]) {
        expect(getContrastRatio(palette.text.primary, surface)).toBeGreaterThanOrEqual(4.5);
        expect(getContrastRatio(palette.text.secondary, surface)).toBeGreaterThanOrEqual(4.5);
        for (const status of ['success', 'warning', 'error', 'info'] as const) {
          expect(getContrastRatio(palette[status].main, surface)).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(getContrastRatio(palette.primary.main, palette.primary.contrastText)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
