// =====================================================================================
//  PROJECTILE ART — one texture per (sprite, ShotColor).
//   Player / sidekick shots  shotKey(sprite, color):  glowing core (SHOT_RGB) wrapped in a
//     translucent glow, NO dark rim (so they never mask enemy bullets). Elongated ones point
//     UP at rotation 0  ->  rotation = atan2(vy, vx) + PI/2.
//   Enemy bullets  enemyBulletKey(sprite, color):  near-white core, saturated ring, 1px dark
//     rim (readable on every terrain). Elongated ones point DOWN at rotation 0
//     ->  rotation = atan2(vy, vx) - PI/2.
// =====================================================================================
import Phaser from 'phaser';
import type { ShotColor } from '../types';
import { SHOT_COLORS } from '../types';
import { ENEMY_BULLET_SPRITES, PROJECTILE_SPRITES, SHOT_RGB, enemyBulletKey, shotKey } from './keys';
import { addTexture, bayer } from './pixel';
import { PixBuf, hexOf, lerpColor, saturate, scaleColor } from './a_fx_core';
import { fbm } from './noise';

/** Actual pixel sizes [w, h] of the enemy bullet textures (the ENEMY_BULLET_SPRITES value is the long side). */
export const ENEMY_BULLET_SIZE: Record<keyof typeof ENEMY_BULLET_SPRITES, [number, number]> = {
  eb_dot: [6, 6],
  eb_orb: [9, 9],
  eb_bigorb: [14, 14],
  eb_needle: [5, 8],
  eb_ring: [10, 10],
  eb_missile: [6, 10],
  eb_laser: [8, 16],
};

interface ShotPal {
  w: string; c: string; L: string; G: string; D: string; k: string;
}

function shotPalette(color: ShotColor): ShotPal {
  const core = hexOf(SHOT_RGB[color].core);
  const glow = hexOf(SHOT_RGB[color].glow);
  const sat = color === 'white' ? glow : saturate(glow, 1.12);
  return {
    w: '#ffffff',
    c: core,
    L: lerpColor(core, sat, 0.45),
    G: sat,
    D: scaleColor(sat, 0.68),
    k: lerpColor('#07050c', sat, 0.16),
  };
}

/** Char -> [colour, alpha] for player shots (translucent glow chars g/h/f). */
function playerChars(p: ShotPal): Record<string, [string, number]> {
  return {
    w: [p.w, 1], c: [p.c, 1], L: [p.L, 1], G: [p.G, 0.82], D: [p.D, 0.9],
    g: [p.G, 0.58], h: [p.G, 0.32], f: [p.G, 0.16],
    '1': ['#2c2838', 1], '2': ['#5c586e', 1], '3': ['#9c98ae', 1], '4': ['#dcd8e8', 1],
  };
}

/** Char -> [colour, alpha] for enemy bullets (always opaque). */
function enemyChars(p: ShotPal): Record<string, [string, number]> {
  return {
    w: [p.w, 1], c: [p.c, 1], L: [p.L, 1], G: [p.G, 1], D: [p.D, 1], k: [p.k, 1],
    '1': ['#2c2838', 1], '2': ['#5c586e', 1], '3': ['#9c98ae', 1], '4': ['#dcd8e8', 1],
  };
}

function fromMap(rows: string[], chars: Record<string, [string, number]>): HTMLCanvasElement {
  const w = rows[0].length, h = rows.length;
  const buf = new PixBuf(w, h);
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const e = chars[row[x]];
      if (e) buf.put(x, y, e[0], e[1]);
    }
  });
  return buf.toCanvas();
}

type Zone = [number, string, number]; // [maxDistance, colour, alpha]

/** Radial zones (pixel centre distance from (cx, cy)), first matching zone wins. */
function radial(w: number, h: number, cx: number, cy: number, zones: Zone[], buf = new PixBuf(w, h)): PixBuf {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    for (const [r, col, a] of zones) {
      if (d <= r) { buf.put(x, y, col, a); break; }
    }
  }
  return buf;
}

// ------------------------------------------------------------------ player shots (point UP)

