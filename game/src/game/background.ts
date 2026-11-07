// =====================================================================================
//  BACKGROUND — scrolling procedural terrain (TerrainGenerator of src/art/terrain.ts) drawn
//  into a small ring of reusable canvas textures, doodads placed with their chunk (blinking
//  lights on beacons), a cloud / haze layer scrolling ~1.6x faster and, for space, a
//  2-layer parallax star field.
//
//  Generation never blocks a frame:
//   - the constructor (level load) runs the biome's JIT warm-up and builds only the chunks
//     covering the first screen;
//   - afterwards chunks are built INCREMENTALLY (ChunkJob.step, ~2 ms per calm frame,
//     1 ms per slow frame, real time: it keeps working during hit-stop) up to
//     LOOKAHEAD_PX above the screen; a painted chunk's pixels are written straight into its
//     (hidden) slot canvas, COPY_ROWS rows per frame (ChunkJob.writeRows: putImageData, no
//     temporary canvas), then uploaded to the GPU (CanvasTexture.refresh) on the next frame;
//   - only if a chunk is still unfinished when it is about to scroll into view (extreme
//     scroll speed) is its job completed synchronously (counted in stats.sync).
//  Chunk i (0 = bottom-most at level start, i+1 directly above i) has its top edge at
//      y = H - (i + 1) * CHUNK_H + scrolled.
// =====================================================================================
import Phaser from 'phaser';
import { CHUNK_H, DEPTH, H, PLAY_W } from '../config';
import { CLOUD_SPRITES } from '../art/keys';
import { TerrainGenerator, type ChunkJob, type DoodadPlacement } from '../art/terrain';
import type { Biome } from '../types';
import { mulberry32 } from '../art/noise';
import { TEX_PX } from './tex';

const CLOUD_SPEED = 1.6;
/** The haze drifts between the player shots and the enemy bullets: bullets stay crisp on top. */
const CLOUD_DEPTH = DEPTH.enemyBullets - 2;
const CLOUD_ALPHA_MAX = 0.3;
const CLOUD_COUNT = 5;
const STAR_LAYERS: { n: number; speed: number; alpha: number; scale: number; tints: number[] }[] = [
  { n: 46, speed: 1.35, alpha: 0.55, scale: 0.5, tints: [0x8090c0, 0xa0b0e0, 0x7070a0] },
  { n: 18, speed: 2.4, alpha: 0.9, scale: 1, tints: [0xffffff, 0xd8e8ff, 0xfff0d0] },
];
/** Keep chunks ready this far (px) above the top of the screen. */
const LOOKAHEAD_PX = CHUNK_H * 2;
/** Below this many px of ready terrain above the screen the pending chunk is finished synchronously. */
const EMERGENCY_PX = 6;
/** Generation budget per frame (ms of real time): calm frames / frames that already ran long. */
const BUDGET_CALM = 2;
const BUDGET_BUSY = 1;
/** A frame longer than this (ms) counts as busy. */
const BUSY_FRAME_MS = 21;
/** Rows of a finished chunk written into its slot canvas per frame (CHUNK_H / 4: 4 frames). */
const COPY_ROWS = 64;
/** Doodads that carry a light: they blink (alpha) with a per-instance phase. */
const BLINKERS: Record<string, number> = { dd_light: 1.6, dd_beacon: 1.1 };

/** Terrain work statistics of the current level (perf checks, hook state). */
export interface TerrainStats {
  /** Chunks built incrementally / synchronously during play (constructor chunks excluded). */
  chunks: number;
  sync: number;
  /** Longest time (ms) spent on terrain work in one frame during play, and on the initial screen. */
  maxFrameMs: number;
  initMs: number;
  /** Longest single painting step, slot copy and GPU upload (ms). */
  maxStepMs: number;
  maxCopyMs: number;
  maxUploadMs: number;
}

class Slot {
  index = -1;
  /** Copied into the canvas but not uploaded / shown yet. */
  pending = false;
  readonly doodads: Phaser.GameObjects.Image[] = [];
  readonly doodadY: number[] = [];
  constructor(readonly tex: Phaser.Textures.CanvasTexture, readonly img: Phaser.GameObjects.Image) {}
}

