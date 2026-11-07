// =====================================================================================
//  ARSENAL — createArsenal(host, loadout, depths), see the contract in ./api.ts.
//  Public entry of the arsenal module; the implementation is ArsenalImpl in ./core.ts
//  (front gun, rear gun A/B, two sidekick drones, pooled player shots and FX).
// =====================================================================================
import type { Loadout } from '../../types';
import type { ArsenalDepths, ArsenalHost, CreateArsenal } from './api';
import { ArsenalImpl, type ArsenalOptions } from './core';

export { ArsenalImpl } from './core';
export type { ArsenalCounts, ArsenalOptions } from './core';

/**
 * Creates the arsenal with extra options (shop preview: layer + smaller pool). Returns the
 * implementation so the preview can also draw through its FX pools and read debugCounts().
 */
export function createArsenalWith(host: ArsenalHost, loadout: Loadout, depths: ArsenalDepths, opts: ArsenalOptions): ArsenalImpl {
  return new ArsenalImpl(host, loadout, depths, opts);
}

/** Creates the player's weapons for a level (contract: ./api.ts). */
export const createArsenal: CreateArsenal = (host, loadout, depths) => new ArsenalImpl(host, loadout, depths, {});