const PLAYER_MAPS: Partial<Record<keyof typeof PROJECTILE_SPRITES, string[]>> = {
  pj_bolt: [
    '.hh.',
    'gLLg',
    'gwwg',
    'gwwg',
    'gccg',
    'gccg',
    'hLLh',
    '.GG.',
    '.gg.',
    '.hh.',
  ],
  pj_needle: [
    'LL',
    'ww',
    'ww',
    'cc',
    'cc',
    'LL',
    'GG',
    'gg',
    'hh',
    'ff',
  ],
  pj_orb: [
    '..hhhh..',
    '.hgGGgh.',
    'hgLccLgh',
    'hGcwwcGh',
    'hGcwwcGh',
    'hgLccLgh',
    '.hgGGgh.',
    '..hhhh..',
  ],
  pj_missile: [
    '..L..',
    '.LcL.',
    '.GLD.',
    '.432.',
    '.432.',
    '.432.',
    'D432D',
    'D121D',
    '.gwg.',
    '.hch.',
    '..h..',
  ],
  pj_shard: [
    '..L..',
    '.Lwc.',
    '.wcG.',
    'LcGGD',
    '.cGD.',
    '.GD..',
    '..D..',
  ],
  pj_wave: [
    '...hhhh...',
    '.hgLwwLgh.',
    'hgLcwwcLgh',
    'gLc.hh.cLg',
    'Gc......cG',
    'h........h',
  ],
  pj_mine: [
    '....3....',
    '..12321..',
    '.1234321.',
    '.23DGD21.',
    '342GwG213',
    '.12DGD11.',
    '.1122211.',
    '..11111..',
    '....1....',
  ],
};

function beam(p: ShotPal): HTMLCanvasElement {
  const chars = playerChars(p);
  const rows: string[] = ['..hh..', '.hLLh.', 'hGccGh'];
  for (let i = 0; i < 18; i++) rows.push('hGwwGh');
  rows.push('hGccGh', '.hLLh.', '..hh..');
  return fromMap(rows, chars);
}

function bigOrb(p: ShotPal): HTMLCanvasElement {
  const buf = radial(14, 14, 7, 7, [
    [2.1, p.w, 1], [3.3, p.c, 1], [4.4, p.L, 1], [5.4, p.G, 0.82], [6.2, p.G, 0.55], [7.1, p.G, 0.28],
  ]);
  // plasma swirl highlights inside the glow band
  for (let i = 0; i < 3; i++) {
    const a0 = i * (Math.PI * 2 / 3) + 0.4;
    for (let k = 0; k < 5; k++) {
      const a = a0 + k * 0.22, r = 4.6 - k * 0.25;
      buf.put(Math.floor(7 + Math.cos(a) * r), Math.floor(7 + Math.sin(a) * r), p.c, 1);
    }
  }
  buf.put(5, 5, '#ffffff');
  return buf.toCanvas();
}

function ring(p: ShotPal): HTMLCanvasElement {
  const buf = new PixBuf(12, 12);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    const d = Math.hypot(x + 0.5 - 6, y + 0.5 - 6);
    if (d < 3.1) continue;
    if (d < 3.9) buf.put(x, y, p.w);
    else if (d < 4.6) buf.put(x, y, p.c);
    else if (d < 5.2) buf.put(x, y, p.G, 0.82);
    else if (d < 5.8) buf.put(x, y, p.G, 0.55);
    else if (d < 6.3) buf.put(x, y, p.G, 0.25);
  }
  return buf.toCanvas();
}

/** Irregular flame puff (same shape for every colour). */
function flame(p: ShotPal): HTMLCanvasElement {
  const buf = new PixBuf(10, 10);
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
    const px = x + 0.5, py = y + 0.5;
    const n = fbm(px / 2.6, py / 2.6, 321, 2) - 0.5;
    const d = Math.hypot(px - 5, (py - 5.2) * 0.95) + n * 2.6;
    if (d > 4.9) continue;
    const col = d < 1.4 ? p.w : d < 2.4 ? p.c : d < 3.3 ? p.L : d < 4.1 ? p.G : p.G;
    const a = d < 3.3 ? 1 : d < 4.1 ? 0.85 : 0.5;
    if (a < 1 && bayer(x, y) > 0.75) continue;
    buf.put(x, y, col, a);
  }
  return buf.toCanvas();
}