interface Cloud { img: Phaser.GameObjects.Image; speedMul: number }
interface Star { img: Phaser.GameObjects.Image; speed: number }
interface Blinker { img: Phaser.GameObjects.Image; rate: number; phase: number }

let instanceSeq = 0;

export class Background {
  /** Total terrain scroll distance in px. */
  scrolled: number;
  readonly stats: TerrainStats = { chunks: 0, sync: 0, maxFrameMs: 0, initMs: 0, maxStepMs: 0, maxCopyMs: 0, maxUploadMs: 0 };
  private readonly gen: TerrainGenerator;
  private readonly slots: Slot[] = [];
  /** Next chunk index to build (every index below it is ready or pending upload). */
  private nextIndex: number;
  /** Highest chunk index visible on its slot (uploaded), -1 = none yet. */
  private topReady = -1;
  private job: ChunkJob | null = null;
  /** The running job finished its painting steps: copy it into its slot over the next frames. */
  private jobDone = false;
  /** Next row of the finished job to write into its slot canvas. */
  private copyRow = 0;
  /** Slot waiting for its GPU upload (one frame after the copy). */
  private uploadSlot: Slot | null = null;
  private readonly doodadPool: Phaser.GameObjects.Image[] = [];
  private readonly blinkers: Blinker[] = [];
  private readonly clouds: Cloud[] = [];
  private readonly stars: Star[] = [];
  private readonly rng: () => number;
  private readonly keyPrefix: string;
  private readonly cloudAlpha: number;
  private time = 0;

  constructor(private readonly scene: Phaser.Scene, readonly biome: Biome, seed: number, startScroll: number) {
    const t0 = performance.now();
    this.keyPrefix = `world_chunk_${++instanceSeq}_`;
    this.gen = new TerrainGenerator(biome, seed, PLAY_W);
    this.rng = mulberry32(seed ^ 0x5bd1e995);
    this.scrolled = startScroll;
    const nSlots = Math.ceil(H / CHUNK_H) + 3;
    for (let i = 0; i < nSlots; i++) {
      const key = `${this.keyPrefix}${i}`;
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const tex = scene.textures.createCanvas(key, PLAY_W, CHUNK_H)!;
      const img = scene.add.image(0, -CHUNK_H * 2, key).setOrigin(0, 0).setDepth(DEPTH.terrain).setVisible(false);
      this.slots.push(new Slot(tex, img));
    }
    // level load: one-time JIT warm-up of the biome painter, then the first screen synchronously
    this.gen.warmup();
    this.nextIndex = Math.max(0, Math.floor(startScroll / CHUNK_H));
    let guard = 0;
    while (this.aheadPx() < 0 && guard++ < nSlots) {
      const slot = this.freeSlot();
      if (!slot) break;
      slot.index = this.nextIndex;
      const job = this.gen.beginChunk(this.nextIndex++);
      job.writeRows(slot.tex.getContext(), 0, 0, 0, CHUNK_H);
      this.place(slot, job.doodads);
      job.dispose();
      this.upload(slot);
    }
    // clouds / haze
    const style = this.gen.cloudStyle();
    this.cloudAlpha = style ? Math.min(style.alpha, CLOUD_ALPHA_MAX) : 0;
    if (style) {
      for (let i = 0; i < CLOUD_COUNT; i++) {
        const key = CLOUD_SPRITES[i % CLOUD_SPRITES.length];
        if (!scene.textures.exists(key)) break;
        const img = scene.add.image(0, 0, key).setDepth(CLOUD_DEPTH).setTint(style.tint).setAlpha(this.cloudAlpha);
        const c: Cloud = { img, speedMul: CLOUD_SPEED * (0.9 + this.rng() * 0.25) };
        this.placeCloud(c, this.rng() * (H + 200) - 100);
        this.clouds.push(c);
      }
    }
    if (biome === 'space') {
      for (const layer of STAR_LAYERS) {
        for (let i = 0; i < layer.n; i++) {
          const img = scene.add.image(this.rng() * PLAY_W, this.rng() * H, TEX_PX)
            .setDepth(DEPTH.terrain + 1).setScale(layer.scale * (this.rng() < 0.15 ? 1.5 : 1))
            .setTint(layer.tints[(this.rng() * layer.tints.length) | 0]).setAlpha(layer.alpha * (0.6 + this.rng() * 0.4));
          this.stars.push({ img, speed: layer.speed });
        }
      }
    }
    this.layout();
    this.stats.initMs = Math.round((performance.now() - t0) * 10) / 10;
  }

