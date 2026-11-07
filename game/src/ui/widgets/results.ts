// =====================================================================================
//  RESULTS — shared logic of the LevelEnd / GameOver screens: LevelResult validation, the
//  "apply exactly once" guard around applyLevelResult(), level labels and the rows board.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS } from '../../config';
import type { LevelDef, LevelResult, PlanetDef } from '../../types';
import { getSave } from '../../state/save';
import { applyLevelResult } from '../../state/progress';
import { LEVELS, PLANETS, levelOrder } from '../../data';
import { text, type FontSize } from '../kit';
import { Tally } from './Tally';
import { fmtInt } from './util';

/** True when `x` looks like a LevelResult sent by the Game scene. */
export function isLevelResult(x: unknown): x is LevelResult {
  const r = x as Partial<LevelResult> | null | undefined;
  return !!r && typeof r === 'object' && typeof r.levelId === 'string' && typeof r.completed === 'boolean';
}

/** Numeric fields sanitised for display (the original object is what gets applied). */
export function normalizeResult(r: LevelResult): LevelResult {
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0);
  return {
    levelId: r.levelId,
    completed: r.completed,
    kills: Math.floor(n(r.kills)),
    spawned: Math.floor(n(r.spawned)),
    creditsEarned: Math.floor(n(r.creditsEarned)),
    score: Math.floor(n(r.score)),
    intelFound: Array.isArray(r.intelFound) ? r.intelFound.filter((s) => typeof s === 'string') : [],
    timeSeconds: n(r.timeSeconds),
    bossDefeated: !!r.bossDefeated,
  };
}

/** A plausible result for screens opened without data (debug ?scene=LevelEnd): never applied. */
export function demoResult(completed: boolean): LevelResult {
  const id = getSave().currentLevel || levelOrder()[0] || 'kessra-1';
  return {
    levelId: id, completed, kills: completed ? 46 : 21, spawned: 52, creditsEarned: completed ? 1840 : 760,
    score: completed ? 24650 : 9120, intelFound: [], timeSeconds: completed ? 161 : 74, bossDefeated: false,
  };
}

export interface AppliedResult {
  applied: boolean;
  unlocked: string[];
  newIntel: string[];
  creditsBefore: number;
  creditsAfter: number;
  bestBefore: number;
  /** The level was already completed before this result (a replay). */
  completedBefore: boolean;
}

let lastAppliedSig = '';

/**
 * Calls applyLevelResult(result) once per distinct result (a scene restart with the same
 * result object does not apply it twice). `real` = false (demo data) never touches the save.
 */
export function applyOnce(result: LevelResult, real: boolean): AppliedResult {
  const save = getSave();
  const creditsBefore = save.credits;
  const bestBefore = save.bestScores[result.levelId] ?? 0;
  const completedBefore = save.completedLevels.includes(result.levelId);
  const out: AppliedResult = {
    applied: false, unlocked: [], newIntel: [], creditsBefore, creditsAfter: creditsBefore, bestBefore, completedBefore,
  };
  if (!real) {
    out.creditsAfter = creditsBefore + (result.completed ? result.creditsEarned : Math.floor(result.creditsEarned / 2));
    out.newIntel = result.intelFound.slice();
    return out;
  }
  let sig = '';
  try { sig = JSON.stringify(result); } catch { sig = `${result.levelId}:${Math.random()}`; }
  if (sig === lastAppliedSig) return out;
  lastAppliedSig = sig;
  const r = applyLevelResult(result);
  out.applied = true;
  out.unlocked = r.unlocked;
  out.newIntel = r.newIntel;
  out.creditsAfter = getSave().credits;
  return out;
}

export interface LevelInfo { level?: LevelDef; planet?: PlanetDef; label: string }

/** Level + planet lookup (tolerant of unknown ids) and a display label "KESSRA 1 - DUNE RUN". */
export function levelInfo(levelId: string): LevelInfo {
  const level = LEVELS.find((l) => l.id === levelId);
  const planet = level ? PLANETS.find((p) => p.id === level.planet) : undefined;
  if (!level) return { label: levelId.toUpperCase() };
  return { level, planet, label: `${(planet?.name ?? level.planet).toUpperCase()} ${level.index} - ${level.name.toUpperCase()}` };
}

