import Phaser from 'phaser';
import type { HudApi } from '../game/contracts';

// STUB — to be implemented by the UI module owner (see docs/ARCHITECTURE.md).
export function createHud(scene: Phaser.Scene): HudApi {
  void scene;
  return { update() {}, flash() {}, showBanner() {}, destroy() {} };
}
