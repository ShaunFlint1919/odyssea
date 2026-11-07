// =====================================================================================
//  ENEMIES — pooled enemy units (air / ground / sea). Two pools so depths never change at
//  runtime: air units (DEPTH.air, ground shadow +6/+10 on DEPTH.shadows) and surface units
//  (DEPTH.ground, scroll with the terrain, rotatable turret heads). Handles movement
//  (movement.ts), firing (firePatterns.ts), hit flash, damage smoke, deaths (explosions by
//  size, debris, shake, hit-stop, credit gems, drops, score) and culling. Every step records
//  each unit's previous position (px, py) for the swept player-shot tests (collisions.ts).
//  The pools grow on demand up to their caps and a turret head image exists only on units
//  that have one (hidden pooled objects still cost Phaser a willRender() every frame).
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, DEPTH, H, PLAY_W } from '../config';
import { ENEMY_SPRITES, enemyKey, shadowKey } from '../art/keys';
import { enemyAnimKey, turretTopKey } from '../art/enemies';
import type { EnemyDef, EnemyLayer, MovePattern } from '../types';
import { getSave } from '../state/save';
import { ENEMIES, ENEMY_MUZZLES } from '../data';
import type { LaserOwner } from './enemyBullets';
import { FireState, updateFire, type FireSpec } from './firePatterns';
import { exitsUp, initMove, stepMove } from './movement';
import { FrameAnim, fallbackTex, frameCount } from './tex';
import type { World } from './world';
import { angleDiff } from './world';

const HALF_PI = Math.PI / 2;
/** White hit flash duration (~2 frames) and the minimum gap before the next flash, so an
 *  enemy under continuous fire blinks instead of turning solid white. */
const FLASH_TIME = 0.032;
const FLASH_GAP = 0.05;
/** Big units (capital ships, mid-bosses) strobe less under continuous fire. */
const FLASH_GAP_BIG = 0.14;
const BIG_RADIUS = 16;
/** Barrel tip distance from the centre of rotatable heads (art facts, px). */
const HEAD_TIP: Record<string, number> = { gr_turret: 9, gr_twin: 12, gr_tank: 11 };
/** Lateral barrel offsets of multi-barrel heads (volleys alternate between them). */
const HEAD_BARRELS: Record<string, number[]> = { gr_twin: [-4, 4] };
const MAX_LIFE = 70;
/** Pool caps (air / surface units alive at once) and how many of each are created up front. */
const MAX_AIR = 84;
const MAX_GROUND = 48;
const PREWARM_AIR = 32;
const PREWARM_GROUND = 16;
const CONTACT_COOLDOWN = 0.5;
/** Carrier hangar launch cadence (s) and the cap of live enemies above which launches pause. */
const BAY_INTERVAL = 3.4;
const BAY_ENEMY_CAP = 22;
/** Patterns a launched fighter may use (they start inside the screen, mid-height). */
const LAUNCH_MOVES: Record<string, boolean> = { straight: true, sine: true, dive: true, swoopL: true, swoopR: true, zigzag: true, chase: true, circle: true };

export class Enemy implements LaserOwner, FireSpec {
  serial = 0;
  active = false;
  def!: EnemyDef;
  layer: EnemyLayer = 'air';
  x = 0;
  y = 0;
  /** Position at the start of the current simulation step (swept shot tests). */
  px = 0;
  py = 0;
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
  flashCd = 0;
  smokeT = 0;
  contactCd = 0;
  headRot = 0;
  anim: FrameAnim | null = null;
  animIdx = -1;
  /** Volley counter (round-robin between muzzles / barrels). */
  shot = 0;
  /** Muzzle point computed by aimMuzzle() (no allocation). */
  mzX = 0;
  mzY = 0;
  headTip = 0;
  barrels: number[] | null = null;
  /** Built-in hull guns (ENEMY_MUZZLES), round robin. */
  muzzles: [number, number][] | null = null;
  /** Hangar bays (ENEMY_MUZZLES) launching fighters, and the launch timer. */
  bays: [number, number][] | null = null;
  bayT = 0;
  hasShadow = false;
  shadowAnimated = false;
  hasHead = false;
  /** Rotatable turret head, created the first time this pooled unit spawns as a turret unit. */
  head: Phaser.GameObjects.Image | null = null;

