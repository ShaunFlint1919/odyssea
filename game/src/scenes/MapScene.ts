import Phaser from 'phaser';
import { SCENES, W, H } from '../config';
import { markSceneReady } from '../debug';

// STUB — to be implemented by the UI module owner (see docs/ARCHITECTURE.md).
export class MapScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Map);
  }

  create(): void {
    this.add.text(W / 2, H / 2, 'Map', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    markSceneReady(SCENES.Map);
  }
}
