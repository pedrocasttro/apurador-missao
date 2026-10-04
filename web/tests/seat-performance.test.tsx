import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { adaptSeatPerformance, fetchNationalSeatPerformance } from '../src/data/tse/seat-performance-client';

async function fixture(name: string) {
  return JSON.parse(await readFile(resolve(process.cwd(), `tests/fixtures/tse/${name}`), 'utf8'));
}

describe('EA20 — desempenho de cadeiras do Missão na parcial', () => {
  it('calcula as vagas federais e estaduais por agr.vag e cand.seq, contando filiação dentro de federação', async () => {
    const federal = await fixture('ea20-deputado-federal-pr-sim-2026.json');
    const state = await fixture('ea20-deputado-estadual-pr-sim-2026.json');
    const federation = federal.carg[0].agr.find((item: { tp: string }) => item.tp === 'f');
    const party = federation.par[0];
    party.sg = 'MISSÃO';
    party.cand[0].seq = '1';
    party.cand[0].dvt = 'Válido';
    party.cand[1].seq = '2';
    party.cand[1].dvt = 'Válido';
    party.cand[2].seq = '3';
    party.cand[2].dvt = 'Anulado';
    const stateAggregate = state.carg[0].agr.find((item: { vag: string }) => Number(item.vag) > 0);
    const stateParty = stateAggregate.par[0];
    stateParty.sg = 'MISSÃO';
    stateParty.cand[0].seq = '1';
    stateParty.cand[0].dvt = 'Válido';

    const result = adaptSeatPerformance({ federal, state, senate: await fixture('ea20-senado-pr-sim-2026.json') }, 'simulated', 'pr');

    expect(result.uf).toBe('PR');
    expect(result.chambers.federal).toBe(2);
    expect(result.chambers.state).toBe(3);
  });

  it('usa carg.nv para as vagas do Senado na parcial', async () => {
    const senate = await fixture('ea20-senado-pr-sim-2026.json');
    const candidates = senate.carg[0].agr.flatMap((aggregate: { par: Array<{ cand: unknown[] }> }) => aggregate.par.flatMap((item) => item.cand));
    for (const [index, candidate] of candidates.entries()) {
      Object.assign(candidate, { seq: String(index + 1), dvt: 'Válido' });
    }
    senate.carg[0].nv = '2';
    const result = adaptSeatPerformance({ federal: await fixture('ea20-deputado-federal-pr-sim-2026.json'), state: await fixture('ea20-deputado-estadual-pr-sim-2026.json'), senate }, 'simulated', 'pr');
    expect(result.chambers.senate).toBe(0);
    senate.carg[0].agr[0].par[0].sg = 'MISSÃO';
    expect(adaptSeatPerformance({ federal: await fixture('ea20-deputado-federal-pr-sim-2026.json'), state: await fixture('ea20-deputado-estadual-pr-sim-2026.json'), senate }, 'simulated', 'pr').chambers.senate).toBe(2);
  });

  it('conta Deputado Distrital (cargo 0008) do DF dentro das Assembleias Legislativas', async () => {
    const federal = await fixture('ea20-deputado-federal-pr-sim-2026.json');
    const state = await fixture('ea20-deputado-estadual-pr-sim-2026.json');
    const senate = await fixture('ea20-senado-pr-sim-2026.json');
    federal.cdabr = state.cdabr = senate.cdabr = 'df';
    state.carg[0].cd = '8';
    const aggregate = state.carg[0].agr.find((item: { vag: string }) => Number(item.vag) > 0);
    aggregate.par[0].sg = 'MISSÃO';
    aggregate.par[0].cand[0].seq = '1';
    aggregate.par[0].cand[0].dvt = 'Válido';
    aggregate.vag = '1';

    const result = adaptSeatPerformance({ federal, state, senate }, 'simulated', 'df');

    expect(result.uf).toBe('DF');
    expect(result.chambers.state).toBe(1);
    aggregate.par[0].sg = 'OUTRO';
    expect(adaptSeatPerformance({ federal, state, senate }, 'simulated', 'df').chambers.state).toBe(0);
  });

  it('rejeita mistura de origem, UF ou eleição', async () => {
    const raw = await fixture('ea20-deputado-federal-pr-sim-2026.json');
    const other = await fixture('ea20-deputado-estadual-pr-sim-2026.json');
    const senate = await fixture('ea20-senado-pr-sim-2026.json');
    await expect(() => adaptSeatPerformance({ federal: raw, state: other, senate }, 'official', 'pr')).toThrow('origem simulated incompatível');
    await expect(() => adaptSeatPerformance({ federal: { ...raw, cdabr: 'sp' }, state: other, senate }, 'simulated', 'pr')).toThrow('abrangência incompatível');
    await expect(() => adaptSeatPerformance({ federal: { ...raw, ele: '99999' }, state: other, senate }, 'simulated', 'pr')).toThrow('eleição incompatível');
  });

  it('consulta os 27 estados com concorrência limitada e não transforma UF indisponível em zero', async () => {
    const federal = await fixture('ea20-deputado-federal-pr-sim-2026.json');
    const state = await fixture('ea20-deputado-estadual-pr-sim-2026.json');
    const senate = await fixture('ea20-senado-pr-sim-2026.json');
    const sourceByCargo: Record<string, Record<string, unknown>> = { '6': federal, '7': state, '5': senate };
    const requests: string[] = [];
    let active = 0;
    let peak = 0;
    const fetcher = async (input: string | URL | Request) => {
      const url = String(input);
      requests.push(url);
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
      const match = url.match(/\/([a-z]{2})-c000([5678])-e021272-u\.json$/)!;
      const cargoFixture = match[2] === '8' ? sourceByCargo['7'] : sourceByCargo[match[2]];
      const body = structuredClone(cargoFixture);
      if (match[2] === '8') (body.carg as Array<{ cd: string }>)[0].cd = '8';
      body.cdabr = match[1];
      if (match[1] === 'pr' && match[2] === '6') {
        const firstAggregate = (body.carg as Array<{ agr: Array<{ vag: string; par: Array<{ sg: string; cand: Array<Record<string, unknown>> }> }> }>)[0].agr.find((item) => Number(item.vag) > 0)!;
        firstAggregate.par[0].sg = 'MISSÃO';
        firstAggregate.par[0].cand[0].seq = '1';
        firstAggregate.par[0].cand[0].dvt = 'Válido';
        firstAggregate.vag = '1';
      }
      if (match[1] === 'pr' && match[2] === '5') {
        const firstParty = (body.carg as Array<{ agr: Array<{ par: Array<{ sg: string; cand: Array<Record<string, unknown>> }> }> }>)[0].agr[0].par[0];
        firstParty.sg = 'MISSÃO';
        firstParty.cand[0].seq = '1';
        firstParty.cand[0].dvt = 'Válido';
        (body.carg as Array<{ nv: string }>)[0].nv = '1';
      }
      if (match[1] === 'sp' && match[2] === '7') return new Response('', { status: 404 });
      return Response.json(body);
    };
    const result = await fetchNationalSeatPerformance({ endpoint: 'https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/br/br-c0001-e021270-u.json', expectedSource: 'simulated', fetcher });
    expect(requests).toHaveLength(81);
    expect(new Set(requests).size).toBe(81);
    expect(peak).toBeLessThanOrEqual(8);
    expect(requests).toContain('https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21272/dados/df/df-c0008-e021272-u.json');
    expect(result.states.find((item) => item.uf === 'PR')).toMatchObject({ chambers: { federal: 1, senate: 1 } });
    expect(result.states.find((item) => item.uf === 'SP')).toMatchObject({ uf: 'SP', error: 'HTTP 404' });
    expect(result.totals.federal).toBeNull();
  });
});