  constructor(
    readonly img: Phaser.GameObjects.Image,
    /** Ground shadow (air units only); null marks a surface-pool unit. */
    readonly shadow: Phaser.GameObjects.Image | null,
  ) {}

  get alive(): boolean {
    return this.active;
  }

  /**
   * Compute muzzle `k` into mzX / mzY: barrel tip of a rotatable head (alternating barrels),
   * a built-in hull gun (round robin), else the nose (sprites face down at rotation 0).
   */
  aimMuzzle(k: number): void {
    if (this.hasHead) {
      const a = this.headRot + HALF_PI;
      const c = Math.cos(a), s = Math.sin(a);
      const lat = this.barrels ? this.barrels[k % this.barrels.length] : 0;
      this.mzX = this.x + c * this.headTip - s * lat;
      this.mzY = this.y + s * this.headTip + c * lat;
      return;
    }
    const c = Math.cos(this.rot), s = Math.sin(this.rot);
    let ox = 0, oy = this.radius * 0.55;
    if (this.muzzles) {
      const m = this.muzzles[k % this.muzzles.length];
      ox = m[0];
      oy = m[1];
    }
    this.mzX = this.x + ox * c - oy * s;
    this.mzY = this.y + ox * s + oy * c;
  }

  /** Laser origin: the main gun (muzzle 0). */
  laserX(): number {
    this.aimMuzzle(0);
    return this.mzX;
  }

