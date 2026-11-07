// =====================================================================================
//  HOMING — steering for seeker missiles and rockets (allocation-free).
//  Targets come from host.nearestTarget() (re-queried every RETARGET_MS per missile, the
//  returned object is copied immediately), queried from a point LOOK_S ahead of the
//  missile so a fanned volley spreads over several targets. The turn rate ramps up with
//  age so a missile that misses tightens its turn instead of orbiting its target forever.
// =====================================================================================
import type { ArsenalHost } from './api';
import type { Shot, ShotSpec } from './shots';
import { TAU } from './scaling';

const RETARGET_MS = 110;
const LOOK_S = 0.22;

/** Updates the velocity of a homing shot (accelerate + turn towards its target). */
export function steer(s: Shot, sp: ShotSpec, dt: number, dtMs: number, host: ArsenalHost): void {
  let speed = s.speed + sp.accel * dt;
  if (speed > sp.maxSpeed) speed = sp.maxSpeed;
  let ang = Math.atan2(s.vy, s.vx);
  if (s.age >= sp.launchMs) {
    s.retarget -= dtMs;
    if (s.hasTarget) {
      const dx = s.tx - s.x, dy = s.ty - s.y;
      if (dx * dx + dy * dy < 64) s.retarget = 0; // reached the last known position: look again
    }
    if (s.retarget <= 0) {
      s.retarget = RETARGET_MS;
      const t = host.nearestTarget(s.x + s.vx * LOOK_S, s.y + s.vy * LOOK_S, sp.seekRange);
      if (t) {
        s.tx = t.x;
        s.ty = t.y;
        s.hasTarget = true;
      } else {
        s.hasTarget = false;
      }
    }
    if (s.hasTarget) {
      const want = Math.atan2(s.ty - s.y, s.tx - s.x);
      let d = want - ang;
      d -= TAU * Math.floor((d + Math.PI) / TAU);
      const ageBoost = 1 + (s.age - sp.launchMs) / 700;
      const maxTurn = sp.turnRate * ageBoost * dt;
      ang += d > maxTurn ? maxTurn : d < -maxTurn ? -maxTurn : d;
    }
  }
  s.speed = speed;
  s.vx = Math.cos(ang) * speed;
  s.vy = Math.sin(ang) * speed;
}
