// =====================================================================================
//  HUD PAINT — small pixel-exact 2D-canvas drawing helpers used to compose the static HUD
//  panel and its sprite parts once at creation time (never per frame).
// =====================================================================================
import Phaser from 'phaser';
import { bayer, mix, parseColor, toHex } from '../../art/pixel';
import type { Rect } from './layout';

export type Ctx = CanvasRenderingContext2D;

/** 0xrrggbb -> '#rrggbb'. */
export const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** Lighten (f > 0) or darken (f < 0) a hex colour towards white / black. */
export function shade(color: string, f: number): string {
  return f >= 0 ? mix(color, '#ffffff', f) : mix(color, '#000000', -f);
}

export function withAlpha(color: string, a: number): string {
  const [r, g, b] = parseColor(color);
  return toHex(r, g, b, Math.round(Math.max(0, Math.min(1, a)) * 255));
}

export function fill(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export const px = (ctx: Ctx, x: number, y: number, color: string) => fill(ctx, x, y, 1, 1, color);
export const hline = (ctx: Ctx, x: number, y: number, w: number, color: string) => fill(ctx, x, y, w, 1, color);
export const vline = (ctx: Ctx, x: number, y: number, h: number, color: string) => fill(ctx, x, y, 1, h, color);

/** 1 px rectangle outline. */
export function strokeRect(ctx: Ctx, r: Rect, color: string): void {
  hline(ctx, r.x, r.y, r.w, color);
  hline(ctx, r.x, r.y + r.h - 1, r.w, color);
  vline(ctx, r.x, r.y, r.h, color);
  vline(ctx, r.x + r.w - 1, r.y, r.h, color);
}

/** Parsed '#rrggbb' -> [r, g, b] (cached by pixel.ts). */
export const rgb = (c: string): [number, number, number] => {
  const p = parseColor(c);
  return [p[0], p[1], p[2]];
};

/**
 * Writes pixels of a rect through one getImageData / putImageData pair. `fn` receives the
 * local coordinates, the data array and the byte offset, and writes RGBA (replace, no blend).
 */
export function paintPixels(ctx: Ctx, x: number, y: number, w: number, h: number, fn: (xx: number, yy: number, d: Uint8ClampedArray, o: number) => void): void {
  if (w <= 0 || h <= 0) return;
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) fn(xx, yy, d, (yy * w + xx) * 4);
  ctx.putImageData(img, x, y);
}

/** Vertical gradient with 4x4 ordered dithering between adjacent rows (opaque, replaces pixels). */
export function vgrad(ctx: Ctx, x: number, y: number, w: number, h: number, top: string, bottom: string, steps = 6): void {
  if (h <= 0 || w <= 0) return;
  const cols: [number, number, number][] = [];
  for (let i = 0; i <= steps; i++) cols.push(rgb(mix(top, bottom, i / steps)));
  paintPixels(ctx, x, y, w, h, (xx, yy, d, o) => {
    const t = h <= 1 ? 0 : (yy / (h - 1)) * steps;
    const i0 = Math.min(steps, Math.floor(t));
    const c = t - i0 > bayer(x + xx, y + yy) && i0 < steps ? cols[i0 + 1] : cols[i0];
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  });
}

/** Recessed bevel: dark top / left lines, light bottom / right lines, on the rect border. */
export function insetBevel(ctx: Ctx, r: Rect, dark: string, light: string): void {
  hline(ctx, r.x, r.y, r.w, dark);
  vline(ctx, r.x, r.y, r.h, dark);
  hline(ctx, r.x + 1, r.y + r.h - 1, r.w - 1, light);
  vline(ctx, r.x + r.w - 1, r.y + 1, r.h - 1, light);
}

/** Raised plate: outline, top / left highlight, bottom / right shadow, gradient body. */
export function raisedPlate(ctx: Ctx, r: Rect, body: [string, string], hi: string, lo: string, outline: string): void {
  vgrad(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, body[0], body[1], 4);
  hline(ctx, r.x + 1, r.y + 1, r.w - 2, hi);
  vline(ctx, r.x + 1, r.y + 1, r.h - 2, shade(hi, -0.12));
  hline(ctx, r.x + 1, r.y + r.h - 2, r.w - 2, lo);
  vline(ctx, r.x + r.w - 2, r.y + 2, r.h - 3, shade(lo, 0.1));
  strokeRect(ctx, r, outline);
  // softened corners
  ctx.clearRect(r.x, r.y, 1, 1);
  ctx.clearRect(r.x + r.w - 1, r.y, 1, 1);
  ctx.clearRect(r.x, r.y + r.h - 1, 1, 1);
  ctx.clearRect(r.x + r.w - 1, r.y + r.h - 1, 1, 1);
}

/** Source image + rect of a texture's base frame if it is drawable on a 2D canvas. */
export interface TexSource { img: CanvasImageSource; x: number; y: number; w: number; h: number }

export function textureSource(scene: Phaser.Scene, key: string): TexSource | null {
  if (!scene.textures.exists(key)) return null;
  const frame = scene.textures.getFrame(key);
  const img = frame?.source?.image as unknown;
  if (!(img instanceof HTMLCanvasElement || img instanceof HTMLImageElement)) return null;
  if (frame.cutWidth <= 0 || frame.cutHeight <= 0) return null;
  return { img, x: frame.cutX, y: frame.cutY, w: frame.cutWidth, h: frame.cutHeight };
}

/** Draws a texture's base frame at (x, y) (optionally scaled to w x h). Returns false if unavailable. */
export function drawTexture(ctx: Ctx, scene: Phaser.Scene, key: string, x: number, y: number, w?: number, h?: number): boolean {
  const s = textureSource(scene, key);
  if (!s) return false;
  ctx.drawImage(s.img, s.x, s.y, s.w, s.h, x, y, w ?? s.w, h ?? s.h);
  return true;
}

/** Draws a texture as a 9-slice with `c` px corners into r. Returns false if unavailable. */
export function nineSlice(ctx: Ctx, scene: Phaser.Scene, key: string, r: Rect, c: number): boolean {
  const s = textureSource(scene, key);
  if (!s || s.w < c * 2 + 1 || s.h < c * 2 + 1 || r.w < c * 2 || r.h < c * 2) return false;
  const iw = s.w - 2 * c, ih = s.h - 2 * c, dw = r.w - 2 * c, dh = r.h - 2 * c;
  const part = (sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, w: number, h: number) => {
    if (w > 0 && h > 0) ctx.drawImage(s.img, s.x + sx, s.y + sy, sw, sh, r.x + dx, r.y + dy, w, h);
  };
  part(0, 0, c, c, 0, 0, c, c);
  part(c, 0, iw, c, c, 0, dw, c);
  part(c + iw, 0, c, c, c + dw, 0, c, c);
  part(0, c, c, ih, 0, c, c, dh);
  part(c, c, iw, ih, c, c, dw, dh);
  part(c + iw, c, c, ih, c + dw, c, c, dh);
  part(0, c + ih, c, c, 0, c + dh, c, c);
  part(c, c + ih, iw, c, c, c + dh, dw, c);
  part(c + iw, c + ih, c, c, c + dw, c + dh, c, c);
  return true;
}

/** Linear colour ramp through evenly spaced stops (t = 0..1). */
export function ramp(stops: string[], t: number): string {
  const n = stops.length - 1;
  const f = Math.max(0, Math.min(1, t)) * n;
  const i = Math.min(n - 1, Math.floor(f));
  return mix(stops[i], stops[i + 1], f - i);
}
