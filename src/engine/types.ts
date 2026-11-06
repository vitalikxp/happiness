import type {
  BoardSpaceId,
  CardId,
  ResourceBundle,
  ResourceId,
  RowId,
  Stage,
} from '../content/index.ts';
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
  /** Current/bought level (1-based) for leveled cards; `null` for Jobs and Group Projects. */
  level: number | null;
  /** Partner version chosen by the player (R-REL-05). */
  version: 0 | 1 | null;
  /** Group Project roles: who holds each of the 4 roles (R-PRJ-G-*). */
  roles: (PlayerId | null)[] | null;
  round: number;
}

/** A card set aside after use: completed projects, finished activities (R-PRJ-B-03, R-END-02). */
export interface ArchivedCard {
  cardId: CardId;
  round: number;
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
  archive: ArchivedCard[];
}

export interface MarketRow {
  deck: CardId[];
  discard: CardId[];
  slots: (CardId | null)[];
}

export type PendingDecision =
  | { type: 'chooseChildTrait'; player: PlayerId }
  /** R-UPK-06: `player` resolves upkeep card by card; `queue` are the players after them. */
  | { type: 'upkeep'; player: PlayerId; remaining: string[]; queue: PlayerId[] };

export interface GameResult {
  /** Best first: by LTH, then by resources + money held at death (R-DTH-03). */
  standings: { player: PlayerId; lth: number; leftovers: number }[];
  winners: PlayerId[];
  /** R-LG-01: who got each Life Goal (null: nobody / tie) and every player's measured value. */
  lifeGoals: { card: CardId; winner: PlayerId | null; values: Record<PlayerId, number> }[];
  /** R-SOLO-02: solo outcome, `null` in multiplayer games. */
  solo: { achieved: CardId[]; won: boolean } | null;
}

export interface GameState {
  version: 1;
  packId: string;
  packVersion: string;
  seed: string;
  rng: RngState;
  round: number;
  phase: 'setup' | 'upkeep' | 'action' | 'gameOver';
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

/** What a card-driven board space is used for. Levels are 1-based, roles 0-based. */
export type SpaceChoice =
  /** Take a market Project; `level` for Single-Round, `role` for Group Projects (R-PRJ-*). */
  | { kind: 'project'; card: CardId; level?: number; role?: number }
  /** Join someone's (or your own) Group Project in a free role (R-PRJ-G-02). */
  | { kind: 'joinGroup'; owner: PlayerId; instanceId: string; role: number }
  | { kind: 'spend'; card: CardId; level: number }
  | { kind: 'job'; card: CardId }
  | { kind: 'startRelationship'; card: CardId; version: 0 | 1 }
  | { kind: 'advanceRelationship'; instanceId: string };

export type Action =
  | { type: 'chooseChildTrait'; player: PlayerId; card: CardId }
  | { type: 'payUpkeep'; player: PlayerId; instanceId: string }
  | { type: 'refuseUpkeep'; player: PlayerId; instanceId: string }
  | { type: 'placeTime'; player: PlayerId; space: BoardSpaceId; choice?: SpaceChoice }
  /** Card action: next level of a Basic Project; `sthAllocation` per R-STH-02. */
  | { type: 'advanceProject'; player: PlayerId; instanceId: string; sthAllocation: ResourceBundle }
  /** Card action: promotion into the market Job `card` (R-JOB-04). */
  | { type: 'promote'; player: PlayerId; instanceId: string; card: CardId }
  | { type: 'refreshRow'; player: PlayerId; row: RowId }
  | { type: 'discardCard'; player: PlayerId; instanceId: string };

export type StressCause =
  'repeatSpace' | 'overtime' | 'oldAge' | 'overload' | 'discard' | 'upkeepFailure' | 'card';

export type GameEvent =
  | { type: 'gameCreated'; seed: string; players: PlayerId[]; lifeGoals: CardId[] }
  | { type: 'childTraitChosen'; player: PlayerId; card: CardId }
  | { type: 'roundStarted'; round: number; stage: Stage }
  | { type: 'marketRefilled'; row: RowId; slots: (CardId | null)[] }
  /** A single market slot refilled after a card was taken (R-A-01). */
  | { type: 'slotRefilled'; row: RowId; slot: number; card: CardId | null }
  | { type: 'timeSet'; player: PlayerId; time: number }
  | { type: 'timePlaced'; player: PlayerId; space: BoardSpaceId }
  | { type: 'resourcesGained'; player: PlayerId; gained: Partial<Resources> }
  | { type: 'paid'; player: PlayerId; resources: Partial<Resources>; time: number }
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
  | {
      type: 'cardTaken';
      player: PlayerId;
      cardId: CardId;
      instanceId: string;
      level: number | null;
      /** Partner version (R-REL-05), `null` for other cards. */
      version: 0 | 1 | null;
    }
  | { type: 'groupRoleTaken'; player: PlayerId; instanceId: string; role: number }
  | { type: 'levelReached'; player: PlayerId; instanceId: string; cardId: CardId; level: number }
  | { type: 'promoted'; player: PlayerId; from: CardId; to: CardId }
  | { type: 'upkeepPaid'; player: PlayerId; instanceId: string; cardId: CardId }
  | { type: 'upkeepRefused'; player: PlayerId; cardId: CardId }
  | { type: 'cardArchived'; player: PlayerId; cardId: CardId }
  | { type: 'lifeGoalScored'; card: CardId; player: PlayerId; lth: number }
  | { type: 'playerDied'; player: PlayerId; round: number; cause: DeathCause }
  | { type: 'roundEnding'; round: number }
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
  | { code: 'missingChoice' }
  | { code: 'unexpectedChoice' }
  | { code: 'cardNotInMarket' }
  | { code: 'wrongCardKind' }
  | { code: 'invalidLevel' }
  | { code: 'invalidRole' }
  | { code: 'roleTaken' }
  | { code: 'roleLimit' }
  | { code: 'cannotAfford' }
  | { code: 'requirementNotMet' }
  | { code: 'maxLevel' }
  | { code: 'noPromotionAvailable' }
  | { code: 'invalidSthAllocation' }
  | { code: 'wouldDie' }
  | { code: 'rowUnavailable' }
  | { code: 'notInTableau' };

export class IllegalActionError extends Error {
  readonly action: Action;
  readonly reasons: IllegalReason[];

  constructor(action: Action, reasons: IllegalReason[]) {
    super(`Illegal action ${action.type}: ${reasons.map((r) => r.code).join(', ')}`);
    this.name = 'IllegalActionError';
    this.action = action;
    this.reasons = reasons;
  }
}
