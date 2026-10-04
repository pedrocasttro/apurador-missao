import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Visão Geral renderiza EA20 simulado nos temas desktop e mobile', async ({ page }, testInfo) => {
  const fixture = await readFile(resolve(process.cwd(), 'tests/fixtures/tse/ea20-president-br.json'), 'utf8');
  await page.route('**/br-c0001-e021270-u.json', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: fixture,
  }));
  await page.route('**/fotos/br/*.jpeg', (route) => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><circle cx="24" cy="24" r="24" fill="#FDBF35"/></svg>',
  }));
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');

  await expect(page.getByText('CANDIDATO 9999')).toBeVisible();
  await expect(page.getByText('DADOS SIMULADOS')).toBeVisible();
  await expect(page.getByText('Dados para desenvolvimento; não representam apuração corrente.')).toBeVisible();
  const firstPhoto = page.locator('img[src$="/41592406.jpeg"]');
  await expect.poll(() => firstPhoto.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const othersButton = page.getByRole('button', { name: /Mostrar 10 candidatos agrupados em Outros/ });
  await expect(othersButton).toHaveAttribute('aria-expanded', 'false');
  await othersButton.focus();
  await othersButton.press('Enter');
  await expect(page.getByText('CANDIDATO 9993')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recolher candidatos agrupados em Outros' })).toBeVisible();
  const collapseButton = page.getByRole('button', { name: 'Recolher candidatos agrupados em Outros' });
  await collapseButton.focus();
  await collapseButton.press('Space');
  await expect(page.getByRole('button', { name: /Mostrar 10 candidatos agrupados em Outros/ })).toHaveAttribute('aria-expanded', 'false');
  const presidentialCard = await page.getByRole('region', { name: 'Resultado presidencial resumido' }).boundingBox();
  const seatsCard = await page.getByRole('region', { name: 'Cadeiras e desempenho do Missão' }).boundingBox();
  expect(presidentialCard).not.toBeNull();
  expect(seatsCard).not.toBeNull();
  expect(Math.abs(presidentialCard!.y - seatsCard!.y)).toBeLessThan(10);
  await page.screenshot({ path: testInfo.outputPath('overview-light.png'), fullPage: true });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole('switch', { name: 'Tema escuro' }).check();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(10, 10, 10)');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('overview-dark.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('overview-mobile.png'), fullPage: true });
  expect(pageErrors).toEqual([]);
});
