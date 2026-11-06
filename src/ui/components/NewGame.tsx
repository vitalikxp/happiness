import { useState } from 'preact/hooks';
import { content } from '../content.ts';
import { t } from '../i18n/index.ts';
import { CHARGES, TINCTURES, startGame, type Charge, type Tincture } from '../session.ts';
import { Shield } from './Shield.tsx';

const OPPONENTS = [0, 1, 2, 3] as const;
/** Quick game: 1 human + 2 bots (R-SET-01). */
const DEFAULT_OPPONENTS = 2;

export function NewGame() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'f' | 'm'>('f');
  const [tincture, setTincture] = useState<Tincture>('azure');
  const [charge, setCharge] = useState<Charge>('star');
  const [opponents, setOpponents] = useState<number>(DEFAULT_OPPONENTS);

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

        <button type="submit" class="primary">
          {t('newGame.start')}
        </button>
      </form>
    </main>
  );
}
