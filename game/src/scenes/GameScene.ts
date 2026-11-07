import Phaser from 'phaser';
import { SCENES, W, H } from '../config';
import { markSceneReady } from '../debug';
import type { GameStartData } from '../game/contracts';

// STUB — to be implemented by the gameplay module owner (see docs/ARCHITECTURE.md).
export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Game);
  }

  create(data: GameStartData): void {
    this.add.text(W / 2, H / 2, `Game ${data?.levelId ?? ''}`, { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    markSceneReady(SCENES.Game);
  }
}
