// =====================================================================================
//  META SCREENS — shared, side-effect free helpers (safe catalogue lookups, formatting,
//  campaign queries). Everything here tolerates an empty / partial content catalogue so
//  the menus never crash while other modules are still being written.
// =====================================================================================
import type {
  GeneratorDef, HullDef, LevelDef, Loadout, PlanetDef, ShieldDef, ShotColor, SidekickDef, WeaponDef,
} from '../../types';
import type { ShopCategory } from '../../game/contracts';
import { SHOT_RGB } from '../../art/keys';
import { COLORS } from '../../config';
import { GENERATORS, HULLS, INTEL, LEVELS, PLANETS, SHIELDS, SIDEKICKS, WEAPONS, levelOrder } from '../../data';
import { getSave } from '../../state/save';
import { isCompleted, isUnlocked } from '../../state/progress';

// ------------------------------------------------------------------------- lookups

const byId = <T extends { id: string }>(list: readonly T[], id: string | null | undefined): T | undefined =>
  id ? list.find((d) => d.id === id) : undefined;

export const findHull = (id: string | null | undefined): HullDef | undefined => byId(HULLS, id);
export const findShield = (id: string | null | undefined): ShieldDef | undefined => byId(SHIELDS, id);
export const findGenerator = (id: string | null | undefined): GeneratorDef | undefined => byId(GENERATORS, id);
export const findWeapon = (id: string | null | undefined): WeaponDef | undefined => byId(WEAPONS, id);
export const findSidekick = (id: string | null | undefined): SidekickDef | undefined => byId(SIDEKICKS, id);
export const findPlanet = (id: string | null | undefined): PlanetDef | undefined => byId(PLANETS, id);
export const findLevel = (id: string | null | undefined): LevelDef | undefined => byId(LEVELS, id);

/** Display name of whatever is equipped in a shop category ("NONE" for an empty slot). */
export function equippedName(loadout: Loadout, cat: ShopCategory): string {
  switch (cat) {
    case 'hull': return upper(findHull(loadout.hull)?.name ?? loadout.hull);
    case 'front': return upper(findWeapon(loadout.front)?.name ?? loadout.front);
    case 'rear': return loadout.rear ? upper(findWeapon(loadout.rear)?.name ?? loadout.rear) : 'NONE';
    case 'shield': return upper(findShield(loadout.shield)?.name ?? loadout.shield);
    case 'generator': return upper(findGenerator(loadout.generator)?.name ?? loadout.generator);
    case 'sidekickL': return loadout.sidekickL ? upper(findSidekick(loadout.sidekickL)?.name ?? loadout.sidekickL) : 'NONE';
    case 'sidekickR': return loadout.sidekickR ? upper(findSidekick(loadout.sidekickR)?.name ?? loadout.sidekickR) : 'NONE';
    default: return '';
  }
}

/** Id equipped in a shop category. */
export function equippedId(loadout: Loadout, cat: ShopCategory): string | null {
  switch (cat) {
    case 'hull': return loadout.hull;
    case 'front': return loadout.front;
    case 'rear': return loadout.rear;
    case 'shield': return loadout.shield;
    case 'generator': return loadout.generator;
    case 'sidekickL': return loadout.sidekickL;
    case 'sidekickR': return loadout.sidekickR;
    default: return null;
  }
}

/** Copy of `base` with item `id` placed in `cat` (weapon power resets to 1 on a change). */
export function loadoutWith(base: Loadout, cat: ShopCategory, id: string | null): Loadout {
  const l: Loadout = { ...base };
  switch (cat) {
    case 'hull': {
      if (!id) break;
      l.hull = id;
      const slots = findHull(id)?.sidekickSlots ?? 2;
      if (slots < 2) l.sidekickR = null;
      if (slots < 1) l.sidekickL = null;
      break;
    }
    case 'front': if (id && id !== base.front) { l.front = id; l.frontPower = 1; } break;
    case 'rear': if (id !== base.rear) { l.rear = id; l.rearPower = 1; } break;
    case 'shield': if (id) l.shield = id; break;
    case 'generator': if (id) l.generator = id; break;
    case 'sidekickL': l.sidekickL = id; break;
    case 'sidekickR': l.sidekickR = id; break;
    default: break;
  }
  return l;
}

// ------------------------------------------------------------------------- formatting

/** Upper-case display text (the menus are all caps). */
export const upper = (s: string): string => s.toUpperCase();

/** 12345 -> "12,345" (sign kept). */
export function fmt(n: number): string {
  const v = Math.round(Math.abs(n));
  const s = v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 0 ? `-${s}` : s;
}

