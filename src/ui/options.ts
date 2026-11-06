import type { BoardSpaceId, ContentIndex, RowId } from '../content/index.ts';
import {
  explainIllegal,
  getCandidateActions,
  previewAction,
  type Action,
  type GameState,
  type IllegalReason,
  type PlayerDelta,
  type PlayerId,
} from '../engine/index.ts';

// Everything the human could do right now, grouped by where the UI shows it. Illegal options are
// kept (with reasons) so the UI can explain why something is unavailable.

export interface Option {
  action: Action;
  legal: boolean;
  reasons: IllegalReason[];
  /** The acting player's own changes, for legal options. */
  delta: PlayerDelta | null;
}

export interface Options {
  /** Board spaces that need no card (Study, Rest…). */
  spaces: Partial<Record<BoardSpaceId, Option>>;
  /** Market cards by card id (take, spend, hire, start a relationship). */
  market: Map<string, Option[]>;
  /** Cards in someone's tableau by instance id (advance, promote, join a group, discard). */
  tableau: Map<string, Option[]>;
  refresh: Partial<Record<RowId, Option>>;
  upkeep: Map<string, Option[]>;
  traits: Option[];
}

const push = <K>(map: Map<K, Option[]>, key: K, option: Option) => {
  map.set(key, [...(map.get(key) ?? []), option]);
};

export function optionsFor(state: GameState, content: ContentIndex, player: PlayerId): Options {
  const result: Options = {
    spaces: {},
    market: new Map(),
    tableau: new Map(),
    refresh: {},
    upkeep: new Map(),
    traits: [],
  };
  for (const action of getCandidateActions(state, content, player)) {
    const reasons = explainIllegal(state, content, action);
    const legal = reasons.length === 0;
    const preview = legal ? previewAction(state, content, action) : null;
    const option: Option = {
      action,
      legal,
      reasons,
      delta: preview?.legal ? (preview.players[player] ?? null) : null,
    };
    switch (action.type) {
      case 'chooseChildTrait':
        result.traits.push(option);
        break;
      case 'payUpkeep':
      case 'refuseUpkeep':
        push(result.upkeep, action.instanceId, option);
        break;
      case 'placeTime': {
        const choice = action.choice;
        if (!choice) result.spaces[action.space] = option;
        else if (choice.kind === 'joinGroup' || choice.kind === 'advanceRelationship') {
          push(result.tableau, choice.instanceId, option);
        } else push(result.market, choice.card, option);
        break;
      }
      case 'advanceProject':
      case 'promote':
      case 'discardCard':
        push(result.tableau, action.instanceId, option);
        break;
      case 'refreshRow':
        result.refresh[action.row] = option;
        break;
    }
  }
  return result;
}
