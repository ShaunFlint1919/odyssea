// =====================================================================================
//  ENEMY ART — every ENEMY_SPRITES entry rendered for every Palette.
//   - texture key  enemyKey(sprite, palette), exact size from ENEMY_SPRITES, nose DOWN
//   - shadow       shadowKey(enemyKey(...)) (same frame layout as the sprite texture)
//   - en_spinner   4-frame sheet + looping animation spinnerAnimKey(palette)
//   - hz_mine      2-frame sheet (0 = light on, 1 = light off) + blink animation mineAnimKey(palette)
//   - enemyAnimKey(sprite, palette) returns the animation to play (or null) for any sprite
//   - gr_turret / gr_twin / gr_tank: separate rotatable heads turretTopKey(sprite, palette)
// Designs live in b_en_*.ts as palette-independent pixel maps (digits = palette ramp).
// =====================================================================================
import Phaser from 'phaser';
import { PALETTE_NAMES, type Palette } from '../types';
import { ANIM, ENEMY_SPRITES, enemyKey, shadowKey, type EnemySprite } from './keys';
import {
  COMMON_COLORS, addSheet, addTextureWithShadow, mapSize, mapToCanvas, padMap, rampColors, silhouette,
  type ColorMap, type PixelMap,
} from './pixel';
import { EN_COLORS } from './b_en_kit';
import { ENEMY_DESIGNS, TOP_DESIGNS, designFrames } from './b_en_catalog';
import { enemyVariantWanted } from './usage';

/** Base sprite -> rotatable head base key (texture key = turretTopKey(sprite, palette)). */
export const TURRET_TOPS: Record<string, string> = { gr_turret: 'gr_turret_top', gr_twin: 'gr_twin_top', gr_tank: 'gr_tank_top' };

/**
 * Texture key of the rotatable head of a ground unit (gr_turret, gr_twin, gr_tank).
 * Same size as the base, pivot = texture centre (draw it at the base's position), barrel
 * pointing DOWN at rotation 0: to aim at angle `a` (Phaser radians, 0 = right, PI/2 = down)
 * use rotation = a - PI/2.
 */
export const turretTopKey = (sprite: string, palette: Palette) => `${TURRET_TOPS[sprite] ?? `${sprite}_top`}__${palette}`;

/** Looping spin animation of en_spinner for a palette (16 fps, frames 0..3). */
export const spinnerAnimKey = (palette: Palette) => `${ANIM.spinner}__${palette}`;

/** Base key of the hz_mine blink animation; per palette: mineAnimKey(palette). */
export const MINE_ANIM = 'anim_mine';
export const mineAnimKey = (palette: Palette) => `${MINE_ANIM}__${palette}`;

/** Looping animation to play on an enemy sprite (en_spinner, hz_mine), or null for static sprites. */
export function enemyAnimKey(sprite: string, palette: Palette): string | null {
  if (sprite === 'en_spinner') return spinnerAnimKey(palette);
  if (sprite === 'hz_mine') return mineAnimKey(palette);
  return null;
}

/** Colour map for one palette: fixed colours + enemy extras + the palette ramp on '1'..'5'. */
function colorsFor(palette: Palette): ColorMap {
  return { ...COMMON_COLORS, ...EN_COLORS, ...rampColors(palette) };
}

/** Force a map to exactly size x size (designs are authored at size; this only guards). */
function fit(map: PixelMap, size: number): PixelMap {
  const s = mapSize(map);
  if (s.w === size && s.h === size) return map;
  if (import.meta.env?.DEV) console.warn(`[enemies] map ${s.w}x${s.h} resized to ${size}`);
  return padMap(map, size, size);
}

/** Register one sprite (single frame or sheet) + its shadow under `key`. */
function register(scene: Phaser.Scene, key: string, frames: PixelMap[], colors: ColorMap): void {
  const canvases = frames.map((f) => mapToCanvas(f, colors));
  if (canvases.length === 1) {
    addTextureWithShadow(scene, key, canvases[0]);
    return;
  }
  addSheet(scene, key, canvases);
  addSheet(scene, shadowKey(key), canvases.map((c) => silhouette(c, '#000000', 0.38)));
}

/**
 * Create a looping animation on `texture`. Guarded with anims.exists: an existing animation
 * with the same key is replaced, so it always references the textures generated just now.
 */
function createAnim(scene: Phaser.Scene, key: string, texture: string, frames: { frame: number; duration?: number }[], frameRate: number): void {
  if (scene.anims.exists(key)) scene.anims.remove(key);
  scene.anims.create({ key, frames: frames.map((f) => ({ key: texture, ...f })), frameRate, repeat: -1 });
}

/**
 * Generates the enemy textures (every palette, or only the variants allowed by src/art/usage.ts),
 * the turret heads and the enemy animations.
 */
export function generateEnemyArt(scene: Phaser.Scene): void {
  const palettes = PALETTE_NAMES.map((p) => [p, colorsFor(p)] as const);
  for (const sprite of Object.keys(ENEMY_SPRITES) as EnemySprite[]) {
    const size = ENEMY_SPRITES[sprite];
    const frames = designFrames(ENEMY_DESIGNS[sprite]()).map((f) => fit(f, size));
    for (const [p, colors] of palettes) if (enemyVariantWanted(sprite, p)) register(scene, enemyKey(sprite, p), frames, colors);
  }
  for (const [sprite, design] of Object.entries(TOP_DESIGNS)) {
    const size = ENEMY_SPRITES[sprite as EnemySprite];
    const frames = designFrames(design()).map((f) => fit(f, size));
    for (const [p, colors] of palettes) if (enemyVariantWanted(sprite, p)) register(scene, turretTopKey(sprite, p), frames, colors);
  }
  for (const p of PALETTE_NAMES) {
    const spinner = enemyKey('en_spinner', p);
    if (scene.textures.exists(spinner)) createAnim(scene, spinnerAnimKey(p), spinner, [0, 1, 2, 3].map((frame) => ({ frame })), 16);
    const mine = enemyKey('hz_mine', p);
    if (scene.textures.exists(mine)) createAnim(scene, mineAnimKey(p), mine, [{ frame: 0 }, { frame: 1, duration: 300 }], 4);
  }
}
