import Phaser from 'phaser';
import { SCENES, W, H, COLORS } from '../config';
import { DEBUG, markSceneReady } from '../debug';
import { generateAllTextures } from '../art';
import { getSave, loadSave, newGame, saveNow } from '../state/save';
import { audio } from '../audio';
import { initPlatform } from '../platform/device';
import { LEVELS, levelOrder } from '../data';

/** Generates all procedural assets, loads the save, then routes to the first scene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Boot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const label = this.add.text(W / 2, H / 2, 'LOADING', { fontFamily: 'monospace', fontSize: '12px', color: '#2ee6c8' }).setOrigin(0.5);
    // Let the label render one frame before the (synchronous) generation work.
    this.time.delayedCall(16, () => {
      generateAllTextures(this);
      loadSave();
      initPlatform();
      const s = getSave();
      audio.setVolumes(DEBUG.mute ? 0 : s.settings.sfx, DEBUG.mute ? 0 : s.settings.music);
      this.applyDebugSave();
      label.destroy();
      markSceneReady(SCENES.Boot);
      this.route();
    });
  }

  private applyDebugSave(): void {
    if (!DEBUG.scene && DEBUG.credits === null && !DEBUG.max) return;
    const s = getSave();
    if (DEBUG.scene && s.unlockedLevels.length === 0) {
      // Fresh debug session: start a campaign so every scene has valid state.
      newGame('normal');
    }
    const save = getSave();
    if (DEBUG.credits !== null) save.credits = DEBUG.credits;
    if (DEBUG.max) {
      save.credits = Math.max(save.credits, 999999);
      save.unlockedLevels = levelOrder();
      save.completedLevels = levelOrder(); // also unlocks every unlockLevel-gated shop item
    }
    if (DEBUG.level && LEVELS.some((l) => l.id === DEBUG.level)) save.currentLevel = DEBUG.level;
    saveNow();
  }

  private route(): void {
    const target = DEBUG.scene && Object.values(SCENES).includes(DEBUG.scene as never) ? DEBUG.scene : SCENES.Title;
    if (target === SCENES.Game) {
      const levelId = DEBUG.level ?? getSave().currentLevel ?? levelOrder()[0];
      this.scene.start(SCENES.Game, { levelId });
    } else if (target === SCENES.Shop) {
      this.scene.start(SCENES.Shop, { category: DEBUG.shop ?? undefined });
    } else {
      this.scene.start(target);
    }
  }
}
