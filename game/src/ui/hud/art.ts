// =====================================================================================
//  HUD ART — composes, ONCE per HUD instance, (1) the static right-side panel as a single
//  56 x H canvas texture (plates, LCD windows, legends, unlit LEDs / pips / lamps, icons) and
//  (2) an atlas of every dynamic part (lit gauge fills, white masks, pips, lamps, digits,
//  boss bar, banner bands, hazard stripes). Art from the art module (ui_icon_*, ui_bar_frame,
//  fx_warning) is copied in when present; procedural fallbacks are drawn otherwise.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS } from '../../config';
import { COMMON_COLORS, makeCanvas, paintMap, type ColorMap, type PixelMap } from '../../art/pixel';
import { mulberry32 } from '../../art/noise';
import { renderText, type HudFonts } from './glyphs';
import {
  BAND_H, BAND_H_SHORT, BAND_W, BOSS_H, BOSS_W, ICON, LAMP, PIPS, PIP_H, PIP_STRIDE, PIP_W, SEG,
  type HudLayout, type LegendBox, type Rect,
} from './layout';
import { drawTexture, fill, hex, hline, nineSlice, px, raisedPlate, ramp, shade, strokeRect, vgrad, vline, withAlpha, type Ctx } from './paint';

// ------------------------------------------------------------------------------ palette

export const PAL = {
  edge: '#05040a',
  neon: hex(COLORS.teal),
  neonLine: '#23c2a9',
  neonDeep: hex(COLORS.tealDark),
  panelTop: '#2a253e',
  panelBot: '#1c192b',
  boxBg: '#16131f',
  groove: '#0a0811',
  grooveHi: '#3b3552',
  recess: '#07060c',
  lcdBg: '#03130f',
  lcdScan: '#041a14',
  lcdGhost: '#072a20',
  lcdShadow: '#010806',
  legend: '#aaa4c4',
  magenta: hex(COLORS.accent),
  magentaDim: '#7a2a9a',
  gold: hex(COLORS.gold),
  text: hex(COLORS.text),
  plateBody: ['#3b3654', '#2a2640'] as [string, string],
  plateHi: '#5a537c',
  plateLo: '#131019',
};

/** Lit LED ramps, bottom -> top. */
export const ENERGY_RAMP = ['#a80c1e', '#ee341c', '#ff7a1c', '#ffbe26', '#fff07a'];
export const SHIELD_RAMP = ['#1a2c8c', '#2456d8', '#3c8cff', '#74c4ff', '#b8e6ff'];
export const ARMOR_RAMP = ['#a00c1a', '#de2a1c', '#ff5a2a', '#ff8a40', '#ffb46c'];
const ENERGY_OFF = ['#1c0a0e', '#221010', '#261610', '#261c10', '#262210'];
const SHIELD_OFF = ['#0a0e22', '#0c1228', '#0e162c', '#101a30', '#121e34'];
const ARMOR_OFF = ['#1e0a0c', '#220e0e', '#26120e', '#281610', '#2a1a12'];
export const BOSS_ROWS = ['#ffc0ec', '#ff5cae', '#ea2c78', '#b2145a', '#6e0c38'];
export const PIP_FROM = hex(COLORS.teal);
export const PIP_TO = hex(COLORS.accent);

// ------------------------------------------------------------------------------ fallback icons

const ICON_COLORS: ColorMap = { ...COMMON_COLORS, o: '#b07818', Y: '#fff2a8' };

const PAUSE_FALLBACK: PixelMap = [
  '................',
  '................',
  '................',
  '...kkkkk.kkkkk..',
  '...kHHHk.kHHHk..',
  '...kwHhk.kwHhk..',
  '...kwHhk.kwHhk..',
  '...kwHhk.kwHhk..',
  '...kwHhk.kwHhk..',
  '...kwHhk.kwHhk..',
  '...kwHhk.kwHhk..',
  '...kwHhk.kwHhk..',
  '...khhGk.khhGk..',
  '...kkkkk.kkkkk..',
  '................',
  '................',
];

const REAR_FALLBACK: PixelMap = [
  '................',
  '.........k......',
  '.........kk.....',
  '..kkkkkkkkTk....',
  '..kTTTTTTTTTk...',
  '..kkkkkkkkTk....',
  '.........kk.....',
  '.........k......',
  '......k.........',
  '.....kk.........',
  '....kMkkkkkkkk..',
  '...kMMMMMMMMMk..',
  '....kMkkkkkkkk..',
  '.....kk.........',
  '......k.........',
  '................',
];

