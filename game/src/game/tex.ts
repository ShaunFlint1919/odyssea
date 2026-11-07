// =====================================================================================
//  TEXTURE HELPERS for the in-mission systems:
//   - safe key resolution (falls back to small generated textures when an art key is
//     missing, so a content/art mismatch never breaks a mission or floods the console),
//   - FrameAnim: animations played MANUALLY from the world clock (so hit-stop, slow-motion
//     and DEBUG.speed affect explosions, gems, engine flames... consistently),
//   - a few world-only textures (white pixel, red damage vignette, crater decal).
// =====================================================================================
import Phaser from 'phaser';
import { H, PLAY_W } from '../config';

/** White 2x2 pixel (lines, flashes, stars). */
export const TEX_PX = 'world_px';
/** Red edge vignette (PLAY_W x H) flashed on armor damage. */
export const TEX_VIGNETTE = 'world_vignette';
/** Dark scorch decal left on the ground by destroyed ground units. */
export const TEX_CRATER = 'world_crater';

type FallbackKind = 'enemy' | 'bullet' | 'blast' | 'gem' | 'pickup' | 'ship' | 'boss' | 'part' | 'glow' | 'puff' | 'chip' | 'ring';

const FALLBACK_SIZE: Record<FallbackKind, [number, number]> = {
  enemy: [16, 16], bullet: [6, 6], blast: [24, 24], gem: [8, 8], pickup: [14, 14], ship: [24, 24],
  boss: [96, 72], part: [16, 16], glow: [32, 32], puff: [14, 14], chip: [4, 4], ring: [40, 40],
};

function drawFallback(kind: FallbackKind, ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cx = w / 2, cy = h / 2;
  switch (kind) {
    case 'enemy':
      ctx.fillStyle = '#b03040'; ctx.beginPath(); ctx.moveTo(cx, h - 1); ctx.lineTo(1, 2); ctx.lineTo(w - 1, 2); ctx.closePath(); ctx.fill();
      break;
    case 'bullet':
      ctx.fillStyle = '#ff6020'; ctx.beginPath(); ctx.arc(cx, cy, w / 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 1, cy - 1, 2, 2);
      break;
    case 'blast': {
      const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, w / 2);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#ffd040'); g.addColorStop(0.7, '#ff6010'); g.addColorStop(1, 'rgba(120,20,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      break;
    }
    case 'gem':
      ctx.fillStyle = '#ffd060'; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(w, cy); ctx.lineTo(cx, h); ctx.lineTo(0, cy); ctx.closePath(); ctx.fill();
      break;
    case 'pickup':
      ctx.fillStyle = '#2ee6c8'; ctx.fillRect(1, 1, w - 2, h - 2); ctx.fillStyle = '#05040a'; ctx.fillRect(4, 4, w - 8, h - 8);
      break;
    case 'ship':
      ctx.fillStyle = '#8ec8ff'; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
      break;
    case 'boss':
      ctx.fillStyle = '#4a4660'; ctx.fillRect(4, 4, w - 8, h - 8); ctx.fillStyle = '#ff3050'; ctx.fillRect(cx - 6, cy - 6, 12, 12);
      break;
    case 'part':
      ctx.fillStyle = '#6a6680'; ctx.beginPath(); ctx.arc(cx, cy, w / 2 - 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2638'; ctx.fillRect(cx - 2, cy, 4, h / 2);
      break;
    case 'glow': {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      break;
    }
    case 'puff':
      ctx.fillStyle = 'rgba(90,86,100,0.8)'; ctx.beginPath(); ctx.arc(cx, cy, w / 2 - 1, 0, Math.PI * 2); ctx.fill();
      break;
    case 'chip':
      ctx.fillStyle = '#8a8698'; ctx.fillRect(0, 0, w, h);
      break;
    case 'ring':
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2); ctx.stroke();
      break;
  }
}

/** Key of a small generated fallback texture (created on first use). */
export function fallbackTex(scene: Phaser.Scene, kind: FallbackKind): string {
  const key = `world_fb_${kind}`;
  if (!scene.textures.exists(key)) {
    const [w, h] = FALLBACK_SIZE[kind];
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    drawFallback(kind, c.getContext('2d')!, w, h);
    scene.textures.addCanvas(key, c);
  }
  return key;
}

/** `key` if the texture exists, else the fallback texture of `kind`. */
export function texOr(scene: Phaser.Scene, key: string, kind: FallbackKind): string {
  return scene.textures.exists(key) ? key : fallbackTex(scene, kind);
}

