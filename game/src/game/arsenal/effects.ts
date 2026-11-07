// =====================================================================================
//  ARSENAL FX — pooled short-lived visuals: impact sparks, flashes, splash rings, muzzle
//  flashes that follow their barrel, embers, smoke puffs and crackle.
//
//  Every effect is a frame sheet from ./art.ts played once over its life (growth and fade
//  are baked into the frames): update() only ages items, steps frames when the index
//  changes and moves the few that have a velocity or follow an anchor. No Phaser anims,
//  no per-frame scale / alpha writes, nothing allocates after warm-up. One pool = one
//  fixed depth + blend mode (impacts: additive above the shots; smoke: normal below them;
//  muzzles: additive above the impacts; all of them below the enemy bullets in game).
// =====================================================================================
import Phaser from 'phaser';
import { ImageGroup, type AnchorSource, type ArsenalEnv } from './env';
import { emberTex } from './art';
import type { TexInfo } from './textures';
import { HALF_PI } from './scaling';

/** One live effect (pooled). */
export class FxItem {
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
  drag = 0;
  anchor = -1;
  ox = 0;
  oy = 0;
  slot = -1;
}

const MAX_SLOTS = 64;
const WHITE = 0xffffff;

/** Muzzle slot ranges (one flash per gun barrel, re-triggered on every volley). */
export const SLOT_FRONT = 0;     // 0..23
export const SLOT_REAR = 24;     // 24..47
export const SLOT_SIDEKICK = 48; // 48..63

export class FxPool {
  private readonly items: FxItem[] = [];
  private readonly free: FxItem[] = [];
  private readonly slots: (FxItem | null)[] = [];
  private readonly group: ImageGroup;

  constructor(env: ArsenalEnv, depth: number, blend: Phaser.BlendModes, private readonly anchors: AnchorSource, initial: number) {
    const init = emberTex(env.scene);
    this.group = new ImageGroup(env, depth, blend, initial, init.key);
    for (let i = 0; i < MAX_SLOTS; i++) this.slots.push(null);
    for (let i = 0; i < initial; i++) this.free.push(new FxItem());
  }

  /**
   * Plays `tex` once over `ms` at (x, y) (tint / alpha / rotation fixed for its life).
   * Returns the pooled item so callers can give it a velocity (vx, vy px/s, drag 1/s).
   */
  play(tex: TexInfo, x: number, y: number, ms: number, tint = WHITE, alpha = 1, rotation = 0): FxItem {
    const it = this.free.pop() ?? new FxItem();
    const img = this.group.take(tex.key, tex.first);
    if (tint !== WHITE) img.setTint(tint);
    if (alpha !== 1) img.setAlpha(alpha);
    if (rotation !== 0) img.setRotation(rotation);
    img.x = x;
    img.y = y;
    it.img = img;
    it.age = 0;
    it.life = ms > 1 ? ms : 1;
    it.frames = tex.frames;
    it.frameMs = it.life / tex.frames;
    it.frame = 0;
    it.x = x;
    it.y = y;
    it.vx = 0;
    it.vy = 0;
    it.drag = 0;
    it.anchor = -1;
    it.ox = 0;
    it.oy = 0;
    it.slot = -1;
    this.items.push(it);
    return it;
  }

  /** A moving particle (ember, exhaust dot): plays `tex` over `ms` while drifting with drag. */
  particle(tex: TexInfo, x: number, y: number, vx: number, vy: number, drag: number, ms: number, tint: number, alpha = 1): void {
    const it = this.play(tex, x, y, ms, tint, alpha, 0);
    it.vx = vx;
    it.vy = vy;
    it.drag = drag;
  }

  /** `n` embers bursting from (x, y) at ~`speed` px/s. */
  burst(tex: TexInfo, x: number, y: number, n: number, speed: number, tint: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.45 + Math.random() * 0.75);
      this.particle(tex, x, y, Math.cos(a) * s, Math.sin(a) * s, 4.5, 170 + Math.random() * 170, tint);
    }
  }

  /**
   * Muzzle flash on gun `slot`, following `anchor` at offset (ox, oy), pointing along `angle`.
   * Re-triggers the slot's flash if it is still visible (one flash per barrel).
   */
  muzzle(slot: number, anchor: number, ox: number, oy: number, angle: number, tex: TexInfo, ms: number): void {
    const x = this.anchors.anchorX(anchor) + ox;
    const y = this.anchors.anchorY(anchor) + oy;
    let it = slot >= 0 && slot < MAX_SLOTS ? this.slots[slot] : null;
    if (it && it.img) {
      const img = it.img;
      if (img.texture.key !== tex.key) img.setTexture(tex.key, tex.first);
      else if (it.frame !== 0) img.setFrame(tex.first ?? 0);
      it.age = 0;
      it.frame = 0;
      it.life = ms;
      it.frames = tex.frames;
      it.frameMs = ms / tex.frames;
    } else {
      it = this.play(tex, x, y, ms);
      if (slot >= 0 && slot < MAX_SLOTS) {
        it.slot = slot;
        this.slots[slot] = it;
      }
    }
    it.anchor = anchor;
    it.ox = ox;
    it.oy = oy;
    const img = it.img as Phaser.GameObjects.Image;
    img.rotation = angle + HALF_PI;
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
      if (it.anchor >= 0) {
        img.x = this.anchors.anchorX(it.anchor) + it.ox;
        img.y = this.anchors.anchorY(it.anchor) + it.oy;
      } else if (it.vx !== 0 || it.vy !== 0) {
        if (it.drag > 0) {
          const k = it.drag * dt < 1 ? 1 - it.drag * dt : 0;
          it.vx *= k;
          it.vy *= k;
        }
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        img.x = it.x;
        img.y = it.y;
      }
      if (it.frames > 1) {
        const f = (it.age / it.frameMs) | 0;
        if (f !== it.frame && f < it.frames) {
          it.frame = f;
          img.setFrame(f);
        }
      }
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
