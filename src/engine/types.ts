import type { BoardSpaceId, CardId, ResourceId, RowId, Stage } from '../content/index.ts';
import type { RngState } from './rng.ts';

export type PlayerId = string;
export type Resources = Record<ResourceId, number>;

export interface GameSetup {
  /** 1–4 seats in clockwise order (R-SET-01). */
  players: readonly { kind: 'human' | 'bot' }[];
}

/** Where Long-Term Happiness came from — drives the end-screen breakdown and balance reports. */
export type LthSource =
  | 'projects'
  | 'itemsActivities'
  | 'jobs'
  | 'partners'
  | 'childTrait'
  | 'lifeGoals'
  | 'sthOverflow'
  | 'inheritance';

export type DeathCause = 'stress' | 'oldAge' | 'endOfLife';

export interface TableauCard {
  instanceId: string;
  cardId: CardId;
  /** Current level (1-based) for leveled cards, `null` otherwise. */
  level: number | null;
}

export interface PlayerState {
  id: PlayerId;
  kind: 'human' | 'bot';
  resources: Resources;
  /** Time markers still available this round. */
  time: number;
  /** 0-based position on the Stress track; the start is the first space of the start zone. */
  stress: number;
  sth: number;
  lth: number;
  lthBySource: Partial<Record<LthSource, number>>;
  alive: boolean;
  death: { round: number; cause: DeathCause } | null;
  childTrait: CardId | null;
  /** Child Traits offered at setup (R-SET-06); emptied once one is chosen. */
  traitOffer: CardId[];
  tableau: TableauCard[];
}

export interface MarketRow {
  deck: CardId[];
  discard: CardId[];
  slots: (CardId | null)[];
}

export type PendingDecision = { type: 'chooseChildTrait'; player: PlayerId };

export interface GameResult {
  /** Best first: by LTH, then by resources + money held at death (R-DTH-03). */
  standings: { player: PlayerId; lth: number; leftovers: number }[];
  winners: PlayerId[];
}

export interface GameState {
  version: 1;
  packId: string;
  packVersion: string;
  seed: string;
  rng: RngState;
  round: number;
  phase: 'setup' | 'action' | 'gameOver';
  pending: PendingDecision | null;
  firstPlayer: PlayerId;
  /** Player to act in the Action phase. */
  current: PlayerId | null;
  market: Record<RowId, MarketRow>;
  /** Time markers on board spaces this round, one entry per marker. */
  placements: Record<BoardSpaceId, PlayerId[]>;
  players: PlayerState[];
  lifeGoals: CardId[];
  nextInstanceId: number;
  result: GameResult | null;
  log: GameEvent[];
}

export type Action =
  | { type: 'chooseChildTrait'; player: PlayerId; card: CardId }
  | { type: 'placeTime'; player: PlayerId; space: BoardSpaceId }
  | { type: 'refreshRow'; player: PlayerId; row: RowId }
  | { type: 'discardCard'; player: PlayerId; instanceId: string };

export type StressCause = 'repeatSpace' | 'overtime' | 'oldAge' | 'overload' | 'discard' | 'card';

export type GameEvent =
  | { type: 'gameCreated'; seed: string; players: PlayerId[]; lifeGoals: CardId[] }
  | { type: 'childTraitChosen'; player: PlayerId; card: CardId }
  | { type: 'roundStarted'; round: number; stage: Stage }
  | { type: 'marketRefilled'; row: RowId; slots: (CardId | null)[] }
  | { type: 'timeSet'; player: PlayerId; time: number }
  | { type: 'timePlaced'; player: PlayerId; space: BoardSpaceId }
  | { type: 'resourcesGained'; player: PlayerId; gained: Partial<Resources> }
  | { type: 'timeGained'; player: PlayerId; amount: number }
  | {
      type: 'stressChanged';
      player: PlayerId;
      from: number;
      to: number;
      cause: StressCause | 'rest' | 'relax' | 'goodHealth';
    }
  | { type: 'sthChanged'; player: PlayerId; from: number; to: number }
  | { type: 'lthChanged'; player: PlayerId; amount: number; source: LthSource }
  | { type: 'rowRefreshed'; player: PlayerId; row: RowId; slots: (CardId | null)[] }
  | { type: 'cardDiscarded'; player: PlayerId; cardId: CardId }
  | { type: 'playerDied'; player: PlayerId; round: number; cause: DeathCause }
  | { type: 'roundEnded'; round: number; nextFirstPlayer: PlayerId | null }
  | { type: 'gameOver'; result: GameResult };

export type IllegalReason =
  | { code: 'wrongPhase' }
  | { code: 'unknownPlayer' }
  | { code: 'notYourTurn' }
  | { code: 'playerDead' }
  | { code: 'notAnOption' }
  | { code: 'noTime' }
  | { code: 'spaceLocked'; stage: Stage }
  | { code: 'notImplemented' }
  | { code: 'wouldDie' }
  | { code: 'rowUnavailable' }
  | { code: 'notInTableau' };

export class IllegalActionError extends Error {
  constructor(
    readonly action: Action,
    readonly reasons: IllegalReason[],
  ) {
    super(`Illegal action ${action.type}: ${reasons.map((r) => r.code).join(', ')}`);
    this.name = 'IllegalActionError';
  }
}
