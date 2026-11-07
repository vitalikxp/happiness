import type { ComponentChildren } from 'preact';
import { t } from '../i18n/index.ts';
import type { Charge, Profile, Tincture } from '../session.ts';

// Heraldic shields stand in for portraits (R-SET-08): a tincture (the player's color) and a charge.

const CHARGE_SHAPES: Record<Charge, ComponentChildren> = {
  star: (
    <polygon points="32,14 36.7,27.5 51,27.5 39.5,36 43.8,49.5 32,41 20.2,49.5 24.5,36 13,27.5 27.3,27.5" />
  ),
  crescent: <path d="M40 17A17 17 0 1 0 40 49A20 20 0 0 1 40 17z" />,
  cross: <path d="M27 12h10v14h14v10H37v18H27V36H13V26h14z" />,
  roundel: <circle cx="32" cy="33" r="13" />,
  chevron: <path d="M10 46l22-22 22 22-7 7-15-15-15 15z" />,
  lozenge: <path d="M32 12l15 21-15 21-15-21z" />,
};

export function Shield({
  tincture,
  charge,
  size = 48,
  label,
}: {
  tincture: Tincture;
  charge: Charge;
  size?: number;
  label?: string;
}) {
  return (
    <svg
      class={`shield tincture-${tincture}`}
      width={size}
      height={size * 1.15}
      viewBox="0 0 64 74"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    >
      <path class="shield-field" d="M4 4h56v30c0 20-14 32-28 38C18 66 4 54 4 34z" />
      <g class="shield-charge">{CHARGE_SHAPES[charge]}</g>
      <path class="shield-edge" d="M4 4h56v30c0 20-14 32-28 38C18 66 4 54 4 34z" />
    </svg>
  );
}

export function ProfileShield({ profile, size = 48 }: { profile: Profile; size?: number }) {
  return (
    <Shield
      tincture={profile.tincture}
      charge={profile.charge}
      size={size}
      label={`${t(`tincture.${profile.tincture}`)}, ${t(`charge.${profile.charge}`)}`}
    />
  );
}
