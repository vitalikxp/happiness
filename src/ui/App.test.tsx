import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App.tsx';
import { DEFAULT_LOCALE, locale } from './i18n/index.ts';
import { en } from './i18n/locales/en.ts';
import { ru } from './i18n/locales/ru.ts';

afterEach(() => {
  cleanup();
  locale.value = DEFAULT_LOCALE;
});

describe('App', () => {
  it('renders the localized title in Russian by default', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(ru['app.title']);
    expect(document.title).toBe(ru['app.title']);
    expect(document.documentElement.lang).toBe('ru');
  });

  it('switches the UI language', () => {
    render(<App />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(en['app.title']);
  });
});
