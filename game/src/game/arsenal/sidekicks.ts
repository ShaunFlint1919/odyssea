// =====================================================================================
//  SIDEKICKS — the left / right drones. They follow their slot (±18 px beside the ship)
//  with a little lag, bob and tilt, cast a ground shadow (+6, +10) when shadows are on,
//  play their 2-frame idle animation and fire for free (no generator energy) while the
//  trigger is held:
//   pod      one bolt straight ahead            twin    two needles angled ±9 deg outward
//   shard    3-way piercing shards (±14 deg)    rocket  homing rocket on cooldown
//   orbiter  circles the ship (r 26 px), blocks enemy bullets, contact DPS = damage * fireRate
//   charge   glow builds for 1 / fireRate s, then a piercing beam column sweeps with the drone
//            for 450 ms (each enemy is hit once per discharge for `damage`)
// =====================================================================================
import Phaser from 'phaser';
import type { SfxKey, SidekickDef } from '../../types';
import { SHOT_RGB, sidekickKey } from '../../art/keys';
import type { ArsenalBlocker } from './api';
import { ANCHOR_LEFT, ANCHOR_RIGHT, addImage, addSprite } from './env';
import { SLOT_SIDEKICK } from './fx';
import { HIT_BLAST, HIT_SOFT, HitRegistry, MOVE_COLUMN, MOVE_HOMING, makeSpec, type ShotSpec } from './shots';
import { bodyTexture, fxTexture, idleAnimation, shadowTexture, shotTexture } from './textures';
import { DEG, UP, intervalMs } from './scaling';
import type { ArsenalCore } from './weapons/gun';

const SIDE_X = 18;
const SIDE_Y = 5;
const FOLLOW = 15;        // 1/s exponential follow towards the slot (lag)
const MAX_LAG = 16;       // px
const ORBIT_R = 26;
const ORBIT_SPEED = 3.3;  // rad/s
const SHADOW_DX = 6;
const SHADOW_DY = 10;
const BEAM_MS = 450;
const BEAM_STEP = 18;
const SFX_SIDEKICK: SfxKey = 'shot_sidekick';
const SFX_BEAM: SfxKey = 'shot_laser';

class Blocker implements ArsenalBlocker {
  x = 0;
  y = 0;
  radius = 8;
  contactDps = 0;
}

/** One sidekick mount (left = side -1, right = side +1). */
export class SidekickUnit {
  readonly blocker = new Blocker();
  def: SidekickDef | null = null;
  /** Drawn position (used as the muzzle anchor). */
  x = 0;
  y = 0;
  private lx = 0; // lagged slot position (before bob)
  private ly = 0;
  private placed = false;
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private shadow: Phaser.GameObjects.Image | null = null;
  private glowImg: Phaser.GameObjects.Image | null = null;
  private glowSize = 32;
  private spec: ShotSpec | null = null;
  private interval = 1000;
  private cooldown = 0;
  private charge = 0;
  private beamMs = 0;
  private t = 0;
  private orbitA = 0;
  private visible = true;
  private regIndex = 0;
  private readonly regs = [new HitRegistry(), new HitRegistry()];
  private readonly anchor: number;
  private glowColor = 0xffffff;
  private coreColor = 0xffffff;

  constructor(private readonly core: ArsenalCore, readonly side: -1 | 1) {
    this.anchor = side < 0 ? ANCHOR_LEFT : ANCHOR_RIGHT;
    this.orbitA = side < 0 ? Math.PI : 0;
  }

  get isOrbiter(): boolean {
    return this.def !== null && this.def.pattern === 'orbiter';
  }

  /** Equips `def` (null = empty mount). Creates the drone sprites once per loadout change. */
  configure(def: SidekickDef | null): void {
    this.disposeSprites();
    this.def = def;
    this.cooldown = 0;
    this.charge = 0;
    this.beamMs = 0;
    this.placed = false;
    if (!def) return;
    const env = this.core.env;
    const scene = env.scene;
    const rgb = SHOT_RGB[def.color] ?? SHOT_RGB.white;
    this.glowColor = rgb.glow;
    this.coreColor = rgb.core;

    const key = bodyTexture(scene, sidekickKey(def.id), 16, rgb.glow);
    const spr = addSprite(env, key, scene.textures.get(key).has('0') ? 0 : undefined);
    spr.setDepth(env.depths.sidekicks);
    const anim = idleAnimation(scene, key);
    if (anim) spr.play({ key: anim, startFrame: this.side < 0 ? 0 : 1 });
    this.sprite = spr;
    if (env.depths.shadows >= 0) {
      const sh = shadowTexture(scene, key);
      if (sh) {
        const img = addImage(env, sh.key, sh.first);
        img.setDepth(env.depths.shadows);
        this.shadow = img;
      }
    }
    if (def.pattern === 'charge') {
      const glow = fxTexture(scene, 'fx_glow');
      const g = addImage(env, glow.key);
      g.setDepth(env.depths.sidekicks + 0.4);
      g.setBlendMode(Phaser.BlendModes.ADD);
      g.setTint(rgb.glow);
      g.setAlpha(0);
      this.glowImg = g;
      this.glowSize = glow.w;
    }

    this.interval = intervalMs(def.fireRate, 1);
    this.blocker.radius = 8;
    this.blocker.contactDps = def.pattern === 'orbiter' ? Math.max(0, def.damage) * Math.max(0, def.fireRate) : 0;
    this.spec = this.buildSpec(def);
    this.applyVisible();
  }

