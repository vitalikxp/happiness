// Card illustrations (art/STYLE.md): every picture in art/cards/ named by card id is bundled;
// a card without one keeps its text-only look with the illuminated initial.

const files = import.meta.glob<string>('../../art/cards/*.{webp,png,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Picture URLs by card id. */
export const ART: ReadonlyMap<string, string> = new Map(
  Object.entries(files).map(([path, url]) => [
    path.slice(path.lastIndexOf('/') + 1).replace(/\.[^.]+$/, ''),
    url,
  ]),
);

export const artUrl = (cardId: string): string | null => ART.get(cardId) ?? null;