/** True when `levelId` is the last level of its planet. */
export function isPlanetFinale(info: LevelInfo): boolean {
  const lv = info.level;
  const p = info.planet;
  return !!lv && !!p && p.levels[p.levels.length - 1] === lv.id;
}

// ------------------------------------------------------------------------------ board rows

export interface BoardRow {
  label: string;
  /** Numeric values roll up with a Tally; strings appear as is. */
  value: number | string;
  from?: number;
  format?: (n: number) => string;
  color?: number;
  labelColor?: number;
  icon?: string;
}

/**
 * Rows of "LABEL ........ VALUE" revealed one at a time (label slides in, value rolls up).
 * Call reveal(i, instant) from a Sequence; skipAll() finalises everything.
 */
export class Board {
  readonly container: Phaser.GameObjects.Container;
  private readonly labels: Phaser.GameObjects.Container[] = [];
  private readonly tallies: (Tally | null)[] = [];
  private readonly statics: (Phaser.GameObjects.BitmapText | null)[] = [];

  constructor(
    private readonly scene: Phaser.Scene, x: number, y: number, private readonly width: number,
    private readonly rows: BoardRow[], private readonly rowH = 20, private readonly size: FontSize = 'm',
  ) {
    this.container = scene.add.container(Math.round(x), Math.round(y));
    const mid = Math.round(rowH / 2);
    rows.forEach((r, i) => {
      const y0 = i * rowH;
      const lab = scene.add.container(0, y0);
      let lx = 0;
      if (r.icon && scene.textures.exists(r.icon)) {
        lab.add(scene.add.image(0, mid, r.icon).setOrigin(0, 0.5));
        lx = 14;
      }
      lab.add(text(scene, lx, mid, r.label, { size, color: r.labelColor ?? COLORS.textDim, originY: 0.5 }));
      const dots = scene.add.graphics();
      dots.fillStyle(COLORS.panelLight, 0.8);
      const dotStart = lx + r.label.length * (size === 's' ? 6 : 8) + 6;
      for (let dx = dotStart; dx < width - 70; dx += 4) dots.fillRect(dx, mid + 3, 1, 1);
      lab.add(dots);
      lab.setAlpha(0);
      this.container.add(lab);
      this.labels.push(lab);
      if (typeof r.value === 'number') {
        const t = new Tally(scene, width, y0 + mid, {
          to: r.value, from: r.from ?? 0, format: r.format ?? fmtInt, color: r.color ?? COLORS.text, size,
        });
        t.text.setAlpha(0);
        this.container.add(t.text);
        this.tallies.push(t);
        this.statics.push(null);
      } else {
        const s = text(scene, width, y0 + mid, r.value, { size, color: r.color ?? COLORS.text, originX: 1, originY: 0.5 });
        s.setAlpha(0);
        this.container.add(s);
        this.tallies.push(null);
        this.statics.push(s);
      }
    });
  }

  get height(): number { return this.rows.length * this.rowH; }
  get count(): number { return this.rows.length; }

  /** Show row `i` (animated unless `instant`). */
  reveal(i: number, instant: boolean): void {
    const lab = this.labels[i];
    if (!lab) return;
    const t = this.tallies[i];
    const s = this.statics[i];
    if (instant) {
      this.scene.tweens.killTweensOf(lab);
      lab.setAlpha(1).setX(0);
      if (t) { t.text.setAlpha(1); t.skip(); }
      if (s) s.setAlpha(1);
      return;
    }
    lab.setX(-10);
    this.scene.tweens.add({ targets: lab, x: 0, alpha: 1, duration: 160, ease: 'Quad.easeOut' });
    if (t) { t.text.setAlpha(1); t.start(); }
    if (s) { s.setAlpha(0); this.scene.tweens.add({ targets: s, alpha: 1, duration: 160 }); }
  }

  /** Finalise every row. */
  skipAll(): void {
    for (let i = 0; i < this.labels.length; i++) this.reveal(i, true);
  }

  /** The value text of row `i` (for attaching badges next to it). */
  valueText(i: number): Phaser.GameObjects.BitmapText | null {
    return this.tallies[i]?.text ?? this.statics[i] ?? null;
  }
}
