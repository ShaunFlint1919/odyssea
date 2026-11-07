// =====================================================================================
//  UI ART (ART-A) — every UI_SPRITES key + a few extras (see NOTES in the report):
//   ui_panel / ui_panel_inset   24x24 9-slice tiles (8px corners; edges + centre tile cleanly)
//   ui_button                   48x24 sheet: frame 0 normal, frame 1 pressed (24x24 each)
//   ui_button_down              24x24 copy of the pressed frame (for 9-slicing a whole texture)
//   ui_bar_frame                12x12 gauge frame (4px corners)
//   ui_cursor, ui_arrow_l/r     12x12      ui_icon_*   16x16 (credits 10x10, lock 12x12)
//   ui_logo                     256x64 title logo
//   ui_scanlines                4x4 tileable scanline overlay      ui_glow_line  1x8 glow strip
//  Direction: indigo gunmetal plates, teal neon lines, magenta accents, gold for credits.
// =====================================================================================
import Phaser from 'phaser';
import { UI_SPRITES } from './keys';
import { addSheet, addTexture, flipH, mapToCanvas, mix, outlineCanvas } from './pixel';
import { Mask, PixBuf, fillPolygon } from './a_ui_buf';
import { ICON_COLORS, ICON_MAPS } from './a_ui_icons';
import { buildLogo } from './a_ui_logo';

/** Extra UI texture keys produced here (not in UI_SPRITES). */
export const UI_EXTRA = {
  buttonDown: 'ui_button_down', // 24x24, same art as ui_button frame 1 (9-slice, 8px corners)
  scanlines: 'ui_scanlines',    // 4x4 tileable overlay (use with a TileSprite)
  glowLine: 'ui_glow_line',     // 1x8 teal glow strip (stretch horizontally, ADD blend optional)
} as const;

const INK = '#0a0810';
const PLATE = '#232030';
const TEAL = '#2ee6c8';
const MAGENTA = '#d04cff';

/** Ring geometry of a square tile: distance to the border (0 = outer edge) + light side. */
interface Ring {
  d: number;
  light: number; // 2 top, 1 left, 0 neutral corner, -1 right, -2 bottom
  dx: number;
  dy: number;
}

function ringAt(x: number, y: number, n: number, cut: number): Ring | null {
  const dx = Math.min(x, n - 1 - x), dy = Math.min(y, n - 1 - y);
  const dc = dx + dy - cut;
  if (dc < 0) return null;
  const d = Math.min(dx, dy, dc);
  const left = x < n / 2, top = y < n / 2;
  let light: number;
  if ((dc < dx && dc < dy) || dx === dy) light = top && left ? 2 : !top && !left ? -2 : 0;
  else if (dy < dx) light = top ? 2 : -2;
  else light = left ? 1 : -1;
  return { d, light, dx, dy };
}

function paintTile(n: number, cut: number, color: (r: Ring, x: number, y: number) => string | null): PixBuf {
  const buf = new PixBuf(n, n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const r = ringAt(x, y, n, cut);
      if (!r) continue;
      const c = color(r, x, y);
      if (c) buf.set(x, y, c);
    }
  }
  return buf;
}

const pick = (light: number, top: string, left: string, mid: string, right: string, bottom: string) =>
  light === 2 ? top : light === 1 ? left : light === 0 ? mid : light === -1 ? right : bottom;

/** Small bolt heads in the four inner corners of a 24px tile. */
function rivets(buf: PixBuf, n: number): void {
  for (const [rx, ry] of [[5, 5], [n - 7, 5], [5, n - 7], [n - 7, n - 7]]) {
    buf.set(rx, ry, '#c4c0da');
    buf.set(rx + 1, ry, '#6e6894');
    buf.set(rx, ry + 1, '#6e6894');
    buf.set(rx + 1, ry + 1, INK);
  }
}

/** Raised indigo gunmetal plate: bevel, teal neon inner line, magenta corner accents, rivets. */
function panelTile(): PixBuf {
  const glowIn = mix(PLATE, TEAL, 0.16);
  const buf = paintTile(24, 2, (r) => {
    switch (r.d) {
      case 0: return INK;
      case 1: return pick(r.light, '#726c98', '#5a547e', '#3c3754', '#1e1b2b', '#161420');
      case 2: return mix(pick(r.light, '#2e2a44', '#2a2640', '#262236', '#201d2e', '#1d1a2a'), TEAL, 0.08);
      case 3: return r.dx <= 5 && r.dy <= 5 ? MAGENTA : TEAL;
      case 4: return glowIn;
      default: return PLATE;
    }
  });
  rivets(buf, 24);
  return buf;
}

/** Recessed dark screen with a subtle teal scanline tint. */
function insetTile(): PixBuf {
  return paintTile(24, 2, (r, _x, y) => {
    switch (r.d) {
      case 0: return INK;
      case 1: return pick(r.light, '#0c0a12', '#100e17', '#1f1c2c', '#38344c', '#4a4462');
      case 2: return r.light > 0 ? '#06050a' : '#110f19';
      default: {
        if (r.d === 3 && r.dx <= 4 && r.dy <= 4) return '#167a70'; // tiny corner ticks
        if (r.d === 3 && r.light > 0) return '#070c0f';             // inner shadow under the bezel
        return y % 2 === 0 ? '#0e1c21' : '#0a1317';                 // teal-tinted scanlines
      }
    }
  });
}

