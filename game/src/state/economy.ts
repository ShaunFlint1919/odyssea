// =====================================================================================
//  ECONOMY — shop listing, trade-in purchases and weapon power upgrades.
//  Rules (docs/ARCHITECTURE.md):
//  - Buying an item in a slot refunds 100 % of what was spent on the item it replaces
//    (purchase price + every power upgrade bought for it).
//  - Changing a weapon resets its power to 1. Upgrade n -> n+1 costs upgradeBase * n;
//    lowering the power refunds the last upgrade. Power stays within 1..MAX_POWER.
//  - Rear gun and sidekick slots have a "None" entry (id null) that sells the item.
//  - Hull sidekick slots: 0 = none, 1 = LEFT only, 2 = left + right. Switching to a hull with
//    fewer slots auto-sells the sidekicks that no longer fit (their value is part of the price).
//  - Items whose unlockLevel is not completed are locked (cannot be bought).
//  Every successful transaction persists the save immediately.
// =====================================================================================
import type { ShopCategory } from '../game/contracts';
import type { GeneratorDef, HullDef, SaveData, ShieldDef, SidekickDef, WeaponDef } from '../types';
import { MAX_POWER } from '../config';
import { GENERATORS, HULLS, SHIELDS, SIDEKICKS, WEAPONS } from '../data';
import { getSave, saveNow } from './save';

export interface ShopItem {
  id: string | null;      // null = "None" (empty slot) entry
  name: string;
  cost: number;           // price at power 1
  desc: string;
  locked: boolean;        // not yet unlocked by campaign progress
  equipped: boolean;
}

export interface TxResult { ok: boolean; reason?: 'credits' | 'locked' | 'slot' | 'max' | 'min'; credits: number }

type ItemDef = HullDef | WeaponDef | ShieldDef | GeneratorDef | SidekickDef;

/** Display name / description of the "None" entry. */
export const NONE_ITEM_NAME = 'None';
const NONE_DESC = 'Leave this slot empty. Sells the equipped item at full value.';

const NULLABLE: ReadonlySet<ShopCategory> = new Set<ShopCategory>(['rear', 'sidekickL', 'sidekickR']);

// ------------------------------------------------------------------------- catalogue access

/** Catalogue entries sold in a category (catalogue order). */
function catalog(category: ShopCategory): readonly ItemDef[] {
  switch (category) {
    case 'hull': return HULLS;
    case 'front': return WEAPONS.filter((w) => w.slot === 'front');
    case 'rear': return WEAPONS.filter((w) => w.slot === 'rear');
    case 'shield': return SHIELDS;
    case 'generator': return GENERATORS;
    case 'sidekickL':
    case 'sidekickR': return SIDEKICKS;
    default: return [];
  }
}

function findDef(category: ShopCategory, id: string | null): ItemDef | undefined {
  if (id === null) return undefined;
  return catalog(category).find((d) => d.id === id);
}

function findWeapon(id: string | null): WeaponDef | undefined {
  return id === null ? undefined : WEAPONS.find((w) => w.id === id);
}

function equippedId(save: SaveData, category: ShopCategory): string | null {
  const l = save.loadout;
  switch (category) {
    case 'hull': return l.hull;
    case 'front': return l.front;
    case 'rear': return l.rear;
    case 'shield': return l.shield;
    case 'generator': return l.generator;
    case 'sidekickL': return l.sidekickL;
    case 'sidekickR': return l.sidekickR;
    default: return null;
  }
}

/** Sum of the upgrades bought to bring a weapon from power 1 to `power`. */
function upgradesSpent(w: WeaponDef, power: number): number {
  const p = Math.max(1, Math.min(MAX_POWER, Math.floor(power)));
  return (w.upgradeBase * (p - 1) * p) / 2;
}

/** Everything spent on the item currently in a slot (its 100 % trade-in value). */
function spentOn(save: SaveData, category: ShopCategory): number {
  const id = equippedId(save, category);
  if (id === null) return 0;
  if (category === 'front' || category === 'rear') {
    const w = findWeapon(id);
    if (!w) return 0;
    return w.cost + upgradesSpent(w, category === 'front' ? save.loadout.frontPower : save.loadout.rearPower);
  }
  return findDef(category, id)?.cost ?? 0;
}

/** Number of sidekick slots of a hull (unknown hull: 2, so nothing is ever lost). */
function slotsOf(hullId: string): number {
  return HULLS.find((h) => h.id === hullId)?.sidekickSlots ?? 2;
}

function isLockedDef(save: SaveData, def: ItemDef): boolean {
  return !!def.unlockLevel && !save.completedLevels.includes(def.unlockLevel);
}

/** Refund of the sidekicks a switch to `hullId` would auto-sell. */
function autoSellRefund(save: SaveData, hullId: string): number {
  const slots = slotsOf(hullId);
  let refund = 0;
  if (slots < 2) refund += spentOn(save, 'sidekickR');
  if (slots < 1) refund += spentOn(save, 'sidekickL');
  return refund;
}

// ------------------------------------------------------------------------- queries

