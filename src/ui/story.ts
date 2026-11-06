import type { ContentIndex } from '../content/index.ts';
import { stageOf, type GameEvent, type GameState, type PlayerId } from '../engine/index.ts';
import { cardName, levelName, partnerName, pt, roleName } from './content.ts';
import { t } from './i18n/index.ts';
import type { Profile } from './session.ts';

// Turning the event log into prose: the chronicle shown during play, and the biography at the end.

export interface ChronicleEntry {
  /** Chapter heading (a new round) or a line of the story. */
  kind: 'chapter' | 'line';
  text: string;
  player: PlayerId | null;
}

/** Human-readable chronicle of the game so far (noise like resource gains is left out). */
export function chronicle(
  state: GameState,
  content: ContentIndex,
  profiles: Record<PlayerId, Profile>,
): ChronicleEntry[] {
  const who = (id: PlayerId) => profiles[id]?.name ?? id;
  const instances = new Map<string, string>();
  const out: ChronicleEntry[] = [];
  const line = (player: PlayerId | null, text: string) => out.push({ kind: 'line', text, player });

  for (const event of state.log) {
    switch (event.type) {
      case 'roundStarted':
        out.push({
          kind: 'chapter',
          text: t('log.round', { n: event.round, stage: pt(`stage.${event.stage}`) }),
          player: null,
        });
        break;
      case 'childTraitChosen':
        line(event.player, t('log.trait', { who: who(event.player), card: cardName(event.card) }));
        break;
      case 'timePlaced':
        if (['study', 'play', 'interact', 'tempJob', 'overtime', 'rest'].includes(event.space)) {
          line(
            event.player,
            t('log.placed', { who: who(event.player), space: pt(`space.${event.space}`) }),
          );
        }
        break;
      case 'cardTaken': {
        instances.set(event.instanceId, event.cardId);
        const kind = content.cards.get(event.cardId)?.kind;
        if (kind === 'groupProject') break; // told by groupRoleTaken
        const level =
          kind === 'partner' && event.version !== null
            ? ` — ${partnerName(event.cardId, event.version)}`
            : event.level !== null && kind !== 'partner'
              ? ` — ${levelName(event.cardId, event.level)}`
              : '';
        line(
          event.player,
          t('log.taken', { who: who(event.player), card: cardName(event.cardId), level }),
        );
        break;
      }
      case 'groupRoleTaken': {
        const card = instances.get(event.instanceId) ?? '';
        line(
          event.player,
          t('log.role', {
            who: who(event.player),
            role: roleName(card, event.role),
            card: cardName(card),
          }),
        );
        break;
      }
      case 'levelReached': {
        const kind = content.cards.get(event.cardId)?.kind;
        const level =
          kind === 'partner'
            ? pt(`partnerLevel.${String(event.level)}`)
            : levelName(event.cardId, event.level);
        line(
          event.player,
          t('log.level', { who: who(event.player), card: cardName(event.cardId), level }),
        );
        break;
      }
      case 'promoted':
        line(event.player, t('log.promoted', { who: who(event.player), card: cardName(event.to) }));
        break;
      case 'upkeepRefused':
        line(
          event.player,
          t('log.upkeepRefused', { who: who(event.player), card: cardName(event.cardId) }),
        );
        break;
      case 'stressChanged':
        if (event.cause === 'goodHealth')
          line(event.player, t('log.health', { who: who(event.player) }));
        break;
      case 'playerDied':
        line(event.player, t(`log.died.${event.cause}`, { who: who(event.player) }));
        break;
      case 'lifeGoalScored':
        line(
          event.player,
          t('log.goal', { who: who(event.player), card: cardName(event.card), lth: event.lth }),
        );
        break;
      case 'gameOver':
        line(null, t('log.gameOver'));
        break;
      default:
        break;
    }
  }
  return out;
}

/** The life story of one player, from the pack's `bio.*` templates (docs/CONTENT.md §6). */
export function biography(
  state: GameState,
  content: ContentIndex,
  player: PlayerId,
  profile: Profile,
): string[] {
  const g = profile.gender;
  const lines: string[] = [];
  const instances = new Map<string, { card: string; version: 0 | 1 | null }>();
  let round = 1;
  let promotedTo: string | null = null;
  const bio = (key: string, params: Record<string, string | number> = {}) =>
    lines.push(
      pt(`bio.${key}.${g}`, { age: pt(`bio.age.${String(round)}`), name: profile.name, ...params }),
    );

  for (const event of state.log as readonly GameEvent[]) {
    if (event.type === 'roundStarted') round = event.round;
    if (!('player' in event) || event.player !== player) continue;
    switch (event.type) {
      case 'childTraitChosen':
        bio('trait', { card: cardName(event.card) });
        break;
      case 'cardTaken': {
        instances.set(event.instanceId, { card: event.cardId, version: event.version });
        const kind = content.cards.get(event.cardId)?.kind;
        const card = cardName(event.cardId);
        const level = event.level !== null ? levelName(event.cardId, event.level) : '';
        if (kind === 'singleRoundProject') bio('project.single', { card, level });
        else if (kind === 'item') bio('item', { card, level });
        else if (kind === 'activity') bio('activity', { card, level });
        else if (kind === 'job' && event.cardId !== promotedTo) bio('job.hired', { card });
        else if (kind === 'partner' && event.version !== null) {
          bio('partner.met', { partner: partnerName(event.cardId, event.version) });
        }
        break;
      }
      case 'groupRoleTaken': {
        const card = instances.get(event.instanceId)?.card ?? findCard(state, event.instanceId);
        bio('project.group', { card: cardName(card), level: roleName(card, event.role) });
        break;
      }
      case 'levelReached': {
        const kind = content.cards.get(event.cardId)?.kind;
        if (kind === 'basicProject' && event.level === 4) {
          bio('project.completed', {
            card: cardName(event.cardId),
            level: levelName(event.cardId, 4),
          });
        }
        if (kind === 'partner' && event.level >= 2) {
          const version = instances.get(event.instanceId)?.version ?? 0;
          bio(`partner.${String(event.level)}`, { partner: partnerName(event.cardId, version) });
        }
        break;
      }
      case 'promoted':
        promotedTo = event.to;
        bio('job.promoted', { card: cardName(event.to) });
        break;
      case 'playerDied':
        round = event.round;
        bio(`died.${event.cause}`);
        break;
      default:
        break;
    }
  }
  const lth = state.players.find((p) => p.id === player)?.lth ?? 0;
  bio('summary', { lth });
  return lines;
}

/** The card of a Group Project instance in anyone's tableau or archive (joined expeditions). */
function findCard(state: GameState, instanceId: string): string {
  for (const event of state.log) {
    if (event.type === 'cardTaken' && event.instanceId === instanceId) return event.cardId;
  }
  return '';
}

export function stageName(content: ContentIndex, round: number): string {
  return pt(`stage.${stageOf(content.rules, round)}`);
}
