// =====================================================================================
//  TEXTURE / ANIMATION KEY CONTRACT
//  Every texture is generated procedurally at boot (src/art/index.ts). Content data and
//  gameplay code reference sprites ONLY through the ids listed here.
// =====================================================================================
import type { Biome, Palette, ShotColor } from '../types';

/** Player hulls — 32x32 px, nose pointing UP. Hull ids in src/data/hulls.ts use these exact ids. */
export const HULL_SPRITES = ['sparrow', 'lancer', 'bulwark', 'wraith', 'tempest', 'leviathan'] as const;

/** Sidekick drones — 16x16 px. Sidekick ids in src/data/sidekicks.ts use these exact ids. */
export const SIDEKICK_SPRITES = ['sk_pod', 'sk_twin', 'sk_orbiter', 'sk_rocket', 'sk_shard', 'sk_charge'] as const;

/**
 * Enemy sprites (drawn once per Palette). Nose pointing DOWN (towards the player).
 * Size in px given as the value. Ground/sea units are seen from above.
 */
export const ENEMY_SPRITES = {
  // --- air
  en_dart: 16,       // small arrow fighter
  en_wasp: 16,       // insectoid interceptor
  en_drone: 12,      // tiny round drone (swarms)
  en_kamikaze: 14,   // spiky suicide craft
  en_hornet: 20,     // forward-swept fighter
  en_saucer: 20,     // disc
  en_spinner: 18,    // rotating star blade (animated 4 frames)
  en_manta: 24,      // wide flat ray
  en_sentinel: 28,   // armoured pod with eye
  en_bomber: 32,     // heavy twin-engine bomber
  en_gunship: 40,    // armed gunship
  en_frigate: 56,    // mini-boss frigate
  en_carrier: 72,    // mini-boss carrier
  // --- ground (top-down)
  gr_turret: 20,     // single-barrel turret on a base
  gr_twin: 28,       // twin turret emplacement
  gr_tank: 24,       // tracked tank
  gr_crawler: 20,    // multi-legged walker
  gr_bunker: 32,     // armoured bunker
  gr_silo: 28,       // missile silo
  gr_radar: 24,      // radar dish (weak, drops loot)
  // --- sea
  sea_boat: 20,      // patrol boat
  sea_destroyer: 48, // destroyer with turrets
  // --- hazards
  hz_mine: 14,       // floating mine
  hz_rock_s: 16,     // small asteroid
  hz_rock_m: 28,     // medium asteroid
  hz_rock_l: 44,     // large asteroid
} as const;
export type EnemySprite = keyof typeof ENEMY_SPRITES;

/** Bosses — main body sprites (drawn once per Palette) and destroyable part sprites. */
export const BOSS_SPRITES = {
  boss_colossus: 112,   // desert armoured crawler fortress
  boss_hydra: 112,      // jungle multi-headed gun platform
  boss_dreadnought: 128,// ocean battleship (long hull)
  boss_forge: 112,      // lava magma forge reactor
  boss_cryo: 104,       // ice crystal sentinel
  boss_hive: 112,       // cavern organic hive mother
  boss_voidcarrier: 128,// space carrier
  boss_architect: 128,  // final techno core
} as const;
export type BossSprite = keyof typeof BOSS_SPRITES;
export const BOSS_PART_SPRITES = {
  part_turret: 20,      // rotating turret on a boss
  part_cannon: 24,      // heavy cannon
  part_pod: 18,         // missile pod
  part_core: 28,        // glowing weak-point core
  part_wing: 32,        // armour wing plate
} as const;
export type BossPartSprite = keyof typeof BOSS_PART_SPRITES;

/** Player / sidekick projectile sprites (one texture per ShotColor). */
export const PROJECTILE_SPRITES = {
  pj_bolt: [4, 10],     // short energy bolt
  pj_needle: [2, 10],   // thin fast needle
  pj_orb: [8, 8],       // round plasma orb
  pj_bigorb: [14, 14],  // heavy orb (mortar)
  pj_beam: [6, 24],     // beam segment (lance)
  pj_missile: [5, 11],  // small homing missile
  pj_wave: [10, 6],     // wave crescent
  pj_flame: [10, 10],   // flame puff
  pj_shard: [5, 7],     // crystal shard
  pj_mine: [9, 9],      // mine
  pj_ring: [12, 12],    // ring
} as const;
export type ProjectileSprite = keyof typeof PROJECTILE_SPRITES;

/** Enemy bullet sprites (one texture per ShotColor). Bright core + dark rim for readability. */
export const ENEMY_BULLET_SPRITES = {
  eb_dot: 6,            // small round bullet
  eb_orb: 9,            // medium round bullet
  eb_bigorb: 14,        // large slow orb
  eb_needle: 8,         // elongated needle (rotated along velocity)
  eb_ring: 10,          // hollow ring
  eb_missile: 10,       // enemy missile (rotated along velocity)
  eb_laser: 8,          // laser beam segment (8 wide, stretched vertically)
} as const;
export type EnemyBulletSprite = keyof typeof ENEMY_BULLET_SPRITES;

/** Pickups (16x16 unless noted). Credit gems are animated (spin). */
export const PICKUP_SPRITES = ['pk_credit_s', 'pk_credit_m', 'pk_credit_l', 'pk_armor', 'pk_shield', 'pk_power', 'pk_intel'] as const;

