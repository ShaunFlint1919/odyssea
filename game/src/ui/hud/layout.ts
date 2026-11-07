// =====================================================================================
//  HUD LAYOUT — pure geometry of the right-side status panel and the playfield overlays,
//  computed once from the game height (480..720). No Phaser objects here.
//
//  Panel rects use PANEL-LOCAL x (0 = left edge of the panel, i.e. screen x = PLAY_W) and
//  screen y. Playfield rects use screen coordinates.
// =====================================================================================
import { HUD_W, PLAY_W } from '../../config';

export interface Rect { x: number; y: number; w: number; h: number }

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

/** Box column inside the panel: x = 3..54 (52 px), interior 50 px, 8 FONT.s cells of text. */
export const BOX_X = 3;
export const BOX_W = 52;
/** Nominal FONT.s cell (the real advance is read from the font at runtime). */
export const CELL_S = 6;
/** Vertical LED segment stride (3 lit rows + 1 gap row). */
export const SEG = 4;
/** Number of power pips (MAX_POWER). */
export const PIPS = 10;
/** Pip geometry: 4x5 px pips with a 1 px gap. */
export const PIP_W = 4;
export const PIP_H = 6;
export const PIP_STRIDE = 5;
/** Rear-mode lamp size and toggle-icon size. */
export const LAMP = 11;
export const ICON = 16;
/** Energy LED column width and shield / armor gauge geometry. */
export const ENERGY_W = 26;
export const GAUGE_FRAME_W = 25;
export const GAUGE_W = 19;
/** Boss bar inner size. */
export const BOSS_W = 248;
export const BOSS_H = 5;
/** Banner band size. */
export const BAND_W = PLAY_W;
export const BAND_H = 46;
export const BAND_H_SHORT = 30;
/** Score backdrop size. */
export const SHADE_W = 104;
export const SHADE_H = 46;

export interface LegendBox {
  /** Outer rectangle (legend text sits on its top 8 rows, the frame line at y + 4). */
  box: Rect;
  legend: string;
}

export interface HudLayout {
  height: number;
  /** Screen x of the panel's left edge. */
  px: number;
  pw: number;
  pause: Rect;
  pauseHit: Rect;
  lcd: Rect;
  /** Text window of the level LCD (8 cells). */
  lcdWin: Rect;
  prog: Rect;
  progIn: Rect;
  energy: LegendBox;
  energyBar: Rect;
  front: LegendBox;
  frontWin: Rect;
  frontPips: Rect;
  rear: LegendBox;
  rearHit: Rect;
  rearWin: Rect;
  rearPips: Rect;
  lampA: Rect;
  lampB: Rect;
  rearIcon: Rect;
  side: LegendBox;
  sideLabelL: Rect;
  sideLabelR: Rect;
  sideWinL: Rect;
  sideWinR: Rect;
  shield: LegendBox;
  shieldBar: Rect;
  shieldNum: Rect;
  armor: LegendBox;
  armorBar: Rect;
  armorNum: Rect;
  // ---- playfield overlays (screen coordinates)
  score: { x: number; y: number };
  /** Soft dark backdrop behind score + credits (readability over bright terrain). */
  scoreShade: Rect;
  creditIcon: { x: number; y: number };
  credits: { x: number; y: number };
  /** Boss bar block: name row + framed bar (container slides vertically). */
  boss: Rect;
  bannerY: number;
}

/** Fixed heights of the stacked sections (see computeLayout). */
const PAUSE_H = 18;
const LCD_H = 13;
const PROG_H = 5;
const FRONT_H = 30;
const REAR_H = 47;
const SIDE_H = 32;
/** Legend box: 10 rows above the content, 3 below it (2 padding + frame). */
const LEGEND_TOP = 10;
/** Height of a gauge box around a bar of height `bar`. */
const energyBoxH = (bar: number) => LEGEND_TOP + bar + 3;
const gaugeBoxH = (bar: number) => LEGEND_TOP + bar + 13; // bar, 2 gap, 8 number, 2 pad, frame

/** Largest LED height <= h that starts and ends with a lit row (n * SEG - 1). */
const snapSeg = (h: number) => Math.max(SEG * 4 - 1, Math.floor((h + 1) / SEG) * SEG - 1);

/**
 * Computes the HUD geometry for a game height. The energy column and the shield / armor
 * gauges absorb the variable height; leftover pixels widen the gaps between sections.
 */
