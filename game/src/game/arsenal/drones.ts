// =====================================================================================
//  SIDEKICKS — the left / right drones. They follow their slot (±18 px beside the ship)
//  with a little lag, bob and tilt, cast a ground shadow (+6, +10) when shadows are on,
//  play their 2-frame idle animation and fire for free (no generator energy) while the
//  trigger is held. Each has its own silhouette of fire:
//   pod      2-round bursts of round plasma pellets straight ahead (damage split over the burst)
//   twin     two tracer needles angled ±9 deg outward
//   shard    3-way piercing violet crystal shards (±14 deg)
//   rocket   homing rocket with a smoke trail and a small splash blast, on cooldown
//   orbiter  circles the ship (r 26 px) inside a turning ward ring; it is reported as an
//            ArsenalBlocker (the World removes the enemy bullets it touches and flashes
//            them), contact DPS = damage * fireRate
//   charge   energy gathers into a growing glow for 1 / fireRate s, then a crackling beam
//            column sweeps with the drone for 450 ms; hidden collision segments every 18 px
//            share one hit registry, so each enemy takes `damage` once per discharge
//  Big glows (charge, ward) are drawn just above the player shots, i.e. BELOW the enemy
//  bullets (readability rule); only the drone sprites sit at the ship depth.
// =====================================================================================
import Phaser from 'phaser';
import type { ShotColor, SfxKey, SidekickDef } from '../../types';
import { SHOT_RGB, sidekickKey } from '../../art/keys';
import type { ArsenalBlocker } from './api';
import { ANCHOR_LEFT, ANCHOR_RIGHT, addImage, addSprite } from './env';
import { SLOT_SIDEKICK } from './effects';
import { HIT_BLAST, HitRegistry, MOVE_COLUMN, MOVE_HOMING, TRAIL_SMOKE, makeSpec, type ShotSpec } from './projectiles';
import {
  COLUMN_WIDTHS, WARD_FRAMES, columnTex, emberTex, flashTex, glowTex, missileTex, needleTex, pelletTex, shardTex, wardTex,
  zapTex,
} from './art';
import { impactFx, muzzleSet, softImpactFx } from './looks';
import { bodyTexture, idleAnimation, shadowTexture, type TexInfo } from './textures';
import { DEG, UP, intervalMs } from './scaling';
import type { ArsenalCore } from './weapons/base';

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
const NOSE_Y = -7;
const POD_BURST = 2;
const POD_GAP_MS = 70;
const WARD_FRAME_MS = 90;
/** Charge glow diameters (px), switched as the charge builds. */
const CHARGE_GLOWS = [7, 11, 15, 19, 23, 27, 31];
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
  private beamImg: Phaser.GameObjects.Image | null = null;
  private wardImg: Phaser.GameObjects.Image | null = null;
  private haloImg: Phaser.GameObjects.Image | null = null;
  private glowTexs: TexInfo[] = [];
  private glowIdx = -1;
  private beamH = 8;
  private zap: TexInfo | null = null;
  private ember: TexInfo | null = null;
  private releaseFlash: TexInfo | null = null;
  private releaseCore: TexInfo | null = null;
  private muzzleTex: TexInfo[] = [];
  private spec: ShotSpec | null = null;
  private interval = 1000;
  private cooldown = 0;
  private burstLeft = 0;
  private burstT = 0;
  private charge = 0;
  private beamMs = 0;
  private fxT = 0;
  private t = 0;
  private orbitA = 0;
  private wardT = 0;
  private wardFrame = 0;
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
    this.burstLeft = 0;
    this.charge = 0;
    this.beamMs = 0;
    this.placed = false;
    if (!def) return;
    const env = this.core.env;
    const scene = env.scene;
    const color: ShotColor = SHOT_RGB[def.color] ? def.color : 'white';
    const rgb = SHOT_RGB[color];
    this.glowColor = rgb.glow;
    this.coreColor = rgb.core;
    this.muzzleTex = muzzleSet(scene, color);
    this.ember = emberTex(scene);

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
      this.glowTexs = CHARGE_GLOWS.map((d) => glowTex(scene, d));
      this.glowIdx = -1;
      const g = addImage(env, this.glowTexs[0].key);
      g.setDepth(env.depths.shots + 0.3);
      g.setBlendMode(Phaser.BlendModes.ADD);
      g.setTint(rgb.glow);
      g.setAlpha(0);
      this.glowImg = g;
      const col = columnTex(scene, color);
      this.beamH = col.h;
      const bm = addImage(env, col.key, col.first);
      bm.setDepth(env.depths.shots + 0.15);
      bm.setBlendMode(Phaser.BlendModes.ADD);
      bm.setOrigin(0.5, 1);
      bm.setVisible(false);
      this.beamImg = bm;
      this.zap = zapTex(scene, color);
      this.releaseFlash = flashTex(scene, 4);
      this.releaseCore = flashTex(scene, 1);
    } else if (def.pattern === 'orbiter') {
      const ward = wardTex(scene, color);
      const w = addImage(env, ward.key, ward.first);
      w.setDepth(env.depths.shots + 0.4);
      w.setAlpha(0.9);
      this.wardImg = w;
      const halo = glowTex(scene, 19);
      const h = addImage(env, halo.key);
      h.setDepth(env.depths.shots + 0.35);
      h.setBlendMode(Phaser.BlendModes.ADD);
      h.setTint(rgb.glow);
      h.setAlpha(0.28);
      this.haloImg = h;
    }

    this.interval = intervalMs(def.fireRate, 1);
    this.blocker.radius = 8;
    this.blocker.contactDps = def.pattern === 'orbiter' ? Math.max(0, def.damage) * Math.max(0, def.fireRate) : 0;
    this.spec = this.buildSpec(def, color);
    this.applyVisible();
  }

  private buildSpec(def: SidekickDef, color: ShotColor): ShotSpec | null {
    if (def.pattern === 'orbiter') return null;
    const scene = this.core.env.scene;
    const glow = this.glowColor, core = this.coreColor;
    let s: ShotSpec;
    switch (def.pattern) {
      case 'twin':
        s = makeSpec(needleTex(scene, color, 1), glow, core);
        s.speed = 700;
        s.radius = 3;
        s.rotate = true;
        s.fx = impactFx(scene, color, 0);
        break;
      case 'shard':
        s = makeSpec(shardTex(scene, glow, 1), glow, core);
        s.speed = 580;
        s.pierce = true;
        s.radius = 3.5;
        s.halo = glowTex(scene, 11);
        s.haloAlpha = 0.25;
        s.fx = softImpactFx(scene, color, 1);
        break;
      case 'rocket':
        s = makeSpec(missileTex(scene, color, 2), glow, core);
        s.frameMs = 60;
        s.move = MOVE_HOMING;
        s.speed = 110;
        s.accel = 700;
        s.maxSpeed = 400;
        s.turnRate = 4.4;
        s.seekRange = 480;
        s.launchMs = 160;
        s.life = 2800;
        s.radius = 4.5;
        s.halo = glowTex(scene, 13);
        s.haloAlpha = 0.3;
        s.splash = 14;
        s.hit = HIT_BLAST;
        s.fx = impactFx(scene, color, 3, 14);
        s.trail = TRAIL_SMOKE;
        s.trailMs = 46;
        s.popOnExpire = true;
        break;
      case 'charge':
        s = makeSpec(glowTex(scene, 7), glow, core);
        s.move = MOVE_COLUMN;
        s.hidden = true; // the drone draws the beam; these are its collision segments
        s.pierce = true;
        s.life = BEAM_MS;
        s.radius = 7;
        s.fx = impactFx(scene, color, 2);
        break;
      default:
        s = makeSpec(pelletTex(scene, color, 0), glow, core);
        s.speed = 600;
        s.radius = 3.5;
        s.rotate = false;
        s.halo = glowTex(scene, 11);
        s.haloAlpha = 0.25;
        s.fx = impactFx(scene, color, 0);
    }
    s.damage = def.pattern === 'pod' ? def.damage / POD_BURST : def.damage;
    if (def.pattern !== 'rocket' && def.pattern !== 'charge') s.life = 1100;
    return s;
  }

  /** Moves the drone, animates its glows / beam and fires while `active`. */
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
    if (def.pattern === 'orbiter') {
      this.updateWard(dtMs);
      return;
    }
    if (!this.spec) return;
    if (this.burstLeft > 0) {
      this.burstT -= dtMs;
      if (this.burstT <= 0) {
        this.burstLeft--;
        this.burstT += POD_GAP_MS;
        this.fire(def);
      }
    }
    if (!active) {
      this.cooldown = this.cooldown > dtMs ? this.cooldown - dtMs : 0;
      return;
    }
    this.cooldown -= dtMs;
    let guard = 0;
    while (this.cooldown <= 0 && guard < 3) {
      this.fire(def);
      if (def.pattern === 'pod') {
        this.burstLeft = POD_BURST - 1;
        this.burstT = POD_GAP_MS;
      }
      this.cooldown += this.interval;
      guard++;
    }
    if (this.cooldown < 0) this.cooldown = 0;
  }

  private fire(def: SidekickDef): void {
    const spec = this.spec as ShotSpec;
    const shots = this.core.shots;
    const x = this.x, y = this.y + NOSE_Y;
    const slot = SLOT_SIDEKICK + (this.side < 0 ? 0 : 8);
    switch (def.pattern) {
      case 'twin':
        shots.fire(spec, x - 3, y + 1, UP - 9 * DEG);
        shots.fire(spec, x + 3, y + 1, UP + 9 * DEG);
        this.muzzle(slot, -3, NOSE_Y + 1, UP - 9 * DEG, 0);
        this.muzzle(slot + 1, 3, NOSE_Y + 1, UP + 9 * DEG, 0);
        break;
      case 'shard':
        shots.fire(spec, x, y, UP);
        shots.fire(spec, x - 2, y + 1, UP - 14 * DEG);
        shots.fire(spec, x + 2, y + 1, UP + 14 * DEG);
        this.muzzle(slot, 0, NOSE_Y, UP, 1);
        break;
      case 'rocket':
        shots.fire(spec, x, y + 3, UP + this.side * 25 * DEG);
        this.muzzle(slot, 0, NOSE_Y + 3, UP + this.side * 25 * DEG, 1);
        break;
      default:
        shots.fire(spec, x, y, UP);
        this.muzzle(slot, 0, NOSE_Y, UP, 0);
    }
    this.core.host.sfx(SFX_SIDEKICK);
  }

  private muzzle(slot: number, ox: number, oy: number, angle: number, tier: number): void {
    const tex = this.muzzleTex[tier];
    if (tex) this.core.muzzles.muzzle(slot, this.anchor, ox, oy, angle, tex, 70);
  }

  private updateWard(dtMs: number): void {
    const w = this.wardImg, h = this.haloImg;
    if (!w || !h) return;
    w.x = h.x = this.x;
    w.y = h.y = this.y;
    this.wardT += dtMs;
    if (this.wardT >= WARD_FRAME_MS) {
      this.wardT -= WARD_FRAME_MS;
      this.wardFrame = (this.wardFrame + 1) % WARD_FRAMES;
      w.setFrame(this.wardFrame);
    }
  }

  private updateCharge(dtMs: number, active: boolean): void {
    if (this.beamMs > 0) {
      this.beamMs -= dtMs;
      if (this.beamMs <= 0) {
        this.beamMs = 0;
        this.charge = 0;
      }
    } else if (active) {
      this.charge += dtMs / this.interval;
      if (this.charge >= 1) {
        this.charge = 1;
        this.releaseBeam();
      }
    }
    const g = this.glowImg, bm = this.beamImg;
    if (!g || !bm) return;
    const nx = this.x, ny = this.y + NOSE_Y;
    g.x = nx;
    g.y = ny;
    this.fxT -= dtMs;
    if (this.beamMs > 0) {
      const f = this.beamMs / BEAM_MS; // 1 -> 0
      const len = Math.max(8, ny - this.core.host.bounds.y);
      bm.setVisible(this.visible);
      bm.x = nx;
      bm.y = ny;
      bm.scaleY = len / this.beamH;
      bm.setFrame(Math.min(COLUMN_WIDTHS.length - 1, ((1 - f) * COLUMN_WIDTHS.length) | 0));
      bm.alpha = 0.6 + 0.4 * f;
      this.setGlow(f > 0.5 ? 6 : 4, this.visible ? 0.5 + 0.5 * f : 0);
      if (this.fxT <= 0 && this.zap && this.visible) {
        this.fxT = 26;
        const zy = ny - Math.random() * len;
        const zx = nx + (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 5 * f);
        this.core.fx.play(this.zap, zx, zy, 70, 0xffffff, 1, ((Math.random() * 4) | 0) * Math.PI * 0.5);
      }
      return;
    }
    bm.setVisible(false);
    const c = this.charge;
    const pulse = 0.85 + 0.15 * Math.sin(this.t * (10 + 26 * c));
    this.setGlow(Math.min(CHARGE_GLOWS.length - 1, (c * CHARGE_GLOWS.length) | 0), this.visible && c > 0 ? (0.3 + 0.6 * c) * pulse : 0);
    if (c > 0.25 && this.fxT <= 0 && this.ember && this.visible) {
      // energy gathering: embers spiral into the nose
      this.fxT = 70 - 40 * c;
      const a = Math.random() * Math.PI * 2;
      const r = 13 + Math.random() * 5;
      const life = 160;
      this.core.fx.particle(this.ember, nx + Math.cos(a) * r, ny + Math.sin(a) * r, (-Math.cos(a) * r * 1000) / life,
        (-Math.sin(a) * r * 1000) / life, 0, life, Math.random() < 0.5 ? this.glowColor : this.coreColor);
    }
  }

  private setGlow(idx: number, alpha: number): void {
    const g = this.glowImg;
    if (!g) return;
    if (idx !== this.glowIdx) {
      this.glowIdx = idx;
      g.setTexture(this.glowTexs[idx].key);
    }
    g.alpha = alpha;
  }

  private releaseBeam(): void {
    const spec = this.spec as ShotSpec;
    const shots = this.core.shots;
    const top = this.core.host.bounds.y;
    this.regIndex ^= 1;
    const reg = this.regs[this.regIndex];
    reg.reset();
    const y0 = this.y + NOSE_Y - 8;
    for (let yy = y0; yy > top - BEAM_STEP; yy -= BEAM_STEP) {
      const s = shots.fire(spec, this.x, yy, UP);
      s.anchor = this.anchor;
      s.ox = 0;
      s.oy = yy - this.y;
      s.reg = reg;
    }
    this.beamMs = BEAM_MS;
    this.fxT = 0;
    const nx = this.x, ny = this.y + NOSE_Y;
    if (this.visible) {
      if (this.releaseFlash) this.core.fx.play(this.releaseFlash, nx, ny, 220, this.glowColor, 0.9);
      if (this.releaseCore) this.core.fx.play(this.releaseCore, nx, ny, 150);
    }
    this.muzzle(SLOT_SIDEKICK + (this.side < 0 ? 2 : 10), 0, NOSE_Y - 2, UP, 3);
    this.core.host.sfx(SFX_BEAM);
  }

  /** Shows / hides the drone (and its shadow / glow / beam / ward). */
  setVisible(v: boolean): void {
    this.visible = v;
    this.applyVisible();
  }

  private applyVisible(): void {
    const v = this.visible;
    if (this.sprite) this.sprite.setVisible(v);
    if (this.shadow) this.shadow.setVisible(v);
    if (this.glowImg) this.glowImg.setVisible(v);
    if (this.wardImg) this.wardImg.setVisible(v);
    if (this.haloImg) this.haloImg.setVisible(v);
    if (!v && this.beamImg) this.beamImg.setVisible(false);
  }

  /** True when the orbiter blocker should be reported to the World. */
  get blocking(): boolean {
    return this.visible && this.isOrbiter && this.sprite !== null;
  }

  /** Cancels the charge / beam / burst state (shots cleared). */
  resetCharge(): void {
    this.charge = 0;
    this.beamMs = 0;
    this.burstLeft = 0;
    if (this.beamImg) this.beamImg.setVisible(false);
    if (this.glowImg) this.glowImg.alpha = 0;
  }

  private disposeSprites(): void {
    if (this.sprite) this.sprite.destroy();
    if (this.shadow) this.shadow.destroy();
    if (this.glowImg) this.glowImg.destroy();
    if (this.beamImg) this.beamImg.destroy();
    if (this.wardImg) this.wardImg.destroy();
    if (this.haloImg) this.haloImg.destroy();
    this.sprite = null;
    this.shadow = null;
    this.glowImg = null;
    this.beamImg = null;
    this.wardImg = null;
    this.haloImg = null;
    this.spec = null;
    this.glowTexs = [];
    this.glowIdx = -1;
  }

  destroy(): void {
    this.disposeSprites();
    this.def = null;
  }
}
