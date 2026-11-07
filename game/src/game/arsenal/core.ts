// =====================================================================================
//  ARSENAL CORE — the Arsenal implementation (contract: ./api.ts). Composes the front
//  gun, rear gun (mode A/B), two sidekick drones, the pooled player shots and three FX
//  pools. update() is allocation-free.
//
//  Layout: weapons/base.ts (cadence, energy, density), weapons/frontGuns.ts,
//  weapons/rearGuns.ts, drones.ts (sidekicks), projectiles.ts (PlayerShot pool),
//  steering.ts (homing), effects.ts (FX pools), art.ts (procedural textures), looks.ts
//  (impact / muzzle composites), scaling.ts (power formulas), textures.ts (texture
//  lookups + stand-ins), env.ts (object factory + fixed-depth image groups), defs.ts.
//
//  Depths (relative to ArsenalDepths): smoke shots-0.4 < halos shots-0.2 < bodies shots <
//  sidekick beam / glows / ward shots+0.15..0.4 < impacts shots+0.5 < muzzles shots+0.6
//  (all below the enemy bullets in game: player fire never hides them); only the drone
//  sprites sit at `sidekicks` (their hull covers the base of their muzzle flashes).
// =====================================================================================
import Phaser from 'phaser';
import type { Loadout, WeaponDef } from '../../types';
import { HULL_MOUNTS } from '../../art/player';
import type { Arsenal, ArsenalBlocker, ArsenalDepths, ArsenalHost, PlayerShot } from './api';
import { ANCHOR_LEFT, ANCHOR_RIGHT, type ArsenalEnv } from './env';
import { FxPool } from './effects';
import { ShotPool } from './projectiles';
import { SidekickUnit } from './drones';
import { clampPower } from './scaling';
import { FALLBACK_FRONT, findSidekick, findWeapon } from './defs';
import { createFrontGun, isFrontPattern } from './weapons/frontGuns';
import { createRearGun, isRearPattern } from './weapons/rearGuns';
import type { ArsenalCore, WeaponGun } from './weapons/base';

/** Extra construction options (used by the shop preview). */
export interface ArsenalOptions {
  /** Create every game object inside this layer (clipped preview window). */
  layer?: Phaser.GameObjects.Layer | null;
  /** Pre-allocated player shots (default 400; the pool grows if needed). */
  poolSize?: number;
  /**
   * Generate, on every setLoadout(), the art of every power level above the current one
   * (and both rear modes) so in-level power-ups never generate textures mid-fight.
   * Default true; the shop preview turns it off (it only shows the selected level).
   */
  prewarm?: boolean;
}

/** Live object counts (debug / perf overlays). */
export interface ArsenalCounts {
  shots: number;
  fx: number;
  smoke: number;
  muzzles: number;
}

const DEFAULT_NOSE: readonly [number, number] = [0, -14];

export class ArsenalImpl implements Arsenal, ArsenalCore {
  readonly env: ArsenalEnv;
  readonly host: ArsenalHost;
  readonly shots: ShotPool;
  readonly fx: FxPool;
  readonly smoke: FxPool;
  readonly muzzles: FxPool;
  noseX = 0;
  noseY = -14;
  frontStarved = false;

  private loadout: Loadout;
  private frontDef: WeaponDef = FALLBACK_FRONT;
  private rearDef: WeaponDef | null = null;
  private front: WeaponGun | null = null;
  private rear: WeaponGun | null = null;
  private readonly frontGuns = new Map<string, WeaponGun>();
  private readonly rearGuns = new Map<string, WeaponGun>();
  private readonly left: SidekickUnit;
  private readonly right: SidekickUnit;
  private mode: 0 | 1 = 0;
  private fPower = 1;
  private rPower = 1;
  private boost = 0;
  private destroyed = false;
  private readonly prewarmArt: boolean;
  private readonly counts: ArsenalCounts = { shots: 0, fx: 0, smoke: 0, muzzles: 0 };

  constructor(host: ArsenalHost, loadout: Loadout, depths: ArsenalDepths, opts: ArsenalOptions) {
    this.host = host;
    this.env = { scene: host.scene, host, depths, layer: opts.layer ?? null };
    const pool = Math.max(32, opts.poolSize ?? 400);
    this.prewarmArt = opts.prewarm ?? true;
    // FX pools grow on demand: create only a typical load up front (idle images cost per frame)
    this.fx = new FxPool(this.env, depths.shots + 0.5, Phaser.BlendModes.ADD, this, Math.ceil(pool * 0.12));
    this.smoke = new FxPool(this.env, depths.shots - 0.4, Phaser.BlendModes.NORMAL, this, Math.ceil(pool * 0.04));
    this.muzzles = new FxPool(this.env, depths.shots + 0.6, Phaser.BlendModes.ADD, this, 16);
    this.shots = new ShotPool(this.env, this.fx, this.smoke, this, pool);
    this.left = new SidekickUnit(this, -1);
    this.right = new SidekickUnit(this, 1);
    this.loadout = { ...loadout };
    this.setLoadout(loadout);
  }

  // ---------------------------------------------------------------- AnchorSource

