import { resetHints, seenHints } from '../hints.ts';
import { t } from '../i18n/index.ts';
import { settings, THEMES, updateSettings } from '../settings.ts';

export function SettingsPanel() {
  const current = settings.value;
  return (
    <section class="folio settings" aria-labelledby="settings-heading">
      <h2 id="settings-heading" class="rubric">
        {t('settings.heading')}
      </h2>
      <fieldset class="field">
        <legend>{t('settings.theme')}</legend>
        <div class="segmented">
          {THEMES.map((theme) => (
            <label key={theme} class="segment">
              <input
                type="radio"
                name="theme"
                checked={current.theme === theme}
                onChange={() => {
                  updateSettings({ theme });
                }}
              />
              <span>{t(`settings.theme.${theme}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label class="toggle">
        <input
          type="checkbox"
          checked={current.fastBots}
          onChange={(e) => {
            updateSettings({ fastBots: e.currentTarget.checked });
          }}
        />
        {t('board.speed')}
      </label>
      <div class="settings-hints">
        <label class="toggle">
          <input
            type="checkbox"
            checked={current.hints}
            onChange={(e) => {
              updateSettings({ hints: e.currentTarget.checked });
            }}
          />
          {t('settings.hints')}
        </label>
        {Object.keys(seenHints.value).length > 0 && (
          <button
            type="button"
            class="secondary small"
            onClick={() => {
              resetHints();
              updateSettings({ hints: true });
            }}
          >
            {t('settings.hintsAgain')}
          </button>
        )}
      </div>
    </section>
  );
}
