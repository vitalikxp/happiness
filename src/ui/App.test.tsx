import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App.tsx';
import { ru } from './i18n/locales/ru.ts';
import { leaveGame, session } from './session.ts';

afterEach(() => {
  cleanup();
  leaveGame();
});

describe('App', () => {
  it('opens on the new-game page with the localized title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(ru['app.title']);
    expect(document.title).toBe(ru['app.title']);
    expect(document.documentElement.lang).toBe('ru');
  });

  it('R-SET-08: starts a life with the chosen character, then asks for the Child Trait', () => {
    render(<App />);
    fireEvent.input(screen.getByLabelText(ru['newGame.name']), { target: { value: 'Гедеон' } });
    fireEvent.click(screen.getByRole('radio', { name: ru['newGame.gender.m'] }));
    fireEvent.click(screen.getByRole('radio', { name: ru['newGame.opponents.0'] }));
    fireEvent.click(screen.getByRole('button', { name: ru['newGame.start'] }));

    const current = session.value;
    expect(current?.profiles[current.human]).toMatchObject({ name: 'Гедеон', gender: 'm' });
    expect(current?.state.players).toHaveLength(1);
    expect(screen.getByRole('heading', { name: ru['trait.heading'] })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: new RegExp(ru['trait.choose']) })).toHaveLength(2);
  });

  it('shows the board once the omen is chosen', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: ru['newGame.opponents.0'] }));
    fireEvent.click(screen.getByRole('button', { name: ru['newGame.start'] }));
    const [first] = screen.getAllByRole('button', { name: new RegExp(ru['trait.choose']) });
    if (!first) throw new Error('no omen button');
    fireEvent.click(first);
    expect(screen.getByRole('heading', { name: ru['board.market'] })).toBeTruthy();
    expect(screen.getByText(ru['board.turnYou'])).toBeTruthy();
  });
});
