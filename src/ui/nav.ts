import { signal } from '@preact/signals';

// Pages outside a game. While a game is open, App shows the game instead.

export type View = { kind: 'title' } | { kind: 'history' } | { kind: 'life'; id: string };

export const view = signal<View>({ kind: 'title' });

export function go(next: View): void {
  view.value = next;
  document.documentElement.scrollTop = 0;
}
