import { describe, expect, it } from 'vitest';
import type { BoardSpaceId, RowId } from '../content/index.ts';
import { explainIllegal, getLegalActions } from './game.ts';
import { previewAction } from './preview.ts';
import {
  act,
  content,
  edit,
  finishRound,
  place,
  playerOf,
  rules,
  startedGame,
  tableauCard,
} from './testing.ts';
import type { Action, GameState, PlayerState, Resources, SpaceChoice } from './types.ts';

const P = 'core-test.project.';
const RUNES = `${P}study_runes`;
const ARCHERY = `${P}archery_contest`;
const HUNT = `${P}dragon_hunt`;
const HORSE = 'core-test.item.horse';
const COTTAGE = 'core-test.item.cottage';
const FEAST = 'core-test.activity.feast';
const SCI1 = 'core-test.job.science_l1';
const SCI2 = 'core-test.job.science_l2';
const ARTS2 = 'core-test.job.arts_l2';
const SCRIBE = 'core-test.partner.court_scribe';
const BARD = 'core-test.partner.wandering_bard';

const NONE: Resources = { knowledge: 0, creativity: 0, influence: 0, money: 0 };

/**
 * Round 2 (Adulthood), Action phase, p0 to act; no Child Traits, no resources, Stress at start.
 * `arrange` adjusts the draft: market slots, resources, tableau…
 */
function adultGame(players = 1, arrange: (d: GameState) => void = () => undefined): GameState {
  return edit(finishRound(startedGame(players)), (d) => {
    for (const p of d.players) {
      p.childTrait = null;
      p.resources = { ...NONE };
    }
    d.firstPlayer = 'p0';
    d.current = 'p0';
    arrange(d);
  });
}

function p(d: GameState, index = 0): PlayerState {
  const player = d.players[index];
  if (!player) throw new Error('no player');
  return player;
}

function setMarket(d: GameState, row: RowId, slots: (string | null)[]): void {
  d.market[row].slots = slots;
}

type SthAllocation = Extract<Action, { type: 'advanceProject' }>['sthAllocation'];

const choose = (player: string, space: BoardSpaceId, choice: SpaceChoice) =>
  ({ type: 'placeTime', player, space, choice }) as const satisfies Action;

const takeProject = (choice: SpaceChoice, player = 'p0') => choose(player, 'takeProject', choice);

function upkeepUntilAction(state: GameState, decide: (s: GameState) => Action): GameState {
  let next = state;
  while (next.phase === 'upkeep') next = act(next, decide(next));
  return next;
}

const payAll = (s: GameState): Action => {
  if (s.pending?.type !== 'upkeep') throw new Error('not in upkeep');
  return { type: 'payUpkeep', player: s.pending.player, instanceId: s.pending.remaining[0] ?? '' };
};