function playerShot(sprite: keyof typeof PROJECTILE_SPRITES, color: ShotColor): HTMLCanvasElement {
  const p = shotPalette(color);
  switch (sprite) {
    case 'pj_beam': return beam(p);
    case 'pj_bigorb': return bigOrb(p);
    case 'pj_ring': return ring(p);
    case 'pj_flame': return flame(p);
    default: return fromMap(PLAYER_MAPS[sprite] as string[], playerChars(p));
  }
}

// ------------------------------------------------------------------ enemy bullets (point DOWN)

const ENEMY_MAPS: Partial<Record<keyof typeof ENEMY_BULLET_SPRITES, string[]>> = {
  eb_dot: [
    '.kkkk.',
    'kDGGDk',
    'kGwwGk',
    'kGwwGk',
    'kDGGDk',
    '.kkkk.',
  ],
  eb_orb: [
    '..kkkkk..',
    '.kDGGGDk.',
    'kDGLLLGDk',
    'kGLwwwLGk',
    'kGLwwwLGk',
    'kGLwwwLGk',
    'kDGLLLGDk',
    '.kDGGGDk.',
    '..kkkkk..',
  ],
  eb_needle: [
    '.kkk.',
    'kDGDk',
    'kGLGk',
    'kGwGk',
    'kLwLk',
    'kLwLk',
    '.kwk.',
    '..k..',
  ],
  eb_missile: [
    '..cc..',
    '.kwwk.',
    'kDkkDk',
    'kDGGDk',
    '.kLLk.',
    '.kGGk.',
    '.kLLk.',
    '.kwwk.',
    '.kwwk.',
    '..kk..',
  ],
  eb_laser: [
    'kGLwwLGk',
  ],
};

function enemyBullet(sprite: keyof typeof ENEMY_BULLET_SPRITES, color: ShotColor): HTMLCanvasElement {
  const p = shotPalette(color);
  const chars = enemyChars(p);
  switch (sprite) {
    case 'eb_bigorb': {
      const buf = radial(14, 14, 7, 7, [
        [2.2, p.w, 1], [3.2, p.c, 1], [4.3, p.L, 1], [5.4, p.G, 1], [6.2, p.D, 1], [7.05, p.k, 1],
      ]);
      buf.put(5, 4, '#ffffff'); buf.put(4, 5, '#ffffff'); buf.put(5, 5, '#ffffff');
      return buf.toCanvas();
    }
    case 'eb_ring': {
      const buf = radial(10, 10, 5, 5, [
        [1.95, '#000000', 0], [2.65, p.k, 1], [3.45, p.w, 1], [4.25, p.G, 1], [5.05, p.k, 1],
      ]);
      // clear the hole
      for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
        if (Math.hypot(x + 0.5 - 5, y + 0.5 - 5) <= 1.95) buf.clear(x, y);
      }
      return buf.toCanvas();
    }
    case 'eb_laser': {
      const rows: string[] = [];
      for (let i = 0; i < ENEMY_BULLET_SIZE.eb_laser[1]; i++) rows.push(ENEMY_MAPS.eb_laser![0]);
      return fromMap(rows, chars);
    }
    default: return fromMap(ENEMY_MAPS[sprite] as string[], chars);
  }
}

/** Generates every player projectile and enemy bullet texture, for every ShotColor. */
export function generateProjectileArt(scene: Phaser.Scene): void {
  for (const color of SHOT_COLORS) {
    for (const sprite of Object.keys(PROJECTILE_SPRITES) as (keyof typeof PROJECTILE_SPRITES)[]) {
      addTexture(scene, shotKey(sprite, color), playerShot(sprite, color));
    }
    for (const sprite of Object.keys(ENEMY_BULLET_SPRITES) as (keyof typeof ENEMY_BULLET_SPRITES)[]) {
      addTexture(scene, enemyBulletKey(sprite, color), enemyBullet(sprite, color));
    }
  }
}
