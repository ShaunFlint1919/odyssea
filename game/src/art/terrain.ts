import type { Biome } from '../types';
import { CH, Chunk, Pool, type Step } from './b_ter_core';
import { planDesert } from './b_ter_desert';
import { planJungle } from './b_ter_jungle';
import { planOcean } from './b_ter_ocean';
import { planCavern } from './b_ter_cavern';
import { planSpace } from './b_ter_space';
import { planLava } from './b_ter_lava';
import { planIce } from './b_ter_ice';
import { planTechno } from './b_ter_techno';

/** A decoration sprite placed on a terrain chunk (coordinates are inside the chunk canvas). */
export interface DoodadPlacement {
  key: string;      // a DOODAD_SPRITES key
  x: number;        // centre x in px (0..width)
  y: number;        // centre y in px (0..CHUNK_H, 0 = top of the chunk)
  flipX?: boolean;
  scale?: number;
}

export interface TerrainChunk {
  canvas: HTMLCanvasElement;  // width x CHUNK_H, fully opaque
  doodads: DoodadPlacement[];
}

/**
 * Incremental generation of one chunk (see TerrainGenerator.beginChunk). Call step() once per
 * frame with a small budget (e.g. 2-3 ms) until it returns true, then either take result()
 * (a new canvas), or copy the pixels straight into your own canvas with writeRows() (in
 * slices over several frames if you like), read `doodads` and call dispose().
 */
export interface ChunkJob {
  /** Index of the chunk being generated. */
  readonly index: number;
  /** True once every step has run (result() then only copies the pixels into a canvas). */
  readonly done: boolean;
  /** Completed fraction of the work, 0..1. */
  readonly progress: number;
  /**
   * Works for about `budgetMs` milliseconds (always at least one small slice, so it always
   * progresses; a slice is ~0.05-0.3 ms on desktop). Returns true when the chunk is complete.
   */
  step(budgetMs: number): boolean;
  /** Finishes any remaining work synchronously and returns the chunk (same object on later calls). */
  result(): TerrainChunk;
  /**
   * Copies rows [row0, row0 + rows) of the chunk straight into `ctx` at (dx, dy) — one
   * putImageData with a dirty rectangle: no intermediate canvas, no drawImage. The chunk is
   * opaque, so the target needs no clearing. Finishes the painting synchronously first if
   * needed. Not available after dispose() / result().
   */
  writeRows(ctx: CanvasRenderingContext2D, dx: number, dy: number, row0: number, rows: number): void;
  /** Doodad placements of the chunk (complete once `done`). */
  readonly doodads: readonly DoodadPlacement[];
  /** Gives the chunk's scratch memory back to the generator once the rows are copied (idempotent). */
  dispose(): void;
}

type Plan = (c: Chunk) => Step[];

/** Per-biome painters: each returns the list of small steps that render one chunk. */
const PLANS: Record<Biome, Plan> = {
  desert: planDesert,
  jungle: planJungle,
  ocean: planOcean,
  cavern: planCavern,
  space: planSpace,
  lava: planLava,
  ice: planIce,
  techno: planTechno,
};

/** Cloud / haze layer look per biome (CLOUD_SPRITES are white and get tinted at runtime). */
const CLOUD_STYLE: Record<Biome, { tint: number; alpha: number } | null> = {
  desert: { tint: 0xf2dcb0, alpha: 0.3 },   // warm dust haze
  jungle: { tint: 0xd6eedc, alpha: 0.38 },  // humid mist
  ocean: { tint: 0xffffff, alpha: 0.45 },   // white cumulus
  cavern: { tint: 0x8c7664, alpha: 0.28 },  // drifting cave dust
  space: null,                              // vacuum: no clouds
  lava: { tint: 0x6e2c22, alpha: 0.42 },    // dark red ash smoke
  ice: { tint: 0xe8f0fc, alpha: 0.42 },     // blowing snow
  techno: { tint: 0xbdd0d8, alpha: 0.3 },   // vented steam
};

/** Biomes whose painter already ran its JIT warm-up in this session. */
const WARMED = new Set<Biome>();
/** Chunk index used by warm-up chunks (far away from any level's real chunks). */
const WARM_INDEX = 4096;
/**
 * Width of warm-up chunks: narrow is enough to run every code path once (type feedback for
 * the JIT, every feature is forced into the chunk) at a fraction of a full chunk's cost.
 */
const WARM_WIDTH = 96;

interface Phase { chunk: Chunk; steps: Step[] }

/** A ChunkJob: optional warm-up phase(s) followed by the real chunk. */
class Job implements ChunkJob {
  private p = 0;
  private si = 0;
  private finished = 0;
  private readonly total: number;
  private out: TerrainChunk | null = null;
  /** The scratch memory went back to the generator (result() or dispose()). */
  private released = false;

  constructor(readonly index: number, private readonly phases: Phase[], private readonly recycle: (pool: Pool) => void) {
    let n = 0;
    for (const ph of phases) n += ph.steps.length;
    this.total = n;
  }

  get done(): boolean {
    return this.p >= this.phases.length;
  }

