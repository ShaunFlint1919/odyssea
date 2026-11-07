// =====================================================================================
//  BOSS — BossDef runtime: body + parts, phases by hp fraction, the 5 boss move patterns
//  (hoverSway, sweep, charge, figure8, anchor), attacks from muzzle offsets, minion
//  spawns, destroyable parts (turrets track the player, bonus credits), pulsing weak-point
//  core (x1.5 damage), damaged look (`<key>__dmg` texture when the art provides it), a
//  pixel hit-mask built from the body texture, and the death sequence (explosion chain,
//  slow-motion beat, bullets -> credit gems, flash + shockwave).
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, DEPTH, H, PLAY_W } from '../config';
import { BOSS_PART_SPRITES, bossKey, shadowKey } from '../art/keys';
import { bossCorePulseAnim, bossCorePulseKey, bossDamagedKey } from '../art/bosses';
import type { BossAttack, BossDef, BossPart, BossPhase, EnemyDef } from '../types';
import type { LaserOwner } from './enemyBullets';
import { FireState, updateFire } from './firePatterns';
import { FrameAnim, fallbackTex } from './tex';
import type { World } from './world';
import { angleDiff, clamp } from './world';

const HALF_PI = Math.PI / 2;
const MASK_CELL = 4;
const FLASH_TIME = 0.032;
/** Minimum gap between two white flashes (continuous fire makes the boss blink, not glow white). */
const FLASH_GAP = 0.06;
const CONTACT_DAMAGE = 12;
const CORE_MULT = 1.5;
const DEATH_TIME = 2.1;
const MAX_MINIONS = 8;
/** Minion launch points (offsets from the body centre); default = both flanks. */
const MINION_BAYS: Record<string, [number, number][]> = { boss_voidcarrier: [[0, 44]] };
/** Bosses that sit on the ground / sea (short shadow) instead of hovering. */
const SURFACE_BOSSES: Record<string, boolean> = { boss_colossus: true, boss_dreadnought: true, boss_forge: true, boss_hydra: true };

/** A muzzle on the boss body (BossAttack.from) — also a laser owner. */
class Muzzle implements LaserOwner {
  readonly fs = new FireState();
  constructor(readonly boss: Boss, readonly atk: BossAttack, readonly ox: number, readonly oy: number) {}
  get serial(): number { return this.boss.serial; }
  get alive(): boolean { return this.boss.fighting; }
  laserX(): number { return this.boss.x + this.ox; }
  laserY(): number { return this.boss.y + this.oy; }
}

/** Runtime state of one BossPart. */
class PartRt implements LaserOwner {
  hp: number;
  readonly maxHp: number;
  readonly destroyable: boolean;
  readonly turret: boolean;
  readonly core: boolean;
  dead = false;
  rot = 0;
  flash = 0;
  flashCd = 0;
  smokeT = 0;
  readonly fs = new FireState();
  readonly radius: number;
  readonly glow: Phaser.GameObjects.Image | null;
  /** Pulse animation of the weak-point core (bossCorePulseAnim), if the art provides it. */
  anim: FrameAnim | null = null;
  animIdx = -1;
  /** Ground shadow of the part (shadowKey of its plain texture), or null. */
  shadow: Phaser.GameObjects.Image | null = null;

  constructor(
    readonly boss: Boss,
    readonly def: BossPart,
    readonly img: Phaser.GameObjects.Image,
    glow: Phaser.GameObjects.Image | null,
    hpScale: number,
  ) {
    this.maxHp = this.hp = Math.max(0, def.hp * hpScale);
    this.destroyable = def.hp > 0;
    this.turret = def.sprite === 'part_turret' || def.sprite === 'part_cannon' || def.sprite === 'part_pod';
    this.core = def.sprite === 'part_core';
    const size = (BOSS_PART_SPRITES as Record<string, number>)[def.sprite] ?? 20;
    this.radius = size * 0.45;
    this.glow = glow;
  }

  get x(): number { return this.boss.x + this.def.offset[0]; }
  get y(): number { return this.boss.y + this.def.offset[1]; }
  get serial(): number { return this.boss.serial; }
  get alive(): boolean { return !this.dead && this.boss.fighting; }
  laserX(): number { return this.x + (this.turret ? Math.cos(this.rot + HALF_PI) * this.radius : 0); }
  laserY(): number { return this.y + (this.turret ? Math.sin(this.rot + HALF_PI) * this.radius : this.radius * 0.5); }
}

