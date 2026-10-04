import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { getExpectedOverviewSource, getOverviewCandidatePhotoUrl, getOverviewEndpoint, OVERVIEW_POLL_INTERVAL_MS } from '../src/data/tse/overview-config';
import { fetchOverview } from '../src/data/tse/overview-client';

const simulatedUrl = 'https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/br/br-c0001-e021270-u.json';

async function fixture() {
  return JSON.parse(await readFile(resolve(process.cwd(), 'tests/fixtures/tse/ea20-president-br.json'), 'utf8'));
}

describe('configuração e leitura da Visão Geral (EA20)', () => {
  it('usa o EA20 simulado por padrão e permite trocar a URL no build', () => {
    expect(getOverviewEndpoint({})).toBe(simulatedUrl);
    const officialUrl = 'https://resultados.tse.jus.br/oficial/ciclo/ele2026/6257/dados/br/br-c0001-e006257-u.json';
    const officialEnv = { NEXT_PUBLIC_TSE_EA20_PRESIDENT_URL: officialUrl };
    expect(getOverviewEndpoint(officialEnv)).toBe(officialUrl);
    expect(getExpectedOverviewSource(officialEnv)).toBe('official');
    expect(OVERVIEW_POLL_INTERVAL_MS).toBe(5_000);
  });

  it('monta a URL da foto no diretório EA20 correspondente e usa sqcand', () => {
    expect(getOverviewCandidatePhotoUrl({}, '41592406'))
      .toBe('https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/fotos/br/41592406.jpeg');
  });

  it('traduz totalização, votos gerais e candidatos em ordem decrescente', async () => {
    const raw = await fixture();
    const response = new Response(JSON.stringify(raw), { status: 200, headers: { 'content-type': 'application/json' } });
    const fetcher = vi.fn().mockResolvedValue(response);
    const result = await fetchOverview({ fetcher, env: {} });

    expect(fetcher).toHaveBeenCalledWith(simulatedUrl, { cache: 'no-cache' });
    expect(result.source).toBe('simulated');
    expect(result.electionStatus).toBe('inProgress');
    expect(result.totalizedPercentage).toBe(100);
    expect(result.lastTseUpdate).toBe('29/09/2026 16:28:52');
    expect(result.validVotes).toBe(100982116);
    expect(result.blankVotes).toBe(9118018);
    expect(result.nullVotes).toBe(9040537);
    expect(result.candidates[0]).toMatchObject({
      name: 'CANDIDATO 9999', votes: 10503573, percentage: 10503573 / 100982116 * 100,
      photoUrl: 'https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/fotos/br/41592406.jpeg',
    });
    expect(result.candidates).toHaveLength(13);
  });

  it('rejeita resposta de origem incompatível com o perfil configurado', async () => {
    const raw = { ...(await fixture()), f: 'o' };
    await expect(fetchOverview({ fetcher: vi.fn().mockResolvedValue(new Response(JSON.stringify(raw))), env: {} }))
      .rejects.toThrow('origem official incompatível');
  });

  it('rejeita EA20 cuja eleição não corresponde ao código da URL configurada', async () => {
    const raw = { ...(await fixture()), f: 'o' };
    const officialUrl = 'https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json';
    await expect(fetchOverview({
      fetcher: vi.fn().mockResolvedValue(Response.json(raw)),
      env: { NEXT_PUBLIC_TSE_EA20_PRESIDENT_URL: officialUrl },
    })).rejects.toThrow('eleição 21270 incompatível com URL 6257');
  });

  it('não esconde falhas HTTP nem payload sem cargo presidencial', async () => {
    await expect(fetchOverview({ fetcher: vi.fn().mockResolvedValue(new Response('', { status: 404 })), env: {} }))
      .rejects.toThrow('HTTP 404');
    const noPresident = { ...(await fixture()), carg: [] };
    await expect(fetchOverview({ fetcher: vi.fn().mockResolvedValue(Response.json(noPresident)), env: {} }))
      .rejects.toThrow('cargo Presidente ausente');
  });
});
