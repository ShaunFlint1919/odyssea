// =====================================================================================
//  UI KIT — shared widgets for every menu scene and the HUD.
//  CONTRACT: exported functions/classes keep their parameters and semantics; the API only
//  grows with OPTIONAL parameters / new exports (src/ui/Hud.ts, src/ui/hud/** and the Game
//  scene use ensureFonts + FontSize; every menu scene uses the rest).
//
//  Conventions: positions are in game px with a TOP-LEFT origin unless stated otherwise;
//  fonts are the bitmap fonts FONT.s / FONT.m / FONT.l from src/art/keys.ts (white glyphs,
//  tinted); colours come from COLORS in src/config.ts. The screen frame shared by every menu
//  (header strip, spacing grid, backdrop) lives in src/ui/widgets/screen.ts.
//
//  Internals:
//  - 9-slices are baked ONCE per (texture, size) into a cached canvas texture (pixel-perfect,
//    tiled edges/centre, one Image per panel → batches well); unused bakes are evicted
//    beyond a pixel budget. Missing art falls back to procedural gunmetal tiles.
//  - Modal dialogs (confirm, openModal) block keyboard input of the widgets/back handlers
//    created before them; Escape/Backspace/Android back go to the top-most handler only.
//  - Added exports: lineHeight, wrapText, nineSlice, openModal, isModalOpen, onBackIf,
//    modalLevel, MenuItem.arrows, MenuList.length/setValue/setLabel/rowContainer/rowY/cancelPress,
//    MenuListOpts.tapMode ('focusThenSelect': first tap focuses, second tap selects — for
//    purchases and other costly picks), IconButtonOpts (larger hit area, hover ring),
//    StatusBarOpts (right-hand text; help is upper-cased for a uniform look), isLeaving.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, DEPTH } from '../config';
import { FONT } from '../art/keys';
import { bayer } from '../art/pixel';
import { fbm } from '../art/noise';
import { audio } from '../audio';
import { onBackButton } from '../platform/device';
import type { SceneKey } from '../config';

export type FontSize = 's' | 'm' | 'l';

const FONT_KEY: Record<FontSize, string> = { s: FONT.s, m: FONT.m, l: FONT.l };
const FONT_CELL: Record<FontSize, [number, number]> = { s: [6, 8], m: [8, 10], l: [12, 16] };

type LeavingScene = Phaser.Scene & { __leaving?: boolean };
/** True while goto() fades the scene out (input is ignored until the next scene starts). */
export const isLeaving = (scene: Phaser.Scene): boolean => !!(scene as LeavingScene).__leaving;

// ------------------------------------------------------------------------------ fonts

/**
 * Makes sure the three bitmap fonts exist (registers a plain fallback font if the art module
 * has not produced one) — called automatically by text().
 */
export function ensureFonts(scene: Phaser.Scene): void {
  (Object.keys(FONT_KEY) as FontSize[]).forEach((size) => {
    const key = FONT_KEY[size];
    if (scene.cache.bitmapFont.exists(key)) return;
    const [cw, ch] = FONT_CELL[size];
    const chars = Phaser.GameObjects.RetroFont.TEXT_SET1;
    const perRow = 16;
    const rows = Math.ceil(chars.length / perRow);
    const texKey = `${key}__fallback_tex`;
    if (!scene.textures.exists(texKey)) {
      const canvas = document.createElement('canvas');
      canvas.width = cw * perRow;
      canvas.height = ch * rows;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'top';
      ctx.font = `bold ${Math.max(6, ch - 1)}px monospace`;
      for (let i = 0; i < chars.length; i++) {
        ctx.fillText(chars[i], (i % perRow) * cw, Math.floor(i / perRow) * ch, cw);
      }
      // Binarise the anti-aliased glyphs so the fallback stays crisp at pixel scale.
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let p = 3; p < img.data.length; p += 4) img.data[p] = img.data[p] > 110 ? 255 : 0;
      ctx.putImageData(img, 0, 0);
      scene.textures.addCanvas(texKey, canvas);
    }
    // NB: RetroFont.Parse returns the whole cache entry { data, texture, frame } (typed loosely).
    const entry = Phaser.GameObjects.RetroFont.Parse(scene, {
      image: texKey, width: cw, height: ch, chars, charsPerRow: perRow,
      'spacing.x': 0, 'spacing.y': 0, 'offset.x': 0, 'offset.y': 0, lineSpacing: 0,
    }) as unknown;
    scene.cache.bitmapFont.add(key, entry);
  });
}

export interface TextOpts {
  size?: FontSize;          // default 'm'
  color?: number;           // tint (ignored for size 'l', which is pre-coloured) — default COLORS.text
  originX?: number;         // 0 left (default), 0.5 centre, 1 right
  originY?: number;         // default 0 (top)
  maxWidth?: number;        // word-wrap width in px (0 = none)
  align?: 'left' | 'center' | 'right'; // multi-line alignment
  depth?: number;
}

/** Extra px between lines of multi-line text (the fonts' line height = cell height, no gap). */
const LINE_GAP = 2;

/** Bitmap text with the game fonts. */
export function text(scene: Phaser.Scene, x: number, y: number, str: string, opts: TextOpts = {}): Phaser.GameObjects.BitmapText {
  ensureFonts(scene);
  const size = opts.size ?? 'm';
  const t = scene.add.bitmapText(Math.round(x), Math.round(y), FONT_KEY[size], str);
  t.setLineSpacing(LINE_GAP); // only affects multi-line text (wrapped or containing '\n')
  t.setOrigin(opts.originX ?? 0, opts.originY ?? 0);
  if (size !== 'l') t.setTint(opts.color ?? COLORS.text);
  if (opts.maxWidth) t.setMaxWidth(opts.maxWidth);
  if (opts.align === 'center') t.setCenterAlign();
  else if (opts.align === 'right') t.setRightAlign();
  if (opts.depth !== undefined) t.setDepth(opts.depth);
  return t;
}

/** Horizontal advance (px) of one glyph of the given font (fixed-width fonts). */
function advance(scene: Phaser.Scene, size: FontSize): number {
  const entry = scene.cache.bitmapFont.get(FONT_KEY[size]) as { data?: { chars?: Record<number, { xAdvance?: number }> } } | undefined;
  const a = entry?.data?.chars?.[65]?.xAdvance;
  return typeof a === 'number' && a > 0 ? a : FONT_CELL[size][0];
}

/** Width in px of `str` rendered with a given font size (single line). */
export function measure(scene: Phaser.Scene, str: string, size: FontSize = 'm'): number {
  ensureFonts(scene);
  let longest = 0;
  let cur = 0;
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) === 10) { longest = Math.max(longest, cur); cur = 0; } else cur++;
  }
  return Math.max(longest, cur) * advance(scene, size);
}

/** Truncate to fit `maxPx` with the given font (adds '.' when cut; never leaves "WORD ."). */
export function fit(str: string, maxPx: number, size: FontSize = 'm'): string {
  const [cw] = FONT_CELL[size];
  const max = Math.max(1, Math.floor(maxPx / cw));
  if (str.length <= max) return str;
  const cut = str.slice(0, Math.max(1, max - 1)).trimEnd().replace(/[-,:;]+$/, '').trimEnd();
  return `${cut || str.slice(0, 1)}.`;
}

/** Glyph cell height in px of a font size (line height without extra spacing). */
export function lineHeight(size: FontSize = 'm'): number {
  return FONT_CELL[size][1];
}

/**
 * Greedy word-wrap for the fixed-width fonts: returns `str` with '\n' inserted so that no line
 * exceeds `maxPx`. Existing newlines are kept; words longer than a line are hard-broken.
 * (Pre-wrapping avoids words jumping lines while a typewriter reveals them.)
 */
export function wrapText(str: string, maxPx: number, size: FontSize = 'm'): string {
  const [cw] = FONT_CELL[size];
  const max = Math.max(1, Math.floor(maxPx / cw));
  const out: string[] = [];
  for (const para of str.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      if (!word) continue;
      let w = word;
      while (w.length > max) {
        if (line) { out.push(line); line = ''; }
        out.push(w.slice(0, max));
        w = w.slice(max);
      }
      if (!w) continue;
      if (!line) line = w;
      else if (line.length + 1 + w.length <= max) line += ` ${w}`;
      else { out.push(line); line = w; }
    }
    out.push(line);
  }
  return out.join('\n');
}

// ------------------------------------------------------------------------------ kit textures