describe('basic projects', () => {
  it('R-A-PROJECT, R-PRJ-B-01, R-A-01: take pays L1, gains L1, and refills the market slot', () => {
    const state = adultGame(1, (d) => {
      setMarket(d, 'projects', [RUNES, ARCHERY, HUNT]);
      p(d).resources.knowledge = 1;
    });
    const next = act(state, takeProject({ kind: 'project', card: RUNES }));
    const p0 = playerOf(next, 'p0');
    expect(p0.resources).toMatchObject({ knowledge: 0, creativity: 2 });
    expect(p0.tableau).toMatchObject([{ cardId: RUNES, level: 1 }]);
    expect(next.market.projects.slots[0]).not.toBeNull();
    expect(next.market.projects.slots[0]).not.toBe(RUNES);
    expect(next.placements.takeProject).toEqual(['p0']);
  });

  it('R-PRJ-01: taking a slot card with full slots costs 1 Stress', () => {
    const state = adultGame(1, (d) => {
      setMarket(d, 'projects', [RUNES, ARCHERY, HUNT]);
      p(d).resources.knowledge = 1;
      p(d).tableau = [
        tableauCard('a', `${P}forge_blade`),
        tableauCard('b', `${P}court_poetry`),
        tableauCard('c', SCI1, { level: null }),
      ];
    });
    expect(playerOf(act(state, takeProject({ kind: 'project', card: RUNES })), 'p0').stress).toBe(
      4,
    );
  });

  it('R-PRJ-B-02: advancing places the level Time, pays its cost and moves one level', () => {
    const state = adultGame(1, (d) => {
      p(d).tableau = [tableauCard('r', RUNES, { level: 2 })];
      p(d).resources = { ...NONE, knowledge: 2, influence: 1 };
    });
    const advance: Action = {
      type: 'advanceProject',
      player: 'p0',
      instanceId: 'r',
      sthAllocation: {},
    };
    const next = act(state, advance);
    expect(playerOf(next, 'p0')).toMatchObject({
      time: 5,
      resources: NONE,
      lth: 3,
      tableau: [{ level: 3 }],
    });
    expect(explainIllegal(next, content, advance)).toEqual([{ code: 'cannotAfford' }]);
    const tired = edit(next, (d) => {
      p(d).time = 1;
      p(d).resources = { knowledge: 9, creativity: 9, influence: 9, money: 9 };
    });
    expect(explainIllegal(tired, content, advance)).toEqual([{ code: 'noTime' }]);
  });

  it('R-STH-02: STH discounts (positive) or surcharges (negative) the advance cost', () => {
    const base = (sth: number, resources: Resources) =>
      adultGame(1, (d) => {
        p(d).tableau = [tableauCard('r', RUNES, { level: 2 })];
        p(d).resources = resources;
        p(d).sth = sth;
      });
    const happy = base(2, { ...NONE, knowledge: 1 });
    const options = getLegalActions(happy, content, 'p0').filter(
      (a) => a.type === 'advanceProject',
    );
    expect(options).toEqual([
      {
        type: 'advanceProject',
        player: 'p0',
        instanceId: 'r',
        sthAllocation: { knowledge: 1, influence: 1 },
      },
    ]);
    const sad = base(-1, { ...NONE, knowledge: 2, influence: 1, money: 1 });
    const pay = (sthAllocation: SthAllocation): Action => ({
      type: 'advanceProject',
      player: 'p0',
      instanceId: 'r',
      sthAllocation,
    });
    expect(playerOf(act(sad, pay({ money: 1 })), 'p0').resources).toEqual(NONE);
    expect(explainIllegal(sad, content, pay({}))).toEqual([{ code: 'invalidSthAllocation' }]);
  });

  it('R-PRJ-B-03: completing L4 sets the card aside and frees its slot', () => {
    const state = adultGame(1, (d) => {
      p(d).tableau = [tableauCard('r', RUNES, { level: 3 })];
      p(d).resources = { ...NONE, knowledge: 2, creativity: 2 };
    });
    const next = act(state, {
      type: 'advanceProject',
      player: 'p0',
      instanceId: 'r',
      sthAllocation: {},
    });
    expect(playerOf(next, 'p0')).toMatchObject({
      tableau: [],
      archive: [{ cardId: RUNES }],
      lth: 6,
      time: 4,
    });
    expect(
      explainIllegal(state, content, {
        type: 'advanceProject',
        player: 'p0',
        instanceId: 'zz',
        sthAllocation: {},
      }),
    ).toEqual([{ code: 'notInTableau' }]);
  });
});

