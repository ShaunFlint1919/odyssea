// =====================================================================================
//  PIXEL-ART FACTORY — shared helpers to author sprites as ASCII pixel maps and turn
//  them into Phaser textures. Used by every src/art/*.ts module.
//
//  Pixel map convention:
//   - one string per row, every row the same length
//   - '.' or ' ' = transparent
//   - digits '1'..'5' = swappable colour ramp (dark -> light), filled from a Palette
//     (see rampColors()) so one map can be rendered in many colour variants
//   - any other char = colour from the ColorMap passed in (COMMON_COLORS + overrides)
// =====================================================================================
import Phaser from 'phaser';
import type { Palette } from '../types';
import { PALETTE_RAMPS } from './palettes';

export type PixelMap = string[];
export type ColorMap = Record<string, string>; // char -> '#rrggbb' or '#rrggbbaa'

/** Shared fixed colours. Override/extend per sprite: { ...COMMON_COLORS, x: '#ff00ff' }. */
export const COMMON_COLORS: ColorMap = {
  k: '#0a0810',   // outline / near black
  K: '#1c1824',   // dark metal shadow
  g: '#3c3848',   // gunmetal dark
  G: '#646074',   // gunmetal mid
  h: '#9a96aa',   // gunmetal light
  H: '#d4d0e0',   // gunmetal highlight
  w: '#ffffff',   // white
  c: '#1a5a8a',   // canopy glass dark
  C: '#48b8f0',   // canopy glass mid
  q: '#c8f4ff',   // canopy glass highlight
  e: '#c03010',   // engine glow dark
  E: '#ff7a20',   // engine glow mid
  y: '#ffe060',   // engine glow hot / yellow light
  r: '#901818',   // red dark
  R: '#e83a3a',   // red light
  t: '#0c6b62',   // teal dark
  T: '#2ee6c8',   // teal neon
  m: '#7a2a9a',   // magenta dark
  M: '#d04cff',   // magenta neon
};

const colorCache = new Map<string, [number, number, number, number]>();

/** Parse '#rgb', '#rrggbb' or '#rrggbbaa' into [r,g,b,a] (0..255). */
export function parseColor(hex: string): [number, number, number, number] {
  const cached = colorCache.get(hex);
  if (cached) return cached;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255;
  const out: [number, number, number, number] = [r, g, b, a];
  colorCache.set(hex, out);
  return out;
}

