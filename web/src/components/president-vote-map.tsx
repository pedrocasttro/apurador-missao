'use client';

import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ChildVote } from '../data/tse/president-client';

type MapFeature = { id: string; label: string; d: string };
type MapAsset = { width: number; height: number; source: string; features: MapFeature[] };

const integerFormat = new Intl.NumberFormat('pt-BR');
const percentFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

function fillForIntensity(intensity: number | null) {
  if (intensity === null) return 'var(--map-no-data, #E6E7E3)';
  const start = [255, 248, 202];
  const end = [224, 164, 0];
  const mix = start.map((channel, index) => Math.round(channel + ((end[index] ?? channel) - channel) * intensity));
  return `rgb(${mix[0]} ${mix[1]} ${mix[2]})`;
}

export function PresidentVoteMap({
  title,
  mapUrl,
  votes,
  loadingVotes,
  failedCount,
  selectedCode,
  onSelect,
}: {
  title: string;
  mapUrl: string;
  votes: ChildVote[];
  loadingVotes: boolean;
  failedCount: number;
  selectedCode?: string;
  onSelect: (code: string) => void;
}) {
  const [loadedMap, setLoadedMap] = useState<{ url: string; asset: MapAsset } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(mapUrl, { cache: 'force-cache', signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const asset = await response.json() as MapAsset;
      if (!Array.isArray(asset.features) || asset.features.some((feature) => !feature.id || !feature.d)) {
        throw new Error('malha geográfica inválida');
      }
      setLoadedMap({ url: mapUrl, asset });
      setLoadError(null);
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setLoadError(error instanceof Error ? error.message : 'não foi possível carregar a malha geográfica');
    });
    return () => controller.abort();
  }, [mapUrl]);

  const asset = loadedMap?.url === mapUrl ? loadedMap.asset : null;
  const votesByArea = useMemo(() => new Map(votes.map((item) => [item.code, item])), [votes]);
  const maxVotes = votes.reduce((max, item) => Math.max(max, item.votes), 0);

  return (
    <Card variant="outlined" component="section" aria-label={title}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 1, alignItems: { sm: 'center' } }}>
          <Box>
            <Typography component="h2" variant="h2">Votação por área</Typography>
            <Typography variant="caption" color="text.secondary">Amarelo mais forte indica mais votos para o candidato neste mapa.</Typography>
          </Box>
          {loadingVotes && <Typography role="status" variant="caption">Carregando votos por área…</Typography>}
        </Stack>

        {loadError && <Alert severity="error" sx={{ mt: 1.5 }}>Não foi possível carregar a malha do mapa: {loadError}.</Alert>}
        {asset && <Box sx={{ width: '100%', overflow: 'hidden', mt: 1.5 }}>
          <svg
            viewBox={`0 0 ${asset.width} ${asset.height}`}
            role="group"
            aria-label={`${title}, ${votes.length} áreas com resultados`}
            style={{ display: 'block', width: '100%', maxHeight: 460, marginInline: 'auto' }}
          >
            {asset.features.map((feature) => {
              const item = votesByArea.get(feature.id);
              const intensity = item && maxVotes > 0 ? item.votes / maxVotes : item ? 0 : null;
              const percentage = item && item.totalValidVotes > 0 ? item.votes / item.totalValidVotes * 100 : null;
              const label = item
                ? `${feature.label}: ${integerFormat.format(item.votes)} votos${percentage === null ? '' : `, ${percentFormat.format(percentage)}% dos votos válidos`}`
                : `${feature.label}: resultado indisponível`;
              return (
                <path
                  key={feature.id}
                  d={feature.d}
                  fill={fillForIntensity(intensity)}
                  stroke="var(--map-outline, #FFFFFF)"
                  strokeWidth={selectedCode === feature.id ? 2.8 : 0.8}
                  strokeLinejoin="round"
                  role={item ? 'button' : 'img'}
                  tabIndex={item ? 0 : -1}
                  aria-label={label}
                  aria-pressed={item ? selectedCode === feature.id : undefined}
                  data-vote-intensity={intensity ?? 'unavailable'}
                  onClick={() => { if (item) onSelect(feature.id); }}
                  onKeyDown={(event) => {
                    if (item && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      onSelect(feature.id);
                    }
                  }}
                  className="president-vote-map-area"
                  style={{ cursor: item ? 'pointer' : 'default', transition: 'fill 180ms ease, opacity 180ms ease' }}
                >
                  <title>{label}</title>
                </path>
              );
            })}
          </svg>
        </Box>}

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1.25 }} aria-label="Legenda de votos">
          <Typography variant="caption">Menos</Typography>
          <Box aria-hidden sx={{ width: 140, height: 9, borderRadius: 4, background: 'linear-gradient(90deg, #FFF8CA, #E0A400)' }} />
          <Typography variant="caption">Mais votos</Typography>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" color="text.secondary">{asset?.source ?? 'Malha IBGE'}</Typography>
        </Stack>
        {failedCount > 0 && <Typography role="status" variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          Resultado indisponível para {failedCount} {failedCount === 1 ? 'área' : 'áreas'}.
        </Typography>}
      </CardContent>
    </Card>
  );
}