/** Effects. Explosions/sparks are sprite sheets (frames 0..n-1) with the animations in ANIM. */
export const FX_SPRITES = {
  fx_explosion_s: 24,   // 8 frames
  fx_explosion_m: 40,   // 10 frames
  fx_explosion_l: 72,   // 12 frames
  fx_spark: 8,          // 4 frames
  fx_smoke: 16,         // 6 frames
  fx_muzzle: 10,        // 3 frames
  fx_shockwave: 64,     // 6 frames (expanding ring)
  fx_shield_bubble: 40, // 1 frame, white-ish (tinted by shield colour)
  fx_debris: 6,         // 4 frames (tumbling debris)
  fx_pixel: 2,          // 1 frame (white 2x2 particle, tinted)
  fx_glow: 32,          // soft radial glow (additive)
  fx_engine: 8,         // engine flame, 4 frames
  fx_warning: 64,       // "WARNING" hazard stripe tile 64x16
} as const;

export const ANIM = {
  explosion_s: 'anim_explosion_s',
  explosion_m: 'anim_explosion_m',
  explosion_l: 'anim_explosion_l',
  spark: 'anim_spark',
  smoke: 'anim_smoke',
  muzzle: 'anim_muzzle',
  shockwave: 'anim_shockwave',
  debris: 'anim_debris',
  engine: 'anim_engine',
  credit_s: 'anim_credit_s',
  credit_m: 'anim_credit_m',
  credit_l: 'anim_credit_l',
  spinner: 'anim_spinner', // used with enemyKey('en_spinner', palette) frames 0..3
} as const;

/** Terrain decoration sprites per biome (placed by TerrainGenerator.doodads()). */
export const DOODAD_SPRITES: Record<Biome, string[]> = {
  desert: ['dd_palm', 'dd_dune_rock', 'dd_ruin_pyramid', 'dd_ruin_pillar', 'dd_cactus', 'dd_bones'],
  jungle: ['dd_tree_big', 'dd_tree_small', 'dd_fern', 'dd_jungle_ruin', 'dd_flower'],
  ocean: ['dd_reef', 'dd_buoy', 'dd_islet', 'dd_wreck'],
  cavern: ['dd_crystal', 'dd_stalagmite', 'dd_egg_pod', 'dd_boulder'],
  space: ['dd_station_debris', 'dd_satellite', 'dd_beacon'],
  lava: ['dd_vent', 'dd_obsidian', 'dd_lava_rock', 'dd_ash_tree'],
  ice: ['dd_ice_spire', 'dd_snow_rock', 'dd_frozen_wreck', 'dd_pine'],
  techno: ['dd_pipe', 'dd_vent_grate', 'dd_light', 'dd_tower', 'dd_hatch'],
};

/** Soft white cloud / haze puffs (tinted + alpha per biome via TerrainGenerator.cloudStyle()). ~64x40. */
export const CLOUD_SPRITES = ['cloud_a', 'cloud_b', 'cloud_c'] as const;

/** UI sprites. 9-slice panels are drawn by src/ui at runtime from these pieces. */
export const UI_SPRITES = {
  ui_panel: 24,          // 24x24 panel tile, use as 9-slice with 8px corners
  ui_panel_inset: 24,    // recessed panel tile, 8px corners
  ui_button: 24,         // button tile, 8px corners (frame 0 normal, 1 pressed)
  ui_cursor: 12,         // selection arrow
  ui_arrow_l: 12,
  ui_arrow_r: 12,
  ui_icon_hull: 16,
  ui_icon_front: 16,
  ui_icon_rear: 16,
  ui_icon_shield: 16,
  ui_icon_generator: 16,
  ui_icon_sidekick: 16,
  ui_icon_intel: 16,
  ui_icon_credits: 10,
  ui_icon_pause: 16,
  ui_icon_rear_mode: 16,
  ui_icon_lock: 12,
  ui_bar_frame: 12,      // 12x12 tile for vertical gauge frames (9-slice, 4px corners)
  ui_logo: 0,            // title logo (size decided by the art module, ~256x64)
} as const;

/** Planet globes for the galaxy map: `planet_<biome>`, 48x48. */
export const planetKey = (biome: Biome) => `planet_${biome}`;

/** Bitmap fonts (RetroFont, fixed width, white glyphs with baked 1px dark shadow → use setTint). */
export const FONT = {
  s: 'font_s',   // 6x8 cell (5x7 glyphs) — HUD, small labels
  m: 'font_m',   // 8x10 cell — menus, body text
  l: 'font_l',   // 12x16 cell — titles (pre-coloured gradient + outline, do NOT tint)
} as const;

// ---- key helpers (use these everywhere instead of building strings by hand)
export const enemyKey = (sprite: string, palette: Palette) => `${sprite}__${palette}`;
export const bossKey = (sprite: string, palette: Palette) => `${sprite}__${palette}`;
export const shotKey = (sprite: string, color: ShotColor) => `${sprite}__${color}`;
export const enemyBulletKey = (sprite: string, color: ShotColor) => `${sprite}__${color}`;
export const hullKey = (hullId: string) => `hull_${hullId}`;
export const sidekickKey = (sidekickId: string) => sidekickId;
export const shadowKey = (textureKey: string) => `${textureKey}__shadow`; // black 40% silhouette

/** Hex colours for each ShotColor (core, glow) — shared by art and gameplay particles. */
export const SHOT_RGB: Record<ShotColor, { core: number; glow: number }> = {
  cyan: { core: 0xd8ffff, glow: 0x20d8ff },
  orange: { core: 0xfff0c0, glow: 0xff8020 },
  green: { core: 0xe0ffd0, glow: 0x40ff60 },
  violet: { core: 0xf0e0ff, glow: 0xa050ff },
  red: { core: 0xffe0d0, glow: 0xff3030 },
  yellow: { core: 0xffffe0, glow: 0xffd820 },
  white: { core: 0xffffff, glow: 0xb0c8ff },
  pink: { core: 0xffe8f8, glow: 0xff50c0 },
  blue: { core: 0xe0e8ff, glow: 0x3060ff },
};
