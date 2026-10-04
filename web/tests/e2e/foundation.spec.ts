import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('export estático: navegação mantém tema e switch mantém URL', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?uf=PR&municipio=Sarandi');
  await page.getByRole('switch', { name: 'Tema escuro' }).check();
  await expect(page).toHaveURL(/\?uf=PR&municipio=Sarandi$/);
  await page.getByRole('link', { name: 'Senado', exact: true }).click();
  await expect(page).toHaveURL(/\/senado\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Senado Federal');
  await expect(page.getByRole('switch', { name: 'Tema escuro' })).toBeChecked();
  await expect(page.locator('img[alt="Missão — Apuração 2026"]:visible')).toHaveAttribute('src', '/brand/missao-dark.svg');
  expect(errors).toEqual([]);
});

for (const [route, title] of [
  ['/', 'Visão geral'], ['/presidente/', 'Presidência'], ['/senado/', 'Senado Federal'],
  ['/cadeiras/', 'Cadeiras'], ['/missao/', 'Missão'], ['/explorar/', 'Explorar'],
]) {
  test(`rota estática ${route} abre diretamente`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  });
}

test('estrutura acessível nos dois temas e assets locais válidos', async ({ page }) => {
  await page.goto('/');
  for (const dark of [false, true]) {
    await page.getByRole('switch', { name: 'Tema escuro' }).setChecked(dark);
    const logo = page.locator('img[alt="Missão — Apuração 2026"]:visible');
    await expect(logo).toBeVisible();
    expect(await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  }
});

test('mobile: drawer acessível, navegação e ausência de overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.locator('button[aria-label="Abrir navegação"]');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('link', { name: 'Presidente', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Presidência');
  await expect(page.getByRole('navigation')).not.toBeVisible();
  await menu.click();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('switch', { name: 'Tema escuro' }).check();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('tablet: rail mantém nomes acessíveis e destinos', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1000 });
  await page.goto('/');
  await page.getByRole('link', { name: 'Cadeiras', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cadeiras');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
