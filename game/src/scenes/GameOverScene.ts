import Phaser from 'phaser';
import { SCENES, W, H } from '../config';
import { markSceneReady } from '../debug';

// STUB — to be implemented by the UI module owner (see docs/ARCHITECTURE.md).
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENES.GameOver);
  }

  create(): void {
    this.add.text(W / 2, H / 2, 'GameOver', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    markSceneReady(SCENES.GameOver);
  }
}
