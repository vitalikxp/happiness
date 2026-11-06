import { describe, expect, it } from 'vitest';
import { en } from './locales/en.ts';
import { ru } from './locales/ru.ts';
import { format, translate } from './index.ts';

describe('translate', () => {
  it('returns the message for the requested locale', () => {
    expect(translate('ru', 'app.title')).toBe(ru['app.title']);
    expect(translate('en', 'app.title')).toBe(en['app.title']);
  });

  it('substitutes {params} and leaves unknown placeholders intact', () => {
    expect(format('Hello, {name}! {missing}', { name: 'Elra' })).toBe('Hello, Elra! {missing}');
  });

  it('has every default-locale key in the default catalog (no empty strings)', () => {
    for (const value of Object.values(ru)) expect(value.trim()).not.toBe('');
  });
});