/** Lazily creates a shared canvas texture (kept for the whole session). Returns its key. */
function kitTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): string {
  if (scene.textures.exists(key)) return key;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  scene.textures.addCanvas(key, canvas);
  return key;
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Procedural 24x24 gunmetal tile used when the art module has no ui_panel / ui_panel_inset. */
function fallbackTile(scene: Phaser.Scene, style: 'raised' | 'inset' | 'button' | 'bar'): string {
  if (style === 'raised') {
    return kitTexture(scene, '__kit_tile_raised', 24, 24, (ctx) => {
      rect(ctx, 0, 0, 24, 24, '#0a0810');
      rect(ctx, 1, 1, 22, 22, '#232030');
      for (let y = 4; y < 22; y += 3) rect(ctx, 2, y, 20, 1, '#262338');
      rect(ctx, 1, 1, 22, 1, '#4b4566');
      rect(ctx, 1, 1, 1, 22, '#3a3550');
      rect(ctx, 1, 22, 22, 1, '#141220');
      rect(ctx, 22, 1, 1, 22, '#18161f');
      rect(ctx, 4, 3, 16, 1, '#0c6b62');
      rect(ctx, 6, 3, 12, 1, '#2ee6c8');
      for (const [x, y] of [[3, 19], [19, 19]]) {
        rect(ctx, x, y, 2, 2, '#646074');
        rect(ctx, x, y, 1, 1, '#9a96aa');
      }
    });
  }
  if (style === 'inset') {
    return kitTexture(scene, '__kit_tile_inset', 24, 24, (ctx) => {
      rect(ctx, 0, 0, 24, 24, '#3a3550');
      rect(ctx, 1, 1, 22, 22, '#0f0d16');
      for (let y = 3; y < 22; y += 2) rect(ctx, 2, y, 20, 1, '#121019');
      rect(ctx, 1, 1, 22, 1, '#05040a');
      rect(ctx, 1, 1, 1, 22, '#05040a');
      rect(ctx, 1, 22, 22, 1, '#2a2638');
      rect(ctx, 22, 2, 1, 21, '#221f2e');
    });
  }
  if (style === 'bar') {
    return kitTexture(scene, '__kit_tile_bar', 12, 12, (ctx) => {
      rect(ctx, 0, 0, 12, 12, '#0a0810');
      rect(ctx, 1, 1, 10, 10, '#3a3550');
      rect(ctx, 2, 2, 8, 8, '#05040a');
    });
  }
  const key = '__kit_tile_button';
  if (scene.textures.exists(key)) return key;
  kitTexture(scene, key, 48, 24, (ctx) => {
    for (let f = 0; f < 2; f++) {
      const o = f * 24;
      rect(ctx, o, 0, 24, 24, '#0a0810');
      for (let y = 1; y < 23; y++) {
        const t = (y - 1) / 21;
        const top = f === 0 ? [0x34, 0x30, 0x4a] : [0x1a, 0x18, 0x26];
        const bot = f === 0 ? [0x22, 0x1f, 0x30] : [0x20, 0x1d, 0x2e];
        rect(ctx, o + 1, y, 22, 1, `rgb(${Math.round(top[0] + (bot[0] - top[0]) * t)},${Math.round(top[1] + (bot[1] - top[1]) * t)},${Math.round(top[2] + (bot[2] - top[2]) * t)})`);
      }
      if (f === 0) {
        rect(ctx, 1, 1, 22, 1, '#5a5478');
        rect(ctx, 1, 22, 22, 1, '#141220');
        rect(ctx, 3, 21, 18, 1, '#0c6b62');
      } else {
        rect(ctx, o + 1, 1, 22, 1, '#0a0810');
        rect(ctx, o + 1, 22, 22, 1, '#2c2840');
      }
    }
  });
  const tex = scene.textures.get(key);
  tex.add(0, 0, 0, 0, 24, 24);
  tex.add(1, 0, 24, 0, 24, 24);
  return key;
}

// ------------------------------------------------------------------------------ 9-slice baking

interface BakedEntry { refs: number; px: number }
const baked = new Map<string, BakedEntry>();
let bakedPx = 0;
/** Unused baked 9-slices are evicted (oldest first) once all bakes exceed this many pixels. */
const BAKE_BUDGET_PX = 2_500_000;

function drawableSource(frame: Phaser.Textures.Frame): HTMLCanvasElement | HTMLImageElement | null {
  const img = frame.source?.image as unknown;
  if (typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement) return img;
  if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement) return img;
  return null;
}

function evictBaked(scene: Phaser.Scene): void {
  if (bakedPx <= BAKE_BUDGET_PX) return;
  for (const [key, e] of baked) {
    if (bakedPx <= BAKE_BUDGET_PX * 0.75) break;
    if (e.refs > 0) continue;
    baked.delete(key);
    bakedPx -= e.px;
    if (scene.textures.exists(key)) scene.textures.remove(key);
  }
}

/** Paint a 9-slice (pixel-exact corners, tiled edges and centre) of a source frame. */
function paint9(
  ctx: CanvasRenderingContext2D, src: CanvasImageSource, sx: number, sy: number, sw: number, sh: number,
  w: number, h: number, corner: number,
): void {
  const c = Math.max(1, Math.min(corner, Math.floor((sw - 1) / 2), Math.floor((sh - 1) / 2)));
  const cx = Math.min(c, Math.floor(w / 2));
  const cy = Math.min(c, Math.floor(h / 2));
  const mw = sw - 2 * c, mh = sh - 2 * c;
  const tw = w - 2 * cx, th = h - 2 * cy;
  const piece = (px: number, py: number, pw: number, ph: number): HTMLCanvasElement => {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, pw);
    cv.height = Math.max(1, ph);
    cv.getContext('2d')!.drawImage(src, sx + px, sy + py, pw, ph, 0, 0, pw, ph);
    return cv;
  };
  const fill = (cv: HTMLCanvasElement, dx: number, dy: number, dw: number, dh: number) => {
    if (dw <= 0 || dh <= 0) return;
    const pat = ctx.createPattern(cv, 'repeat');
    if (!pat) return;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, dw, dh);
    ctx.restore();
  };
  if (mw > 0 && mh > 0) fill(piece(c, c, mw, mh), cx, cy, tw, th);
  if (mw > 0 && cy > 0) {
    fill(piece(c, 0, mw, cy), cx, 0, tw, cy);
    fill(piece(c, sh - cy, mw, cy), cx, h - cy, tw, cy);
  }
  if (mh > 0 && cx > 0) {
    fill(piece(0, c, cx, mh), 0, cy, cx, th);
    fill(piece(sw - cx, c, cx, mh), w - cx, cy, cx, th);
  }
  if (cx > 0 && cy > 0) {
    ctx.drawImage(src, sx, sy, cx, cy, 0, 0, cx, cy);
    ctx.drawImage(src, sx + sw - cx, sy, cx, cy, w - cx, 0, cx, cy);
    ctx.drawImage(src, sx, sy + sh - cy, cx, cy, 0, h - cy, cx, cy);
    ctx.drawImage(src, sx + sw - cx, sy + sh - cy, cx, cy, w - cx, h - cy, cx, cy);
  }
}

/** Bakes (or reuses) the 9-slice texture of `key`/`frame` at w x h. Null if the art is unusable. */
function bakeSlice(scene: Phaser.Scene, key: string, frame: string | number | undefined, w: number, h: number, corner: number): string | null {
  const id = `__kit9:${key}:${frame ?? '-'}:${corner}:${w}x${h}`;
  const known = baked.get(id);
  if (known && scene.textures.exists(id)) {
    baked.delete(id);
    baked.set(id, known); // LRU refresh
    return id;
  }
  if (!scene.textures.exists(key)) return null;
  const tex = scene.textures.get(key);
  const fr = frame !== undefined && tex.has(String(frame)) ? tex.get(frame) : tex.get('__BASE');
  if (!fr) return null;
  const src = drawableSource(fr);
  if (!src) return null;
  evictBaked(scene);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  paint9(ctx, src, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, w, h, corner);
  if (scene.textures.exists(id)) scene.textures.remove(id);
  if (!scene.textures.addCanvas(id, canvas)) return null;
  const e: BakedEntry = { refs: 0, px: w * h };
  baked.set(id, e);
  bakedPx += e.px;
  return id;
}

function sliceImage(scene: Phaser.Scene, key: string, frame: string | number | undefined, w: number, h: number, corner: number): Phaser.GameObjects.Image | null {
  const id = bakeSlice(scene, key, frame, Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), corner);
  if (!id) return null;
  const img = scene.add.image(0, 0, id).setOrigin(0);
  const e = baked.get(id);
  if (e) {
    e.refs++;
    img.once(Phaser.GameObjects.Events.DESTROY, () => { e.refs = Math.max(0, e.refs - 1); });
  }
  return img;
}

/**
 * A pixel-perfect 9-slice Image of any texture (corners kept, edges/centre tiled), top-left at
 * (x, y). Baked once per size and cached. Returns null when the texture does not exist.
 */