  private topOf(index: number): number {
    return H - (index + 1) * CHUNK_H + this.scrolled;
  }

  /** How far (px) the highest visible chunk extends above the top of the screen (< 0: a gap). */
  private aheadPx(): number {
    return this.topReady < 0 ? -H : -this.topOf(this.topReady);
  }

  private freeSlot(): Slot | null {
    for (const s of this.slots) if (s.index < 0) return s;
    return null;
  }

  /** A slot whose canvas holds its chunk's pixels (slot.index set): lay out its doodads, still hidden. */
  private place(slot: Slot, doodads: readonly DoodadPlacement[]): void {
    slot.pending = true;
    for (const d of doodads) {
      if (!this.scene.textures.exists(d.key)) continue;
      const img = this.doodadPool.pop() ?? this.scene.add.image(0, 0, d.key).setDepth(DEPTH.doodads);
      img.setTexture(d.key).setPosition(Math.round(d.x), 0).setFlipX(!!d.flipX).setScale(d.scale ?? 1).setAlpha(1).setVisible(false);
      slot.doodads.push(img);
      slot.doodadY.push(d.y);
      const rate = BLINKERS[d.key];
      if (rate) this.blinkers.push({ img, rate, phase: (d.x * 0.37 + d.y * 0.11) % 1 });
    }
  }

  /** GPU upload of a placed slot, then show it. */
  private upload(slot: Slot): void {
    slot.tex.refresh();
    slot.pending = false;
    slot.img.setVisible(true);
    for (const img of slot.doodads) img.setVisible(true);
    if (slot.index > this.topReady) this.topReady = slot.index;
  }

  private release(slot: Slot): void {
    slot.index = -1;
    slot.pending = false;
    slot.img.setVisible(false);
    for (const img of slot.doodads) {
      img.setVisible(false);
      for (let k = this.blinkers.length - 1; k >= 0; k--) {
        if (this.blinkers[k].img === img) {
          this.blinkers[k] = this.blinkers[this.blinkers.length - 1];
          this.blinkers.pop();
        }
      }
      this.doodadPool.push(img);
    }
    slot.doodads.length = 0;
    slot.doodadY.length = 0;
    if (this.uploadSlot === slot) this.uploadSlot = null;
  }

  private placeCloud(c: Cloud, y: number): void {
    const r = this.rng;
    const key = CLOUD_SPRITES[(r() * CLOUD_SPRITES.length) | 0];
    c.img.setTexture(key).setPosition(r() * PLAY_W, y).setScale(1.3 + r() * 1.2).setFlipX(r() < 0.5)
      .setAlpha(this.cloudAlpha * (0.7 + r() * 0.3));
  }

  private layout(): void {
    for (const s of this.slots) {
      if (s.index < 0) continue;
      const top = Math.round(this.topOf(s.index));
      s.img.y = top;
      for (let k = 0; k < s.doodads.length; k++) s.doodads[k].y = top + Math.round(s.doodadY[k]);
    }
  }

