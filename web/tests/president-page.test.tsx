import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PresidentPage } from '../src/components/president-page';
import { AppThemeProvider } from '../src/theme/app-theme-provider';

async function fixture(name: string) {
  return JSON.parse(await readFile(resolve(process.cwd(), `tests/fixtures/tse/${name}`), 'utf8'));
}

async function installTseFixtures() {
  const files = {
    election: await fixture('ea11-election-configuration.json'),
    municipalities: await fixture('ea12-municipalities-election-021270.json'),
    brazil: await fixture('ea20-president-br.json'),
    parana: await fixture('ea20-president-pr.json'),
    curitiba: await fixture('ea20-president-curitiba.json'),
    sarandi: await fixture('ea20-president-sarandi.json'),
    brazilMap: JSON.parse(await readFile(resolve(process.cwd(), 'public/maps/brazil-states-2025.json'), 'utf8')),
    paranaMap: JSON.parse(await readFile(resolve(process.cwd(), 'public/maps/municipalities-pr-2025.json'), 'utf8')),
  };
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/maps/brazil-states-2025.json')) return Response.json(files.brazilMap);
    if (url.endsWith('/maps/municipalities-pr-2025.json')) return Response.json(files.paranaMap);
    if (url.endsWith('/comum/config/ele-c.json')) return Response.json(files.election);
    if (url.endsWith('/config/mun-e021270-cm.json')) return Response.json(files.municipalities);
    if (url.endsWith('/br-c0001-e021270-u.json')) return Response.json(files.brazil);
    if (url.endsWith('/pr-c0001-e021270-u.json')) return Response.json(files.parana);
    if (url.endsWith('/pr75353-c0001-e021270-u.json')) return Response.json(files.curitiba);
    if (url.endsWith('/pr84611-c0001-e021270-u.json')) return Response.json(files.sarandi);
    return new Response('', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('Aba Presidência', () => {
  it('permite buscar um candidato e alternar entre percentual de votos válidos e votos totais com tooltip recíproca', async () => {
    await installTseFixtures();
    const user = userEvent.setup();
    render(<AppThemeProvider><PresidentPage /></AppThemeProvider>);

    expect(await screen.findByText('DADOS SIMULADOS')).toBeInTheDocument();
    const candidateInput = screen.getByRole('combobox', { name: 'Candidato' });
    await user.type(candidateInput, 'CANDIDATO 9995');
    await user.click(await screen.findByRole('option', { name: /CANDIDATO 9995/ }));

    const percentage = screen.getByText('8,99%');
    await user.hover(percentage);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('9.075.260 votos');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Métrica' }), 'totalVotes');
    expect(screen.getByText('9.075.260')).toBeInTheDocument();
    await user.hover(screen.getByLabelText('Votos totais do candidato'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('8,99% dos votos válidos');
  }, 20_000);

  it('mostra mapa do Brasil colorido proporcionalmente aos votos do candidato selecionado', async () => {
    await installTseFixtures();
    const user = userEvent.setup();
    render(<AppThemeProvider><PresidentPage /></AppThemeProvider>);

    await screen.findByText('DADOS SIMULADOS');
    const candidateInput = screen.getByRole('combobox', { name: 'Candidato' });
    await user.type(candidateInput, 'CANDIDATO 9995');
    await user.click(await screen.findByRole('option', { name: /CANDIDATO 9995/ }));

    expect(await screen.findByRole('region', { name: 'Mapa da votação por UF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Paraná.*498\.889 votos/ })).toHaveAttribute('data-vote-intensity');
  }, 20_000);

  it('permite avançar do mapa do Brasil ao Paraná e selecionar Sarandi no mapa municipal', async () => {
    const fetchMock = await installTseFixtures();
    const user = userEvent.setup();
    render(<AppThemeProvider><PresidentPage /></AppThemeProvider>);

    await screen.findByText('DADOS SIMULADOS');
    await user.type(screen.getByRole('combobox', { name: 'Candidato' }), 'CANDIDATO 9995');
    await user.click(await screen.findByRole('option', { name: /CANDIDATO 9995/ }));
    await user.click(await screen.findByRole('button', { name: /Paraná: 498\.889 votos/ }));

    expect(screen.getByRole('combobox', { name: 'UF' })).toHaveValue('PARANÁ');
    const sarandi = await screen.findByRole('button', { name: /Sarandi: 4\.409 votos/ });
    await user.click(sarandi);
    expect(screen.getByRole('combobox', { name: 'Cidade' })).toHaveValue('SARANDI');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      'https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/pr/pr84611-c0001-e021270-u.json',
      expect.objectContaining({ cache: 'no-cache' }),
    ));
    const percentage = await screen.findByText('9,94%');
    await user.hover(percentage);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('4.409 votos');
    expect(screen.getByRole('region', { name: 'Contexto da abrangência' })).toHaveTextContent('SARANDI · PARANÁ');
  }, 30_000);

  it('carrega votos na UF e na cidade escolhidas, mostrando cidades depois da seleção de UF', async () => {
    const fetchMock = await installTseFixtures();
    const user = userEvent.setup();
    render(<AppThemeProvider><PresidentPage /></AppThemeProvider>);

    expect(await screen.findByText('DADOS SIMULADOS')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Métrica' }), 'totalVotes');
    await user.type(screen.getByRole('combobox', { name: 'Candidato' }), 'CANDIDATO 9995');
    await user.click(await screen.findByRole('option', { name: /CANDIDATO 9995/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Abrangência' }), 'state');
    expect(screen.getByRole('combobox', { name: 'Cidade' })).toBeDisabled();
    await user.type(screen.getByRole('combobox', { name: 'UF' }), 'PARANÁ');
    await user.click(await screen.findByRole('option', { name: 'PARANÁ' }));

    const cityInput = await screen.findByRole('combobox', { name: 'Cidade' });
    expect(await screen.findByText('498.889')).toBeInTheDocument();
    await user.type(cityInput, 'Curitiba');
    await user.click(await screen.findByRole('option', { name: 'CURITIBA' }));

    expect(await screen.findByText('89.388')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      'https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/pr/pr75353-c0001-e021270-u.json',
      expect.objectContaining({ cache: 'no-cache' }),
    ));
    expect(within(screen.getByRole('region', { name: 'Resultado do candidato selecionado' })).getByText(/CURITIBA · PARANÁ/)).toBeInTheDocument();
  }, 20_000);
});