export function nineSlice(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, key: string, corner = 8, frame?: string | number,
): Phaser.GameObjects.Image | null {
  const img = sliceImage(scene, key, frame, w, h, corner);
  return img ? img.setPosition(Math.round(x), Math.round(y)) : null;
}

// ------------------------------------------------------------------------------ panels

const SLICE = 8;

export type PanelStyle = 'raised' | 'inset';

/**
 * A 9-slice panel (ui_panel / ui_panel_inset, 8 px corners) as a Container at (x, y) top-left.
 * Falls back to flat rectangles if the UI art is missing. Minimum size 16x16.
 */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, style: PanelStyle = 'raised'): Phaser.GameObjects.Container {
  const c = scene.add.container(Math.round(x), Math.round(y));
  w = Math.max(16, Math.round(w));
  h = Math.max(16, Math.round(h));
  const key = style === 'raised' ? 'ui_panel' : 'ui_panel_inset';
  const src = scene.textures.exists(key) ? key : fallbackTile(scene, style);
  const img = sliceImage(scene, src, undefined, w, h, SLICE);
  if (img) {
    c.add(img);
  } else {
    const g = scene.add.graphics();
    g.fillStyle(style === 'raised' ? COLORS.panel : COLORS.panelDark, 1).fillRect(0, 0, w, h);
    g.lineStyle(1, style === 'raised' ? COLORS.panelLight : COLORS.tealDark, 1).strokeRect(0.5, 0.5, w - 1, h - 1);
    c.add(g);
  }
  c.setSize(w, h);
  return c;
}

/** Normal / pressed button face (ui_button frames 0/1, else procedural) as an Image. */
function buttonFace(scene: Phaser.Scene, w: number, h: number, pressed: boolean): Phaser.GameObjects.Image | null {
  if (scene.textures.exists('ui_button')) {
    const tex = scene.textures.get('ui_button');
    const hasFrames = tex.has('0');
    const frame = hasFrames ? (pressed && tex.has('1') ? 1 : 0) : undefined;
    const img = sliceImage(scene, 'ui_button', frame, w, h, SLICE);
    if (img && pressed && !(hasFrames && tex.has('1'))) img.setTint(0xa8a4b8); // no pressed frame: darken
    if (img) return img;
  }
  return sliceImage(scene, fallbackTile(scene, 'button'), pressed ? 1 : 0, w, h, SLICE);
}

/** 1 px neon outline texture (white, tinted at runtime) of a given size. */
function outlineTex(scene: Phaser.Scene, w: number, h: number): string {
  return kitTexture(scene, `__kit_outline_${w}x${h}`, w, h, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1, 0, w - 2, 1);
    ctx.fillRect(1, h - 1, w - 2, 1);
    ctx.fillRect(0, 1, 1, h - 2);
    ctx.fillRect(w - 1, 1, 1, h - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(2, 1, w - 4, 1);
    ctx.fillRect(2, h - 2, w - 4, 1);
    ctx.fillRect(1, 2, 1, h - 4);
    ctx.fillRect(w - 2, 2, 1, h - 4);
  });
}

// ------------------------------------------------------------------------------ modal stack

const modalDepths = new WeakMap<Phaser.Scene, number>();

/** Number of modal dialogs currently open in a scene. */
function modalDepth(scene: Phaser.Scene): number {
  return modalDepths.get(scene) ?? 0;
}

/**
 * Marks a modal layer open in `scene`: widgets and back handlers created BEFORE this call stop
 * receiving keyboard / back input until the returned release function is called (idempotent).
 * Released automatically when the scene shuts down.
 */
export function openModal(scene: Phaser.Scene): () => void {
  modalDepths.set(scene, modalDepth(scene) + 1);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, release);
    modalDepths.set(scene, Math.max(0, modalDepth(scene) - 1));
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, release);
  return release;
}

/** True while a modal dialog (confirm / openModal) is open in the scene. */
export function isModalOpen(scene: Phaser.Scene): boolean {
  return modalDepth(scene) > 0;
}

/**
 * Number of modal layers currently open in the scene. A widget records it at creation and
 * ignores keyboard input while modalLevel(scene) is greater (a dialog opened above it).
 */
export function modalLevel(scene: Phaser.Scene): number {
  return modalDepth(scene);
}

/** True when every ancestor container of `obj` is visible. */
function shown(obj: Phaser.GameObjects.Container): boolean {
  let o: Phaser.GameObjects.Container | null = obj;
  while (o) {
    if (!o.visible) return false;
    o = o.parentContainer;
  }
  return true;
}

// ------------------------------------------------------------------------------ menu list

export interface MenuItem {
  label: string;
  value?: string;          // right-aligned text (cost, setting value...)
  valueColor?: number;
  color?: number;          // label colour override
  icon?: string;           // texture key drawn before the label (16x16 recommended)
  disabled?: boolean;      // focusable (shows help) but not selectable
  help?: string;           // shown by the scene in its status bar via onFocus
  /**
   * (added) Show tappable left/right arrows around the value. Default: shown when the list has
   * onLeft/onRight handlers AND the item has a value AND is not disabled. false = never.
   */
  arrows?: boolean;
  /**
   * (added) tapMode 'focusThenSelect' only: pulse the value while focused to show that the next
   * tap acts. Default true for enabled rows; false for rows whose select does nothing new
   * (e.g. the item already equipped).
   */
  armed?: boolean;
}

/**
 * How a pointer tap acts on a MenuList row:
 *  - 'select' (default): a tap selects the row at once (navigation menus). Mouse hover focuses.
 *  - 'focusThenSelect': a tap on an unfocused row only focuses it (its help / preview shows,
 *    the row's value pulses as "armed"); a tap on the focused row selects it. No hover focus,
 *    so a mouse click behaves like a tap. Use it where a pick costs credits or commits the
 *    player (shop purchases, choosing the next mission). Keyboard Enter always selects.
 */
export type TapMode = 'select' | 'focusThenSelect';

export interface MenuListOpts {
  x: number;
  y: number;
  width: number;
  items: MenuItem[];
  rowHeight?: number;      // default: 14 for 's', 18 for 'm', 24 for 'l'
  size?: FontSize;         // default 'm'
  startIndex?: number;
  depth?: number;
  keyboard?: boolean;      // listen to arrows/WASD/Enter/Space (default true)
  tapMode?: TapMode;       // (added) default 'select'
  onSelect: (index: number, item: MenuItem) => void;
  onFocus?: (index: number, item: MenuItem) => void;
  onDisabled?: (index: number, item: MenuItem) => void;
  onLeft?: (index: number, item: MenuItem) => void;   // keyboard left / tap on a left arrow
  onRight?: (index: number, item: MenuItem) => void;
}

type Glyph = Phaser.GameObjects.Image | Phaser.GameObjects.BitmapText;
interface RowParts {
  row: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.BitmapText;
  labelX: number;
  baseColor: number;
  value: Phaser.GameObjects.BitmapText | null;
  arrowL: Glyph | null;
  arrowR: Glyph | null;
  zoneL: Phaser.GameObjects.Zone | null;
  zoneR: Phaser.GameObjects.Zone | null;
}

/** Brightened tint for the focused label (default text colour becomes pure white). */
function focusTint(c: number): number {
  if (c === COLORS.text) return 0xffffff;
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const up = (v: number) => Math.min(255, Math.round(v + (255 - v) * 0.35));
  return (up(r) << 16) | (up(g) << 8) | up(b);
}

/** Horizontal neon highlight bar texture (white, tinted at runtime). */
function highlightTex(scene: Phaser.Scene, w: number, h: number): string {
  return kitTexture(scene, `__kit_hl_${w}x${h}`, w, h, (ctx) => {
    for (let x = 0; x < w; x++) {
      const t = x / Math.max(1, w - 1);
      const fillA = 0.06 + 0.4 * (1 - t) * (1 - t);
      const lineA = 0.12 + 0.78 * (1 - t);
      rect(ctx, x, 1, 1, Math.max(1, h - 2), `rgba(255,255,255,${fillA.toFixed(3)})`);
      rect(ctx, x, 0, 1, 1, `rgba(255,255,255,${lineA.toFixed(3)})`);
      rect(ctx, x, h - 1, 1, 1, `rgba(255,255,255,${(lineA * 0.7).toFixed(3)})`);
    }
    rect(ctx, 0, 0, 2, h, '#ffffff');
  });
}

