// STUB — to be implemented by the platform module owner (see docs/ARCHITECTURE.md).
// Trade-in rule: buying an item in a slot refunds 100% of what was spent on the item it
// replaces (purchase + upgrades). Weapon power resets to 1 when the weapon changes.
import type { ShopCategory } from '../game/contracts';

export interface ShopItem {
  id: string | null;      // null = "None" (empty slot) entry
  name: string;
  cost: number;           // price at power 1
  desc: string;
  locked: boolean;        // not yet unlocked by campaign progress
  equipped: boolean;
}

export interface TxResult { ok: boolean; reason?: 'credits' | 'locked' | 'slot' | 'max' | 'min'; credits: number }

/** Items listed in a shop category (including a "None" entry for rear / sidekicks). */
export function shopItems(category: ShopCategory): ShopItem[] { void category; return []; }
/** Net credits needed to switch the slot to item `id` (cost - trade-in of the current item). */
export function switchCost(category: ShopCategory, id: string | null): number { void category; void id; return 0; }
/** Buy / equip item `id` in a category, applying the trade-in rule. */
export function buyItem(category: ShopCategory, id: string | null): TxResult { void category; void id; return { ok: false, credits: 0 }; }
/** Price to raise a weapon from `power` to `power + 1`. */
export function upgradeCost(weaponId: string, power: number): number { void weaponId; void power; return 0; }
/** Raise (+1) or lower (-1, refund) the power of the front or rear weapon. */
export function changePower(slot: 'front' | 'rear', delta: 1 | -1): TxResult { void slot; void delta; return { ok: false, credits: 0 }; }
/** Total trade-in value of the whole current loadout (for the ship value display). */
export function loadoutValue(): number { return 0; }