const CREDIT_FALLBACK: PixelMap = [
  '....kk....',
  '...kYyk...',
  '..kYyyyk..',
  '.kYwyyyok.',
  'kYyyyyyyok',
  'kyyyyyyook',
  '.kyyyyook.',
  '..kyyook..',
  '...kook...',
  '....kk....',
];

function drawIcon(ctx: Ctx, scene: Phaser.Scene, key: string, fallback: PixelMap, x: number, y: number): void {
  if (drawTexture(ctx, scene, key, x, y)) return;
  paintMap(ctx, fallback, ICON_COLORS, x, y);
}

// ------------------------------------------------------------------------------ building blocks

type RampFn = (t: number) => string;

/**
 * A vertical LED column: rows grouped in SEG-row segments (SEG-1 lit rows + 1 transparent
 * gap row), counted from the bottom; colour from `col(t)` (t = 0 bottom .. 1 top).
 */
function ledColumn(ctx: Ctx, x: number, y: number, w: number, h: number, col: RampFn, flat = false): void {
  for (let row = 0; row < h; row++) {
    const fb = h - 1 - row;
    const k = fb % SEG;
    if (k === SEG - 1) continue;
    const t = h <= 1 ? 0 : fb / (h - 1);
    let c = col(t);
    if (!flat) {
      if (k === SEG - 2) c = shade(c, 0.2);
      else if (k === 0) c = shade(c, -0.2);
    }
    for (let xx = 0; xx < w; xx++) {
      let cc = c;
      if (flat) cc = xx === 0 || xx === w - 1 ? '#d8d8e0' : c;
      else if (xx === 0 || xx === w - 1) cc = shade(c, -0.34);
      else if (xx === 2 || xx === 3) cc = shade(c, 0.3);
      else if (xx === w - 2) cc = shade(c, -0.12);
      px(ctx, x + xx, y + row, cc);
    }
  }
}

/** Horizontal segmented bar (boss): vertical row shading, 1 px gap column every `seg` px. */
function hbar(ctx: Ctx, x: number, y: number, w: number, rows: string[], seg: number, white = false): void {
  for (let xx = 0; xx < w; xx++) {
    if (xx % seg === seg - 1) continue;
    for (let r = 0; r < rows.length; r++) {
      const c = white ? (r === 0 || r === rows.length - 1 ? '#e0dce8' : '#ffffff') : rows[r];
      px(ctx, x + xx, y + r, xx % seg === 0 && !white ? shade(c, -0.15) : c);
    }
  }
}

/** 10 power pips: lit = teal -> magenta ramp, unlit = dark. */
function pips(ctx: Ctx, x: number, y: number, mode: 'lit' | 'off' | 'white'): void {
  for (let i = 0; i < PIPS; i++) {
    const t = i / (PIPS - 1);
    const base = mode === 'lit' ? ramp([PIP_FROM, '#7ab8ff', PIP_TO], t) : mode === 'off' ? '#151d26' : '#ffffff';
    const x0 = x + i * PIP_STRIDE;
    for (let yy = 0; yy < PIP_H; yy++) {
      for (let xx = 0; xx < PIP_W; xx++) {
        let c = base;
        if (mode !== 'white') {
          if (yy === 0) c = shade(base, mode === 'lit' ? 0.45 : 0.12);
          else if (yy === PIP_H - 1) c = shade(base, -0.35);
          else if (xx === PIP_W - 1) c = shade(base, -0.18);
        }
        px(ctx, x0 + xx, y + yy, c);
      }
    }
  }
}

/** Rounded lamp body (LAMP x LAMP) with a letter. */
function lamp(ctx: Ctx, fonts: HudFonts, x: number, y: number, letter: string, top: string, bottom: string, ink: number, hi: string | null): void {
  vgrad(ctx, x + 1, y + 1, LAMP - 2, LAMP - 2, top, bottom, 4);
  strokeRect(ctx, { x, y, w: LAMP, h: LAMP }, PAL.edge);
  ctx.clearRect(x, y, 1, 1);
  ctx.clearRect(x + LAMP - 1, y, 1, 1);
  ctx.clearRect(x, y + LAMP - 1, 1, 1);
  ctx.clearRect(x + LAMP - 1, y + LAMP - 1, 1, 1);
  if (hi) { px(ctx, x + 2, y + 2, hi); hline(ctx, x + 2, y + 1, LAMP - 4, shade(top, 0.35)); }
  const g = renderText(fonts.s, letter, { tint: ink });
  ctx.drawImage(g, x + Math.floor((LAMP - fonts.s.cellW) / 2) + 1, y + Math.floor((LAMP - fonts.s.cellH) / 2) + 1);
}

