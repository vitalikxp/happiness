import { RESOURCES, type ContentIndex } from '../content/index.ts';
import { resolve, validate } from './actions.ts';
import type { Action, GameState, IllegalReason, PlayerId, Resources } from './types.ts';

export interface PlayerDelta {
  resources: Partial<Resources>;
  time: number;
  stress: number;
  sth: number;
  lth: number;
  died: boolean;
}

export type Preview =
  | { legal: false; reasons: IllegalReason[] }
  /** Changes per affected player. Market draws are never revealed. */
  | { legal: true; players: Record<PlayerId, PlayerDelta> };

/**
 * What an action itself does — for UI previews and bots. Built from the action's events up to
 * the end of the round (so round-end effects and the next Upkeep aren't mixed in), and only from
 * player stats, so it never leaks hidden information such as the next cards of a deck.
 */
export function previewAction(state: GameState, content: ContentIndex, action: Action): Preview {
  const reasons = validate(state, content, action);
  if (reasons.length > 0) return { legal: false, reasons };
  const draft = structuredClone(state);
  const start = draft.log.length;
  resolve(draft, content, action);

  const players: Record<PlayerId, PlayerDelta> = {};
  const deltaOf = (id: PlayerId): PlayerDelta =>
    (players[id] ??= { resources: {}, time: 0, stress: 0, sth: 0, lth: 0, died: false });
  const addResources = (id: PlayerId, change: Partial<Resources>, sign: 1 | -1) => {
    const delta = deltaOf(id);
    for (const r of RESOURCES) {
      const amount = change[r] ?? 0;
      if (amount !== 0) delta.resources[r] = (delta.resources[r] ?? 0) + sign * amount;
    }
  };

  for (const event of draft.log.slice(start)) {
    if (event.type === 'roundEnding' || event.type === 'roundStarted') break;
    switch (event.type) {
      case 'resourcesGained':
        addResources(event.player, event.gained, 1);
        break;
      case 'paid':
        addResources(event.player, event.resources, -1);
        deltaOf(event.player).time -= event.time;
        break;
      case 'timePlaced':
        deltaOf(event.player).time -= 1;
        break;
      case 'timeGained':
        deltaOf(event.player).time += event.amount;
        break;
      case 'stressChanged':
        deltaOf(event.player).stress += event.to - event.from;
        break;
      case 'sthChanged':
        deltaOf(event.player).sth += event.to - event.from;
        break;
      case 'lthChanged':
        deltaOf(event.player).lth += event.amount;
        break;
      case 'playerDied':
        deltaOf(event.player).died = true;
        break;
      default:
        break;
    }
  }
  return { legal: true, players };
}
