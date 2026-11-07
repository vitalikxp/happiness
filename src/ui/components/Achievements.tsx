import { earned } from '../achievements.ts';
import { cardName, content, pt } from '../content.ts';
import { t } from '../i18n/index.ts';

// Achievements (R-META-02) with the cards they unlock (R-META-03).

const dateFormat = new Intl.DateTimeFormat('ru', { dateStyle: 'long' });

function Unlocks({ cards }: { cards: readonly string[] }) {
  if (cards.length === 0) return null;
  return (
    <p class="achievement-unlocks">
      {t('achievements.unlocks', {
        cards: cards
          .map(
            (id) => `${t(`kind.${content.cards.get(id)?.kind ?? 'childTrait'}`)} «${cardName(id)}»`,
          )
          .join(', '),
      })}
    </p>
  );
}

/**
 * `ids`: which achievements to list (default: all of the pack); `fresh`: earned for the first
 * time just now, highlighted.
 */
export function AchievementList({
  ids,
  fresh = [],
}: {
  ids?: readonly string[];
  fresh?: readonly string[];
}) {
  const shown = content.achievements.filter((a) => !ids || ids.includes(a.id));
  return (
    <ul class="achievements">
      {shown.map((a) => {
        const got = earned.value[a.id];
        const isFresh = fresh.includes(a.id);
        return (
          <li
            key={a.id}
            class={`achievement${got ? ' achievement-earned' : ''}${isFresh ? ' achievement-fresh' : ''}`}
          >
            <span class="achievement-seal" aria-hidden="true">
              {got ? '✦' : '·'}
            </span>
            <div>
              <p class="achievement-name">
                {pt(`${a.id}.name`)}
                {isFresh && <span class="achievement-new">{t('achievements.new')}</span>}
                <span class="sr-only">
                  {' '}
                  ({got ? t('achievements.earned') : t('achievements.locked')})
                </span>
              </p>
              <p class="achievement-description">{pt(`${a.id}.description`)}</p>
              <Unlocks cards={a.unlocks ?? []} />
              {got && !isFresh && (
                <p class="hint">
                  {t('achievements.earnedAt', { date: dateFormat.format(new Date(got.at)) })}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
