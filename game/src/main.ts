import Phaser from 'phaser';
import { W, H, COLORS } from './config';
import { installHooks, DEBUG } from './debug';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { MapScene } from './scenes/MapScene';
import { HangarScene } from './scenes/HangarScene';
import { ShopScene } from './scenes/ShopScene';
import { SpecsScene } from './scenes/SpecsScene';
import { OptionsScene } from './scenes/OptionsScene';
import { IntelScene } from './scenes/IntelScene';
import { GameScene } from './scenes/GameScene';
import { LevelEndScene } from './scenes/LevelEndScene';
import { GameOverScene } from './scenes/GameOverScene';
import { PauseScene } from './scenes/PauseScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: COLORS.bg,
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  disableContextMenu: true,
  input: { activePointers: 3 },
  fps: { target: 60, smoothStep: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { powerPreference: 'high-performance', batchSize: 4096 },
  scene: [
    BootScene, TitleScene, MapScene, HangarScene, ShopScene, SpecsScene, OptionsScene, IntelScene,
    GameScene, LevelEndScene, GameOverScene, PauseScene,
  ],
});

installHooks(game);
if (DEBUG.fps) (window as unknown as { __fps: boolean }).__fps = true;
