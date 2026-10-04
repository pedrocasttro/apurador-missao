export type SeatChamber = 'federal' | 'state' | 'senate';
export type SeatPerformance = {
  uf: string;
  source: 'simulated' | 'official';
  generatedAt: string | null;
  chambers: Record<SeatChamber, number>;
};
export type StateSeatPerformance = SeatPerformance | { uf: string; error: string };
export type NationalSeatPerformance = {
  source: 'simulated' | 'official';
  states: StateSeatPerformance[];
  totals: Record<SeatChamber, number | null>;
  receivedAt: Date;
};

const ufs = ['ac', 'al', 'ap', 'am', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mt', 'ms', 'mg', 'pa', 'pb', 'pr', 'pe', 'pi', 'rj', 'rn', 'rs', 'ro', 'rr', 'sc', 'sp', 'se', 'to'];
const cargos = { federal: '6', state: '7', senate: '5' } as const;

function resultUrl(endpoint: string, source: 'simulated' | 'official', uf: string, cargo: string): { url: string; election: string } {
  const parsed = new URL(endpoint);
  if (source === 'simulated') {
    const match = parsed.pathname.match(/^\/simulado\/([^/]+)\/([^/]+)\/\d+\/dados\/br\//);
    if (!match || parsed.hostname !== 'resultados-sim.tse.jus.br') throw new Error('URL presidencial não permite descobrir o perfil simulado');
    const election = '21272';
    return { url: `${parsed.origin}/simulado/${match[1]}/${match[2]}/${election}/dados/${uf}/${uf}-c000${cargo}-e${election.padStart(6, '0')}-u.json`, election };
  }
  const match = parsed.pathname.match(/^\/oficial\/([^/]+)\/\d+\/dados\/br\//);
  if (!match || parsed.hostname !== 'resultados.tse.jus.br') throw new Error('URL presidencial não permite descobrir o perfil oficial');
  const election = '6259';
  return { url: `${parsed.origin}/oficial/${match[1]}/${election}/dados/${uf}/${uf}-c000${cargo}-e${election.padStart(6, '0')}-u.json`, election };
}

export async function fetchNationalSeatPerformance({
  endpoint, expectedSource, fetcher = fetch,
}: { endpoint: string; expectedSource: 'simulated' | 'official'; fetcher?: (input: string | URL | Request, init?: RequestInit) => Promise<Response> }): Promise<NationalSeatPerformance> {
  const queue = ufs.flatMap((uf) => Object.entries(cargos).map(([chamber, defaultCargo]) => {
    const cargo = chamber === 'state' && uf === 'df' ? '8' : defaultCargo;
    return { uf, chamber, ...resultUrl(endpoint, expectedSource, uf, cargo) };
  }));
  const payloads = new Map<string, unknown>();
  const failures = new Map<string, string>();
  let cursor = 0;
  const worker = async () => {
    while (cursor < queue.length) {
      const item = queue[cursor++];
      try {
        const response = await fetcher(item.url, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        payloads.set(`${item.uf}:${item.chamber}`, await response.json());
      } catch (error) {
        failures.set(item.uf, error instanceof Error ? error.message : 'Falha de rede');
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  const states: StateSeatPerformance[] = ufs.map((uf) => {
    const federal = payloads.get(`${uf}:federal`);
    const state = payloads.get(`${uf}:state`);
    const senate = payloads.get(`${uf}:senate`);
    if (!federal || !state || !senate) return { uf: uf.toUpperCase(), error: failures.get(uf) ?? 'Arquivo EA20 indisponível' };
    try { return adaptSeatPerformance({ federal, state, senate }, expectedSource, uf); }
    catch (error) { return { uf: uf.toUpperCase(), error: error instanceof Error ? error.message : 'Payload EA20 inválido' }; }
  });
  const totals: Record<SeatChamber, number | null> = { federal: null, state: null, senate: null };
  for (const chamber of Object.keys(cargos) as SeatChamber[]) {
    if (states.every((item): item is SeatPerformance => 'chambers' in item)) totals[chamber] = states.reduce((sum, item) => sum + item.chambers[chamber], 0);
  }
  return { source: expectedSource, states, totals, receivedAt: new Date() };
}

type Raw = Record<string, unknown>;
function object(value: unknown): Raw {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Raw : {};
}
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function str(value: unknown): string { return typeof value === 'string' || typeof value === 'number' ? String(value) : ''; }
function count(value: unknown, field: string): number {
  const parsed = Number(str(value).replace(',', '.'));
  if (!Number.isInteger(parsed) || parsed < 0 || str(value).trim() === '') throw new Error(`EA20: campo inválido ${field}`);
  return parsed;
}
function timestamp(raw: Raw): string | null {
  return raw.dt && raw.ht ? `${str(raw.dt)} ${str(raw.ht)}` : null;
}
function validate(rawValue: unknown, expectedSource: 'simulated' | 'official', uf: string, cargo: string, election: string): Raw {
  const raw = object(rawValue);
  const source = raw.f === 's' ? 'simulated' : raw.f === 'o' ? 'official' : null;
  if (source !== expectedSource) throw new Error(`origem ${source ?? 'ausente'} incompatível com perfil ${expectedSource}`);
  if (raw.tpabr !== 'uf' || str(raw.cdabr).toLowerCase() !== uf.toLowerCase()) throw new Error(`EA20: abrangência incompatível com ${uf.toUpperCase()}`);
  if (str(raw.ele).replace(/^0+(?=\d)/, '') !== election) throw new Error(`EA20: eleição incompatível com ${election}`);
  if (raw.ele === '21272' && expectedSource !== 'simulated') throw new Error('EA20: eleição simulada incompatível com perfil oficial');
  if (raw.ele === '6259' && expectedSource !== 'official') throw new Error('EA20: eleição oficial incompatível com perfil simulado');
  const offices = list(raw.carg).map(object).filter((item) => str(item.cd).padStart(4, '0') === cargo.padStart(4, '0'));
  if (offices.length !== 1) throw new Error(`EA20: cargo ${cargo} ausente ou duplicado`);
  return offices[0];
}
function valid(candidate: Raw): boolean { return candidate.dvt === 'Válido'; }
function proportionalMissionSeats(office: Raw): number {
  let total = 0;
  for (const aggregateValue of list(office.agr)) {
    const aggregate = object(aggregateValue);
    const vacancies = count(aggregate.vag, 'agr.vag');
    const candidates = list(aggregate.par).flatMap((partyValue) => {
      const party = object(partyValue);
      return list(party.cand).map((candidateValue) => ({ candidate: object(candidateValue), party: str(party.sg).toUpperCase() }));
    }).filter(({ candidate }) => valid(candidate)).sort((a, b) => count(a.candidate.seq, 'cand.seq') - count(b.candidate.seq, 'cand.seq'));
    total += candidates.slice(0, vacancies).filter(({ party }) => party === 'MISSÃO').length;
  }
  return total;
}
function senateMissionSeats(office: Raw): number {
  const vacancies = count(office.nv, 'carg.nv');
  const candidates = list(office.agr).flatMap((aggregateValue) => list(object(aggregateValue).par).flatMap((partyValue) => {
    const party = object(partyValue);
    return list(party.cand).map((candidateValue) => ({ candidate: object(candidateValue), party: str(party.sg).toUpperCase() }));
  })).filter(({ candidate }) => valid(candidate)).sort((a, b) => count(a.candidate.seq, 'cand.seq') - count(b.candidate.seq, 'cand.seq'));
  return candidates.slice(0, vacancies).filter(({ party }) => party === 'MISSÃO').length;
}

export function adaptSeatPerformance(
  payloads: { federal: unknown; state: unknown; senate: unknown },
  expectedSource: 'simulated' | 'official',
  uf: string,
): SeatPerformance {
  const election = expectedSource === 'simulated' ? '21272' : '6259';
  const federal = validate(payloads.federal, expectedSource, uf, '6', election);
  const state = validate(payloads.state, expectedSource, uf, uf.toLowerCase() === 'df' ? '8' : '7', election);
  const senate = validate(payloads.senate, expectedSource, uf, '5', election);
  const generatedAt = [timestamp(federal), timestamp(state), timestamp(senate)].sort().at(-1) ?? null;
  return {
    uf: uf.toUpperCase(), source: expectedSource, generatedAt,
    chambers: {
      federal: proportionalMissionSeats(federal),
      state: proportionalMissionSeats(state),
      senate: senateMissionSeats(senate),
    },
  };
}
