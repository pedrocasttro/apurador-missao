import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

async function mapAsset(file: string) {
  return JSON.parse(await readFile(resolve(process.cwd(), `public/maps/${file}`), 'utf8')) as {
    source: string;
    features: Array<{ id: string; label: string; d: string }>;
  };
}

describe('malhas estáticas do mapa presidencial', () => {
  it('contém as 27 UFs do IBGE com geometrias utilizáveis', async () => {
    const map = await mapAsset('brazil-states-2025.json');
    expect(map.source).toBe('IBGE Malha Municipal Digital 2025');
    expect(map.features).toHaveLength(27);
    expect(map.features.find((area) => area.id === 'PR')).toMatchObject({ label: 'Paraná' });
    expect(map.features.every((area) => area.d.startsWith('M') && !area.d.includes('NaN'))).toBe(true);
  });

  it('fornece geometria por UF e relaciona Paraná aos 399 códigos IBGE municipais', async () => {
    const map = await mapAsset('municipalities-pr-2025.json');
    expect(map.features).toHaveLength(399);
    expect(map.features.find((area) => area.id === '4106902')).toMatchObject({ label: 'Curitiba' });
    expect(map.features.every((area) => /^\d{7}$/.test(area.id) && area.d.startsWith('M'))).toBe(true);
  });
});