/** Soft glow halo texture around a w x h row (white alpha falloff, use with ADD blend). */
function glowTex(scene: Phaser.Scene, w: number, h: number): string {
  const pad = 6;
  const tw = w + pad * 2, th = h + pad * 2;
  return kitTexture(scene, `__kit_glow_${w}x${h}`, tw, th, (ctx) => {
    const img = ctx.createImageData(tw, th);
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const dx = Math.max(0, pad - x, x - (tw - 1 - pad));
        const dy = Math.max(0, pad - y, y - (th - 1 - pad));
        const d = Math.sqrt(dx * dx + dy * dy) / pad;
        const along = 1 - 0.75 * ((x - pad) / Math.max(1, w));
        const a = Math.max(0, 1 - d) ** 2 * Math.max(0.15, Math.min(1, along));
        const i = (y * tw + x) * 4;
        img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

/**
 * Vertical selectable list: cursor + highlight, keyboard (up/down/enter/space/left/right),
 * pointer (see TapMode: tap selects, or tap focuses then a second tap selects). Plays
 * ui_move / ui_select / ui_error.
 */
export class MenuList {
  readonly container: Phaser.GameObjects.Container;
  private items: MenuItem[] = [];
  private rows: Phaser.GameObjects.Container[] = [];
  private parts: RowParts[] = [];
  private highlight: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private flashImg: Phaser.GameObjects.Image;
  private cursor: Phaser.GameObjects.Image | Phaser.GameObjects.BitmapText;
  private idx = 0;
  private enabled = true;
  private pressedRow = -1;
  /** The pressed row already had the focus when the press started (focusThenSelect). */
  private pressArmed = false;
  private armTween: Phaser.Tweens.Tween | null = null;
  private readonly rowH: number;
  private readonly size: FontSize;
  private readonly tapMode: TapMode;
  private readonly modalLevel: number;
  private keyHandler?: (e: KeyboardEvent) => void;
  private readonly onShutdown = () => this.destroy();

  constructor(private readonly scene: Phaser.Scene, private readonly opts: MenuListOpts) {
    this.size = opts.size ?? 'm';
    this.rowH = opts.rowHeight ?? (this.size === 's' ? 14 : this.size === 'm' ? 18 : 24);
    this.tapMode = opts.tapMode ?? 'select';
    this.modalLevel = modalDepth(scene);
    this.container = scene.add.container(Math.round(opts.x), Math.round(opts.y));
    if (opts.depth !== undefined) this.container.setDepth(opts.depth);
    const w = Math.max(8, Math.round(opts.width));
    this.glow = scene.add.image(-6, -6, glowTex(scene, w, this.rowH)).setOrigin(0)
      .setBlendMode(Phaser.BlendModes.ADD).setTint(COLORS.accent).setAlpha(0.32);
    this.highlight = scene.add.image(0, 0, highlightTex(scene, w, this.rowH)).setOrigin(0).setTint(COLORS.accent);
    this.flashImg = scene.add.image(0, 0, highlightTex(scene, w, this.rowH)).setOrigin(0).setTint(0xffffff).setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.container.add([this.glow, this.highlight, this.flashImg]);
    this.cursor = scene.textures.exists('ui_cursor')
      ? scene.add.image(-2, 0, 'ui_cursor').setOrigin(1, 0.5)
      : text(scene, -2, 0, '>', { size: this.size, color: COLORS.accent, originX: 1, originY: 0.5 });
    this.container.add(this.cursor);
    scene.tweens.add({ targets: this.cursor, x: -5, duration: 340, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: this.highlight, alpha: 0.72, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: this.glow, alpha: 0.14, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.setItems(opts.items, false);
    this.setIndex(opts.startIndex ?? 0, false);
    if (opts.keyboard !== false) this.bindKeys();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown);
  }

  get index(): number { return this.idx; }
  get item(): MenuItem | undefined { return this.items[this.idx]; }
  get height(): number { return this.items.length * this.rowH; }
  /** (added) Number of rows. */
  get length(): number { return this.items.length; }

  /** Replace the rows (keeps the current index when possible). */
  setItems(items: MenuItem[], keepIndex = true): void {
    this.armTween?.remove();
    this.armTween = null;
    this.rows.forEach((r) => r.destroy());
    this.rows = [];
    this.parts = [];
    this.pressedRow = -1;
    this.items = items;
    items.forEach((it, i) => this.buildRow(it, i));
    this.container.bringToTop(this.cursor);
    this.setIndex(keepIndex ? Math.min(this.idx, Math.max(0, items.length - 1)) : 0, false);
  }

  private hasArrows(it: MenuItem): boolean {
    if (it.arrows !== undefined) return it.arrows;
    return !!(this.opts.onLeft || this.opts.onRight) && it.value !== undefined && !it.disabled;
  }

  private buildRow(it: MenuItem, i: number): void {
    const s = this.scene;
    const w = Math.round(this.opts.width);
    const midY = Math.round(this.rowH / 2);
    const row = s.add.container(0, i * this.rowH);
    let lx = 4;
    if (it.icon && s.textures.exists(it.icon)) {
      row.add(s.add.image(lx, midY, it.icon).setOrigin(0, 0.5));
      lx += 20;
    }
    const baseColor = it.disabled ? COLORS.textDim : it.color ?? COLORS.text;
    const label = text(s, lx, midY, it.label, { size: this.size, color: baseColor, originY: 0.5 });
    row.add(label);
    const zone = s.add.zone(0, 0, w, this.rowH).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerover', (p: Phaser.Input.Pointer) => {
      if (this.tapMode === 'select' && this.acceptsPointer() && !p.wasTouch) this.setIndex(i);
    });
    zone.on('pointerdown', () => {
      if (!this.acceptsPointer()) return;
      audio.unlock();
      this.pressedRow = i;
      this.pressArmed = this.idx === i;
      this.setIndex(i);
      this.flashImg.setAlpha(0.35);
      this.scene.tweens.add({ targets: this.flashImg, alpha: 0, duration: 160 });
    });
    zone.on('pointerout', () => { if (this.pressedRow === i) this.pressedRow = -1; });
    zone.on('pointerup', () => {
      const pressed = this.pressedRow === i;
      this.pressedRow = -1;
      if (!pressed || !this.acceptsPointer() || this.idx !== i) return;
      if (this.tapMode === 'focusThenSelect' && !this.pressArmed) return; // first tap only focuses
      this.select();
    });
    row.add(zone);
    const parts: RowParts = { row, label, labelX: lx, baseColor, value: null, arrowL: null, arrowR: null, zoneL: null, zoneR: null };
    if (this.hasArrows(it)) this.buildArrows(parts, i);
    if (it.value !== undefined) this.buildValue(parts, it, it.value);
    this.container.add(row);
    this.rows.push(row);
    this.parts.push(parts);
  }

  private buildArrows(p: RowParts, i: number): void {
    const s = this.scene;
    const midY = Math.round(this.rowH / 2);
    const mk = (tex: string, ch: string): Glyph => (s.textures.exists(tex)
      ? s.add.image(0, midY, tex).setOrigin(0.5)
      : text(s, 0, midY, ch, { size: this.size === 'l' ? 'm' : this.size, color: COLORS.teal, originX: 0.5, originY: 0.5 }));
    p.arrowL = mk('ui_arrow_l', '<');
    p.arrowR = mk('ui_arrow_r', '>');
    const zh = Math.max(22, this.rowH);
    p.zoneL = s.add.zone(0, midY - zh / 2, 22, zh).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    p.zoneR = s.add.zone(0, midY - zh / 2, 22, zh).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    const press = (dir: -1 | 1) => {
      if (!this.acceptsPointer()) return;
      audio.unlock();
      this.setIndex(i);
      this.nudge(i, dir);
      const it = this.items[i];
      if (dir < 0) this.opts.onLeft?.(i, it);
      else this.opts.onRight?.(i, it);
    };
    p.zoneL.on('pointerdown', () => press(-1));
    p.zoneR.on('pointerdown', () => press(1));
    p.row.add([p.arrowL, p.arrowR, p.zoneL, p.zoneR]);
    this.layoutArrows(p);
  }

  private buildValue(p: RowParts, it: MenuItem, value: string): void {
    const midY = Math.round(this.rowH / 2);
    const right = Math.round(this.opts.width) - (p.arrowR ? 16 : 4);
    p.value = text(this.scene, right, midY, value, {
      size: this.size === 'l' ? 'm' : this.size, color: it.disabled ? COLORS.textDim : it.valueColor ?? COLORS.gold, originX: 1, originY: 0.5,
    });
    p.row.add(p.value);
    this.layoutArrows(p);
  }

  private layoutArrows(p: RowParts): void {
    if (!p.arrowL || !p.arrowR || !p.zoneL || !p.zoneR) return;
    const w = Math.round(this.opts.width);
    const vSize: FontSize = this.size === 'l' ? 'm' : this.size;
    const vw = p.value ? measure(this.scene, p.value.text, vSize) : 0;
    const slot = Math.max(vw, 4 * advance(this.scene, vSize));
    const rx = w - 7;
    const lx = w - 16 - slot - 8;
    p.arrowR.x = rx;
    p.arrowL.x = lx;
    p.zoneR.x = rx;
    p.zoneL.x = lx;
  }

  private nudge(i: number, dir: -1 | 1): void {
    const p = this.parts[i];
    const a = dir < 0 ? p?.arrowL : p?.arrowR;
    if (!a) return;
    const x0 = dir < 0 ? (p.zoneL?.x ?? a.x) : (p.zoneR?.x ?? a.x);
    this.scene.tweens.killTweensOf(a);
    a.x = x0 + dir * 2;
    this.scene.tweens.add({ targets: a, x: x0, duration: 120, ease: 'Quad.easeOut' });
  }

  /** Move the focus (plays ui_move when `sound`). */
  setIndex(i: number, sound = true): void {
    if (this.items.length === 0) return;
    const n = Phaser.Math.Clamp(i, 0, this.items.length - 1);
    const changed = n !== this.idx;
    const old = this.parts[this.idx];
    if (old && changed) this.styleRow(this.idx, false);
    this.idx = n;
    const y = n * this.rowH;
    this.highlight.setY(y);
    this.flashImg.setY(y);
    this.glow.setY(y - 6);
    this.cursor.setY(y + Math.round(this.rowH / 2));
    const disabled = !!this.items[n]?.disabled;
    this.highlight.setTint(disabled ? COLORS.textDim : COLORS.accent);
    this.glow.setVisible(!disabled);
    this.styleRow(n, true);
    if (changed && sound) audio.sfx('ui_move');
    this.opts.onFocus?.(n, this.items[n]);
  }

  private styleRow(i: number, focused: boolean): void {
    const p = this.parts[i];
    if (!p) return;
    const it = this.items[i];
    if (this.size !== 'l') p.label.setTint(focused && !it?.disabled ? focusTint(p.baseColor) : p.baseColor);
    p.label.x = p.labelX + (focused ? 2 : 0);
    const a = focused ? 1 : 0.45;
    p.arrowL?.setAlpha(a);
    p.arrowR?.setAlpha(a);
    if (focused) this.armRow(p, !!it && !it.disabled && it.armed !== false);
  }

  /** focusThenSelect: the focused row's value pulses ("armed": the next tap selects it). */
  private armRow(p: RowParts, armed: boolean): void {
    if (this.armTween) {
      const prev = this.armTween.targets[0] as Phaser.GameObjects.BitmapText | undefined;
      this.armTween.remove();
      this.armTween = null;
      if (prev?.scene) prev.setAlpha(1);
    }
    if (this.tapMode !== 'focusThenSelect' || !armed || !p.value) return;
    p.value.setAlpha(1);
    this.armTween = this.scene.tweens.add({ targets: p.value, alpha: 0.45, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Enable/disable input (e.g. while a confirm dialog is open). */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.container.setAlpha(enabled ? 1 : 0.6);
  }

  /** Programmatic select of the focused row. */
  select(): void {
    const it = this.items[this.idx];
    if (!it) return;
    if (it.disabled) {
      audio.sfx('ui_error');
      this.opts.onDisabled?.(this.idx, it);
      return;
    }
    audio.sfx('ui_select');
    this.flashImg.setAlpha(0.85);
    this.scene.tweens.add({ targets: this.flashImg, alpha: 0, duration: 220, ease: 'Quad.easeOut' });
    this.opts.onSelect(this.idx, it);
  }

  /** (added) Update the right-aligned value text of row `i` in place (creates it if missing). */
  setValue(i: number, value: string, color?: number): void {
    const it = this.items[i];
    const p = this.parts[i];
    if (!it || !p) return;
    it.value = value;
    if (color !== undefined) it.valueColor = color;
    if (!p.value) {
      this.buildValue(p, it, value);
    } else {
      p.value.setText(value);
      if (color !== undefined) p.value.setTint(color);
      this.layoutArrows(p);
    }
    this.container.bringToTop(this.cursor);
  }

  /** (added) Update the label (and optionally its colour) of row `i` in place. */
  setLabel(i: number, label: string, color?: number): void {
    const it = this.items[i];
    const p = this.parts[i];
    if (!it || !p) return;
    it.label = label;
    p.label.setText(label);
    if (color !== undefined) {
      it.color = color;
      p.baseColor = it.disabled ? COLORS.textDim : color;
    }
    this.styleRow(i, i === this.idx);
  }

  /** (added) The container of row `i` (origin = row top-left) to attach custom widgets to. */
  rowContainer(i: number): Phaser.GameObjects.Container | undefined {
    return this.rows[i];
  }

  /** (added) Y offset of row `i` inside the list (add container.y for scene coordinates). */
  rowY(i: number): number {
    return i * this.rowH;
  }

  /** (added) Ignore the pending pointer release (e.g. the gesture became a scroll/drag). */
  cancelPress(): void {
    this.pressedRow = -1;
  }

  private acceptsPointer(): boolean {
    return this.enabled && !isLeaving(this.scene);
  }

  private acceptsKeys(): boolean {
    return this.enabled && shown(this.container) && modalDepth(this.scene) <= this.modalLevel && !isLeaving(this.scene);
  }

  private bindKeys(): void {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.acceptsKeys() || this.items.length === 0) return;
      audio.unlock();
      switch (e.code) {
        case 'ArrowUp': case 'KeyW': this.setIndex(this.idx - 1 < 0 ? this.items.length - 1 : this.idx - 1); break;
        case 'ArrowDown': case 'KeyS': this.setIndex((this.idx + 1) % Math.max(1, this.items.length)); break;
        case 'Enter': case 'Space': case 'NumpadEnter': if (!e.repeat) this.select(); break;
        case 'ArrowLeft': case 'KeyA':
          if (this.opts.onLeft) { this.nudge(this.idx, -1); this.opts.onLeft(this.idx, this.items[this.idx]); }
          break;
        case 'ArrowRight': case 'KeyD':
          if (this.opts.onRight) { this.nudge(this.idx, 1); this.opts.onRight(this.idx, this.items[this.idx]); }
          break;
        default: break;
      }
    };
    kb.on('keydown', this.keyHandler);
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown);
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    this.armTween?.remove();
    this.armTween = null;
    if (this.container.scene) {
      this.scene.tweens.killTweensOf([this.cursor, this.highlight, this.glow, this.flashImg]);
      this.container.destroy();
    }
  }
}

// ------------------------------------------------------------------------------ gauge

export interface GaugeOpts {
  vertical?: boolean;      // default true (fills bottom -> top)
  colorA?: number;         // gradient start (bottom for vertical, left for horizontal)
  colorB?: number;         // gradient end
  frame?: boolean;         // draw a frame (ui_bar_frame 9-slice, else a 1px border) — default true
  depth?: number;
  segments?: number;       // > 0: draw as N separated segments (pips)
}

/** A bar gauge with a gradient fill. setValue(0..1) is cheap (crop only). */
export class Gauge {
  readonly container: Phaser.GameObjects.Container;
  private fill: Phaser.GameObjects.Image;
  private flashRect: Phaser.GameObjects.Rectangle;
  private value = 1;
  private readonly iw: number;
  private readonly ih: number;
  private readonly vertical: boolean;
  private static seq = 0;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number, w: number, h: number, opts: GaugeOpts = {}) {
    this.vertical = opts.vertical ?? true;
    this.container = scene.add.container(Math.round(x), Math.round(y));
    if (opts.depth !== undefined) this.container.setDepth(opts.depth);
    w = Math.max(3, Math.round(w));
    h = Math.max(3, Math.round(h));
    const pad = opts.frame === false ? 0 : 2;
    this.iw = Math.max(1, w - pad * 2);
    this.ih = Math.max(1, h - pad * 2);
    if (opts.frame !== false) {
      const frameKey = scene.textures.exists('ui_bar_frame') ? 'ui_bar_frame' : fallbackTile(scene, 'bar');
      const img = sliceImage(scene, frameKey, undefined, w, h, 4);
      if (img) {
        this.container.add(img);
      } else {
        const g = scene.add.graphics();
        g.fillStyle(COLORS.panelDark, 1).fillRect(0, 0, w, h);
        g.lineStyle(1, COLORS.panelLight, 1).strokeRect(0.5, 0.5, w - 1, h - 1);
        this.container.add(g);
      }
    }
    const key = `__gauge_${Gauge.seq++}`;
    const canvas = document.createElement('canvas');
    canvas.width = this.iw;
    canvas.height = this.ih;
    const ctx = canvas.getContext('2d')!;
    const a = Phaser.Display.Color.IntegerToColor(opts.colorA ?? COLORS.energy);
    const b = Phaser.Display.Color.IntegerToColor(opts.colorB ?? COLORS.bad);
    const len = this.vertical ? this.ih : this.iw;
    for (let i = 0; i < len; i++) {
      const t = len <= 1 ? 0 : i / (len - 1);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, Math.round(t * 100));
      ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
      if (this.vertical) ctx.fillRect(0, this.ih - 1 - i, this.iw, 1);
      else ctx.fillRect(i, 0, 1, this.ih);
    }
    // glassy highlight column/row + darker far edge for a rounded tube look
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    if (this.vertical) ctx.fillRect(0, 0, Math.max(1, Math.floor(this.iw / 3)), this.ih);
    else ctx.fillRect(0, 0, this.iw, Math.max(1, Math.floor(this.ih / 3)));
    if ((this.vertical ? this.iw : this.ih) >= 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      if (this.vertical) ctx.fillRect(this.iw - 1, 0, 1, this.ih);
      else ctx.fillRect(0, this.ih - 1, this.iw, 1);
    }
    if (opts.segments && opts.segments > 1) {
      ctx.globalCompositeOperation = 'destination-out';
      const n = opts.segments;
      for (let s = 1; s < n; s++) {
        const p = Math.round((len * s) / n);
        if (this.vertical) ctx.fillRect(0, this.ih - p, this.iw, 1);
        else ctx.fillRect(p, 0, 1, this.ih);
      }
    }
    scene.textures.addCanvas(key, canvas);
    this.fill = scene.add.image(pad, pad, key).setOrigin(0);
    this.flashRect = scene.add.rectangle(pad, pad, this.iw, this.ih, 0xffffff, 0).setOrigin(0);
    this.container.add([this.fill, this.flashRect]);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { if (scene.textures.exists(key)) scene.textures.remove(key); });
  }

  /** Set the fill ratio (0..1). */
  setValue(ratio: number): void {
    const v = Phaser.Math.Clamp(ratio, 0, 1);
    if (Math.abs(v - this.value) < 0.002) return;
    this.value = v;
    if (this.vertical) {
      const hh = Math.round(this.ih * v);
      this.fill.setCrop(0, this.ih - hh, this.iw, hh);
    } else {
      this.fill.setCrop(0, 0, Math.round(this.iw * v), this.ih);
    }
  }

  /** Brief white flash over the gauge. */
  flash(color = 0xffffff): void {
    this.flashRect.setFillStyle(color, 0.8);
    this.scene.tweens.add({ targets: this.flashRect, fillAlpha: 0, duration: 220 });
  }

  destroy(): void { this.container.destroy(); }
}

