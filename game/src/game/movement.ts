// =====================================================================================
//  ENEMY MOVEMENT — every MovePattern of src/types.ts. initMove() sets the pattern state
//  when an enemy spawns, stepMove() advances it (dt in seconds). Patterns write x, y,
//  vx, vy and the desired sprite rotation (targetRot; sprites face DOWN at rotation 0).
//  Ground / sea units move relative to the terrain (the scroll speed is added).
// =====================================================================================
import { H, PLAY_W } from '../config';
import type { Enemy } from './enemies';
import type { World } from './world';
import { angleDiff, clamp } from './world';

const HALF_PI = Math.PI / 2;
const SINE_AMP = 30;
const SINE_FREQ = 2.6;
const CIRCLE_R = 30;
const HOVER_TIME = 5;
const MIDBOSS_HOVER_TIME = 45;

function face(e: Enemy, vx: number, vy: number): void {
  if (vx !== 0 || vy !== 0) e.targetRot = Math.atan2(vy, vx) - HALF_PI;
}

/** Initialise the pattern state of a freshly spawned enemy. */
export function initMove(e: Enemy, w: World): void {
  const s = e.speed;
  const r = w.rng;
  e.mt = 0;
  e.ms = 0;
  e.mtimer = 0;
  e.targetRot = 0;
  e.spin = 0;
  e.vx = 0;
  e.vy = s;
  switch (e.move) {
    case 'straight':
      break;
    case 'sine':
      e.mx0 = clamp(e.x, SINE_AMP + e.radius, PLAY_W - SINE_AMP - e.radius);
      e.mph = e.dir > 0 ? 0 : Math.PI;
      break;
    case 'dive':
      e.vy = s * 1.1;
      e.my0 = H * (0.14 + r() * 0.14);
      break;
    case 'swoopL':
    case 'swoopR':
      e.mh = HALF_PI;
      break;
    case 'zigzag':
      e.mtimer = 0.35 + r() * 0.25;
      break;
    case 'hover':
      e.my0 = e.isMidboss ? H * 0.2 : H * (0.12 + r() * 0.18);
      e.mtimer = e.isMidboss ? MIDBOSS_HOVER_TIME : HOVER_TIME + r() * 2;
      break;
    case 'strafe':
      e.vx = e.dir * s;
      e.vy = s * 0.16;
      face(e, e.vx, e.vy);
      e.rot = e.targetRot;
      break;
    case 'circle':
      e.mx0 = clamp(e.x, CIRCLE_R + e.radius, PLAY_W - CIRCLE_R - e.radius);
      e.my0 = e.y + CIRCLE_R;
      e.mph = -HALF_PI;
      break;
    case 'chase':
      e.mh = HALF_PI;
      break;
    case 'ground':
      e.vy = w.scrollSpeed;
      break;
    case 'groundMove': {
      const side = e.x < PLAY_W * 0.32 ? 1 : e.x > PLAY_W * 0.68 ? -1 : 0;
      e.mh = side > 0 ? 0.28 : side < 0 ? Math.PI - 0.28 : HALF_PI;
      e.targetRot = e.rot = e.mh - HALF_PI;
      break;
    }
    case 'drift':
      e.vx = (r() - 0.5) * s * 0.7;
      e.vy = w.scrollSpeed * 0.45 + s * (0.5 + r() * 0.5);
      if (e.def.sprite.startsWith('hz_rock')) e.spin = (r() - 0.5) * 2.2;
      break;
    case 'rise':
      e.vy = -s;
      e.targetRot = e.rot = Math.PI;
      break;
  }
}

