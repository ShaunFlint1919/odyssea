// =====================================================================================
//  ARSENAL CONTRACT — between the WORLD (GameScene, ship movement, energy/shield/armor,
//  enemies, collisions) and the ARSENAL (front/rear weapons, sidekicks, player shots).
//
//  - The World owns the ship (position, energy, damage) and calls createArsenal(host, ...).
//  - The Arsenal owns weapon cadence, power scaling, patterns, homing, sidekick sprites,
//    muzzle flashes, player projectile pools and their impact visuals.
//  - Collisions are done by the World: it iterates forEachShot() against enemies, applies
//    shot.damage (+ splash), and calls shot.impact(x, y) for shots that must end.
//  - Implemented in src/game/arsenal/index.ts (createArsenal). The shop preview
//    (src/game/preview.ts) reuses createArsenal with a fake host.
// =====================================================================================
import type Phaser from 'phaser';
import type { Loadout, SfxKey } from '../../types';

/** Services the World provides to the Arsenal. All methods must be allocation-free. */
export interface ArsenalHost {
  readonly scene: Phaser.Scene;
  /** Ship centre in game px (the World moves the ship; the Arsenal only reads it). */
  shipX(): number;
  shipY(): number;
  /** False while the ship is dead / exploding / in a cut-scene: weapons stop firing. */
  canFire(): boolean;
  /** Draw `amount` generator energy for one volley. false = not enough energy -> skip the volley. */
  trySpendEnergy(amount: number): boolean;
  /**
   * Nearest valid target (enemy centre) for homing weapons within maxDist of (x, y), or null.
   * May return a reused object: copy x/y immediately.
   */
  nearestTarget(x: number, y: number, maxDist: number): Readonly<{ x: number; y: number }> | null;
  /** Play a sound effect (the audio module rate-limits). */
  sfx(key: SfxKey): void;
  /** Playfield bounds used to cull shots (game px). */
  readonly bounds: { x: number; y: number; w: number; h: number };
}

/** A live player projectile (pooled — never keep a reference across frames). */
export interface PlayerShot {
  readonly x: number;
  readonly y: number;
  /** Collision radius in px. */
  readonly radius: number;
  /** Damage of one hit (power scaling already applied). */
  readonly damage: number;
  /** > 0: on impact the World also applies `damage` to every enemy within this radius (px). */
  readonly splash: number;
  /** true: the shot keeps flying after a hit (beams, shards). */
  readonly pierce: boolean;
  /**
   * For piercing shots: returns true if this shot ALREADY hit `enemyId` (World must skip it);
   * otherwise records the hit and returns false. Non-piercing shots always return false.
   */
  registerHit(enemyId: number): boolean;
  /** End the shot at (x, y): impact visuals, splitting (prism), recycling. Call once. */
  impact(x: number, y: number): void;
}

/** A circle that destroys enemy bullets it touches and damages enemies in contact (orbiter). */
export interface ArsenalBlocker {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  /** Contact damage per second applied by the World to overlapping enemies. */
  readonly contactDps: number;
}

export interface Arsenal {
  /** Advance cadence, energy draw, homing, sidekick motion, projectiles. dtMs = scaled frame time. */
  update(dtMs: number, firing: boolean): void;
  /** Replace the whole loadout (weapons, power levels, sidekicks). */
  setLoadout(loadout: Loadout): void;
  /** Rear gun mode: 0 = mode A, 1 = mode B. */
  readonly rearMode: 0 | 1;
  toggleRearMode(): 0 | 1;
  /** Effective power levels this level (loadout power + in-level 'power' pickups, capped at MAX_POWER). */
  readonly frontPower: number;
  readonly rearPower: number;
  /** In-level power boost from a 'power' pickup (+levels to the front gun, capped). Returns the new front power. */
  boostFrontPower(levels: number): number;
  /** Iterate active shots for collision (no allocation). Shots ended inside the callback are safe. */
  forEachShot(cb: (shot: PlayerShot) => void): void;
  /** Iterate active bullet blockers (orbiter sidekicks). */
  forEachBlocker(cb: (blocker: ArsenalBlocker) => void): void;
  /** Number of active shots (debug / perf HUD). */
  readonly shotCount: number;
  /** Remove every shot immediately (level end, death). */
  clearShots(): void;
  /** Show / hide the sidekick sprites (e.g. during the ship's death). */
  setVisible(visible: boolean): void;
  destroy(): void;
}

export interface ArsenalDepths {
  shots: number;      // DEPTH.playerShots in game, anything inside a preview
  sidekicks: number;  // DEPTH.player in game
  shadows: number;    // DEPTH.shadows (sidekick ground shadows); use -1 to disable shadows
}

export type CreateArsenal = (host: ArsenalHost, loadout: Loadout, depths: ArsenalDepths) => Arsenal;
