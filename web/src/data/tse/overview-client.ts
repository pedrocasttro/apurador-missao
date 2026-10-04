import { getExpectedOverviewSource, getOverviewCandidatePhotoUrl, getOverviewEndpoint, type PublicEnvironment } from './overview-config';

export type OverviewCandidate = {
  candidateId: string;
  ballotNumber: string;
  name: string;
  party: string | null;
  votes: number;
  percentage: number;
  photoUrl?: string;
};

export type OverviewData = {
  source: 'simulated' | 'official';
  electionStatus: 'inProgress' | 'totalized';
  totalizedPercentage: number;
  lastTseUpdate: string | null;
  validVotes: number;
  blankVotes: number;
  nullVotes: number;
  candidates: OverviewCandidate[];
};

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type RawObject = Record<string, unknown>;

function object(value: unknown): RawObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RawObject : {};
}

function numeric(value: unknown, field: string): number {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(parsed) || String(value ?? '').trim() === '') throw new Error(`campo EA20 inválido: ${field}`);
  return parsed;
}

function formatTimestamp(date: unknown, time: unknown): string | null {
  return [date, time].every((part) => typeof part === 'string' && part.length > 0)
    ? `${date} ${time}` : null;
}

export function adaptOverview(payload: unknown, expectedSource: 'simulated' | 'official'): OverviewData {
  const raw = object(payload);
  const flag = raw.f;
  if (flag !== 's' && flag !== 'o') throw new Error("EA20: campo f deve ser 's' ou 'o'");
  const source = flag === 's' ? 'simulated' : 'official';
  if (source !== expectedSource) throw new Error(`origem ${source} incompatível com perfil ${expectedSource}`);
  if (raw.tpabr !== 'br' || raw.cdabr !== 'br') throw new Error('EA20 presidencial precisa ter abrangência Brasil');

  const stats = object(raw.v);
  const validVotes = numeric(stats.vv, 'v.vv');
  const offices = (Array.isArray(raw.carg) ? raw.carg : []).map(object).filter((office) => String(office.cd ?? '').padStart(4, '0') === '0001');
  if (offices.length !== 1) throw new Error('EA20: cargo Presidente ausente ou duplicado');
  const office = offices[0];
  const candidates: OverviewCandidate[] = [];
  for (const aggregate of Array.isArray(office.agr) ? office.agr : []) {
    for (const party of Array.isArray(object(aggregate).par) ? object(aggregate).par as unknown[] : []) {
      for (const candidate of Array.isArray(object(party).cand) ? object(party).cand as unknown[] : []) {
        const value = object(candidate);
        const votes = numeric(value.vap, 'cand.vap');
        candidates.push({
          candidateId: String(value.sqcand ?? ''), ballotNumber: String(value.n ?? ''),
          name: String(value.nmu || value.nm || ''), party: String(object(party).sg ?? '') || null,
          votes, percentage: validVotes > 0 ? votes / validVotes * 100 : 0,
        });
      }
    }
  }
  if (candidates.some((candidate) => !candidate.candidateId || !candidate.name)) throw new Error('EA20: candidato sem identificador ou nome');
  candidates.sort((a, b) => b.votes - a.votes);

  const totalization = object(raw.s);
  return {
    source,
    electionStatus: raw.tf === 'f' ? 'totalized' : 'inProgress',
    totalizedPercentage: numeric(totalization.pstn ?? totalization.pst, 's.pstn'),
    lastTseUpdate: formatTimestamp(raw.dt, raw.ht),
    validVotes, blankVotes: numeric(stats.vb, 'v.vb'), nullVotes: numeric(stats.vn, 'v.vn'),
    candidates,
  };
}

export async function fetchOverview({
  fetcher = fetch,
  env = {
    NEXT_PUBLIC_TSE_EA20_PRESIDENT_URL: process.env.NEXT_PUBLIC_TSE_EA20_PRESIDENT_URL,
    NEXT_PUBLIC_TSE_EXPECTED_SOURCE: process.env.NEXT_PUBLIC_TSE_EXPECTED_SOURCE,
  },
}: { fetcher?: Fetcher; env?: PublicEnvironment } = {}): Promise<OverviewData> {
  const endpoint = getOverviewEndpoint(env);
  const match = new URL(endpoint).pathname.match(/-e0*(\d+)-u\.json$/);
  if (!match) throw new Error('URL EA20 sem código de eleição no nome do arquivo');
  const expectedElectionId = match[1];
  const response = await fetcher(endpoint, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`TSE respondeu HTTP ${response.status}`);
  const payload: unknown = await response.json();
  const electionId = String(object(payload).ele ?? '').replace(/^0+(?=\d)/, '');
  if (electionId !== expectedElectionId) throw new Error(`eleição ${electionId || 'ausente'} incompatível com URL ${expectedElectionId}`);
  const overview = adaptOverview(payload, getExpectedOverviewSource(env));
  return {
    ...overview,
    candidates: overview.candidates.map((candidate) => ({
      ...candidate,
      photoUrl: getOverviewCandidatePhotoUrl(env, candidate.candidateId),
    })),
  };
}
