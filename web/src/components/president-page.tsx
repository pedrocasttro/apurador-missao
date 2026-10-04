'use client';

import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { UserRound } from 'lucide-react';
import { ResultFilters } from './result-filters';
import { PresidentVoteMap } from './president-vote-map';
import { percentageOfValidVotes, type GeographyOption, type Metric } from '../data/tse/president-client';
import { usePresidentData, usePresidentMapData } from '../data/tse/use-president';

const numberFormat = new Intl.NumberFormat('pt-BR');
const percentageFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function PresidentPage() {
  const [metric, setMetric] = useState<Metric>('validVotesPercentage');
  const [candidateId, setCandidateId] = useState('');
  const [scope, setScope] = useState<'country' | 'state'>('country');
  const [stateCode, setStateCode] = useState('');
  const [municipalityCode, setMunicipalityCode] = useState('');
  const selection = useMemo(() => ({ type: scope, stateCode, municipalityCode }), [scope, stateCode, municipalityCode]);
  const { setup, result, error, receivedAt, loading } = usePresidentData(selection);
  const candidates = setup?.candidates ?? [];
  const selectedCandidate = candidates.find((candidate) => candidate.id === candidateId) ?? null;
  const states = setup?.states ?? [];
  const municipalities: GeographyOption[] = stateCode ? setup?.municipalitiesByState[stateCode] ?? [] : [];
  const candidateResult = selectedCandidate
    ? result?.candidates.find((candidate) => candidate.id === selectedCandidate.id) ?? null
    : null;
  const selectedState = states.find((state) => state.code === stateCode);
  const selectedCity = municipalities.find((city) => city.code === municipalityCode);
  const mapData = usePresidentMapData(setup, selectedCity ? '' : selectedCandidate?.id ?? '', scope === 'state' ? stateCode : '');
  const geographyLabel = scope === 'country'
    ? 'Brasil'
    : selectedCity && selectedState
      ? `${selectedCity.label} · ${selectedState.label}`
      : selectedState?.label ?? 'Estado';
  const percentage = candidateResult && result
    ? percentageOfValidVotes(candidateResult.votes, result.totalValidVotes)
    : null;
  const displayedValue = candidateResult
    ? metric === 'totalVotes'
      ? numberFormat.format(candidateResult.votes)
      : percentage === null ? '—' : `${percentageFormat.format(percentage)}%`
    : '—';
  const tooltipValue = candidateResult
    ? metric === 'totalVotes'
      ? percentage === null ? 'Percentual indisponível' : `${percentageFormat.format(percentage)}% dos votos válidos`
      : `${numberFormat.format(candidateResult.votes)} votos`
    : '';

  return (
    <Stack component="section" aria-label="Apuração presidencial" spacing={2.25}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 1 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">Resultado nacional e distribuição territorial do primeiro turno</Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {setup?.source === 'simulated' && <Chip size="small" color="warning" label="DADOS SIMULADOS" />}
          {setup?.source === 'official' && <Chip size="small" color="success" label="FONTE OFICIAL TSE" />}
          {receivedAt && <Typography variant="caption" color="text.secondary">Atualizado {receivedAt.toLocaleTimeString('pt-BR')}</Typography>}
        </Stack>
      </Stack>

      {setup?.source === 'simulated' && <Alert severity="warning">Dados para desenvolvimento; não representam apuração corrente.</Alert>}
      {error && <Alert severity="error" role="alert">Não foi possível atualizar os dados do TSE: {error}</Alert>}
      {loading && !setup && <Box role="status" aria-label="Carregando dados presidenciais do TSE" sx={{ py: 3 }}><LinearProgress aria-label="Carregando" /></Box>}

      {setup && <>
        <ResultFilters
          metric={metric}
          onMetricChange={setMetric}
          candidate={selectedCandidate}
          candidates={candidates}
          onCandidateChange={(candidate) => setCandidateId(candidate?.id ?? '')}
          scope={scope}
          onScopeChange={(value) => {
            setScope(value);
            if (value === 'country') setMunicipalityCode('');
          }}
          stateCode={stateCode}
          states={states}
          onStateChange={(value) => { setStateCode(value); setMunicipalityCode(''); }}
          municipalityCode={municipalityCode}
          municipalities={municipalities}
          onMunicipalityChange={setMunicipalityCode}
          loading={false}
        />

        {!selectedCandidate && scope === 'state' && !stateCode && <Alert severity="info">Selecione uma UF para consultar a lista de candidatos e a apuração estadual.</Alert>}
        {!selectedCandidate && result && <CandidateList
          candidates={candidates}
          result={result}
          metric={metric}
          geography={geographyLabel}
          onSelect={(candidate) => setCandidateId(candidate.id)}
        />}
        {selectedCandidate && scope === 'state' && !stateCode && <Alert severity="info">Selecione uma UF para consultar o resultado estadual.</Alert>}

        {selectedCandidate && scope === 'country' && result && <ResultCards
          geography={geographyLabel}
          candidate={selectedCandidate}
          candidateVotes={candidateResult?.votes ?? null}
          metricLabel={metric === 'totalVotes' ? 'Votos totais' : '% dos votos válidos'}
          displayedValue={displayedValue}
          tooltipValue={tooltipValue}
          totalValidVotes={result.totalValidVotes}
          totalizedPercentage={result.totalizedPercentage}
          context={<PresidentVoteMap
            title="Mapa da votação por UF"
            mapUrl="/maps/brazil-states-2025.json"
            votes={mapData.votes}
            loadingVotes={mapData.loading}
            failedCount={mapData.failedCount}
            onSelect={(code) => {
              setScope('state');
              setStateCode(code.toLowerCase());
              setMunicipalityCode('');
            }}
          />}
        />}
        {selectedCandidate && scope === 'state' && stateCode && result && <ResultCards
          geography={geographyLabel}
          candidate={selectedCandidate}
          candidateVotes={candidateResult?.votes ?? null}
          metricLabel={metric === 'totalVotes' ? 'Votos totais' : '% dos votos válidos'}
          displayedValue={displayedValue}
          tooltipValue={tooltipValue}
          totalValidVotes={result.totalValidVotes}
          totalizedPercentage={result.totalizedPercentage}
          context={selectedCity
            ? <Alert severity="info">O detalhamento por seção e local de votação depende dos arquivos de urna e do cadastro de locais do TSE; esses dados ainda não estão disponíveis nesta integração.</Alert>
            : <PresidentVoteMap
              title={`Mapa da votação por município em ${selectedState?.label ?? stateCode.toUpperCase()}`}
              mapUrl={`/maps/municipalities-${stateCode}-2025.json`}
              votes={mapData.votes}
              loadingVotes={mapData.loading}
              failedCount={mapData.failedCount}
              onSelect={(ibgeCode) => {
                const town = municipalities.find((item) => item.ibgeCode === ibgeCode);
                if (town) setMunicipalityCode(town.code);
              }}
            />}
        />}
        {selectedCandidate && result && !candidateResult && <Alert severity="info">O arquivo consultado não contém resultado deste candidato para {geographyLabel}.</Alert>}
      </>}
    </Stack>
  );
}

