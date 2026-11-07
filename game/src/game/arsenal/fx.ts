// =====================================================================================
//  ARSENAL FX — pooled short-lived visuals: impact sparks, glow flashes, splash rings,
//  muzzle flashes (following their gun) and exhaust trails. Frames are stepped manually
//  (no Phaser anim objects), everything is additive, nothing allocates after warm-up.
// =====================================================================================
import Phaser from 'phaser';
import { ImageGroup, type AnchorSource, type ArsenalEnv } from './env';
import { fxTexture, type TexInfo } from './textures';
import { HALF_PI } from './scaling';

/** One live effect. */
class FxItem {
  img: Phaser.GameObjects.Image | null = null;
  age = 0;
  life = 1;
  frames = 1;
  frameMs = 1;
  frame = 0;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  s0 = 1;
  s1 = 1;
  a0 = 1;
  a1 = 0;
  anchor = -1;
  ox = 0;
  oy = 0;
  slot = -1;
}

const MAX_SLOTS = 64;

/** Muzzle slot ranges (one flash per gun barrel, re-triggered on every volley). */
export const SLOT_FRONT = 0;   // 0..23
export const SLOT_REAR = 24;   // 24..47
export const SLOT_SIDEKICK = 48; // 48..63

export class FxPool {
  private readonly items: FxItem[] = [];
  private readonly free: FxItem[] = [];
  private readonly slots: (FxItem | null)[] = [];
  private readonly group: ImageGroup;
  private readonly sparkTex: TexInfo;
  private readonly glowTex: TexInfo;
  private readonly muzzleTex: TexInfo;
  private readonly ringTex: TexInfo;
  private readonly ringRadius: number;

  constructor(env: ArsenalEnv, depth: number, private readonly anchors: AnchorSource, initial: number) {
    const scene = env.scene;
    this.sparkTex = fxTexture(scene, 'fx_spark');
    this.glowTex = fxTexture(scene, 'fx_glow');
    this.muzzleTex = fxTexture(scene, 'fx_muzzle');
    this.ringTex = fxTexture(scene, 'fx_shockwave');
    // The last shockwave frame shows a ring of ~0.48 x the texture size in radius.
    this.ringRadius = Math.max(8, this.ringTex.w * 0.48);
    this.group = new ImageGroup(env, depth, Phaser.BlendModes.ADD, initial, this.glowTex.key);
    for (let i = 0; i < MAX_SLOTS; i++) this.slots.push(null);
    for (let i = 0; i < initial; i++) this.free.push(new FxItem());
  }

  private spawn(tex: TexInfo, x: number, y: number, life: number): FxItem {
    const it = this.free.pop() ?? new FxItem();
    const img = this.group.take(tex.key, tex.first);
    it.img = img;
    it.age = 0;
    it.life = life;
    it.frames = tex.frames;
    it.frameMs = life / tex.frames;
    it.frame = 0;
    it.x = x;
    it.y = y;
    it.vx = 0;
    it.vy = 0;
    it.s0 = 1;
    it.s1 = 1;
    it.a0 = 1;
    it.a1 = 0;
    it.anchor = -1;
    it.ox = 0;
    it.oy = 0;
    it.slot = -1;
    img.x = x;
    img.y = y;
    this.items.push(it);
    return it;
  }

  /** Small 4-frame impact star. */
  spark(x: number, y: number, tint: number, scale = 1): void {
    const it = this.spawn(this.sparkTex, x, y, 150);
    it.s0 = scale;
    it.s1 = scale * 1.15;
    it.a0 = 1;
    it.a1 = 0.6;
    const img = it.img as Phaser.GameObjects.Image;
    img.setTint(tint);
    img.setRotation((Math.random() * 4 | 0) * HALF_PI * 0.5);
    img.setScale(scale);
  }

  /** Soft additive glow flash of `size` px (diameter), fading over `ms`. */
  flash(x: number, y: number, tint: number, size: number, ms = 120, alpha = 0.9): void {
    const it = this.spawn(this.glowTex, x, y, ms);
    const s = size / this.glowTex.w;
    it.s0 = s * 0.6;
    it.s1 = s;
    it.a0 = alpha;
    it.a1 = 0;
    const img = it.img as Phaser.GameObjects.Image;
    img.setTint(tint);
    img.setScale(it.s0);
    img.setAlpha(alpha);
  }