  laserY(): number {
    this.aimMuzzle(0);
    return this.mzY;
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
  private airCreated = 0;
  private groundCreated = 0;
  private readonly fallbackKey: string;
  private readonly animCache = new Map<string, FrameAnim | null>();
  private readonly texCache = new Map<string, string>();
  private hapticT = 0;
  private readonly knownIntel: boolean;
  /** Currently alive mid-boss (HUD boss bar), or null. */
  midboss: Enemy | null = null;

  constructor(private readonly w: World) {
    this.fallbackKey = fallbackTex(w.scene, 'enemy');
    for (let i = 0; i < PREWARM_AIR; i++) this.airFree.push(this.create(true) as Enemy);
    for (let i = 0; i < PREWARM_GROUND; i++) this.groundFree.push(this.create(false) as Enemy);
    const intel = w.level.intel;
    this.knownIntel = !!intel && getSave().intel.includes(intel);
  }

  get count(): number {
    return this.list.length;
  }

  /** A new pooled unit of the air or surface pool, or null once that pool reached its cap. */
  private create(air: boolean): Enemy | null {
    if (air ? this.airCreated >= MAX_AIR : this.groundCreated >= MAX_GROUND) return null;
    const scene = this.w.scene, fb = this.fallbackKey;
    if (air) {
      this.airCreated++;
      const shadow = scene.add.image(-100, -100, fb).setDepth(DEPTH.shadows).setVisible(false);
      return new Enemy(scene.add.image(-100, -100, fb).setDepth(DEPTH.air).setVisible(false), shadow);
    }
    this.groundCreated++;
    return new Enemy(scene.add.image(-100, -100, fb).setDepth(DEPTH.ground).setVisible(false), null);
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
    const animKey = enemyAnimKey(def.sprite, def.palette);
    if (animKey || frameCount(scene, key) > 1) a = new FrameAnim(scene, animKey ?? '', key, 'enemy', 12, true);
    this.animCache.set(key, a);
    return a;
  }

  /**
   * Spawn an enemy at (x, y) with a movement pattern. dir = +1/-1 (mirror / side) for
   * patterns with a horizontal sense. Returns null when the pool is exhausted.
   */
  spawn(def: EnemyDef, x: number, y: number, move: MovePattern, dir: number, opts?: SpawnOpts): Enemy | null {
    const air = def.layer === 'air';
    const e = (air ? this.airFree : this.groundFree).pop() ?? this.create(air);
    if (!e) return null;
    const w = this.w;
    const scene = w.scene;
    e.active = true;
    e.serial = this.serialSeq++;
    e.def = def;
    e.layer = def.layer;
    e.x = e.px = x;
    e.y = e.py = y;
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
    e.flashCd = 0;
    e.smokeT = 0;
    e.contactCd = 0;
    e.animIdx = -1;
    const key = this.tex(enemyKey(def.sprite, def.palette)) || fallbackTex(scene, 'enemy');
    e.anim = this.animFor(def, key);
    e.img.setTexture(key, e.anim ? 0 : undefined).clearTint().setAlpha(1).setScale(1).setVisible(true).setPosition(x, y);
    if (e.shadow) {
      const sk = w.shadows ? this.tex(shadowKey(key)) : '';
      e.hasShadow = sk !== '';
      e.shadowAnimated = e.hasShadow && !!e.anim && frameCount(scene, sk) > 1;
      if (e.hasShadow) e.shadow.setTexture(sk, e.shadowAnimated ? 0 : undefined).setVisible(true);
      else e.shadow.setVisible(false);
    }
    const hk = this.tex(turretTopKey(def.sprite, def.palette));
    e.hasHead = hk !== '';
    e.headRot = 0;
    e.headTip = HEAD_TIP[def.sprite] ?? e.radius * 0.7;
    e.barrels = HEAD_BARRELS[def.sprite] ?? null;
    const mz = (ENEMY_MUZZLES as Record<string, { guns: [number, number][]; bays?: [number, number][] } | undefined>)[def.sprite];
    e.muzzles = mz ? mz.guns : null;
    e.bays = mz?.bays ?? null;
    e.bayT = BAY_INTERVAL * 0.5;
    e.shot = 0;
    if (e.hasHead) {
      const head = e.head ?? (e.head = scene.add.image(x, y, hk).setDepth((e.shadow ? DEPTH.air : DEPTH.ground) + 1));
      head.setTexture(hk).clearTint().setVisible(true).setPosition(x, y).setRotation(0);
    } else if (e.head) {
      e.head.setVisible(false);
    }
    initMove(e, w);
    e.img.rotation = e.rot;
    this.list.push(e);
    w.stats.spawned++;
    if (e.isMidboss) {
      this.midboss = e;
      w.metrics.midbossStartT = w.time;
    }
    return e;
  }

  private readonly launchCache = new Map<string, EnemyDef | null>();

  /** Cheapest small air enemy of the same planet (id prefix, e.g. 'v_') to launch from a carrier. */
  private launchDef(carrier: EnemyDef): EnemyDef | null {
    let d = this.launchCache.get(carrier.id);
    if (d !== undefined) return d;
    const us = carrier.id.indexOf('_');
    const prefix = us > 0 ? carrier.id.slice(0, us + 1) : '';
    d = null;
    for (const c of ENEMIES) {
      if (!c.id.startsWith(prefix) || c.layer !== 'air' || c.id === carrier.id || c.sprite.startsWith('hz_')) continue;
      if (!LAUNCH_MOVES[c.move] || c.hp > 40) continue;
      if (!d || c.hp < d.hp) d = c;
    }
    this.launchCache.set(carrier.id, d);
    return d;
  }

  /** Launch fighters from every hangar bay of a carrier. */
  private launch(e: Enemy): void {
    const def = this.launchDef(e.def);
    if (!def || !e.bays || this.list.length >= BAY_ENEMY_CAP) return;
    const c = Math.cos(e.rot), s = Math.sin(e.rot);
    for (let i = 0; i < e.bays.length; i++) {
      const [ox, oy] = e.bays[i];
      const m = this.spawn(def, e.x + ox * c - oy * s, e.y + ox * s + oy * c, def.move, ox < 0 ? -1 : 1);
      if (m) this.w.fx.glow(m.x, m.y, COLORS.accentLight, 0.8, 160);
    }
  }

  /** Remove without a kill (left the screen). */
  remove(e: Enemy): void {
    if (!e.active) return;
    e.active = false;
    e.img.setVisible(false);
    e.shadow?.setVisible(false);
    e.head?.setVisible(false);
    const i = this.list.indexOf(e);
    if (i >= 0) {
      this.list[i] = this.list[this.list.length - 1];
      this.list.pop();
    }
    (e.shadow ? this.airFree : this.groundFree).push(e);
    if (this.midboss === e) {
      this.midboss = null;
      if (this.w.metrics.midbossKillT < 0) this.w.metrics.midbossEscaped = true;
    }
  }

  /** True if the enemy can be hit by player shots (visible on screen). */
  hittable(e: Enemy): boolean {
    return e.entered && e.y > -e.radius * 0.5 && e.y < H + e.radius;
  }

  /** Apply player damage; flashes white and kills at 0 hp. Returns true if it died. */
  damage(e: Enemy, amount: number): boolean {
    if (!e.active || !(amount > 0)) return false; // also rejects NaN (it would make the unit immortal)
    e.hp -= amount;
    if (e.flash <= 0 && e.flashCd <= 0) {
      e.img.setTintFill(0xffffff);
      if (e.hasHead) e.head?.setTintFill(0xffffff);
      e.flash = FLASH_TIME;
      e.flashCd = FLASH_TIME + (e.isMidboss || e.radius >= BIG_RADIUS ? FLASH_GAP_BIG : FLASH_GAP);
    }
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
        this.hapticT = 0.25;
      }
    }
    if (byPlayer) {
      w.stats.kills++;
      if (e.isMidboss) w.metrics.midbossKillT = w.time;
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
        if (d.kind === 'intel' && !this.canDropIntel()) continue;
        const ok = w.pickups.spawnDrop(e.x + spawned * 10, e.y, d.kind);
        if (ok && d.kind === 'intel') w.intelDropped = true;
        spawned++;
      }
    }
    // Guarantee: the level's intel always shows up (mid-boss, or late tough enemies on
    // levels without a mid-boss / boss).
    const lv = w.level;
    if (this.canDropIntel() && (e.isMidboss || (!lv.midboss && !lv.boss && w.time > lv.duration * 0.6 && e.def.explosion !== 's'))) {
      if (w.pickups.spawnDrop(e.x - 10, e.y, 'intel')) w.intelDropped = true;
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
      e.px = e.x;
      e.py = e.y;
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
        e.aimMuzzle(e.shot);
        if (updateFire(w, e.fs, e, e.mzX, e.mzY, dt, armed, e)) e.shot++;
      }
      // carriers launch fighters from their hangar bays while on station
      if (e.bays && shipOk && e.entered && e.y > 10 && e.y < H * 0.6 && (e.move !== 'hover' || e.ms === 1)) {
        e.bayT -= dt;
        if (e.bayT <= 0) {
          e.bayT = BAY_INTERVAL;
          this.launch(e);
        }
      }
      if (e.contactCd > 0) e.contactCd -= dt;
      // hit flash
      if (e.flashCd > 0) e.flashCd -= dt;
      if (e.flash > 0) {
        e.flash -= dt;
        if (e.flash <= 0) {
          e.img.clearTint();
          if (e.hasHead) e.head?.clearTint();
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
    const head = e.head;
    if (e.hasHead && head) {
      head.setPosition(x, y);
      head.rotation = e.headRot;
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

  /**
   * Stage clear: the leftover units blow up without rewards, except a live mid-boss, which is
   * never destroyed for free — an air capital ship starts its retreat (movement.ts) and leaves
   * the screen (no reward, flagged as escaped when it is gone), a surface one keeps drifting.
   */
  clearForStageEnd(): void {
    for (let k = this.list.length - 1; k >= 0; k--) {
      const e = this.list[k];
      if (e.isMidboss) {
        if (e.move === 'hover' && e.ms !== 2) {
          e.ms = 2;
          e.vy = Math.min(0, e.vy);
        }
        continue;
      }
      if (this.hittable(e)) this.kill(e, false);
      else this.remove(e);
    }
  }

  /** A mid-boss is on the field (it holds a level without a boss open, see flow.ts). */
  get midbossAlive(): boolean {
    return this.midboss !== null && this.midboss.active;
  }
}
