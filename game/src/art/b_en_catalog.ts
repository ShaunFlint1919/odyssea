// =====================================================================================
//  ENEMY ART CATALOG — maps every ENEMY_SPRITES id (and turret head) to its design
//  function. Phaser-free so it can be used by tools/tests; rendered by enemies.ts.
// =====================================================================================
import type { PixelMap } from './pixel';
import type { EnemySprite } from './keys';
import {
  drawBomber, drawDart, drawDrone, drawGunship, drawHornet, drawKamikaze, drawManta, drawSaucer, drawSentinel,
  drawSpinner, drawWasp,
} from './b_en_air';
import { drawCarrier, drawFrigate } from './b_en_capital';
import {
  drawBunker, drawCrawler, drawRadar, drawSilo, drawTankBase, drawTankTop, drawTurretBase, drawTurretTop,
  drawTwinBase, drawTwinTop,
} from './b_en_ground';
import { drawBoat, drawDestroyer } from './b_en_sea';
import { drawMine, drawRockL, drawRockM, drawRockS } from './b_en_hazards';

/** A design returns one pixel map, or several equally sized frames (sprite sheet). */
export type EnemyDesign = () => PixelMap | PixelMap[];

export const ENEMY_DESIGNS: Record<EnemySprite, EnemyDesign> = {
  en_dart: drawDart,
  en_wasp: drawWasp,
  en_drone: drawDrone,
  en_kamikaze: drawKamikaze,
  en_hornet: drawHornet,
  en_saucer: drawSaucer,
  en_spinner: drawSpinner,
  en_manta: drawManta,
  en_sentinel: drawSentinel,
  en_bomber: drawBomber,
  en_gunship: drawGunship,
  en_frigate: drawFrigate,
  en_carrier: drawCarrier,
  gr_turret: drawTurretBase,
  gr_twin: drawTwinBase,
  gr_tank: drawTankBase,
  gr_crawler: drawCrawler,
  gr_bunker: drawBunker,
  gr_silo: drawSilo,
  gr_radar: drawRadar,
  sea_boat: drawBoat,
  sea_destroyer: drawDestroyer,
  hz_mine: drawMine,
  hz_rock_s: drawRockS,
  hz_rock_m: drawRockM,
  hz_rock_l: drawRockL,
};

/** Rotatable heads of ground units, keyed by base sprite (same size as the base). */
export const TOP_DESIGNS: Record<string, EnemyDesign> = {
  gr_turret: drawTurretTop,
  gr_twin: drawTwinTop,
  gr_tank: drawTankTop,
};

/** Normalise a design result to a list of frames. */
export function designFrames(out: PixelMap | PixelMap[]): PixelMap[] {
  return Array.isArray(out[0]) ? (out as PixelMap[]) : [out as PixelMap];
}