/** Number of real frames of a texture (1 for a plain image, n for a sprite sheet). */
export function frameCount(scene: Phaser.Scene, key: string): number {
  if (!scene.textures.exists(key)) return 1;
  const t = scene.textures.get(key);
  return Math.max(1, t.frameTotal - 1);
}

/** True if the texture `key` has a frame named / numbered `frame`. */
export function hasFrame(scene: Phaser.Scene, key: string, frame: number | string): boolean {
  return scene.textures.exists(key) && scene.textures.get(key).has(frame as string);
}

/**
 * A frame sequence played manually from world time. Built from a registered Phaser
 * animation when available (frame list + frame rate), else from the frames of a sheet.
 */
export class FrameAnim {
  readonly keys: string[] = [];
  readonly frames: (string | number)[] = [];
  /** Cumulative end time (ms) of each frame within one cycle (per-frame durations honoured). */
  private readonly ends: number[] = [];
  readonly msPerFrame: number;
  readonly loop: boolean;

  constructor(scene: Phaser.Scene, animKey: string, sheetKey: string, fallback: FallbackKind, fps: number, loop: boolean) {
    const anim = animKey && scene.anims.exists(animKey) ? scene.anims.get(animKey) : null;
    let t = 0;
    if (anim && anim.frames.length > 0) {
      this.msPerFrame = anim.msPerFrame > 0 ? anim.msPerFrame : 1000 / fps;
      for (const f of anim.frames) {
        this.keys.push(f.textureKey);
        this.frames.push(f.textureFrame);
        t += f.duration > 0 ? f.duration : this.msPerFrame;
        this.ends.push(t);
      }
    } else {
      this.msPerFrame = 1000 / fps;
      const n = scene.textures.exists(sheetKey) ? frameCount(scene, sheetKey) : 1;
      for (let i = 0; i < n; i++) {
        if (scene.textures.exists(sheetKey)) {
          this.keys.push(sheetKey);
          this.frames.push(n > 1 ? i : '__BASE');
        } else {
          this.keys.push(fallbackTex(scene, fallback));
          this.frames.push('__BASE');
        }
        t += this.msPerFrame;
        this.ends.push(t);
      }
    }
    this.loop = loop;
  }

  get length(): number { return this.frames.length; }
  /** Total duration of one cycle in ms. */
  get duration(): number { return this.ends[this.ends.length - 1]; }

  /** Frame index for an age in ms (-1 once a non-looping animation is over). */
  index(ageMs: number): number {
    const total = this.ends[this.ends.length - 1];
    let a = ageMs;
    if (a >= total) {
      if (!this.loop) return -1;
      a %= total;
    }
    const ends = this.ends;
    for (let i = 0; i < ends.length; i++) if (a < ends[i]) return i;
    return ends.length - 1;
  }

  /** Apply frame `i` to an image (no allocation). */
  apply(img: Phaser.GameObjects.Image, i: number): void {
    img.setTexture(this.keys[i], this.frames[i]);
  }
}

/** Generates the world-only textures (idempotent; vignette is regenerated for the current H). */
export function ensureWorldTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(TEX_PX)) {
    const c = document.createElement('canvas');
    c.width = 2; c.height = 2;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 2, 2);
    scene.textures.addCanvas(TEX_PX, c);
  }
  if (!scene.textures.exists(TEX_VIGNETTE)) {
    const w = PLAY_W, h = H;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.hypot(w, h) * 0.55);
    g.addColorStop(0, 'rgba(255,32,24,0)');
    g.addColorStop(0.6, 'rgba(255,32,24,0.35)');
    g.addColorStop(1, 'rgba(255,24,16,0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    scene.textures.addCanvas(TEX_VIGNETTE, c);
  }
  if (!scene.textures.exists(TEX_CRATER)) {
    const s = 24;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    // Pixel-art scorch: concentric dithered dark blotch.
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = x - s / 2 + 0.5, dy = (y - s / 2 + 0.5) * 1.15;
        const d = Math.hypot(dx, dy) / (s / 2);
        const n = ((x * 7 + y * 13) % 5) / 5;
        if (d < 0.45) ctx.fillStyle = 'rgba(10,8,12,0.78)';
        else if (d < 0.75 + n * 0.12) ctx.fillStyle = (x + y) % 2 === 0 ? 'rgba(20,16,18,0.55)' : 'rgba(20,16,18,0.3)';
        else if (d < 1 && (x + y) % 3 === 0) ctx.fillStyle = 'rgba(30,24,24,0.25)';
        else continue;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    scene.textures.addCanvas(TEX_CRATER, c);
  }
}
