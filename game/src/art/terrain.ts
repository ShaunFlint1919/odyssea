import type { Biome } from '../types';

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
 * Procedural, seamless, non-repeating terrain for one biome.
 * Chunk 0 is the bottom-most chunk visible at level start; chunk n+1 sits directly ABOVE
 * chunk n. Noise must be sampled in continuous world coordinates so chunk edges match.
 * STUB — to be implemented by the art module owner (see docs/ARCHITECTURE.md).
 */
export class TerrainGenerator {
  constructor(public readonly biome: Biome, public readonly seed: number, public readonly width: number) {}

  chunk(index: number): TerrainChunk {
    void index;
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#202030';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return { canvas, doodads: [] };
  }

  /** Tint (0xRRGGBB) and alpha suggested for the cloud/haze layer of this biome, or null for none. */
  cloudStyle(): { tint: number; alpha: number } | null {
    return null;
  }
}