// ------------------------------------------------------------------------------ misc widgets

export interface ButtonApi {
  container: Phaser.GameObjects.Container;
  setLabel(label: string): void;
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

/** A tappable button (ui_button 9-slice look) with a centred label. (x, y) = top-left. */
export function button(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void,
  opts: { size?: FontSize; color?: number; depth?: number } = {},
): ButtonApi {
  const c = scene.add.container(Math.round(x), Math.round(y));
  if (opts.depth !== undefined) c.setDepth(opts.depth);
  w = Math.max(16, Math.round(w));
  h = Math.max(16, Math.round(h));
  const normal = buttonFace(scene, w, h, false);
  const pressed = buttonFace(scene, w, h, true);
  const hover = scene.add.image(0, 0, outlineTex(scene, w, h)).setOrigin(0).setTint(COLORS.teal)
    .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  const color = opts.color ?? COLORS.teal;
  const ly = Math.round(h / 2);
  const lbl = text(scene, Math.round(w / 2), ly, label, { size: opts.size ?? 'm', color, originX: 0.5, originY: 0.5 });
  const zone = scene.add.zone(0, 0, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
  let enabled = true;
  let down = false;
  const setDown = (d: boolean) => {
    down = d;
    normal?.setVisible(!d);
    pressed?.setVisible(d);
    lbl.setY(ly + (d ? 1 : 0));
  };
  setDown(false);
  zone.on('pointerover', (p: Phaser.Input.Pointer) => {
    if (!enabled || p.wasTouch) return;
    hover.setAlpha(0.75);
    if ((opts.size ?? 'm') !== 'l') lbl.setTint(focusTint(color));
  });
  zone.on('pointerout', () => {
    setDown(false);
    hover.setAlpha(0);
    if ((opts.size ?? 'm') !== 'l') lbl.setTint(color);
  });
  zone.on('pointerdown', () => {
    if (!enabled || isLeaving(scene)) return;
    audio.unlock();
    setDown(true);
  });
  zone.on('pointerup', () => {
    const wasDown = down;
    setDown(false);
    if (!enabled || !wasDown || isLeaving(scene)) return;
    audio.sfx('ui_select');
    onClick();
  });
  const parts: Phaser.GameObjects.GameObject[] = [];
  if (normal) parts.push(normal);
  if (pressed) parts.push(pressed);
  parts.push(hover, lbl, zone);
  c.add(parts);
  c.setSize(w, h);
  return {
    container: c,
    setLabel: (l: string) => { lbl.setText(l); },
    setEnabled: (e: boolean) => { enabled = e; c.setAlpha(e ? 1 : 0.5); if (!e) { setDown(false); hover.setAlpha(0); } },
    destroy: () => c.destroy(),
  };
}

/** (added) Optional settings of iconButton. */
export interface IconButtonOpts {
  /** Hit area (centred on the button) when larger than the visual — e.g. a header back arrow. */
  hitW?: number;
  hitH?: number;
  /** Fallback glyph drawn when the icon texture is missing (default '?'). */
  glyph?: string;
}

/** A small square tappable icon (e.g. pause). (x, y) = centre. */
export function iconButton(
  scene: Phaser.Scene, x: number, y: number, icon: string, onClick: () => void, size = 22, depth?: number, opts: IconButtonOpts = {},
): Phaser.GameObjects.Container {
  const c = scene.add.container(Math.round(x), Math.round(y));
  if (depth !== undefined) c.setDepth(depth);
  const half = Math.round(size / 2);
  const normal = buttonFace(scene, size, size, false);
  const pressed = buttonFace(scene, size, size, true);
  normal?.setPosition(-half, -half);
  pressed?.setPosition(-half, -half).setVisible(false);
  if (normal) c.add(normal);
  if (pressed) c.add(pressed);
  const hover = scene.add.image(-half, -half, outlineTex(scene, size, size)).setOrigin(0).setTint(COLORS.teal)
    .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  c.add(hover);
  const glyph: Glyph = icon && scene.textures.exists(icon)
    ? scene.add.image(0, 0, icon)
    : text(scene, 0, 0, opts.glyph ?? '?', { size: opts.glyph ? 'm' : 's', color: COLORS.teal, originX: 0.5, originY: 0.5 });
  c.add(glyph);
  let down = false;
  const setDown = (d: boolean) => {
    down = d;
    normal?.setVisible(!d);
    pressed?.setVisible(d);
    glyph.setY(d ? 1 : 0);
  };
  const hw = Math.max(size, Math.round(opts.hitW ?? size));
  const hh = Math.max(size, Math.round(opts.hitH ?? size));
  const zone = scene.add.zone(-Math.round(hw / 2), -Math.round(hh / 2), hw, hh).setOrigin(0).setInteractive({ useHandCursor: true });
  zone.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation();
    if (isLeaving(scene)) return;
    audio.unlock();
    setDown(true);
  });
  zone.on('pointerover', (p: Phaser.Input.Pointer) => { if (!p.wasTouch) hover.setAlpha(0.8); });
  zone.on('pointerout', () => { setDown(false); hover.setAlpha(0); });
  zone.on('pointerup', () => {
    const wasDown = down;
    setDown(false);
    if (wasDown && !isLeaving(scene)) onClick();
  });
  c.add(zone);
  c.setSize(size, size);
  return c;
}

