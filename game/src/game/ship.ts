// =====================================================================================
//  SHIP — the player's craft: hull sprite (frame 0 neutral, 1 banking left, 2 banking
//  right), engine flame, ground shadow (+6, +10), shield bubble, keyboard / relative touch
//  movement clamped to the playfield, damage routing through the EnergyModel,
//  invulnerability blink after an armor hit, intro fly-in, stage-clear fly-out and the
//  death explosion sequence.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, DEPTH, H, PLAY_W } from '../config';
import { ANIM, SHOT_RGB, hullKey, shadowKey } from '../art/keys';
import { HULL_MOUNTS } from '../art/player';
import type { GeneratorDef, HullDef, ShieldDef } from '../types';
import type { ControlsState } from '../input/controls';
import { EnergyModel } from './energy';
import { FrameAnim, fallbackTex, frameCount, texOr } from './tex';
import type { World } from './world';
import { clamp } from './world';

/** Touch drag may move the ship at most this multiple of the hull speed. */
const DRAG_SPEED_CAP = 1.6;
const INVULN_AFTER_HIT = 1.0;
const BANK_THRESHOLD = 26; // px/s of horizontal motion before the hull banks
const INTRO_TIME = 1.1;
const SHADOW_DX = 6;
const SHADOW_DY = 10;
/** Times (s) of the chained explosions of the death sequence. */
const DEATH_STEPS = [0.12, 0.26, 0.38, 0.55, 0.7];

export class Ship {
  x = PLAY_W / 2;
  y = H + 40;
  alive = true;
  /** Player input moves the ship (false during the intro, death, fly-out). */
  controllable = false;
  readonly energy: EnergyModel;
  readonly hitRadius: number;
  readonly halfW = 13;
  readonly halfH = 14;

  private readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  /** One engine flame per nozzle (HULL_MOUNTS). */
  private readonly flames: Phaser.GameObjects.Image[] = [];
  private readonly flameDX: number[] = [];
  private readonly flameDY: number[] = [];
  private readonly bubble: Phaser.GameObjects.Image;
  private readonly flameAnim: FrameAnim;
  private readonly frames: number;
  private readonly shadowFrames: number;
  private readonly shieldTint: number;
  private bank = 0;
  private bankHold = 0;
  private invuln = 0;
  private bubbleA = 0;
  private age = 0;
  private introT = 0;
  private introY0 = H + 40;
  private targetY = H - 76;
  private flyOut = false;
  private flyV = 0;
  private deathT = -1;
  private deathStep = 0;
  private smokeT = 0;
  /** God mode: shadow shield/armor model fed by the hits (RunMetrics) + its invulnerability timer. */
  private readonly godModel: EnergyModel | null;
  private godInvuln = 0;

  constructor(private readonly w: World, readonly hull: HullDef, shield: ShieldDef, gen: GeneratorDef) {
    const scene = w.scene;
    this.energy = new EnergyModel(hull, shield, gen);
    this.godModel = w.god ? new EnergyModel(hull, shield, gen) : null;
    this.hitRadius = Math.max(2, hull.hitRadius);
    const key = texOr(scene, hullKey(hull.id), 'ship');
    this.frames = frameCount(scene, key);
    const sk = shadowKey(hullKey(hull.id));
    const shadowTex = scene.textures.exists(sk) ? sk : key;
    this.shadowFrames = frameCount(scene, shadowTex);
    this.shadow = scene.add.image(this.x + SHADOW_DX, this.y + SHADOW_DY, shadowTex, this.shadowFrames > 1 ? 0 : undefined)
      .setDepth(DEPTH.shadows);
    if (shadowTex === key) this.shadow.setTintFill(0x000000).setAlpha(0.4);
    this.shadow.setVisible(w.shadows);
    this.flameAnim = new FrameAnim(scene, ANIM.engine, 'fx_engine', 'glow', 18, true);
    // one fx_engine flame per nozzle (HULL_MOUNTS, px from the hull centre), hanging from its top row
    const engines = HULL_MOUNTS[hull.id]?.engines ?? [[0, 13]];
    for (const [ex, ey] of engines) {
      this.flameDX.push(ex);
      this.flameDY.push(ey);
    }
    for (let i = 0; i < this.flameDX.length; i++) {
      this.flames.push(scene.add.image(this.x, this.y + 15, this.flameAnim.keys[0], this.flameAnim.frames[0])
        .setDepth(DEPTH.player - 1).setOrigin(0.5, 0));
    }
    this.sprite = scene.add.image(this.x, this.y, key, this.frames > 1 ? 0 : undefined).setDepth(DEPTH.player);
    this.shieldTint = SHOT_RGB[shield.color]?.glow ?? COLORS.shield;
    const bubbleKey = scene.textures.exists('fx_shield_bubble') ? 'fx_shield_bubble' : fallbackTex(scene, 'ring');
    this.bubble = scene.add.image(this.x, this.y, bubbleKey).setDepth(DEPTH.player + 1).setTint(this.shieldTint)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setVisible(false);
    this.introT = 0;
  }