type BossState = 'idle' | 'enter' | 'fight' | 'dying' | 'dead';

export class Boss {
  state: BossState = 'idle';
  def: BossDef | null = null;
  serial = 0;
  x = PLAY_W / 2;
  y = -100;
  hp = 1;
  maxHp = 1;
  /** Width / height of the body sprite (px). */
  bw = 0;
  bh = 0;
  defeated = false;
  private t = 0;
  private pt = 0;
  private phaseIdx = 0;
  private yHome = 120;
  private img: Phaser.GameObjects.Image | null = null;
  private shadow: Phaser.GameObjects.Image | null = null;
  private parts: PartRt[] = [];
  private muzzles: Muzzle[][] = [];
  private mask: Uint8Array = new Uint8Array(0);
  private core: Uint8Array = new Uint8Array(0);
  private solidCells: Int32Array = new Int32Array(0);
  private mw = 0;
  private mh = 0;
  private flash = 0;
  private flashCd = 0;
  private dmgKey = '';
  private damaged = false;
  private sweepDir = 1;
  private chargeState = 0;
  private chargeT = 0;
  private chargeTx = 0;
  private chargeTy = 0;
  private contactCd = 0;
  private spawnT = 0;
  private minionDef: EnemyDef | null = null;
  private dieT = 0;
  private dieNext = 0;
  private dieBoom = 0;
  private smokeT = 0;
  private jitter = 0;
  private shadowDx = 10;
  private shadowDy = 16;

  constructor(private readonly w: World, private readonly getEnemyDef: (id: string) => EnemyDef | null) {}

  /** Active on screen (entering, fighting or dying). */
  get active(): boolean {
    return this.state === 'enter' || this.state === 'fight' || this.state === 'dying';
  }

  /** Fighting: attacks, can be damaged. */
  get fighting(): boolean {
    return this.state === 'fight';
  }

  get hpFrac(): number {
    return this.state === 'dead' ? 0 : clamp(this.hp / this.maxHp, 0, 1);
  }

  get name(): string {
    return this.def?.name ?? '';
  }

  /** Spawn the boss above the screen and start its entrance. */
  start(def: BossDef): void {
    const w = this.w;
    const scene = w.scene;
    this.def = def;
    this.serial++;
    this.state = 'enter';
    this.defeated = false;
    this.t = 0;
    this.pt = 0;
    this.phaseIdx = 0;
    this.maxHp = this.hp = Math.max(1, def.hp * w.diff.hp);
    const key = scene.textures.exists(bossKey(def.sprite, def.palette)) ? bossKey(def.sprite, def.palette)
      : scene.textures.exists(def.sprite) ? def.sprite : fallbackTex(scene, 'boss');
    const surface = !!SURFACE_BOSSES[def.sprite];
    const depth = surface ? DEPTH.ground + 2 : DEPTH.air - 3;
    this.shadowDx = surface ? 4 : 10;
    this.shadowDy = surface ? 6 : 18;
    const sk = shadowKey(key);
    const shadowDepth = surface ? DEPTH.ground + 1 : DEPTH.shadows;
    if (w.shadows && scene.textures.exists(sk)) this.shadow = scene.add.image(0, 0, sk).setDepth(shadowDepth);
    this.img = scene.add.image(0, 0, key).setDepth(depth);
    const dk = bossDamagedKey(def.sprite, def.palette);
    this.dmgKey = scene.textures.exists(dk) ? dk : '';
    this.damaged = false;
    this.bw = this.img.width;
    this.bh = this.img.height;
    this.buildMask(key);
    this.yHome = Math.max(this.bh * 0.5 + 8, H * 0.24);
    this.x = PLAY_W / 2;
    this.y = -this.bh * 0.5 - 12;
    // parts
    const glowKey = scene.textures.exists('fx_glow') ? 'fx_glow' : fallbackTex(scene, 'glow');
    this.parts = (def.parts ?? []).map((p) => {
      const pk = scene.textures.exists(bossKey(p.sprite, def.palette)) ? bossKey(p.sprite, def.palette)
        : scene.textures.exists(p.sprite) ? p.sprite : fallbackTex(scene, 'part');
      const img = scene.add.image(0, 0, pk).setDepth(depth + 1);
      const flip = p.sprite === 'part_wing' && p.offset[0] > 0; // wing art is the LEFT wing
      if (flip) img.setFlipX(true);
      const psk = shadowKey(pk);
      const glow = p.sprite === 'part_core'
        ? scene.add.image(0, 0, glowKey).setDepth(depth + 2).setBlendMode(Phaser.BlendModes.ADD).setTint(COLORS.accent).setAlpha(0.5)
        : null;
      const rt = new PartRt(this, p, img, glow, w.diff.hp);
      if (p.attack) rt.fs.reset(p.attack.rate * w.diff.fireRate, w.rng);
      if (rt.core && scene.textures.exists(bossCorePulseKey(def.palette))) {
        rt.anim = new FrameAnim(scene, bossCorePulseAnim(def.palette), bossCorePulseKey(def.palette), 'part', 6, true);
      }
      // the plain part key owns the shadow (also under the pulsing core sheet)
      if (w.shadows && scene.textures.exists(psk)) rt.shadow = scene.add.image(0, 0, psk).setDepth(shadowDepth).setFlipX(flip);
      return rt;
    });
    // muzzles per phase
    this.muzzles = def.phases.map((ph) => ph.attacks.map((a) => new Muzzle(this, a, a.from?.[0] ?? 0, a.from?.[1] ?? this.bh * 0.3)));
    this.enterPhase(0);
    this.sync(0);
  }

