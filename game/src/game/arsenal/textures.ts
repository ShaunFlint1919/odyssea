// =====================================================================================
//  ARSENAL TEXTURES — resolves every texture key the arsenal draws with.
//  All art comes from src/art (generated at boot). If a key is missing (bad content id,
//  art module failing), a small procedural stand-in is generated once under a private
//  '__ars_' key so the game never shows Phaser's "missing texture" box.
// =====================================================================================
import Phaser from 'phaser';
import type { ShotColor } from '../../types';
import { PROJECTILE_SPRITES, SHOT_RGB, shadowKey, shotKey } from '../../art/keys';
import { addSheet, addTexture, makeCanvas, radialGlow, silhouette } from '../../art/pixel';
import { idleAnimKey } from '../../art/fx';

/** A texture key plus its frame layout (`first` = frame to pass to setTexture/setFrame). */
export interface TexInfo {
  readonly key: string;
  /** Number of animation frames (1 for single images). */
  readonly frames: number;
  readonly first: number | undefined;
  readonly w: number;
  readonly h: number;
}

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/** Frame layout of an existing texture. */
export function texInfo(scene: Phaser.Scene, key: string): TexInfo {
  const tex = scene.textures.get(key);
  const sheet = tex.has('0');
  const frame = tex.get(sheet ? 0 : undefined);
  return {
    key,
    frames: sheet ? Math.max(1, tex.frameTotal - 1) : 1,
    first: sheet ? 0 : undefined,
    w: frame.cutWidth,
    h: frame.cutHeight,
  };
}

/** Pixel size of a projectile sprite (PROJECTILE_SPRITES), [6, 6] if unknown. */
export function projectileSize(sprite: string): readonly [number, number] {
  const dims = (PROJECTILE_SPRITES as Record<string, readonly [number, number]>)[sprite];
  return dims ?? [6, 6];
}

/** Soft elliptical glowing blob with a white core (stand-in for a missing projectile). */
function blobCanvas(w: number, h: number, core: number, glow: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  const cr = (core >> 16) & 255, cg = (core >> 8) & 255, cb = core & 255;
  const gr = (glow >> 16) & 255, gg = (glow >> 8) & 255, gb = glow & 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - w / 2) / (w / 2), dy = (y + 0.5 - h / 2) / (h / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      const i = (y * w + x) * 4;
      const t = d < 0.45 ? 0 : (d - 0.45) / 0.55;
      img.data[i] = cr + (gr - cr) * t;
      img.data[i + 1] = cg + (gg - cg) * t;
      img.data[i + 2] = cb + (gb - cb) * t;
      img.data[i + 3] = Math.round(255 * (d < 0.7 ? 1 : 1 - (d - 0.7) / 0.3 * 0.7));
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Texture key of a player projectile (sprite + colour), generating a stand-in if needed. */
export function shotTexture(scene: Phaser.Scene, sprite: string, color: ShotColor): string {
  const key = shotKey(sprite, color);
  if (scene.textures.exists(key)) return key;
  const fb = `__ars_${key}`;
  if (!scene.textures.exists(fb)) {
    const [w, h] = projectileSize(sprite);
    const rgb = SHOT_RGB[color] ?? SHOT_RGB.white;
    addTexture(scene, fb, blobCanvas(w, h, rgb.core, rgb.glow));
  }
  return fb;
}

export type FxName = 'fx_spark' | 'fx_muzzle' | 'fx_glow' | 'fx_shockwave' | 'fx_pixel' | 'fx_engine' | 'fx_explosion_s';

/** Builds a stand-in for a missing FX texture (white, meant to be tinted). */
function fallbackFx(scene: Phaser.Scene, name: FxName, key: string): void {
  const sheet = (size: number, n: number, draw: (ctx: CanvasRenderingContext2D, f: number) => void) => {
    const frames: HTMLCanvasElement[] = [];
    for (let f = 0; f < n; f++) {
      const { canvas, ctx } = makeCanvas(size, size);
      draw(ctx, f);
      frames.push(canvas);
    }
    addSheet(scene, key, frames);
  };
  switch (name) {
    case 'fx_glow': addTexture(scene, key, radialGlow(32, '#ffffff', 2)); break;
    case 'fx_pixel': { const { canvas, ctx } = makeCanvas(2, 2); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 2, 2); addTexture(scene, key, canvas); break; }
    case 'fx_shockwave':
      sheet(64, 6, (ctx, f) => {
        ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 1 - f / 7; ctx.lineWidth = 3 - f * 0.35;
        ctx.beginPath(); ctx.arc(32, 32, 8 + f * 4.6, 0, Math.PI * 2); ctx.stroke();
      });
      break;
    case 'fx_engine':
      sheet(8, 4, (ctx, f) => { ctx.drawImage(blobCanvas(6, 7 + (f % 2), 0xffffe0, 0xff8020), 1, 0); });
      break;
    case 'fx_explosion_s':
      sheet(24, 8, (ctx, f) => { ctx.globalAlpha = 1 - f / 9; ctx.drawImage(radialGlow(8 + f * 2, '#ffc040', 1.5), 12 - (4 + f), 12 - (4 + f)); });
      break;
    default: {
      const size = name === 'fx_muzzle' ? 10 : 8;
      const n = name === 'fx_muzzle' ? 3 : 4;
      sheet(size, n, (ctx, f) => {
        const r = size / 2 - f;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(size / 2 - 1, size / 2 - r, 2, r * 2);
        ctx.fillRect(size / 2 - r, size / 2 - 1, r * 2, 2);
      });
    }
  }
}

