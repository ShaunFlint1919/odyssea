// =====================================================================================
//  BALANCE MODEL — the numbers docs/BALANCE.md reasons with, as code so tests can hold the
//  content to them: credit curve, reference player DPS per planet, level statistics
//  (pacing, spawned hp, estimated credits). Pure functions, no Phaser.
// =====================================================================================
import type { BossDef, EnemyDef, LevelDef } from '../types';

/** Share of spawned enemies the economy assumes a player destroys. */
export const KILL_RATE = 0.7;
/** Credits targeted for the first and the last campaign level (geometric in between). */
export const CREDIT_CURVE = { first: 1500, last: 15000 };

/** Target credits of the i-th campaign level (0-based, `n` levels in total). */
export function targetLevelCredits(i: number, n = 24): number {
  return CREDIT_CURVE.first * Math.pow(CREDIT_CURVE.last / CREDIT_CURVE.first, i / Math.max(1, n - 1));
}

/**
 * Reference player firepower per planet (nominal DPS of front + rear + sidekicks for a
 * player who spends their credits sensibly, docs/BALANCE.md "Progression").
 */
export const REFERENCE_DPS = [45, 75, 100, 130, 165, 205, 250, 300];
/** Share of the nominal DPS that actually lands while dodging. */
export const DPS_UPTIME = 0.7;

export interface LevelStats {
  waves: number;
  /** wave start times clustered within 0.9 s = what the player perceives as one wave */
  beats: number;
  avgGap: number;
  maxGap: number;
  /** enemies spawned by waves (mirrored waves count twice) */
  spawned: number;
  spawnedHp: number;
  /** credits if every wave enemy is destroyed */
  creditsAll: number;
  /** KILL_RATE x wave credits + mid-boss + boss (always destroyed to finish) */
  estCredits: number;
  midbossHp: number;
  bossHp: number;
}

/** Pacing / economy statistics of a level. */
export function levelStats(
  level: LevelDef,
  enemy: (id: string) => EnemyDef | undefined,
  boss: (id: string) => BossDef | undefined,
): LevelStats {
  let spawned = 0, spawnedHp = 0, creditsAll = 0;
  for (const w of level.waves) {
    const e = enemy(w.enemy);
    if (!e) continue;
    const n = w.count * (w.mirror ? 2 : 1);
    spawned += n;
    spawnedHp += n * e.hp;
    creditsAll += n * e.credits;
  }
  const times = [...new Set(level.waves.map((w) => w.t))].sort((a, b) => a - b);
  const beatsT: number[] = [];
  for (const t of times) if (!beatsT.length || t - beatsT[beatsT.length - 1] > 0.9) beatsT.push(t);
  let maxGap = 0;
  for (let i = 1; i < beatsT.length; i++) maxGap = Math.max(maxGap, beatsT[i] - beatsT[i - 1]);
  const avgGap = beatsT.length > 1 ? (beatsT[beatsT.length - 1] - beatsT[0]) / (beatsT.length - 1) : 0;
  const mb = level.midboss ? enemy(level.midboss.enemy) : undefined;
  const bs = level.boss ? boss(level.boss) : undefined;
  return {
    waves: level.waves.length,
    beats: beatsT.length,
    avgGap,
    maxGap,
    spawned,
    spawnedHp,
    creditsAll,
    estCredits: Math.round(creditsAll * KILL_RATE + (mb?.credits ?? 0) + (bs?.credits ?? 0)),
    midbossHp: mb?.hp ?? 0,
    bossHp: bs?.hp ?? 0,
  };
}
