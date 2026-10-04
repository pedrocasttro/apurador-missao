import { getExpectedOverviewSource, getOverviewCandidatePhotoUrl, getOverviewEndpoint, type PublicEnvironment } from './overview-config';

export type ResultSource = 'simulated' | 'official';
export type Metric = 'validVotesPercentage' | 'totalVotes';
export type CandidateOption = {
  id: string;
  name: string;
  ballotNumber: string;
  party: string | null;
  photoUrl: string;
};
export type GeographyOption = { code: string; label: string; ibgeCode?: string };
export type ElectionSetup = {
  source: ResultSource;
  electionCode: string;
  electionCodeFile: string;
  pleitoCode: string;
  dataDirectory: string;
  municipalityConfigurationUrl: string;
  countryResult: CandidateResult;
  states: GeographyOption[];
  municipalitiesByState: Record<string, GeographyOption[]>;
  candidates: CandidateOption[];
};
export type CandidateResult = {
  source: ResultSource;
  scope: 'country' | 'state' | 'municipality';
  geographyCode: string;
  geographyName: string;
  generatedAt: string | null;
  totalizedPercentage: number | null;
  totalValidVotes: number;
  candidates: Array<Pick<CandidateOption, 'id' | 'name' | 'ballotNumber' | 'party'> & { votes: number }>;
};
export type ResultGeography =
  | { type: 'country' }
  | { type: 'state'; stateCode: string }
  | { type: 'municipality'; stateCode: string; municipalityCode: string };

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type Raw = Record<string, unknown>;

function object(value: unknown): Raw {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Raw : {};
}

