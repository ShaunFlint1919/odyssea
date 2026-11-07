// =====================================================================================
//  LOOKS — composite visuals resolved once per weapon configuration (never per frame)
//  from the textures of ./art.ts: impact descriptions scaled to the weight of a hit and
//  the per-colour muzzle flash set.
//
//  Impact weight tiers (chosen by each gun from its per-hit damage and projectile size):
//   0 light   9 px spark, 11 px flash, 1 ember            (needles, small bolts, pellets)
//   1 medium  13 px spark, 15 px flash, 2 embers          (big bolts, waves, shards)
//   2 heavy   17 px spark, 23 px flash + white core, 4    (huge bolts, missiles, beams)
//   3 blast   17 px spark, 31 px flash + white core, 7 embers, splash ring of the exact
//             splash radius (mortar, mines, rockets)
// =====================================================================================
import type Phaser from 'phaser';
import type { ShotColor } from '../../types';
import { blastTex, flashTex, muzzleTex, sparkTex } from './art';
import type { TexInfo } from './textures';

/** What an impact draws (all textures pre-generated). */
export interface ImpactFx {
  readonly spark: TexInfo | null;
  readonly sparkMs: number;
  /** White stepped flash, tinted with the shot's glow colour. */
  readonly flash: TexInfo | null;
  readonly flashMs: number;
  readonly flashAlpha: number;
  /** Untinted white-hot inner flash (heavy hits). */
  readonly core: TexInfo | null;
  /** Splash shockwave sheet (exact splash radius), null for none. */
  readonly blast: TexInfo | null;
  readonly blastMs: number;
  readonly embers: number;
  readonly emberSpeed: number;
  /** Small spark shown on every NEW hit of a piercing shot. */
  readonly pierce: TexInfo | null;
}

/** An impact that draws nothing (hidden helper shots). */
export const NO_IMPACT: ImpactFx = {
  spark: null, sparkMs: 0, flash: null, flashMs: 0, flashAlpha: 0, core: null, blast: null, blastMs: 0,
  embers: 0, emberSpeed: 0, pierce: null,
};

/** Impact visuals of weight `tier` (0..3) in `color`; tier 3 adds a splash ring of `ringRadius` px. */
export function impactFx(scene: Phaser.Scene, color: ShotColor, tier: number, ringRadius = 0): ImpactFx {
  const t = Math.max(0, Math.min(3, Math.round(tier)));
  const sparkTier = t === 0 ? 0 : t === 1 ? 1 : 2;
  return {
    spark: sparkTex(scene, color, sparkTier),
    sparkMs: 110 + sparkTier * 25,
    flash: flashTex(scene, t === 3 ? 3 : t),
    flashMs: 90 + t * 30,
    flashAlpha: t === 0 ? 0.7 : 0.85,
    core: t >= 2 ? flashTex(scene, t === 3 ? 1 : 0) : null,
    blast: t === 3 && ringRadius > 0 ? blastTex(scene, color, ringRadius) : null,
    blastMs: 300 + Math.min(160, ringRadius * 2.5),
    embers: t === 0 ? 1 : t === 1 ? 2 : t === 2 ? 4 : 7,
    emberSpeed: 70 + t * 30,
    pierce: sparkTex(scene, color, t >= 2 ? 1 : 0),
  };
}

/** Soft impact (flames, shards, beams): a flash and an ember, no spark star. */
export function softImpactFx(scene: Phaser.Scene, color: ShotColor, tier: number): ImpactFx {
  const t = Math.max(0, Math.min(2, Math.round(tier)));
  return {
    spark: null, sparkMs: 0,
    flash: flashTex(scene, t), flashMs: 90 + t * 25, flashAlpha: 0.75,
    core: null, blast: null, blastMs: 0, embers: 1, emberSpeed: 60,
    pierce: sparkTex(scene, color, 0),
  };
}

/** Muzzle flash sheets of a colour, tiers 0..3 (9 / 13 / 17 / 21 px). */
export function muzzleSet(scene: Phaser.Scene, color: ShotColor): TexInfo[] {
  return [muzzleTex(scene, color, 0), muzzleTex(scene, color, 1), muzzleTex(scene, color, 2), muzzleTex(scene, color, 3)];
}

/** Splash radii are drawn with rings quantised to 4 px so power levels share textures. */
export function blastRadius(splash: number): number {
  return Math.max(8, Math.round(splash / 4) * 4);
}