export interface StatusBarApi {
  setText(t: string): void;
  readonly object: Phaser.GameObjects.Container;
  /** (added) Replace the dim right-hand text (e.g. the version on the title screen). */
  setRight?(t: string): void;
}

/** (added) Optional settings of statusBar. */
export interface StatusBarOpts {
  /** Short dim text right-aligned in the bar. */
  right?: string;
  /** Upper-case the help text (default true: every menu shows its help the same way). */
  upper?: boolean;
  depth?: number;
}

/** Height in px of the bottom status bar (content of a menu screen ends above it). */
export const STATUS_H = 16;

/** Bottom help line across the screen (contextual help for the focused entry). */
export function statusBar(scene: Phaser.Scene, initial = '', opts: StatusBarOpts = {}): StatusBarApi {
  const { width, height } = scene.scale.gameSize;
  const h = STATUS_H;
  const upper = opts.upper !== false;
  // one style for every help line: upper case, no trailing full stop
  const norm = (s: string) => (upper ? s.toUpperCase() : s).replace(/\.$/, '');
  const c = scene.add.container(0, height - h).setDepth(opts.depth ?? DEPTH.overlay - 1);
  c.add(panel(scene, 4, 0, width - 8, h - 1, 'inset'));
  const led = scene.add.rectangle(10, Math.round(h / 2) - 1, 2, 2, COLORS.teal).setOrigin(0);
  c.add(led);
  scene.tweens.add({ targets: led, alpha: 0.25, duration: 520, yoyo: true, repeat: -1, ease: 'Stepped' });
  const right = text(scene, width - 10, Math.round(h / 2), opts.right ?? '', { size: 's', color: COLORS.textDim, originX: 1, originY: 0.5 });
  c.add(right);
  const maxW = () => width - 16 - 10 - (right.text ? right.width + 8 : 0);
  let current = norm(initial);
  const t = text(scene, 16, Math.round(h / 2), fit(current, maxW(), 's'), { size: 's', color: COLORS.teal, originY: 0.5 });
  c.add(t);
  return {
    setText: (raw: string) => {
      const s = norm(raw);
      if (s === current) return;
      current = s;
      t.setText(fit(s, maxW(), 's'));
      scene.tweens.killTweensOf(t);
      t.setAlpha(0.35);
      t.x = 13;
      scene.tweens.add({ targets: t, alpha: 1, x: 16, duration: 150, ease: 'Quad.easeOut' });
    },
    setRight: (s: string) => {
      right.setText(s);
      t.setText(fit(current, maxW(), 's'));
    },
    object: c,
  };
}