/** Compact decimal: 2 -> "2", 2.5 -> "2.5", 0.333 -> "0.33". */
export function dec(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '-';
  const r = Math.round(n * 10 ** digits) / 10 ** digits;
  return Number.isInteger(r) ? r.toString() : r.toFixed(digits).replace(/0+$/, '');
}

/** Signed value: 3 -> "+3", -2 -> "-2", 0 -> "0". */
export const signed = (n: number, digits = 1): string => (n > 0 ? `+${dec(n, digits)}` : dec(n, digits));

/** Glow colour (0xRRGGBB) of a shot colour, with a safe default. */
export const shotGlow = (c: ShotColor | undefined): number => (c && SHOT_RGB[c] ? SHOT_RGB[c].glow : COLORS.shield);

/** Word-wrap `str` into at most `maxLines` lines of `maxChars` characters ("..." when cut). */
export function wrapLines(str: string, maxChars: number, maxLines: number): string[] {
  const words = str.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  let used = 0;
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) { cur = next; used++; continue; }
    if (cur) lines.push(cur);
    if (lines.length === maxLines) { cur = ''; break; }
    cur = w.length > maxChars ? w.slice(0, maxChars) : w;
    used++;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (used < words.length && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (last.length + 3 > maxChars && last.includes(' ')) last = last.slice(0, last.lastIndexOf(' '));
    if (last.length + 3 > maxChars) last = last.slice(0, Math.max(1, maxChars - 3));
    lines[lines.length - 1] = `${last.replace(/[.,;:!?-]+$/, '')}...`;
  }
  return lines;
}

// ------------------------------------------------------------------------- campaign

/** The level LAUNCH MISSION starts: save.currentLevel when valid, else the first open level. */
export function nextMissionId(): string | null {
  const save = getSave();
  if (save.currentLevel && findLevel(save.currentLevel) && isUnlocked(save.currentLevel)) return save.currentLevel;
  const order = levelOrder();
  return order.find((id) => isUnlocked(id) && !isCompleted(id)) ?? order.filter((id) => isUnlocked(id)).pop() ?? order[0] ?? null;
}

/** Planet that owns a level. */
export function planetOfLevel(levelId: string | null | undefined): PlanetDef | undefined {
  if (!levelId) return undefined;
  const lv = findLevel(levelId);
  return (lv && findPlanet(lv.planet)) ?? PLANETS.find((p) => p.levels.includes(levelId));
}

/** Number of collected but unread intel messages. */
export function unreadIntelCount(): number {
  const s = getSave();
  const known = INTEL.length === 0 ? null : new Set(INTEL.map((i) => i.id));
  return s.intel.filter((id) => !s.intelRead.includes(id) && (!known || known.has(id))).length;
}

/** Completed / total campaign levels. */
export function campaignProgress(): { done: number; total: number } {
  const order = levelOrder();
  return { done: order.filter((id) => isCompleted(id)).length, total: order.length };
}

/** Readable unlock hint for a catalogue item ("CLEAR KESSRA 2"). */
export function unlockHint(levelId: string | undefined): string {
  if (!levelId) return 'LOCKED';
  const lv = findLevel(levelId);
  const p = planetOfLevel(levelId);
  if (lv && p) return `CLEAR ${upper(p.name)} ${lv.index} TO UNLOCK`;
  return `CLEAR ${upper(levelId)} TO UNLOCK`;
}

/** Largest catalogue values (gauge normalisation). Never 0. */
export function catalogMax(): { armor: number; speed: number; shield: number; regen: number; genCap: number; genOut: number } {
  const max = (vals: number[], d: number) => Math.max(d, ...vals.filter((v) => Number.isFinite(v)));
  return {
    armor: max(HULLS.map((h) => h.armor), 1),
    speed: max(HULLS.map((h) => h.speed), 1),
    shield: max(SHIELDS.map((s) => s.capacity), 1),
    regen: max(SHIELDS.map((s) => s.regen), 1),
    genCap: max(GENERATORS.map((g) => g.capacity), 1),
    genOut: max(GENERATORS.map((g) => g.output), 1),
  };
}

// ------------------------------------------------------------------------- hangar focus memory

let hangarFocus = 0;
/** Remember which Hangar menu entry to focus next time the Hangar opens. */
export function setHangarFocus(i: number): void { hangarFocus = Math.max(0, Math.floor(i)); }
/** The Hangar menu entry to focus (defaults to LAUNCH MISSION). */
export function hangarFocusIndex(): number { return hangarFocus; }