/** Recessed LCD window background with scanlines and dot-matrix ghost cells. */
function lcdWindow(ctx: Ctx, bg: Rect, cells: Rect, cellW: number, cellH: number): void {
  fill(ctx, bg.x, bg.y, bg.w, bg.h, PAL.lcdBg);
  for (let yy = bg.y + 1; yy < bg.y + bg.h; yy += 2) hline(ctx, bg.x, yy, bg.w, PAL.lcdScan);
  hline(ctx, bg.x, bg.y, bg.w, PAL.lcdShadow);
  const n = Math.floor(cells.w / cellW);
  const gw = Math.max(1, cellW - 1);
  const gh = Math.max(1, cellH - 1);
  for (let i = 0; i < n; i++) fill(ctx, cells.x + i * cellW, cells.y, gw, gh, PAL.lcdGhost);
  // faint glass reflection
  hline(ctx, bg.x + 1, bg.y + 1, Math.min(14, bg.w - 2), 'rgba(170,255,235,0.07)');
}

/** Text rect of a legend (centred on the box's top line). */
export function legendTextRect(lb: LegendBox, fonts: HudFonts): Rect {
  const w = fonts.s.width(lb.legend);
  return { x: lb.box.x + Math.floor((lb.box.w - w) / 2), y: lb.box.y, w, h: fonts.s.cellH };
}

// ------------------------------------------------------------------------------ static panel

