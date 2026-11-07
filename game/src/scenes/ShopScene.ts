import Phaser from 'phaser';
import { COLORS, SCENES } from '../config';
import { markSceneReady, setHookState } from '../debug';
import { hullKey, shotKey, sidekickKey } from '../art/keys';
import { audio } from '../audio';
import type { Loadout } from '../types';
import { SHOP_CATEGORIES, type ShopCategory, type WeaponPreviewApi } from '../game/contracts';
import { createWeaponPreview } from '../game/preview';
import { getSave } from '../state/save';
import {
  buyItem, categoryAvailable, changePower, equippedValue, shopItems, switchCost, upgradeCost, type ShopItem, type TxResult,
} from '../state/economy';
import { GENERATORS, SHIELDS } from '../data';
import * as kit from '../ui/kit';
import { META, ensureMetaArt, frameIcon, generatorChip, iconOr, shieldChip, weaponChip } from '../ui/meta/art';
import { HEADER_H, MD, cornerBrackets, sectionLabel, toast } from '../ui/meta/chrome';
import { scanlines, screenBackdrop, screenHeader, type ScreenHeaderApi } from '../ui/widgets';
import {
  dec, equippedId, equippedName, findGenerator, findHull, findShield, findSidekick, findWeapon, fmt, loadoutWith, shotGlow, unlockHint, upper, wrapLines,
} from '../ui/meta/common';
import { ShipBay } from '../ui/meta/shipBay';
import { energyBalance, sidekickStats, weaponStats } from '../ui/meta/stats';
import { PowerRow, compareGrid, type CompareCell } from '../ui/meta/widgets';

interface ShopData { category?: string; focus?: string }

const CATS: { cat: ShopCategory; label: string; title: string; icon: string; help: string }[] = [
  { cat: 'hull', label: 'HULL', title: 'HULL', icon: 'ui_icon_hull', help: 'SHIP FRAME: ARMOR, SPEED, HITBOX, DRONE MOUNTS' },
  { cat: 'front', label: 'MAIN GUN', title: 'MAIN GUN', icon: 'ui_icon_front', help: 'YOUR PRIMARY WEAPON - BUY POWER LEVELS UP TO 10' },
  { cat: 'rear', label: 'TAIL GUN', title: 'TAIL GUN', icon: 'ui_icon_rear', help: 'GUARDS YOUR TAIL - TWO MODES, TOGGLED IN FLIGHT' },
  { cat: 'shield', label: 'SHIELD', title: 'SHIELD', icon: 'ui_icon_shield', help: 'SOAKS HITS FIRST, RECHARGES ON ENERGY' },
  { cat: 'generator', label: 'GENERATOR', title: 'GENERATOR', icon: 'ui_icon_generator', help: 'POWERS YOUR GUNS AND SHIELD RECHARGE' },
  { cat: 'sidekickL', label: 'LEFT DRONE', title: 'LEFT DRONE', icon: 'ui_icon_sidekick', help: 'DRONE ON THE LEFT MOUNT - USES NO ENERGY' },
  { cat: 'sidekickR', label: 'RIGHT DRONE', title: 'RIGHT DRONE', icon: 'ui_icon_sidekick', help: 'DRONE ON THE RIGHT MOUNT - USES NO ENERGY' },
];

const isCategory = (c: unknown): c is ShopCategory => typeof c === 'string' && (SHOP_CATEGORIES as string[]).includes(c);
const isGun = (c: ShopCategory | null): c is 'front' | 'rear' => c === 'front' || c === 'rear';

/** Refit bay: category list, then the item list of a category with a live weapon preview. */
export class ShopScene extends Phaser.Scene {
  private cat: ShopCategory | null = null;
  private startFocus: ShopCategory | null = null;
  private hdr!: ScreenHeaderApi;
  private status!: kit.StatusBarApi;
  private page: Phaser.GameObjects.GameObject[] = [];
  private infoObjs: Phaser.GameObjects.GameObject[] = [];
  private list?: kit.MenuList;
  private preview?: WeaponPreviewApi;
  private bay?: ShipBay;
  private holo?: ShipBay;
  private power?: PowerRow;
  private buyBtn?: kit.ButtonApi;
  private items: ShopItem[] = [];
  private info = { x: 0, y: 0, w: 0, h: 0 };
  private toastY = 0;

  constructor() {
    super(SCENES.Shop);
  }

