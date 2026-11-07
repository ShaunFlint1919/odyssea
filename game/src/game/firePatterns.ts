// =====================================================================================
//  ENEMY FIRE PATTERNS — every FirePattern of src/types.ts, shared by enemies, boss
//  attacks and boss parts. A FireState holds the cadence and the multi-step volleys
//  (burst, spiral stream). Difficulty scales the fire rate and the bullet speed.
// =====================================================================================
import { SHOT_RGB } from '../art/keys';
import type { FirePattern, ShotColor } from '../types';
import type { LaserOwner } from './enemyBullets';
import { KIND_FLAK, KIND_MISSILE, KIND_PLAIN } from './enemyBullets';
import type { World } from './world';

/** What to fire (EnemyDef fields or a BossAttack). */
export interface FireSpec {
  fire: FirePattern;
  rate: number;          // volleys per second
  bulletSpeed: number;
  bulletSprite: string;
  bulletColor: ShotColor;
}

const SPREAD_STEP = 0.25;
const BURST_GAP = 0.09;
/** Angle advance per spiral bullet (rad): ~15 bullets per turn. */
const SPIRAL_STEP = 0.42;

export class FireState {
  cd = 0;
  burst = 0;
  burstCd = 0;
  spiral = 0;
  spinDir = 1;
  ring = 0;

  /** Reset for a new owner: first volley after a random 35-100 % of the interval. */
  reset(rate: number, rnd: () => number): void {
    const r = rate > 0 ? rate : 1;
    this.cd = (0.35 + rnd() * 0.65) / r;
    this.burst = 0;
    this.burstCd = 0;
    this.spiral = rnd() * Math.PI * 2;
    this.spinDir = rnd() < 0.5 ? -1 : 1;
    this.ring = rnd() * Math.PI;
  }
}

/**
 * Advance a FireState and fire volleys from (x, y). `armed` = allowed to shoot now (on
 * screen, ship alive...); while unarmed the cadence is frozen. Returns true when a volley
 * (or burst step) was fired this call. Semantics of `rate`: volleys per second, except
 * 'spiral' where it is the number of bullets per second of the rotating stream.
 */
export function updateFire(
  w: World, st: FireState, spec: FireSpec, x: number, y: number, dt: number, armed: boolean, owner: LaserOwner | null,
): boolean {
  const pattern = spec.fire;
  if (pattern === 'none' || !armed) return false;
  const rate = spec.rate * w.diff.fireRate;
  if (rate <= 0) return false;
  const speed = spec.bulletSpeed * w.diff.bulletSpeed;
  const b = w.bullets;
  const sx = w.ship.x, sy = w.ship.y;
  let fired = false;
  if (st.burst > 0) {
    st.burstCd -= dt;
    if (st.burstCd <= 0) {
      b.fire(x, y, Math.atan2(sy - y, sx - x), speed, spec.bulletSprite, spec.bulletColor, KIND_PLAIN);
      st.burst--;
      st.burstCd = BURST_GAP;
      fired = true;
    }
  }
  st.cd -= dt;
  if (st.cd > 0) return fired;
  // spiral = an even rotating stream (rate = bullets / s); other patterns get a +-10 % jitter
  st.cd += pattern === 'spiral' ? 1 / rate : (0.9 + w.rng() * 0.2) / rate;
  if (st.cd < 0) st.cd = 0.05;
  const aim = Math.atan2(sy - y, sx - x);
  const spr = spec.bulletSprite, col = spec.bulletColor;
  switch (pattern) {
    case 'aimed':
      b.fire(x, y, aim, speed, spr, col);
      break;
    case 'burst':
      b.fire(x, y, aim, speed, spr, col);
      st.burst = 2;
      st.burstCd = BURST_GAP;
      break;
    case 'spread3':
      for (let k = -1; k <= 1; k++) b.fire(x, y, aim + k * SPREAD_STEP, speed, spr, col);
      break;
    case 'spread5':
      for (let k = -2; k <= 2; k++) b.fire(x, y, aim + k * SPREAD_STEP, speed, spr, col);
      break;
    case 'down':
      b.fire(x, y, Math.PI / 2, speed, spr, col);
      break;
    case 'ring8':
      for (let k = 0; k < 8; k++) b.fire(x, y, st.ring + (k * Math.PI) / 4, speed, spr, col);
      st.ring += Math.PI / 8;
      break;
    case 'ring16':
      for (let k = 0; k < 16; k++) b.fire(x, y, st.ring + (k * Math.PI) / 8, speed, spr, col);
      st.ring += Math.PI / 16;
      break;
    case 'spiral':
      b.fire(x, y, st.spiral, speed, spr, col);
      st.spiral += SPIRAL_STEP * st.spinDir;
      break;
    case 'laser':
      if (owner) b.startLaser(owner, col, 0.75, Math.min(1.2, 0.55 + 0.6 / rate));
      break;
    case 'flak':
      b.fire(x, y, aim, speed, spr, col, KIND_FLAK);
      break;
    case 'missile':
      b.fire(x, y, aim + (w.rng() - 0.5) * 0.6, speed, 'eb_missile', col, KIND_MISSILE);
      break;
  }
  if (pattern !== 'laser') {
    w.services.sfx('enemy_shot');
    if (pattern !== 'spiral') w.fx.glow(x, y, SHOT_RGB[col].glow, 0.42, 90);
  }
  return true;
}
