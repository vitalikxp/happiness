import { useEffect } from 'preact/hooks';
import { LOCALES, locale, t } from './i18n/index.ts';

export function App() {
  const title = t('app.title');

  useEffect(() => {
    document.title = title;
    document.documentElement.lang = locale.value;
  }, [title]);

  return (
    <main>
      <h1>{title}</h1>
      <p>{t('app.tagline')}</p>
      <label>
        {t('app.locale')}{' '}
        <select
          value={locale.value}
          onChange={(event) => {
            const next = LOCALES.find((l) => l === event.currentTarget.value);
            if (next) locale.value = next;
          }}
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </label>
    </main>
  );
}
