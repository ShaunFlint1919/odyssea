// =====================================================================================
//  PICKUPS — credit gems (pk_credit_s/m/l, animated) and drops (armor repair, shield
//  refill, front power, intel). Pooled. Gems burst out of destroyed enemies, settle into
//  a slow fall, are magnetised toward the ship within MAGNET_R px and collected on contact.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, DEPTH, H, PLAY_W } from '../config';
import { ANIM } from '../art/keys';
import { idleAnimKey } from '../art/fx';
import type { PickupKind } from '../types';
import { FrameAnim, texOr } from './tex';
import type { World } from './world';

const MAX = 360;
/** Magnet radius around the ship (px). */
export const MAGNET_R = 60;
/** Armor restored by a repair pickup, as a fraction of the hull armor (min ARMOR_MIN). */
const ARMOR_FRACTION = 0.3;
const ARMOR_MIN = 8;

const K_CREDIT = 0;
const K_ARMOR = 1;
const K_SHIELD = 2;
const K_POWER = 3;
const K_INTEL = 4;

/** Read-only view of a live pickup (autopilot). kind 0 = credit gem, else a drop. */
export interface PickupView {
  readonly x: number;
  readonly y: number;
  readonly kind: number;
  readonly magnet: boolean;
}

class Pickup implements PickupView {
  active = false;
  kind = K_CREDIT;
  value = 0;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  age = 0;
  phase = 0;
  magnet = false;
  anim: FrameAnim | null = null;
  lastIdx = -1;
  constructor(readonly img: Phaser.GameObjects.Image) {}
}

export class Pickups {
  private readonly items: Pickup[] = [];
  private readonly freeList: Pickup[] = [];
  private readonly live: Pickup[] = [];
  private readonly gemS: FrameAnim;
  private readonly gemM: FrameAnim;
  private readonly gemL: FrameAnim;
  /** Idle blink animations of the drop pickups (2-frame sheets), by kind. */
  private readonly dropAnims: Record<number, FrameAnim>;
  private magnetAllOn = false;

  constructor(private readonly w: World) {
    const scene = w.scene;
    this.gemS = new FrameAnim(scene, ANIM.credit_s, 'pk_credit_s', 'gem', 10, true);
    this.gemM = new FrameAnim(scene, ANIM.credit_m, 'pk_credit_m', 'gem', 10, true);
    this.gemL = new FrameAnim(scene, ANIM.credit_l, 'pk_credit_l', 'gem', 10, true);
    const idle = (key: string) => new FrameAnim(scene, idleAnimKey(key), key, 'pickup', 5, true);
    this.dropAnims = {
      [K_ARMOR]: idle('pk_armor'), [K_SHIELD]: idle('pk_shield'), [K_POWER]: idle('pk_power'), [K_INTEL]: idle('pk_intel'),
    };
    for (let i = 0; i < MAX; i++) {
      const p = new Pickup(scene.add.image(-50, -50, texOr(scene, 'pk_credit_s', 'gem')).setDepth(DEPTH.pickups).setVisible(false));
      this.items.push(p);
      this.freeList.push(p);
    }
  }

  get count(): number {
    return this.live.length;
  }

  /** Live pickups (read-only view; order changes when pickups are collected). */
  get liveView(): readonly PickupView[] {
    return this.live;
  }

  private take(): Pickup | null {
    const p = this.freeList.pop();
    if (!p) return null;
    p.active = true;
    p.age = 0;
    p.magnet = false;
    p.lastIdx = -1;
    p.phase = this.w.fxRng() * 1000;
    this.live.push(p);
    return p;
  }

  /** Spawn one credit gem of `value` credits (tier chosen from the value). */
  spawnGem(x: number, y: number, value: number, vx: number, vy: number): void {
    const p = this.take();
    if (!p) {
      this.w.stats.credits += value; // pool exhausted: credit directly, never lose money
      return;
    }
    p.kind = K_CREDIT;
    p.value = value;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.anim = value >= 40 ? this.gemL : value >= 12 ? this.gemM : this.gemS;
    p.anim.apply(p.img, 0);
    p.img.setPosition(x, y).setScale(1).setAlpha(1).setAngle(0).setVisible(true);
  }

  /**
   * Split `total` credits into a handful of gems bursting from (x, y).
   * Gem count grows with sqrt(total) (1..14); the exact total is always preserved.
   */
  spawnCredits(x: number, y: number, total: number, burst = 60): void {
    total = Math.round(total);
    if (total <= 0) return;
    const n = Math.max(1, Math.min(14, Math.round(Math.sqrt(total) / 1.6)));
    const base = Math.floor(total / n);
    let rest = total - base * n;
    const r = this.w.fxRng;
    for (let k = 0; k < n; k++) {
      const v = base + (rest > 0 ? 1 : 0);
      if (rest > 0) rest--;
      const a = r() * Math.PI * 2, s = n === 1 ? burst * 0.3 : burst * (0.4 + r() * 0.7);
      this.spawnGem(x + (r() - 0.5) * 6, y + (r() - 0.5) * 6, v, Math.cos(a) * s, Math.sin(a) * s - 20);
    }
  }

