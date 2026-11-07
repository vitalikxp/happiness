import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { greedyBot } from '../../ai/index.ts';
import { applyAction, createGame, type GameState } from '../../engine/index.ts';
import { content } from '../content.ts';
import { ru } from '../i18n/locales/ru.ts';
import { optionsFor, type Option } from '../options.ts';
import { AdvanceOption } from './OptionButton.tsx';

afterEach(cleanup);

/** Play a bot game until p0 may advance a Basic Project in more than one STH allocation. */
function findChoice(): { state: GameState; options: Option[] } {
  for (let seed = 0; seed < 50; seed++) {
    let state = createGame({ players: [{ kind: 'human' }] }, content, `sth-${String(seed)}`);
    const bot = greedyBot('scholar');
    while (state.phase !== 'gameOver') {
      if (state.pending === null && state.current === 'p0') {
        for (const options of optionsFor(state, content, 'p0').tableau.values()) {
          const advance = options.filter((o) => o.action.type === 'advanceProject');
          if (advance.length > 1 && advance.some((o) => o.legal))
            return { state, options: advance };
        }
      }
      state = applyAction(state, content, bot.choose(state, content, 'p0')).state;
    }
  }
  throw new Error('no STH allocation choice found');
}

describe('AdvanceOption', () => {
  it('R-STH-02: one next-step button, with the discount or surcharge chosen by radio', () => {
    const { state, options } = findChoice();
    render(<AdvanceOption state={state} options={options} />);
    const sth = state.players[0]?.sth ?? 0;
    screen.getByRole('group', { name: ru[sth > 0 ? 'option.sthDiscount' : 'option.sthSurcharge'] });
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(options.length);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    const button = screen.getByRole('button');
    const before = button.textContent;
    const other = radios.findIndex((r) => !(r as HTMLInputElement).checked);
    fireEvent.click(radios[other] as HTMLElement);
    expect((radios[other] as HTMLInputElement).checked).toBe(true);
    if (options[other]?.legal) expect(button.textContent).not.toBe(before);
  });
});