  /** Bullets / contact can hurt the ship right now. */
  get hittable(): boolean {
    return this.alive && this.invuln <= 0 && this.introT >= INTRO_TIME && !this.w.ended;
  }

  /** Weapons may fire (alive, not in the intro / fly-out). */
  get canFire(): boolean {
    return this.alive && this.controllable && !this.flyOut;
  }

  /** True once the death sequence finished its last explosion. */
  get deathDone(): boolean {
    return !this.alive && this.deathT > 1.0;
  }

  /** Skip the fly-in (used when the level starts already fast-forwarded). */
  skipIntro(): void {
    this.introT = INTRO_TIME;
    this.y = this.targetY;
    this.controllable = true;
  }

  /** Start the stage-clear fly-out (ship accelerates off the top of the screen). */
  startFlyOut(): void {
    this.flyOut = true;
    this.controllable = false;
    this.flyV = 0;
  }

  /** Short shield-bubble flash (absorbed hit, shield pickup). */
  shieldFlash(): void {
    this.bubbleA = 0.95;
    this.bubble.setVisible(true);
  }

  /** Apply damage from a bullet / laser / contact at (hx, hy). Shield first, then armor. */
  hit(amount: number, hx: number, hy: number): void {
    if (!this.hittable || amount <= 0) return;
    const w = this.w;
    const m = w.metrics;
    if (w.god) {
      // god mode: no damage, but replay the hit on the shadow model for the metrics
      if (this.godInvuln > 0) return;
      const g = this.godModel!;
      g.damage(amount);
      m.damageTaken += amount;
      m.hitsTaken++;
      m.armorDamage += g.lastArmorDamage;
      if (g.lastArmorDamage > 0) {
        this.godInvuln = INVULN_AFTER_HIT;
        if (g.dead) {
          m.wouldDie++;
          if (m.firstDeathT < 0) m.firstDeathT = w.time;
          g.repair(g.armorMax);
          g.refillShield();
        }
      }
      this.shieldFlash();
      return;
    }
    const e = this.energy;
    const shieldBefore = e.shield;
    e.damage(amount);
    m.damageTaken += amount;
    m.hitsTaken++;
    m.armorDamage += e.lastArmorDamage;
    if (e.dead && m.firstDeathT < 0) m.firstDeathT = w.time;
    if (e.lastShieldDamage > 0) {
      this.shieldFlash();
      w.services.hudFlash('shield');
      w.services.sfx(e.shield <= 0 && shieldBefore > 0 ? 'shield_down' : 'shield_hit');
      w.services.haptic('light');
      w.fx.sparks(hx, hy, 3, 60, this.shieldTint);
    }
    if (e.lastArmorDamage > 0) {
      this.invuln = INVULN_AFTER_HIT;
      w.fx.vignettePulse(0.8);
      w.fx.sparks(hx, hy, 8, 110);
      w.fx.blast(hx, hy, 's', 0.6);
      w.services.hudFlash('damage');
      w.services.sfx('hit_armor');
      w.services.haptic('medium');
      w.services.shake(0.005, 160);
      if (e.dead) this.die();
    }
  }

  /** Generator output + shield regeneration for one simulation step (and the god-mode shadow model). */
  updateEnergy(dt: number): void {
    this.energy.update(dt);
    const g = this.godModel;
    if (g) {
      // weapons draw from the real cell; the shadow shield regenerates from what is left there
      g.energy = this.energy.energy;
      g.update(dt);
      if (this.godInvuln > 0) this.godInvuln -= dt;
    }
  }

  /** Destroy the ship: chained explosions over ~1 s, then deathDone. */
  die(): void {
    if (!this.alive) return;
    this.alive = false;
    this.controllable = false;
    this.deathT = 0;
    this.deathStep = 0;
    const w = this.w;
    w.arsenal.setVisible(false);
    w.services.sfx('explode_l');
    w.services.haptic('heavy');
    w.services.shake(0.01, 500);
    w.services.hitStop(90);
    w.fx.explode(this.x, this.y, 'm');
    w.fx.flashScreen(0xffffff, 0.5, 2.5);
  }

