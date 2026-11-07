// =====================================================================================
//  ENEMIES — pooled enemy units (air / ground / sea). Two pools so depths never change at
//  runtime: air units (DEPTH.air, ground shadow +6/+10 on DEPTH.shadows) and surface units
//  (DEPTH.ground, scroll with the terrain, rotatable turret heads). Handles movement
//  (movement.ts), firing (firePatterns.ts), hit flash, damage smoke, deaths (explosions by
//  size, debris, shake, hit-stop, credit gems, drops, score) and culling.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, DEPTH, H, PLAY_W } from '../config';
import { ENEMY_SPRITES, enemyKey, shadowKey } from '../art/keys';
import { mineAnimKey, spinnerAnimKey, turretTopKey } from '../art/enemies';
import type { EnemyDef, EnemyLayer, MovePattern } from '../types';
import { getSave } from '../state/save';
import type { LaserOwner } from './enemyBullets';
import { FireState, updateFire, type FireSpec } from './firePatterns';
import { exitsUp, initMove, stepMove } from './movement';
import { FrameAnim, fallbackTex, frameCount } from './tex';
import type { World } from './world';
import { angleDiff } from './world';

const HALF_PI = Math.PI / 2;
const FLASH_TIME = 0.045;
const MAX_LIFE = 70;
const CONTACT_COOLDOWN = 0.5;

export class Enemy implements LaserOwner, FireSpec {
  serial = 0;
  active = false;
  def!: EnemyDef;
  layer: EnemyLayer = 'air';
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  rot = 0;
  targetRot = 0;
  spin = 0;
  hp = 1;
  maxHp = 1;
  radius = 8;
  speed = 0;
  t = 0;
  // movement state (movement.ts)
  move: MovePattern = 'straight';
  dir = 1;
  mt = 0;
  ms = 0;
  mx0 = 0;
  my0 = 0;
  mph = 0;
  mh = 0;
  mtimer = 0;
  // FireSpec (copied from the def at spawn)
  fire: EnemyDef['fire'] = 'none';
  rate = 0;
  bulletSpeed = 0;
  bulletSprite = 'eb_dot';
  bulletColor: EnemyDef['bulletColor'] = 'red';
  readonly fs = new FireState();
  entered = false;
  isMidboss = false;
  flash = 0;
  smokeT = 0;
  contactCd = 0;
  headRot = 0;
  anim: FrameAnim | null = null;
  animIdx = -1;
  hasShadow = false;
  shadowAnimated = false;
  hasHead = false;

  constructor(
    readonly img: Phaser.GameObjects.Image,
    readonly shadow: Phaser.GameObjects.Image | null,
    readonly head: Phaser.GameObjects.Image,
  ) {}

  get alive(): boolean {
    return this.active;
  }

  /** Muzzle point: barrel tip for turrets, else the nose (sprites face down at rotation 0). */
  laserX(): number {
    if (this.hasHead) return this.x + Math.cos(this.headRot + HALF_PI) * this.radius * 0.7;
    return this.x - Math.sin(this.rot) * this.radius * 0.55;
  }

  laserY(): number {
    if (this.hasHead) return this.y + Math.sin(this.headRot + HALF_PI) * this.radius * 0.7;
    return this.y + Math.cos(this.rot) * this.radius * 0.55;
  }
}

export interface SpawnOpts {
  midboss?: boolean;
}

export class Enemies {
  /** Active enemies (dense; order changes when enemies are removed). */
  readonly list: Enemy[] = [];
  private readonly airFree: Enemy[] = [];
  private readonly groundFree: Enemy[] = [];
  private serialSeq = 1;
  private readonly animCache = new Map<string, FrameAnim | null>();
  private readonly texCache = new Map<string, string>();
  private hapticT = 0;
  private readonly knownIntel: boolean;
  /** Currently alive mid-boss (HUD boss bar), or null. */
  midboss: Enemy | null = null;

  constructor(private readonly w: World) {
    const scene = w.scene;
    const fb = fallbackTex(scene, 'enemy');
    for (let i = 0; i < 84; i++) {
      const shadow = scene.add.image(-100, -100, fb).setDepth(DEPTH.shadows).setVisible(false);
      const img = scene.add.image(-100, -100, fb).setDepth(DEPTH.air).setVisible(false);
      const head = scene.add.image(-100, -100, fb).setDepth(DEPTH.air + 1).setVisible(false);
      this.airFree.push(new Enemy(img, shadow, head));
    }
    for (let i = 0; i < 48; i++) {
      const img = scene.add.image(-100, -100, fb).setDepth(DEPTH.ground).setVisible(false);
      const head = scene.add.image(-100, -100, fb).setDepth(DEPTH.ground + 1).setVisible(false);
      this.groundFree.push(new Enemy(img, null, head));
    }
    const intel = w.level.intel;
    this.knownIntel = !!intel && getSave().intel.includes(intel);
  }

