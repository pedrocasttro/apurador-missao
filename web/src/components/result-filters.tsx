'use client';

import Autocomplete from '@mui/material/Autocomplete';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { CandidateOption, GeographyOption, Metric } from '../data/tse/president-client';

export type ResultFiltersProps = {
  metric: Metric;
  onMetricChange: (value: Metric) => void;
  candidate: CandidateOption | null;
  candidates: CandidateOption[];
  onCandidateChange: (candidate: CandidateOption | null) => void;
  scope: 'country' | 'state';
  onScopeChange: (value: 'country' | 'state') => void;
  stateCode: string;
  states: GeographyOption[];
  onStateChange: (value: string) => void;
  municipalityCode: string;
  municipalities: GeographyOption[];
  onMunicipalityChange: (value: string) => void;
  loading: boolean;
  disabled?: boolean;
};

export function ResultFilters({
  metric, onMetricChange, candidate, candidates, onCandidateChange,
  scope, onScopeChange, stateCode, states, onStateChange,
  municipalityCode, municipalities, onMunicipalityChange, loading, disabled = false,
}: ResultFiltersProps) {
  const selectedState = states.find((option) => option.code === stateCode) ?? null;
  const selectedMunicipality = municipalities.find((option) => option.code === municipalityCode) ?? null;
  const isDisabled = disabled || loading;

  return (
    <Stack
      component="section"
      aria-label="Filtros de resultado eleitoral"
      direction="row"
      useFlexGap
      spacing={1.25}
      sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', lg: 'repeat(3, minmax(180px, 1fr))' }, width: '100%', maxWidth: 900 }}
    >
      <FormControl size="small" sx={{ minWidth: 0 }}>
        <InputLabel id="result-metric-label">Métrica</InputLabel>
        <Select
          native
          labelId="result-metric-label"
          label="Métrica"
          value={metric}
          disabled={isDisabled}
          onChange={(event: SelectChangeEvent) => onMetricChange(event.target.value as Metric)}
          inputProps={{ 'aria-label': 'Métrica' }}
        >
          <option value="validVotesPercentage">% de votos válidos</option>
          <option value="totalVotes">Votos totais</option>
        </Select>
      </FormControl>

      <Autocomplete
        size="small"
        options={candidates}
        value={candidate}
        disabled={isDisabled}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        filterOptions={(options, state) => {
          const query = state.inputValue.trim().toLocaleLowerCase('pt-BR');
          if (!query) return options;
          return options.filter((option) => [option.name, option.ballotNumber, option.party ?? '']
            .some((term) => term.toLocaleLowerCase('pt-BR').includes(query)));
        }}
        onChange={(_, value) => onCandidateChange(value)}
        renderInput={(params) => <TextField {...params} label="Candidato" placeholder="Buscar candidato" />}
      />

      <FormControl size="small" sx={{ minWidth: 0 }}>
        <InputLabel id="result-scope-label">Abrangência</InputLabel>
        <Select
          native
          labelId="result-scope-label"
          label="Abrangência"
          value={scope}
          disabled={isDisabled}
          onChange={(event: SelectChangeEvent) => onScopeChange(event.target.value as 'country' | 'state')}
          inputProps={{ 'aria-label': 'Abrangência' }}
        >
          <option value="country">Brasil</option>
          <option value="state">Estado</option>
        </Select>
      </FormControl>

      {scope === 'state' && <>
        <Autocomplete
          size="small"
          options={states}
          value={selectedState}
          disabled={isDisabled}
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, value) => option.code === value.code}
          onChange={(_, value) => onStateChange(value?.code ?? '')}
          renderInput={(params) => <TextField {...params} label="UF" required placeholder="Selecionar estado" />}
        />
        <Autocomplete
          size="small"
          options={municipalities}
          value={selectedMunicipality}
          disabled={isDisabled || !stateCode}
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, value) => option.code === value.code}
          onChange={(_, value) => onMunicipalityChange(value?.code ?? '')}
          renderInput={(params) => <TextField {...params} label="Cidade" placeholder="Todas as cidades" />}
        />
      </>}
    </Stack>
  );
}
