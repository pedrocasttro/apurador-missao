'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { UserRound } from 'lucide-react';
import { useOverview } from '../data/tse/use-overview';
import { useSeatPerformance } from '../data/tse/use-seat-performance';
import type { OverviewCandidate } from '../data/tse/overview-client';

const numberFormat = new Intl.NumberFormat('pt-BR');
const percentFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const candidatePercentFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card variant="outlined" sx={{ minHeight: 132 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography component="p" sx={{ mt: 0.5, fontSize: 26, fontWeight: 700, lineHeight: 1.3 }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{detail}</Typography>
      </CardContent>
    </Card>
  );
}

function CandidateRow({ candidate }: { candidate: OverviewCandidate }) {
  return (
    <Box component="li" sx={{ display: 'grid', gridTemplateColumns: '34px minmax(0,1fr) auto auto', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, minHeight: 48, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
      <CandidateAvatar candidate={candidate} />
      <Stack sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{candidate.name}</Typography>
        <Typography variant="caption" color="text.secondary">{candidate.party ? `${candidate.ballotNumber} · ${candidate.party}` : candidate.ballotNumber}</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{numberFormat.format(candidate.votes)} votos</Typography>
      <Typography variant="body2" sx={{ minWidth: 54, textAlign: 'right', fontWeight: 600 }}>{candidatePercentFormat.format(candidate.percentage)}%</Typography>
    </Box>
  );
}

function OtherCandidatesRow({
  candidate, count, expanded, onToggle,
}: {
  candidate: OverviewCandidate;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Box component="li" sx={{ borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
      <ButtonBase
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Recolher' : 'Mostrar'} ${count} candidatos agrupados em Outros, ${candidatePercentFormat.format(candidate.percentage)}% dos votos válidos`}
        onClick={onToggle}
        sx={{ display: 'grid', width: '100%', gridTemplateColumns: '34px minmax(0,1fr) auto auto', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, minHeight: 48, textAlign: 'left', borderRadius: 1 }}
      >
        <Avatar aria-hidden sx={{ width: 34, height: 34, bgcolor: 'action.selected', color: 'text.secondary', fontSize: 12, fontWeight: 700 }}>…</Avatar>
        <Stack sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Outros</Typography>
          <Typography variant="caption" color="text.secondary">{expanded ? 'Toque para recolher' : `${count} candidatos · toque para expandir`}</Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{numberFormat.format(candidate.votes)} votos</Typography>
        <Typography variant="body2" sx={{ minWidth: 54, textAlign: 'right', fontWeight: 600 }}>{candidatePercentFormat.format(candidate.percentage)}%</Typography>
      </ButtonBase>
    </Box>
  );
}

function CandidateAvatar({ candidate }: { candidate: OverviewCandidate }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  return (
    <Avatar role="img" aria-label={`Foto de ${candidate.name}`} sx={{ width: 34, height: 34, bgcolor: 'action.selected', color: 'text.secondary' }}>
      {photoFailed || !candidate.photoUrl
        ? <UserRound aria-hidden data-testid="candidate-photo-fallback" size={18} />
        : <Box component="img" src={candidate.photoUrl} alt="" onError={() => setPhotoFailed(true)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    </Avatar>
  );
}

export function OverviewPage() {
  const { data, error, receivedAt } = useOverview();
  const { data: seats, error: seatError } = useSeatPerformance();
  const [othersExpanded, setOthersExpanded] = useState(false);
  const topCandidates = data?.candidates.slice(0, 5) ?? [];
  const otherCandidates = data?.candidates.slice(5) ?? [];
  const other: OverviewCandidate | null = otherCandidates.length ? ({
    candidateId: 'others', ballotNumber: '', name: 'Outros', party: null,
    votes: otherCandidates.reduce((sum, candidate) => sum + candidate.votes, 0),
    percentage: otherCandidates.reduce((sum, candidate) => sum + candidate.percentage, 0),
  }) : null;

  return (
    <Stack spacing={2.25} component="section" aria-label="Visão geral da apuração">
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 1 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">Panorama nacional da apuração em tempo próximo do real</Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {data?.source === 'simulated' && <Chip size="small" color="warning" label="DADOS SIMULADOS" />}
          {data?.source === 'official' && <Chip size="small" color="success" label="FONTE OFICIAL TSE" />}
          {data && <Chip size="small" variant="outlined" label={data.electionStatus === 'totalized' ? 'Estado no arquivo: totalizada' : 'Estado no arquivo: em andamento'} />}
          {receivedAt && <Typography variant="caption" color="text.secondary">Recebido {receivedAt.toLocaleTimeString('pt-BR')}</Typography>}
        </Stack>
      </Stack>

      {data?.source === 'simulated' && <Alert severity="warning">Dados para desenvolvimento; não representam apuração corrente.</Alert>}
      {error && <Alert severity="error" role="alert">Não foi possível atualizar os dados do TSE: {error}</Alert>}
      {!data && !error && <Box role="status" aria-label="Carregando resultados do TSE" sx={{ py: 3 }}><LinearProgress aria-label="Carregando" /></Box>}

      {data && <>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0,1fr))' }, gap: 1.5 }}>
          <Metric label="Totalização" value={`${percentFormat.format(data.totalizedPercentage)}%`} detail="Seções totalizadas" />
          <Metric label="Votos válidos" value={numberFormat.format(data.validVotes)} detail="Presidência" />
          <Metric label="Votos brancos" value={numberFormat.format(data.blankVotes)} detail="Presidência" />
          <Metric label="Votos nulos" value={numberFormat.format(data.nullVotes)} detail="Presidência" />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.7fr) minmax(280px, 1fr)' }, gap: 1.75 }}>
          <Card variant="outlined" component="section" aria-label="Resultado presidencial resumido">
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography component="h2" variant="h2">Presidência</Typography>
              <Typography variant="caption" color="text.secondary">Resultado nacional · % dos votos válidos</Typography>
              <Box component="ol" sx={{ p: 0, m: 0, mt: 1.25, listStyle: 'none' }}>
                {topCandidates.map((candidate) => <CandidateRow candidate={candidate} key={candidate.candidateId} />)}
                {other && !othersExpanded && <OtherCandidatesRow candidate={other} count={otherCandidates.length} expanded={false} onToggle={() => setOthersExpanded(true)} />}
                {othersExpanded && otherCandidates.map((candidate) => <CandidateRow candidate={candidate} key={candidate.candidateId} />)}
              </Box>
              {othersExpanded && <ButtonBase aria-label="Recolher candidatos agrupados em Outros" onClick={() => setOthersExpanded(false)} sx={{ minHeight: 36, px: 1, mt: 1, borderRadius: 1, color: 'primary.main', typography: 'body2', fontWeight: 600 }}>Recolher Outros</ButtonBase>}
            </CardContent>
          </Card>

          <Card variant="outlined" component="section" aria-label="Análise de desempenho do Missão">
            <CardContent sx={{ p: 2 }}>
              <Typography component="h2" variant="h2">Análise de desempenho</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Cadeiras do Missão na parcial · Brasil</Typography>
              {seats?.source === 'simulated' && <Chip size="small" color="warning" label="DADOS SIMULADOS" sx={{ mt: 1 }} />}
              {seatError && <Alert severity="error" sx={{ mt: 1 }}>{seatError}</Alert>}
              {!seats && !seatError && <Typography role="status" variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Carregando cadeiras por UF…</Typography>}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0,1fr))' }, gap: 1, mt: 1.5 }}>
                {([
                  ['Câmara Federal', 'federal'], ['Assembleias Legislativas', 'state'], ['Senado', 'senate'],
                ] as const).map(([label, chamber]) => <Card key={chamber} variant="outlined" sx={{ p: 1.25 }}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography component="p" sx={{ fontSize: 26, fontWeight: 700, lineHeight: 1.3 }}>{seats?.totals[chamber] ?? '—'}</Typography>
                  <Typography variant="caption" color="text.secondary">cadeiras na parcial</Typography>
                </Card>)}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>Distribuição por UF · passe o cursor ou foque para ver os três cargos</Typography>
              <Box component="ul" aria-label="Cadeiras do Missão por unidade da Federação" sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(52px, 1fr))', listStyle: 'none', p: 0, m: 0, mt: 0.75, gap: 0.5 }}>
                {seats?.states.map((state) => {
                  const label = 'chambers' in state
                    ? `${state.uf}: Câmara Federal ${state.chambers.federal}, Assembleias Legislativas ${state.chambers.state}, Senado ${state.chambers.senate}`
                    : `${state.uf}: dados indisponíveis`;
                  return <Box component="li" key={state.uf}><ButtonBase title={label} aria-label={label} sx={{ width: '100%', minHeight: 36, borderRadius: 1, border: 1, borderColor: 'divider', typography: 'body2', fontWeight: 600 }}>{state.uf}</ButtonBase></Box>;
                })}
              </Box>
              {seats && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Snapshot recebido {seats.receivedAt.toLocaleTimeString('pt-BR')}</Typography>}
            </CardContent>
          </Card>
        </Box>

        <Stack spacing={0.25} sx={{ pt: 0.25 }}>
          <Typography variant="caption" color="text.secondary">Fonte: Tribunal Superior Eleitoral</Typography>
          <Typography variant="caption" color="text.secondary">Última atualização TSE: {data.lastTseUpdate ?? 'não informada'} · última resposta recebida: {receivedAt?.toLocaleTimeString('pt-BR') ?? '—'}</Typography>
        </Stack>
      </>}
    </Stack>
  );
}
