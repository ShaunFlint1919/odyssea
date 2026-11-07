// =====================================================================================
//  DIRECTOR — spawns LevelDef.waves on the level clock with every Formation (single, line,
//  column, v, wall, random, arc, pair), spacing / interval / mirror / move override, the
//  mid-boss at its time, and reports when every wave has been spawned. Streamed members
//  (column, single x count, random, pair) go through a fixed-size job queue.
//  Conventions (src/data/waves.ts): x in 0..1 across the playfield; strafe units enter
//  from the side nearest to x; rise units from the bottom edge.
// =====================================================================================
import { H, PLAY_W } from '../config';
import { ENEMY_SPRITES } from '../art/keys';
import type { EnemyDef, LevelDef, MovePattern, WaveDef } from '../types';
import type { World } from './world';
import { clamp } from './world';

const DEFAULT_SPACING = 24;
const DEFAULT_INTERVAL = 0.35;
const MAX_JOBS = 320;

class Job {
  at = 0;
  def!: EnemyDef;
  move: MovePattern = 'straight';
  x = 0;
  /** Lateral offset from the wave anchor (strafers use it as a vertical offset). */
  ox = 0;
  oy = 0;
  dir = 1;
  midboss = false;
}

const MIRROR_MOVE: Partial<Record<MovePattern, MovePattern>> = { swoopL: 'swoopR', swoopR: 'swoopL' };

export class Director {
  private readonly waves: WaveDef[];
  private next = 0;
  private readonly jobs: Job[] = [];
  private jobCount = 0;
  private midbossDone: boolean;
  /** Time of the last wave (s). */
  readonly lastWaveT: number;

  constructor(
    private readonly w: World,
    private readonly level: LevelDef,
    startT: number,
    private readonly getDef: (id: string) => EnemyDef | null,
  ) {
    this.waves = [...level.waves].sort((a, b) => a.t - b.t);
    for (let i = 0; i < MAX_JOBS; i++) this.jobs.push(new Job());
    // DEBUG.t fast-forward: waves before the start time are skipped without spawning.
    while (this.next < this.waves.length && this.waves[this.next].t < startT) this.next++;
    this.midbossDone = !level.midboss || level.midboss.t < startT;
    this.lastWaveT = this.waves.length ? this.waves[this.waves.length - 1].t : 0;
  }

  /** Every wave (and the mid-boss) has been spawned. */
  get done(): boolean {
    return this.next >= this.waves.length && this.jobCount === 0 && this.midbossDone;
  }

  update(): void {
    const t = this.w.time;
    while (this.next < this.waves.length && this.waves[this.next].t <= t) {
      this.launch(this.waves[this.next]);
      this.next++;
    }
    if (!this.midbossDone && this.level.midboss && t >= this.level.midboss.t) {
      this.midbossDone = true;
      this.spawnMidboss(this.level.midboss.enemy);
    }
    // due jobs
    for (let i = this.jobCount - 1; i >= 0; i--) {
      const j = this.jobs[i];
      if (j.at > t) continue;
      this.spawnJob(j);
      // swap-remove (keep the Job objects pooled)
      const last = this.jobs[this.jobCount - 1];
      this.jobs[this.jobCount - 1] = j;
      this.jobs[i] = last;
      this.jobCount--;
    }
  }

  private anchor = 0;

  private push(at: number, def: EnemyDef, move: MovePattern, x: number, oy: number, dir: number, midboss = false): void {
    if (this.jobCount >= MAX_JOBS) return;
    const j = this.jobs[this.jobCount++];
    j.at = at;
    j.def = def;
    j.move = move;
    j.x = x;
    j.ox = x - this.anchor;
    j.oy = oy;
    j.dir = dir;
    j.midboss = midboss;
  }

  private spawnMidboss(id: string): void {
    const def = this.getDef(id);
    if (!def) return;
    const w = this.w;
    w.services.banner('WARNING', def.name.toUpperCase(), 2200);
    w.services.sfx('warning');
    this.anchor = PLAY_W / 2;
    this.push(w.time + 1.2, def, 'hover', PLAY_W / 2, 0, 1, true);
  }