/** Paints the whole static panel (panel-local coordinates) into a new canvas. */
export function paintPanel(scene: Phaser.Scene, L: HudLayout, fonts: HudFonts, legendColor: Record<string, number>): HTMLCanvasElement {
  const W = L.pw, H = L.height;
  // Background layer kept apart so legend gaps can "restore" it.
  const bgC = makeCanvas(W, H);
  const bg = bgC.ctx;
  vgrad(bg, 0, 0, W, H, PAL.panelTop, PAL.panelBot, 10);
  const rnd = mulberry32(0x5eed);
  for (let y = 2; y < H - 1; y++) {
    if (rnd() < 0.22) hline(bg, 3, y, W - 4, 'rgba(255,255,255,0.028)');
    else if (rnd() < 0.12) hline(bg, 3, y, W - 4, 'rgba(0,0,0,0.05)');
  }
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.drawImage(bgC.canvas, 0, 0);
  const restore = (x: number, y: number, w: number, h: number) => {
    ctx.clearRect(x, y, w, h);
    ctx.drawImage(bgC.canvas, x, y, w, h, x, y, w, h);
  };

  // ---- edges: dark seam + teal neon rail on the playfield side, dark right edge
  vline(ctx, 0, 0, H, PAL.edge);
  vline(ctx, 1, 0, H, PAL.neonLine);
  vline(ctx, 2, 0, H, withAlpha(PAL.neon, 0.14));
  vline(ctx, W - 1, 0, H, PAL.edge);
  vline(ctx, W - 2, 1, H - 2, 'rgba(0,0,0,0.18)');
  hline(ctx, 0, 0, W, PAL.edge);
  hline(ctx, 2, 1, W - 3, 'rgba(255,255,255,0.06)');
  hline(ctx, 0, H - 1, W, PAL.edge);
  // rail glints at both ends
  vline(ctx, 1, 0, 10, '#7ff8e6');
  vline(ctx, 1, H - 10, 10, '#7ff8e6');

  // ---- pause plate
  raisedPlate(ctx, L.pause, PAL.plateBody, PAL.plateHi, PAL.plateLo, PAL.edge);
  drawIcon(ctx, scene, 'ui_icon_pause', PAUSE_FALLBACK, L.pause.x + Math.floor((L.pause.w - ICON) / 2), L.pause.y + Math.floor((L.pause.h - ICON) / 2));
  // grip lines either side of the icon
  for (let i = 0; i < 3; i++) {
    vline(ctx, L.pause.x + 6 + i * 3, L.pause.y + 5, L.pause.h - 10, '#1d1a2c');
    vline(ctx, L.pause.x + 7 + i * 3, L.pause.y + 5, L.pause.h - 10, '#4a4466');
    vline(ctx, L.pause.x + L.pause.w - 9 - i * 3, L.pause.y + 5, L.pause.h - 10, '#1d1a2c');
    vline(ctx, L.pause.x + L.pause.w - 8 - i * 3, L.pause.y + 5, L.pause.h - 10, '#4a4466');
  }

  // ---- level LCD
  strokeRect(ctx, L.lcd, PAL.edge);
  lcdWindow(ctx, { x: L.lcd.x + 1, y: L.lcd.y + 1, w: L.lcd.w - 2, h: L.lcd.h - 2 }, L.lcdWin, fonts.s.cellW, fonts.s.cellH);
  hline(ctx, L.lcd.x + 1, L.lcd.y + L.lcd.h, L.lcd.w - 1, PAL.grooveHi);

  // ---- progress track
  strokeRect(ctx, L.prog, PAL.edge);
  fill(ctx, L.progIn.x, L.progIn.y, L.progIn.w, L.progIn.h, '#100d1a');
  hline(ctx, L.progIn.x, L.progIn.y, L.progIn.w, '#0a0812');
  for (let q = 1; q < 4; q++) vline(ctx, L.progIn.x + Math.round((L.progIn.w * q) / 4), L.progIn.y, L.progIn.h, '#2a2440');
  fill(ctx, L.progIn.x + L.progIn.w - 3, L.progIn.y, 3, L.progIn.h, PAL.magentaDim);
  hline(ctx, L.prog.x + 1, L.prog.y + L.prog.h, L.prog.w - 1, PAL.grooveHi);

  // ---- legend boxes
  const legendBox = (lb: LegendBox, raised: boolean) => {
    const b = lb.box;
    const fr: Rect = { x: b.x, y: b.y + 4, w: b.w, h: b.h - 4 };
    if (raised) {
      raisedPlate(ctx, fr, ['#2c2843', '#211d33'], '#4a4468', PAL.plateLo, PAL.groove);
    } else {
      fill(ctx, fr.x + 1, fr.y + 1, fr.w - 2, fr.h - 2, PAL.boxBg);
      strokeRect(ctx, fr, PAL.groove);
      hline(ctx, fr.x + 1, fr.y + 1, fr.w - 2, '#0f0d16');
      hline(ctx, fr.x + 1, fr.y + fr.h, fr.w - 1, PAL.grooveHi);
    }
    // magenta corner brackets
    const m = PAL.magenta;
    px(ctx, fr.x, fr.y + fr.h - 1, m); px(ctx, fr.x + 1, fr.y + fr.h - 1, m); px(ctx, fr.x, fr.y + fr.h - 2, m);
    px(ctx, fr.x + fr.w - 1, fr.y + fr.h - 1, m); px(ctx, fr.x + fr.w - 2, fr.y + fr.h - 1, m); px(ctx, fr.x + fr.w - 1, fr.y + fr.h - 2, m);
    // legend in a gap of the top line
    const t = legendTextRect(lb, fonts);
    restore(t.x - 2, b.y, t.w + 3, 4);
    restore(t.x - 2, b.y + 4, t.w + 3, 1);
    if (raised) fill(ctx, t.x - 2, b.y + 5, t.w + 3, 3, '#2c2843');
    else fill(ctx, t.x - 2, b.y + 5, t.w + 3, 3, PAL.boxBg);
    px(ctx, t.x - 3, b.y + 4, PAL.neonDeep);
    px(ctx, t.x + t.w + 1, b.y + 4, PAL.neonDeep);
    const color = legendColor[lb.legend] ?? 0xaaa4c4;
    ctx.drawImage(renderText(fonts.s, lb.legend, { tint: color }), t.x, t.y);
  };

  // energy
  legendBox(L.energy, false);
  const eb = L.energyBar;
  fill(ctx, eb.x - 1, eb.y - 1, eb.w + 2, eb.h + 2, PAL.recess);
  strokeRect(ctx, { x: eb.x - 2, y: eb.y - 2, w: eb.w + 4, h: eb.h + 4 }, PAL.groove);
  if (!nineSliceFrame(ctx, scene, { x: eb.x - 3, y: eb.y - 3, w: eb.w + 6, h: eb.h + 6 })) {
    hline(ctx, eb.x - 2, eb.y + eb.h + 2, eb.w + 4, PAL.grooveHi);
  }
  ledColumn(ctx, eb.x, eb.y, eb.w, eb.h, (t) => ramp(ENERGY_OFF, t));
  // scale ticks either side
  for (let i = 0; i <= 8; i++) {
    const ty = eb.y + eb.h - 1 - Math.round(((eb.h - 1) * i) / 8);
    const major = i % 2 === 0;
    const len = major ? 4 : 2;
    const c = major ? '#3aa898' : '#1e5a54';
    hline(ctx, eb.x - 4 - len, ty, len, c);
    hline(ctx, eb.x + eb.w + 4, ty, len, c);
  }

  // front
  legendBox(L.front, false);
  lcdWindow(ctx, { x: L.front.box.x + 1, y: L.frontWin.y - 1, w: L.front.box.w - 2, h: 10 }, L.frontWin, fonts.s.cellW, fonts.s.cellH);
  pips(ctx, L.frontPips.x, L.frontPips.y, 'off');

  // rear (raised: it is a touch button)
  legendBox(L.rear, true);
  lcdWindow(ctx, { x: L.rear.box.x + 2, y: L.rearWin.y - 1, w: L.rear.box.w - 4, h: 10 }, L.rearWin, fonts.s.cellW, fonts.s.cellH);
  pips(ctx, L.rearPips.x, L.rearPips.y, 'off');
  lamp(ctx, fonts, L.lampA.x, L.lampA.y, 'A', '#1c2330', '#121822', 0x3e4c60, null);
  lamp(ctx, fonts, L.lampB.x, L.lampB.y, 'B', '#1c2330', '#121822', 0x3e4c60, null);
  drawIcon(ctx, scene, 'ui_icon_rear_mode', REAR_FALLBACK, L.rearIcon.x, L.rearIcon.y);

  // drones
  legendBox(L.side, false);
  for (const [lab, win, letter] of [[L.sideLabelL, L.sideWinL, 'L'], [L.sideLabelR, L.sideWinR, 'R']] as const) {
    lcdWindow(ctx, { x: win.x - 1, y: win.y - 1, w: win.w + 2, h: 10 }, win, fonts.s.cellW, fonts.s.cellH);
    ctx.drawImage(renderText(fonts.s, letter, { tint: COLORS.accentLight }), lab.x, lab.y);
  }

  // shield / armor
  for (const [lb, bar, num, off] of [
    [L.shield, L.shieldBar, L.shieldNum, SHIELD_OFF],
    [L.armor, L.armorBar, L.armorNum, ARMOR_OFF],
  ] as const) {
    legendBox(lb, false);
    fill(ctx, bar.x - 1, bar.y - 1, bar.w + 2, bar.h + 2, PAL.recess);
    strokeRect(ctx, { x: bar.x - 2, y: bar.y - 2, w: bar.w + 4, h: bar.h + 4 }, PAL.groove);
    nineSliceFrame(ctx, scene, { x: bar.x - 3, y: bar.y - 3, w: bar.w + 6, h: bar.h + 6 });
    ledColumn(ctx, bar.x, bar.y, bar.w, bar.h, (t) => ramp(off, t));
    fill(ctx, num.x, num.y - 1, num.w, num.h + 1, '#0b0912');
  }
  // Back-fill every transparent pixel (rounded plate / lamp corners) with the panel background:
  // the panel must be fully opaque or the shaking world would show through it.
  ctx.globalCompositeOperation = 'destination-over';
  ctx.drawImage(bgC.canvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

/** Optional art-module gauge frame (ui_bar_frame, 4 px corners) drawn around a bar. */
function nineSliceFrame(ctx: Ctx, scene: Phaser.Scene, r: Rect): boolean {
  if (!scene.textures.exists('ui_bar_frame')) return false;
  // Draw only the border: paint into a scratch canvas, punch the centre out, composite.
  const s = makeCanvas(r.w, r.h);
  if (!nineSlice(s.ctx, scene, 'ui_bar_frame', { x: 0, y: 0, w: r.w, h: r.h }, 4)) return false;
  s.ctx.clearRect(3, 3, r.w - 6, r.h - 6);
  ctx.drawImage(s.canvas, r.x, r.y);
  return true;
}

// ------------------------------------------------------------------------------ parts atlas

interface PartDef { name: string; w: number; h: number; draw: (ctx: Ctx, x: number, y: number) => void }

/** Shelf-packs named parts into one canvas texture with one frame per part. */
export class AtlasBuilder {
  private readonly parts: PartDef[] = [];

  add(name: string, w: number, h: number, draw: (ctx: Ctx, x: number, y: number) => void): void {
    this.parts.push({ name, w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)), draw });
  }

  build(scene: Phaser.Scene, key: string, maxW = 512): void {
    const sorted = [...this.parts].sort((a, b) => b.h - a.h || b.w - a.w);
    const pos: number[] = [];
    let x = 0, y = 0, rowH = 0;
    for (const p of sorted) {
      if (x + p.w > maxW) { x = 0; y += rowH + 1; rowH = 0; }
      pos.push(x, y);
      x += p.w + 1;
      rowH = Math.max(rowH, p.h);
    }
    const { canvas, ctx } = makeCanvas(maxW, y + rowH + 1);
    sorted.forEach((p, i) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(pos[i * 2], pos[i * 2 + 1], p.w, p.h);
      ctx.clip();
      p.draw(ctx, pos[i * 2], pos[i * 2 + 1]);
      ctx.restore();
    });
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.addCanvas(key, canvas);
    if (!tex) return;
    sorted.forEach((p, i) => tex.add(p.name, 0, pos[i * 2], pos[i * 2 + 1], p.w, p.h));
  }
}