describe('single-round & group projects', () => {
  it('R-PRJ-S-01, R-END-02: choose any level; set aside at the end of the round', () => {
    const state = adultGame(1, (d) => {
      setMarket(d, 'projects', [ARCHERY, RUNES, HUNT]);
      p(d).resources = { ...NONE, creativity: 4, knowledge: 2 };
    });
    expect(explainIllegal(state, content, takeProject({ kind: 'project', card: ARCHERY }))).toEqual(
      [{ code: 'invalidLevel' }],
    );
    const next = act(state, takeProject({ kind: 'project', card: ARCHERY, level: 3 }));
    expect(playerOf(next, 'p0')).toMatchObject({ lth: 3, resources: NONE, stress: 3 });
    const after = finishRound(next);
    expect(playerOf(after, 'p0')).toMatchObject({
      tableau: [],
      archive: [{ cardId: ARCHERY, round: 2 }],
    });
  });

  it('R-PRJ-G-01, R-PRJ-G-04: starting a Group Project moves the marker onto the card and takes no slot', () => {
    const state = adultGame(2, (d) => {
      setMarket(d, 'projects', [HUNT, RUNES, ARCHERY]);
      p(d).resources.influence = 4;
      p(d).tableau = [tableauCard('a', RUNES), tableauCard('b', RUNES), tableauCard('c', RUNES)];
    });
    const next = act(state, takeProject({ kind: 'project', card: HUNT, role: 2 }));
    const p0 = playerOf(next, 'p0');
    expect(next.placements.takeProject).toEqual([]);
    expect(p0).toMatchObject({ stress: 3, lth: 1, resources: { influence: 2 } });
    expect(p0.tableau.at(-1)).toMatchObject({ cardId: HUNT, roles: [null, null, 'p0', null] });
  });

  it('R-PRJ-G-01: already on Take Project ⇒ +1 Stress when starting a Group Project', () => {
    const state = adultGame(1, (d) => {
      setMarket(d, 'projects', [HUNT, ARCHERY, RUNES]);
      p(d).resources = { ...NONE, influence: 2, creativity: 1 };
    });
    const once = act(state, takeProject({ kind: 'project', card: ARCHERY, level: 1 }));
    const twice = act(once, takeProject({ kind: 'project', card: HUNT, role: 0 }));
    expect(playerOf(twice, 'p0').stress).toBe(4);
  });

  it('R-PRJ-G-02, R-PRJ-G-03, R-END-01: others join; each role pays bonus tiers 1…N', () => {
    let state = adultGame(2, (d) => {
      setMarket(d, 'projects', [HUNT, ARCHERY, RUNES]);
      p(d, 0).resources.influence = 4;
      p(d, 1).resources.influence = 4;
    });
    state = act(state, takeProject({ kind: 'project', card: HUNT, role: 0 }));
    const hunt = playerOf(state, 'p0').tableau[0]?.instanceId ?? '';
    const join = (player: string, role: number) =>
      takeProject({ kind: 'joinGroup', owner: 'p0', instanceId: hunt, role }, player);
    expect(explainIllegal(state, content, join('p1', 0))).toEqual([{ code: 'roleTaken' }]);
    state = act(state, join('p1', 1));
    state = act(state, join('p0', 2));
    state = act(state, join('p1', 3));
    expect(state.placements.takeProject).toEqual([]);
    const capped = edit(state, (d) => {
      const entry = p(d, 0).tableau[0];
      if (entry?.roles) entry.roles[3] = null;
      d.current = 'p0';
    });
    expect(explainIllegal(capped, content, join('p0', 3))).toEqual([{ code: 'roleLimit' }]);

    const before = state.players.map((x) => ({
      lth: x.lth,
      money: x.resources.money,
      influence: x.resources.influence,
    }));
    const after = finishRound(state);
    // 4 roles covered: each role gets money 1 + lth 1 + influence 1 + lth 2; each player holds 2 roles.
    for (const [i, x] of after.players.entries()) {
      expect(x.lth - (before[i]?.lth ?? 0)).toBe(2 * 3);
      expect(x.resources.influence - (before[i]?.influence ?? 0)).toBeGreaterThanOrEqual(2);
    }
    expect(playerOf(after, 'p0').archive).toMatchObject([{ cardId: HUNT }]);
    expect(playerOf(after, 'p1').archive).toEqual([]);
  });
});