// ------------------------------------------------------------------------------ starfield

function ensureStarTextures(scene: Phaser.Scene): void {
  kitTexture(scene, '__kit_px1', 1, 1, (ctx) => rect(ctx, 0, 0, 1, 1, '#ffffff'));
  kitTexture(scene, '__kit_px2', 2, 2, (ctx) => rect(ctx, 0, 0, 2, 2, '#ffffff'));
  kitTexture(scene, '__kit_glint', 5, 5, (ctx) => {
    rect(ctx, 2, 0, 1, 5, 'rgba(255,255,255,0.55)');
    rect(ctx, 0, 2, 5, 1, 'rgba(255,255,255,0.55)');
    rect(ctx, 1, 1, 3, 3, 'rgba(255,255,255,0.35)');
    rect(ctx, 2, 2, 1, 1, '#ffffff');
  });
  kitTexture(scene, '__kit_streak', 28, 2, (ctx) => {
    for (let x = 0; x < 28; x++) {
      const a = (x / 27) ** 1.6;
      rect(ctx, x, 0, 1, 1, `rgba(255,255,255,${a.toFixed(3)})`);
      rect(ctx, x, 1, 1, 1, `rgba(255,255,255,${(a * 0.45).toFixed(3)})`);
    }
    rect(ctx, 26, 0, 2, 2, '#ffffff');
  });
  for (let n = 0; n < 2; n++) {
    kitTexture(scene, `__kit_neb${n}`, 64, 64, (ctx) => {
      const img = ctx.createImageData(64, 64);
      const seed = 7919 + n * 104729;
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const nx = x / 64, ny = y / 64;
          const dx = nx - 0.5, dy = (ny - 0.5) * (n === 0 ? 1.35 : 0.9);
          const fall = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 2);
          const f = fbm(nx * 3.2 + n * 5, ny * 3.2, seed, 4);
          const v = Math.min(1, Math.max(0, (f - 0.36) * 2.6) * fall * fall * 1.9);
          const q = Math.floor(v * 4 + bayer(x, y)) / 4;
          const i = (y * 64 + x) * 4;
          img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255;
          img.data[i + 3] = Math.round(Math.min(1, q) * 210);
        }
      }
      ctx.putImageData(img, 0, 0);
    });
  }
}

interface Star { img: Phaser.GameObjects.Image; v: number; base: number; tw: number; ph: number; f: number }

/** Animated parallax starfield background (2-3 layers of drifting stars). */
export function starfield(scene: Phaser.Scene, opts: { density?: number; speed?: number; depth?: number } = {}): { destroy(): void } {
  const { width, height } = scene.scale.gameSize;
  const depth = opts.depth ?? -10;
  const density = Math.max(0, opts.density ?? 1);
  const speed = opts.speed ?? 12;
  ensureStarTextures(scene);
  const objects: Phaser.GameObjects.Image[] = [];

  // nebula wisps (behind the stars)
  const wisps: { img: Phaser.GameObjects.Image; v: number }[] = [];
  const nebTints = [0x7a2a9a, 0x0c6b62, 0x2c2c8a];
  const wispCount = density > 0 ? 3 : 0;
  for (let i = 0; i < wispCount; i++) {
    const img = scene.add.image(Math.random() * width, (i + Math.random()) * (height / wispCount), `__kit_neb${i % 2}`)
      .setDepth(depth).setScale(3 + Math.random() * 1.5).setTint(nebTints[i % nebTints.length])
      .setAlpha(0.16 + Math.random() * 0.08).setBlendMode(Phaser.BlendModes.ADD)
      .setFlipX(Math.random() < 0.5).setFlipY(Math.random() < 0.5);
    wisps.push({ img, v: speed * 0.16 });
    objects.push(img);
  }

  // stars: far (dim 1 px), mid (1 px), near (2 px), plus a few twinkling glints
  const far = [0x4a5070, 0x6070a0, 0x8a84a0];
  const mid = [0x9aa8d0, 0xd8e4ff, 0x2ee6c8, 0xb8c4e8];
  const near = [0xd8e4ff, 0xffffff, 0xf2a6ff, 0x2ee6c8];
  const stars: Star[] = [];
  const n = Math.round(density * 110);
  for (let i = 0; i < n; i++) {
    const r = i % 20;
    const layer = r < 10 ? 0 : r < 17 ? 1 : 2;
    const glint = layer === 2 && i % 40 === 19;
    const key = glint ? '__kit_glint' : layer === 2 ? '__kit_px2' : '__kit_px1';
    const tints = layer === 0 ? far : layer === 1 ? mid : near;
    const base = layer === 0 ? 0.35 + Math.random() * 0.25 : layer === 1 ? 0.6 + Math.random() * 0.3 : 0.85 + Math.random() * 0.15;
    const img = scene.add.image(Math.round(Math.random() * width), Math.random() * height, key)
      .setDepth(depth).setTint(tints[(i * 7) % tints.length]).setAlpha(base);
    if (glint) img.setBlendMode(Phaser.BlendModes.ADD);
    const v = speed * (layer === 0 ? 0.35 : layer === 1 ? 0.7 : 1.25);
    const tw = glint ? 0.8 : i % 5 === 0 ? 0.5 : 0;
    stars.push({ img, v, base, tw, ph: Math.random() * Math.PI * 2, f: 0.6 + Math.random() * 1.4 });
    objects.push(img);
  }

  // occasional shooting star
  const streak = scene.add.image(-60, -60, '__kit_streak').setDepth(depth).setOrigin(1, 0.5)
    .setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
  objects.push(streak);
  let streakWait = 1800 + Math.random() * 4000;
  let streakLife = 0;
  let streakMax = 1;
  let svx = 0;
  let svy = 0;

  const onUpdate = (time: number, dtRaw: number) => {
    const dt = Math.min(50, dtRaw) / 1000;
    for (let i = 0; i < wisps.length; i++) {
      const w = wisps[i];
      w.img.y += w.v * dt;
      const half = w.img.displayHeight / 2;
      if (w.img.y - half > height) {
        w.img.y = -half;
        w.img.x = Math.random() * width;
      }
    }
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.img.y += s.v * dt;
      if (s.img.y > height + 3) {
        s.img.y = -3;
        s.img.x = Math.round(Math.random() * width);
      }
      if (s.tw > 0) s.img.alpha = s.base * (1 - s.tw + s.tw * (0.5 + 0.5 * Math.sin(time * 0.003 * s.f + s.ph)));
    }
    if (streakLife > 0) {
      streakLife -= dt * 1000;
      streak.x += svx * dt;
      streak.y += svy * dt;
      streak.alpha = Math.max(0, streakLife / streakMax);
      if (streakLife <= 0) streak.setVisible(false);
    } else if (density > 0) {
      streakWait -= dt * 1000;
      if (streakWait <= 0) {
        streakWait = 3500 + Math.random() * 6000;
        streakMax = streakLife = 550 + Math.random() * 350;
        const ang = Phaser.Math.DegToRad(150 + Math.random() * 25);
        const sp = 260 + Math.random() * 140;
        svx = Math.cos(ang) * sp;
        svy = Math.sin(ang) * sp;
        streak.setPosition(width * (0.35 + Math.random() * 0.7), height * Math.random() * 0.45)
          .setRotation(ang).setAlpha(1).setVisible(true)
          .setTint(Math.random() < 0.5 ? 0xffffff : 0xb8f8ff);
      }
    }
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  let alive = true;
  const destroy = () => {
    if (!alive) return;
    alive = false;
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, destroy);
    objects.forEach((o) => o.destroy());
    objects.length = 0;
    stars.length = 0;
    wisps.length = 0;
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, destroy);
  return { destroy };
}

