// =====================================================================================
//  BITMAP FONTS (ART-A) — three Phaser RetroFonts covering RetroFont.TEXT_SET1 (ASCII 32..126).
//   FONT.s  6x8  cell: 5x7 glyphs, 1px strokes, WHITE + baked 1px dark shadow (tint it).
//   FONT.m  8x10 cell: bold 2px stems, WHITE + baked 1px dark shadow (tint it).
//   FONT.l 12x16 cell: title font, pre-coloured chrome gradient + outline + extrusion
//                      (do NOT tint; lowercase renders as uppercase).
//  Fixed advance = cell width (monospace), line height = cell height. Glyph cells are packed
//  16 per row with a 2px transparent gutter so scaled/rotated text never bleeds.
// =====================================================================================
import Phaser from 'phaser';
import { FONT } from './keys';
import { addTexture } from './pixel';
import { Mask, PixBuf, parseGlyphBlocks } from './a_ui_buf';
import { GLYPHS_S, GLYPHS_S_H, GLYPHS_S_W } from './a_ui_glyphs_s';
import { GLYPHS_M, GLYPHS_M_H, GLYPHS_M_W } from './a_ui_glyphs_m';
import { GLYPHS_L, GLYPHS_L_H, GLYPHS_L_W } from './a_ui_glyphs_l';

const PER_ROW = 16;
const GUTTER = 2;
const SHADOW = '#0a0812';
const INK = '#ffffff';

/** Vertical chrome ramp for the 12 body rows of FONT.l (white top, dark horizon, teal floor). */
const L_RAMP = [
  '#ffffff', '#ecfffb', '#c8fbf3', '#9cf3e6', '#66e6d3', '#33d3bf',
  '#0f7a73', '#13958a', '#1bad9e', '#28c3b1', '#4ad9c5', '#88eedd',
];
const L_OUTLINE = '#06040c';
const L_EXTRUDE_1 = '#4e1874';
const L_EXTRUDE_2 = '#2a0c40';

type Glyphs = Map<string, string[]>;

function chars(): string {
  return Phaser.GameObjects.RetroFont.TEXT_SET1;
}

function sheetSize(cw: number, ch: number): [number, number] {
  const rows = Math.ceil(chars().length / PER_ROW);
  return [PER_ROW * (cw + GUTTER) - GUTTER, rows * (ch + GUTTER) - GUTTER];
}

function cellOrigin(i: number, cw: number, ch: number): [number, number] {
  return [(i % PER_ROW) * (cw + GUTTER), Math.floor(i / PER_ROW) * (ch + GUTTER)];
}

function glyphFor(glyphs: Glyphs, c: string): string[] {
  return glyphs.get(c) ?? glyphs.get(c.toUpperCase()) ?? glyphs.get('?') ?? [];
}

/** White glyphs with a 1px dark drop shadow (bottom/right), for tinting. */
function buildShadowedSheet(glyphs: Glyphs, gw: number, gh: number, cw: number, ch: number): HTMLCanvasElement {
  const [w, h] = sheetSize(cw, ch);
  const buf = new PixBuf(w, h);
  const set = chars();
  for (let i = 0; i < set.length; i++) {
    const g = glyphFor(glyphs, set[i]);
    const [ox, oy] = cellOrigin(i, cw, ch);
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        if (g[y]?.[x] === '#' && x + 1 < cw && y + 1 < ch) buf.set(ox + x + 1, oy + y + 1, SHADOW);
      }
    }
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) if (g[y]?.[x] === '#') buf.set(ox + x, oy + y, INK);
    }
  }
  return buf.toCanvas();
}

/** Pre-coloured title glyphs: chrome gradient body, dark outline, 2px extrusion below. */
function buildTitleSheet(glyphs: Glyphs, cw: number, ch: number): HTMLCanvasElement {
  const [w, h] = sheetSize(cw, ch);
  const buf = new PixBuf(w, h);
  const set = chars();
  for (let i = 0; i < set.length; i++) {
    const g = glyphFor(glyphs, set[i]);
    const body = new Mask(cw, ch);
    for (let y = 0; y < GLYPHS_L_H; y++) {
      for (let x = 0; x < GLYPHS_L_W; x++) if (g[y]?.[x] === '#') body.set(x + 1, y + 1);
    }
    // Outline around the face, then a 2px drop of the outlined shape (depth without striping
    // the faces).
    const outline = body.ring(true);
    const solid = body.or(outline);
    const ext1 = solid.shift(0, 1);
    const ext2 = solid.shift(0, 2);
    const [ox, oy] = cellOrigin(i, cw, ch);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        let col: string | null = null;
        if (body.get(x, y)) {
          const row = Math.min(L_RAMP.length - 1, Math.max(0, y - 1));
          col = L_RAMP[row];
          // Bevel: lighter top edges, darker bottom edges of every stroke.
          if (!body.get(x, y - 1) && row > 1) col = L_RAMP[Math.max(0, row - 3)];
          else if (!body.get(x, y + 1) && row < 10) col = L_RAMP[Math.min(L_RAMP.length - 1, row + 1)];
        } else if (outline.get(x, y)) col = L_OUTLINE;
        else if (ext1.get(x, y)) col = L_EXTRUDE_1;
        else if (ext2.get(x, y)) col = L_EXTRUDE_2;
        if (col) buf.set(ox + x, oy + y, col);
      }
    }
  }
  return buf.toCanvas();
}

/** Registers `canvas` as texture `key` and as the RetroFont `key` in the bitmap-font cache. */
function registerRetroFont(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement, cw: number, ch: number): void {
  addTexture(scene, key, canvas);
  // Phaser 3.90: Parse() returns the whole cache entry { data, texture, frame } (its TS
  // typing says BitmapFontData), so it is registered as-is.
  const entry: unknown = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: key,
    width: cw,
    height: ch,
    chars: chars(),
    charsPerRow: PER_ROW,
    'offset.x': 0,
    'offset.y': 0,
    'spacing.x': GUTTER,
    'spacing.y': GUTTER,
    lineSpacing: 0,
  });
  if (scene.cache.bitmapFont.exists(key)) scene.cache.bitmapFont.remove(key);
  scene.cache.bitmapFont.add(key, entry);
}

/** Generates and registers FONT.s, FONT.m and FONT.l. */
export function generateFonts(scene: Phaser.Scene): void {
  const s = parseGlyphBlocks(GLYPHS_S_W, GLYPHS_S_H, GLYPHS_S);
  const m = parseGlyphBlocks(GLYPHS_M_W, GLYPHS_M_H, GLYPHS_M);
  const l = parseGlyphBlocks(GLYPHS_L_W, GLYPHS_L_H, GLYPHS_L);
  registerRetroFont(scene, FONT.s, buildShadowedSheet(s, GLYPHS_S_W, GLYPHS_S_H, 6, 8), 6, 8);
  registerRetroFont(scene, FONT.m, buildShadowedSheet(m, GLYPHS_M_W, GLYPHS_M_H, 8, 10), 8, 10);
  registerRetroFont(scene, FONT.l, buildTitleSheet(l, 12, 16), 12, 16);
}
