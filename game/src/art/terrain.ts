import type { Biome } from '../types';
import { CH, Chunk } from './b_ter_core';
import { paintDesert } from './b_ter_desert';
import { paintJungle } from './b_ter_jungle';
import { paintOcean } from './b_ter_ocean';
import { paintCavern } from './b_ter_cavern';
import { paintSpace } from './b_ter_space';
import { paintLava } from './b_ter_lava';
import { paintIce } from './b_ter_ice';
import { paintTechno } from './b_ter_techno';

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

type Painter = (c: Chunk) => void;

/** Biomes whose painter already ran its JIT warm-up in this session. */
const WARMED = new Set<Biome>();

const PAINTERS: Record<Biome, Painter> = {
  desert: paintDesert,
  jungle: paintJungle,
  ocean: paintOcean,
  cavern: paintCavern,
  space: paintSpace,
  lava: paintLava,
  ice: paintIce,
  techno: paintTechno,
};

/**
 * Procedural, seamless, non-repeating terrain for one biome.
 * Chunk 0 is the bottom-most chunk visible at level start; chunk n+1 sits directly ABOVE
 * chunk n. Noise is sampled in continuous world coordinates
 * (worldY = (index + 1) * CHUNK_H - 1 - row, increasing upward) so chunk edges match exactly.
 */
export class TerrainGenerator {
  private img: ImageData | undefined;

  constructor(public readonly biome: Biome, public readonly seed: number, public readonly width: number) {}

  /** 20-bit mixed seed: keeps every hash2 product exact in float64 (see noise.ts). */
  private mixedSeed(): number {
    return (Math.imul(this.seed ^ 0x5bd1e995, 0x9e3779b1) >>> 12) & 0xfffff;
  }

  /**
   * JIT warm-up: paints two throw-away chunks in which every optional feature of the biome
   * appears, so later chunks never hit unoptimised / deoptimising code paths mid-level.
   * Runs automatically on the first chunk() of each biome per session (~10-60 ms once);
   * call it during level loading to move that cost there.
   */
  warmup(): void {
    WARMED.add(this.biome);
    const paint = PAINTERS[this.biome];
    for (let k = 0; k < 2; k++) {
      const c = new Chunk(this.width, 4096 + k * 7, this.mixedSeed(), this.img, true);
      this.img = c.img;
      paint(c);
    }
  }

  /** Renders chunk `index` (opaque canvas width x CHUNK_H) and its doodad placements. */
  chunk(index: number): TerrainChunk {
    if (!WARMED.has(this.biome)) this.warmup();
    const c = new Chunk(this.width, index, this.mixedSeed(), this.img);
    this.img = c.img;
    PAINTERS[this.biome](c);
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = CH;
    canvas.getContext('2d')!.putImageData(c.img, 0, 0);
    return { canvas, doodads: c.doodads };
  }

  /** Tint (0xRRGGBB) and alpha suggested for the cloud/haze layer of this biome, or null for none. */
  cloudStyle(): { tint: number; alpha: number } | null {
    return null;
  }
}