  /** Expand one wave into spawn jobs (with its mirrored copy). */
  private launch(wv: WaveDef): void {
    const def = this.getDef(wv.enemy);
    if (!def) return;
    this.expand(wv, def, wv.x, false);
    if (wv.mirror) this.expand(wv, def, 1 - wv.x, true);
  }

  private expand(wv: WaveDef, def: EnemyDef, ax: number, mirrored: boolean): void {
    const t0 = this.w.time;
    const n = Math.max(1, wv.count | 0);
    const sp = wv.spacing ?? DEFAULT_SPACING;
    const iv = wv.interval ?? DEFAULT_INTERVAL;
    let move: MovePattern = wv.move ?? def.move;
    if (mirrored && MIRROR_MOVE[move]) move = MIRROR_MOVE[move]!;
    const cx = ax * PLAY_W;
    this.anchor = cx;
    // horizontal sense: mirrored copies go the other way; strafers enter from the nearest side
    const dir = move === 'strafe' ? (ax < 0.5 ? 1 : -1) : mirrored ? -1 : 1;
    const rnd = this.w.rng;
    switch (wv.formation) {
      case 'single':
      case 'column':
        for (let k = 0; k < n; k++) this.push(t0 + k * iv, def, move, cx, 0, dir);
        break;
      case 'line':
        for (let k = 0; k < n; k++) this.push(t0, def, move, cx + (k - (n - 1) / 2) * sp, 0, dir);
        break;
      case 'v':
        for (let k = 0; k < n; k++) {
          const rank = Math.ceil(k / 2);
          const side = k === 0 ? 0 : k % 2 === 1 ? -1 : 1;
          this.push(t0, def, move, cx + side * rank * sp, rank * sp * 0.7, dir);
        }
        break;
      case 'wall':
        for (let k = 0; k < n; k++) {
          const span = Math.min(PLAY_W - 24, (n - 1) * sp);
          const x = n === 1 ? cx : PLAY_W / 2 - span / 2 + (span * k) / (n - 1);
          this.push(t0, def, move, x, 0, dir);
        }
        break;
      case 'random':
        for (let k = 0; k < n; k++) this.push(t0 + k * iv, def, move, 20 + rnd() * (PLAY_W - 40), rnd() * 16, rnd() < 0.5 ? -1 : 1);
        break;
      case 'arc': {
        const half = Math.min(1.2, 0.2 * (n - 1));
        const R = n > 1 ? ((n - 1) * sp) / (2 * half) : 0;
        for (let k = 0; k < n; k++) {
          const a = n === 1 ? 0 : -half + (2 * half * k) / (n - 1);
          // crescent: the middle leads, the tips trail behind (above)
          this.push(t0, def, move, cx + R * Math.sin(a), R * (1 - Math.cos(a)), dir);
        }
        break;
      }
      case 'pair': {
        const pairs = Math.ceil(n / 2);
        let left = n;
        for (let p = 0; p < pairs; p++) {
          this.push(t0 + p * iv, def, move, cx - sp / 2, 0, -1);
          left--;
          if (left > 0) {
            this.push(t0 + p * iv, def, move, cx + sp / 2, 0, 1);
            left--;
          }
        }
        break;
      }
    }
  }

  /** Place and spawn one job's enemy according to its movement entry rules. */
  private spawnJob(j: Job): void {
    const w = this.w;
    const def = j.def;
    const r = ((ENEMY_SPRITES as Record<string, number>)[def.sprite] ?? 16) / 2;
    let x = j.x, y: number;
    if (j.midboss) {
      x = PLAY_W / 2;
      y = -r - 4;
    } else if (j.move === 'strafe') {
      // enter from the side, formation depth becomes a horizontal offset
      x = j.dir > 0 ? -r - j.oy : PLAY_W + r + j.oy;
      y = clamp(H * 0.18 + j.ox, r + 8, H * 0.6);
    } else if (j.move === 'rise') {
      x = clamp(x, r + 2, PLAY_W - r - 2);
      y = H + r + j.oy;
    } else {
      x = clamp(x, r + 2, PLAY_W - r - 2);
      y = -r - j.oy;
    }
    w.enemies.spawn(def, x, y, j.move, j.dir, j.midboss ? { midboss: true } : undefined);
  }

  /** Remaining time-ordered waves (debug). */
  get pending(): number {
    return this.waves.length - this.next + this.jobCount;
  }
}
