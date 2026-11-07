import { cleanup, render } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CardView } from './CardView.tsx';

vi.mock('../art.ts', () => ({
  artUrl: (cardId: string) => (cardId === 'fantasy.item.cat' ? '/art/cat.webp' : null),
}));

afterEach(cleanup);

describe('CardView illustrations', () => {
  it('shows a card picture when one is bundled, as decoration', () => {
    const { container } = render(<CardView cardId="fantasy.item.cat" />);
    const img = container.querySelector('img.card-art');
    expect(img?.getAttribute('src')).toBe('/art/cat.webp');
    expect(img?.getAttribute('alt')).toBe('');
  });

  it('falls back to the text-only card, and compact cards never show a picture', () => {
    expect(render(<CardView cardId="fantasy.item.house" />).container.querySelector('img')).toBe(
      null,
    );
    cleanup();
    expect(
      render(<CardView cardId="fantasy.item.cat" compact />).container.querySelector('img'),
    ).toBe(null);
  });
});
