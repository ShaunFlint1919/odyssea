import Phaser from 'phaser';
import { COLORS, SCENES } from '../config';
import { markSceneReady } from '../debug';
import { hullKey } from '../art/keys';
import { HULL_MOUNTS } from '../art/player';
import { audio } from '../audio';
import { getSave } from '../state/save';
import { loadoutValue } from '../state/economy';
import * as kit from '../ui/kit';
import { blueprintGrid, ensureMetaArt, schematic } from '../ui/meta/art';
import { HEADER_H, MD, cornerBrackets, sectionLabel } from '../ui/meta/chrome';
import { scanlines, screenBackdrop, screenHeader } from '../ui/widgets';
import { catalogMax, dec, findGenerator, findHull, findShield, findSidekick, findWeapon, fmt, signed, upper } from '../ui/meta/common';
import { energyBalance, sidekickStats, toughness, totalDps, weaponStats, type GunStats } from '../ui/meta/stats';

/** Ship specs: summary cards, hull schematic, defense / power, armament table, energy balance. */
export class SpecsScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Specs);
  }

  create(): void {
    kit.fadeIn(this);
    audio.music('hangar');
    ensureMetaArt(this);
    const { width: W, height: H } = this.scale.gameSize;
    const save = getSave();
    const l = save.loadout;
    screenBackdrop(this);
    const leave = () => kit.goto(this, SCENES.Hangar);
    const back = () => { audio.sfx('ui_back'); leave(); };
    screenHeader(this, 'SHIP SPECS', { back, credits: save.credits });
    const status = kit.statusBar(this, 'NOMINAL: EVERY SHOT HITS, GUNS FIRE NONSTOP');
    kit.onBack(this, back);

    // ------------------------------------------------------------ vertical layout
    // Panels grow a little on tall screens (capped), the rest becomes even gaps; the back
    // button is anchored above the status bar.
    const gap = 4;
    const base = { cards: 30, hull: 112, defense: 70, arms: 84, energy: 74 };
    const doneH = 24;
    const fixed = HEADER_H + gap + Object.values(base).reduce((a, b) => a + b, 0) + 5 * gap + doneH + gap + 16 + gap;
    let rest = Math.max(0, H - fixed);
    const hs = { ...base };
    const caps: [keyof typeof base, number][] = [['hull', 40], ['arms', 16], ['energy', 8], ['defense', 10], ['cards', 6]];
    for (const [k, cap] of caps) {
      const add = Math.min(cap, rest);
      hs[k] += add;
      rest -= add;
    }
    const g = gap + Math.min(14, Math.floor(rest / 6));
    const px = 4, pw = W - 8;
    let y = HEADER_H + g;

    this.cards(px, y, pw, hs.cards);
    y += hs.cards + g;
    this.hullPanel(px, y, pw, hs.hull);
    y += hs.hull + g;
    this.defensePanel(px, y, pw, hs.defense);
    y += hs.defense + g;
    this.armsPanel(px, y, pw, hs.arms);
    y += hs.arms + g;
    const bal = this.energyPanel(px, y, pw, hs.energy);
    y += hs.energy + g;
    const by = Math.max(y, H - 16 - gap - doneH);
    if (by + doneH <= H - 17) {
      kit.button(this, px, by, pw, doneH, 'BACK TO HANGAR', leave, { size: 's', color: COLORS.teal, depth: MD.content });
    }
    const kb = this.input.keyboard;
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') && !e.repeat && !kit.isModalOpen(this)) { audio.sfx('ui_select'); leave(); }
    };
    kb?.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb?.off('keydown', onKey));
    if (bal.net < 0) status.setText(`OVERLOAD: GUNS STALL AFTER ${dec(bal.sustain, 0)} S OF FIRE`);
    markSceneReady(SCENES.Specs, { net: bal.net, dps: totalDps(l), value: loadoutValue(), loadout: { ...l } });
  }

  /** Three summary cards: firepower, toughness, energy. */
  private cards(x: number, y: number, w: number, h: number): void {
    const l = getSave().loadout;
    const bal = energyBalance(l);
    const cw = Math.floor((w - 8) / 3);
    const card = (i: number, label: string, value: string, color: number) => {
      const cx = x + i * (cw + 4);
      kit.panel(this, cx, y, cw, h, 'inset').setDepth(MD.panel);
      kit.text(this, cx + 7, y + 5, label, { size: 's', color: COLORS.textDim, depth: MD.content });
      kit.text(this, cx + cw - 7, y + h - 6, value, { size: 'm', color, originX: 1, originY: 1, depth: MD.content });
      this.add.rectangle(cx + 3, y + 3, 2, h - 6, color, 0.9).setOrigin(0).setDepth(MD.content);
    };
    card(0, 'FIREPOWER', `${dec(totalDps(l), 0)} DPS`, COLORS.teal);
    card(1, 'TOUGHNESS', `${toughness(l)} HP`, COLORS.armor);
    card(2, 'ENERGY', `${signed(bal.net)}/S`, bal.net < 0 ? COLORS.bad : COLORS.good);
  }

  /** Hull blueprint (outline render + hitbox circle + engine / mount marks) and hull stats. */
  private hullPanel(x: number, y: number, w: number, h: number): void {
    const l = getSave().loadout;
    const hull = findHull(l.hull);
    kit.panel(this, x, y, w, h, 'raised').setDepth(MD.panel);
    sectionLabel(this, x + 8, y + 6, 'HULL', w - 16, MD.content);
    const box = Math.min(h - 22, 136);
    const bx = x + 7, by = y + 17;
    kit.panel(this, bx, by, box, box, 'inset').setDepth(MD.panel);
    this.add.image(bx + 3, by + 3, blueprintGrid(this, box - 6, box - 6)).setOrigin(0).setDepth(MD.panel);
    const sc = box >= 120 ? 3 : 2;
    const cx = bx + box / 2, cy = by + box / 2;
    const sk = schematic(this, hullKey(l.hull), 0);
    if (sk) {
      const img = this.add.image(cx, cy, sk).setScale(sc).setDepth(MD.content);
      this.tweens.add({ targets: img, alpha: 0.75, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    const gfx = this.add.graphics().setDepth(MD.content);
    if (hull) {
      const r = hull.hitRadius * sc;
      gfx.lineStyle(1, COLORS.accent, 1).strokeCircle(cx, cy, r);
      gfx.fillStyle(COLORS.accent, 0.25).fillCircle(cx, cy, r);
      gfx.fillStyle(COLORS.accentLight, 1).fillRect(cx - 1, cy - 1, 2, 2);
    }
    const mounts = HULL_MOUNTS[l.hull];
    if (mounts) {
      gfx.fillStyle(0xff7a20, 1);
      for (const [ex, ey] of mounts.engines) gfx.fillRect(Math.round(cx + ex * sc) - 1, Math.round(cy + ey * sc), 3, 2);
      gfx.fillStyle(COLORS.gold, 1);
      gfx.fillRect(Math.round(cx + mounts.nose[0] * sc) - 1, Math.round(cy + mounts.nose[1] * sc) - 2, 3, 3);
    }
    // dimension line under the ship
    const dl = 32 * sc;
    gfx.fillStyle(COLORS.teal, 0.6);
    gfx.fillRect(cx - dl / 2, by + box - 9, dl, 1);
    gfx.fillRect(cx - dl / 2, by + box - 11, 1, 5);
    gfx.fillRect(cx + dl / 2 - 1, by + box - 11, 1, 5);
    scanlines(this, bx + 3, by + 3, box - 6, box - 6, 0.4, MD.overlay);
    cornerBrackets(this, bx + 4, by + 4, box - 8, box - 8, COLORS.teal, 4, MD.overlay);
    kit.text(this, bx + 6, by + 5, 'SCHEMATIC', { size: 's', color: COLORS.teal, depth: MD.overlay });

    // stats column
    const sx = bx + box + 9, sw = x + w - 8 - sx;
    const max = catalogMax();
    kit.text(this, sx, by + 1, kit.fit(upper(hull?.name ?? l.hull), sw, 'm'), { size: 'm', color: COLORS.text, depth: MD.content });
    const rowGap = Math.max(17, Math.min(24, Math.floor((h - 36) / 4)));
    let ry = by + 16;
    const gaugeRow = (label: string, v: number, maxV: number, a: number, b: number, valueStr: string) => {
      kit.text(this, sx, ry, label, { size: 's', color: COLORS.textDim, depth: MD.content });
      kit.text(this, sx + sw, ry, valueStr, { size: 's', color: COLORS.text, originX: 1, depth: MD.content });
      const gg = new kit.Gauge(this, sx, ry + 9, sw, 6, { vertical: false, colorA: a, colorB: b, depth: MD.content });
      gg.setValue(v / maxV);
      ry += rowGap;
    };
    gaugeRow('ARMOR', hull?.armor ?? 0, max.armor, 0x8a2a10, COLORS.armor, `${hull?.armor ?? 0} HP`);
    gaugeRow('SPEED', hull?.speed ?? 0, max.speed, COLORS.tealDark, COLORS.teal, `${hull?.speed ?? 0} PX/S`);
    const slots = hull?.sidekickSlots ?? 0;
    kit.text(this, sx, ry, 'HITBOX', { size: 's', color: COLORS.textDim, depth: MD.content });
    kit.text(this, sx + sw, ry, `${dec(hull?.hitRadius ?? 0)} PX`, { size: 's', color: COLORS.accentLight, originX: 1, depth: MD.content });
    ry += 11;
    kit.text(this, sx, ry, 'DRONE MOUNTS', { size: 's', color: COLORS.textDim, depth: MD.content });
    kit.text(this, sx + sw, ry, slots === 0 ? 'NONE' : slots === 1 ? 'LEFT' : 'LEFT + RIGHT', { size: 's', color: COLORS.text, originX: 1, depth: MD.content });
  }

  /** Shield and generator blocks with capacity gauges. */
  private defensePanel(x: number, y: number, w: number, h: number): void {
    const l = getSave().loadout;
    const sh = findShield(l.shield);
    const gen = findGenerator(l.generator);
    const max = catalogMax();
    kit.panel(this, x, y, w, h, 'raised').setDepth(MD.panel);
    sectionLabel(this, x + 8, y + 6, 'DEFENSE & POWER', w - 16, MD.content);
    const half = Math.floor((h - 18) / 2);
    const block = (by: number, icon: string, name: string, capLabel: string, cap: number, capMax: number, a: number, b: number, right: [string, string, number][]) => {
      if (this.textures.exists(icon)) this.add.image(x + 16, by + 8, icon).setDepth(MD.content);
      kit.text(this, x + 28, by + 4, kit.fit(name, 120, 's'), { size: 's', color: COLORS.text, depth: MD.content });
      kit.text(this, x + 28, by + 15, capLabel, { size: 's', color: COLORS.textDim, depth: MD.content });
      const gg = new kit.Gauge(this, x + 28 + 54, by + 15, 70, 7, { vertical: false, colorA: a, colorB: b, depth: MD.content });
      gg.setValue(cap / capMax);
      kit.text(this, x + 28 + 128, by + 15, String(cap), { size: 's', color: COLORS.text, depth: MD.content });
      let rx = x + w - 10;
      for (let i = right.length - 1; i >= 0; i--) {
        const [lab, val, col] = right[i];
        const vt = kit.text(this, rx, by + 15, val, { size: 's', color: col, originX: 1, depth: MD.content });
        kit.text(this, rx, by + 4, lab, { size: 's', color: COLORS.textDim, originX: 1, depth: MD.content });
        rx -= Math.max(vt.width, kit.measure(this, lab, 's')) + 10;
      }
    };
    const off = Math.max(0, Math.floor((half - 26) / 2));
    block(y + 16 + off, 'ui_icon_shield', upper(sh?.name ?? l.shield), 'CAPACITY', sh?.capacity ?? 0, max.shield, 0x16307a, COLORS.shield, [
      ['REGEN', `${dec(sh?.regen ?? 0)}/S`, COLORS.text],
      ['DRAIN', `${dec(sh ? sh.regen * sh.energyPerPoint : 0)}/S`, COLORS.warn],
    ]);
    block(y + 16 + half + off, 'ui_icon_generator', upper(gen?.name ?? l.generator), 'CAPACITY', gen?.capacity ?? 0, max.genCap, 0x6a5010, COLORS.energy, [
      ['OUTPUT', `${dec(gen?.output ?? 0)}/S`, COLORS.good],
    ]);
  }

  /** Weapons + drones table at the current power levels. */
  private armsPanel(x: number, y: number, w: number, h: number): void {
    const l = getSave().loadout;
    kit.panel(this, x, y, w, h, 'raised').setDepth(MD.panel);
    sectionLabel(this, x + 8, y + 6, 'ARMAMENT', w - 16, MD.content);
    const cols = { slot: x + 10, name: x + 50, pwr: x + 172, dps: x + 206, rate: x + 248, en: x + w - 10 };
    const rowH = Math.max(11, Math.min(15, Math.floor((h - 32) / 5)));
    let ry = y + 18;
    const row = (cells: [string, string, string, string, string, string], color: number, dim = false) => {
      const c = dim ? COLORS.textDim : color;
      kit.text(this, cols.slot, ry, cells[0], { size: 's', color: dim ? COLORS.textDim : COLORS.accentLight, depth: MD.content });
      kit.text(this, cols.name, ry, kit.fit(cells[1], cols.pwr - cols.name - 22, 's'), { size: 's', color: c, depth: MD.content });
      kit.text(this, cols.pwr, ry, cells[2], { size: 's', color: c, originX: 1, depth: MD.content });
      kit.text(this, cols.dps, ry, cells[3], { size: 's', color: dim ? COLORS.textDim : COLORS.teal, originX: 1, depth: MD.content });
      kit.text(this, cols.rate, ry, cells[4], { size: 's', color: c, originX: 1, depth: MD.content });
      kit.text(this, cols.en, ry, cells[5], { size: 's', color: dim ? COLORS.textDim : COLORS.warn, originX: 1, depth: MD.content });
      ry += rowH;
    };
    // header
    const hdr = (s: string, cx: number, right: boolean) => kit.text(this, cx, ry, s, { size: 's', color: COLORS.accent, originX: right ? 1 : 0, depth: MD.content });
    hdr('SLOT', cols.slot, false); hdr('NAME', cols.name, false); hdr('PWR', cols.pwr, true); hdr('DPS', cols.dps, true); hdr('VOL/S', cols.rate, true); hdr('EN/S', cols.en, true);
    this.add.rectangle(x + 8, ry + 9, w - 16, 1, COLORS.accent, 0.35).setOrigin(0).setDepth(MD.content);
    ry += rowH + 1;
    const gunRow = (slot: string, s: GunStats | null, power: string) => {
      if (!s) { row([slot, 'NONE', '-', '-', '-', '-'], COLORS.text, true); return; }
      row([slot, upper(s.name), power, dec(s.dps, 0), dec(s.rate), s.energy > 0 ? dec(s.energy) : 'FREE'], COLORS.text);
    };
    const fw = findWeapon(l.front), rw = findWeapon(l.rear);
    gunRow('FRONT', fw ? weaponStats(fw, l.frontPower) : null, `P${l.frontPower}`);
    gunRow('REAR', rw ? weaponStats(rw, l.rearPower) : null, `P${l.rearPower}`);
    const slots = findHull(l.hull)?.sidekickSlots ?? 2;
    const dl = findSidekick(l.sidekickL), dr = findSidekick(l.sidekickR);
    if (slots >= 1) gunRow('LEFT', dl ? sidekickStats(dl) : null, '-');
    else row(['LEFT', 'NO MOUNT', '-', '-', '-', '-'], COLORS.text, true);
    if (slots >= 2) gunRow('RIGHT', dr ? sidekickStats(dr) : null, '-');
    else row(['RIGHT', 'NO MOUNT', '-', '-', '-', '-'], COLORS.text, true);
  }

  /** Generator output vs. drain (stacked bars) and the verdict. */
  private energyPanel(x: number, y: number, w: number, h: number): ReturnType<typeof energyBalance> {
    const l = getSave().loadout;
    const b = energyBalance(l);
    kit.panel(this, x, y, w, h, 'raised').setDepth(MD.panel);
    sectionLabel(this, x + 8, y + 6, 'ENERGY BALANCE', w - 16, MD.content);
    const lx = x + 10, bx = x + 58, bw = w - 58 - 62, bh = Math.max(8, Math.min(12, Math.floor((h - 53) / 2)));
    const drain = b.front + b.rear + b.shield;
    const scale = bw / Math.max(1, b.output, drain);
    const g = this.add.graphics().setDepth(MD.content);
    const bar = (by: number, label: string, segs: [number, number][], value: string, color: number) => {
      kit.text(this, lx, by + bh / 2, label, { size: 's', color: COLORS.textDim, originY: 0.5, depth: MD.content });
      g.fillStyle(COLORS.panelDark, 1).fillRect(bx, by, bw, bh);
      g.lineStyle(1, COLORS.panelLight, 1).strokeRect(bx - 0.5, by - 0.5, bw + 1, bh + 1);
      let sx = bx;
      for (const [v, c] of segs) {
        const sw = Math.min(bx + bw - sx, Math.round(v * scale));
        if (sw <= 0) continue;
        g.fillStyle(c, 1).fillRect(sx, by, sw, bh);
        g.fillStyle(0xffffff, 0.22).fillRect(sx, by, sw, Math.max(1, Math.floor(bh / 3)));
        g.fillStyle(0x0a0810, 1).fillRect(sx + sw - 1, by, 1, bh);
        sx += sw;
      }
      kit.text(this, x + w - 10, by + bh / 2, value, { size: 's', color, originX: 1, originY: 0.5, depth: MD.content });
    };
    const y1 = y + 18;
    bar(y1, 'OUTPUT', [[b.output, COLORS.good]], `+${dec(b.output)}/S`, COLORS.good);
    const y2 = y1 + bh + 4;
    bar(y2, 'DRAIN', [[b.front, COLORS.teal], [b.rear, COLORS.accent], [b.shield, COLORS.shield]], `-${dec(drain)}/S`, COLORS.warn);
    // output marker on the drain bar: where the generator runs out
    if (drain > b.output) {
      const mx = bx + Math.round(b.output * scale);
      g.fillStyle(0xffffff, 1).fillRect(mx, y2 - 2, 1, bh + 4);
    }
    // legend
    const ly = y2 + bh + 5;
    const legend: [string, number][] = [['FRONT', COLORS.teal], ['REAR', COLORS.accent], ['SHIELD', COLORS.shield]];
    let gx = bx;
    for (const [s2, c] of legend) {
      g.fillStyle(c, 1).fillRect(gx, ly + 2, 4, 4);
      const t = kit.text(this, gx + 6, ly, s2, { size: 's', color: COLORS.textDim, depth: MD.content });
      gx += t.width + 14;
    }
    // verdict
    const ok = b.net >= 0;
    const vy = ly + 12;
    const vt = kit.text(this, lx, vy, ok ? `NET ${signed(b.net)}/S - STABLE` : `NET ${signed(b.net)}/S - OVERLOAD`, { size: 's', color: ok ? COLORS.good : COLORS.bad, depth: MD.content });
    if (!ok) this.tweens.add({ targets: vt, alpha: 0.35, duration: 380, yoyo: true, repeat: -1, ease: 'Stepped' });
    const note = ok ? `BUFFER ${fmt(b.capacity)}` : `EMPTY IN ${dec(b.sustain, 0)} S`;
    kit.text(this, x + w - 10, vy, note, { size: 's', color: ok ? COLORS.textDim : COLORS.warn, originX: 1, depth: MD.content });
    return b;
  }
}