  update(dt: number, c: ControlsState | null): void {
    const w = this.w;
    this.age += dt;
    const prevX = this.x;
    if (!this.alive) {
      this.updateDeath(dt);
      return;
    }
    if (this.introT < INTRO_TIME) {
      this.introT += dt;
      const p = Math.min(1, this.introT / INTRO_TIME);
      const ease = 1 - (1 - p) * (1 - p) * (1 - p);
      this.y = this.introY0 + (this.targetY - this.introY0) * ease;
      if (p >= 1) this.controllable = true;
    } else if (this.flyOut) {
      this.flyV = Math.min(520, this.flyV + 600 * dt);
      this.y -= this.flyV * dt;
    } else if (this.controllable && c) {
      const speed = this.hull.speed;
      let mx = c.moveX * speed * dt;
      let my = c.moveY * speed * dt;
      const dx = c.dragDX, dy = c.dragDY;
      if (dx !== 0 || dy !== 0) {
        const cap = DRAG_SPEED_CAP * speed * Math.max(dt, 1 / 120);
        const len = Math.hypot(dx, dy);
        const k = len > cap ? cap / len : 1;
        mx += dx * k;
        my += dy * k;
      }
      this.x = clamp(this.x + mx, this.halfW, PLAY_W - this.halfW);
      this.y = clamp(this.y + my, this.halfH + 4, H - this.halfH - 2);
    }
    // banking from the effective horizontal velocity
    const vx = dt > 0 ? (this.x - prevX) / dt : 0;
    const want = vx < -BANK_THRESHOLD ? 1 : vx > BANK_THRESHOLD ? 2 : 0;
    if (want !== 0) {
      this.bank = want;
      this.bankHold = 0.09;
    } else if (this.bankHold > 0) {
      this.bankHold -= dt;
      if (this.bankHold <= 0) this.bank = 0;
    }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.energy.armor < this.energy.armorMax * 0.3) {
      this.smokeT -= dt;
      if (this.smokeT <= 0) {
        this.smokeT = 0.16;
        w.fx.smoke(this.x + (w.fxRng() - 0.5) * 10, this.y + 6);
      }
    }
    this.sync(dt);
  }

  private sync(dt: number): void {
    const s = this.sprite;
    const frame = this.frames >= 3 ? this.bank : 0;
    if (this.frames > 1) s.setFrame(frame);
    s.setPosition(Math.round(this.x), Math.round(this.y));
    const blink = this.invuln > 0 && Math.floor(this.invuln * 14) % 2 === 0;
    s.setAlpha(blink ? 0.25 : 1);
    this.shadow.setPosition(Math.round(this.x) + SHADOW_DX, Math.round(this.y) + SHADOW_DY);
    if (this.shadowFrames >= 3) this.shadow.setFrame(frame);
    const fi = this.flameAnim.index(this.age * 1000);
    const boost = this.flyOut ? 1.6 : this.intro ? 1.3 : 1;
    const rx = Math.round(this.x), ry = Math.round(this.y);
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i];
      this.flameAnim.apply(f, (fi + i) % this.flameAnim.length);
      f.setPosition(rx + this.flameDX[i], ry + this.flameDY[i]).setScale(1, boost * (0.9 + 0.2 * ((fi + i + 1) % 2)));
    }
    if (this.bubbleA > 0) {
      this.bubbleA = Math.max(0, this.bubbleA - dt * 4);
      this.bubble.setPosition(this.x, this.y).setAlpha(this.bubbleA).setScale(1 + (0.95 - this.bubbleA) * 0.15);
      if (this.bubbleA <= 0) this.bubble.setVisible(false);
    }
  }

  private updateDeath(dt: number): void {
    const w = this.w;
    this.deathT += dt;
    const steps = DEATH_STEPS;
    while (this.deathStep < steps.length && this.deathT >= steps[this.deathStep]) {
      const a = w.fxRng() * Math.PI * 2, d = 4 + w.fxRng() * 12;
      w.fx.blast(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, this.deathStep % 2 === 0 ? 'm' : 's');
      w.fx.sparks(this.x, this.y, 6, 120);
      w.services.sfx('explode_m');
      this.deathStep++;
      if (this.deathStep === 2) {
        this.sprite.setVisible(false);
        this.shadow.setVisible(false);
        for (const f of this.flames) f.setVisible(false);
        this.bubble.setVisible(false);
      }
    }
    if (this.deathStep === steps.length && this.deathT >= 0.85) {
      this.deathStep++;
      w.fx.explode(this.x, this.y, 'l');
      w.fx.shockwave(this.x, this.y, 2.2);
      w.fx.flashScreen(0xffd8a0, 0.7, 2);
      w.services.sfx('explode_boss');
      w.services.haptic('heavy');
      w.services.shake(0.012, 600);
    }
  }

  /** Still flying in at the level start. */
  private get intro(): boolean {
    return this.introT < INTRO_TIME;
  }

  /** Off the top of the screen after the fly-out. */
  get gone(): boolean {
    return this.flyOut && this.y < -40;
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    for (const f of this.flames) f.destroy();
    this.bubble.destroy();
  }
}