  get count(): number {
    return this.list.length;
  }

  private tex(key: string): string {
    let v = this.texCache.get(key);
    if (v === undefined) {
      v = this.w.scene.textures.exists(key) ? key : '';
      this.texCache.set(key, v);
    }
    return v;
  }

  private animFor(def: EnemyDef, key: string): FrameAnim | null {
    let a = this.animCache.get(key);
    if (a !== undefined) return a;
    const scene = this.w.scene;
    a = null;
    if (frameCount(scene, key) > 1) {
      const animKey = def.sprite === 'en_spinner' ? spinnerAnimKey(def.palette)
        : def.sprite === 'hz_mine' ? mineAnimKey(def.palette) : '';
      a = new FrameAnim(scene, animKey, key, 'enemy', def.sprite === 'en_spinner' ? 16 : 6, true);
    }
    this.animCache.set(key, a);
    return a;
  }

  /**
   * Spawn an enemy at (x, y) with a movement pattern. dir = +1/-1 (mirror / side) for
   * patterns with a horizontal sense. Returns null when the pool is exhausted.
   */
  spawn(def: EnemyDef, x: number, y: number, move: MovePattern, dir: number, opts?: SpawnOpts): Enemy | null {
    const air = def.layer === 'air';
    const e = (air ? this.airFree : this.groundFree).pop();
    if (!e) return null;
    const w = this.w;
    const scene = w.scene;
    e.active = true;
    e.serial = this.serialSeq++;
    e.def = def;
    e.layer = def.layer;
    e.x = x;
    e.y = y;
    e.rot = 0;
    e.targetRot = 0;
    e.t = 0;
    e.speed = def.speed;
    e.move = move;
    e.dir = dir >= 0 ? 1 : -1;
    e.isMidboss = !!opts?.midboss;
    e.maxHp = e.hp = Math.max(1, def.hp * w.diff.hp);
    const size = (ENEMY_SPRITES as Record<string, number>)[def.sprite] ?? 16;
    e.radius = Math.max(4, size * 0.42);
    e.fire = def.fire;
    e.rate = def.fireRate;
    e.bulletSpeed = def.bulletSpeed;
    e.bulletSprite = def.bulletSprite;
    e.bulletColor = def.bulletColor;
    e.fs.reset(def.fireRate * w.diff.fireRate, w.rng);
    e.entered = false;
    e.flash = 0;
    e.smokeT = 0;
    e.contactCd = 0;
    e.animIdx = -1;
    const key = this.tex(enemyKey(def.sprite, def.palette)) || fallbackTex(scene, 'enemy');
    e.anim = this.animFor(def, key);
    e.img.setTexture(key, e.anim ? 0 : undefined).clearTint().setAlpha(1).setScale(1).setVisible(true).setPosition(x, y);
    if (e.shadow) {
      const sk = this.tex(shadowKey(key));
      e.hasShadow = sk !== '';
      e.shadowAnimated = e.hasShadow && !!e.anim && frameCount(scene, sk) > 1;
      if (e.hasShadow) e.shadow.setTexture(sk, e.shadowAnimated ? 0 : undefined).setVisible(true);
      else e.shadow.setVisible(false);
    }
    const hk = this.tex(turretTopKey(def.sprite, def.palette));
    e.hasHead = hk !== '';
    e.headRot = 0;
    if (e.hasHead) e.head.setTexture(hk).clearTint().setVisible(true).setPosition(x, y).setRotation(0);
    else e.head.setVisible(false);
    initMove(e, w);
    e.img.rotation = e.rot;
    this.list.push(e);
    w.stats.spawned++;
    if (e.isMidboss) this.midboss = e;
    return e;
  }

  /** Remove without a kill (left the screen). */
  remove(e: Enemy): void {
    if (!e.active) return;
    e.active = false;
    e.img.setVisible(false);
    e.shadow?.setVisible(false);
    e.head.setVisible(false);
    const i = this.list.indexOf(e);
    if (i >= 0) {
      this.list[i] = this.list[this.list.length - 1];
      this.list.pop();
    }
    (e.shadow ? this.airFree : this.groundFree).push(e);
    if (this.midboss === e) this.midboss = null;
  }