/** Frame layout of an FX texture, generating a stand-in under a private key if missing. */
export function fxTexture(scene: Phaser.Scene, name: FxName): TexInfo {
  if (scene.textures.exists(name)) return texInfo(scene, name);
  const fb = `__ars_${name}`;
  if (!scene.textures.exists(fb)) fallbackFx(scene, name, fb);
  return texInfo(scene, fb);
}

/** A generic 16x16 drone / 32x32 ship stand-in when a sidekick or hull texture is missing. */
export function bodyTexture(scene: Phaser.Scene, key: string, size: number, color: number): string {
  if (scene.textures.exists(key)) return key;
  const fb = `__ars_${key}`;
  if (!scene.textures.exists(fb)) {
    const { canvas, ctx } = makeCanvas(size, size);
    const c = size / 2;
    ctx.fillStyle = '#0a0810';
    ctx.beginPath(); ctx.moveTo(c, 0); ctx.lineTo(size - 1, size - 2); ctx.lineTo(1, size - 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#646074';
    ctx.beginPath(); ctx.moveTo(c, 2); ctx.lineTo(size - 3, size - 3); ctx.lineTo(3, size - 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hex(color);
    ctx.fillRect(c - 1, size * 0.35, 2, size * 0.3);
    addTexture(scene, fb, canvas);
  }
  return fb;
}

/**
 * The uniform middle band of a beam texture (top / bottom 15 % cut off) under a private
 * key, so it can be stretched into a long beam without pointed ends.
 */
export function beamCoreTexture(scene: Phaser.Scene, key: string): TexInfo {
  const fb = `__ars_core_${key}`;
  if (!scene.textures.exists(fb)) {
    const tex = scene.textures.get(key);
    const frame = tex.get(tex.has('0') ? 0 : undefined);
    const src = tex.getSourceImage() as CanvasImageSource;
    const y0 = Math.floor(frame.cutHeight * 0.15);
    const h = Math.max(1, Math.ceil(frame.cutHeight * 0.85) - y0);
    const { canvas, ctx } = makeCanvas(frame.cutWidth, h);
    ctx.drawImage(src, frame.cutX, frame.cutY + y0, frame.cutWidth, h, 0, 0, frame.cutWidth, h);
    addTexture(scene, fb, canvas);
  }
  return texInfo(scene, fb);
}

/**
 * Ground-shadow texture for `key` (frame 0 silhouette). Uses the art module's
 * shadowKey(key) when it matches one frame, otherwise builds one once.
 */
export function shadowTexture(scene: Phaser.Scene, key: string): TexInfo | null {
  if (!scene.textures.exists(key)) return null;
  const body = texInfo(scene, key);
  const sk = shadowKey(key);
  if (scene.textures.exists(sk)) {
    const sh = texInfo(scene, sk);
    if (sh.frames > 1 || (sh.w === body.w && sh.h === body.h)) return sh;
  }
  const fb = `__ars_${sk}`;
  if (!scene.textures.exists(fb)) {
    const tex = scene.textures.get(key);
    const frame = tex.get(body.first);
    const src = tex.getSourceImage() as CanvasImageSource;
    const { canvas, ctx } = makeCanvas(frame.cutWidth, frame.cutHeight);
    ctx.drawImage(src, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, frame.cutWidth, frame.cutHeight);
    addTexture(scene, fb, silhouette(canvas, '#000000', 0.38));
  }
  return texInfo(scene, fb);
}

/**
 * Looping idle animation of a sidekick sheet. Reuses the art module's idleAnimKey(key) and
 * creates it (frames 0 and 1, 4 fps) if the art module did not. null for single-frame art.
 */
export function idleAnimation(scene: Phaser.Scene, key: string): string | null {
  const ak = idleAnimKey(key);
  if (scene.anims.exists(ak)) return ak;
  if (!scene.textures.exists(key)) return null;
  const tex = scene.textures.get(key);
  if (!tex.has('0') || !tex.has('1')) return null;
  scene.anims.create({ key: ak, frames: [{ key, frame: 0 }, { key, frame: 1 }], frameRate: 4, repeat: -1 });
  return ak;
}