// ------------------------------------------------------------------------------ navigation

type BackEntry = { scene: Phaser.Scene; cb: () => boolean; modal: number };
const backStack: BackEntry[] = [];
let backInstalled = false;
const backKeysInstalled = new WeakSet<Phaser.Scene>();

/** Runs the top-most eligible back handler (optionally only those of one scene). */
function dispatchBack(only?: Phaser.Scene): boolean {
  for (let i = backStack.length - 1; i >= 0; i--) {
    const e = backStack[i];
    if (only && e.scene !== only) continue;
    if (!e.scene.sys.isActive()) continue;
    if (modalDepth(e.scene) > e.modal) continue;
    if (isLeaving(e.scene)) return true; // swallow during a transition
    if (e.cb()) return true;
  }
  return false;
}

/** One Escape/Backspace listener per scene, dispatching to that scene's top-most handler. */
function ensureBackKeys(scene: Phaser.Scene): void {
  if (backKeysInstalled.has(scene)) return;
  const kb = scene.input.keyboard;
  if (!kb) return;
  backKeysInstalled.add(scene);
  const key = (e: KeyboardEvent) => {
    if ((e.code !== 'Escape' && e.code !== 'Backspace') || e.repeat) return;
    dispatchBack(scene);
  };
  kb.on('keydown', key);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    backKeysInstalled.delete(scene);
    kb.off('keydown', key);
  });
}

function pushBack(scene: Phaser.Scene, cb: () => boolean, modal: number): BackEntry {
  if (!backInstalled) {
    backInstalled = true;
    onBackButton(() => dispatchBack());
  }
  const entry: BackEntry = { scene, cb, modal };
  backStack.push(entry);
  ensureBackKeys(scene);
  return entry;
}

function removeBack(entry: BackEntry): void {
  const i = backStack.indexOf(entry);
  if (i >= 0) backStack.splice(i, 1);
}

function registerBack(scene: Phaser.Scene, cb: () => boolean): void {
  const entry = pushBack(scene, cb, modalDepth(scene));
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => removeBack(entry));
}

/**
 * Register the "back" action of a scene: Escape / Backspace keys and the Android back button.
 * Only the most recently registered ACTIVE scene receives it. Auto-removed on scene shutdown.
 */
export function onBack(scene: Phaser.Scene, cb: () => void): void {
  registerBack(scene, () => { cb(); return true; });
}

/**
 * (added) Like onBack, but `cb` returns whether it consumed the back action. When it returns
 * false the action falls through to older handlers and finally to the platform (on Android:
 * the app exits) — e.g. the Title main menu lets the system handle back.
 */
export function onBackIf(scene: Phaser.Scene, cb: () => boolean): void {
  registerBack(scene, cb);
}

/** Fade the scene in (call at the start of create()). */
export function fadeIn(scene: Phaser.Scene, ms = 180): void {
  (scene as LeavingScene).__leaving = false;
  scene.cameras.main.fadeIn(ms, 5, 4, 10);
}

/** Fade out, then start another scene (ignores repeated calls during the fade). */
export function goto(scene: Phaser.Scene, key: SceneKey | string, data?: object, ms = 160): void {
  const s = scene as LeavingScene;
  if (s.__leaving) return;
  s.__leaving = true;
  const cam = scene.cameras.main;
  const input = scene.input;
  const kb = input.keyboard;
  const prevPointer = input.enabled;
  const prevKb = kb ? kb.enabled : true;
  input.enabled = false;
  if (kb) kb.enabled = false;
  const restore = () => {
    input.enabled = prevPointer;
    if (kb) kb.enabled = prevKb;
    s.__leaving = false;
  };
  const go = () => {
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
    restore();
    scene.scene.start(key, data);
  };
  const onShutdown = () => {
    cam.off(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, go);
    restore();
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
  if (ms <= 0) { go(); return; }
  // Continue from the current darkness if a fade-in is still running (no flash).
  const fx = cam.fadeEffect as Phaser.Cameras.Scene2D.Effects.Fade & { alpha: number; _elapsed: number };
  const dark = fx.isRunning && !fx.direction ? fx.alpha : 0;
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, go);
  cam.fadeOut(ms, 5, 4, 10);
  if (dark > 0) fx._elapsed = dark * ms;
}

/** Simple modal confirm dialog (YES / NO) centred on screen. Calls back with the choice. */
export function confirm(scene: Phaser.Scene, message: string, onDone: (yes: boolean) => void): void {
  const { width, height } = scene.scale.gameSize;
  const w = Math.min(264, width - 24);
  const msg = wrapText(message, w - 28, 's');
  const lines = msg.split('\n').length;
  const textH = lines * 11;
  const bh = 24;
  const h = Math.max(92, 24 + textH + 14 + bh + 12);
  const px = Math.round((width - w) / 2);
  const py = Math.round((height - h) / 2);
  const release = openModal(scene);
  const c = scene.add.container(0, 0).setDepth(DEPTH.overlay + 10);
  const shade = scene.add.rectangle(0, 0, width, height, COLORS.bg, 0.72).setOrigin(0).setInteractive();
  c.add(shade);
  const box = scene.add.container(px, py);
  c.add(box);
  box.add(panel(scene, 0, 0, w, h, 'raised'));
  box.add(text(scene, 12, 8, 'CONFIRM', { size: 's', color: COLORS.accent }));
  box.add(scene.add.rectangle(12, 18, w - 24, 1, COLORS.accent, 0.55).setOrigin(0));
  const t = text(scene, Math.round(w / 2), 25, msg, { size: 's', color: COLORS.text, originX: 0.5, align: 'center' });
  t.setLineSpacing(3);
  box.add(t);
  const openedAt = performance.now();
  let done = false;
  let focus = 0;
  let back: BackEntry | null = null;
  const keyFn = (e: KeyboardEvent) => {
    if (done || e.repeat || performance.now() - openedAt < 120) return;
    switch (e.code) {
      case 'ArrowLeft': case 'ArrowRight': case 'ArrowUp': case 'ArrowDown': case 'KeyA': case 'KeyD': case 'Tab':
        setFocus(1 - focus);
        audio.sfx('ui_move');
        break;
      case 'Enter': case 'NumpadEnter': case 'Space':
        audio.sfx(focus === 0 ? 'ui_select' : 'ui_back');
        finish(focus === 0);
        break;
      case 'KeyY': audio.sfx('ui_select'); finish(true); break;
      case 'KeyN': audio.sfx('ui_back'); finish(false); break;
      default: break;
    }
  };
  const finish = (yes: boolean) => {
    if (done) return;
    done = true;
    scene.input.keyboard?.off('keydown', keyFn);
    if (back) removeBack(back);
    release();
    c.destroy();
    onDone(yes);
  };
  const by = h - bh - 12;
  const bw = Math.min(96, Math.floor((w - 36) / 2));
  const gap = w - 24 - bw * 2;
  const yes = button(scene, 12, by, bw, bh, 'YES', () => finish(true), { size: 's', color: COLORS.good });
  const no = button(scene, 12 + bw + gap, by, bw, bh, 'NO', () => finish(false), { size: 's', color: COLORS.bad });
  const ring = scene.add.image(0, by - 2, outlineTex(scene, bw + 4, bh + 4)).setOrigin(0).setTint(COLORS.teal);
  box.add([yes.container, no.container, ring]);
  scene.tweens.add({ targets: ring, alpha: 0.45, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const setFocus = (f: number) => {
    focus = f;
    ring.x = (f === 0 ? 12 : 12 + bw + gap) - 2;
  };
  setFocus(0);
  // entrance: shade + panel slide/fade (pixel-crisp, no scaling)
  shade.setAlpha(0);
  box.setAlpha(0);
  box.y = py + 6;
  scene.tweens.add({ targets: shade, alpha: 1, duration: 140 });
  scene.tweens.add({ targets: box, alpha: 1, y: py, duration: 160, ease: 'Quad.easeOut' });
  scene.input.keyboard?.on('keydown', keyFn);
  back = pushBack(scene, () => { audio.sfx('ui_back'); finish(false); return true; }, modalDepth(scene));
  c.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.input.keyboard?.off('keydown', keyFn);
    if (back) removeBack(back);
    release();
  });
}