function CandidateList({
  candidates, result, metric, geography, onSelect,
}: {
  candidates: Array<{ id: string; name: string; ballotNumber: string; party: string | null; photoUrl: string }>;
  result: NonNullable<ReturnType<typeof usePresidentData>['result']>;
  metric: Metric;
  geography: string;
  onSelect: (candidate: { id: string }) => void;
}) {
  const orderedCandidates = candidates.map((candidate) => ({
    candidate,
    votes: result.candidates.find((item) => item.id === candidate.id)?.votes ?? null,
  })).sort((a, b) => {
    if (a.votes === null && b.votes === null) return a.candidate.name.localeCompare(b.candidate.name, 'pt-BR');
    if (a.votes === null) return 1;
    if (b.votes === null) return -1;
    const valueA = metric === 'totalVotes' ? a.votes : percentageOfValidVotes(a.votes, result.totalValidVotes);
    const valueB = metric === 'totalVotes' ? b.votes : percentageOfValidVotes(b.votes, result.totalValidVotes);
    if (valueA === null && valueB === null) return a.candidate.name.localeCompare(b.candidate.name, 'pt-BR');
    if (valueA === null) return 1;
    if (valueB === null) return -1;
    return valueB - valueA || a.candidate.name.localeCompare(b.candidate.name, 'pt-BR');
  });
  return (
    <Card variant="outlined" component="section" aria-label="Lista de candidatos presidenciais">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'baseline' }, justifyContent: 'space-between', gap: 0.5, mb: 1.5 }}>
          <Typography component="h2" variant="h2">Candidaturas presidenciais</Typography>
          <Typography variant="caption" color="text.secondary">{geography} · {metric === 'totalVotes' ? 'votos totais' : 'percentual dos votos válidos'} · maior para menor</Typography>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1 }}>
          {orderedCandidates.map(({ candidate, votes }) => {
            const percentage = votes === null ? null : percentageOfValidVotes(votes, result.totalValidVotes);
            const percentageLabel = percentage === null ? '—' : `${percentageFormat.format(percentage)}%`;
            const votesLabel = votes === null ? 'Votos indisponíveis' : `${numberFormat.format(votes)} votos`;
            const metricLabel = metric === 'totalVotes' ? 'Votos totais' : '% dos válidos';
            const metricValue = metric === 'totalVotes' ? (votes === null ? '—' : numberFormat.format(votes)) : percentageLabel;
            return (
              <Card key={candidate.id} variant="outlined">
                <CardActionArea
                  component="button"
                  type="button"
                  aria-label={`${candidate.name}, ${percentageLabel} dos votos válidos, ${votesLabel}. Selecionar candidato`}
                  onClick={() => onSelect(candidate)}
                  sx={{ display: 'flex', justifyContent: 'flex-start', minHeight: 80, p: 1.25, textAlign: 'left' }}
                >
                  <CandidateAvatar candidate={candidate} size={44} />
                  <Stack sx={{ minWidth: 0, flex: 1, ml: 1.25 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{candidate.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{candidate.party ?? 'Partido indisponível'}{candidate.ballotNumber ? ` · ${candidate.ballotNumber}` : ''}</Typography>
                    <Typography variant="caption" color="text.secondary">{votesLabel}</Typography>
                  </Stack>
                  <Stack sx={{ alignItems: 'flex-end', ml: 1.5, flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary">{metricLabel}</Typography>
                    <Typography data-testid="candidate-metric-value" sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.25 }}>{metricValue}</Typography>
                  </Stack>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}

function CandidateAvatar({ candidate, size }: {
  candidate: { name: string; photoUrl: string };
  size: number;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  return (
    <Avatar role="img" aria-label={`Foto de ${candidate.name}`} sx={{ width: size, height: size, bgcolor: 'action.selected', color: 'text.secondary' }}>
      {photoFailed || !candidate.photoUrl
        ? <UserRound aria-hidden data-testid="candidate-photo-fallback" size={22} />
        : <Box component="img" src={candidate.photoUrl} alt="" onError={() => setPhotoFailed(true)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    </Avatar>
  );
}

function ResultCards({
  geography, candidate, candidateVotes, metricLabel, displayedValue, tooltipValue, totalValidVotes, totalizedPercentage, context,
}: {
  geography: string;
  candidate: { id: string; name: string; party: string | null; photoUrl: string };
  candidateVotes: number | null;
  metricLabel: string;
  displayedValue: string;
  tooltipValue: string;
  totalValidVotes: number;
  totalizedPercentage: number | null;
  context: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1.26fr)' }, gap: 1.75, alignItems: 'stretch' }}>
      <Card variant="outlined" component="section" aria-label="Resultado do candidato selecionado" sx={{ minHeight: 260 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Typography component="h2" variant="h2">Votação</Typography>
          <Typography variant="caption" color="text.secondary">{geography} · primeiro turno</Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mt: 3 }}>
            <CandidateAvatar candidate={candidate} size={44} />
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{candidate.name}</Typography>
              <Typography variant="caption" color="text.secondary">{candidate.party ?? 'Partido indisponível'}</Typography>
            </Stack>
          </Stack>
          <Stack spacing={0.5} sx={{ mt: 3 }}>
            <Typography variant="caption" color="text.secondary">{metricLabel}</Typography>
            {candidateVotes === null
              ? <Typography component="p" sx={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>—</Typography>
              : <Tooltip arrow placement="top" title={tooltipValue}>
                <Typography
                  component="span"
                  tabIndex={0}
                  aria-label={metricLabel === 'Votos totais' ? 'Votos totais do candidato' : 'Percentual de votos válidos do candidato'}
                  sx={{ width: 'fit-content', fontSize: 32, fontWeight: 700, lineHeight: 1.2, textDecoration: 'underline dotted', textUnderlineOffset: 5, cursor: 'help' }}
                >{displayedValue}</Typography>
              </Tooltip>}
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={1.5}>
        {context}
        <Card variant="outlined" component="section" aria-label="Contexto da abrangência">
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography component="h2" variant="h2">Contexto da abrangência</Typography>
            <Typography variant="caption" color="text.secondary">Votos computados no arquivo para {geography}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(2, minmax(0,1fr))' }, gap: 1.5, mt: 1.5 }}>
              <ContextMetric label="Votos válidos" value={numberFormat.format(totalValidVotes)} />
              <ContextMetric label="Totalização no arquivo" value={totalizedPercentage === null ? 'Não informada' : `${percentageFormat.format(totalizedPercentage)}%`} />
            </Box>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}

function ContextMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="outlined" sx={{ minHeight: 92, bgcolor: 'background.default' }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography sx={{ mt: 0.5, fontSize: 18, fontWeight: 700 }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}
