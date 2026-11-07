// =====================================================================================
//  HUD GLYPHS — draws the game's bitmap fonts (FONT.s / FONT.m / FONT.l) onto 2D canvases.
//  The HUD composes all of its text into canvas textures (static panel, LCD strips, digit
//  frames, banner) instead of using BitmapText objects: no per-frame setText, no masks, and
//  marquees become a cheap crop window. Reads the bitmap-font cache entry produced by the
//  art module (RetroFont: glyph rects relative to the texture frame).
// =====================================================================================
import Phaser from 'phaser';
import { ensureFonts, type FontSize } from '../kit';
import { FONT } from '../../art/keys';
import { makeCanvas } from '../../art/pixel';

interface GlyphRect {
  x: number;
  y: number;
  width: number;
  height: number;
  xOffset: number;
  yOffset: number;
  xAdvance: number;
}

const NOMINAL: Record<FontSize, [number, number]> = { s: [6, 8], m: [8, 10], l: [12, 16] };
const FONT_KEYS: Record<FontSize, string> = { s: FONT.s, m: FONT.m, l: FONT.l };

/** RGB triplet 0..255. */
export type Rgb = [number, number, number];

export const rgbOf = (c: number): Rgb => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

/** A bitmap font readable from canvas code. */
export class GlyphFont {
  readonly size: FontSize;
  /** Advance of one cell (fixed-width fonts) and line height, in px. */
  readonly cellW: number;
  readonly cellH: number;
  private readonly src: CanvasImageSource | null;
  private readonly ox: number;
  private readonly oy: number;
  private readonly chars: Record<number, GlyphRect>;

  private constructor(size: FontSize, src: CanvasImageSource | null, ox: number, oy: number, chars: Record<number, GlyphRect>, cellW: number, cellH: number) {
    this.size = size;
    this.src = src;
    this.ox = ox;
    this.oy = oy;
    this.chars = chars;
    this.cellW = cellW;
    this.cellH = cellH;
  }

  /** Loads a font from the bitmap-font cache (registers the kit fallback fonts if missing). */
  static load(scene: Phaser.Scene, size: FontSize): GlyphFont {
    ensureFonts(scene);
    const key = FONT_KEYS[size];
    const [nw, nh] = NOMINAL[size];
    const entry = scene.cache.bitmapFont.get(key) as
      | { data?: { chars?: Record<number, GlyphRect>; lineHeight?: number }; texture?: string; frame?: string | null }
      | undefined;
    const chars = entry?.data?.chars ?? {};
    let src: CanvasImageSource | null = null;
    let ox = 0;
    let oy = 0;
    if (entry?.texture && scene.textures.exists(entry.texture)) {
      const frame = entry.frame ? scene.textures.getFrame(entry.texture, entry.frame) : scene.textures.getFrame(entry.texture);
      const img = frame?.source?.image as unknown;
      if (img instanceof HTMLCanvasElement || img instanceof HTMLImageElement
        || (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap)) {
        src = img as CanvasImageSource;
        ox = frame.cutX;
        oy = frame.cutY;
      }
    }
    const probe = chars[65] ?? chars[48];
    const cellW = probe?.xAdvance || nw;
    const cellH = entry?.data?.lineHeight || probe?.height || nh;
    return new GlyphFont(size, src, ox, oy, chars, cellW, cellH);
  }

  private glyph(code: number): GlyphRect | undefined {
    const g = this.chars[code];
    if (g) return g;
    // Upper-case fallback (fonts may only ship capitals).
    if (code >= 97 && code <= 122) return this.chars[code - 32];
    return undefined;
  }

  /** Width in px of a single-line string. */
  width(str: string): number {
    let w = 0;
    for (let i = 0; i < str.length; i++) {
      const g = this.glyph(str.charCodeAt(i));
      w += g ? g.xAdvance || this.cellW : this.cellW;
    }
    return w;
  }

  /** Draws raw glyphs (no tint) at (x, y). Returns the advance width. */
  draw(ctx: CanvasRenderingContext2D, str: string, x: number, y: number): number {
    let cx = x;
    for (let i = 0; i < str.length; i++) {
      const g = this.glyph(str.charCodeAt(i));
      if (g && this.src && g.width > 0 && g.height > 0) {
        try {
          ctx.drawImage(this.src, this.ox + g.x, this.oy + g.y, g.width, g.height, cx + g.xOffset, y + g.yOffset, g.width, g.height);
        } catch {
          // An undrawable source (should not happen with canvas fonts): text stays blank.
        }
      }
      cx += g ? g.xAdvance || this.cellW : this.cellW;
    }
    return cx - x;
  }
}

export interface RenderOpts {
  /** Multiplicative tint (like BitmapText.setTint); omit for the font's own colours. */
  tint?: number;
  /** 1 px dark outline all around (adds 1 px margin on every side). */
  outline?: string;
  /** Soft neon halo around bright pixels: colour + alpha of the 4-neighbours (diagonals half). */
  halo?: { color: number; alpha: number };
}

