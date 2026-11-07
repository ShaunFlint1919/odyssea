// =====================================================================================
//  GAMEPLAY <-> UI CONTRACTS
//  - The Game scene (src/scenes/GameScene.ts, gameplay module) owns the HUD instance it
//    creates with createHud() from src/ui/Hud.ts (UI module) and feeds it a HudModel.
//  - The Shop scene (UI module) shows a live weapon demo via createWeaponPreview() from
//    src/game/preview.ts (gameplay module).
// =====================================================================================
import type Phaser from 'phaser';
import type { Loadout } from '../types';

/** Everything the right-side HUD panel displays. Values are raw (not normalised) unless noted. */
export interface HudModel {
  armor: number;
  armorMax: number;
  shield: number;
  shieldMax: number;
  energy: number;
  energyMax: number;
  frontName: string;
  frontPower: number;
  rearName: string | null;
  rearPower: number;
  rearMode: 0 | 1;
  sidekickL: string | null;   // display name
  sidekickR: string | null;
  levelName: string;
  score: number;
  credits: number;            // credits earned this level
  progress: number;           // 0..1 progress through the level
  bossHp: number | null;      // 0..1 when a boss is active, else null
  bossName: string | null;
}

export interface HudApi {
  update(model: HudModel): void;
  /** Brief visual feedback on the HUD gauges. */
  flash(kind: 'damage' | 'shield' | 'pickup' | 'energy'): void;
  /** Big centred banner over the playfield (e.g. "WARNING", "STAGE CLEAR"). */
  showBanner(text: string, sub?: string, ms?: number): void;
  destroy(): void;
}

/**
 * HUD input events emitted on scene.events by the HUD's touch buttons:
 *  - HUD_EVENTS.pause      (pause button tapped)
 *  - HUD_EVENTS.rearToggle (rear-gun mode button tapped)
 */
export const HUD_EVENTS = {
  pause: 'hud:pause',
  rearToggle: 'hud:rear',
} as const;

/** A small self-running demo of a loadout's weapons inside a rectangle (shop preview window). */
export interface WeaponPreviewApi {
  setLoadout(loadout: Loadout): void;
  destroy(): void;
}

export type CreateWeaponPreview = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  loadout: Loadout,
) => WeaponPreviewApi;

/** Data passed when starting the Game scene. */
export interface GameStartData {
  levelId: string;
}

/** Shop categories (Upgrade Ship menu entries). */
export type ShopCategory = 'hull' | 'front' | 'rear' | 'shield' | 'generator' | 'sidekickL' | 'sidekickR';
export const SHOP_CATEGORIES: ShopCategory[] = ['hull', 'front', 'rear', 'shield', 'generator', 'sidekickL', 'sidekickR'];

/**
 * Pause flow: the Game scene pauses itself and launches the Pause scene (UI).
 *  - Resume: Pause scene calls this.scene.resume(SCENES.Game) then this.scene.stop().
 *  - Abort:  Pause scene emits PAUSE_EVENTS.abort on the GAME scene's events
 *            (this.scene.get(SCENES.Game).events.emit(PAUSE_EVENTS.abort)), then stops itself.
 *            The Game scene resumes, ends the level as a failure and starts GameOver.
 *
 * Level results: the Game scene NEVER writes the save. It starts LevelEnd (success) or
 * GameOver (death / abort) with a LevelResult; those UI scenes call applyLevelResult()
 * from src/state/progress.ts exactly once in create().
 */
export const PAUSE_EVENTS = {
  abort: 'pause:abort',
} as const;
