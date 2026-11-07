// STUB — to be implemented by the platform module owner (see docs/ARCHITECTURE.md).
import Phaser from 'phaser';

export interface ControlsState {
  moveX: number;            // -1..1 keyboard / gamepad axis
  moveY: number;            // -1..1
  dragDX: number;           // touch / mouse relative drag since last update, game px (sensitivity applied)
  dragDY: number;
  touching: boolean;        // a finger / mouse button is dragging
  firing: boolean;          // fire held (or autofire on)
  rearTogglePressed: boolean; // edge-triggered this frame
  pausePressed: boolean;      // edge-triggered this frame (Esc / P / gamepad start / Android back)
}

export interface ControlsOptions {
  dragArea: Phaser.Geom.Rectangle;  // where a drag may START (game coords)
  sensitivity: number;
  autofire: boolean;
}

export class Controls {
  constructor(scene: Phaser.Scene, opts: ControlsOptions) { void scene; void opts; }
  /** Poll once per frame. */
  update(): ControlsState {
    return { moveX: 0, moveY: 0, dragDX: 0, dragDY: 0, touching: false, firing: true, rearTogglePressed: false, pausePressed: false };
  }
  destroy(): void {}
}
