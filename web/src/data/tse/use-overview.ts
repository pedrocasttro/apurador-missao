'use client';

import { useEffect, useState } from 'react';
import { fetchOverview, type OverviewData } from './overview-client';
import { OVERVIEW_POLL_INTERVAL_MS } from './overview-config';

export function useOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receivedAt, setReceivedAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let consecutiveFailures = 0;
    const poll = async () => {
      try {
        const next = await fetchOverview();
        if (active) {
          consecutiveFailures = 0;
          setData(next);
          setError(null);
          setReceivedAt(new Date());
        }
      } catch (cause) {
        consecutiveFailures += 1;
        if (active) setError(cause instanceof Error ? cause.message : 'Falha ao consultar dados do TSE.');
      }
      const delay = consecutiveFailures === 0
        ? OVERVIEW_POLL_INTERVAL_MS
        : Math.min(OVERVIEW_POLL_INTERVAL_MS * (2 ** consecutiveFailures), 60_000);
      if (active) timer = setTimeout(poll, delay);
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, []);

  return { data, error, receivedAt };
}
