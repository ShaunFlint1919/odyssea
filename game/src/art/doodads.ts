import Phaser from 'phaser';
import { CLOUD_SPRITES, DOODAD_SPRITES } from './keys';
import { addTexture } from './pixel';
import { valueNoise } from './noise';
import { Spr, dith, mixc } from './b_ter_sprite';
import { LAND_DOODADS } from './b_ter_dd_land';
import { MISC_DOODADS } from './b_ter_dd_misc';

/** Cloud puff layouts: canvas size + blobs [cx, cy, r]. */
const CLOUDS: Record<string, { w: number; h: number; blobs: number[][]; seed: number }> = {
  cloud_a: { w: 64, h: 40, seed: 11, blobs: [[18, 23, 11], [30, 17, 13], [43, 21, 12], [27, 27, 10], [50, 27, 8], [37, 28, 10]] },
  cloud_b: { w: 64, h: 40, seed: 23, blobs: [[14, 24, 9], [25, 20, 12], [38, 16, 11], [49, 22, 10], [32, 27, 11], [21, 29, 8]] },
  cloud_c: { w: 60, h: 36, seed: 37, blobs: [[17, 19, 10], [29, 15, 11], [41, 19, 10], [30, 24, 10], [46, 25, 7]] },
};

/** Soft white puff: dithered alpha falloff at the edges, light grey on the south-east side. */
function cloud(def: { w: number; h: number; blobs: number[][]; seed: number }): Spr {
  const s = new Spr(def.w, def.h);
  const dens = (x: number, y: number): number => {
    let d = -1;
    for (const [cx, cy, r] of def.blobs) d = Math.max(d, 1 - Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.15) / r);
    return d + (valueNoise(x / 5, y / 5, def.seed) - 0.5) * 0.32 + (valueNoise(x / 2.5, y / 2.5, def.seed + 1) - 0.5) * 0.1;
  };
  for (let y = 0; y < def.h; y++) {
    for (let x = 0; x < def.w; x++) {
      const d = dens(x, y);
      if (d <= 0) continue;
      const lvl = Math.floor(Math.min(1, d * 2.4) * 4 + dith(x, y)) / 4;
      if (lvl <= 0) continue;
      const grad = dens(x + 1, y + 1) - dens(x - 1, y - 1);
      const lit = Math.max(0, Math.min(1, 0.55 + grad * 3.2 + d * 0.3));
      const k = Math.floor(lit * 3 + dith(x + 1, y)) / 3;
      s.set(x, y, mixc(0xaeb6c6, 0xffffff, k), Math.round(lvl * 255));
    }
  }
  return s;
}

let cache: Map<string, HTMLCanvasElement> | null = null;

/**
 * Paints every terrain doodad (all DOODAD_SPRITES keys) and cloud puff (CLOUD_SPRITES) and
 * returns them as canvases keyed by texture key. Cached after the first call.
 */
export function buildDoodadCanvases(): Map<string, HTMLCanvasElement> {
  if (cache) return cache;
  const out = new Map<string, HTMLCanvasElement>();
  const factories: Record<string, () => Spr> = { ...LAND_DOODADS, ...MISC_DOODADS };
  for (const keys of Object.values(DOODAD_SPRITES)) {
    for (const key of keys) {
      const make = factories[key];
      if (!make) {
        if (import.meta.env?.DEV) console.warn(`[doodads] no painter for '${key}'`);
        continue;
      }
      out.set(key, make().canvas());
    }
  }
  for (const key of CLOUD_SPRITES) out.set(key, cloud(CLOUDS[key]).canvas());
  cache = out;
  return out;
}

/** Registers every terrain doodad and cloud texture (keys from DOODAD_SPRITES / CLOUD_SPRITES). */
export function generateDoodadArt(scene: Phaser.Scene): void {
  for (const [key, canvas] of buildDoodadCanvases()) addTexture(scene, key, canvas);
}
