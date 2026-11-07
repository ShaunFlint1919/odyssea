// =====================================================================================
//  CONTENT HELPERS — runtime lists of the string unions declared in src/types.ts (the
//  Record<Union, true> trick makes TypeScript reject a missing or extra member), the
//  biome rules used by level design / validation, and deterministic seeds.
//  Pure data: no Phaser, safe to import from Node (vitest).
// =====================================================================================
import type {
  Biome, BossPhase, EnemyLayer, FirePattern, Formation, FrontPattern, MovePattern, Palette, PickupKind,
  RearPattern, ShotColor, SfxKey, SidekickPattern,
} from '../types';

function keysOf<T extends string>(rec: Record<T, true>): T[] {
  return Object.keys(rec) as T[];
}

export const FRONT_PATTERNS: FrontPattern[] = keysOf<FrontPattern>({
  pulse: true, scatter: true, gatling: true, lance: true, seeker: true, helix: true, mortar: true, prism: true,
});
export const REAR_PATTERNS: RearPattern[] = keysOf<RearPattern>({ tail: true, flame: true, mines: true, arc: true, seekers: true });
export const SIDEKICK_PATTERNS: SidekickPattern[] = keysOf<SidekickPattern>({
  pod: true, twin: true, orbiter: true, rocket: true, shard: true, charge: true,
});
export const MOVE_PATTERNS: MovePattern[] = keysOf<MovePattern>({
  straight: true, sine: true, dive: true, swoopL: true, swoopR: true, zigzag: true, hover: true, strafe: true,
  circle: true, chase: true, ground: true, groundMove: true, drift: true, rise: true,
});
/** Moves that keep a unit glued to the terrain (ground and sea layers only). */
export const SURFACE_MOVES: MovePattern[] = ['ground', 'groundMove'];
export const FIRE_PATTERNS: FirePattern[] = keysOf<FirePattern>({
  none: true, aimed: true, burst: true, spread3: true, spread5: true, down: true, ring8: true, ring16: true,
  spiral: true, laser: true, flak: true, missile: true,
});
export const FORMATIONS: Formation[] = keysOf<Formation>({
  single: true, line: true, column: true, v: true, wall: true, random: true, arc: true, pair: true,
});
export const PICKUP_KINDS: PickupKind[] = keysOf<PickupKind>({
  credit_s: true, credit_m: true, credit_l: true, armor: true, shield: true, power: true, intel: true,
});
export const BOSS_MOVES: BossPhase['move'][] = keysOf<BossPhase['move']>({
  hoverSway: true, sweep: true, charge: true, figure8: true, anchor: true,
});
export const ENEMY_LAYERS: EnemyLayer[] = keysOf<EnemyLayer>({ air: true, ground: true, sea: true });
export const SFX_KEYS: SfxKey[] = keysOf<SfxKey>({
  shot_pulse: true, shot_scatter: true, shot_gatling: true, shot_laser: true, shot_missile: true, shot_wave: true,
  shot_heavy: true, shot_rear: true, shot_sidekick: true, enemy_shot: true, enemy_laser: true,
  hit: true, hit_armor: true, shield_hit: true, shield_down: true,
  explode_s: true, explode_m: true, explode_l: true, explode_boss: true,
  pickup_credit: true, pickup_power: true, pickup_repair: true, pickup_intel: true,
  ui_move: true, ui_select: true, ui_back: true, ui_buy: true, ui_sell: true, ui_error: true,
  boss_alarm: true, warning: true, level_clear: true, game_over: true, rear_toggle: true,
});

