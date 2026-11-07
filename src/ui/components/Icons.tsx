import type { ComponentChildren } from 'preact';
import { RESOURCES, type Reward } from '../../content/index.ts';
import { pt } from '../content.ts';

// Hand-drawn style vector icons for the game's terms. Each has its own shape, so meaning never
// rests on color alone; color tints come from CSS (`.icon-<term>`).

export type Term =
  | 'knowledge'
  | 'creativity'
  | 'influence'
  | 'money'
  | 'time'
  | 'stress'
  | 'sth'
  | 'lth'
  | 'relax'
  | 'goodHealth';

const PATHS: Record<Term, ComponentChildren> = {
  knowledge: (
    <>
      <path d="M12 6.5C9.5 5 6.5 4.6 3.5 5.2v13c3-.6 6-.2 8.5 1.3 2.5-1.5 5.5-1.9 8.5-1.3v-13c-3-.6-6-.2-8.5 1.3z" />
      <path d="M12 6.5v13" />
    </>
  ),
  creativity: (
    <>
      <path d="M13.5 4.5l6 6-2.6 2.6-6-6z" />
      <path d="M12.2 9.8L4.3 17.7a1.5 1.5 0 0 0 2.1 2.1l7.9-7.9" />
    </>
  ),
  influence: (
    <>
      <path d="M6 20.5v-17" />
      <path d="M6 4.5h12l-3 4 3 4H6" />
    </>
  ),
  money: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
    </>
  ),
  time: (
    <>
      <rect x="9" y="10" width="6" height="10.5" rx="1" />
      <path d="M12 10V8.4" />
      <path d="M12 3.2c1.8 1.6 2 3.2 0 4.6-2-1.4-1.8-3 0-4.6z" />
    </>
  ),
  stress: <path d="M5 16.5l2.5-7 5-3.5 5.5 2 1.5 6-3.5 4.5H8.5z" />,
  sth: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8" />
    </>
  ),
  lth: (
    <path d="M12 20.2S4 15.4 4 9.6A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 8 1.6c0 5.8-8 10.6-8 10.6z" />
  ),
  relax: (
    <>
      <path d="M5 19c0-8 5.5-13.5 14-14 0 8.5-5.5 14-14 14z" />
      <path d="M5 19l8-8" />
    </>
  ),
  goodHealth: (
    <>
      <path d="M12 20.2S4 15.4 4 9.6A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 8 1.6c0 5.8-8 10.6-8 10.6z" />
      <path d="M12 10.5v5.5M9.2 13.2h5.6" />
    </>
  ),
};

export function Icon({ term, size = 18 }: { term: Term; size?: number }) {
  return (
    <svg
      class={`icon icon-${term}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[term]}
    </svg>
  );
}

/** One amount of one term: icon + number, with the full name for screen readers. */
export function Chip({
  term,
  amount,
  signed = false,
}: {
  term: Term;
  amount: number;
  signed?: boolean;
}) {
  const label = `${signed && amount > 0 ? '+' : ''}${String(amount)}`;
  return (
    <span class={`chip chip-${term}`} title={pt(`term.${term}`)}>
      <Icon term={term} size={16} />
      <span aria-hidden="true">{term === 'goodHealth' ? '' : label}</span>
      <span class="sr-only">
        {term === 'goodHealth' ? pt('term.goodHealth') : `${label} ${pt(`term.${term}`)}`}
      </span>
    </span>
  );
}

const ORDER: Term[] = [...RESOURCES, 'time', 'sth', 'lth', 'goodHealth', 'relax', 'stress'];

/** All non-zero amounts of a cost or reward bundle. */
export function Chips({
  bundle,
  signed = false,
  empty = '—',
}: {
  bundle: Partial<Record<Term, number>> | Reward;
  signed?: boolean;
  empty?: string;
}) {
  const values = bundle as Partial<Record<Term, number>>;
  const present = ORDER.filter((term) => (values[term] ?? 0) !== 0);
  if (present.length === 0) return <span class="chips chips-empty">{empty}</span>;
  return (
    <span class="chips">
      {present.map((term) => (
        <Chip key={term} term={term} amount={values[term] ?? 0} signed={signed} />
      ))}
    </span>
  );
}