describe('items & activities', () => {
  it('R-A-SPEND, R-ITM-01: choose a level, pay, gain', () => {
    const state = adultGame(1, (d) => {
      setMarket(d, 'itemsActivities', [HORSE, FEAST, COTTAGE]);
      p(d).resources.money = 5;
    });
    const next = act(state, choose('p0', 'spend', { kind: 'spend', card: HORSE, level: 2 }));
    expect(playerOf(next, 'p0')).toMatchObject({ resources: { money: 0, influence: 2 }, lth: 2 });
    expect(
      explainIllegal(
        state,
        content,
        choose('p0', 'spend', { kind: 'spend', card: HORSE, level: 3 }),
      ),
    ).toEqual([{ code: 'invalidLevel' }]);
  });

  it('R-ITM-02, R-UPK-06: item upkeep is paid every following Upkeep', () => {
    const state = adultGame(1, (d) => {
      p(d).tableau = [tableauCard('h', HORSE, { level: 2 })];
      p(d).resources.money = 2;
    });
    const upkeep = finishRound(state);
    expect(upkeep).toMatchObject({
      phase: 'upkeep',
      pending: { type: 'upkeep', player: 'p0', remaining: ['h'] },
    });
    expect(getLegalActions(upkeep, content, 'p0')).toEqual([
      { type: 'payUpkeep', player: 'p0', instanceId: 'h' },
      { type: 'refuseUpkeep', player: 'p0', instanceId: 'h' },
    ]);
    const paid = act(upkeep, { type: 'payUpkeep', player: 'p0', instanceId: 'h' });
    expect(paid).toMatchObject({ phase: 'action', current: 'p0', pending: null });
    const money = playerOf(upkeep, 'p0').resources.money;
    expect(playerOf(paid, 'p0')).toMatchObject({ resources: { money: money - 2 }, lth: 1 });
  });

  it('R-ITM-03, R-END-02: activities are set aside at the end of the round', () => {
    const state = adultGame(1, (d) => {
      setMarket(d, 'itemsActivities', [FEAST, HORSE, COTTAGE]);
      p(d).resources.money = 5;
      p(d).stress = 4;
    });
    const next = act(state, choose('p0', 'spend', { kind: 'spend', card: FEAST, level: 3 }));
    expect(playerOf(next, 'p0')).toMatchObject({ sth: 2, lth: 3, stress: 3 });
    expect(playerOf(finishRound(next), 'p0').archive).toMatchObject([{ cardId: FEAST }]);
  });
});

describe('jobs', () => {
  it('R-A-JOB, R-JOB-02, R-A-01: hire cost and reward; the Jobs slot is not refilled; one Job at a time', () => {
    const state = adultGame(1, (d) => {
      setMarket(d, 'jobs', [SCI1, ARTS2]);
      p(d).resources = { ...NONE, knowledge: 4, creativity: 6 };
    });
    const hired = act(state, choose('p0', 'getJob', { kind: 'job', card: SCI1 }));
    expect(hired.market.jobs.slots).toEqual([null, ARTS2]);
    expect(playerOf(hired, 'p0')).toMatchObject({ resources: { knowledge: 0, money: 6 } });
    const switched = act(hired, choose('p0', 'getJob', { kind: 'job', card: ARTS2 }));
    expect(playerOf(switched, 'p0').tableau.map((c) => c.cardId)).toEqual([ARTS2]);
    expect(switched.market.jobs.discard).toContain(SCI1);
    expect(playerOf(switched, 'p0').stress).toBe(3 + rules.repeatSpaceStress);
  });

  it('R-JOB-03, R-UPK-07: upkeep pays Time + resources for income; refusing gets you fired', () => {
    const state = adultGame(1, (d) => {
      p(d).tableau = [tableauCard('j', SCI1, { level: null })];
      p(d).resources.knowledge = 1;
    });
    const upkeep = finishRound(state);
    const before = playerOf(upkeep, 'p0').resources;
    const paid = act(upkeep, { type: 'payUpkeep', player: 'p0', instanceId: 'j' });
    expect(playerOf(paid, 'p0')).toMatchObject({
      time: 5,
      resources: { knowledge: before.knowledge - 1, money: before.money + 6 },
    });

    const fired = act(upkeep, { type: 'refuseUpkeep', player: 'p0', instanceId: 'j' });
    expect(playerOf(fired, 'p0')).toMatchObject({ tableau: [], stress: 4, sth: -1, time: 6 });
    expect(fired.market.jobs.discard).toContain(SCI1);

    const broke = edit(upkeep, (d) => (p(d).resources.knowledge = 0));
    expect(
      explainIllegal(broke, content, { type: 'payUpkeep', player: 'p0', instanceId: 'j' }),
    ).toEqual([{ code: 'cannotAfford' }]);
  });

  it('R-JOB-04: promotion to the next level of the same track; no hire reward', () => {
    const state = adultGame(1, (d) => {
      setMarket(d, 'jobs', [SCI2, ARTS2]);
      p(d).tableau = [tableauCard('j', SCI1, { level: null })];
      p(d).resources.knowledge = 4;
    });
    expect(getLegalActions(state, content, 'p0').filter((a) => a.type === 'promote')).toEqual([
      { type: 'promote', player: 'p0', instanceId: 'j', card: SCI2 },
    ]);
    expect(
      explainIllegal(state, content, {
        type: 'promote',
        player: 'p0',
        instanceId: 'j',
        card: ARTS2,
      }),
    ).toEqual([{ code: 'noPromotionAvailable' }]);
    const next = act(state, { type: 'promote', player: 'p0', instanceId: 'j', card: SCI2 });
    const p0 = playerOf(next, 'p0');
    expect(p0).toMatchObject({ time: 5, lth: 3, resources: { knowledge: 0, money: 2 } });
    expect(p0.tableau.map((c) => c.cardId)).toEqual([SCI2]);
    expect(next.market.jobs.slots).toEqual([null, ARTS2]);
    expect(next.placements.getJob).toEqual([]);
  });
});

