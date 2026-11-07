import { earnedAchievements, type LthSource } from '../../engine/index.ts';
import { earned } from '../achievements.ts';
import { cardName, content } from '../content.ts';
import { t } from '../i18n/index.ts';
import { history, records } from '../history.ts';
import { go } from '../nav.ts';
import { leaveGame, type Session } from '../session.ts';
import { biography } from '../story.ts';
import { Chronicle } from './Board.tsx';
import { AchievementList } from './Achievements.tsx';
import { ProfileShield } from './Shield.tsx';

const SOURCES: LthSource[] = [
  'projects',
  'itemsActivities',
  'jobs',
  'partners',
  'childTrait',
  'lifeGoals',
  'sthOverflow',
  'inheritance',
];

/** `archived`: a past life opened from the archive rather than the game just finished. */
export function EndScreen({ session, archived = false }: { session: Session; archived?: boolean }) {
  const { state, profiles, human } = session;
  const result = state.result;
  if (!result) return null;
  const nameOf = (id: string) => profiles[id]?.name ?? id;
  const me = state.players.find((p) => p.id === human);
  const profile = profiles[human];
  const lines = profile ? biography(state, content, human, profile) : [];
  const verdict = result.solo
    ? result.solo.won
      ? t('end.soloWon', { lth: me?.lth ?? 0 })
      : t('end.soloLost', { lth: me?.lth ?? 0, target: content.rules.solo.winLth })
    : result.winners.length === 1
      ? t(`end.winner.${profiles[result.winners[0] ?? '']?.gender ?? 'f'}`, {
          name: nameOf(result.winners[0] ?? ''),
        })
      : t('end.shared', { names: result.winners.map(nameOf).join(', ') });

  return (
    <main class="end-page">
      <header class="title-head">
        <p class="title-ornament" aria-hidden="true">
          ❦
        </p>
        <h1 class="title">{t('end.heading')}</h1>
        <p class="title-tagline">{verdict}</p>
        {!archived && <NewRecord session={session} />}
      </header>

      <div class="end-grid">
        <section class="folio" aria-labelledby="bio-heading">
          <h2 id="bio-heading" class="rubric">
            {t('end.biography')}
          </h2>
          <div class="biography">
            {lines.map((line, i) => (
              <p key={i} class={i === 0 ? 'initial' : undefined}>
                {line}
              </p>
            ))}
          </div>
        </section>

        <div class="end-side">
          <section class="folio" aria-labelledby="standings-heading">
            <h2 id="standings-heading" class="rubric">
              {t('end.standings')}
            </h2>
            <table class="ledger">
              <thead>
                <tr>
                  <th scope="col">{t('end.place')}</th>
                  <th scope="col">{t('end.player')}</th>
                  <th scope="col">{t('end.lth')}</th>
                  <th scope="col">{t('end.leftovers')}</th>
                </tr>
              </thead>
              <tbody>
                {result.standings.map((s, i) => {
                  const p = profiles[s.player];
                  return (
                    <tr key={s.player} class={s.player === human ? 'mine' : undefined}>
                      <td>{i + 1}</td>
                      <th scope="row" class="ledger-name">
                        {p && <ProfileShield profile={p} size={20} />} {nameOf(s.player)}
                      </th>
                      <td class="num">{s.lth}</td>
                      <td class="num">{s.leftovers}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section class="folio" aria-labelledby="sources-heading">
            <h2 id="sources-heading" class="rubric">
              {t('end.sources')}
            </h2>
            <table class="ledger">
              <thead>
                <tr>
                  <th scope="col" />
                  {state.players.map((p) => (
                    <th key={p.id} scope="col">
                      {nameOf(p.id)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SOURCES.filter((source) =>
                  state.players.some((p) => (p.lthBySource[source] ?? 0) !== 0),
                ).map((source) => (
                  <tr key={source}>
                    <th scope="row">{t(`end.source.${source}`)}</th>
                    {state.players.map((p) => (
                      <td key={p.id} class="num">
                        {p.lthBySource[source] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <LifeAchievements session={session} archived={archived} />

          <section class="folio" aria-labelledby="goals-end-heading">
            <h2 id="goals-end-heading" class="rubric">
              {t('end.goals')}
            </h2>
            <ul class="goals">
              {result.lifeGoals.map((g) => (
                <li key={g.card} class="goal">
                  <span class="goal-name">{cardName(g.card)}</span>
                  <span class="goal-text">{g.winner ? nameOf(g.winner) : t('end.goalNobody')}</span>
                </li>
              ))}
            </ul>
          </section>

          {archived ? (
            <button
              type="button"
              class="secondary"
              onClick={() => {
                go({ kind: 'history' });
              }}
            >
              {t('nav.history', { n: history.value.length })}
            </button>
          ) : (
            <button
              type="button"
              class="primary"
              onClick={() => {
                leaveGame();
                go({ kind: 'title' });
              }}
            >
              {t('end.again')}
            </button>
          )}
        </div>
      </div>

      <div class="end-chronicle">
        <Chronicle session={session} />
      </div>
    </main>
  );
}

/** «Личный рекорд» when this life beats every earlier one of its kind (solo / vs bots). */
function NewRecord({ session }: { session: Session }) {
  const me = session.state.players.find((p) => p.id === session.human);
  const solo = session.state.result?.solo !== null;
  const earlier = history.value.filter((life) => life.id !== session.seed);
  const best = records(earlier)[solo ? 'bestSolo' : 'bestVsBots'];
  if (!me || earlier.length === 0 || (best && best.lth >= me.lth)) return null;
  return <p class="new-record">{t('end.newRecord', { lth: me.lth })}</p>;
}

/** Achievements this life earned; those earned for the first time by it are marked new. */
function LifeAchievements({ session, archived }: { session: Session; archived: boolean }) {
  const ids = earnedAchievements(session.state, content, session.human);
  if (ids.length === 0) return null;
  const fresh = archived ? [] : ids.filter((id) => earned.value[id]?.life === session.seed);
  return (
    <section class="folio" aria-labelledby="achievements-end-heading">
      <h2 id="achievements-end-heading" class="rubric">
        {t('end.achievements')}
      </h2>
      <AchievementList ids={ids} fresh={fresh} />
    </section>
  );
}
