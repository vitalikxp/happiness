import { useMemo, useState } from 'preact/hooks';
import { content } from '../content.ts';
import { history } from '../history.ts';
import { t } from '../i18n/index.ts';
import { go } from '../nav.ts';
import {
  CHARGES,
  TINCTURES,
  continueGame,
  savedGame,
  startGame,
  type Charge,
  type Session,
  type Tincture,
} from '../session.ts';
import { DIFFICULTIES, settings, updateSettings } from '../settings.ts';
import { SettingsPanel } from './SettingsPanel.tsx';
import { ProfileShield, Shield } from './Shield.tsx';

/** The unfinished life from the last visit, with a button to go on living it. */
function ContinueLife({ saved }: { saved: Session }) {
  const profile = saved.profiles[saved.human];
  if (!profile) return null;
  return (
    <section class="folio continue" aria-labelledby="continue-heading">
      <h2 id="continue-heading" class="rubric">
        {t('continue.heading')}
      </h2>
      <div class="continue-body">
        <ProfileShield profile={profile} size={48} />
        <p>
          <strong>{profile.name}</strong>
          <br />
          {t('continue.where', {
            round: saved.state.round,
            opponents: saved.state.players.length - 1,
          })}
        </p>
        <button
          type="button"
          class="primary"
          onClick={() => {
            continueGame(saved);
          }}
        >
          {t('continue.go')}
        </button>
      </div>
      <p class="hint">{t('continue.hint')}</p>
    </section>
  );
}

const OPPONENTS = [0, 1, 2, 3] as const;
/** Quick game: 1 human + 2 bots (R-SET-01). */
const DEFAULT_OPPONENTS = 2;

export function NewGame() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'f' | 'm'>('f');
  const [tincture, setTincture] = useState<Tincture>('azure');
  const [charge, setCharge] = useState<Charge>('star');
  const [opponents, setOpponents] = useState<number>(DEFAULT_OPPONENTS);
  const saved = useMemo(savedGame, []);
  const lives = history.value.length;

  const start = (event: Event) => {
    event.preventDefault();
    startGame(
      { name: name.trim() || t('newGame.defaultName'), gender, tincture, charge },
      opponents,
    );
  };

  return (
    <main class="title-page">
      <header class="title-head">
        <p class="title-ornament" aria-hidden="true">
          ❦
        </p>
        <h1 class="title">{t('app.title')}</h1>
        <p class="title-tagline">{t('app.tagline')}</p>
      </header>

      {saved && <ContinueLife saved={saved} />}

      <form class="folio new-game" onSubmit={start}>
        <h2 class="rubric">{t('newGame.heading')}</h2>
        <p class="lead initial">{t('newGame.lead')}</p>

        <div class="field">
          <label for="hero-name">{t('newGame.name')}</label>
          <input
            id="hero-name"
            type="text"
            maxLength={24}
            autoComplete="off"
            placeholder={t('newGame.namePlaceholder')}
            value={name}
            onInput={(e) => {
              setName(e.currentTarget.value);
            }}
          />
        </div>

        <fieldset class="field">
          <legend>{t('newGame.gender')}</legend>
          <div class="segmented">
            {(['f', 'm'] as const).map((g) => (
              <label key={g} class="segment">
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={gender === g}
                  onChange={() => {
                    setGender(g);
                  }}
                />
                <span>{t(`newGame.gender.${g}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div class="heraldry">
          <Shield tincture={tincture} charge={charge} size={96} />
          <div class="heraldry-pickers">
            <fieldset class="field">
              <legend>{t('newGame.tincture')}</legend>
              <div class="swatches">
                {TINCTURES.map((value) => (
                  <label key={value} class="swatch" title={t(`tincture.${value}`)}>
                    <input
                      type="radio"
                      name="tincture"
                      value={value}
                      checked={tincture === value}
                      onChange={() => {
                        setTincture(value);
                      }}
                    />
                    <span class={`swatch-color tincture-${value}`} aria-hidden="true" />
                    <span class="sr-only">{t(`tincture.${value}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset class="field">
              <legend>{t('newGame.charge')}</legend>
              <div class="swatches">
                {CHARGES.map((value) => (
                  <label key={value} class="swatch" title={t(`charge.${value}`)}>
                    <input
                      type="radio"
                      name="charge"
                      value={value}
                      checked={charge === value}
                      onChange={() => {
                        setCharge(value);
                      }}
                    />
                    <span class="swatch-charge" aria-hidden="true">
                      <Shield tincture="sable" charge={value} size={22} />
                    </span>
                    <span class="sr-only">{t(`charge.${value}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        <fieldset class="field">
          <legend>{t('newGame.opponents')}</legend>
          <div class="segmented">
            {OPPONENTS.map((n) => (
              <label key={n} class="segment">
                <input
                  type="radio"
                  name="opponents"
                  checked={opponents === n}
                  onChange={() => {
                    setOpponents(n);
                  }}
                />
                <span>{n === 0 ? t('newGame.opponents.0') : t('newGame.opponents.n', { n })}</span>
              </label>
            ))}
          </div>
          {opponents === 0 && (
            <p class="hint">{t('newGame.soloHint', { lth: content.rules.solo.winLth })}</p>
          )}
        </fieldset>

        {opponents > 0 && (
          <fieldset class="field">
            <legend>{t('newGame.difficulty')}</legend>
            <div class="segmented">
              {DIFFICULTIES.map((difficulty) => (
                <label key={difficulty} class="segment">
                  <input
                    type="radio"
                    name="difficulty"
                    checked={settings.value.difficulty === difficulty}
                    onChange={() => {
                      updateSettings({ difficulty });
                    }}
                  />
                  <span>{t(`newGame.difficulty.${difficulty}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <button type="submit" class="primary">
          {t('newGame.start')}
        </button>
      </form>

      <nav class="title-links" aria-label={t('nav.label')}>
        <button
          type="button"
          class="secondary"
          onClick={() => {
            go({ kind: 'history' });
          }}
        >
          {t('nav.history', { n: lives })}
        </button>
      </nav>

      <SettingsPanel />
    </main>
  );
}