/** Campaign planet ids in order, with their biome and boss (docs/ARCHITECTURE.md table). */
export const CAMPAIGN: { planet: string; name: string; biome: Biome; boss: string }[] = [
  { planet: 'kessra', name: 'Kessra', biome: 'desert', boss: 'colossus' },
  { planet: 'verdance', name: 'Verdance', biome: 'jungle', boss: 'hydra' },
  { planet: 'thalassa', name: 'Thalassa', biome: 'ocean', boss: 'dreadnought' },
  { planet: 'umbra', name: 'Umbra Deep', biome: 'cavern', boss: 'hive' },
  { planet: 'cinder', name: 'Cinder', biome: 'lava', boss: 'forge' },
  { planet: 'glacia', name: 'Glacia', biome: 'ice', boss: 'cryo' },
  { planet: 'rift', name: 'The Rift', biome: 'space', boss: 'voidcarrier' },
  { planet: 'axiom', name: 'Axiom Citadel', biome: 'techno', boss: 'architect' },
];

/** Biomes with solid ground: ground units ('gr_*') may only appear in their levels. */
export const LAND_BIOMES: Biome[] = ['desert', 'jungle', 'cavern', 'lava', 'ice', 'techno'];
/** Biomes with open water: sea units ('sea_*') may only appear in their levels. */
export const SEA_BIOMES: Biome[] = ['ocean'];

/**
 * Enemy / boss palettes that CONTRAST with each biome's terrain (a palette close to the
 * ground colours makes units blend in: no emerald on canopy, no amber on sand ...).
 * Confirmed with the enemy artist.
 */
export const BIOME_PALETTES: Record<Biome, Palette[]> = {
  desert: ['cobalt', 'violet', 'crimson', 'steel'],
  jungle: ['crimson', 'amber', 'violet', 'bone'],
  ocean: ['amber', 'crimson', 'bone', 'toxic'],
  cavern: ['cobalt', 'toxic', 'violet', 'steel'],
  lava: ['steel', 'cobalt', 'toxic', 'violet'],
  ice: ['crimson', 'amber', 'violet', 'toxic'],
  space: ['amber', 'toxic', 'crimson', 'steel', 'bone'],
  techno: ['crimson', 'toxic', 'amber', 'violet'],
};

/**
 * Colour identity of each planet: the 2-3 contrasting palettes (subset of BIOME_PALETTES)
 * that every enemy, mid-boss and boss of the planet uses.
 */
export const PLANET_PALETTES: Record<string, Palette[]> = {
  kessra: ['cobalt', 'crimson', 'steel'],
  verdance: ['crimson', 'amber', 'bone'],
  thalassa: ['amber', 'bone', 'crimson'],
  umbra: ['toxic', 'violet', 'cobalt'],
  cinder: ['steel', 'cobalt', 'toxic'],
  glacia: ['crimson', 'amber', 'violet'],
  rift: ['amber', 'toxic', 'steel'],
  axiom: ['crimson', 'toxic', 'violet'],
};

/**
 * Enemy bullet colours that stay readable on each biome's terrain (no orange on sand,
 * no green on canopy, no blue on water, no red/orange on lava, no white/blue on snow) and
 * against the player's own fire: never cyan, the colour of the starter gun's dense stream.
 */
export const BIOME_BULLET_COLORS: Record<Biome, ShotColor[]> = {
  desert: ['pink', 'violet', 'red'],
  jungle: ['red', 'pink', 'orange'],
  ocean: ['orange', 'red', 'yellow'],
  cavern: ['orange', 'yellow', 'pink'],
  lava: ['white', 'violet', 'yellow', 'pink'],
  ice: ['red', 'orange', 'pink', 'violet'],
  space: ['red', 'pink', 'orange', 'yellow'],
  techno: ['orange', 'yellow', 'pink', 'red'],
};

/** Sprites a level-2 mid-boss may be built on. */
export const MIDBOSS_SPRITES = ['en_frigate', 'en_carrier', 'sea_destroyer'];

/** Max characters of a display name (fits the 264 px playfield / shop list). */
export const NAME_MAX = 18;

/** FNV-1a hash of a string -> positive 31-bit integer (deterministic level seeds). */
export function seedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h & 0x7fffffff;
}
