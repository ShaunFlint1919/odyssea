// =====================================================================================
//  META SCREENS — planet visuals for the hangar and the galaxy map: biome tints and
//  planet globe textures at any size (planet_<biome>_lg / planetKey(biome) from the art
//  module, smoothly resampled; a shaded procedural globe if that art is missing).
// =====================================================================================
import Phaser from 'phaser';
import type { Biome } from '../../types';
import { planetKey } from '../../art/keys';
import { addTexture, bayer, makeCanvas, parseColor } from '../../art/pixel';
import { fbm } from '../../art/noise';
import { resampled } from './art';

/** Signature glow colour of each biome (halos, route accents, labels). */
export const BIOME_TINT: Record<Biome, number> = {
  desert: 0xffb050,
  jungle: 0x5cf07a,
  ocean: 0x40a0ff,
  cavern: 0xb070ff,
  space: 0xd04cff,
  lava: 0xff5a20,
  ice: 0xa8e8ff,
  techno: 0x2ee6c8,
};

const FALLBACK_RAMP: Record<Biome, [string, string, string]> = {
  desert: ['#5a3010', '#c88a3a', '#f2d08a'],
  jungle: ['#0e3a1a', '#2f8a3a', '#9ce07a'],
  ocean: ['#0a1a4a', '#2060c0', '#8ad0ff'],
  cavern: ['#1c0e2a', '#5a3a7a', '#b08ad0'],
  space: ['#140a2a', '#4a2a8a', '#d08aff'],
  lava: ['#2a0804', '#b03010', '#ffb040'],
  ice: ['#2a4a6a', '#8ac0e0', '#f0faff'],
  techno: ['#0a2a2a', '#1a8a80', '#9af0e0'],
};

/** Shaded procedural globe (only used when the planet art is missing). */
function fallbackGlobe(biome: Biome, size: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const [a, b, c] = FALLBACK_RAMP[biome].map((h) => parseColor(h));
  const r = size / 2 - 1;
  const seed = biome.length * 97;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - size / 2) / r, dy = (y + 0.5 - size / 2) / r;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      const z = Math.sqrt(1 - d2);
      const light = Math.max(0, -0.55 * dx - 0.6 * dy + 0.58 * z);
      const n = fbm(dx * 2.2 + 3, dy * 2.2 + 1, seed, 4);
      const t = Math.min(1, Math.max(0, light * 0.9 + (n - 0.5) * 0.6 + bayer(x, y) * 0.12));
      const lo = t < 0.5 ? a : b, hi = t < 0.5 ? b : c, k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      const i = (y * size + x) * 4;
      img.data[i] = lo[0] + (hi[0] - lo[0]) * k;
      img.data[i + 1] = lo[1] + (hi[1] - lo[1]) * k;
      img.data[i + 2] = lo[2] + (hi[2] - lo[2]) * k;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Texture key of a planet globe exactly `size` px wide (cached). */
export function planetTexture(scene: Phaser.Scene, biome: Biome, size: number): string {
  size = Math.max(8, Math.round(size));
  const lg = `${planetKey(biome)}_lg`;
  const base = planetKey(biome);
  const src = scene.textures.exists(lg) && (size > 48 || !scene.textures.exists(base)) ? lg : base;
  if (scene.textures.exists(src)) {
    const tex = scene.textures.get(src).get();
    if (tex.cutWidth === size) return src;
    return resampled(scene, src, size, undefined, true) ?? src;
  }
  const key = `meta_globe_${biome}_${size}`;
  if (!scene.textures.exists(key)) addTexture(scene, key, fallbackGlobe(biome, size));
  return key;
}
