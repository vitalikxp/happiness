import type { Action, GameState, PlayerDelta } from '../../engine/index.ts';
import { cardName, content, levelName, partnerName, pt, roleName } from '../content.ts';
import { t } from '../i18n/index.ts';
import type { Option } from '../options.ts';
import { play } from '../session.ts';
import { Chips } from './Icons.tsx';

function instanceCard(
  state: GameState,
  instanceId: string,
): { cardId: string; level: number | null } {
  for (const p of state.players) {
    const entry = p.tableau.find((c) => c.instanceId === instanceId);
    if (entry) return { cardId: entry.cardId, level: entry.level };
  }
  return { cardId: '', level: null };
}

export function optionLabel(state: GameState, action: Action): string {
  switch (action.type) {
    case 'chooseChildTrait':
      return t('trait.choose');
    case 'payUpkeep':
      return t('upkeep.pay');
    case 'refuseUpkeep':
      return t('upkeep.refuse');
    case 'refreshRow':
      return t('board.refresh');
    case 'discardCard':
      return t('option.discard');
    case 'promote':
      return t('option.promote', { name: cardName(action.card) });
    case 'advanceProject': {
      const { cardId, level } = instanceCard(state, action.instanceId);
      return t('option.advance', { name: levelName(cardId, (level ?? 0) + 1) });
    }
    case 'placeTime': {
      const choice = action.choice;
      if (!choice) return pt(`space.${action.space}`);
      switch (choice.kind) {
        case 'project': {
          const kind = content.cards.get(choice.card)?.kind;
          if (kind === 'groupProject')
            return t('option.role', { name: roleName(choice.card, choice.role ?? 0) });
          if (kind === 'singleRoundProject') {
            const n = choice.level ?? 1;
            return t('option.level', { n, name: levelName(choice.card, n) });
          }
          return t('option.take');
        }
        case 'joinGroup':
          return t('option.join', {
            name: roleName(instanceCard(state, choice.instanceId).cardId, choice.role),
          });
        case 'spend':
          return t('option.level', { n: choice.level, name: levelName(choice.card, choice.level) });
        case 'job':
          return t('option.hire');
        case 'startRelationship':
          return t('option.version', { name: partnerName(choice.card, choice.version) });
        case 'advanceRelationship': {
          const { level } = instanceCard(state, choice.instanceId);
          return t('option.advanceRelationship', {
            name: pt(`partnerLevel.${String((level ?? 1) + 1)}`),
          });
        }
      }
    }
  }
}

/** What an option changes for the acting player, as signed chips. */
export function DeltaChips({ delta }: { delta: PlayerDelta }) {
  return (
    <Chips
      signed
      bundle={{
        ...delta.resources,
        time: delta.time,
        sth: delta.sth,
        lth: delta.lth,
        stress: delta.stress,
      }}
      empty=""
    />
  );
}

export function OptionButton({
  state,
  option,
  label,
}: {
  state: GameState;
  option: Option;
  label?: string;
}) {
  const text = label ?? optionLabel(state, option.action);
  const allocation = option.action.type === 'advanceProject' ? option.action.sthAllocation : null;
  const reason = option.reasons[0];
  return (
    <div class={`option${option.legal ? '' : ' option-disabled'}`}>
      <button
        type="button"
        class="option-button"
        disabled={!option.legal}
        onClick={() => {
          play(option.action);
        }}
      >
        <span class="option-label">{text}</span>
        {allocation && Object.keys(allocation).length > 0 && (
          <span class="option-allocation">
            {pt('term.sth')}: <Chips bundle={allocation} />
          </span>
        )}
        {option.delta && <DeltaChips delta={option.delta} />}
      </button>
      {!option.legal && reason && (
        <span class="option-reason">
          {t('option.unavailable', { reason: t(`reason.${reason.code}`) })}
        </span>
      )}
    </div>
  );
}