/** Glyph frame size of the outlined FONT.m digits. */
export function scoreDigitSize(fonts: HudFonts): { w: number; h: number } {
  return { w: fonts.m.cellW + 2, h: fonts.m.cellH + 2 };
}

/** Builds the dynamic-parts atlas for a layout. Frame names are listed in PART. */
export function buildParts(scene: Phaser.Scene, key: string, L: HudLayout, fonts: HudFonts): void {
  const a = new AtlasBuilder();
  const eb = L.energyBar, sb = L.shieldBar;
  a.add(PART.px, 4, 4, (c, x, y) => fill(c, x, y, 4, 4, '#ffffff'));
  a.add(PART.eFill, eb.w, eb.h, (c, x, y) => ledColumn(c, x, y, eb.w, eb.h, (t) => ramp(ENERGY_RAMP, t)));
  a.add(PART.eWhite, eb.w, eb.h, (c, x, y) => ledColumn(c, x, y, eb.w, eb.h, () => '#ffffff', true));
  a.add(PART.sFill, sb.w, sb.h, (c, x, y) => ledColumn(c, x, y, sb.w, sb.h, (t) => ramp(SHIELD_RAMP, t)));
  a.add(PART.aFill, sb.w, sb.h, (c, x, y) => ledColumn(c, x, y, sb.w, sb.h, (t) => ramp(ARMOR_RAMP, t)));
  a.add(PART.gWhite, sb.w, sb.h, (c, x, y) => ledColumn(c, x, y, sb.w, sb.h, () => '#ffffff', true));
  const pw = PIPS * PIP_STRIDE - 1;
  a.add(PART.pips, pw, PIP_H, (c, x, y) => pips(c, x, y, 'lit'));
  a.add(PART.pipsWhite, pw, PIP_H, (c, x, y) => pips(c, x, y, 'white'));
  // lit lamps with a 1 px glow ring
  const lampLit = (letter: string, top: string, bottom: string, ink: number, glow: string) => (c: Ctx, x: number, y: number) => {
    strokeRect(c, { x, y, w: LAMP + 2, h: LAMP + 2 }, withAlpha(glow, 0.35));
    c.clearRect(x, y, 1, 1); c.clearRect(x + LAMP + 1, y, 1, 1); c.clearRect(x, y + LAMP + 1, 1, 1); c.clearRect(x + LAMP + 1, y + LAMP + 1, 1, 1);
    lamp(c, fonts, x + 1, y + 1, letter, top, bottom, ink, '#ffffff');
  };
  a.add(PART.lampA, LAMP + 2, LAMP + 2, lampLit('A', '#9cfcec', '#14a08c', 0x03261f, PAL.neon));
  a.add(PART.lampB, LAMP + 2, LAMP + 2, lampLit('B', '#f9c6ff', '#a42ed6', 0x2c0638, PAL.magenta));
  a.add(PART.lampWhite, LAMP, LAMP, (c, x, y) => {
    fill(c, x + 1, y, LAMP - 2, LAMP, '#ffffff');
    fill(c, x, y + 1, LAMP, LAMP - 2, '#ffffff');
  });
  // pressed pause plate
  const pr = L.pause;
  a.add(PART.pausePressed, pr.w, pr.h, (c, x, y) => {
    const r = { x, y, w: pr.w, h: pr.h };
    raisedPlate(c, r, ['#1e1b2e', '#2a2640'], '#15121f', '#3e3858', PAL.edge);
    const ic = makeCanvas(ICON, ICON);
    drawIcon(ic.ctx, scene, 'ui_icon_pause', PAUSE_FALLBACK, 0, 0);
    c.drawImage(ic.canvas, x + Math.floor((pr.w - ICON) / 2), y + Math.floor((pr.h - ICON) / 2) + 1);
    strokeRect(c, { x: x + 1, y: y + 1, w: pr.w - 2, h: pr.h - 2 }, withAlpha(PAL.neon, 0.55));
  });
  // rear press glow
  const rb = L.rear.box;
  a.add(PART.rearGlow, rb.w, rb.h - 4, (c, x, y) => {
    const r = { x, y, w: rb.w, h: rb.h - 4 };
    strokeRect(c, r, PAL.neon);
    strokeRect(c, { x: x + 1, y: y + 1, w: r.w - 2, h: r.h - 2 }, withAlpha(PAL.neon, 0.45));
    fill(c, x + 2, y + 2, r.w - 4, r.h - 4, withAlpha(PAL.neon, 0.1));
  });
  // progress
  const pi = L.progIn;
  a.add(PART.progFill, pi.w, pi.h, (c, x, y) => {
    for (let r = 0; r < pi.h; r++) hline(c, x, y + r, pi.w, r === 0 ? '#a8fff0' : r === pi.h - 1 ? '#11806f' : PAL.neon);
  });
  a.add(PART.progHead, 2, pi.h, (c, x, y) => fill(c, x, y, 2, pi.h, '#ffffff'));
  // panel edge damage glow (stretched vertically)
  a.add(PART.edgeRed, 8, 2, (c, x, y) => {
    for (let i = 0; i < 8; i++) fill(c, x + i, y, 1, 2, withAlpha('#ff2a2a', 0.95 * (1 - i / 8) ** 1.6));
  });
  // digits
  const ds = scoreDigitSize(fonts);
  for (let d = 0; d <= 9; d++) {
    const s = String(d);
    a.add(`m${d}`, ds.w, ds.h, (c, x, y) => c.drawImage(renderText(fonts.m, s, { outline: '#05040a' }), x, y));
    a.add(`s${d}`, fonts.s.cellW, fonts.s.cellH, (c, x, y) => c.drawImage(renderText(fonts.s, s), x, y));
  }
  a.add(PART.credIcon, 10, 10, (c, x, y) => {
    if (!drawTexture(c, scene, 'ui_icon_credits', x, y, 10, 10)) paintMap(c, CREDIT_FALLBACK, ICON_COLORS, x, y);
  });
  // boss bar
  a.add(PART.bossFrame, BOSS_W + 4, BOSS_H + 4, (c, x, y) => {
    fill(c, x + 1, y + 1, BOSS_W + 2, BOSS_H + 2, '#140a1a');
    strokeRect(c, { x, y, w: BOSS_W + 4, h: BOSS_H + 4 }, PAL.edge);
    hline(c, x + 1, y + 1, BOSS_W + 2, '#0a050e');
    hline(c, x + 1, y + BOSS_H + 2, BOSS_W + 2, '#3a2446');
    hbar(c, x + 2, y + 2, BOSS_W, ['#2a0c22', '#34102a', '#300e26', '#2a0c22', '#220a1c'], 6);
  });
  a.add(PART.bossFill, BOSS_W, BOSS_H, (c, x, y) => hbar(c, x, y, BOSS_W, BOSS_ROWS, 6));
  a.add(PART.bossWhite, BOSS_W, BOSS_H, (c, x, y) => hbar(c, x, y, BOSS_W, BOSS_ROWS, 6, true));
  a.add(PART.bossCap, 7, 9, (c, x, y) => {
    // magenta diamond end-cap
    const rows = ['...k...', '..kMk..', '.kMmMk.', 'kMmwmMk', '.kMmMk.', '..kMk..', '...k...'];
    paintMap(c, rows, { ...COMMON_COLORS, m: '#ff8ae0' }, x, y + 1);
  });
  // soft backdrop behind score + credits
  const sh = L.scoreShade;
  a.add(PART.scoreShade, sh.w, sh.h, (c, x, y) => {
    const ss = (e0: number, e1: number, v: number) => { const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    for (let yy = 0; yy < sh.h; yy++) {
      for (let xx = 0; xx < sh.w; xx++) {
        const al = 0.5 * (1 - ss(0.45, 1, xx / sh.w)) * ss(0, 0.5, yy / sh.h);
        if (al > 0.01) px(c, x + xx, y + yy, withAlpha('#05040a', al));
      }
    }
  });
  // hazard stripes (fx_warning tiled) and banner bands
  const sw = BAND_W + 64;
  a.add(PART.stripe, sw, 16, (c, x, y) => {
    let ok = false;
    for (let i = 0; i * 64 < sw; i++) ok = drawTexture(c, scene, 'fx_warning', x + i * 64, y) || ok;
    if (!ok) {
      for (let xx = 0; xx < sw; xx++) {
        for (let yy = 0; yy < 16; yy++) {
          const edge = yy === 0 || yy === 15;
          const yel = ((xx + yy) & 15) < 8;
          px(c, x + xx, y + yy, edge ? '#0a0810' : yel ? (yy < 3 ? '#ffe46a' : '#ffcc2a') : '#17141e');
        }
      }
    }
  });
  const band = (h: number, warn: boolean) => (c: Ctx, x: number, y: number) => {
    const bgA = warn ? '#22040a' : '#0b0a1c';
    const scan = warn ? '#2e0810' : '#121028';
    const edge = warn ? '#ff4a4a' : PAL.neon;
    const edge2 = warn ? '#8a1018' : PAL.neonDeep;
    for (let yy = 0; yy < h; yy++) {
      const base = yy % 2 ? scan : bgA;
      for (let xx = 0; xx < BAND_W; xx++) {
        const fade = Math.min(1, Math.min(xx, BAND_W - 1 - xx) / 28);
        const isEdge = yy === 0 || yy === h - 1;
        const isEdge2 = yy === 1 || yy === h - 2;
        const col = isEdge ? edge : isEdge2 ? edge2 : base;
        const al = isEdge ? 0.95 * fade : isEdge2 ? 0.9 * fade : 0.84 * (0.35 + 0.65 * fade);
        px(c, x + xx, y + yy, withAlpha(col, al));
      }
    }
    // centre accents on the edges
    hline(c, x + BAND_W / 2 - 20, y, 40, '#ffffff');
    hline(c, x + BAND_W / 2 - 20, y + h - 1, 40, '#ffffff');
  };
  a.add(PART.bandInfo, BAND_W, BAND_H, band(BAND_H, false));
  a.add(PART.bandInfoShort, BAND_W, BAND_H_SHORT, band(BAND_H_SHORT, false));
  a.add(PART.bandWarn, BAND_W, BAND_H, band(BAND_H, true));
  a.add(PART.bandWarnShort, BAND_W, BAND_H_SHORT, band(BAND_H_SHORT, true));
  // red legends for blink overlays
  for (const lb of [L.energy, L.armor]) {
    const t = legendTextRect(lb, fonts);
    a.add(`leg_${lb.legend}`, t.w, t.h, (c, x, y) => c.drawImage(renderText(fonts.s, lb.legend, { tint: 0xff3a3a }), x, y));
  }
  a.build(scene, key);
}

/** Frame names inside the parts atlas. */
export const PART = {
  px: 'px',
  eFill: 'eFill',
  eWhite: 'eWhite',
  sFill: 'sFill',
  aFill: 'aFill',
  gWhite: 'gWhite',
  pips: 'pips',
  pipsWhite: 'pipsWhite',
  lampA: 'lampA',
  lampB: 'lampB',
  lampWhite: 'lampWhite',
  pausePressed: 'pausePressed',
  rearGlow: 'rearGlow',
  progFill: 'progFill',
  progHead: 'progHead',
  edgeRed: 'edgeRed',
  credIcon: 'credIcon',
  bossFrame: 'bossFrame',
  bossFill: 'bossFill',
  bossWhite: 'bossWhite',
  bossCap: 'bossCap',
  stripe: 'stripe',
  bandInfo: 'bandInfo',
  bandInfoShort: 'bandInfoShort',
  bandWarn: 'bandWarn',
  bandWarnShort: 'bandWarnShort',
  scoreShade: 'scoreShade',
} as const;

/** Digit frame names (no allocation when indexing). */
export const DIGIT_M = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9'] as const;
export const DIGIT_S = ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'] as const;