describe('partners', () => {
  it('R-A-REL, R-REL-01, R-REL-05: start at Date in the chosen version', () => {
    const state = adultGame(1, (d) => {
      setMarket(d, 'partners', [SCRIBE, BARD]);
    });
    const next = act(
      state,
      choose('p0', 'developRelationship', { kind: 'startRelationship', card: SCRIBE, version: 1 }),
    );
    expect(playerOf(next, 'p0')).toMatchObject({
      tableau: [{ cardId: SCRIBE, level: 1, version: 1 }],
      sth: 1,
      resources: { creativity: 1 },
    });
  });

  it('R-REL-02: a second concurrent Partner costs 1 Stress', () => {
    const state = adultGame(1, (d) => {
      setMarket(d, 'partners', [SCRIBE, BARD]);
      p(d).tableau = [tableauCard('s', SCRIBE)];
    });
    const next = act(
      state,
      choose('p0', 'developRelationship', { kind: 'startRelationship', card: BARD, version: 0 }),
    );
    expect(playerOf(next, 'p0').stress).toBe(4);
  });

  it('R-REL-03: advancing needs the next level requirement (held, not paid), one level at a time', () => {
    const advance = choose('p0', 'developRelationship', {
      kind: 'advanceRelationship',
      instanceId: 's',
    });
    const poor = adultGame(1, (d) => {
      p(d).tableau = [tableauCard('s', SCRIBE)];
      p(d).resources.knowledge = 3;
    });
    expect(explainIllegal(poor, content, advance)).toEqual([{ code: 'requirementNotMet' }]);
    const rich = edit(poor, (d) => (p(d).resources.knowledge = 4));
    const next = act(rich, advance);
    expect(playerOf(next, 'p0')).toMatchObject({
      resources: { knowledge: 4 },
      lth: 2,
      tableau: [{ level: 2 }],
    });
    const top = edit(rich, (d) => {
      const entry = p(d).tableau[0];
      if (entry) entry.level = 4;
    });
    expect(explainIllegal(top, content, advance)).toEqual([{ code: 'maxLevel' }]);
  });

  it('R-REL-04, R-UPK-06: Partner upkeep (with Time) grows with level; rewards can fund later upkeep', () => {
    const state = adultGame(1, (d) => {
      p(d).tableau = [
        tableauCard('s', SCRIBE, { level: 3 }),
        tableauCard('j', SCI1, { level: null }),
      ];
      p(d).resources.knowledge = 1;
    });
    const upkeep = finishRound(state);
    // Pay the Job first: its income funds the Partner's money upkeep.
    const broke = edit(upkeep, (d) => (p(d).resources.money = 0));
    expect(
      explainIllegal(broke, content, { type: 'payUpkeep', player: 'p0', instanceId: 's' }),
    ).toEqual([{ code: 'cannotAfford' }]);
    let next = act(broke, { type: 'payUpkeep', player: 'p0', instanceId: 'j' });
    next = act(next, { type: 'payUpkeep', player: 'p0', instanceId: 's' });
    expect(playerOf(next, 'p0')).toMatchObject({ time: 4, resources: { money: 5 }, lth: 1 });
    expect(next.phase).toBe('action');
  });

  it('R-UPK-06: players resolve upkeep one after another, starting with the first player', () => {
    const state = adultGame(2, (d) => {
      p(d, 0).tableau = [tableauCard('a', HORSE, { level: 2 })];
      p(d, 1).tableau = [tableauCard('b', HORSE, { level: 2 })];
      p(d, 0).resources.money = 2;
      p(d, 1).resources.money = 2;
    });
    const upkeep = finishRound(state);
    expect(upkeep.pending).toMatchObject({ type: 'upkeep', player: 'p1', queue: ['p0'] });
    const done = upkeepUntilAction(upkeep, payAll);
    expect(done.players.map((x) => x.lth)).toEqual([1, 1]);
  });
});