export function computeLayout(height: number): HudLayout {
  const H = Math.round(height);
  // Sum of everything that does not stretch (margins, gaps, fixed boxes, gauge box chrome).
  const top = 3;
  const bottom = 4;
  const gaps = [4, 2, 4, 3, 3, 3, 3]; // after pause, lcd, prog, energy, front, rear, side
  const fixed = top + PAUSE_H + LCD_H + PROG_H + FRONT_H + REAR_H + SIDE_H
    + energyBoxH(0) + gaugeBoxH(0) + gaps.reduce((a, b) => a + b, 0) + bottom;
  const flex = Math.max(120, H - fixed);
  const eh = snapSeg(Math.round(flex * 0.42));
  const gh = snapSeg(flex - eh);
  // Distribute the snapping leftovers over the gaps between the big blocks.
  let spare = Math.max(0, H - fixed - eh - gh);
  const extra = [0, 0, 0, 0, 0, 0, 0];
  const order = [3, 6, 4, 5, 2, 0, 1];
  for (let i = 0; spare > 0 && i < 64; i++) { extra[order[i % order.length]]++; spare--; }
  const gap = (i: number) => gaps[i] + extra[i];

  let y = top;
  const pause = rect(BOX_X, y, BOX_W, PAUSE_H);
  y += PAUSE_H + gap(0);
  const lcd = rect(BOX_X, y, BOX_W, LCD_H);
  const lcdWin = rect(BOX_X + 2, y + 3, 8 * CELL_S, 8);
  y += LCD_H + gap(1);
  const prog = rect(BOX_X, y, BOX_W, PROG_H);
  const progIn = rect(BOX_X + 1, y + 1, BOX_W - 2, PROG_H - 2);
  y += PROG_H + gap(2);

  const energyBox = rect(BOX_X, y, BOX_W, energyBoxH(eh));
  const energyBar = rect(BOX_X + Math.floor((BOX_W - ENERGY_W) / 2), y + LEGEND_TOP, ENERGY_W, eh);
  y += energyBox.h + gap(3);

  const frontBox = rect(BOX_X, y, BOX_W, FRONT_H);
  const frontWin = rect(BOX_X + 2, y + 10, 8 * CELL_S, 8);
  const frontPips = rect(BOX_X + 2, y + 21, PIPS * PIP_STRIDE - 1, PIP_H);
  y += FRONT_H + gap(4);

  const rearBox = rect(BOX_X, y, BOX_W, REAR_H);
  const rowW = LAMP + 2 + ICON + 2 + LAMP;
  const rowX = BOX_X + Math.floor((BOX_W - rowW) / 2);
  const lampA = rect(rowX, y + 11, LAMP, LAMP);
  const rearIcon = rect(rowX + LAMP + 2, y + 9, ICON, ICON);
  const lampB = rect(rowX + LAMP + 2 + ICON + 2, y + 11, LAMP, LAMP);
  const rearWin = rect(BOX_X + 2, y + 27, 8 * CELL_S, 8);
  const rearPips = rect(BOX_X + 2, y + 38, PIPS * PIP_STRIDE - 1, PIP_H);
  const rearHit = rect(0, y - 1, HUD_W, REAR_H + 2);
  y += REAR_H + gap(5);

  const sideBox = rect(BOX_X, y, BOX_W, SIDE_H);
  const sideLabelL = rect(BOX_X + 2, y + 10, CELL_S, 8);
  const sideLabelR = rect(BOX_X + 2, y + 21, CELL_S, 8);
  const sideWinL = rect(BOX_X + 2 + CELL_S + 2, y + 10, 7 * CELL_S, 8);
  const sideWinR = rect(BOX_X + 2 + CELL_S + 2, y + 21, 7 * CELL_S, 8);
  y += SIDE_H + gap(6);

  const gy = y;
  const shieldBox = rect(BOX_X, gy, GAUGE_FRAME_W, gaugeBoxH(gh));
  const armorBox = rect(BOX_X + BOX_W - GAUGE_FRAME_W, gy, GAUGE_FRAME_W, gaugeBoxH(gh));
  const barOff = Math.floor((GAUGE_FRAME_W - GAUGE_W) / 2);
  const shieldBar = rect(shieldBox.x + barOff, gy + LEGEND_TOP, GAUGE_W, gh);
  const armorBar = rect(armorBox.x + barOff, gy + LEGEND_TOP, GAUGE_W, gh);
  const numY = gy + LEGEND_TOP + gh + 2;
  const shieldNum = rect(shieldBox.x + 2, numY, GAUGE_FRAME_W - 4, 8);
  const armorNum = rect(armorBox.x + 2, numY, GAUGE_FRAME_W - 4, 8);

  return {
    height: H,
    px: PLAY_W,
    pw: HUD_W,
    pause,
    // generous touch target: plate + level LCD + progress strip (top-right corner)
    pauseHit: rect(0, 0, HUD_W, prog.y + prog.h + 2),
    lcd, lcdWin, prog, progIn,
    energy: { box: energyBox, legend: 'ENERGY' },
    energyBar,
    front: { box: frontBox, legend: 'FRONT' },
    frontWin, frontPips,
    rear: { box: rearBox, legend: 'REAR' },
    rearHit, rearWin, rearPips, lampA, lampB, rearIcon,
    side: { box: sideBox, legend: 'DRONES' },
    sideLabelL, sideLabelR, sideWinL, sideWinR,
    shield: { box: shieldBox, legend: 'SHD' },
    shieldBar, shieldNum,
    armor: { box: armorBox, legend: 'ARM' },
    armorBar, armorNum,
    score: { x: 8, y: H - 21 },
    creditIcon: { x: 9, y: H - 34 },
    credits: { x: 21, y: H - 36 },
    scoreShade: rect(0, H - SHADE_H, SHADE_W, SHADE_H),
    boss: rect(Math.floor((PLAY_W - BOSS_W - 4) / 2), 3, BOSS_W + 4, 21),
    bannerY: Math.round(H * 0.36),
  };
}
