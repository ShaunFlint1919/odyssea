// =====================================================================================
//  BACKGROUND — scrolling procedural terrain (TerrainGenerator chunks of src/art/terrain.ts)
//  drawn into a small ring of reusable canvas textures, doodads placed with their chunk,
//  a cloud / haze layer scrolling ~1.6x faster (DEPTH.clouds, low alpha) and, for space,
//  a 2-layer parallax star field. At most ONE chunk is generated per frame (one chunk of
//  look-ahead above the screen) so the generation cost is spread out.
//  Chunk i (0 = bottom-most at level start, i+1 directly above i) has its top edge at
//      y = H - (i + 1) * CHUNK_H + scrolled.
// =====================================================================================
import Phaser from 'phaser';
import { CHUNK_H, DEPTH, H, PLAY_W } from '../config';
import { CLOUD_SPRITES } from '../art/keys';
import { TerrainGenerator } from '../art/terrain';
import type { Biome } from '../types';
import { mulberry32 } from '../art/noise';
import { TEX_PX } from './tex';

const CLOUD_SPEED = 1.6;
/** The haze sits above the enemy bullets (DEPTH.clouds): keep it light so bullets stay readable. */
const CLOUD_ALPHA_MAX = 0.3;
const CLOUD_COUNT = 5;
const STAR_LAYERS: { n: number; speed: number; alpha: number; scale: number; tints: number[] }[] = [
  { n: 46, speed: 1.35, alpha: 0.55, scale: 0.5, tints: [0x8090c0, 0xa0b0e0, 0x7070a0] },
  { n: 18, speed: 2.4, alpha: 0.9, scale: 1, tints: [0xffffff, 0xd8e8ff, 0xfff0d0] },
];

class Slot {
  index = -1;
  readonly doodads: Phaser.GameObjects.Image[] = [];
  readonly doodadY: number[] = [];
  constructor(readonly tex: Phaser.Textures.CanvasTexture, readonly img: Phaser.GameObjects.Image) {}
}

interface Cloud { img: Phaser.GameObjects.Image; speedMul: number }
interface Star { img: Phaser.GameObjects.Image; speed: number }

let instanceSeq = 0;

export class Background {
  /** Total terrain scroll distance in px. */
  scrolled: number;
  private readonly gen: TerrainGenerator;
  private readonly slots: Slot[] = [];
  private nextIndex: number;
  private readonly doodadPool: Phaser.GameObjects.Image[] = [];
  private readonly clouds: Cloud[] = [];
  private readonly stars: Star[] = [];
  private readonly rng: () => number;
  private readonly keyPrefix: string;
  private readonly cloudAlpha: number;

  constructor(private readonly scene: Phaser.Scene, readonly biome: Biome, seed: number, startScroll: number) {
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
    // first visible chunk at the start scroll position, then fill the screen + 1 ahead
    this.nextIndex = Math.max(0, Math.floor(startScroll / CHUNK_H));
    let guard = 0;
    while (this.needMore() && guard++ < nSlots) this.generateNext();
    // clouds / haze
    const style = this.gen.cloudStyle();
    this.cloudAlpha = style ? Math.min(style.alpha, CLOUD_ALPHA_MAX) : 0;
    if (style) {
      for (let i = 0; i < CLOUD_COUNT; i++) {
        const key = CLOUD_SPRITES[i % CLOUD_SPRITES.length];
        if (!scene.textures.exists(key)) break;
        const img = scene.add.image(0, 0, key).setDepth(DEPTH.clouds).setTint(style.tint).setAlpha(this.cloudAlpha);
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
  }

  private topOf(index: number): number {
    return H - (index + 1) * CHUNK_H + this.scrolled;
  }

  /** The highest generated chunk's top edge is less than one chunk above the screen. */
  private needMore(): boolean {
    return this.topOf(this.nextIndex - 1) > -CHUNK_H;
  }

  private generateNext(): void {
    let slot: Slot | null = null;
    for (const s of this.slots) {
      if (s.index < 0) {
        slot = s;
        break;
      }
    }
    if (!slot) return;
    const index = this.nextIndex++;
    const chunk = this.gen.chunk(index);
    const ctx = slot.tex.getContext();
    ctx.clearRect(0, 0, PLAY_W, CHUNK_H);
    ctx.drawImage(chunk.canvas, 0, 0);
    slot.tex.refresh();
    slot.index = index;
    slot.img.setVisible(true);
    for (const d of chunk.doodads) {
      if (!this.scene.textures.exists(d.key)) continue;
      const img = this.doodadPool.pop() ?? this.scene.add.image(0, 0, d.key).setDepth(DEPTH.doodads);
      img.setTexture(d.key).setPosition(Math.round(d.x), 0).setFlipX(!!d.flipX).setScale(d.scale ?? 1).setVisible(true);
      slot.doodads.push(img);
      slot.doodadY.push(d.y);
    }
  }

  private release(slot: Slot): void {
    slot.index = -1;
    slot.img.setVisible(false);
    for (const img of slot.doodads) {
      img.setVisible(false);
      this.doodadPool.push(img);
    }
    slot.doodads.length = 0;
    slot.doodadY.length = 0;
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

  /** Scroll by speed * dt (px/s, s). Generates at most one chunk per call. */
  update(dt: number, speed: number): void {
    const d = speed * dt;
    this.scrolled += d;
    for (const s of this.slots) {
      // keep a margin so doodads overhanging the chunk top never pop out while visible
      if (s.index >= 0 && this.topOf(s.index) >= H + 48) this.release(s);
    }
    if (this.needMore()) this.generateNext();
    this.layout();
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
    for (const s of this.slots) {
      s.img.destroy();
      for (const d of s.doodads) d.destroy();
      if (this.scene.textures.exists(s.tex.key)) this.scene.textures.remove(s.tex.key);
    }
    for (const d of this.doodadPool) d.destroy();
    for (const c of this.clouds) c.img.destroy();
    for (const s of this.stars) s.img.destroy();
    this.slots.length = 0;
  }
}
