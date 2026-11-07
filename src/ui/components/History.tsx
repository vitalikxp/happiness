import { useMemo } from 'preact/hooks';
import { canReplay, history, records, type LifeRecord } from '../history.ts';
import { t } from '../i18n/index.ts';
import { go } from '../nav.ts';
import { restore } from '../session.ts';
import { earned } from '../achievements.ts';
import { content } from '../content.ts';
import { AchievementList } from './Achievements.tsx';
import { EndScreen } from './EndScreen.tsx';
import { ProfileShield } from './Shield.tsx';

// Personal records and the archive of past lives (R-META-01).

const dateFormat = new Intl.DateTimeFormat('ru', { dateStyle: 'long', timeStyle: 'short' });

function verdict(life: LifeRecord): string {
  if (life.solo) return t(life.won ? 'history.soloWon' : 'history.soloLost');
  return t('history.place', { place: life.place, players: life.players });
}

function BackToTitle() {
  return (
    <button
      type="button"
      class="secondary"
      onClick={() => {
        go({ kind: 'title' });
      }}
    >
      {t('nav.title')}
    </button>
  );
}

function Record({ label, life }: { label: string; life: LifeRecord | null }) {
  return (
    <div class="record">
      <dt>{label}</dt>
      <dd>
        {life ? (
          <>
            <span class="record-value">{life.lth}</span>{' '}
            {t('history.by', { name: life.game.profiles[life.game.human]?.name ?? '' })}
          </>
        ) : (
          <span class="hint">{t('history.none')}</span>
        )}
      </dd>
    </div>
  );
}

export function HistoryPage() {
  const lives = history.value;
  const summary = useMemo(() => records(lives), [lives]);
  return (
    <main class="title-page history-page">
      <header class="title-head">
        <p class="title-ornament" aria-hidden="true">
          ❦
        </p>
        <h1 class="title">{t('history.heading')}</h1>
        <p class="title-tagline">{t('history.tagline')}</p>
      </header>

      <section class="folio" aria-labelledby="records-heading">
        <h2 id="records-heading" class="rubric">
          {t('history.records')}
        </h2>
        <dl class="records">
          <div class="record">
            <dt>{t('history.lives')}</dt>
            <dd>
              <span class="record-value">{summary.lives}</span>
            </dd>
          </div>
          <div class="record">
            <dt>{t('history.wins')}</dt>
            <dd>
              <span class="record-value">{summary.wins}</span>
            </dd>
          </div>
          <Record label={t('history.bestSolo')} life={summary.bestSolo} />
          <Record label={t('history.bestVsBots')} life={summary.bestVsBots} />
        </dl>
      </section>

      <section class="folio" aria-labelledby="achievements-heading">
        <h2 id="achievements-heading" class="rubric">
          {t('achievements.heading', {
            got: content.achievements.filter((a) => earned.value[a.id]).length,
            total: content.achievements.length,
          })}
        </h2>
        <AchievementList />
      </section>

      <section class="folio" aria-labelledby="lives-heading">
        <h2 id="lives-heading" class="rubric">
          {t('history.list')}
        </h2>
        {lives.length === 0 ? (
          <p class="hint">{t('history.empty')}</p>
        ) : (
          <ol class="lives">
            {lives.map((life) => {
              const profile = life.game.profiles[life.game.human];
              return (
                <li key={life.id} class="life">
                  {profile && <ProfileShield profile={profile} size={36} />}
                  <div class="life-text">
                    <p class="life-name">
                      {profile?.name}
                      <span class="life-lth">{t('history.lth', { lth: life.lth })}</span>
                    </p>
                    <p class="hint">
                      {[
                        dateFormat.format(new Date(life.finishedAt)),
                        verdict(life),
                        t('history.rounds', { n: life.rounds }),
                      ].join(' · ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    class="secondary"
                    onClick={() => {
                      go({ kind: 'life', id: life.id });
                    }}
                  >
                    {t('history.open')}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <nav class="title-links" aria-label={t('nav.label')}>
        <BackToTitle />
      </nav>
    </main>
  );
}

/** A past life: the full end page when it can be replayed, otherwise its saved biography. */
export function LifePage({ id }: { id: string }) {
  const life = history.value.find((l) => l.id === id);
  const replayed = useMemo(() => (life && canReplay(life) ? restore(life.game) : null), [life]);
  if (replayed) return <EndScreen session={replayed} archived />;
  const profile = life?.game.profiles[life.game.human];
  return (
    <main class="title-page">
      <section class="folio" aria-labelledby="life-heading">
        <h2 id="life-heading" class="rubric">
          {profile?.name ?? t('history.heading')}
        </h2>
        {life ? (
          <>
            <div class="biography">
              {life.biography.map((line, i) => (
                <p key={i} class={i === 0 ? 'initial' : undefined}>
                  {line}
                </p>
              ))}
            </div>
            <p class="hint">{t('history.oldVersion')}</p>
          </>
        ) : (
          <p class="hint">{t('history.missing')}</p>
        )}
      </section>
      <nav class="title-links" aria-label={t('nav.label')}>
        <button
          type="button"
          class="secondary"
          onClick={() => {
            go({ kind: 'history' });
          }}
        >
          {t('nav.history', { n: history.value.length })}
        </button>
      </nav>
    </main>
  );
}