export function toHex(r: number, g: number, b: number, a = 255): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}${a < 255 ? c(a) : ''}`;
}

/** Mix two hex colours (t = 0 -> a, 1 -> b). */
export function mix(a: string, b: string, t: number): string {
  const A = parseColor(a);
  const B = parseColor(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t, A[3] + (B[3] - A[3]) * t);
}

/** Colour map for digits '1'..'5' from a palette ramp (dark -> light). */
export function rampColors(palette: Palette): ColorMap {
  const ramp = PALETTE_RAMPS[palette];
  return { '1': ramp[0], '2': ramp[1], '3': ramp[2], '4': ramp[3], '5': ramp[4] };
}

export function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/** Width/height of a pixel map. */
export function mapSize(map: PixelMap): { w: number; h: number } {
  let w = 0;
  for (const row of map) w = Math.max(w, row.length);
  return { w, h: map.length };
}

/** Paint a pixel map onto a context at (ox, oy). Unknown chars throw in dev to catch typos. */
export function paintMap(ctx: CanvasRenderingContext2D, map: PixelMap, colors: ColorMap, ox = 0, oy = 0): void {
  const { w, h } = mapSize(map);
  if (w === 0 || h === 0) return;
  const img = ctx.getImageData(ox, oy, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const row = map[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const hex = colors[ch];
      if (!hex) {
        if (import.meta.env?.DEV) console.warn(`[pixel] unknown colour char '${ch}'`);
        continue;
      }
      const [r, g, b, a] = parseColor(hex);
      const i = (y * w + x) * 4;
      if (a === 255) {
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      } else {
        // alpha-over onto whatever is there
        const sa = a / 255;
        const da = d[i + 3] / 255;
        const oa = sa + da * (1 - sa);
        d[i] = (r * sa + d[i] * da * (1 - sa)) / (oa || 1);
        d[i + 1] = (g * sa + d[i + 1] * da * (1 - sa)) / (oa || 1);
        d[i + 2] = (b * sa + d[i + 2] * da * (1 - sa)) / (oa || 1);
        d[i + 3] = oa * 255;
      }
    }
  }
  ctx.putImageData(img, ox, oy);
}

/** Render a pixel map to a new canvas (optionally scaled by an integer factor). */
export function mapToCanvas(map: PixelMap, colors: ColorMap, scale = 1): HTMLCanvasElement {
  const { w, h } = mapSize(map);
  const { canvas, ctx } = makeCanvas(w, h);
  paintMap(ctx, map, colors);
  if (scale === 1) return canvas;
  return scaleCanvas(canvas, scale);
}

export function scaleCanvas(src: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(src.width * scale, src.height * scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, src.width * scale, src.height * scale);
  return canvas;
}

/**
 * Build a horizontally symmetric map from its LEFT half.
 * If `oddCenter` is true the last column of each half-row is the centre column (not duplicated),
 * giving an odd total width.
 */
export function mirrorH(half: PixelMap, oddCenter = false): PixelMap {
  return half.map((row) => {
    const left = row;
    const right = (oddCenter ? row.slice(0, -1) : row).split('').reverse().join('');
    return left + right;
  });
}

/** Flip a map vertically (e.g. author a ship nose-up, flip for enemies nose-down). */
export function flipV(map: PixelMap): PixelMap {
  return [...map].reverse();
}

/** Flip a map horizontally. */
export function flipH(map: PixelMap): PixelMap {
  return map.map((r) => r.split('').reverse().join(''));
}

/** Pad a map with transparent pixels so it is exactly w x h (centred). */
export function padMap(map: PixelMap, w: number, h: number): PixelMap {
  const s = mapSize(map);
  const left = Math.floor((w - s.w) / 2);
  const top = Math.floor((h - s.h) / 2);
  const out: PixelMap = [];
  for (let y = 0; y < h; y++) {
    const src = map[y - top];
    if (!src) { out.push('.'.repeat(w)); continue; }
    const row = '.'.repeat(Math.max(0, left)) + src.padEnd(s.w, '.');
    out.push(row.padEnd(w, '.').slice(0, w));
  }
  return out;
}

/**
 * Add a 1px outline in `color` around every opaque pixel, writing only into transparent
 * pixels. The canvas keeps its size, so leave a 1px transparent margin in your maps.
 */
export function outlineCanvas(src: HTMLCanvasElement, color = COMMON_COLORS.k, diagonals = false): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  const w = src.width, h = src.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] > 40 ? 1 : 0;
  const [r, g, b, a] = parseColor(color);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (solid[y * w + x]) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          if (!diagonals && dx && dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (solid[ny * w + nx]) { near = true; break; }
        }
      }
      if (near) {
        const i = (y * w + x) * 4;
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Solid silhouette of a canvas (used for ground shadows of air units). */
export function silhouette(src: HTMLCanvasElement, color = '#000000', alpha = 0.4): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, src.width, src.height);
  return canvas;
}

/**
 * Register a static canvas as an image texture. Unlike textures.addCanvas(), this does NOT keep a
 * second full ImageData copy of every texture in CPU memory (CanvasTexture calls getImageData in
 * its constructor) — a large boot-time and memory saving on phones. The canvas stays the source
 * image (getSourceImage() returns it; WebGL context restore re-uploads from it). Use
 * textures.createCanvas() instead for textures you redraw and refresh() at runtime.
 */
function addStaticCanvas(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): Phaser.Textures.Texture | null {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  return scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
}

/** Register (or replace) a canvas as a Phaser texture. */
export function addTexture(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  addStaticCanvas(scene, key, canvas);
}

/**
 * Pack frames (same size) horizontally into one texture with numbered frames 0..n-1.
 * Use with scene.anims.create({ frames: scene.anims.generateFrameNumbers(key) ... }) or
 * frames: Array.from({length:n}, (_, i) => ({ key, frame: i })).
 */
export function addSheet(scene: Phaser.Scene, key: string, frames: HTMLCanvasElement[]): void {
  if (frames.length === 0) return;
  const fw = frames[0].width, fh = frames[0].height;
  const { canvas, ctx } = makeCanvas(fw * frames.length, fh);
  frames.forEach((f, i) => ctx.drawImage(f, i * fw, 0));
  const tex = addStaticCanvas(scene, key, canvas);
  if (!tex) return;
  frames.forEach((_, i) => tex.add(i, 0, i * fw, 0, fw, fh));
}

/** Also register the ground-shadow texture for `key` (see shadowKey in keys.ts). */
export function addTextureWithShadow(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  addTexture(scene, key, canvas);
  addTexture(scene, `${key}__shadow`, silhouette(canvas, '#000000', 0.38));
}

/** Draw a soft radial glow (for additive blending). */
export function radialGlow(size: number, color: string, power = 2): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size, size);
  const [r, g, b] = parseColor(color);
  const img = ctx.createImageData(size, size);
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - c, y - c) / (size / 2);
      const a = Math.max(0, 1 - dist) ** power;
      const i = (y * size + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Pixel-perfect filled circle (no anti-aliasing) on a context. */
export function pixelCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  const r2 = r * r;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r2 + r * 0.8) ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
    }
  }
}

/** Ordered 4x4 Bayer dithering threshold (0..1) for retro gradients. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(x: number, y: number): number {
  return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}
