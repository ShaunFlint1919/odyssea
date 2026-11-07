import Phaser from 'phaser';
import { H } from '../config';
import type { HudApi } from '../game/contracts';
import { HudController } from './hud/HudController';
import { computeLayout, type HudLayout } from './hud/layout';

/**
 * Creates the in-game HUD (right-side status panel + playfield overlays) for the Game scene.
 * Call update(model) every frame; the HUD animates itself in the scene's POST_UPDATE and
 * cleans itself up on scene shutdown (destroy() may also be called explicitly). Its touch
 * buttons emit HUD_EVENTS.pause / HUD_EVENTS.rearToggle on scene.events.
 */
export function createHud(scene: Phaser.Scene): HudApi {
  return new HudController(scene);
}

let cached: HudLayout | null = null;

/**
 * Which HUD touch button (if any) covers the game-pixel point (x, y). Allocation-free.
 * Input code can use it to ignore drags that START on a HUD button: Controls polls pointers,
 * so the buttons' stopPropagation() only blocks the scene-level 'pointerdown' event.
 */
export function hudButtonAt(x: number, y: number, height: number = H): 'pause' | 'rear' | null {
  if (!cached || cached.height !== Math.round(height)) cached = computeLayout(height);
  const L = cached;
  const lx = x - L.px;
  const p = L.pauseHit, r = L.rearHit;
  if (lx >= p.x && lx < p.x + p.w && y >= p.y && y < p.y + p.h) return 'pause';
  if (lx >= r.x && lx < r.x + r.w && y >= r.y && y < r.y + r.h) return 'rear';
  return null;
}
