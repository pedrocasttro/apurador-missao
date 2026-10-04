import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Presidência consome fixtures TSE, mantém filtros acessíveis em tema e mobile', async ({ page }) => {
  test.setTimeout(60_000);
  const fixtures = [
    ['ele-c.json', 'ea11-election-configuration.json'],
    ['mun-e021270-cm.json', 'ea12-municipalities-election-021270.json'],
    ['br-c0001-e021270-u.json', 'ea20-president-br.json'],
    ['pr-c0001-e021270-u.json', 'ea20-president-pr.json'],
    ['pr75353-c0001-e021270-u.json', 'ea20-president-curitiba.json'],
  ] as const;
  for (const [filename, fixture] of fixtures) {
    const body = await readFile(resolve(process.cwd(), `tests/fixtures/tse/${fixture}`), 'utf8');
    await page.route(`**/${filename}`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body }));
  }
  await page.route('**/maps/*.json', async (route) => {
    const filename = new URL(route.request().url()).pathname.split('/').at(-1);
    if (!filename) return route.fulfill({ status: 404 });
    const body = await readFile(resolve(process.cwd(), `public/maps/${filename}`), 'utf8').catch(() => '');
    return body
      ? route.fulfill({ status: 200, contentType: 'application/json', body })
      : route.fulfill({ status: 404 });
  });
  await page.route('https://resultados-sim.tse.jus.br/**/dados/*/*-c0001-*-u.json', async (route) => {
    const filename = new URL(route.request().url()).pathname.split('/').at(-1);
    const fixture = filename?.startsWith('br-')
      ? 'ea20-president-br.json'
      : filename?.startsWith('pr-c0001-')
        ? 'ea20-president-pr.json'
        : null;
    if (!fixture) return route.fulfill({ status: 404 });
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: await readFile(resolve(process.cwd(), `tests/fixtures/tse/${fixture}`), 'utf8'),
    });
  });
  await page.route('https://resultados-sim.tse.jus.br/**/fotos/**', (route) => route.fulfill({ status: 404 }));

  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/presidente/');
  await expect(page.getByText('DADOS SIMULADOS')).toBeVisible();
  const candidateList = page.getByRole('region', { name: 'Lista de candidatos presidenciais' });
  await expect(candidateList.getByRole('button')).toHaveCount(13);
  const metricValues = candidateList.getByTestId('candidate-metric-value');
  await expect(metricValues.first()).toHaveText('10,40%');
  const percentages = (await metricValues.allTextContents()).map((value) => Number(value.replace('%', '').replace(',', '.')));
  expect(percentages).toEqual([...percentages].sort((a, b) => b - a));
  await page.getByRole('combobox', { name: 'Métrica' }).selectOption('totalVotes');
  await expect(candidateList.getByText('Votos totais').first()).toBeVisible();
  const votes = (await metricValues.allTextContents()).map((value) => Number(value.replaceAll('.', '')));
  expect(votes).toEqual([...votes].sort((a, b) => b - a));
  await page.getByRole('combobox', { name: 'Métrica' }).selectOption('validVotesPercentage');
  const candidateRow = candidateList.getByRole('button', { name: /CANDIDATO 9995/ });
  await expect(candidateRow).toContainText('8,99%');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await candidateRow.focus();
  await candidateRow.press('Enter');

  const candidate = page.getByRole('combobox', { name: 'Candidato' });
  await expect(candidate).toHaveValue('CANDIDATO 9995');
  const percent = page.getByLabel('Percentual de votos válidos do candidato');
  await expect(percent).toHaveText('8,99%');
  await percent.focus();
  await expect(page.getByRole('tooltip')).toContainText('9.075.260 votos');
  await percent.press('Escape');
  await page.getByRole('button', { name: /Paraná: 498\.889 votos/ }).click();
  await expect(page.getByRole('combobox', { name: 'UF' })).toHaveValue('PARANÁ');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole('switch', { name: 'Tema escuro' }).check();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(10, 10, 10)');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