  /** True if the enemy can be hit by player shots (visible on screen). */
  hittable(e: Enemy): boolean {
    return e.entered && e.y > -e.radius * 0.5 && e.y < H + e.radius;
  }

  /** Apply player damage; flashes white and kills at 0 hp. Returns true if it died. */
  damage(e: Enemy, amount: number): boolean {
    if (!e.active) return false;
    e.hp -= amount;
    if (e.flash <= 0) {
      e.img.setTintFill(0xffffff);
      if (e.hasHead) e.head.setTintFill(0xffffff);
    }
    e.flash = FLASH_TIME;
    if (e.hp <= 0) {
      this.kill(e, true);
      return true;
    }
    return false;
  }

  /** Destroy an enemy with full effects; byPlayer grants score, credits and drops. */
  kill(e: Enemy, byPlayer: boolean): void {
    if (!e.active) return;
    const w = this.w;
    const def = e.def;
    const fx = w.fx;
    const ground = e.layer !== 'air';
    const size = e.isMidboss ? 'l' : def.explosion;
    fx.explode(e.x, e.y, size, ground, e.vx, e.vy);
    if (size === 'l') {
      w.services.sfx('explode_l');
      w.services.shake(e.isMidboss ? 0.011 : 0.007, e.isMidboss ? 520 : 280);
      w.services.hitStop(e.isMidboss ? 80 : 55);
      w.services.haptic('heavy');
      if (e.isMidboss) {
        for (let i = 0; i < 6; i++) {
          const a = w.fxRng() * Math.PI * 2, d = e.radius * (0.3 + w.fxRng() * 0.7);
          fx.blast(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, i % 2 ? 'm' : 'l', 1, 120 + i * 110, ground);
        }
        fx.shockwave(e.x, e.y, 2.6, ground);
        fx.flashScreen(0xffffff, 0.45, 2.4);
      }
    } else if (size === 'm') {
      w.services.sfx('explode_m');
      w.services.shake(0.003, 130);
      if (this.hapticT <= 0) {
        w.services.haptic('medium');
        this.hapticT = 0.12;
      }
    } else {
      w.services.sfx('explode_s');
      if (this.hapticT <= 0) {
        w.services.haptic('light');
        this.hapticT = 0.12;
      }
    }
    if (byPlayer) {
      w.stats.kills++;
      w.stats.score += def.score;
      if (size === 'l' || def.score >= 500) fx.text(e.x, e.y - e.radius, `${def.score}`, COLORS.gold, 1000);
      w.pickups.spawnCredits(e.x, e.y, def.credits * w.diff.credits, size === 'l' ? 90 : size === 'm' ? 70 : 45);
      this.rollDrops(e);
    }
    this.remove(e);
  }

  private rollDrops(e: Enemy): void {
    const w = this.w;
    const drops = e.def.drops;
    let spawned = 0;
    if (drops) {
      for (const d of drops) {
        if (w.rng() >= d.chance) continue;
        if (d.kind === 'intel') {
          if (!this.canDropIntel()) continue;
          w.intelDropped = true;
        }
        w.pickups.spawnDrop(e.x + spawned * 10, e.y, d.kind);
        spawned++;
      }
    }
    // Guarantee: the level's intel always shows up (mid-boss, or late tough enemies on
    // levels without a mid-boss / boss).
    const lv = w.level;
    if (this.canDropIntel() && (e.isMidboss || (!lv.midboss && !lv.boss && w.time > lv.duration * 0.6 && e.def.explosion !== 's'))) {
      w.intelDropped = true;
      w.pickups.spawnDrop(e.x - 10, e.y, 'intel');
    }
    if (e.isMidboss) {
      w.pickups.spawnDrop(e.x + 12, e.y, 'power');
      w.pickups.spawnDrop(e.x, e.y + 8, w.ship.energy.armor < w.ship.energy.armorMax * 0.6 ? 'armor' : 'shield');
    }
  }

  /** Intel of this level not yet dropped nor collected in an earlier run. */
  canDropIntel(): boolean {
    return !!this.w.level.intel && !this.w.intelDropped && !this.knownIntel;
  }

