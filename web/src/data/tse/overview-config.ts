const simulatedEndpoint = 'https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/br/br-c0001-e021270-u.json';

export type PublicEnvironment = Record<string, string | undefined>;

export function getOverviewEndpoint(env: PublicEnvironment): string {
  return env.NEXT_PUBLIC_TSE_EA20_PRESIDENT_URL?.trim() || simulatedEndpoint;
}

export function getOverviewCandidatePhotoUrl(env: PublicEnvironment, candidateId: string): string {
  if (!/^\d+$/.test(candidateId)) throw new Error('sqcand deve conter somente dígitos');
  const endpoint = new URL(getOverviewEndpoint(env));
  const dataFolder = endpoint.pathname.lastIndexOf('/dados/');
  if (dataFolder < 0) throw new Error('URL EA20 sem diretório de dados');
  return `${endpoint.origin}${endpoint.pathname.slice(0, dataFolder)}/fotos/br/${candidateId}.jpeg`;
}

export function getExpectedOverviewSource(env: PublicEnvironment): 'simulated' | 'official' {
  if (env.NEXT_PUBLIC_TSE_EXPECTED_SOURCE === 'official' || env.NEXT_PUBLIC_TSE_EXPECTED_SOURCE === 'simulated') {
    return env.NEXT_PUBLIC_TSE_EXPECTED_SOURCE;
  }
  return new URL(getOverviewEndpoint(env)).hostname.includes('-sim.') ? 'simulated' : 'official';
}

export const OVERVIEW_POLL_INTERVAL_MS = 5_000;
