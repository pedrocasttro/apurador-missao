import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppThemeProvider } from '../src/theme/app-theme-provider';
import { AppShell } from '../src/components/app-shell';

vi.mock('next/navigation', () => ({ usePathname: () => '/senado/' }));

function renderShell() {
  return render(
    <AppThemeProvider>
      <AppShell>
        <label>Filtro de teste<input defaultValue="Paraná" /></label>
        <details><summary>Contexto de teste</summary>Conteúdo aberto</details>
      </AppShell>
    </AppThemeProvider>,
  );
}

describe('AppShell — navegação e tema (RF-UI-03 / requisito 34.2)', () => {
  it('oferece os seis destinos e identifica a página atual', () => {
    renderShell();
    const navigation = screen.getByRole('navigation', { name: 'Navegação principal' });
    const links = within(navigation).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Visão geral', 'Presidente', 'Senado', 'Cadeiras', 'Missão', 'Explorar',
    ]);
    expect(within(navigation).getByRole('link', { name: 'Senado' })).toHaveAttribute('aria-current', 'page');
    expect(links.filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Ir para o conteúdo' })).toHaveAttribute('href', '#conteudo');
  });

  it('alterna tema e logo sem remontar o conteúdo nem apagar o contexto', async () => {
    const user = userEvent.setup();
    renderShell();
    const input = screen.getByRole('textbox', { name: 'Filtro de teste' });
    await user.clear(input);
    await user.type(input, 'Sarandi');
    await user.click(screen.getByText('Contexto de teste'));
    const toggle = screen.getByRole('switch', { name: 'Tema escuro' });
    expect(toggle).not.toBeChecked();
    expect(screen.getAllByAltText('Missão — Apuração 2026').every((logo) => logo.getAttribute('src') === '/brand/missao-light.svg')).toBe(true);
    await user.click(toggle);
    expect(toggle).toBeChecked();
    expect(screen.getAllByAltText('Missão — Apuração 2026').every((logo) => logo.getAttribute('src') === '/brand/missao-dark.svg')).toBe(true);
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input).toHaveValue('Sarandi');
    expect(screen.getByText('Contexto de teste').parentElement).toHaveAttribute('open');
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(input).toHaveValue('Sarandi');
  });

  it('permite alternar o tema pelo teclado', async () => {
    const user = userEvent.setup();
    renderShell();
    const toggle = screen.getByRole('switch', { name: 'Tema escuro' });
    toggle.focus();
    await user.keyboard(' ');
    expect(toggle).toBeChecked();
  });

  it('não apresenta parcial, atualização ou estado ao vivo inventados', () => {
    renderShell();
    expect(screen.queryByText(/AO VIVO|67,8|Atualizado há/)).not.toBeInTheDocument();
  });
});