  /** Nearest hittable enemy within maxDist of (x, y) (homing weapons), or null. */
  nearest(x: number, y: number, maxDist: number): Enemy | null {
    let best: Enemy | null = null;
    let bd = maxDist * maxDist;
    const list = this.list;
    for (let k = 0; k < list.length; k++) {
      const e = list[k];
      if (!this.hittable(e) || e.y > H - 8) continue;
      const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  update(dt: number): void {
    const w = this.w;
    const ship = w.ship;
    const shipOk = ship.alive && !w.ended;
    if (this.hapticT > 0) this.hapticT -= dt;
    const list = this.list;
    for (let k = list.length - 1; k >= 0; k--) {
      const e = list[k];
      e.t += dt;
      stepMove(e, w, dt);
      const r = e.radius;
      if (!e.entered) {
        if (e.y > -r * 0.5 && e.y < H + r && e.x > -r * 0.5 && e.x < PLAY_W + r * 0.5) e.entered = true;
        else if (e.t > 14) {
          this.remove(e);
          continue;
        }
      } else if (e.x < -r - 30 || e.x > PLAY_W + r + 30 || e.y > H + r + 20 || (e.y < -r - 16 && (exitsUp(e) || e.vy < 0))
        || (e.t > MAX_LIFE && !e.isMidboss)) {
        this.remove(e);
        continue;
      }
      // rotation
      if (e.rot !== e.targetRot) {
        const d = angleDiff(e.rot, e.targetRot);
        const step = 7 * dt;
        e.rot += d > step ? step : d < -step ? -step : d;
      }
      // turret head tracks the player
      if (e.hasHead && shipOk) {
        const want = Math.atan2(ship.y - e.y, ship.x - e.x) - HALF_PI;
        const d = angleDiff(e.headRot, want);
        const step = 2.6 * dt;
        e.headRot += d > step ? step : d < -step ? -step : d;
      }
      // firing
      if (e.fire !== 'none') {
        const armed = shipOk && e.entered && e.y > 6 && e.y < H - 36 && e.x > 4 && e.x < PLAY_W - 4;
        updateFire(w, e.fs, e, e.laserX(), e.laserY(), dt, armed, e);
      }
      if (e.contactCd > 0) e.contactCd -= dt;
      // hit flash
      if (e.flash > 0) {
        e.flash -= dt;
        if (e.flash <= 0) {
          e.img.clearTint();
          if (e.hasHead) e.head.clearTint();
        }
      }
      // damaged smoke
      if (e.hp < e.maxHp * 0.4 && e.maxHp >= 20) {
        e.smokeT -= dt;
        if (e.smokeT <= 0) {
          e.smokeT = e.isMidboss ? 0.07 : 0.13;
          w.fx.smoke(e.x + (w.fxRng() - 0.5) * r, e.y + (w.fxRng() - 0.5) * r * 0.6, e.layer !== 'air');
        }
      }
      this.sync(e);
    }
  }

  private sync(e: Enemy): void {
    const img = e.img;
    const x = Math.round(e.x), y = Math.round(e.y);
    img.setPosition(x, y);
    img.rotation = e.rot;
    if (e.anim) {
      const idx = e.anim.index(e.t * 1000 + e.serial * 37);
      if (idx !== e.animIdx) {
        e.animIdx = idx;
        e.anim.apply(img, idx);
        if (e.shadowAnimated && e.shadow) e.shadow.setFrame(e.anim.frames[idx]);
      }
    }
    if (e.hasShadow && e.shadow) {
      e.shadow.setPosition(x + 6, y + 10);
      e.shadow.rotation = e.rot;
    }
    if (e.hasHead) {
      e.head.setPosition(x, y);
      e.head.rotation = e.headRot;
    }
  }

  /** Contact with the ship: cooldown-limited damage both ways. */
  contact(e: Enemy): void {
    if (e.contactCd > 0) return;
    e.contactCd = CONTACT_COOLDOWN;
    const w = this.w;
    w.ship.hit(e.def.contactDamage * w.diff.damage, (e.x + w.ship.x) / 2, (e.y + w.ship.y) / 2);
    this.damage(e, 40);
  }

  /** Destroy every live enemy (boss death); byPlayer=false: no rewards. */
  killAll(byPlayer: boolean): void {
    for (let k = this.list.length - 1; k >= 0; k--) {
      const e = this.list[k];
      if (this.hittable(e)) this.kill(e, byPlayer);
      else this.remove(e);
    }
  }
}
