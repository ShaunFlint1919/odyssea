// =====================================================================================
//  ART USAGE FILTER — which palette variants of enemy / boss sprites to generate.
//  By default (no usage set, e.g. the texture gallery) every palette of every sprite is built.
//  The Boot scene sets the usage from the content catalogue so a phone only generates the
//  variants the campaign actually uses (bosses: 8 of 64 bodies) — a large boot-time and
//  GPU-memory saving. Shadows, animations and damaged variants follow the same filter.
// =====================================================================================
import type { Palette } from '../types';

interface ArtUsage {
  /** enemy sprite (ENEMY_SPRITES key, also used for turret tops) -> palettes to generate */
  enemies: Map<string, Set<Palette>>;
  /** boss body sprite (BOSS_SPRITES key) -> palettes to generate */
  bosses: Map<string, Set<Palette>>;
  /** palettes for boss parts and the core pulse (union of every boss palette) */
  bossParts: Set<Palette>;
}

let usage: ArtUsage | null = null;

/** Restrict generation to the given variants (null = generate everything). Call before generating. */
export function setArtUsage(u: ArtUsage | null): void {
  usage = u;
}

/** Should enemyKey(sprite, palette) (and its turret top) be generated? */
export function enemyVariantWanted(sprite: string, palette: Palette): boolean {
  return !usage || (usage.enemies.get(sprite)?.has(palette) ?? false);
}

/** Should bossKey(sprite, palette) (body + damaged body) be generated? */
export function bossVariantWanted(sprite: string, palette: Palette): boolean {
  return !usage || (usage.bosses.get(sprite)?.has(palette) ?? false);
}

/** Should boss parts / the core pulse be generated in this palette? */
export function bossPartPaletteWanted(palette: Palette): boolean {
  return !usage || usage.bossParts.has(palette);
}

/** Helper for building a usage map. */
export function addUsage(map: Map<string, Set<Palette>>, sprite: string, palette: Palette): void {
  let set = map.get(sprite);
  if (!set) map.set(sprite, (set = new Set()));
  set.add(palette);
}
