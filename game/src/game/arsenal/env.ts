// =====================================================================================
//  ARSENAL ENVIRONMENT — shared context of one arsenal instance (in-game or shop preview)
//  and the fixed-depth image groups every sub-system draws with.
//
//  Depth policy: images are created once with a fixed depth + blend mode and NEVER change
//  depth afterwards (Phaser re-sorts the whole display list on every setDepth call), so
//  spawning / recycling shots never triggers a display-list sort.
// =====================================================================================
import Phaser from 'phaser';
import type { ArsenalDepths, ArsenalHost } from './api';

/** Shared, immutable context of one arsenal instance. */
export interface ArsenalEnv {
  readonly scene: Phaser.Scene;
  readonly host: ArsenalHost;
  readonly depths: ArsenalDepths;
  /** When set (shop preview), every game object is created inside this layer instead of the scene. */
  readonly layer: Phaser.GameObjects.Layer | null;
}

/** Positions that muzzle flashes and beams can follow: 0 = ship, 1 = left sidekick, 2 = right sidekick. */
export interface AnchorSource {
  anchorX(anchor: number): number;
  anchorY(anchor: number): number;
}

export const ANCHOR_SHIP = 0;
export const ANCHOR_LEFT = 1;
export const ANCHOR_RIGHT = 2;

/** Creates an image in the scene (or in the preview layer). */
export function addImage(env: ArsenalEnv, key: string, frame?: string | number): Phaser.GameObjects.Image {
  if (env.layer) {
    const img = env.scene.make.image({ x: 0, y: 0, key, frame }, false);
    env.layer.add(img);
    return img;
  }
  return env.scene.add.image(0, 0, key, frame);
}

/** Creates an (animatable) sprite in the scene (or in the preview layer). */
export function addSprite(env: ArsenalEnv, key: string, frame?: string | number): Phaser.GameObjects.Sprite {
  if (env.layer) {
    const spr = env.scene.make.sprite({ x: 0, y: 0, key, frame }, false);
    env.layer.add(spr);
    return spr;
  }
  return env.scene.add.sprite(0, 0, key, frame);
}

/**
 * Pool of hidden images sharing one depth and blend mode. take() configures and shows an
 * image, give() hides it again. Grows on demand (allocation only when the pool is empty).
 */
export class ImageGroup {
  private readonly free: Phaser.GameObjects.Image[] = [];
  private readonly all: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly env: ArsenalEnv,
    private readonly depth: number,
    private readonly blend: Phaser.BlendModes,
    initial: number,
    private readonly initKey: string,
  ) {
    for (let i = 0; i < initial; i++) this.free.push(this.create());
  }

  private create(): Phaser.GameObjects.Image {
    const img = addImage(this.env, this.initKey);
    img.setDepth(this.depth);
    img.setBlendMode(this.blend);
    img.setVisible(false);
    this.all.push(img);
    return img;
  }

  /** Takes an image showing `key` / `frame`, reset to scale 1, alpha 1, no tint, no rotation. */
  take(key: string, frame?: string | number): Phaser.GameObjects.Image {
    const img = this.free.pop() ?? this.create();
    img.setTexture(key, frame);
    img.setScale(1);
    img.setAlpha(1);
    img.setRotation(0);
    img.clearTint();
    img.setFlip(false, false);
    img.setVisible(true);
    return img;
  }

  /** Returns an image to the pool (hidden). */
  give(img: Phaser.GameObjects.Image): void {
    img.setVisible(false);
    this.free.push(img);
  }

  /** Number of images created so far (debug). */
  get size(): number {
    return this.all.length;
  }

  destroy(): void {
    for (let i = 0; i < this.all.length; i++) this.all[i].destroy();
    this.all.length = 0;
    this.free.length = 0;
  }
}