  get progress(): number {
    return this.total > 0 ? this.finished / this.total : 1;
  }

  step(budgetMs: number): boolean {
    const deadline = performance.now() + (budgetMs > 0 ? budgetMs : 0);
    while (this.p < this.phases.length) {
      const ph = this.phases[this.p];
      if (this.si < ph.steps.length && ph.steps[this.si].run(deadline)) {
        this.si++;
        this.finished++;
      }
      if (this.si >= ph.steps.length) {
        // warm-up phases give their scratch memory back as soon as they are done
        if (this.p < this.phases.length - 1) this.recycle(ph.chunk.pool);
        this.p++;
        this.si = 0;
      }
      if (performance.now() >= deadline) break;
    }
    return this.done;
  }

  result(): TerrainChunk {
    if (this.out) return this.out;
    if (this.released) throw new Error('ChunkJob.result() after dispose()');
    if (!this.done) this.step(Infinity);
    const c = this.phases[this.phases.length - 1].chunk;
    const canvas = document.createElement('canvas');
    canvas.width = c.w;
    canvas.height = CH;
    canvas.getContext('2d')!.putImageData(c.img, 0, 0);
    this.out = { canvas, doodads: c.doodads };
    this.dispose();
    return this.out;
  }

  get doodads(): readonly DoodadPlacement[] {
    return this.phases[this.phases.length - 1].chunk.doodads;
  }

  writeRows(ctx: CanvasRenderingContext2D, dx: number, dy: number, row0: number, rows: number): void {
    if (this.released) throw new Error('ChunkJob.writeRows() after dispose() / result()');
    if (!this.done) this.step(Infinity);
    const c = this.phases[this.phases.length - 1].chunk;
    const r0 = Math.max(0, Math.floor(row0));
    const r1 = Math.min(CH, Math.floor(row0 + rows));
    if (r1 > r0) ctx.putImageData(c.img, dx, dy, 0, r0, c.w, r1 - r0);
  }

  dispose(): void {
    if (this.released) return;
    this.released = true;
    this.recycle(this.phases[this.phases.length - 1].chunk.pool);
  }
}

/**
 * Procedural, seamless, non-repeating terrain for one biome.
 * Chunk 0 is the bottom-most chunk visible at level start; chunk n+1 sits directly ABOVE
 * chunk n. Noise is sampled in continuous world coordinates
 * (worldY = (index + 1) * CHUNK_H - 1 - row, increasing upward) so chunk edges match exactly.
 * Generation is deterministic: the same (biome, seed, width, index) always gives the same chunk.
 */
export class TerrainGenerator {
  /** Recycled per-job scratch memory (typed arrays + ImageData). */
  private readonly pools: Pool[] = [];
  private readonly recycle = (pool: Pool): void => {
    this.pools.push(pool);
  };

  constructor(public readonly biome: Biome, public readonly seed: number, public readonly width: number) {}

  /** 20-bit mixed seed: keeps every hash2 product exact in float64 (see noise.ts). */
  private mixedSeed(): number {
    return (Math.imul(this.seed ^ 0x5bd1e995, 0x9e3779b1) >>> 12) & 0xfffff;
  }

  private phase(index: number, force: boolean): Phase {
    const w = force ? Math.min(this.width, WARM_WIDTH) : this.width;
    const c = new Chunk(w, index, this.mixedSeed(), this.pools.pop() ?? new Pool(), force);
    return { chunk: c, steps: PLANS[this.biome](c) };
  }

  /**
   * Starts the incremental generation of chunk `index`. The first job of each biome per
   * session also runs a JIT warm-up phase (a throw-away chunk containing every optional
   * feature) so later chunks never hit unoptimised / deoptimising code paths.
   */
  beginChunk(index: number): ChunkJob {
    const phases: Phase[] = [];
    if (!WARMED.has(this.biome)) {
      WARMED.add(this.biome);
      phases.push(this.phase(WARM_INDEX, true));
    }
    phases.push(this.phase(index, false));
    return new Job(index, phases, this.recycle);
  }

  /** Renders chunk `index` synchronously (opaque canvas width x CHUNK_H) and its doodad placements. */
  chunk(index: number): TerrainChunk {
    return this.beginChunk(index).result();
  }

  /**
   * Runs the biome's JIT warm-up now (synchronously, once per biome per session) — call it
   * while loading a level to keep that cost out of the first beginChunk()/chunk().
   */
  warmup(): void {
    if (WARMED.has(this.biome)) return;
    WARMED.add(this.biome);
    const ph = this.phase(WARM_INDEX, true);
    for (const st of ph.steps) while (!st.run(Infinity));
    this.recycle(ph.chunk.pool);
  }

  /**
   * Tint (0xRRGGBB) and alpha suggested for the cloud/haze layer of this biome, or null for none.
   * Alphas stay <= 0.45 because the cloud layer is drawn above bullets (DEPTH.clouds).
   */
  cloudStyle(): { tint: number; alpha: number } | null {
    return CLOUD_STYLE[this.biome];
  }
}
