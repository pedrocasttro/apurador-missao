'use client';

import { useEffect, useState } from 'react';
import { getExpectedOverviewSource, getOverviewEndpoint } from './overview-config';
import { fetchNationalSeatPerformance, type NationalSeatPerformance } from './seat-performance-client';
import { OVERVIEW_POLL_INTERVAL_MS } from './overview-config';

export function useSeatPerformance() {
  const [data, setData] = useState<NationalSeatPerformance | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    const poll = async () => {
      try {
        const next = await fetchNationalSeatPerformance({ endpoint: getOverviewEndpoint({
          NEXT_PUBLIC_TSE_EA20_PRESIDENT_URL: process.env.NEXT_PUBLIC_TSE_EA20_PRESIDENT_URL,
        }), expectedSource: getExpectedOverviewSource({
          NEXT_PUBLIC_TSE_EA20_PRESIDENT_URL: process.env.NEXT_PUBLIC_TSE_EA20_PRESIDENT_URL,
          NEXT_PUBLIC_TSE_EXPECTED_SOURCE: process.env.NEXT_PUBLIC_TSE_EXPECTED_SOURCE,
        }) });
        if (active) { failures = 0; setData(next); setError(null); }
      } catch (cause) {
        failures += 1;
        if (active) setError(cause instanceof Error ? cause.message : 'Falha ao consultar cadeiras no TSE.');
      }
      if (active) timer = setTimeout(poll, failures ? Math.min(OVERVIEW_POLL_INTERVAL_MS * (2 ** failures), 60_000) : OVERVIEW_POLL_INTERVAL_MS);
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, []);
  return { data, error };
}