/** Button face: frame 0 raised keycap, frame 1 pressed (inverted bevel, lit neon). */
function buttonTile(pressed: boolean): PixBuf {
  if (!pressed) {
    const face = '#2f2b48';
    return paintTile(24, 2, (r) => {
      switch (r.d) {
        case 0: return INK;
        case 1: return pick(r.light, '#8e88b6', '#6c6696', '#46415f', '#221f33', '#14121e');
        case 2: return pick(r.light, '#3f3a5e', '#38335a', face, '#272340', '#1a1728');
        case 3: return r.light === -2 ? '#211e33' : r.dx <= 4 && r.dy <= 4 ? '#a03cc8' : mix(face, TEAL, 0.55);
        default: return face;
      }
    });
  }
  const face = '#231f38';
  return paintTile(24, 2, (r) => {
    switch (r.d) {
      case 0: return INK;
      case 1: return pick(r.light, '#0e0c16', '#12101b', '#2a2640', '#4c4668', '#5c567c');
      case 2: return r.light > 0 ? '#0a0912' : mix(face, TEAL, 0.12);
      case 3: return r.dx <= 4 && r.dy <= 4 ? '#f2a6ff' : TEAL;
      case 4: return mix(face, TEAL, 0.25);
      default: return mix(face, TEAL, 0.06);
    }
  });
}

/** 12x12 gauge frame (9-slice with 4px corners): bevelled rim around a dark well. */
function barFrameTile(): PixBuf {
  return paintTile(12, 1, (r) => {
    switch (r.d) {
      case 0: return INK;
      case 1: return pick(r.light, '#6e6894', '#565078', '#3a3550', '#1d1a2a', '#15131f');
      case 2: return '#06050a';
      default: return '#0e0c16';
    }
  });
}

function scanlines(): PixBuf {
  const b = new PixBuf(4, 4);
  for (let x = 0; x < 4; x++) {
    b.set(x, 0, '#2ee6c80e');
    b.set(x, 1, '#00000048');
    b.set(x, 3, '#00000048');
  }
  return b;
}

function glowLine(): PixBuf {
  const b = new PixBuf(1, 8);
  ['#2ee6c80a', '#2ee6c826', '#2ee6c870', '#d8fff8ff', '#2ee6c8ff', '#2ee6c870', '#2ee6c826', '#2ee6c80a']
    .forEach((c, y) => b.set(0, y, c));
  return b;
}

/** Rear-gun mode toggle: two orange arrows chasing each other around a circle. */
function rearModeIcon(): HTMLCanvasElement {
  const n = 16, c = 7.5;
  const m = new Mask(n, n);
  const gapA = [-45, 135];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 8;
      const r = Math.hypot(dx, dy);
      if (r < 3.4 || r > 6.0) continue;
      const a = (Math.atan2(dy, dx) * 180) / Math.PI;
      const inGap = gapA.some((g) => Math.abs(((a - g + 540) % 360) - 180) < 26);
      if (!inGap) m.set(x, y);
    }
  }
  // Arrowheads at the clockwise end of each arc (just before each gap).
  for (const g of gapA) {
    const a0 = ((g - 26) * Math.PI) / 180, a1 = ((g + 8) * Math.PI) / 180;
    const ux = Math.cos(a0), uy = Math.sin(a0);
    fillPolygon(m, [
      8 + ux * 1.9, 8 + uy * 1.9,
      8 + ux * 7.6, 8 + uy * 7.6,
      8 + Math.cos(a1) * 4.7, 8 + Math.sin(a1) * 4.7,
    ]);
  }
  const buf = new PixBuf(n, n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!m.get(x, y)) continue;
      const up = m.get(x, y - 1) && m.get(x - 1, y);
      const down = m.get(x, y + 1) && m.get(x + 1, y);
      buf.set(x, y, !up ? '#ffd8a0' : !down ? '#c03010' : x + y < 2 * c ? '#ffb050' : '#ff8a28');
    }
  }
  return outlineCanvas(buf.toCanvas(), INK, false);
}

function iconCanvas(key: string): HTMLCanvasElement {
  return outlineCanvas(mapToCanvas(ICON_MAPS[key], ICON_COLORS), INK, false);
}

/** Generates every UI texture (see header). */
export function generateUiArt(scene: Phaser.Scene): void {
  addTexture(scene, 'ui_panel', panelTile().toCanvas());
  addTexture(scene, 'ui_panel_inset', insetTile().toCanvas());
  const down = buttonTile(true).toCanvas();
  addSheet(scene, 'ui_button', [buttonTile(false).toCanvas(), down]);
  addTexture(scene, UI_EXTRA.buttonDown, down);
  addTexture(scene, 'ui_bar_frame', barFrameTile().toCanvas());
  addTexture(scene, UI_EXTRA.scanlines, scanlines().toCanvas());
  addTexture(scene, UI_EXTRA.glowLine, glowLine().toCanvas());

  for (const key of Object.keys(ICON_MAPS)) addTexture(scene, key, iconCanvas(key));
  addTexture(scene, 'ui_arrow_l', outlineCanvas(mapToCanvas(flipH(ICON_MAPS.ui_arrow_r), ICON_COLORS), INK, false));
  addTexture(scene, 'ui_icon_rear_mode', rearModeIcon());
  addTexture(scene, 'ui_logo', buildLogo());

  if (import.meta.env?.DEV) {
    for (const key of Object.keys(UI_SPRITES)) {
      if (!scene.textures.exists(key)) console.warn(`[ui art] missing texture ${key}`);
    }
  }
}
