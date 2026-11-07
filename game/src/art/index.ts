import Phaser from 'phaser';
import { generateFonts } from './fonts';
import { generatePlayerArt } from './player';
import { generateProjectileArt } from './projectiles';
import { generatePickupArt } from './pickups';
import { generateFxArt, registerAnimations } from './fx';
import { generateUiArt } from './ui';
import { generatePlanetArt } from './planets';
import { generateEnemyArt } from './enemies';
import { generateBossArt } from './bosses';
import { generateDoodadArt } from './doodads';

/** Generates every texture of the game procedurally. Called once by the Boot scene. */
export function generateAllTextures(scene: Phaser.Scene): void {
  const t0 = performance.now();
  generateFonts(scene);
  generatePlayerArt(scene);
  generateProjectileArt(scene);
  generatePickupArt(scene);
  generateFxArt(scene);
  generateUiArt(scene);
  generatePlanetArt(scene);
  generateEnemyArt(scene);
  generateBossArt(scene);
  generateDoodadArt(scene);
  registerAnimations(scene);
  if (import.meta.env?.DEV) console.info(`[art] textures generated in ${(performance.now() - t0).toFixed(0)} ms`);
}