describe('child traits & life goals', () => {
  it('R-CHT-01: a Child Trait ability fires on its board space', () => {
    const state = adultGame(1, (d) => (p(d).childTrait = 'core-test.trait.scholar'));
    expect(playerOf(place(state, 'study'), 'p0').resources.knowledge).toBe(3 + 1);
    expect(playerOf(place(state, 'play'), 'p0').resources.knowledge).toBe(0);
  });

  it('R-LG-01: each goal goes to the single best player; ties and zeros give nothing', () => {
    const ended = (money: number[], knowledge: number[]) =>
      edit(adultGame(2), (d) => {
        d.lifeGoals = ['core-test.goal.hoarder', 'core-test.goal.sage'];
        d.players.forEach((x, i) => {
          x.resources = { ...NONE, money: money[i] ?? 0, knowledge: knowledge[i] ?? 0 };
          x.stress = 14;
        });
        d.round = 8;
      });
    const kill = (s: GameState) =>
      finishRound(
        edit(s, (d) => (d.current = 'p0')),
        (x) => ({
          type: 'placeTime',
          player: x.current ?? '',
          space: 'study',
        }),
      );
    const unique = kill(ended([3, 1], [2, 2]));
    expect(unique.result?.lifeGoals).toEqual([
      { card: 'core-test.goal.hoarder', winner: 'p0', values: { p0: 3, p1: 1 } },
      { card: 'core-test.goal.sage', winner: null, values: { p0: 5, p1: 5 } },
    ]);
    expect(playerOf(unique, 'p0').lthBySource.lifeGoals).toBe(5);
  });

  it('R-SOLO-02, R-SOLO-03: solo wins with all three goals and enough LTH; the score is always reported', () => {
    const solo = (lth: number) =>
      edit(adultGame(1), (d) => {
        d.lifeGoals = ['core-test.goal.hoarder', 'core-test.goal.sage', 'core-test.goal.long_life'];
        p(d).resources = { ...NONE, money: 10, knowledge: 10 };
        p(d).lth = lth;
        p(d).stress = 0;
        d.round = 8;
      });
    const end = (s: GameState) => finishRound(s);
    const won = end(solo(rules.solo.winLth));
    expect(won.result?.solo).toEqual({
      achieved: ['core-test.goal.hoarder', 'core-test.goal.sage', 'core-test.goal.long_life'],
      won: true,
    });
    expect(end(solo(10)).result?.solo?.won).toBe(false);
    expect(end(solo(10)).result?.standings[0]?.lth).toBeGreaterThan(0);
  });
});

describe('previewAction', () => {
  it('reports the action’s own effect and the reasons when illegal', () => {
    const state = adultGame(1, (d) => {
      setMarket(d, 'itemsActivities', [HORSE, FEAST, COTTAGE]);
      p(d).resources.money = 5;
    });
    expect(
      previewAction(
        state,
        content,
        choose('p0', 'spend', { kind: 'spend', card: HORSE, level: 2 }),
      ),
    ).toEqual({
      legal: true,
      players: {
        p0: {
          resources: { money: -5, influence: 2 },
          time: -1,
          stress: 0,
          sth: 0,
          lth: 2,
          died: false,
        },
      },
    });
    expect(
      previewAction(state, content, { type: 'placeTime', player: 'p0', space: 'getJob' }),
    ).toEqual({
      legal: false,
      reasons: [{ code: 'missingChoice' }],
    });
  });

  it('ignores what happens after the round ends', () => {
    const last = edit(adultGame(1), (d) => (p(d).time = 1));
    const preview = previewAction(last, content, {
      type: 'placeTime',
      player: 'p0',
      space: 'study',
    });
    expect(preview).toEqual({
      legal: true,
      players: {
        p0: { resources: { knowledge: 3 }, time: -1, stress: 0, sth: 0, lth: 0, died: false },
      },
    });
  });
});
