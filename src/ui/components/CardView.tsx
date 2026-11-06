import type { ComponentChildren } from 'preact';
import type { Card, Cost, Reward } from '../../content/index.ts';
import type { PlayerId, TableauCard } from '../../engine/index.ts';
import { cardName, content, levelName, partnerName, pt, roleName } from '../content.ts';
import { t } from '../i18n/index.ts';
import type { Profile } from '../session.ts';
import { Chips, Icon } from './Icons.tsx';
import { ProfileShield } from './Shield.tsx';

// A card drawn from its data: every level, role, upkeep and requirement, plus its flavor text.

function Exchange({ cost, reward }: { cost?: Cost | Reward; reward: Reward }) {
  return (
    <span class="exchange">
      {cost && (
        <>
          <Chips bundle={cost} empty="0" />
          <span class="arrow" aria-hidden="true">
            →
          </span>
        </>
      )}
      <Chips bundle={reward} signed />
    </span>
  );
}

function Upkeep({ cost, reward }: { cost: Cost; reward: Reward }) {
  return (
    <span class="upkeep">
      <span class="upkeep-label">{t('card.upkeep')}:</span> <Exchange cost={cost} reward={reward} />
    </span>
  );
}

interface Row {
  label: string;
  body: ComponentChildren;
  current?: boolean;
  holder?: PlayerId | null;
}

function rows(card: Card, entry: TableauCard | null): Row[] {
  const current = entry?.level ?? null;
  switch (card.kind) {
    case 'basicProject':
    case 'singleRoundProject':
    case 'activity':
    case 'item':
      return card.levels.map((level, i) => ({
        label: `${String(i + 1)}. ${levelName(card.id, i + 1)}`,
        current: current === i + 1,
        body: (
          <>
            <Exchange cost={level.cost} reward={level.reward} />
            {'upkeep' in level && level.upkeep && <Upkeep {...level.upkeep} />}
          </>
        ),
      }));
    case 'groupProject':
      return card.roles.map((role, i) => ({
        label: roleName(card.id, i),
        holder: entry?.roles?.[i] ?? null,
        body: <Exchange cost={role.cost} reward={role.reward} />,
      }));
    case 'job':
      return [
        {
          label: t('card.hire'),
          body: <Exchange cost={card.hire.cost} reward={card.hire.reward} />,
        },
        {
          label: t('card.upkeep'),
          body: <Exchange cost={card.upkeep.cost} reward={card.upkeep.reward} />,
        },
        ...(card.promotion
          ? [
              {
                label: t('card.promotion'),
                body: (
                  <Exchange
                    cost={{ ...card.promotion.cost, time: content.rules.promotionTime }}
                    reward={card.promotion.reward}
                  />
                ),
              },
            ]
          : []),
      ];
    case 'partner':
      return card.levels.map((level, i) => ({
        label: `${String(i + 1)}. ${pt(`partnerLevel.${String(i + 1)}`)}`,
        current: current === i + 1,
        body: (
          <>
            {'requirement' in level && (
              <span class="requirement">
                {t('card.requirement')}: <Chips bundle={level.requirement} />
              </span>
            )}
            <Exchange reward={level.reward} />
            {level.upkeep && <Upkeep {...level.upkeep} />}
          </>
        ),
      }));
    case 'childTrait':
      return [
        { label: t('trait.start'), body: <Chips bundle={card.start} /> },
        ...card.triggers.map((trigger) => ({
          label: pt(`space.${trigger.on}`),
          body: <Exchange reward={trigger.reward} />,
        })),
      ];
    case 'lifeGoal':
      return [];
  }
}

export function CardView({
  cardId,
  entry = null,
  profiles = {},
  children,
  selected = false,
  onSelect,
}: {
  cardId: string;
  entry?: TableauCard | null;
  profiles?: Record<PlayerId, Profile>;
  children?: ComponentChildren;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const card = content.cards.get(cardId);
  if (!card) return null;
  const name =
    card.kind === 'partner'
      ? partnerName(card.id, entry?.version ?? 0) + (entry ? '' : ` / ${partnerName(card.id, 1)}`)
      : cardName(card.id);
  const subtitle =
    card.kind === 'job'
      ? `${pt(`track.${card.track}`)} · ${t('card.level', { n: card.level })}`
      : card.kind === 'partner'
        ? cardName(card.id)
        : null;
  const lines = rows(card, entry);
  return (
    <article class={`card card-${card.kind}${selected ? ' card-selected' : ''}`} aria-label={name}>
      <header class="card-head">
        <span class="card-kind">{t(`kind.${card.kind}`)}</span>
        {onSelect ? (
          <button type="button" class="card-title" aria-expanded={selected} onClick={onSelect}>
            {name}
          </button>
        ) : (
          <h3 class="card-title">{name}</h3>
        )}
        {subtitle && <span class="card-subtitle">{subtitle}</span>}
      </header>
      {lines.length > 0 && (
        <ol class="card-rows">
          {lines.map((row) => (
            <li key={row.label} class={row.current ? 'row-current' : undefined}>
              <span class="row-label">
                {row.label}
                {row.current && <span class="sr-only"> ({t('card.current')})</span>}
              </span>
              <span class="row-body">{row.body}</span>
              {row.holder !== undefined && (
                <span class="row-holder">
                  {row.holder && profiles[row.holder] ? (
                    <ProfileShield profile={profiles[row.holder] as Profile} size={18} />
                  ) : (
                    <span class="free">{t('card.free')}</span>
                  )}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
      {card.kind === 'groupProject' && (
        <p class="card-bonus">
          <span class="bonus-label">{t('card.bonus')}:</span>{' '}
          {card.bonus.map((tier, i) => (
            <span key={i} class="bonus-tier">
              <span class="bonus-n">{i + 1}</span>
              <Chips bundle={tier} signed />
            </span>
          ))}
        </p>
      )}
      <p class="card-flavor">{pt(`${card.id}.flavor`)}</p>
      {children}
    </article>
  );
}

export function TimeCost({ amount }: { amount: number }) {
  return (
    <span class="chips">
      <span class="chip chip-time">
        <Icon term="time" size={16} />
        <span aria-hidden="true">{amount}</span>
        <span class="sr-only">{`${String(amount)} ${pt('term.time')}`}</span>
      </span>
    </span>
  );
}