  init(data: ShopData): void {
    this.cat = isCategory(data?.category) ? data.category : null;
    this.startFocus = isCategory(data?.focus) ? data.focus : null;
  }

  create(): void {
    kit.fadeIn(this);
    audio.music('hangar');
    ensureMetaArt(this);
    this.page = [];
    this.infoObjs = [];
    screenBackdrop(this);
    this.hdr = screenHeader(this, 'REFIT BAY', { back: () => this.back(), credits: getSave().credits });
    this.status = kit.statusBar(this, '');
    kit.onBack(this, () => this.back());
    this.showPage(this.cat, this.startFocus, false);
    markSceneReady(SCENES.Shop, this.hookState());
  }

  // ------------------------------------------------------------------ navigation

  private back(): void {
    audio.sfx('ui_back');
    if (this.cat) this.showPage(null, this.cat, true);
    else kit.goto(this, SCENES.Hangar);
  }

  private showPage(cat: ShopCategory | null, focus: ShopCategory | null, wipe: boolean): void {
    this.clearPage();
    this.cat = cat;
    if (cat) this.buildItems(cat);
    else this.buildCategories(focus);
    if (wipe) this.wipe();
    setHookState(this.hookState());
  }

  private clearPage(): void {
    this.clearInfo();
    try { this.preview?.destroy(); } catch (e) { console.warn('[shop] preview destroy failed', e); }
    this.preview = undefined;
    this.bay?.destroy();
    this.bay = undefined;
    this.holo?.destroy();
    this.holo = undefined;
    this.power?.destroy();
    this.power = undefined;
    this.list?.destroy();
    this.list = undefined;
    this.buyBtn = undefined;
    this.tweens.killTweensOf(this.page);
    this.page.forEach((o) => o.destroy());
    this.page = [];
  }

  private clearInfo(): void {
    this.tweens.killTweensOf(this.infoObjs);
    this.infoObjs.forEach((o) => o.destroy());
    this.infoObjs = [];
  }

  /** Short dark wipe over the content when switching pages. */
  private wipe(): void {
    const { width, height } = this.scale.gameSize;
    const r = this.add.rectangle(0, HEADER_H + 2, width, height - HEADER_H - 18, COLORS.bg, 1).setOrigin(0).setDepth(MD.toast - 1);
    this.tweens.add({ targets: r, alpha: 0, duration: 170, ease: 'Quad.Out', onComplete: () => r.destroy() });
  }

