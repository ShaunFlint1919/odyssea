// =====================================================================================
//  BOSS ART — 8 planet bosses + destroyable boss parts, generated procedurally for every
//  Palette. Each sprite is composed once as a palette-independent code grid (src/art/
//  b_boss_kit.ts) and rendered per palette (ramp digits swapped, glows fixed).
//
//  Textures (each with its shadowKey(key) silhouette, exactly like addTextureWithShadow;
//  the palette variants of one shape share a single shadow canvas):
//   - bossKey(boss, palette)          body, BOSS_SPRITES size (square canvas), facing DOWN
//   - bossDamagedKey(boss, palette)   same body with battle damage (final phase)
//   - bossKey(part, palette)          BOSS_PART_SPRITES (turret/cannon/pod barrels point DOWN
//                                     at rotation 0, pivot = texture centre)
//   - bossCorePulseKey(palette)       2-frame sheet (0 = normal, 1 = bright beat) of part_core,
//                                     animation bossCorePulseAnim(palette) (6 fps, loops)
//  BOSS_MOUNTS lists, per boss, the offsets (from the sprite centre) of the sockets drawn on
//  the body for each part type, plus the built-in gun muzzles.
// =====================================================================================
import Phaser from 'phaser';
import { PALETTE_NAMES, type Palette } from '../types';
import { BOSS_PART_SPRITES, BOSS_SPRITES, bossKey, shadowKey, type BossPartSprite, type BossSprite } from './keys';
import { addSheet, addTexture, silhouette } from './pixel';
import { gridCanvas, outlineGrid, type Grid } from './b_boss_kit';
import { drawColossus } from './b_boss_colossus';
import { drawHydra } from './b_boss_hydra';
import { drawDreadnought } from './b_boss_dreadnought';
import { drawHive } from './b_boss_hive';
import { drawForge } from './b_boss_forge';
import { drawCryo } from './b_boss_cryo';
import { drawVoidcarrier } from './b_boss_voidcarrier';
import { drawArchitect } from './b_boss_architect';
import { drawCannon, drawCore, drawPod, drawTurret, drawWing } from './b_boss_parts';
import { damaged } from './b_boss_damage';
import { BOSS_MOUNTS } from './b_boss_mounts';

export type { BossMounts, Offset } from './b_boss_types';

/** Part sockets / muzzles drawn on each boss body (re-exported from the Phaser-free b_boss_mounts.ts). */
export { BOSS_MOUNTS } from './b_boss_mounts';

/** Battle-damaged body texture (cracks, holes with glowing internals, scorch) for the final phase. */
export const bossDamagedKey = (sprite: string, palette: Palette): string => `${bossKey(sprite, palette)}__dmg`;
/** 2-frame pulse sheet of part_core (frames 0..1, 28x28 each). */
export const bossCorePulseKey = (palette: Palette): string => `${bossKey('part_core', palette)}__pulse`;
/** Looping animation over bossCorePulseKey(palette). */
export const bossCorePulseAnim = (palette: Palette): string => `anim_part_core__${palette}`;

const BODIES: Record<BossSprite, { draw: () => Grid; seed: number }> = {
  boss_colossus: { draw: drawColossus, seed: 101 },
  boss_hydra: { draw: drawHydra, seed: 202 },
  boss_dreadnought: { draw: drawDreadnought, seed: 303 },
  boss_forge: { draw: drawForge, seed: 404 },
  boss_cryo: { draw: drawCryo, seed: 505 },
  boss_hive: { draw: drawHive, seed: 606 },
  boss_voidcarrier: { draw: drawVoidcarrier, seed: 707 },
  boss_architect: { draw: drawArchitect, seed: 808 },
};

const PARTS: Record<BossPartSprite, () => Grid> = {
  part_turret: drawTurret,
  part_cannon: drawCannon,
  part_pod: drawPod,
  part_core: () => drawCore(0),
  part_wing: drawWing,
};

function checkSize(name: string, g: Grid, size: number): void {
  if (import.meta.env?.DEV && (g.w !== size || g.h !== size)) console.warn(`[bosses] ${name} is ${g.w}x${g.h}, expected ${size}`);
}

/**
 * Render an (outlined) grid for every palette and register each texture plus its shadow
 * (same 38 % black silhouette as addTextureWithShadow, built once and shared by the palettes).
 */
function addPaletteSet(scene: Phaser.Scene, grid: Grid, keyOf: (pal: Palette) => string): void {
  let shadow: HTMLCanvasElement | null = null;
  for (const pal of PALETTE_NAMES) {
    const canvas = gridCanvas(grid, pal);
    shadow ??= silhouette(canvas, '#000000', 0.38);
    addTexture(scene, keyOf(pal), canvas);
    addTexture(scene, shadowKey(keyOf(pal)), shadow);
  }
}

/** Generates every boss body, damaged body and boss part for every palette. */
export function generateBossArt(scene: Phaser.Scene): void {
  const t0 = performance.now();
  for (const sprite of Object.keys(BOSS_SPRITES) as BossSprite[]) {
    const def = BODIES[sprite];
    const raw = def.draw();
    checkSize(sprite, raw, BOSS_SPRITES[sprite]);
    addPaletteSet(scene, outlineGrid(raw), (pal) => bossKey(sprite, pal));
    addPaletteSet(scene, outlineGrid(damaged(raw, def.seed, BOSS_MOUNTS[sprite])), (pal) => bossDamagedKey(sprite, pal));
  }
  for (const part of Object.keys(BOSS_PART_SPRITES) as BossPartSprite[]) {
    const g = PARTS[part]();
    checkSize(part, g, BOSS_PART_SPRITES[part]);
    addPaletteSet(scene, outlineGrid(g), (pal) => bossKey(part, pal));
  }
  const beat = [outlineGrid(drawCore(0)), outlineGrid(drawCore(1))];
  for (const pal of PALETTE_NAMES) {
    const key = bossCorePulseKey(pal);
    addSheet(scene, key, beat.map((g) => gridCanvas(g, pal)));
    const anim = bossCorePulseAnim(pal);
    if (!scene.anims.exists(anim)) {
      scene.anims.create({ key: anim, frames: [{ key, frame: 0 }, { key, frame: 1 }], frameRate: 6, repeat: -1 });
    }
  }
  if (import.meta.env?.DEV) console.info(`[bosses] boss textures generated in ${(performance.now() - t0).toFixed(0)} ms`);
}