/** Sidekick slots of the equipped hull: 0, 1 (left only) or 2. */
export function sidekickSlots(): number {
  return slotsOf(getSave().loadout.hull);
}

/** False for a sidekick category the equipped hull cannot carry (UI greys it out). */
export function categoryAvailable(category: ShopCategory): boolean {
  if (category === 'sidekickL') return sidekickSlots() >= 1;
  if (category === 'sidekickR') return sidekickSlots() >= 2;
  return true;
}

/** Trade-in value (100 %) of the item equipped in a category, upgrades included. */
export function equippedValue(category: ShopCategory): number {
  return spentOn(getSave(), category);
}

/** Items listed in a shop category (including a "None" entry for rear / sidekicks). */
export function shopItems(category: ShopCategory): ShopItem[] {
  const save = getSave();
  const current = equippedId(save, category);
  const items: ShopItem[] = [];
  if (NULLABLE.has(category)) {
    items.push({ id: null, name: NONE_ITEM_NAME, cost: 0, desc: NONE_DESC, locked: false, equipped: current === null });
  }
  for (const def of catalog(category)) {
    const equipped = def.id === current;
    items.push({ id: def.id, name: def.name, cost: def.cost, desc: def.desc, locked: !equipped && isLockedDef(save, def), equipped });
  }
  return items;
}

/**
 * Net credits needed to switch the slot to item `id` (cost - trade-in of the current item,
 * minus the value of sidekicks a hull switch auto-sells). Negative = refund. 0 if already equipped.
 */
export function switchCost(category: ShopCategory, id: string | null): number {
  const save = getSave();
  if (id === equippedId(save, category)) return 0;
  const price = id === null ? 0 : findDef(category, id)?.cost ?? 0;
  let net = price - spentOn(save, category);
  if (category === 'hull' && id !== null) net -= autoSellRefund(save, id);
  return net;
}

/** Buy / equip item `id` in a category, applying the trade-in rule. Persists on success. */
export function buyItem(category: ShopCategory, id: string | null): TxResult {
  const save = getSave();
  const fail = (reason: NonNullable<TxResult['reason']>): TxResult => ({ ok: false, reason, credits: save.credits });
  const current = equippedId(save, category);
  if (id === current) return { ok: true, credits: save.credits };

  if (id === null) {
    if (!NULLABLE.has(category)) return fail('slot');
  } else {
    const def = findDef(category, id);
    if (!def || !categoryAvailable(category)) return fail('slot');
    if (isLockedDef(save, def)) return fail('locked');
  }

  const cost = switchCost(category, id);
  if (cost > save.credits) return fail('credits');
  save.credits -= cost;

  const l = save.loadout;
  switch (category) {
    case 'hull': {
      // id is non-null here (hull is not nullable).
      l.hull = id as string;
      const slots = slotsOf(l.hull);
      if (slots < 2) l.sidekickR = null; // value already refunded through switchCost
      if (slots < 1) l.sidekickL = null;
      break;
    }
    case 'front': l.front = id as string; l.frontPower = 1; break;
    case 'rear': l.rear = id; l.rearPower = 1; break;
    case 'shield': l.shield = id as string; break;
    case 'generator': l.generator = id as string; break;
    case 'sidekickL': l.sidekickL = id; break;
    case 'sidekickR': l.sidekickR = id; break;
  }
  saveNow();
  return { ok: true, credits: save.credits };
}

/** Price to raise a weapon from `power` to `power + 1` (upgradeBase * power; 0 for an unknown weapon). */
export function upgradeCost(weaponId: string, power: number): number {
  const w = findWeapon(weaponId);
  return w ? w.upgradeBase * Math.max(1, Math.floor(power)) : 0;
}

/** Raise (+1) or lower (-1, refund of the last upgrade) the power of the front or rear weapon. Persists on success. */
export function changePower(slot: 'front' | 'rear', delta: 1 | -1): TxResult {
  const save = getSave();
  const l = save.loadout;
  const fail = (reason: NonNullable<TxResult['reason']>): TxResult => ({ ok: false, reason, credits: save.credits });
  const id = slot === 'front' ? l.front : l.rear;
  if (id === null || !findWeapon(id)) return fail('slot');
  const power = slot === 'front' ? l.frontPower : l.rearPower;

  if (delta > 0) {
    if (power >= MAX_POWER) return fail('max');
    const cost = upgradeCost(id, power);
    if (cost > save.credits) return fail('credits');
    save.credits -= cost;
  } else {
    if (power <= 1) return fail('min');
    save.credits += upgradeCost(id, power - 1);
  }
  const next = power + (delta > 0 ? 1 : -1);
  if (slot === 'front') l.frontPower = next;
  else l.rearPower = next;
  saveNow();
  return { ok: true, credits: save.credits };
}

/** Total trade-in value of the whole current loadout (for the ship value display). */
export function loadoutValue(): number {
  const save = getSave();
  let total = 0;
  for (const c of ['hull', 'front', 'rear', 'shield', 'generator', 'sidekickL', 'sidekickR'] as const) total += spentOn(save, c);
  return total;
}