/** Multiplies every pixel by `tint` (keeps alpha). */
export function tintCanvas(canvas: HTMLCanvasElement, tint: number): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const [tr, tg, tb] = rgbOf(tint);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    d[i] = (d[i] * tr) / 255;
    d[i + 1] = (d[i + 1] * tg) / 255;
    d[i + 2] = (d[i + 2] * tb) / 255;
  }
  ctx.putImageData(img, 0, 0);
}

/** Adds a 1 px outline (8-neighbourhood) of `color` into transparent pixels. */
export function outlineInto(canvas: HTMLCanvasElement, color: Rgb): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  const w = canvas.width, h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] > 60 ? 1 : 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (solid[y * w + x]) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if ((dx || dy) && nx >= 0 && ny >= 0 && nx < w && ny < h && solid[ny * w + nx]) { near = true; break; }
        }
      }
      if (near) {
        const i = (y * w + x) * 4;
        d[i] = color[0]; d[i + 1] = color[1]; d[i + 2] = color[2]; d[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Adds a soft halo of `color` around bright pixels (luma > 90) into transparent pixels. */
export function haloInto(canvas: HTMLCanvasElement, color: number, alpha: number): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  const w = canvas.width, h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const lit = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    lit[i] = d[o + 3] > 100 && d[o] * 0.3 + d[o + 1] * 0.55 + d[o + 2] * 0.15 > 90 ? 1 : 0;
  }
  const [r, g, b] = rgbOf(color);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (d[o + 3] !== 0) continue;
      let a = 0;
      if ((x > 0 && lit[y * w + x - 1]) || (x < w - 1 && lit[y * w + x + 1])
        || (y > 0 && lit[(y - 1) * w + x]) || (y < h - 1 && lit[(y + 1) * w + x])) a = alpha;
      else if ((x > 0 && y > 0 && lit[(y - 1) * w + x - 1]) || (x < w - 1 && y > 0 && lit[(y - 1) * w + x + 1])
        || (x > 0 && y < h - 1 && lit[(y + 1) * w + x - 1]) || (x < w - 1 && y < h - 1 && lit[(y + 1) * w + x + 1])) a = alpha * 0.5;
      if (a > 0) { d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = Math.round(a * 255); }
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Renders a single-line string to a new canvas (tint / outline / halo applied). With an
 * outline or a halo the canvas has a 1 px margin on every side (text drawn at (1, 1)).
 */
export function renderText(font: GlyphFont, str: string, opts: RenderOpts = {}): HTMLCanvasElement {
  const m = opts.outline || opts.halo ? 1 : 0;
  const w = Math.max(1, font.width(str));
  const { canvas, ctx } = makeCanvas(w + m * 2, font.cellH + m * 2);
  font.draw(ctx, str, m, m);
  if (opts.tint !== undefined && opts.tint !== 0xffffff) tintCanvas(canvas, opts.tint);
  if (opts.outline) outlineInto(canvas, hexRgb(opts.outline));
  if (opts.halo) haloInto(canvas, opts.halo.color, opts.halo.alpha);
  return canvas;
}

/** Turns every bright pixel white and drops the others (silhouette for shine sweeps). */
export function brightMask(src: HTMLCanvasElement, threshold = 70): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, src.width, src.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const luma = d[i] * 0.3 + d[i + 1] * 0.55 + d[i + 2] * 0.15;
    if (d[i + 3] > 100 && luma > threshold) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 255; }
    else d[i + 3] = 0;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Recolours by luminance through a colour ramp (dark -> light), keeping alpha. */
export function gradientMap(canvas: HTMLCanvasElement, stops: string[]): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const rgb = stops.map(hexRgb);
  const n = rgb.length - 1;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const l = (d[i] * 0.3 + d[i + 1] * 0.55 + d[i + 2] * 0.15) / 255;
    const f = Math.min(0.9999, Math.max(0, l)) * n;
    const k = Math.floor(f), t = f - k;
    d[i] = rgb[k][0] + (rgb[k + 1][0] - rgb[k][0]) * t;
    d[i + 1] = rgb[k][1] + (rgb[k + 1][1] - rgb[k][1]) * t;
    d[i + 2] = rgb[k][2] + (rgb[k + 1][2] - rgb[k][2]) * t;
  }
  ctx.putImageData(img, 0, 0);
}

export function hexRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** The three HUD fonts. */
export interface HudFonts { s: GlyphFont; m: GlyphFont; l: GlyphFont }

export function loadHudFonts(scene: Phaser.Scene): HudFonts {
  return { s: GlyphFont.load(scene, 's'), m: GlyphFont.load(scene, 'm'), l: GlyphFont.load(scene, 'l') };
}
