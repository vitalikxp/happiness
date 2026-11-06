import { useEffect, useRef } from 'preact/hooks';
import type { GameState } from '../../engine/index.ts';
import { t } from '../i18n/index.ts';
import type { Options } from '../options.ts';
import type { Session } from '../session.ts';
import { CardView } from './CardView.tsx';
import { OptionButton } from './OptionButton.tsx';

// Decisions outside the turn order: the Child Trait at birth (R-SET-06) and upkeep (R-UPK-06).

/** Move keyboard focus into a decision panel when it appears. */
function useFocusFirstButton() {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
  }, []);
  return panel;
}

export function TraitChoice({ session, options }: { session: Session; options: Options }) {
  const profile = session.profiles[session.human];
  const panel = useFocusFirstButton();
  return (
    <section class="folio decision" aria-labelledby="trait-heading" ref={panel}>
      <h2 id="trait-heading" class="rubric">
        {t('trait.heading')}
      </h2>
      <p class="lead initial">{t('trait.lead', { name: profile?.name ?? '' })}</p>
      <div class="decision-cards">
        {options.traits.map((option) =>
          option.action.type === 'chooseChildTrait' ? (
            <CardView key={option.action.card} cardId={option.action.card}>
              <OptionButton state={session.state} option={option} />
            </CardView>
          ) : null,
        )}
      </div>
    </section>
  );
}

export function UpkeepPanel({
  state,
  session,
  options,
}: {
  state: GameState;
  session: Session;
  options: Options;
}) {
  const me = state.players.find((p) => p.id === session.human);
  const panel = useFocusFirstButton();
  if (state.pending?.type !== 'upkeep') return null;
  const remaining = state.pending.remaining;
  return (
    <section
      class="folio decision upkeep-panel"
      aria-labelledby="upkeep-heading"
      role="dialog"
      aria-modal="true"
      ref={panel}
    >
      <h2 id="upkeep-heading" class="rubric">
        {t('upkeep.heading')}
      </h2>
      <p class="lead">{t('upkeep.lead')}</p>
      <div class="decision-cards">
        {remaining.map((instanceId) => {
          const entry = me?.tableau.find((c) => c.instanceId === instanceId);
          if (!entry) return null;
          return (
            <CardView
              key={instanceId}
              cardId={entry.cardId}
              entry={entry}
              profiles={session.profiles}
            >
              <div class="options">
                {(options.upkeep.get(instanceId) ?? []).map((option) => (
                  <OptionButton key={option.action.type} state={state} option={option} />
                ))}
              </div>
            </CardView>
          );
        })}
      </div>
    </section>
  );
}
