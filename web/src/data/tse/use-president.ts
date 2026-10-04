'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchPresidentChildVotes, fetchPresidentScope, fetchPresidentSetup, type CandidateResult, type ChildVote, type ElectionSetup, type ResultGeography } from './president-client';

export type PresidentScopeSelection = {
  type: 'country' | 'state';
  stateCode: string;
  municipalityCode: string;
};

export function usePresidentData(selection: PresidentScopeSelection) {
  const [setup, setSetup] = useState<ElectionSetup | null>(null);
  const [result, setResult] = useState<CandidateResult | null>(null);
  const [resultGeographyKey, setResultGeographyKey] = useState('country');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [receivedAt, setReceivedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const currentGeography = useMemo<ResultGeography | null>(() => {
    if (selection.type === 'country') return { type: 'country' };
    if (!selection.stateCode) return null;
    return selection.municipalityCode
      ? { type: 'municipality', stateCode: selection.stateCode, municipalityCode: selection.municipalityCode }
      : { type: 'state', stateCode: selection.stateCode };
  }, [selection.type, selection.stateCode, selection.municipalityCode]);
  const geographyKey = currentGeography?.type === 'country'
    ? 'country'
    : currentGeography?.type === 'state'
      ? `state:${currentGeography.stateCode}`
      : currentGeography?.type === 'municipality'
        ? `municipality:${currentGeography.stateCode}:${currentGeography.municipalityCode}`
        : 'unset';
  const lastGeography = useRef('country');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void fetchPresidentSetup({ signal: controller.signal }).then((next) => {
      if (!active) return;
      setSetup(next);
      setResult(next.countryResult);
      setResultGeographyKey('country');
      setReceivedAt(new Date());
      setSetupError(null);
      setLoading(false);
    }).catch((cause: unknown) => {
      if (!active || (cause instanceof Error && cause.name === 'AbortError')) return;
      setSetupError(cause instanceof Error ? cause.message : 'Falha ao consultar a configuração eleitoral do TSE.');
      setLoading(false);
    });
    return () => { active = false; controller.abort(); };
  }, []);

  useEffect(() => {
    if (!setup) return undefined;
    if (!currentGeography) {
      lastGeography.current = geographyKey;
      return undefined;
    }

    const shouldLoadNow = geographyKey !== lastGeography.current;
    lastGeography.current = geographyKey;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;
    let failures = 0;
    const poll = async () => {
      controller = new AbortController();
      try {
        const next = await fetchPresidentScope(setup, currentGeography, fetch, controller.signal);
        if (active) {
          failures = 0;
          setResult(next);
          setResultGeographyKey(geographyKey);
          setResultError(null);
          setReceivedAt(new Date());
        }
      } catch (cause) {
        if (cause instanceof Error && cause.name === 'AbortError') return;
        failures += 1;
        if (active) setResultError(cause instanceof Error ? cause.message : 'Falha ao consultar os resultados do TSE.');
      }
      if (active) timer = setTimeout(poll, failures === 0 ? 5_000 : Math.min(5_000 * (2 ** failures), 60_000));
    };

    if (shouldLoadNow) void poll();
    else timer = setTimeout(poll, 5_000);
    return () => {
      active = false;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [setup, currentGeography, geographyKey]);

  return { setup, result: resultGeographyKey === geographyKey ? result : null, error: setupError ?? resultError, receivedAt, loading };
}

export function usePresidentMapData(setup: ElectionSetup | null, candidateId: string, stateCode: string) {
  const [mapData, setMapData] = useState<{ key: string; votes: ChildVote[]; failedCount: number } | null>(null);
  const scopeKey = stateCode ? `state:${stateCode}` : 'country';
  const key = candidateId ? `${scopeKey}:${candidateId}` : 'disabled';

  useEffect(() => {
    if (!setup || !candidateId) return undefined;
    const controller = new AbortController();
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const data = await fetchPresidentChildVotes(setup, candidateId, stateCode || null, fetch, controller.signal);
        if (active) setMapData({ key, ...data });
      } catch (error) {
        if (active && !(error instanceof Error && error.name === 'AbortError')) {
          setMapData({ key, votes: [], failedCount: (stateCode ? setup.municipalitiesByState[stateCode]?.length : setup.states.length) ?? 0 });
        }
      }
      if (active) timer = setTimeout(refresh, 60_000);
    };
    void refresh();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [setup, candidateId, stateCode, key]);

  return {
    votes: mapData?.key === key ? mapData.votes : [],
    failedCount: mapData?.key === key ? mapData.failedCount : 0,
    loading: Boolean(candidateId && setup && mapData?.key !== key),
  };
}
