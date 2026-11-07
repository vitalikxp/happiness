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
    </section>
  );
}