  anchorX(anchor: number): number {
    return anchor === ANCHOR_LEFT ? this.left.x : anchor === ANCHOR_RIGHT ? this.right.x : this.host.shipX();
  }

  anchorY(anchor: number): number {
    return anchor === ANCHOR_LEFT ? this.left.y : anchor === ANCHOR_RIGHT ? this.right.y : this.host.shipY();
  }

  // ---------------------------------------------------------------- Arsenal

  update(dtMs: number, firing: boolean): void {
    if (this.destroyed) return;
    const dt = dtMs > 100 ? 100 : dtMs > 0 ? dtMs : 0;
    const canFire = this.host.canFire();
    const active = firing && canFire;
    if (this.front) this.front.update(dt, active, canFire);
    if (this.rear) this.rear.update(dt, active, canFire);
    this.left.update(dt, active);
    this.right.update(dt, active);
    this.shots.update(dt);
    this.fx.update(dt);
    this.smoke.update(dt);
    this.muzzles.update(dt);
  }

  setLoadout(loadout: Loadout): void {
    if (this.destroyed) return;
    this.loadout = { ...loadout };
    const mount = HULL_MOUNTS[loadout.hull];
    const nose = mount ? mount.nose : DEFAULT_NOSE;
    this.noseX = nose[0];
    this.noseY = nose[1];

    const f = findWeapon(loadout.front);
    this.frontDef = f && f.slot === 'front' && isFrontPattern(f.pattern) ? f : FALLBACK_FRONT;
    const r = findWeapon(loadout.rear);
    this.rearDef = r && r.slot === 'rear' && isRearPattern(r.pattern) ? r : null;
    this.left.configure(findSidekick(loadout.sidekickL));
    this.right.configure(findSidekick(loadout.sidekickR));
    this.configureFront();
    this.configureRear();
    if (this.prewarmArt) {
      // generate every texture an in-level power-up or rear toggle could need, now
      if (this.front) this.front.prewarm();
      if (this.rear) this.rear.prewarm();
    }
    if (this.front) this.front.reset();
    if (this.rear) this.rear.reset();
    this.frontStarved = false;
  }

  private configureFront(): void {
    const def = this.frontDef;
    this.fPower = clampPower(this.loadout.frontPower + this.boost);
    let gun = this.frontGuns.get(def.pattern);
    if (!gun) {
      gun = createFrontGun(this, isFrontPattern(def.pattern) ? def.pattern : 'pulse');
      this.frontGuns.set(def.pattern, gun);
    }
    gun.configure(def, this.fPower, 0);
    this.front = gun;
  }

  private configureRear(): void {
    const def = this.rearDef;
    this.rPower = clampPower(this.loadout.rearPower);
    if (!def || !isRearPattern(def.pattern)) {
      this.rear = null;
      return;
    }
    let gun = this.rearGuns.get(def.pattern);
    if (!gun) {
      gun = createRearGun(this, def.pattern);
      this.rearGuns.set(def.pattern, gun);
    }
    gun.configure(def, this.rPower, this.mode);
    this.rear = gun;
  }

  get rearMode(): 0 | 1 {
    return this.mode;
  }

  toggleRearMode(): 0 | 1 {
    this.mode = this.mode === 0 ? 1 : 0;
    this.configureRear();
    return this.mode;
  }

  get frontPower(): number {
    return this.fPower;
  }

  get rearPower(): number {
    return this.rPower;
  }

  boostFrontPower(levels: number): number {
    if (this.destroyed || !(levels > 0)) return this.fPower;
    const before = this.fPower;
    this.boost += Math.round(levels);
    const after = clampPower(this.loadout.frontPower + this.boost);
    if (after !== before) this.configureFront();
    return this.fPower;
  }

  forEachShot(cb: (shot: PlayerShot) => void): void {
    this.shots.forEach(cb);
  }

  forEachBlocker(cb: (blocker: ArsenalBlocker) => void): void {
    if (this.left.blocking) cb(this.left.blocker);
    if (this.right.blocking) cb(this.right.blocker);
  }

  get shotCount(): number {
    return this.shots.count;
  }

  /** Live object counts (debug / perf overlays; the returned object is reused). */
  debugCounts(): Readonly<ArsenalCounts> {
    const c = this.counts;
    c.shots = this.shots.count;
    c.fx = this.fx.count;
    c.smoke = this.smoke.count;
    c.muzzles = this.muzzles.count;
    return c;
  }

  clearShots(): void {
    if (this.front) this.front.cancelPending();
    if (this.rear) this.rear.cancelPending();
    this.shots.clear();
    this.fx.clear();
    this.smoke.clear();
    this.muzzles.clear();
    this.left.resetCharge();
    this.right.resetCharge();
  }

  setVisible(visible: boolean): void {
    this.left.setVisible(visible);
    this.right.setVisible(visible);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.shots.destroy();
    this.fx.destroy();
    this.smoke.destroy();
    this.muzzles.destroy();
    this.left.destroy();
    this.right.destroy();
    this.frontGuns.clear();
    this.rearGuns.clear();
    this.front = null;
    this.rear = null;
  }
}