  private buildSpec(def: SidekickDef): ShotSpec | null {
    if (def.pattern === 'orbiter') return null;
    const scene = this.core.env.scene;
    const s = makeSpec(shotTexture(scene, def.projectile, def.color), this.glowColor, this.coreColor);
    s.damage = def.damage;
    s.speed = 600;
    s.life = 1100;
    s.radius = 3.5;
    switch (def.pattern) {
      case 'twin':
        s.speed = 680;
        s.radius = 3;
        break;
      case 'shard':
        s.speed = 560;
        s.pierce = true;
        s.hit = HIT_SOFT;
        s.scaleX = s.scaleY = 1.2;
        break;
      case 'rocket':
        s.move = MOVE_HOMING;
        s.speed = 110;
        s.accel = 700;
        s.maxSpeed = 400;
        s.turnRate = 4.4;
        s.seekRange = 480;
        s.launchMs = 160;
        s.life = 2800;
        s.radius = 4.5;
        s.splash = 14;
        s.scaleX = s.scaleY = 1.2;
        s.hit = HIT_BLAST;
        s.trailMs = 26;
        s.trailSize = 8;
        s.popOnExpire = true;
        break;
      case 'charge':
        s.move = MOVE_COLUMN;
        s.pierce = true;
        s.life = BEAM_MS;
        s.fadeMs = 200;
        s.radius = 7;
        s.scaleX = 2.2;
        s.scaleY = 0.8;
        s.additive = true;
        s.halo = 26;
        s.haloAlpha = 0.3;
        s.flicker = 0.3;
        s.hit = HIT_SOFT;
        break;
      default:
        break;
    }
    return s;
  }

  /** Moves the drone, animates the charge glow and fires while `active`. */
  update(dtMs: number, active: boolean): void {
    const def = this.def;
    const spr = this.sprite;
    if (!def || !spr) return;
    const dt = dtMs / 1000;
    this.t += dt;
    const host = this.core.host;
    const sx = host.shipX(), sy = host.shipY();
    let tilt = 0;
    if (def.pattern === 'orbiter') {
      this.orbitA += ORBIT_SPEED * dt;
      if (this.orbitA > Math.PI * 2) this.orbitA -= Math.PI * 2;
      this.lx = sx + Math.cos(this.orbitA) * ORBIT_R;
      this.ly = sy + Math.sin(this.orbitA) * ORBIT_R * 0.92;
      this.placed = true;
    } else {
      const tx = sx + this.side * SIDE_X, ty = sy + SIDE_Y;
      if (!this.placed) {
        this.lx = tx;
        this.ly = ty;
        this.placed = true;
      }
      const k = 1 - Math.exp(-FOLLOW * dt);
      this.lx += (tx - this.lx) * k;
      this.ly += (ty - this.ly) * k;
      const dx = this.lx - tx, dy = this.ly - ty;
      const d2 = dx * dx + dy * dy;
      if (d2 > MAX_LAG * MAX_LAG) {
        const f = MAX_LAG / Math.sqrt(d2);
        this.lx = tx + dx * f;
        this.ly = ty + dy * f;
      }
      tilt = Math.max(-0.3, Math.min(0.3, (tx - this.lx) * 0.035));
    }
    const bob = Math.sin(this.t * 2.4 + (this.side > 0 ? 1.4 : 0)) * 1.2;
    this.x = this.lx;
    this.y = this.ly + bob;
    spr.x = this.x;
    spr.y = this.y;
    spr.rotation = tilt;
    if (this.shadow) {
      this.shadow.x = this.x + SHADOW_DX;
      this.shadow.y = this.y + SHADOW_DY;
      this.shadow.rotation = tilt;
    }
    this.blocker.x = this.x;
    this.blocker.y = this.y;

    if (def.pattern === 'charge') {
      this.updateCharge(dtMs, active);
      return;
    }
    if (!this.spec) return;
    if (!active) {
      this.cooldown = this.cooldown > dtMs ? this.cooldown - dtMs : 0;
      return;
    }
    this.cooldown -= dtMs;
    let guard = 0;
    while (this.cooldown <= 0 && guard < 3) {
      this.fire(def);
      this.cooldown += this.interval;
      guard++;
    }
    if (this.cooldown < 0) this.cooldown = 0;
  }