  private track<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.page.push(o);
    return o;
  }

  private hookState(): Record<string, unknown> {
    const s = getSave();
    const focus = this.list?.index ?? 0;
    return {
      page: this.cat ? 'items' : 'categories', category: this.cat, credits: s.credits, focus,
      focusId: this.cat ? this.items[focus]?.id ?? null : null, loadout: { ...s.loadout },
    };
  }

  // ------------------------------------------------------------------ shared pieces

  /**
   * Live preview window: weapon demo of `loadout` (ship bay fallback when the demo draws
   * nothing). With `holo`, the right part shows a large ship "hologram" (hull, shield arc and
   * bubble) next to a narrower demo.
   */
  private buildPreview(x: number, y: number, w: number, h: number, loadout: Loadout, tag: string, holo = false): void {
    const hw = holo ? Math.min(140, Math.max(116, Math.round(w * 0.4))) : 0;
    const dw = holo ? w - hw - 3 : w;
    this.track(kit.panel(this, x, y, dw, h, 'inset').setDepth(MD.panel));
    const before = this.children.length;
    let api: WeaponPreviewApi | undefined;
    try {
      api = createWeaponPreview(this, x + 3, y + 3, dw - 6, h - 6, loadout);
    } catch (e) {
      console.warn('[shop] weapon preview failed', e);
    }
    if (api && this.children.length > before) {
      this.preview = api;
    } else {
      try { api?.destroy(); } catch { /* stub */ }
      this.bay = new ShipBay(this, { x: x + 3, y: y + 3, w: dw - 6, h: h - 6, frame: false, gauges: false, nameplate: false, depth: MD.panel, scale: h >= 150 ? 3 : 2 }, loadout);
    }
    this.track(scanlines(this, x + 3, y + 3, dw - 6, h - 6, 0.45, MD.overlay));
    this.track(cornerBrackets(this, x + 4, y + 4, dw - 8, h - 8, COLORS.teal, 5, MD.overlay));
    const t = this.track(kit.text(this, x + 9, y + 7, tag, { size: 's', color: COLORS.teal, depth: MD.overlay }));
    const led = this.track(this.add.rectangle(x + 9 + t.width + 4, y + 10, 3, 3, COLORS.bad).setDepth(MD.overlay));
    this.tweens.add({ targets: led, alpha: 0.2, duration: 500, yoyo: true, repeat: -1, ease: 'Stepped' });
    if (holo) {
      const hx = x + dw + 3;
      this.holo = new ShipBay(this, {
        x: hx, y, w: hw, h, depth: MD.panel, gauges: false, nameplate: false, sidekicks: false, bubble: this.cat === 'shield',
        scale: hw >= 110 && h >= 140 ? 3 : 2,
      }, loadout);
      this.track(kit.text(this, hx + 7, y + 7, 'HOLO', { size: 's', color: COLORS.accentLight, depth: MD.overlay }));
    }
  }

  private setPreview(l: Loadout): void {
    try { this.preview?.setLoadout(l); } catch (e) { console.warn('[shop] preview setLoadout failed', e); }
    this.bay?.setLoadout(l);
    this.holo?.setLoadout(l);
  }

  // ------------------------------------------------------------------ category page

  private buildCategories(focus: ShopCategory | null): void {
    const { width: W, height: H } = this.scale.gameSize;
    this.hdr.setTitle('REFIT BAY');
    const l = getSave().loadout;
    const n = CATS.length + 1;
    const gap = 4, statusH = 16, top = HEADER_H + gap;
    const avail = H - statusH - gap - top;
    let rowH = 22;
    let infoH = 58;
    let pvH = avail - (n * rowH + 12) - infoH - 2 * gap;
    while (pvH > 240 && rowH < 26) { rowH++; pvH = avail - (n * rowH + 12) - infoH - 2 * gap; }
    if (pvH > 280) { infoH += pvH - 280; pvH = 280; }
    infoH = Math.min(infoH, 76);
    pvH = avail - (n * rowH + 12) - infoH - 2 * gap;
    const listH = n * rowH + 12;
    const px = 4, pw = W - 8;
    this.buildPreview(px, top, pw, pvH, l, 'LIVE FIRE TEST');

    const ly = top + pvH + gap;
    this.track(kit.panel(this, px, ly, pw, listH, 'raised').setDepth(MD.panel));
    const listX = px + 20, listW = pw - 28;
    const items: kit.MenuItem[] = CATS.map((c) => {
      const ok = categoryAvailable(c.cat);
      const pw2 = c.cat === 'front' ? ` P${l.frontPower}` : c.cat === 'rear' && l.rear ? ` P${l.rearPower}` : '';
      const name = ok ? equippedName(l, c.cat) : 'NO SLOT';
      const room = listW - (24 + kit.measure(this, c.label, 'm') + 14) - kit.measure(this, pw2, 'm');
      const empty = name === 'NONE' || !ok;
      return {
        label: c.label, icon: iconOr(this, c.icon, META.icEmpty), value: kit.fit(name, room, 'm') + pw2,
        valueColor: empty ? COLORS.textDim : COLORS.teal, help: ok ? c.help : 'THIS HULL HAS NO MOUNT FOR THIS DRONE', arrows: false,
      };
    });
    items.push({ label: 'BACK TO HANGAR', icon: META.icDone, help: 'RETURN TO THE HANGAR - EVERY CHANGE IS SAVED', color: COLORS.accentLight, arrows: false });
    const start = Math.max(0, CATS.findIndex((c) => c.cat === focus));
    const iy = ly + listH + gap;
    this.info = { x: px, y: iy, w: pw, h: infoH };
    this.track(kit.panel(this, px, iy, pw, infoH, 'raised').setDepth(MD.panel));
    this.toastY = ly + listH / 2;
    this.list = new kit.MenuList(this, {
      x: listX, y: ly + 6, width: listW, items, rowHeight: rowH, size: 'm', depth: MD.content, startIndex: start,
      onFocus: (i, it) => { this.status.setText(it.help ?? ''); this.categoryInfo(i); setHookState({ focus: i }); },
      onSelect: (i) => {
        if (i >= CATS.length) kit.goto(this, SCENES.Hangar);
        else this.showPage(CATS[i].cat, null, true);
      },
    });
    this.categoryInfo(this.list.index);
  }

  /** Info box of the category page: the equipped item of the focused category. */
  private categoryInfo(i: number): void {
    this.clearInfo();
    const { x, y, w, h } = this.info;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.infoObjs.push(o); return o; };
    const c = CATS[i];
    if (!c) {
      add(sectionLabel(this, x + 8, y + 7, 'BACK TO HANGAR', w - 16, MD.content));
      add(kit.text(this, x + 10, y + 21, 'Back to the hangar. Every change is saved.', { size: 's', color: COLORS.textDim, depth: MD.content }));
      const bal = energyBalance(getSave().loadout);
      add(kit.text(this, x + 10, y + 33, `ENERGY BALANCE ${bal.net >= 0 ? '+' : ''}${dec(bal.net)}/S`, { size: 's', color: bal.net < 0 ? COLORS.bad : COLORS.good, depth: MD.content }));
      return;
    }
    const l = getSave().loadout;
    const ok = categoryAvailable(c.cat);
    const value = equippedValue(c.cat);
    const vStr = value > 0 ? `VALUE ${fmt(value)}` : '';
    add(sectionLabel(this, x + 8, y + 7, c.title, w - 24 - kit.measure(this, vStr, 's'), MD.content));
    if (vStr) add(kit.text(this, x + w - 8, y + 7, vStr, { size: 's', color: COLORS.gold, originX: 1, depth: MD.content }));
    if (!ok) {
      add(kit.text(this, x + 10, y + 20, 'NO MOUNT', { size: 'm', color: COLORS.textDim, depth: MD.content }));
      add(kit.text(this, x + 10, y + 33, 'This hull cannot carry a drone here.', { size: 's', color: COLORS.textDim, depth: MD.content }));
      return;
    }
    const id = equippedId(l, c.cat);
    const desc = this.describe(c.cat, id);
    const name = id === null ? 'EMPTY SLOT' : equippedName(l, c.cat);
    add(kit.text(this, x + 10, y + 20, kit.fit(name, w - 20, 'm'), { size: 'm', color: id === null ? COLORS.textDim : COLORS.text, depth: MD.content }));
    const stat = h >= 66 ? this.summary(c.cat, id) : '';
    const lines = wrapLines(desc, Math.floor((w - 20) / 6), Math.max(1, Math.min(stat ? 2 : 4, Math.floor((h - 34) / 9))));
    lines.forEach((ln, k) => add(kit.text(this, x + 10, y + 33 + k * 9, ln, { size: 's', color: COLORS.textDim, depth: MD.content })));
    if (stat) add(kit.text(this, x + 10, y + 33 + lines.length * 9 + 3, stat, { size: 's', color: COLORS.teal, depth: MD.content }));
  }

  /** One-line key numbers of the item equipped in a category (category page). */
  private summary(cat: ShopCategory, id: string | null): string {
    const l = getSave().loadout;
    if (id === null) return '';
    switch (cat) {
      case 'hull': {
        const hd = findHull(id);
        return hd ? `ARMOR ${hd.armor}  SPEED ${hd.speed}  MOUNTS ${hd.sidekickSlots}` : '';
      }
      case 'front': case 'rear': {
        const wd = findWeapon(id);
        if (!wd) return '';
        const st = weaponStats(wd, cat === 'front' ? l.frontPower : l.rearPower);
        return `P${st.power}  ${dec(st.dps, 0)} DPS  ${dec(st.energy)} ENERGY/S`;
      }
      case 'shield': {
        const sd = findShield(id);
        return sd ? `CAPACITY ${sd.capacity}  REGEN ${dec(sd.regen)}/S` : '';
      }
      case 'generator': {
        const gd = findGenerator(id);
        return gd ? `OUTPUT ${dec(gd.output)}/S  CAPACITY ${gd.capacity}` : '';
      }
      default: {
        const kd = findSidekick(id);
        return kd ? `${dec(sidekickStats(kd).dps, 0)} DPS  NO ENERGY USED` : '';
      }
    }
  }

  private describe(cat: ShopCategory, id: string | null): string {
    if (id === null) return cat === 'rear' ? 'No rear gun fitted. Your tail is open to attackers.' : 'No drone on this mount. Drones use no energy.';
    switch (cat) {
      case 'hull': return findHull(id)?.desc ?? '';
      case 'front': case 'rear': return findWeapon(id)?.desc ?? '';
      case 'shield': return findShield(id)?.desc ?? '';
      case 'generator': return findGenerator(id)?.desc ?? '';
      default: return findSidekick(id)?.desc ?? '';
    }
  }

  // ------------------------------------------------------------------ item page

  private buildItems(cat: ShopCategory): void {
    const { width: W, height: H } = this.scale.gameSize;
    const meta = CATS.find((c) => c.cat === cat)!;
    this.hdr.setTitle(meta.title);
    const save = getSave();
    this.items = shopItems(cat);
    const n = Math.max(1, this.items.length);
    const gun = isGun(cat);
    const gap = 4, statusH = 16, top = HEADER_H + gap;
    const powerH = gun ? 26 : 0;
    const avail = H - statusH - gap - top - (gun ? powerH + gap : 0);
    let rowH = 22;
    let infoH = 76;
    let pvH = avail - (n * rowH + 12) - infoH - 2 * gap;
    while (pvH > 230 && rowH < 26) { rowH++; pvH = avail - (n * rowH + 12) - infoH - 2 * gap; }
    // tall screens: a few more description lines first, then a taller live preview
    if (pvH > 300) {
      infoH += Math.min(pvH - 300, 36);
      pvH = avail - (n * rowH + 12) - infoH - 2 * gap;
    }
    pvH = Phaser.Math.Clamp(pvH, 70, 420);
    const listH = n * rowH + 12;
    const px = 4, pw = W - 8;

    const eqIdx = Math.max(0, this.items.findIndex((it) => it.equipped));
    const first = this.items[eqIdx];
    this.buildPreview(px, top, pw, pvH, loadoutWith(save.loadout, cat, first?.id ?? null), 'LIVE FIRE TEST', cat === 'hull' || cat === 'shield');

    let y = top + pvH + gap;
    if (gun) {
      this.power = new PowerRow(this, px, y, pw, powerH, (d) => this.changePower(d));
      y += powerH + gap;
    }
    const ly = y;
    this.track(kit.panel(this, px, ly, pw, listH, 'raised').setDepth(MD.panel));
    this.track(scanlines(this, px + 3, ly + 3, pw - 6, listH - 6, 0.3, MD.panel));
    const listX = px + 20, listW = pw - 28;
    this.toastY = ly + listH / 2;
    this.info = { x: px, y: ly + listH + gap, w: pw, h: infoH };
    this.track(kit.panel(this, px, this.info.y, pw, infoH, 'raised').setDepth(MD.panel));

    this.list = new kit.MenuList(this, {
      x: listX, y: ly + 6, width: listW, items: this.itemRows(cat), rowHeight: rowH, size: 'm', depth: MD.content, startIndex: eqIdx,
      tapMode: 'focusThenSelect',
      onFocus: (i, it) => this.onItemFocus(i, it),
      onSelect: (i) => this.tryBuy(i),
      onDisabled: (i) => this.explainDisabled(i),
      onLeft: gun ? () => this.changePower(-1) : undefined,
      onRight: gun ? () => this.changePower(1) : undefined,
    });
    this.refreshPower();
    this.onItemFocus(this.list.index, this.list.item);
  }

  /** MenuList rows for the current item list. */
  private itemRows(cat: ShopCategory): kit.MenuItem[] {
    const credits = getSave().credits;
    const slotOk = categoryAvailable(cat);
    return this.items.map((it) => {
      const label = upper(it.id === null ? 'NONE' : it.name);
      const icon = it.locked ? iconOr(this, 'ui_icon_lock', META.icLock) : this.itemIcon(cat, it.id);
      const base = { label, icon, arrows: false } as const;
      if (it.equipped) {
        const help = isGun(cat) && it.id !== null ? 'EQUIPPED - USE < > TO CHANGE ITS POWER' : 'EQUIPPED ON YOUR SHIP';
        return { ...base, value: 'EQUIPPED', valueColor: COLORS.teal, color: COLORS.teal, help, armed: false };
      }
      if (it.locked) return { ...base, value: 'LOCKED', disabled: true, help: unlockHint(this.unlockLevel(cat, it.id)) };
      if (!slotOk && it.id !== null) return { ...base, value: 'NO SLOT', disabled: true, help: 'NO MOUNT HERE - FLY A TWIN-MOUNT HULL' };
      const net = switchCost(cat, it.id);
      const value = net > 0 ? fmt(net) : net < 0 ? `+${fmt(-net)}` : 'FREE';
      const valueColor = net < 0 ? COLORS.good : net > credits ? COLORS.bad : COLORS.gold;
      const verb = it.id === null ? 'REMOVE' : net > 0 ? 'BUY' : 'SWAP';
      const lost = cat === 'hull' ? this.dronesLost(it.id) : '';
      const help = net > credits ? `NEED ${fmt(net - credits)} MORE CREDITS`
        : lost ? `ALSO SELLS YOUR ${lost} - TAP AGAIN TO ${verb}` : `TAP AGAIN OR PRESS ENTER TO ${verb}`;
      return { ...base, value, valueColor, help };
    });
  }

  /** Drones a switch to hull `id` would auto-sell ('' when none): 'RIGHT DRONE', 'LEFT DRONE' or 'DRONES'. */
  private dronesLost(id: string | null): string {
    const l = getSave().loadout;
    const slots = findHull(id)?.sidekickSlots ?? 2;
    const r = slots < 2 && l.sidekickR !== null;
    const left = slots < 1 && l.sidekickL !== null;
    return r && left ? 'DRONES' : r ? 'RIGHT DRONE' : left ? 'LEFT DRONE' : '';
  }

  private unlockLevel(cat: ShopCategory, id: string | null): string | undefined {
    if (!id) return undefined;
    switch (cat) {
      case 'hull': return findHull(id)?.unlockLevel;
      case 'front': case 'rear': return findWeapon(id)?.unlockLevel;
      case 'shield': return findShield(id)?.unlockLevel;
      case 'generator': return findGenerator(id)?.unlockLevel;
      default: return findSidekick(id)?.unlockLevel;
    }
  }

  /** 16x16 icon of a shop item (sprite thumbnail, projectile chip, shield / generator chip). */
  private itemIcon(cat: ShopCategory, id: string | null): string {
    const fallback = iconOr(this, CATS.find((c) => c.cat === cat)?.icon ?? '', META.icEmpty);
    if (id === null) return META.icEmpty;
    switch (cat) {
      case 'hull': return frameIcon(this, hullKey(id), 0) ?? fallback;
      case 'front': case 'rear': {
        const w = findWeapon(id);
        return (w && weaponChip(this, id, shotKey(w.projectile, w.color), shotGlow(w.color))) ?? fallback;
      }
      case 'shield': {
        const s = findShield(id);
        return s ? shieldChip(this, id, shotGlow(s.color), SHIELDS.indexOf(s) + 1) : fallback;
      }
      case 'generator': return generatorChip(this, id, GENERATORS.findIndex((g) => g.id === id) + 1);
      default: return frameIcon(this, sidekickKey(id), 0) ?? fallback;
    }
  }

  private onItemFocus(i: number, row: kit.MenuItem | undefined): void {
    const cat = this.cat;
    const it = this.items[i];
    if (!cat || !it) return;
    this.status.setText(row?.help ?? '');
    const mountable = it.id === null || categoryAvailable(cat);
    this.setPreview(mountable ? loadoutWith(getSave().loadout, cat, it.id) : getSave().loadout);
    this.itemInfo(cat, it);
    setHookState({ focus: i, focusId: it.id });
  }

  /** Info box of the item page: name, buy button, price breakdown, description, comparison. */
  private itemInfo(cat: ShopCategory, it: ShopItem): void {
    this.clearInfo();
    const { x, y, w, h } = this.info;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.infoObjs.push(o); return o; };
    const save = getSave();
    const slotOk = categoryAvailable(cat) || it.id === null;
    const net = switchCost(cat, it.id);
    const name = it.id === null ? 'EMPTY SLOT' : upper(it.name);
    const nameColor = it.equipped ? COLORS.teal : it.locked || !slotOk ? COLORS.textDim : COLORS.text;
    const bw = 76;
    add(kit.text(this, x + 10, y + 7, kit.fit(name, w - bw - 24, 'm'), { size: 'm', color: nameColor, depth: MD.content }));

    // price line
    let price: [string, number];
    if (it.equipped) price = [it.id === null ? 'EMPTY SLOT' : `RESALE VALUE ${fmt(equippedValue(cat))}`, COLORS.textDim];
    else if (it.locked) price = [unlockHint(this.unlockLevel(cat, it.id)), COLORS.bad];
    else if (!slotOk) price = ['NO MOUNT ON THIS HULL', COLORS.bad];
    else if (it.id === null) price = [`SELL FOR ${fmt(-net)}`, COLORS.good];
    else {
      const trade = it.cost - net;
      const lost = cat === 'hull' && this.dronesLost(it.id) ? ' +DRONE' : '';
      price = [trade > 0 ? `PRICE ${fmt(it.cost)} - TRADE-IN ${fmt(trade)}${lost}` : `PRICE ${fmt(it.cost)}`, net > save.credits ? COLORS.bad : COLORS.gold];
    }
    add(kit.text(this, x + 10, y + 20, kit.fit(price[0], w - bw - 24, 's'), { size: 's', color: price[1], depth: MD.content }));

    // buy button
    let label = 'BUY';
    let enabled = true;
    if (it.equipped) { label = 'EQUIPPED'; enabled = false; }
    else if (it.locked) { label = 'LOCKED'; enabled = false; }
    else if (!slotOk) { label = 'NO SLOT'; enabled = false; }
    else if (it.id === null) label = 'SELL';
    else if (net <= 0) label = 'SWAP';
    this.buyBtn = kit.button(this, x + w - bw - 6, y + 6, bw, 22, label, () => this.tryBuy(this.list?.index ?? 0), {
      size: 's', color: enabled ? (net > save.credits ? COLORS.bad : COLORS.teal) : COLORS.textDim, depth: MD.content,
    });
    this.buyBtn.setEnabled(enabled);
    add(this.buyBtn.container);

    // description (more lines when the panel is taller), comparison grid at the bottom
    const desc = it.id === null ? this.describe(cat, null) : it.desc;
    const descLines = Math.max(2, Math.floor((h - 76) / 9) + 2);
    wrapLines(desc, Math.floor((w - 20) / 6), descLines).forEach((ln, k) => add(kit.text(this, x + 10, y + 32 + k * 9, ln, { size: 's', color: COLORS.textDim, depth: MD.content })));
    const cells = this.compareCells(cat, it);
    compareGrid(this, x + 10, y + h - 23, w - 20, cells, MD.content).forEach((o) => add(o));
  }

  private compareCells(cat: ShopCategory, it: ShopItem): CompareCell[] {
    const l = getSave().loadout;
    const cur = (v: number | null) => (it.equipped ? null : v);
    switch (cat) {
      case 'hull': {
        const a = findHull(l.hull), b = findHull(it.id);
        if (!b) return [];
        return [
          { label: 'ARMOR', cur: cur(a?.armor ?? null), next: b.armor, better: 1, digits: 0 },
          { label: 'SPEED', cur: cur(a?.speed ?? null), next: b.speed, better: 1, digits: 0 },
          { label: 'HITBOX', cur: cur(a?.hitRadius ?? null), next: b.hitRadius, better: -1, digits: 1 },
          { label: 'MOUNTS', cur: cur(a?.sidekickSlots ?? null), next: b.sidekickSlots, better: 1, digits: 0 },
        ];
      }
      case 'front': case 'rear': {
        const eq = findWeapon(cat === 'front' ? l.front : l.rear);
        const eqS = eq ? weaponStats(eq, cat === 'front' ? l.frontPower : l.rearPower) : null;
        const def = findWeapon(it.id);
        const s = def ? weaponStats(def, it.equipped ? (cat === 'front' ? l.frontPower : l.rearPower) : 1) : null;
        return [
          { label: 'DPS', cur: cur(eqS?.dps ?? 0), next: s?.dps ?? 0, better: 1, digits: 0 },
          { label: 'VOLLEYS/S', cur: cur(eqS?.rate ?? 0), next: s?.rate ?? 0, better: 0, digits: 1 },
          { label: 'ENERGY/S', cur: cur(eqS?.energy ?? 0), next: s?.energy ?? 0, better: -1, digits: 1 },
        ];
      }
      case 'shield': {
        const a = findShield(l.shield), b = findShield(it.id);
        if (!b) return [];
        return [
          { label: 'CAPACITY', cur: cur(a?.capacity ?? null), next: b.capacity, better: 1, digits: 0 },
          { label: 'REGEN/S', cur: cur(a?.regen ?? null), next: b.regen, better: 1, digits: 1 },
          { label: 'DRAIN/S', cur: cur(a ? a.regen * a.energyPerPoint : null), next: b.regen * b.energyPerPoint, better: -1, digits: 1 },
        ];
      }
      case 'generator': {
        const a = findGenerator(l.generator), b = findGenerator(it.id);
        if (!b) return [];
        const netA = energyBalance(l).net;
        const netB = energyBalance(loadoutWith(l, 'generator', b.id)).net;
        return [
          { label: 'CAPACITY', cur: cur(a?.capacity ?? null), next: b.capacity, better: 1, digits: 0 },
          { label: 'OUTPUT/S', cur: cur(a?.output ?? null), next: b.output, better: 1, digits: 1 },
          { label: 'BALANCE/S', cur: cur(netA), next: netB, better: 1, digits: 1 },
        ];
      }
      default: {
        const eq = findSidekick(cat === 'sidekickL' ? l.sidekickL : l.sidekickR);
        const def = findSidekick(it.id);
        const a = eq ? sidekickStats(eq) : null;
        const b = def ? sidekickStats(def) : null;
        return [
          { label: 'DPS', cur: cur(a?.dps ?? 0), next: b?.dps ?? 0, better: 1, digits: 0 },
          { label: 'VOLLEYS/S', cur: cur(a?.rate ?? 0), next: b?.rate ?? 0, better: 0, digits: 1 },
          { label: 'ENERGY/S', cur: null, next: 0, better: 0, digits: 0 },
        ];
      }
    }
  }

  // ------------------------------------------------------------------ transactions

  private tryBuy(i: number): void {
    const cat = this.cat;
    const it = this.items[i];
    if (!cat || !it) return;
    if (it.equipped) {
      toast(this, 'ALREADY EQUIPPED', COLORS.teal, this.toastY);
      return;
    }
    const net = switchCost(cat, it.id);
    const res = buyItem(cat, it.id);
    if (!res.ok) {
      this.fail(res);
      return;
    }
    audio.sfx(net > 0 ? 'ui_buy' : 'ui_sell');
    this.hdr.credits?.set(res.credits);
    const delta = net > 0 ? `-${fmt(net)} CR` : net < 0 ? `+${fmt(-net)} CR` : 'EVEN TRADE';
    toast(this, it.id === null ? 'SLOT CLEARED' : 'INSTALLED', COLORS.good, this.toastY, `${it.id === null ? '' : `${upper(it.name)}  `}${delta}`);
    this.refreshItems(i);
  }

  private fail(res: TxResult): void {
    audio.sfx('ui_error');
    const msg = res.reason === 'credits' ? 'NOT ENOUGH CREDITS'
      : res.reason === 'locked' ? 'LOCKED'
        : res.reason === 'slot' ? (isGun(this.cat) ? 'NO GUN FITTED' : 'NO SLOT')
          : res.reason === 'max' ? 'MAX POWER' : res.reason === 'min' ? 'MINIMUM POWER' : 'NOT AVAILABLE';
    toast(this, msg, COLORS.bad, this.toastY);
    this.cameras.main.shake(90, 0.003);
  }

  private explainDisabled(i: number): void {
    const cat = this.cat;
    const it = this.items[i];
    if (!cat || !it) return;
    if (it.locked) toast(this, 'LOCKED', COLORS.bad, this.toastY, unlockHint(this.unlockLevel(cat, it.id)));
    else toast(this, 'NO SLOT', COLORS.bad, this.toastY, 'THIS HULL HAS NO MOUNT HERE');
  }

  private changePower(delta: 1 | -1): void {
    const cat = this.cat;
    if (!isGun(cat)) return;
    const res = changePower(cat, delta);
    if (!res.ok) {
      this.fail(res);
      return;
    }
    audio.sfx(delta > 0 ? 'ui_buy' : 'ui_sell');
    this.hdr.credits?.set(res.credits);
    this.power?.pulse(delta > 0);
    const eq = this.items.findIndex((it) => it.equipped);
    this.refreshItems(eq >= 0 ? eq : this.list?.index ?? 0);
  }

  /** Re-read the catalogue after a transaction and refresh rows, power row, info and preview. */
  private refreshItems(focus: number): void {
    const cat = this.cat;
    if (!cat || !this.list) return;
    this.items = shopItems(cat);
    this.list.setItems(this.itemRows(cat), true);
    this.list.setIndex(Math.min(focus, this.items.length - 1), false);
    this.refreshPower();
    setHookState(this.hookState());
  }

  private refreshPower(): void {
    const cat = this.cat;
    if (!this.power || !isGun(cat)) return;
    const s = getSave();
    const id = cat === 'front' ? s.loadout.front : s.loadout.rear;
    const p = cat === 'front' ? s.loadout.frontPower : s.loadout.rearPower;
    const w = findWeapon(id);
    this.power.set({
      name: w ? upper(w.name) : null, power: p, next: w ? upgradeCost(w.id, p) : 0, refund: w && p > 1 ? upgradeCost(w.id, p - 1) : 0, credits: s.credits,
    });
  }
}