  /** Expanding shockwave ring reaching `radius` px (splash visual). */
  ring(x: number, y: number, radius: number, tint: number, ms = 280): void {
    const it = this.spawn(this.ringTex, x, y, ms);
    const s = radius / this.ringRadius;
    it.s0 = s;
    it.s1 = s * 1.05;
    it.a0 = 1;
    it.a1 = 0.5;
    const img = it.img as Phaser.GameObjects.Image;
    img.setTint(tint);
    img.setScale(s);
  }

  /** Exhaust / trail dot drifting with (vx, vy) px/s. */
  trail(x: number, y: number, tint: number, size: number, vx: number, vy: number, ms = 200): void {
    const it = this.spawn(this.glowTex, x, y, ms);
    const s = size / this.glowTex.w;
    it.s0 = s;
    it.s1 = s * 0.35;
    it.a0 = 0.75;
    it.a1 = 0;
    it.vx = vx;
    it.vy = vy;
    const img = it.img as Phaser.GameObjects.Image;
    img.setTint(tint);
    img.setScale(s);
    img.setAlpha(0.75);
  }

  /**
   * Muzzle flash on gun `slot`, following `anchor` at offset (ox, oy), pointing along `angle`.
   * Re-triggers the slot's flash if it is still visible (one flash per barrel).
   */
  muzzle(slot: number, anchor: number, ox: number, oy: number, angle: number, tint: number, scale = 1): void {
    let it = slot >= 0 && slot < MAX_SLOTS ? this.slots[slot] : null;
    const x = this.anchors.anchorX(anchor) + ox;
    const y = this.anchors.anchorY(anchor) + oy;
    if (it) {
      it.age = 0;
      it.frame = 0;
      (it.img as Phaser.GameObjects.Image).setFrame(this.muzzleTex.first ?? '__BASE');
    } else {
      it = this.spawn(this.muzzleTex, x, y, 75);
      if (slot >= 0 && slot < MAX_SLOTS) {
        it.slot = slot;
        this.slots[slot] = it;
      }
    }
    it.anchor = anchor;
    it.ox = ox;
    it.oy = oy;
    it.s0 = scale;
    it.s1 = scale * 0.8;
    it.a0 = 0.9;
    it.a1 = 0.45;
    const img = it.img as Phaser.GameObjects.Image;
    img.setTint(tint);
    img.setRotation(angle + HALF_PI);
    img.setScale(scale);
    img.setAlpha(0.9);
    img.x = x;
    img.y = y;
  }

  /** Advances every effect by dtMs. */
  update(dtMs: number): void {
    const items = this.items;
    const dt = dtMs / 1000;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.age += dtMs;
      if (it.age >= it.life) {
        this.release(i);
        continue;
      }
      const img = it.img as Phaser.GameObjects.Image;
      const t = it.age / it.life;
      if (it.anchor >= 0) {
        img.x = this.anchors.anchorX(it.anchor) + it.ox;
        img.y = this.anchors.anchorY(it.anchor) + it.oy;
      } else if (it.vx !== 0 || it.vy !== 0) {
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        img.x = it.x;
        img.y = it.y;
      }
      if (it.frames > 1) {
        const f = Math.min(it.frames - 1, (it.age / it.frameMs) | 0);
        if (f !== it.frame) {
          it.frame = f;
          img.setFrame(f);
        }
      }
      if (it.s0 !== it.s1) img.setScale(it.s0 + (it.s1 - it.s0) * t);
      img.setAlpha(it.a0 + (it.a1 - it.a0) * t);
    }
  }

  private release(i: number): void {
    const items = this.items;
    const it = items[i];
    const last = items.length - 1;
    items[i] = items[last];
    items.pop();
    if (it.img) this.group.give(it.img);
    it.img = null;
    if (it.slot >= 0) this.slots[it.slot] = null;
    it.slot = -1;
    this.free.push(it);
  }

  /** Number of live effects (debug). */
  get count(): number {
    return this.items.length;
  }

  /** Removes every effect immediately. */
  clear(): void {
    for (let i = this.items.length - 1; i >= 0; i--) this.release(i);
  }

  destroy(): void {
    this.clear();
    this.group.destroy();
    this.free.length = 0;
  }
}