  /** Spawn a drop (armor / shield / power / intel) or credits for credit kinds. */
  spawnDrop(x: number, y: number, kind: PickupKind): void {
    if (kind === 'credit_s' || kind === 'credit_m' || kind === 'credit_l') {
      const v = kind === 'credit_l' ? 50 : kind === 'credit_m' ? 15 : 5;
      this.spawnGem(x, y, Math.round(v * this.w.diff.credits), 0, -40);
      return;
    }
    const p = this.take();
    if (!p) return;
    p.kind = kind === 'armor' ? K_ARMOR : kind === 'shield' ? K_SHIELD : kind === 'power' ? K_POWER : K_INTEL;
    p.value = 0;
    p.x = Phaser.Math.Clamp(x, 10, PLAY_W - 10);
    p.y = y;
    p.vx = (this.w.fxRng() - 0.5) * 30;
    p.vy = -55;
    p.anim = this.dropAnims[p.kind];
    p.anim.apply(p.img, 0);
    p.img.setPosition(p.x, y).setScale(1).setAlpha(1).setAngle(0).setVisible(true);
    this.w.fx.glow(x, y, 0xffffff, 1.2, 260);
  }

  /** Every pickup flies to the ship (stage clear). */
  magnetAll(): void {
    this.magnetAllOn = true;
  }

  update(dt: number): void {
    const ship = this.w.ship;
    const sx = ship.x, sy = ship.y;
    const canTake = ship.alive;
    const take2 = (ship.hitRadius + 11) * (ship.hitRadius + 11);
    const mag2 = MAGNET_R * MAGNET_R;
    const live = this.live;
    for (let k = live.length - 1; k >= 0; k--) {
      const p = live[k];
      p.age += dt;
      const dx = sx - p.x, dy = sy - p.y;
      const d2 = dx * dx + dy * dy;
      if (canTake && (p.magnet || this.magnetAllOn || d2 < mag2)) {
        p.magnet = true;
        const d = Math.sqrt(d2) || 1;
        const s = Math.min(520, 170 + p.age * 260);
        p.vx += ((dx / d) * s - p.vx) * Math.min(1, dt * 10);
        p.vy += ((dy / d) * s - p.vy) * Math.min(1, dt * 10);
      } else {
        const damp = Math.max(0, 1 - 2.6 * dt);
        p.vx *= damp;
        const fall = p.kind === K_CREDIT ? 38 : 30;
        p.vy += (fall - p.vy) * Math.min(1, dt * 2.2);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < 4) { p.x = 4; p.vx = Math.abs(p.vx); }
      else if (p.x > PLAY_W - 4) { p.x = PLAY_W - 4; p.vx = -Math.abs(p.vx); }
      if (canTake && d2 < take2) {
        this.collect(p);
        this.release(p, k);
        continue;
      }
      if (p.y > H + 16) {
        if (p.kind === K_CREDIT) this.w.metrics.creditsMissed += p.value;
        this.release(p, k);
        continue;
      }
      const img = p.img;
      img.setPosition(p.x, p.y);
      const anim = p.anim!;
      const idx = anim.index(p.age * 1000 + (p.kind === K_CREDIT ? p.phase : 0));
      if (idx !== p.lastIdx) {
        anim.apply(img, idx);
        p.lastIdx = idx;
      }
      if (p.kind !== K_CREDIT) {
        // drops bob gently and blink before leaving the bottom of the screen
        img.setScale(1 + 0.08 * Math.sin(p.age * 7));
        img.setAlpha(p.y > H - 60 && Math.floor(p.age * 10) % 2 === 0 ? 0.6 : 1);
      }
    }
  }

  private release(p: Pickup, k: number): void {
    p.active = false;
    p.img.setVisible(false);
    const live = this.live;
    live[k] = live[live.length - 1];
    live.pop();
    this.freeList.push(p);
  }

  private collect(p: Pickup): void {
    const w = this.w;
    const fx = w.fx;
    w.metrics.pickups++;
    switch (p.kind) {
      case K_CREDIT:
        w.stats.credits += p.value;
        w.services.sfx('pickup_credit');
        fx.sparks(p.x, p.y, 2, 50, COLORS.gold);
        break;
      case K_ARMOR: {
        const e = w.ship.energy;
        const got = e.repair(Math.max(ARMOR_MIN, Math.round(e.armorMax * ARMOR_FRACTION)));
        w.services.sfx('pickup_repair');
        w.services.hudFlash('pickup');
        fx.text(p.x, p.y - 10, got > 0 ? `+${Math.round(got)} ARMOR` : 'ARMOR FULL', COLORS.armor);
        fx.glow(p.x, p.y, COLORS.armor, 1.4, 260);
        break;
      }
      case K_SHIELD:
        w.ship.energy.refillShield();
        w.services.sfx('pickup_repair');
        w.services.hudFlash('shield');
        fx.text(p.x, p.y - 10, 'SHIELD FULL', COLORS.shield);
        fx.glow(p.x, p.y, COLORS.shield, 1.4, 260);
        w.ship.shieldFlash();
        break;
      case K_POWER: {
        const before = w.arsenal.frontPower;
        const now = w.arsenal.boostFrontPower(1);
        w.services.sfx('pickup_power');
        w.services.hudFlash('pickup');
        fx.text(p.x, p.y - 10, now > before ? `POWER ${now}` : 'MAX POWER', COLORS.accentLight);
        fx.glow(p.x, p.y, COLORS.accent, 1.6, 300);
        break;
      }
      case K_INTEL: {
        const id = w.level.intel;
        if (id && !w.stats.intelFound.includes(id)) w.stats.intelFound.push(id);
        w.services.sfx('pickup_intel');
        w.services.hudFlash('pickup');
        w.services.banner('INTEL RECOVERED', 'NEW TRANSMISSION', 1600);
        fx.glow(p.x, p.y, COLORS.teal, 2, 400);
        break;
      }
    }
    if (p.kind !== K_CREDIT) w.services.haptic('light');
  }

  clear(): void {
    for (let k = this.live.length - 1; k >= 0; k--) this.release(this.live[k], k);
    this.magnetAllOn = false;
  }
}