  /**
   * Incremental terrain work for this frame (call every frame, even during hit-stop).
   * frameMs = real duration of the previous frame (picks the budget).
   */
  work(frameMs: number): void {
    const t0 = performance.now();
    // one kind of work per frame: GPU upload | copy into the slot | painting steps | new job
    const st = this.stats;
    if (this.uploadSlot) {
      this.upload(this.uploadSlot);
      this.uploadSlot = null;
      st.maxUploadMs = Math.max(st.maxUploadMs, performance.now() - t0);
    } else if (this.job && this.jobDone) {
      this.copySlice();
      st.maxCopyMs = Math.max(st.maxCopyMs, performance.now() - t0);
    } else if (this.job) {
      const urgent = this.aheadPx() < EMERGENCY_PX + CHUNK_H * 0.25;
      this.jobDone = this.job.step(urgent ? BUDGET_CALM * 2 : frameMs > BUSY_FRAME_MS ? BUDGET_BUSY : BUDGET_CALM);
      st.maxStepMs = Math.max(st.maxStepMs, performance.now() - t0);
    } else if (this.aheadPx() < LOOKAHEAD_PX) {
      const slot = this.freeSlot();
      if (slot) {
        slot.index = this.nextIndex;
        this.job = this.gen.beginChunk(this.nextIndex++);
        this.copyRow = 0;
        this.jobDone = this.job.step(BUDGET_BUSY);
      }
    }
    // emergency: the pending chunk must be on screen now
    if (this.aheadPx() < EMERGENCY_PX && (this.job || this.uploadSlot)) {
      if (this.job) this.finishJob(true);
      if (this.uploadSlot) {
        this.upload(this.uploadSlot);
        this.uploadSlot = null;
      }
    }
    const ms = performance.now() - t0;
    if (ms > this.stats.maxFrameMs) this.stats.maxFrameMs = Math.round(ms * 100) / 100;
  }

  private slotFor(index: number): Slot | null {
    for (const s of this.slots) if (s.index === index) return s;
    return null;
  }

  /** Writes the next COPY_ROWS rows of the finished job into its slot; the last slice completes it. */
  private copySlice(): void {
    const job = this.job!;
    const slot = this.slotFor(job.index);
    if (!slot) {
      this.dropJob();
      return;
    }
    job.writeRows(slot.tex.getContext(), 0, 0, this.copyRow, COPY_ROWS);
    this.copyRow += COPY_ROWS;
    if (this.copyRow >= CHUNK_H) this.completeJob(slot, false);
  }

  /** Emergency: complete the running job now (painting and the rows not copied yet). */
  private finishJob(sync: boolean): void {
    const job = this.job!;
    const slot = this.slotFor(job.index);
    if (!slot) {
      this.dropJob();
      return;
    }
    job.writeRows(slot.tex.getContext(), 0, 0, this.copyRow, CHUNK_H - this.copyRow);
    this.completeJob(slot, sync);
  }

  /** Every row is in the slot canvas: lay out the doodads and queue the GPU upload. */
  private completeJob(slot: Slot, sync: boolean): void {
    const job = this.job!;
    this.place(slot, job.doodads);
    this.dropJob();
    this.uploadSlot = slot;
    this.stats.chunks++;
    if (sync) this.stats.sync++;
  }

  private dropJob(): void {
    this.job?.dispose();
    this.job = null;
    this.jobDone = false;
    this.copyRow = 0;
  }

  /** Scroll by speed * dt (px/s, s): moves chunks, doodads, clouds and stars. */
  update(dt: number, speed: number): void {
    const d = speed * dt;
    this.scrolled += d;
    this.time += dt;
    for (const s of this.slots) {
      // keep a margin so doodads overhanging the chunk top never pop out while visible
      if (s.index >= 0 && !s.pending && s.index <= this.topReady && this.topOf(s.index) >= H + 48) this.release(s);
    }
    this.layout();
    for (let i = 0; i < this.blinkers.length; i++) {
      const b = this.blinkers[i];
      const p = (this.time * b.rate + b.phase) % 1;
      b.img.setAlpha(p < 0.55 ? 1 : 0.45);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      c.img.y += d * c.speedMul;
      if (c.img.y - c.img.displayHeight / 2 > H) this.placeCloud(c, -c.img.displayHeight / 2 - this.rng() * 140);
    }
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.img.y += d * s.speed;
      if (s.img.y > H + 2) {
        s.img.y -= H + 4;
        s.img.x = this.rng() * PLAY_W;
      }
    }
  }

  destroy(): void {
    this.dropJob();
    this.uploadSlot = null;
    for (const s of this.slots) {
      s.img.destroy();
      for (const d of s.doodads) d.destroy();
      if (this.scene.textures.exists(s.tex.key)) this.scene.textures.remove(s.tex.key);
    }
    for (const d of this.doodadPool) d.destroy();
    for (const c of this.clouds) c.img.destroy();
    for (const s of this.stars) s.img.destroy();
    this.slots.length = 0;
    this.blinkers.length = 0;
  }
}
