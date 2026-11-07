import { useEffect, useRef, useState } from 'preact/hooks';
import { BOARD_SPACES, ROWS, RESOURCES, type BoardSpaceId } from '../../content/index.ts';
import {
  isOneRound,
  isSpaceOpen,
  stageOf,
  trackLength,
  zoneIndexAt,
  type GameState,
  type PlayerState,
  type TableauCard,
} from '../../engine/index.ts';
import { cardName, content, pt } from '../content.ts';
import { t, type MessageKey } from '../i18n/index.ts';
import type { Options } from '../options.ts';
import { currentHint, dismissHint } from '../hints.ts';
import { go } from '../nav.ts';
import {
  canUndo,
  isHumanTurn,
  leaveGame,
  skipAhead,
  undo,
  type Profile,
  type Session,
} from '../session.ts';
import { settings, updateSettings } from '../settings.ts';
import { chronicle } from '../story.ts';
import { CardView } from './CardView.tsx';
import { Chips, Icon } from './Icons.tsx';
import { AdvanceOption, OptionButton } from './OptionButton.tsx';
import { ProfileShield } from './Shield.tsx';

const CARD_SPACES: readonly BoardSpaceId[] = [
  'takeProject',
  'spend',
  'getJob',
  'developRelationship',
];

function RoundTrack({ state }: { state: GameState }) {
  const { rules } = content;
  return (
    <ol class="round-track" aria-label={t('board.round', { n: state.round })}>
      {Array.from({ length: rules.maxRounds }, (_, i) => {
        const round = i + 1;
        const stage = stageOf(rules, round);
        const oldAge = rules.oldAgeStress[String(round)];
        return (
          <li
            key={round}
            class={`chapter stage-${stage}${round === state.round ? ' chapter-current' : ''}${round < state.round ? ' chapter-past' : ''}`}
            aria-current={round === state.round ? 'step' : undefined}
          >
            <span class="chapter-n">{round}</span>
            <span class="chapter-stage">{pt(`stage.${stage}`)}</span>
            {oldAge !== undefined && (
              <span class="chapter-old">{t('board.oldAgeStress', { n: oldAge })}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function TurnStatus({ session }: { session: Session }) {
  const { state, human, profiles } = session;
  const me = state.players.find((p) => p.id === human);
  const actor = state.pending?.player ?? state.current;
  const status =
    actor === human
      ? t('board.turnYou')
      : t('board.turnBot', { name: actor ? (profiles[actor]?.name ?? '') : '' });
  return (
    <div class="turn-status">
      <p class={`turn${actor === human ? ' turn-you' : ''}`} role="status">
        {status}
      </p>
      <label class="toggle">
        <input
          type="checkbox"
          checked={settings.value.fastBots}
          onChange={(e) => {
            updateSettings({ fastBots: e.currentTarget.checked });
          }}
        />
        {t('board.speed')}
      </label>
      <div class="turn-actions">
        <button
          type="button"
          class="secondary small"
          disabled={!canUndo.value}
          title={t('board.undoHint')}
          onClick={undo}
        >
          {t('board.undo')}
        </button>
        <button
          type="button"
          class="secondary small"
          title={t('board.toTitleHint')}
          onClick={() => {
            leaveGame();
            go({ kind: 'title' });
          }}
        >
          {t('board.toTitle')}
        </button>
      </div>
      {me && !me.alive && (
        <>
          <p class="hint">
            {t(`board.dead.${profiles[human]?.gender ?? 'f'}`, {
              name: profiles[human]?.name ?? '',
            })}
          </p>
          <button type="button" class="secondary fast-forward" onClick={skipAhead}>
            {t('board.fastForward')}
          </button>
        </>
      )}
    </div>
  );
}

function Occupants({
  ids,
  profiles,
}: {
  ids: readonly string[];
  profiles: Record<string, Profile>;
}) {
  if (ids.length === 0) return null;
  return (
    <span class="occupants">
      {ids.map((id, i) => {
        const profile = profiles[id];
        return profile ? (
          <ProfileShield key={`${id}-${String(i)}`} profile={profile} size={16} />
        ) : null;
      })}
    </span>
  );
}

function ActionSpaces({ session, options }: { session: Session; options: Options }) {
  const { state, profiles, human } = session;
  const stage = stageOf(content.rules, state.round);
  const mine = (space: BoardSpaceId) => state.placements[space].includes(human);
  return (
    <section class="margin-block" aria-labelledby="spaces-heading">
      <h2 id="spaces-heading" class="rubric">
        {t('board.actions')}
      </h2>
      <ul class="spaces">
        {BOARD_SPACES.map((space) => {
          const open = isSpaceOpen(space, stage);
          const option = options.spaces[space];
          const isCard = CARD_SPACES.includes(space);
          return (
            <li key={space} class={`space${open ? '' : ' space-locked'}`}>
              {option ? (
                <OptionButton state={state} option={option} />
              ) : (
                <div class="space-static">
                  <span class="space-name">{pt(`space.${space}`)}</span>
                  <span class="hint">
                    {!open
                      ? t('reason.spaceLocked')
                      : isCard && isHumanTurn.value
                        ? t('board.chooseCard')
                        : ''}
                  </span>
                </div>
              )}
              {mine(space) && open && isHumanTurn.value && (
                <span class="hint warn">{t('board.repeatStress')}</span>
              )}
              <Occupants ids={state.placements[space]} profiles={profiles} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Market({ session, options }: { session: Session; options: Options }) {
  const { state, profiles } = session;
  const [selected, setSelected] = useState<string | null>(null);
  const groups = state.players.flatMap((p) =>
    p.tableau.filter((c) => c.roles !== null).map((entry) => ({ owner: p, entry })),
  );
  return (
    <section class="market" aria-labelledby="market-heading">
      <h2 id="market-heading" class="rubric">
        {t('board.market')}
      </h2>
      {groups.length > 0 && (
        <div class="market-row">
          <h3 class="row-heading">{t('kind.groupProject')}</h3>
          <div class="row-cards">
            {groups.map(({ entry }) => (
              <CardView
                key={entry.instanceId}
                cardId={entry.cardId}
                entry={entry}
                profiles={profiles}
              >
                <OptionList state={state} options={options.tableau.get(entry.instanceId) ?? []} />
              </CardView>
            ))}
          </div>
        </div>
      )}
      {ROWS.map((row) => {
        const slots = state.market[row].slots;
        const refresh = options.refresh[row];
        return (
          <div key={row} class="market-row">
            <div class="row-head">
              <h3 class="row-heading">{t(`board.row.${row}`)}</h3>
              {refresh && refresh.legal && <OptionButton state={state} option={refresh} />}
            </div>
            {slots.filter((c) => c !== null).length === 0 ? (
              <p class="hint">{t('board.rowEmpty')}</p>
            ) : (
              <div class="row-cards">
                {slots.map((cardId, i) =>
                  cardId === null ? (
                    <div key={`empty-${String(i)}`} class="card card-empty" aria-hidden="true" />
                  ) : (
                    <CardView
                      key={cardId}
                      cardId={cardId}
                      selected={selected === cardId}
                      onSelect={() => {
                        setSelected(selected === cardId ? null : cardId);
                      }}
                    >
                      {selected === cardId && (
                        <OptionList state={state} options={options.market.get(cardId) ?? []} />
                      )}
                    </CardView>
                  ),
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function OptionList({ state, options }: { state: GameState; options: Options['traits'] }) {
  if (options.length === 0) return null;
  const advance = options.filter((o) => o.action.type === 'advanceProject');
  const rest = options.filter((o) => o.action.type !== 'advanceProject');
  return (
    <div class="options">
      {advance.length > 0 && <AdvanceOption state={state} options={advance} />}
      {rest.map((option, i) => (
        <OptionButton key={i} state={state} option={option} />
      ))}
    </div>
  );
}

function StressTrack({ player }: { player: PlayerState }) {
  const { rules } = content;
  const zone = rules.stressZones[zoneIndexAt(rules, player.stress)];
  const modifier = zone ? zone.timeModifier : 0;
  return (
    <div class="track">
      <span class="track-label">
        <Icon term="stress" /> {t('board.stressTrack')}
      </span>
      <ol
        class="stress-cells"
        aria-label={`${t('board.stressTrack')}: ${String(player.stress + 1)} / ${String(trackLength(rules))}`}
      >
        {Array.from({ length: trackLength(rules) }, (_, i) => (
          <li
            key={i}
            class={`cell zone-${String(zoneIndexAt(rules, i))}${i === player.stress ? ' cell-here' : ''}`}
          />
        ))}
      </ol>
      <span class="track-note">
        {t('board.zone', {
          zone: zone ? pt(`zone.${zone.id}`) : '',
          modifier: `${modifier >= 0 ? '+' : ''}${String(modifier)}`,
        })}
      </span>
    </div>
  );
}

function SthTrack({ player }: { player: PlayerState }) {
  const range = content.rules.sthRange;
  return (
    <div class="track">
      <span class="track-label">
        <Icon term="sth" /> {t('board.sthTrack')}
      </span>
      <ol class="sth-cells" aria-label={`${t('board.sthTrack')}: ${String(player.sth)}`}>
        {Array.from({ length: range * 2 + 1 }, (_, i) => {
          const value = i - range;
          return (
            <li
              key={i}
              class={`cell${value === player.sth ? ' cell-here' : ''}${value === 0 ? ' cell-zero' : ''}`}
            >
              <span aria-hidden="true">{value === player.sth ? String(value) : ''}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Hero({ session, options }: { session: Session; options: Options }) {
  const { state, human, profiles } = session;
  const me = state.players.find((p) => p.id === human);
  const profile = profiles[human];
  if (!me || !profile) return null;
  const slots = me.tableau.filter((c) => {
    const kind = content.cards.get(c.cardId)?.kind;
    return kind === 'basicProject' || kind === 'job' || kind === 'partner';
  }).length;
  // Group Projects are shown with the market. Items never change level and one-round cards wait
  // for the End of Round, so both are shown apart as compact cards.
  const kindOf = (c: TableauCard) => content.cards.get(c.cardId)?.kind;
  const own = me.tableau.filter(
    (c) => c.roles === null && !isOneRound(content, c.cardId) && kindOf(c) !== 'item',
  );
  const items = me.tableau.filter((c) => kindOf(c) === 'item');
  const played = me.tableau.filter((c) => c.roles === null && isOneRound(content, c.cardId));
  return (
    <section class="hero" aria-labelledby="hero-heading">
      <header class="hero-head">
        <ProfileShield profile={profile} size={56} />
        <div>
          <h2 id="hero-heading" class="hero-name">
            {profile.name}
          </h2>
          {me.childTrait && <p class="hero-trait">{cardName(me.childTrait)}</p>}
        </div>
        <p class="lth-score">
          <Icon term="lth" size={28} />
          <span class="lth-value">{me.lth}</span>
          <span class="sr-only">{t('board.lth')}</span>
        </p>
      </header>
      <div class="hero-stats">
        <Chips bundle={Object.fromEntries(RESOURCES.map((r) => [r, me.resources[r]]))} empty="0" />
        <p class="candles">
          {Array.from({ length: me.time }, (_, i) => (
            <Icon key={i} term="time" size={20} />
          ))}
          <span class="sr-only">{`${t('board.time')}: ${String(me.time)}`}</span>
        </p>
      </div>
      <StressTrack player={me} />
      <SthTrack player={me} />
      <p class="hint">{t('board.slots', { used: slots, limit: content.rules.slotLimit })}</p>
      <h3 class="rubric small">{t('board.tableau')}</h3>
      {own.length === 0 ? (
        <p class="hint">
          {t(items.length + played.length === 0 ? 'board.tableauEmpty' : 'board.noDeeds')}
        </p>
      ) : (
        <div class="tableau">
          {own.map((entry) => (
            <CardView
              key={entry.instanceId}
              cardId={entry.cardId}
              entry={entry}
              profiles={profiles}
            >
              <OptionList state={state} options={options.tableau.get(entry.instanceId) ?? []} />
            </CardView>
          ))}
        </div>
      )}
      {items.length > 0 && (
        <>
          <h3 class="rubric small">{t('board.items')}</h3>
          <div class="tableau played">
            {items.map((entry) => (
              <CardView key={entry.instanceId} cardId={entry.cardId} entry={entry} compact>
                <OptionList state={state} options={options.tableau.get(entry.instanceId) ?? []} />
              </CardView>
            ))}
          </div>
        </>
      )}
      {played.length > 0 && (
        <>
          <h3 class="rubric small">{t('board.played')}</h3>
          <div class="tableau played">
            {played.map((entry) => (
              <CardView key={entry.instanceId} cardId={entry.cardId} entry={entry} compact />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Opponents({ session }: { session: Session }) {
  const { state, human, profiles } = session;
  const others = state.players.filter((p) => p.id !== human);
  if (others.length === 0) return null;
  return (
    <section class="margin-block" aria-labelledby="opponents-heading">
      <h2 id="opponents-heading" class="rubric">
        {t('board.opponents')}
      </h2>
      <ul class="opponents">
        {others.map((p) => {
          const profile = profiles[p.id];
          if (!profile) return null;
          const zone = content.rules.stressZones[zoneIndexAt(content.rules, p.stress)];
          return (
            <li
              key={p.id}
              class={`opponent${p.alive ? '' : ' opponent-dead'}${state.current === p.id ? ' opponent-acting' : ''}`}
            >
              <ProfileShield profile={profile} size={32} />
              <div class="opponent-body">
                <p class="opponent-name">
                  {profile.name} {!p.alive && <span aria-hidden="true">✝</span>}
                  <span class="opponent-lth">
                    <Icon term="lth" size={16} /> {p.lth}
                  </span>
                </p>
                <Chips
                  bundle={{
                    ...Object.fromEntries(RESOURCES.map((r) => [r, p.resources[r]])),
                    time: p.time,
                  }}
                  empty="0"
                />
                <p class="hint">
                  {[
                    `${t('board.stressTrack')}: ${zone ? pt(`zone.${zone.id}`) : ''}`,
                    ...p.tableau.map((c) => cardName(c.cardId)),
                  ].join(' · ')}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function LifeGoals({ state }: { state: GameState }) {
  const solo = state.players.length === 1;
  return (
    <section class="margin-block" aria-labelledby="goals-heading">
      <h2 id="goals-heading" class="rubric">
        {t('board.lifeGoals')}
      </h2>
      <ul class="goals">
        {state.lifeGoals.map((id) => {
          const goal = content.cards.get(id);
          return (
            <li key={id} class="goal">
              <span class="goal-name">{cardName(id)}</span>
              <span class="goal-text">{pt(`${id}.flavor`)}</span>
              {goal?.kind === 'lifeGoal' && (
                <span class="goal-award">
                  <Chips bundle={{ lth: goal.award.lth }} signed />
                  {solo && (
                    <span class="hint">{t('board.goalSolo', { n: goal.solo.atLeast })}</span>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Chronicle({ session }: { session: Session }) {
  const entries = chronicle(session.state, content, session.profiles);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    // Keep the newest lines in view without scrolling the page itself.
    const element = list.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [entries.length]);
  const last = entries.at(-1);
  return (
    <section class="chronicle" aria-labelledby="chronicle-heading">
      <h2 id="chronicle-heading" class="rubric">
        {t('board.chronicle')}
      </h2>
      <ol class="chronicle-list" ref={list} tabIndex={0} aria-labelledby="chronicle-heading">
        {entries.map((entry, i) => (
          <li
            key={i}
            class={
              entry.kind === 'chapter'
                ? 'chronicle-chapter'
                : `chronicle-line${entry.player === session.human ? ' mine' : ''}`
            }
          >
            {entry.text}
          </li>
        ))}
      </ol>
      <p class="sr-only" aria-live="polite">
        {last?.kind === 'line' ? last.text : ''}
      </p>
    </section>
  );
}

/** A first-game note in the margin; one at a time, each shown once (`hints.ts`). */
function HintNote({ session }: { session: Session }) {
  if (!settings.value.hints || !isHumanTurn.value || session.state.phase !== 'action') return null;
  const id = currentHint(session);
  if (!id) return null;
  const solo = session.state.players.length === 1;
  return (
    <aside class="hint-note" aria-labelledby="hint-heading">
      <h2 id="hint-heading" class="hint-note-heading">
        {t('hint.heading')}
      </h2>
      <p>
        {t(`hint.${id}` as MessageKey, {
          lth: content.rules.solo.winLth,
          goals: t(solo ? 'hint.goals.solo' : 'hint.goals.multi', {
            lth: content.rules.solo.winLth,
          }),
        })}
      </p>
      <div class="hint-note-actions">
        <button
          type="button"
          class="secondary small"
          onClick={() => {
            dismissHint(id);
          }}
        >
          {t('hint.ok')}
        </button>
        <button
          type="button"
          class="link"
          onClick={() => {
            updateSettings({ hints: false });
          }}
        >
          {t('hint.off')}
        </button>
      </div>
    </aside>
  );
}

export function Board({
  session,
  options,
  inert = false,
}: {
  session: Session;
  options: Options;
  inert?: boolean;
}) {
  const profile = session.profiles[session.human];
  return (
    <div class="spread" inert={inert}>
      <h1 class="sr-only">{t('board.heading', { name: profile?.name ?? '' })}</h1>
      <header class="masthead">
        <RoundTrack state={session.state} />
        <TurnStatus session={session} />
      </header>
      <aside class="margin margin-left">
        <ActionSpaces session={session} options={options} />
        <LifeGoals state={session.state} />
      </aside>
      <main class="page">
        <HintNote session={session} />
        <Market session={session} options={options} />
      </main>
      <aside class="margin margin-right">
        <Hero session={session} options={options} />
        <Opponents session={session} />
      </aside>
      <footer class="foot">
        <Chronicle session={session} />
      </footer>
    </div>
  );
}
