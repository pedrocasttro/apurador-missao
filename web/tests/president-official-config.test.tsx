import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fetchPresidentSetup } from '../src/data/tse/president-client';

async function fixture(name: string) {
  return JSON.parse(await readFile(resolve(process.cwd(), `tests/fixtures/tse/${name}`), 'utf8'));
}

describe('configuração oficial EA20 da Presidência', () => {
  it('busca EA11 na raiz oficial e deriva os arquivos da eleição pelo EA11', async () => {
    const electionConfig = await fixture('ea11-election-configuration.json');
    electionConfig.f = 'o';
    const federalContest = electionConfig.pl.find((contest: { c: string; cd: string }) => contest.c === 'ele2026' && contest.cd === '17801');
    federalContest.cd = '3220';
    const presidentialElection = federalContest.e.find((election: { cd: string }) => election.cd === '21270');
    presidentialElection.cd = '6257';

    const municipalities = await fixture('ea12-municipalities-election-021270.json');
    municipalities.f = 'o';
    const countryResult = await fixture('ea20-president-br.json');
    countryResult.f = 'o';
    countryResult.ele = '6257';

    const responses = new Map([
      ['https://resultados.tse.jus.br/oficial/comum/config/ele-c.json', electionConfig],
      ['https://resultados.tse.jus.br/oficial/ele2026/6257/config/mun-e006257-cm.json', municipalities],
      ['https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json', countryResult],
    ]);
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const payload = responses.get(String(input));
      if (!payload) throw new Error(`unexpected URL ${String(input)}`);
      return Response.json(payload);
    });

    const setup = await fetchPresidentSetup({
      fetcher,
      env: {
        NEXT_PUBLIC_TSE_EA20_PRESIDENT_URL: 'https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json',
        NEXT_PUBLIC_TSE_EXPECTED_SOURCE: 'official',
      },
    });

    expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([...responses.keys()]);
    expect(setup).toMatchObject({ source: 'official', electionCode: '6257', dataDirectory: 'https://resultados.tse.jus.br/oficial/ele2026/6257/dados' });
  });
});