  /** Pixel hit-mask (MASK_CELL px cells) from the body texture alpha, + an eroded core for contact. */
  private buildMask(key: string): void {
    const scene = this.w.scene;
    const w = Math.max(1, Math.round(this.bw)), h = Math.max(1, Math.round(this.bh));
    this.mw = Math.ceil(w / MASK_CELL);
    this.mh = Math.ceil(h / MASK_CELL);
    this.mask = new Uint8Array(this.mw * this.mh);
    this.core = new Uint8Array(this.mw * this.mh);
    try {
      const frame = scene.textures.getFrame(key);
      const src = frame.source.image as CanvasImageSource;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(src, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > 100) this.mask[((y / MASK_CELL) | 0) * this.mw + ((x / MASK_CELL) | 0)]++;
        }
      }
      for (let i = 0; i < this.mask.length; i++) this.mask[i] = this.mask[i] >= 3 ? 1 : 0;
    } catch {
      this.mask.fill(1);
    }
    const cells: number[] = [];
    for (let cy = 0; cy < this.mh; cy++) {
      for (let cx = 0; cx < this.mw; cx++) {
        const i = cy * this.mw + cx;
        if (!this.mask[i]) continue;
        cells.push(i);
        const solid = (dx: number, dy: number) => {
          const nx = cx + dx, ny = cy + dy;
          return nx >= 0 && ny >= 0 && nx < this.mw && ny < this.mh && this.mask[ny * this.mw + nx] === 1;
        };
        this.core[i] = solid(-1, 0) && solid(1, 0) && solid(0, -1) && solid(0, 1) ? 1 : 0;
      }
    }
    this.solidCells = Int32Array.from(cells.length ? cells : [0]);
  }

  /** Is (x, y) on a solid part of the body? `strict` uses the eroded mask (ship contact). */
  private onBody(x: number, y: number, strict: boolean): boolean {
    const lx = x - (this.x - this.bw / 2), ly = y - (this.y - this.bh / 2);
    if (lx < 0 || ly < 0 || lx >= this.bw || ly >= this.bh) return false;
    const i = ((ly / MASK_CELL) | 0) * this.mw + ((lx / MASK_CELL) | 0);
    return (strict ? this.core[i] : this.mask[i]) === 1;
  }

  /** A random solid point of the body (world coords) written into out. */
  private randomPoint(out: { x: number; y: number }): void {
    const r = this.w.fxRng;
    const i = this.solidCells[(r() * this.solidCells.length) | 0];
    out.x = this.x - this.bw / 2 + (i % this.mw) * MASK_CELL + r() * MASK_CELL;
    out.y = this.y - this.bh / 2 + ((i / this.mw) | 0) * MASK_CELL + r() * MASK_CELL;
  }

  private readonly tmp = { x: 0, y: 0 };

  private enterPhase(i: number): void {
    const def = this.def!;
    this.phaseIdx = i;
    this.pt = 0;
    const ph = def.phases[i];
    for (const m of this.muzzles[i]) m.fs.reset(m.atk.rate * this.w.diff.fireRate, this.w.rng);
    this.chargeState = 0;
    this.chargeT = 0;
    this.spawnT = ph.spawn ? ph.spawn.every * 0.6 : 0;
    this.minionDef = ph.spawn ? this.getEnemyDef(ph.spawn.enemy) : null;
  }

  private get phase(): BossPhase {
    return this.def!.phases[this.phaseIdx];
  }

  /**
   * Player shot hit test. Returns -1 (miss), a part index (destroyable part or core hit),
   * or parts.length for the body.
   */
  hitTest(x: number, y: number, r: number): number {
    if (this.state !== 'fight' && this.state !== 'enter') return -1;
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      if (p.dead || (!p.destroyable && !p.core)) continue;
      const dx = p.x - x, dy = p.y - y, rr = p.radius + r;
      if (dx * dx + dy * dy < rr * rr) return i;
    }
    return this.onBody(x, y, false) ? this.parts.length : -1;
  }

  /** Apply damage to the target returned by hitTest(). */
  damageAt(target: number, amount: number, x: number, y: number): void {
    const w = this.w;
    if (this.state === 'enter') {
      if (w.fxRng() < 0.3) w.fx.hit(x, y, 0xc0c8ff);
      return;
    }
    if (this.state !== 'fight' || target < 0) return;
    if (target < this.parts.length) {
      const p = this.parts[target];
      if (p.core) {
        this.damageBody(amount * CORE_MULT);
        w.fx.hit(x, y, COLORS.accentLight);
        this.flashPart(p);
        return;
      }
      p.hp -= amount;
      this.flashPart(p);
      if (p.hp <= 0) this.killPart(p);
      return;
    }
    this.damageBody(amount);
  }

  private damageBody(amount: number): void {
    this.hp -= amount;
    if (this.flash <= 0 && this.flashCd <= 0) {
      this.img?.setTintFill(0xffffff);
      this.flash = FLASH_TIME;
      this.flashCd = FLASH_TIME + FLASH_GAP;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.startDeath();
    }
  }

  /** White flash of a part (rate-limited). */
  private flashPart(p: PartRt): void {
    if (p.flash > 0 || p.flashCd > 0) return;
    p.flash = FLASH_TIME;
    p.flashCd = FLASH_TIME + FLASH_GAP;
    p.img.setTintFill(0xffffff);
  }

  private killPart(p: PartRt): void {
    const w = this.w;
    p.dead = true;
    p.hp = 0;
    p.img.clearTint().setTint(0x4a4450);
    p.glow?.setVisible(false);
    w.fx.explode(p.x, p.y, 'm');
    w.services.sfx('explode_m');
    w.services.shake(0.005, 200);
    w.services.hitStop(45);
    w.services.haptic('medium');
    // bonus = 1.5x the boss's own credits-per-hp for the part's hp (+ a flat 20)
    const bonus = Math.round((this.def!.credits * (p.maxHp / this.maxHp) * 1.5 + 20) * w.diff.credits);
    w.pickups.spawnCredits(p.x, p.y, bonus, 80);
    w.stats.score += Math.round(this.def!.score * 0.05);
    w.fx.text(p.x, p.y - 12, 'PART DESTROYED', COLORS.gold, 900);
  }

  /** Splash damage around (x, y) — parts and body. */
  splash(x: number, y: number, radius: number, amount: number): void {
    if (this.state !== 'fight') return;
    for (const p of this.parts) {
      if (p.dead || !p.destroyable) continue;
      const dx = p.x - x, dy = p.y - y, rr = p.radius + radius;
      if (dx * dx + dy * dy < rr * rr) {
        p.hp -= amount;
        this.flashPart(p);
        if (p.hp <= 0) this.killPart(p);
      }
    }
    const dx = Math.max(Math.abs(x - this.x) - this.bw * 0.4, 0), dy = Math.max(Math.abs(y - this.y) - this.bh * 0.4, 0);
    if (dx * dx + dy * dy < radius * radius) this.damageBody(amount);
  }

  /** Nearest target point (alive destroyable part, else the body centre) for homing. */
  nearestPoint(x: number, y: number, maxDist: number, out: { x: number; y: number }): number {
    if (this.state !== 'fight') return Infinity;
    let best = Infinity;
    for (const p of this.parts) {
      if (p.dead || (!p.destroyable && !p.core)) continue;
      const dx = p.x - x, dy = p.y - y, d = dx * dx + dy * dy;
      if (d < best) {
        best = d;
        out.x = p.x;
        out.y = p.y;
      }
    }
    const dx = this.x - x, dy = this.y - y, d = dx * dx + dy * dy;
    if (d < best) {
      best = d;
      out.x = this.x;
      out.y = this.y;
    }
    return best <= maxDist * maxDist ? Math.sqrt(best) : Infinity;
  }

  private startDeath(): void {
    const w = this.w;
    this.state = 'dying';
    this.dieT = 0;
    this.dieNext = 0;
    this.dieBoom = 0;
    w.services.slowMo(0.3, 600);
    w.services.hitStop(90);
    w.services.sfx('explode_l');
    w.services.haptic('heavy');
    w.services.shake(0.008, 700);
    w.bullets.convertToGems();
    w.enemies.killAll(true);
    w.fx.flashScreen(0xffffff, 0.5, 3);
    for (const p of this.parts) p.glow?.setVisible(false);
  }

  private finishDeath(): void {
    const w = this.w;
    const def = this.def!;
    this.state = 'dead';
    this.defeated = true;
    const fx = w.fx;
    fx.explode(this.x, this.y, 'l');
    for (let i = 0; i < 5; i++) {
      this.randomPoint(this.tmp);
      fx.blast(this.tmp.x, this.tmp.y, 'l', 1, i * 70);
    }
    fx.shockwave(this.x, this.y, 3.2);
    fx.shockwave(this.x, this.y, 2, false);
    fx.debris(this.x, this.y, 24, 220);
    fx.sparks(this.x, this.y, 40, 260);
    fx.flashScreen(0xffffff, 1, 1.4);
    w.services.sfx('explode_boss');
    w.services.haptic('heavy');
    w.services.shake(0.014, 900);
    w.stats.score += def.score;
    w.stats.kills++;
    fx.text(this.x, this.y, `${def.score}`, COLORS.gold, 1400);
    w.pickups.spawnCredits(this.x, this.y, def.credits * w.diff.credits, 160);
    if (w.enemies.canDropIntel()) {
      w.intelDropped = true;
      w.pickups.spawnDrop(this.x, this.y + 10, 'intel');
    }
    this.img?.setVisible(false);
    this.shadow?.setVisible(false);
    for (const p of this.parts) {
      p.img.setVisible(false);
      p.glow?.setVisible(false);
      p.shadow?.setVisible(false);
    }
  }

  update(dt: number): void {
    if (!this.active || !this.def) return;
    const w = this.w;
    this.t += dt;
    this.pt += dt;
    if (this.state === 'enter') {
      const dy = this.yHome - this.y;
      this.y += Math.max(18, dy * 1.1) * dt;
      if (this.y >= this.yHome - 0.5) {
        this.y = this.yHome;
        this.state = 'fight';
        this.pt = 0;
      }
    } else if (this.state === 'fight') {
      // phase by hp fraction
      const frac = this.hp / this.maxHp;
      const phases = this.def.phases;
      let idx = this.phaseIdx;
      while (idx < phases.length - 1 && frac <= phases[idx].untilHp) idx++;
      if (idx !== this.phaseIdx) this.phaseChange(idx);
      this.move(dt);
      this.attack(dt);
      this.minions(dt);
      this.contact(dt);
      // battle-damaged body for the final phase (or the last third of a single-phase boss)
      if (!this.damaged && this.dmgKey && (phases.length > 1 ? this.phaseIdx === phases.length - 1 : frac < 0.34)) {
        this.damaged = true;
        this.img?.setTexture(this.dmgKey);
      }
      if (frac < 0.5) {
        this.smokeT -= dt;
        if (this.smokeT <= 0) {
          this.smokeT = frac < 0.25 ? 0.09 : 0.16;
          this.randomPoint(this.tmp);
          w.fx.smoke(this.tmp.x, this.tmp.y);
          if (frac < 0.25 && w.fxRng() < 0.3) w.fx.blast(this.tmp.x, this.tmp.y, 's', 0.7);
        }
      }
    } else if (this.state === 'dying') {
      this.dieT += dt;
      this.jitter = (w.fxRng() - 0.5) * 4;
      this.dieNext -= dt;
      if (this.dieNext <= 0) {
        this.dieNext = 0.06 + w.fxRng() * 0.06;
        this.randomPoint(this.tmp);
        w.fx.blast(this.tmp.x, this.tmp.y, w.fxRng() < 0.35 ? 'm' : 's', 1);
        w.fx.sparks(this.tmp.x, this.tmp.y, 4, 120);
        this.dieBoom += 1;
        if (this.dieBoom % 4 === 0) {
          w.services.sfx('explode_m');
          w.services.shake(0.006, 160);
          w.services.haptic('light');
        }
      }
      if (this.dieT >= DEATH_TIME) this.finishDeath();
    }
    for (const p of this.parts) this.updatePart(p, dt);
    if (this.flashCd > 0) this.flashCd -= dt;
    if (this.flash > 0) {
      this.flash -= dt;
      if (this.flash <= 0) this.img?.clearTint();
    }
    if (this.active) this.sync(dt);
  }

  private phaseChange(idx: number): void {
    const w = this.w;
    this.enterPhase(idx);
    for (let i = 0; i < 4; i++) {
      this.randomPoint(this.tmp);
      w.fx.blast(this.tmp.x, this.tmp.y, 'm', 1, i * 90);
    }
    w.fx.flashScreen(0xffffff, 0.35, 3);
    w.services.sfx('explode_m');
    w.services.shake(0.006, 300);
    w.services.haptic('medium');
  }

  private move(dt: number): void {
    const ph = this.phase;
    const speed = Math.max(10, ph.speed);
    const cx = PLAY_W / 2;
    const range = Math.max(24, (PLAY_W - this.bw) / 2 + this.bw * 0.18);
    let tx = cx, ty = this.yHome;
    const t = this.pt;
    switch (ph.move) {
      case 'hoverSway': {
        const om = speed / range;
        tx = cx + range * Math.sin(t * om);
        ty = this.yHome + 5 * Math.sin(t * om * 1.7);
        break;
      }
      case 'sweep': {
        tx = this.x + this.sweepDir * speed * dt;
        if (tx > cx + range) { tx = cx + range; this.sweepDir = -1; }
        else if (tx < cx - range) { tx = cx - range; this.sweepDir = 1; }
        ty = this.yHome + 4 * Math.sin(t * 2);
        this.x = tx;
        break;
      }
      case 'charge': {
        this.chargeT += dt;
        const ship = this.w.ship;
        if (this.chargeState === 0) {
          const om = speed / range;
          tx = cx + range * 0.7 * Math.sin(this.t * om * 0.8);
          ty = this.yHome;
          if (this.chargeT > 2.4) {
            this.chargeState = 1;
            this.chargeT = 0;
          }
        } else if (this.chargeState === 1) {
          tx = this.x + (this.w.fxRng() - 0.5) * 3;
          ty = this.yHome - 12 * Math.min(1, this.chargeT / 0.5);
          if (this.chargeT > 0.55) {
            this.chargeState = 2;
            this.chargeT = 0;
            this.chargeTx = clamp(ship.x, cx - range, cx + range);
            this.chargeTy = Math.min(H * 0.62, Math.max(this.yHome + 40, ship.y - this.bh * 0.35));
            this.w.services.sfx('warning');
          }
        } else if (this.chargeState === 2) {
          const dx = this.chargeTx - this.x, dy = this.chargeTy - this.y;
          const d = Math.hypot(dx, dy);
          const step = speed * 3.2 * dt;
          if (d <= step) {
            this.x = this.chargeTx;
            this.y = this.chargeTy;
            this.chargeState = 3;
            this.chargeT = 0;
            this.w.services.shake(0.006, 200);
          } else {
            this.x += (dx / d) * step;
            this.y += (dy / d) * step;
          }
          return;
        } else {
          const dy = this.yHome - this.y;
          const step = speed * 1.1 * dt;
          if (Math.abs(dy) <= step || this.chargeT > 4) {
            this.y = this.yHome;
            this.chargeState = 0;
            this.chargeT = 0;
          } else {
            this.y += Math.sign(dy) * step;
          }
          return;
        }
        break;
      }
      case 'figure8': {
        const a = Math.min(range, 72);
        const om = speed / Math.max(40, a);
        tx = cx + a * Math.sin(t * om);
        ty = this.yHome + 22 * Math.sin(2 * t * om);
        break;
      }
      case 'anchor':
        tx = cx;
        ty = this.yHome + 2 * Math.sin(t * 1.2);
        break;
    }
    const k = Math.min(1, dt * 4);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
  }

  private attack(dt: number): void {
    const w = this.w;
    const armed = w.ship.alive && !w.ended;
    const list = this.muzzles[this.phaseIdx];
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      updateFire(w, m.fs, m.atk, this.x + m.ox, this.y + m.oy, dt, armed, m);
    }
  }

  private minions(dt: number): void {
    const sp = this.phase.spawn;
    if (!sp || !this.minionDef || sp.every <= 0) return;
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = sp.every;
    const w = this.w;
    let alive = 0;
    for (const e of w.enemies.list) if (!e.isMidboss) alive++;
    if (alive >= MAX_MINIONS) return;
    const def = this.minionDef;
    const bays = MINION_BAYS[this.def!.sprite];
    if (bays) {
      for (let i = 0; i < bays.length; i++) {
        const e = w.enemies.spawn(def, clamp(this.x + bays[i][0], 12, PLAY_W - 12), this.y + bays[i][1], def.move, i % 2 ? -1 : 1);
        if (e) w.fx.glow(e.x, e.y, COLORS.accent, 1, 200);
      }
      return;
    }
    for (let s = -1; s <= 1; s += 2) {
      const x = clamp(this.x + s * this.bw * 0.38, 12, PLAY_W - 12);
      w.enemies.spawn(def, x, this.y + this.bh * 0.15, def.move, s);
    }
  }

  private contact(dt: number): void {
    if (this.contactCd > 0) {
      this.contactCd -= dt;
      return;
    }
    const ship = this.w.ship;
    if (!ship.hittable) return;
    if (this.onBody(ship.x, ship.y, true)) {
      this.contactCd = 0.5;
      ship.hit(CONTACT_DAMAGE * this.w.diff.damage, ship.x, ship.y - 4);
    }
  }

  private updatePart(p: PartRt, dt: number): void {
    const w = this.w;
    if (p.flashCd > 0) p.flashCd -= dt;
    if (p.flash > 0) {
      p.flash -= dt;
      if (p.flash <= 0) {
        p.img.clearTint();
        if (p.dead) p.img.setTint(0x4a4450);
      }
    }
    if (this.state !== 'fight') return;
    if (p.dead) {
      p.smokeT -= dt;
      if (p.smokeT <= 0) {
        p.smokeT = 0.22;
        w.fx.smoke(p.x, p.y);
      }
      return;
    }
    if (p.turret && w.ship.alive) {
      const want = Math.atan2(w.ship.y - p.y, w.ship.x - p.x) - HALF_PI;
      const d = angleDiff(p.rot, want);
      const step = 2.4 * dt;
      p.rot += d > step ? step : d < -step ? -step : d;
    }
    if (p.def.attack) {
      updateFire(w, p.fs, p.def.attack, p.laserX(), p.laserY(), dt, w.ship.alive && !w.ended, p);
    }
  }

  private sync(dt: number): void {
    void dt;
    const x = Math.round(this.x + this.jitter), y = Math.round(this.y);
    this.img?.setPosition(x, y);
    this.shadow?.setPosition(x + this.shadowDx, y + this.shadowDy);
    for (const p of this.parts) {
      const px = x + p.def.offset[0], py = y + p.def.offset[1];
      p.img.setPosition(px, py);
      if (p.turret) p.img.rotation = p.rot;
      if (p.shadow) {
        p.shadow.setPosition(px + this.shadowDx, py + this.shadowDy);
        p.shadow.rotation = p.img.rotation;
      }
      if (p.core && !p.dead) {
        const pulse = 0.5 + 0.5 * Math.sin(this.t * 6);
        if (p.anim) {
          const idx = p.anim.index(this.t * 1000);
          if (idx !== p.animIdx) {
            p.animIdx = idx;
            p.anim.apply(p.img, idx);
          }
        }
        p.img.setScale(1 + 0.07 * pulse);
        p.glow?.setPosition(px, py).setAlpha(0.25 + 0.45 * pulse).setScale(0.9 + 0.4 * pulse);
      }
    }
  }

  destroy(): void {
    this.img?.destroy();
    this.shadow?.destroy();
    for (const p of this.parts) {
      p.img.destroy();
      p.glow?.destroy();
      p.shadow?.destroy();
    }
    this.parts = [];
    this.img = null;
    this.shadow = null;
    this.state = 'idle';
  }
}