function string(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function number(value: unknown, field: string): number {
  const normalized = string(value).trim().replace(',', '.');
  const result = Number(normalized);
  if (!normalized || !Number.isFinite(result)) throw new Error(`campo TSE inválido: ${field}`);
  return result;
}

function numericCode(value: unknown, length = 4): string {
  return string(value).replace(/^0+(?=\d)/, '').padStart(length, '0');
}

function assertSource(payload: Raw, expected: ResultSource, file: string): void {
  const actual = payload.f === 's' ? 'simulated' : payload.f === 'o' ? 'official' : null;
  if (!actual) throw new Error(`${file}: campo f deve ser 's' ou 'o'`);
  if (actual !== expected) throw new Error(`${file}: origem ${actual} incompatível com perfil ${expected}`);
}

function publicBaseFromEndpoint(endpoint: string, source: ResultSource) {
  const url = new URL(endpoint);
  const match = url.pathname.match(/^\/(simulado|oficial)\/([^/]+)\/([^/]+)\/(\d+)\/dados\/br\/br-c0001-e(\d+)-u\.json$/);
  if (!match) throw new Error('URL TSE precisa apontar para EA20 presidencial do Brasil');
  const environment = match[1];
  const deployment = match[2];
  const isSimulatedHost = url.hostname === 'resultados-sim.tse.jus.br';
  if ((source === 'simulated') !== isSimulatedHost || (environment === 'simulado') !== isSimulatedHost) {
    throw new Error('URL TSE incompatível com o perfil configurado');
  }
  if (source === 'official' && url.hostname !== 'resultados.tse.jus.br') {
    throw new Error('perfil oficial precisa usar a CDN oficial do TSE');
  }
  const root = `${url.origin}/${environment}/${deployment}`;
  return { origin: url.origin, environment, deployment, root, cycle: match[3], electionCode: match[4], endpointElectionCode: match[5] };
}

function electionFromConfiguration(payload: unknown) {
  const root = object(payload);
  const contests = Array.isArray(root.pl) ? root.pl : [];
  for (const contestValue of contests) {
    const contest = object(contestValue);
    const elections = Array.isArray(contest.e) ? contest.e : [];
    const election = elections.map(object).find((candidate) => {
      const offices = (Array.isArray(candidate.abr) ? candidate.abr : []).flatMap((area) => {
        const rawArea = object(area);
        return Array.isArray(rawArea.cp) ? rawArea.cp.map(object) : [];
      });
      return candidate.t === '1' && offices.some((office) => numericCode(office.cd) === '0001');
    });
    if (election) return { contest, election };
  }
  throw new Error('EA11: eleição de primeiro turno para Presidente não encontrada');
}

export function adaptElectionSetup(
  electionPayload: unknown,
  municipalityPayload: unknown,
  countryResultPayload: unknown,
  endpoint: string,
  expectedSource: ResultSource,
): ElectionSetup {
  const electionRoot = object(electionPayload);
  assertSource(electionRoot, expectedSource, 'EA11');
  const { contest, election } = electionFromConfiguration(electionPayload);
  const electionCode = string(election.cd);
  if (!/^\d+$/.test(electionCode)) throw new Error('EA11: código da eleição inválido');
  const directories = (Array.isArray(electionRoot.arq) ? electionRoot.arq : []).map(object);
  const resultTemplate = directories.find((file) => file.tp === 'u')?.dir;
  const municipalityTemplate = directories.find((file) => file.tp === 'cm')?.dir;
  if (typeof resultTemplate !== 'string' || typeof municipalityTemplate !== 'string') {
    throw new Error('EA11: diretórios EA20 ou EA12 ausentes');
  }
  const base = publicBaseFromEndpoint(endpoint, expectedSource);
  if (base.endpointElectionCode.replace(/^0+(?=\d)/, '') !== electionCode.replace(/^0+(?=\d)/, '')) {
    throw new Error('EA20 configurado não corresponde à eleição descoberta em EA11');
  }
  const cycle = string(contest.c);
  const dataDirectory = `${base.root}/${cycle}/${electionCode}/dados`;
  const municipalityDirectory = `${base.root}/${cycle}/${electionCode}/config`;
  const municipalityConfigurationUrl = `${municipalityDirectory}/mun-e${electionCode.padStart(6, '0')}-cm.json`;

  const municipalityRoot = object(municipalityPayload);
  assertSource(municipalityRoot, expectedSource, 'EA12');
  const municipalityAreas = Array.isArray(municipalityRoot.abr) ? municipalityRoot.abr.map(object) : [];
  const states: GeographyOption[] = [];
  const municipalitiesByState: Record<string, GeographyOption[]> = {};
  for (const area of municipalityAreas) {
    const code = string(area.cd).toLowerCase();
    if (!/^[a-z]{2}$/.test(code) || code === 'zz') continue;
    const label = string(area.ds);
    if (!label) throw new Error(`EA12: UF sem descrição (${code})`);
    states.push({ code, label });
    const towns = Array.isArray(area.mu) ? area.mu.map(object) : [];
    municipalitiesByState[code] = towns.map((town) => {
      const townCode = string(town.cd).padStart(5, '0');
      const townName = string(town.nm);
      const ibgeCode = string(town.cdi);
      if (!/^\d{5}$/.test(townCode) || !/^\d{7}$/.test(ibgeCode) || !townName) throw new Error(`EA12: município inválido na UF ${code}`);
      return { code: townCode, label: townName, ibgeCode };
    }).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }
  if (!states.length || Object.values(municipalitiesByState).some((towns) => towns.length === 0)) {
    throw new Error('EA12: catálogo de municípios vazio ou inválido');
  }

  const result = adaptPresidentResult(countryResultPayload, expectedSource, { type: 'country' });
  const candidates = result.candidates
    .map(({ id, name, ballotNumber, party }) => ({
      id, name, ballotNumber, party,
      photoUrl: getOverviewCandidatePhotoUrl({ NEXT_PUBLIC_TSE_EA20_PRESIDENT_URL: endpoint }, id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return {
    source: expectedSource,
    electionCode,
    electionCodeFile: electionCode.padStart(6, '0'),
    pleitoCode: string(contest.cd),
    dataDirectory,
    municipalityConfigurationUrl,
    countryResult: result,
    states: states.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    municipalitiesByState,
    candidates,
  };
}

function areaLabel(payload: Raw, geography: ResultGeography): { scope: CandidateResult['scope']; code: string; name: string } {
  if (geography.type === 'country') return { scope: 'country', code: 'br', name: 'BRASIL' };
  const code = geography.type === 'state' ? geography.stateCode.toLowerCase() : geography.municipalityCode;
  return {
    scope: geography.type === 'state' ? 'state' : 'municipality',
    code,
    name: geography.type === 'state' ? geography.stateCode.toUpperCase() : string(payload.cdabr),
  };
}

export function adaptPresidentResult(payload: unknown, expectedSource: ResultSource, geography: ResultGeography): CandidateResult {
  const root = object(payload);
  assertSource(root, expectedSource, 'EA20');
  const expectedArea = geography.type === 'country' ? 'br' : geography.type === 'state' ? geography.stateCode.toLowerCase() : geography.municipalityCode;
  const expectedType = geography.type === 'country' ? 'br' : geography.type === 'state' ? 'uf' : 'mu';
  if (root.tpabr !== expectedType || string(root.cdabr).toLowerCase() !== expectedArea) {
    throw new Error(`EA20: abrangência incompatível com ${expectedArea}`);
  }
  const elections = Array.isArray(root.carg) ? root.carg.map(object).filter((office) => numericCode(office.cd) === '0001') : [];
  if (elections.length !== 1) throw new Error('EA20: cargo Presidente ausente ou duplicado');
  const candidates: CandidateResult['candidates'] = [];
  for (const aggregate of Array.isArray(elections[0].agr) ? elections[0].agr : []) {
    const aggregateObject = object(aggregate);
    for (const partyValue of Array.isArray(aggregateObject.par) ? aggregateObject.par : []) {
      const party = object(partyValue);
      for (const candidateValue of Array.isArray(party.cand) ? party.cand : []) {
        const candidate = object(candidateValue);
        const id = string(candidate.sqcand);
        const name = string(candidate.nmu) || string(candidate.nm);
        if (!id || !name) throw new Error('EA20: candidato sem sqcand ou nome');
        candidates.push({
          id,
          name,
          ballotNumber: string(candidate.n),
          party: string(party.sg) || null,
          votes: number(candidate.vap, 'cand.vap'),
        });
      }
    }
  }
  const stats = object(root.v);
  const validVotes = number(stats.vv, 'v.vv');
  const totals = object(root.s);
  const totalizedPercentage = totals.pstn === undefined && totals.pst === undefined
    ? null : number(totals.pstn ?? totals.pst, 's.pstn');
  const area = areaLabel(root, geography);
  return {
    source: expectedSource,
    scope: area.scope,
    geographyCode: area.code,
    geographyName: area.name,
    generatedAt: typeof root.dg === 'string' && typeof root.hg === 'string' ? `${root.dg} ${root.hg}` : null,
    totalizedPercentage,
    totalValidVotes: validVotes,
    candidates,
  };
}

export async function fetchJson(url: string, fetcher: Fetcher, signal?: AbortSignal): Promise<unknown> {
  const response = await fetcher(url, { cache: 'no-cache', signal });
  if (!response.ok) throw new Error(`TSE respondeu HTTP ${response.status}`);
  return response.json();
}

export async function fetchPresidentSetup({
  fetcher = fetch,
  env = {
    NEXT_PUBLIC_TSE_EA20_PRESIDENT_URL: process.env.NEXT_PUBLIC_TSE_EA20_PRESIDENT_URL,
    NEXT_PUBLIC_TSE_EXPECTED_SOURCE: process.env.NEXT_PUBLIC_TSE_EXPECTED_SOURCE,
  },
  signal,
}: { fetcher?: Fetcher; env?: PublicEnvironment; signal?: AbortSignal } = {}): Promise<ElectionSetup> {
  const endpoint = getOverviewEndpoint(env);
  const expectedSource = getExpectedOverviewSource(env);
  const base = publicBaseFromEndpoint(endpoint, expectedSource);
  const electionConfig = await fetchJson(`${base.root}/comum/config/ele-c.json`, fetcher, signal);
  const rawConfig = object(electionConfig);
  assertSource(rawConfig, expectedSource, 'EA11');
  const { contest, election } = electionFromConfiguration(electionConfig);
  const directories = (Array.isArray(rawConfig.arq) ? rawConfig.arq : []).map(object);
  const municipalityTemplate = directories.find((file) => file.tp === 'cm')?.dir;
  if (typeof municipalityTemplate !== 'string') throw new Error('EA11: diretório EA12 ausente');
  const electionCode = string(election.cd);
  if (base.endpointElectionCode.replace(/^0+(?=\d)/, '') !== electionCode.replace(/^0+(?=\d)/, '')) {
    throw new Error('EA20 configurado não corresponde à eleição descoberta em EA11');
  }
  const cycle = string(contest.c);
  const municipalityDirectory = `${base.root}/${cycle}/${electionCode}/config`;
  const municipalityConfigurationUrl = `${municipalityDirectory}/mun-e${string(election.cd).padStart(6, '0')}-cm.json`;
  const [municipalityPayload] = await Promise.all([
    fetchJson(municipalityConfigurationUrl, fetcher, signal),
  ]);
  const resultTemplate = directories.find((file) => file.tp === 'u')?.dir;
  if (typeof resultTemplate !== 'string') throw new Error('EA11: diretório EA20 ausente');
  const dataDirectory = `${base.root}/${cycle}/${electionCode}/dados`;
  const countryResultUrl = `${dataDirectory}/br/br-c0001-e${electionCode.padStart(6, '0')}-u.json`;
  const countryResultPayload = await fetchJson(countryResultUrl, fetcher, signal);
  if (string(object(countryResultPayload).ele).replace(/^0+(?=\d)/, '') !== electionCode.replace(/^0+(?=\d)/, '')) {
    throw new Error('EA20: código da eleição incompatível com EA11');
  }
  return adaptElectionSetup(electionConfig, municipalityPayload, countryResultPayload, endpoint, expectedSource);
}

export async function fetchPresidentScope(
  setup: ElectionSetup,
  geography: ResultGeography,
  fetcher: Fetcher = fetch,
  signal?: AbortSignal,
): Promise<CandidateResult> {
  const prefix = geography.type === 'country' ? 'br' : geography.stateCode.toLowerCase();
  const areaId = geography.type === 'country' ? 'br' : geography.type === 'state' ? prefix : `${prefix}${geography.municipalityCode}`;
  const url = `${setup.dataDirectory}/${prefix}/${areaId}-c0001-e${setup.electionCodeFile}-u.json`;
  const payload = await fetchJson(url, fetcher, signal);
  if (string(object(payload).ele).replace(/^0+(?=\d)/, '') !== setup.electionCode.replace(/^0+(?=\d)/, '')) {
    throw new Error('EA20: código da eleição incompatível com EA11');
  }
  return adaptPresidentResult(payload, setup.source, geography);
}

export type ChildVote = { code: string; label: string; votes: number; totalValidVotes: number };

export async function fetchPresidentChildVotes(
  setup: ElectionSetup,
  candidateId: string,
  stateCode: string | null,
  fetcher: Fetcher = fetch,
  signal?: AbortSignal,
): Promise<{ votes: ChildVote[]; failedCount: number }> {
  const children = stateCode
    ? setup.municipalitiesByState[stateCode.toLowerCase()] ?? []
    : setup.states;
  const results: ChildVote[] = [];
  let nextIndex = 0;
  let failedCount = 0;
  const readNext = async () => {
    while (nextIndex < children.length) {
      if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
      const child = children[nextIndex];
      nextIndex += 1;
      const geography: ResultGeography = stateCode
        ? { type: 'municipality', stateCode, municipalityCode: child.code }
        : { type: 'state', stateCode: child.code };
      try {
        const result = await fetchPresidentScope(setup, geography, fetcher, signal);
        const candidate = result.candidates.find((item) => item.id === candidateId);
        results.push({
          code: stateCode ? child.ibgeCode ?? child.code : child.code.toUpperCase(),
          label: child.label,
          votes: candidate?.votes ?? 0,
          totalValidVotes: result.totalValidVotes,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        failedCount += 1;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(2, children.length) }, () => readNext()));
  return { votes: results, failedCount };
}

export function percentageOfValidVotes(votes: number, validVotes: number): number | null {
  if (validVotes <= 0) return null;
  return votes / validVotes * 100;
}