  private fire(def: SidekickDef): void {
    const spec = this.spec as ShotSpec;
    const shots = this.core.shots;
    const x = this.x, y = this.y - 7;
    const slot = SLOT_SIDEKICK + (this.side < 0 ? 0 : 8);
    switch (def.pattern) {
      case 'twin':
        shots.fire(spec, x - 3, y + 1, UP - 9 * DEG);
        shots.fire(spec, x + 3, y + 1, UP + 9 * DEG);
        this.muzzle(slot, -3, -6, UP - 9 * DEG, 0.55);
        this.muzzle(slot + 1, 3, -6, UP + 9 * DEG, 0.55);
        break;
      case 'shard':
        shots.fire(spec, x, y, UP);
        shots.fire(spec, x - 2, y + 1, UP - 14 * DEG);
        shots.fire(spec, x + 2, y + 1, UP + 14 * DEG);
        this.muzzle(slot, 0, -7, UP, 0.8);
        break;
      case 'rocket':
        shots.fire(spec, x, y + 3, UP + this.side * 25 * DEG);
        this.muzzle(slot, 0, -4, UP + this.side * 25 * DEG, 0.7);
        break;
      default:
        shots.fire(spec, x, y, UP);
        this.muzzle(slot, 0, -7, UP, 0.6);
    }
    this.core.host.sfx(SFX_SIDEKICK);
  }

  private muzzle(slot: number, ox: number, oy: number, angle: number, scale: number): void {
    this.core.muzzles.muzzle(slot, this.anchor, ox, oy, angle, this.coreColor, scale);
  }

  private updateCharge(dtMs: number, active: boolean): void {
    const g = this.glowImg;
    const chargeMs = this.interval;
    if (this.beamMs > 0) {
      this.beamMs -= dtMs;
      if (this.beamMs <= 0) {
        this.beamMs = 0;
        this.charge = 0;
      }
    } else if (active) {
      this.charge += dtMs / chargeMs;
      if (this.charge >= 1) {
        this.charge = 1;
        this.releaseBeam();
      }
    }
    if (!g) return;
    const c = this.charge;
    let size: number, alpha: number;
    if (this.beamMs > 0) {
      const t = this.beamMs / BEAM_MS;
      size = 18 + 22 * t;
      alpha = 0.5 + 0.5 * t;
    } else {
      const pulse = 1 + 0.18 * Math.sin(this.t * (10 + 26 * c)) * c;
      size = (6 + 26 * c) * pulse;
      alpha = c <= 0 ? 0 : 0.3 + 0.65 * c;
    }
    g.x = this.x;
    g.y = this.y - 7;
    g.setScale(size / this.glowSize);
    g.alpha = this.visible ? alpha : 0;
  }

  private releaseBeam(): void {
    const spec = this.spec as ShotSpec;
    const shots = this.core.shots;
    const top = this.core.host.bounds.y;
    this.regIndex ^= 1;
    const reg = this.regs[this.regIndex];
    reg.reset();
    const y0 = this.y - 14;
    for (let yy = y0; yy > top - BEAM_STEP; yy -= BEAM_STEP) {
      const s = shots.fire(spec, this.x, yy, UP);
      s.anchor = this.anchor;
      s.ox = 0;
      s.oy = yy - this.y;
      s.reg = reg;
    }
    this.beamMs = BEAM_MS;
    this.core.fx.flash(this.x, this.y - 8, this.glowColor, 40, 220, 1);
    this.core.fx.flash(this.x, this.y - 8, 0xffffff, 18, 140, 1);
    this.muzzle(SLOT_SIDEKICK + (this.side < 0 ? 2 : 10), 0, -9, UP, 1.6);
    this.core.host.sfx(SFX_BEAM);
  }

  /** Shows / hides the drone (and its shadow / glow). */
  setVisible(v: boolean): void {
    this.visible = v;
    this.applyVisible();
  }

  private applyVisible(): void {
    if (this.sprite) this.sprite.setVisible(this.visible);
    if (this.shadow) this.shadow.setVisible(this.visible);
    if (this.glowImg) this.glowImg.setVisible(this.visible);
  }

  /** True when the orbiter blocker should be reported to the World. */
  get blocking(): boolean {
    return this.visible && this.isOrbiter && this.sprite !== null;
  }

  /** Cancels the charge / beam state (shots cleared). */
  resetCharge(): void {
    this.charge = 0;
    this.beamMs = 0;
  }

  private disposeSprites(): void {
    if (this.sprite) this.sprite.destroy();
    if (this.shadow) this.shadow.destroy();
    if (this.glowImg) this.glowImg.destroy();
    this.sprite = null;
    this.shadow = null;
    this.glowImg = null;
    this.spec = null;
  }

  destroy(): void {
    this.disposeSprites();
    this.def = null;
  }
}
