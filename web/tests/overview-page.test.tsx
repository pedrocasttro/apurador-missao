import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OverviewPage } from '../src/components/overview-page';
import { useOverview } from '../src/data/tse/use-overview';
import { AppThemeProvider } from '../src/theme/app-theme-provider';

async function fixture() {
  return JSON.parse(await readFile(resolve(process.cwd(), 'tests/fixtures/tse/ea20-president-br.json'), 'utf8'));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Visão Geral com EA20 presidencial', () => {
  it('apresenta dados TSE, identifica simulado e informa seções ainda não conectadas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(await fixture())));
    render(<AppThemeProvider><OverviewPage /></AppThemeProvider>);

    expect(screen.getByRole('status', { name: 'Carregando resultados do TSE' })).toBeInTheDocument();
    expect(await screen.findByText('CANDIDATO 9999')).toBeInTheDocument();
    expect(screen.getAllByText('DADOS SIMULADOS')).toHaveLength(2);
    expect(screen.getByText('Dados para desenvolvimento; não representam apuração corrente.')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('100.982.116')).toBeInTheDocument();
    expect(screen.getByText('9.118.018')).toBeInTheDocument();
    expect(screen.getByText('9.040.537')).toBeInTheDocument();

    const candidateRow = screen.getByText('CANDIDATO 9999').closest('li');
    expect(screen.getByText('Resultado nacional · % dos votos válidos')).toBeInTheDocument();
    expect(candidateRow).toHaveTextContent('10,40%');
    const candidatePhoto = candidateRow?.querySelector('img');
    expect(candidatePhoto).toBeInstanceOf(HTMLImageElement);
    expect(candidatePhoto).toHaveAttribute('src', 'https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/fotos/br/41592406.jpeg');
    fireEvent.error(candidatePhoto!);
    expect(candidateRow?.querySelector('[data-testid="candidate-photo-fallback"]')).not.toBeNull();

    const results = screen.getByRole('region', { name: 'Resultado presidencial resumido' });
    expect(within(results).getAllByRole('listitem').map((item) => item.textContent)).toHaveLength(4);
    expect(screen.getByRole('heading', { name: 'Análise de desempenho' })).toBeInTheDocument();
  });

  it('expande e recolhe Outros mantendo os candidatos e percentuais individuais', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(await fixture())));
    render(<AppThemeProvider><OverviewPage /></AppThemeProvider>);

    const results = await screen.findByRole('region', { name: 'Resultado presidencial resumido' });
    const moreButton = await within(results).findByRole('button', { name: /Outros/ });
    expect(moreButton).toHaveAttribute('aria-expanded', 'false');
    expect(within(results).getAllByRole('listitem')).toHaveLength(4);

    fireEvent.click(moreButton);
    expect(within(results).queryByRole('button', { name: /Mostrar \d+ candidatos agrupados em Outros/ })).not.toBeInTheDocument();
    expect(within(results).getAllByRole('listitem')).toHaveLength(13);
    expect(within(results).getByText('CANDIDATO 9993')).toBeInTheDocument();
    for (const row of within(results).getAllByRole('listitem').slice(3)) {
      expect(row.textContent).toMatch(/\d+[,.]\d+%/);
      expect(within(row).getByRole('img')).toBeInTheDocument();
    }

    fireEvent.click(within(results).getByRole('button', { name: 'Recolher candidatos agrupados em Outros' }));
    expect(within(results).getAllByRole('listitem')).toHaveLength(4);
    expect(within(results).getByRole('button', { name: /Mostrar \d+ candidatos agrupados em Outros/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('mostra a falha da CDN sem apagar os dados de orientação', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    render(<AppThemeProvider><OverviewPage /></AppThemeProvider>);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('HTTP 503'));
  });

  it('consulta novamente cinco segundos depois de uma resposta concluída', async () => {
    const payload = await fixture();
    const fetchMock = vi.fn().mockResolvedValue(Response.json(payload));
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useOverview());

    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(4_999); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); await Promise.resolve(); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('aplica backoff quando a CDN falha', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('rede indisponível'));
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useOverview());

    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(9_999); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); await Promise.resolve(); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    unmount();
  });
});