/** Advance the movement pattern by dt seconds. */
export function stepMove(e: Enemy, w: World, dt: number): void {
  const s = e.speed;
  e.mt += dt;
  const ship = w.ship;
  switch (e.move) {
    case 'straight':
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      break;
    case 'sine': {
      const nx = e.mx0 + SINE_AMP * Math.sin(e.mt * SINE_FREQ + e.mph);
      e.vx = (nx - e.x) / Math.max(dt, 1e-4);
      e.x = nx;
      e.vy = s;
      e.y += s * dt;
      break;
    }
    case 'dive':
      if (e.ms === 0) {
        e.y += e.vy * dt;
        if (e.y >= e.my0) {
          e.ms = 1;
          e.mtimer = 0.45;
          e.vy = 0;
        }
      } else if (e.ms === 1) {
        // brief pause, nose turning toward the player (telegraph)
        e.mtimer -= dt;
        e.targetRot = Math.atan2(ship.y - e.y, ship.x - e.x) - HALF_PI;
        if (e.mtimer <= 0) {
          e.ms = 2;
          const a = Math.atan2(ship.y - e.y, ship.x - e.x);
          e.vx = Math.cos(a) * s * 2.4;
          e.vy = Math.sin(a) * s * 2.4;
          face(e, e.vx, e.vy);
        }
      } else {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
      break;
    case 'swoopL':
    case 'swoopR': {
      if (e.mt > 0.35) {
        const target = e.move === 'swoopL' ? Math.PI + 0.5 : -0.5;
        const d = target - e.mh;
        const step = 1.55 * dt;
        e.mh += Math.abs(d) < step ? d : Math.sign(d) * step;
      }
      e.vx = Math.cos(e.mh) * s;
      e.vy = Math.sin(e.mh) * s;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      face(e, e.vx, e.vy);
      break;
    }
    case 'zigzag': {
      e.mtimer -= dt;
      if (e.mtimer <= 0 || (e.x < e.radius + 4 && e.dir < 0) || (e.x > PLAY_W - e.radius - 4 && e.dir > 0)) {
        e.dir = -e.dir;
        e.mtimer = 0.55;
      }
      e.vx = e.dir * s * 0.85;
      e.vy = s * 0.7;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.targetRot = clamp(Math.atan2(e.vy, e.vx) - HALF_PI, -0.6, 0.6);
      break;
    }
    case 'hover':
      if (e.ms === 0) {
        const v = Math.max(s * 0.5, (e.my0 - e.y) * 2.2);
        e.vy = v;
        e.y += v * dt;
        if (e.y >= e.my0) {
          e.ms = 1;
          e.vy = 0;
        }
      } else if (e.ms === 1) {
        const lim = e.radius + 6;
        e.vx = e.dir * s * 0.55;
        e.x += e.vx * dt;
        if ((e.x < lim && e.dir < 0) || (e.x > PLAY_W - lim && e.dir > 0)) e.dir = -e.dir;
        e.y = e.my0 + 3 * Math.sin(e.mt * 2);
        e.mtimer -= dt;
        if (e.mtimer <= 0) {
          e.ms = 2;
          e.vy = 0;
        }
      } else {
        e.vy = Math.min(s * 1.6, e.vy + 90 * dt);
        e.y += e.vy * dt;
      }
      break;
    case 'strafe':
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      break;
    case 'circle': {
      e.my0 += s * 0.4 * dt;
      e.mph += (s / CIRCLE_R) * e.dir * dt;
      const nx = e.mx0 + CIRCLE_R * Math.cos(e.mph);
      const ny = e.my0 + CIRCLE_R * Math.sin(e.mph);
      const idt = 1 / Math.max(dt, 1e-4);
      e.vx = (nx - e.x) * idt;
      e.vy = (ny - e.y) * idt;
      e.x = nx;
      e.y = ny;
      face(e, e.vx, e.vy);
      break;
    }
    case 'chase': {
      if (ship.alive && e.y < ship.y - 24) {
        const want = Math.atan2(ship.y - e.y, ship.x - e.x);
        const d = angleDiff(e.mh, want);
        const step = 1.8 * dt;
        e.mh += d > step ? step : d < -step ? -step : d;
      }
      e.vx = Math.cos(e.mh) * s;
      e.vy = Math.sin(e.mh) * s;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      face(e, e.vx, e.vy);
      break;
    }
    case 'ground':
      e.vx = 0;
      e.vy = w.scrollSpeed;
      e.y += e.vy * dt;
      break;
    case 'groundMove': {
      if ((e.x < e.radius + 6 && Math.cos(e.mh) < 0) || (e.x > PLAY_W - e.radius - 6 && Math.cos(e.mh) > 0)) e.ms = 1;
      if (e.ms === 1) {
        const d = HALF_PI - e.mh;
        const step = 1.2 * dt;
        e.mh += Math.abs(d) < step ? d : Math.sign(d) * step;
      }
      e.vx = Math.cos(e.mh) * s;
      e.vy = Math.sin(e.mh) * s + w.scrollSpeed;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.targetRot = e.mh - HALF_PI;
      break;
    }
    case 'drift':
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if ((e.x < e.radius && e.vx < 0) || (e.x > PLAY_W - e.radius && e.vx > 0)) e.vx = -e.vx;
      e.rot += e.spin * dt;
      e.targetRot = e.rot;
      break;
    case 'rise':
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      break;
  }
  // Ground / sea units on air patterns: the pattern is relative to the terrain.
  if (e.layer !== 'air' && !e.isMidboss && e.move !== 'ground' && e.move !== 'groundMove') {
    e.y += w.scrollSpeed * dt;
  }
}

/** True when the pattern is about to leave the screen upward on purpose (exit allowed at the top). */
export function exitsUp(e: Enemy): boolean {
  return e.move === 'rise' || e.move === 'swoopL' || e.move === 'swoopR' || (e.move === 'chase' && e.vy < 0)
    || (e.move === 'dive' && e.vy < 0) || (e.move === 'circle');
}
