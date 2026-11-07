import Phaser from 'phaser';
import { COLORS, SCENES } from '../config';
import { markSceneReady, setHookState } from '../debug';
import { hullKey } from '../art/keys';
import { audio } from '../audio';
import type { PlanetDef } from '../types';
import { BOSSES, PLANETS } from '../data';
import { getSave, saveNow } from '../state/save';
import { isCompleted, isUnlocked } from '../state/progress';
import * as kit from '../ui/kit';
import { META, ensureMetaArt, frameIcon, iconOr, nebulaBackdrop } from '../ui/meta/art';
import { HEADER_H, MD, cornerBrackets, sectionLabel, toast } from '../ui/meta/chrome';
import { scanlines, screenHeader } from '../ui/widgets';
import { findLevel, fmt, nextMissionId, planetOfLevel, setHangarFocus, upper, wrapLines } from '../ui/meta/common';
import { RouteRenderer, type RouteState } from '../ui/meta/galaxy';
import { BIOME_TINT, planetScale, planetTexture } from '../ui/meta/planets';

interface PlanetNode {
  def: PlanetDef;
  x: number;
  y: number;
  r: number;
  unlocked: boolean;
  completed: boolean;
  cleared: number;
}

const BIOME_LABEL: Record<string, string> = {
  desert: 'DESERT WORLD', jungle: 'JUNGLE WORLD', ocean: 'OCEAN WORLD', cavern: 'CAVERN WORLD',
  lava: 'VOLCANIC WORLD', ice: 'ICE WORLD', space: 'DEEP SPACE', techno: 'MACHINE CITADEL',
};

/** Star chart: 8 planets on routes; a planet opens its mission panel; picking a level sets the next mission. */
export class MapScene extends Phaser.Scene {
  private nodes: PlanetNode[] = [];
  private focus = 0;
  private target = -1;
  private reticle?: Phaser.GameObjects.Image;
  private ship?: Phaser.GameObjects.Image;
  private shipAngle = 0;
  private infoObjs: Phaser.GameObjects.GameObject[] = [];
  private panelObjs: Phaser.GameObjects.GameObject[] = [];
  private briefObjs: Phaser.GameObjects.GameObject[] = [];
  private panelList?: kit.MenuList;
  private panelOpen = false;
  private status!: kit.StatusBarApi;
  private info = { x: 0, y: 0, w: 0, h: 0 };

  constructor() {
    super(SCENES.Map);
  }

  create(): void {
    kit.fadeIn(this);
    audio.music('map');
    ensureMetaArt(this);
    this.nodes = [];
    this.infoObjs = [];
    this.panelObjs = [];
    this.briefObjs = [];
    this.panelList = undefined;
    this.panelOpen = false;
    this.ship = undefined;
    const { width: W, height: H } = this.scale.gameSize;
    const save = getSave();

    this.add.image(0, 0, nebulaBackdrop(this, W, H)).setOrigin(0).setScale(2).setDepth(MD.bg);
    kit.starfield(this, { density: 0.45, speed: 2, depth: MD.stars });
    screenHeader(this, 'STAR CHART', { back: () => this.back(), credits: save.credits });
    this.status = kit.statusBar(this, 'TAP A PLANET OR USE THE ARROWS - ENTER: MISSIONS');

    // ------------------------------------------------------------ layout
    const infoH = 44;
    this.info = { x: 4, y: H - 16 - 4 - infoH, w: W - 8, h: infoH };
    const top = HEADER_H + 26, bottom = this.info.y - 26;
    const left = 34, right = W - 34;
    this.decorations(W, HEADER_H + 2, this.info.y - 4);

    // ------------------------------------------------------------ planets
    const missionPlanet = planetOfLevel(nextMissionId());
    const k = Phaser.Math.Clamp((bottom - top) / 420, 0.78, 1.15);
    PLANETS.forEach((p, i) => {
      const size = Math.round((i === PLANETS.length - 1 ? 50 : 28 + i * 2.6) * k);
      const cleared = p.levels.filter((id) => isCompleted(id)).length;
      this.nodes.push({
        def: p,
        x: Math.round(left + Phaser.Math.Clamp(p.mapX, 0, 1) * (right - left)),
        y: Math.round(top + Phaser.Math.Clamp(p.mapY, 0, 1) * (bottom - top)),
        r: size / 2,
        unlocked: p.levels.length > 0 && isUnlocked(p.levels[0]),
        completed: p.levels.length > 0 && cleared === p.levels.length,
        cleared,
      });
    });
    this.target = Math.max(0, this.nodes.findIndex((n) => n.def.id === missionPlanet?.id));

    // ------------------------------------------------------------ routes
    const routes = new RouteRenderer(this, MD.panel);
    for (let i = 0; i + 1 < this.nodes.length; i++) {
      const a = this.nodes[i], b = this.nodes[i + 1];
      const state: RouteState = !b.unlocked ? 'locked' : i + 1 === this.target && !b.completed ? 'active' : 'done';
      routes.add(a.x, a.y, b.x, b.y, i % 2 === 0 ? 0.16 : -0.16, a.r, b.r, state);
    }

    this.nodes.forEach((n, i) => this.drawPlanet(n, i));
    this.placeLabels(top - 20, this.info.y - 4);
    this.drawTargetMarker();

    // focus reticle
    this.reticle = this.add.image(0, 0, META.reticle).setTint(COLORS.teal).setDepth(MD.content + 3);
    this.tweens.add({ targets: this.reticle, alpha: 0.45, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    kit.panel(this, this.info.x, this.info.y, this.info.w, this.info.h, 'raised').setDepth(MD.panel);
    this.setFocus(this.target, false);

    // ------------------------------------------------------------ input
    const kb = this.input.keyboard;
    const onKey = (e: KeyboardEvent) => {
      if (this.panelOpen || kit.isModalOpen(this) || this.nodes.length === 0) return;
      switch (e.code) {
        case 'ArrowUp': case 'ArrowRight': case 'KeyW': case 'KeyD': this.setFocus(Math.min(this.nodes.length - 1, this.focus + 1)); break;
        case 'ArrowDown': case 'ArrowLeft': case 'KeyS': case 'KeyA': this.setFocus(Math.max(0, this.focus - 1)); break;
        case 'Enter': case 'Space': case 'NumpadEnter': if (!e.repeat) this.openPanel(this.focus); break;
        default: break;
      }
    };
    kb?.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb?.off('keydown', onKey));
    kit.onBack(this, () => this.back());

    markSceneReady(SCENES.Map, { focus: this.nodes[this.focus]?.def.id ?? null, target: this.nodes[this.target]?.def.id ?? null, panel: false, planets: this.nodes.length });
  }

  override update(_time: number, delta: number): void {
    const t = this.nodes[this.target];
    if (!this.ship || !t) return;
    this.shipAngle += (delta / 1000) * 1.1;
    const rr = t.r + 13;
    this.ship.setPosition(Math.round(t.x + Math.cos(this.shipAngle) * rr), Math.round(t.y + Math.sin(this.shipAngle) * rr * 0.55));
    this.ship.setRotation(this.shipAngle + Math.PI);
    const depth = Math.sin(this.shipAngle) > 0 ? MD.content + 2 : MD.content - 1;
    if (this.ship.depth !== depth) this.ship.setDepth(depth);
  }

  // ------------------------------------------------------------ drawing

  private decorations(W: number, top: number, bottom: number): void {
    const g = this.add.graphics().setDepth(MD.stars + 1);
    const cx = W / 2, cy = (top + bottom) / 2;
    for (let r = 60; r < 260; r += 60) {
      g.lineStyle(1, COLORS.teal, 0.07).strokeCircle(cx, cy, r);
    }
    for (let a = 0; a < 360; a += 15) {
      const rad = (a * Math.PI) / 180;
      g.fillStyle(COLORS.teal, a % 45 === 0 ? 0.25 : 0.1).fillRect(Math.round(cx + Math.cos(rad) * 180), Math.round(cy + Math.sin(rad) * 180), 1, 1);
    }
    kit.text(this, 8, top + 6, 'OUTER MARCHES - SECTOR 31', { size: 's', color: COLORS.textDim, depth: MD.stars + 1 });
    kit.text(this, W - 8, bottom - 10, 'DIRECTORATE SPACE', { size: 's', color: 0x6a4a7a, originX: 1, depth: MD.stars + 1 });
  }

  private drawPlanet(n: PlanetNode, i: number): void {
    const size = n.r * 2;
    const tint = BIOME_TINT[n.def.biome] ?? COLORS.teal;
    this.add.image(n.x, n.y, META.glow).setTint(tint).setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(n.unlocked ? 0.38 : 0.1).setDisplaySize(size * 2, size * 2).setDepth(MD.content - 2);
    const img = this.add.image(n.x, n.y, planetTexture(this, n.def.biome, Math.round(size * planetScale(n.def.biome)))).setDepth(MD.content);
    if (!n.unlocked) img.setTint(0x6a6680).setAlpha(0.85);
    if (n.unlocked) this.tweens.add({ targets: img, y: n.y - 1, duration: 1600 + i * 130, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    if (!n.unlocked) {
      this.add.image(n.x, n.y, iconOr(this, 'ui_icon_lock', META.icLock)).setDepth(MD.content + 1);
    }
    if (n.completed) this.add.image(Math.round(n.x + n.r * 0.72), Math.round(n.y + n.r * 0.72), META.tick).setDepth(MD.content + 1);
    // tap zone
    const hit = Math.max(30, size + 14);
    const z = this.add.zone(n.x, n.y + 8, hit, hit + 16).setInteractive({ useHandCursor: true }).setDepth(MD.content + 4);
    let pressed = false;
    z.on('pointerover', (p: Phaser.Input.Pointer) => { if (!p.wasTouch && !this.panelOpen) this.setFocus(i); });
    z.on('pointerdown', () => { if (this.panelOpen) return; audio.unlock(); pressed = true; this.setFocus(i); });
    z.on('pointerout', () => { pressed = false; });
    z.on('pointerup', () => { if (pressed && !this.panelOpen) this.openPanel(i); pressed = false; });
  }

  /**
   * Planet names + level pips. Each label tries below / right / left / above its planet and
   * keeps the first spot that overlaps no other planet (rings included), no placed label and
   * stays on screen.
   */
  private placeLabels(minY: number, maxY: number): void {
    const { width } = this.scale.gameSize;
    const placed: Phaser.Geom.Rectangle[] = [];
    const reach = (n: PlanetNode) => n.r * (n.def.biome === 'space' ? 1.45 : 1) + 1;
    const hitsPlanet = (r: Phaser.Geom.Rectangle, self: PlanetNode) => this.nodes.some((o) => {
      const rr = o === self ? o.r + 2 : reach(o);
      const cx = Phaser.Math.Clamp(o.x, r.left, r.right), cy = Phaser.Math.Clamp(o.y, r.top, r.bottom);
      return (o.x - cx) ** 2 + (o.y - cy) ** 2 < rr * rr;
    });
    this.nodes.forEach((n, i) => {
      const name = upper(n.def.name);
      const lw = kit.measure(this, name, 's') + 2;
      const lh = 15;
      const target = i === this.target;
      const spots: [number, number][] = [
        [n.x - lw / 2, n.y + n.r + 9],
        [n.x + reach(n) + 6, n.y - lh / 2],
        [n.x - reach(n) - 6 - lw, n.y - lh / 2],
        ...(target ? [] : [[n.x - lw / 2, n.y - n.r - 8 - lh] as [number, number]]),
      ];
      let best = spots[0];
      for (const [sx, sy] of spots) {
        const r = new Phaser.Geom.Rectangle(Phaser.Math.Clamp(sx, 4, width - 4 - lw), sy, lw, lh);
        const off = r.top < minY || r.bottom > maxY;
        if (off || hitsPlanet(r, n) || placed.some((p) => Phaser.Geom.Intersects.RectangleToRectangle(p, r))) continue;
        best = [r.x, r.y];
        break;
      }
      const lx = Phaser.Math.Clamp(best[0], 4, width - 4 - lw);
      placed.push(new Phaser.Geom.Rectangle(lx, best[1], lw, lh));
      const cx = lx + lw / 2;
      const nameColor = !n.unlocked ? COLORS.textDim : n.completed ? COLORS.good : COLORS.text;
      kit.text(this, cx, best[1], name, { size: 's', color: nameColor, originX: 0.5, depth: MD.content + 1 });
      const pips = this.add.graphics().setDepth(MD.content + 1);
      const total = n.def.levels.length;
      for (let k = 0; k < total; k++) {
        const px = Math.round(cx - (total * 6 - 2) / 2 + k * 6);
        const py = Math.round(best[1] + 10);
        pips.fillStyle(0x0a0810, 1).fillRect(px - 1, py - 1, 6, 4);
        pips.fillStyle(k < n.cleared ? COLORS.teal : n.unlocked ? 0x3a3550 : 0x24202e, 1).fillRect(px, py, 4, 2);
      }
    });
  }

  /** Pulsing ring + chevron on the current target, and the player's ship orbiting it. */
  private drawTargetMarker(): void {
    const t = this.nodes[this.target];
    if (!t) return;
    const ringScale = (t.r + 7) / 32;
    for (let k = 0; k < 2; k++) {
      const ring = this.add.image(t.x, t.y, META.ring).setTint(COLORS.accent).setScale(ringScale).setDepth(MD.content - 1).setAlpha(0);
      this.tweens.add({
        targets: ring, scale: { from: ringScale, to: ringScale * 1.6 }, alpha: { from: 0.9, to: 0 }, duration: 1600, delay: k * 800, repeat: -1, ease: 'Sine.Out',
      });
    }
    const chev = this.add.image(t.x, t.y - t.r - 12, META.chevron).setDepth(MD.content + 2);
    this.tweens.add({ targets: chev, y: chev.y - 4, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const shipKey = frameIcon(this, hullKey(getSave().loadout.hull), 0);
    if (shipKey) this.ship = this.add.image(t.x, t.y, shipKey).setDepth(MD.content + 2);
  }

  // ------------------------------------------------------------ focus / info strip

  private setFocus(i: number, sound = true): void {
    const n = this.nodes[i];
    if (!n) return;
    if (i !== this.focus && sound) audio.sfx('ui_move');
    this.focus = i;
    if (this.reticle) {
      const s = (n.r * 2 + 10) / 28;
      this.tweens.killTweensOf(this.reticle);
      this.tweens.add({ targets: this.reticle, x: n.x, y: n.y, scale: s, duration: sound ? 140 : 0, ease: 'Quad.Out' });
      this.tweens.add({ targets: this.reticle, alpha: 0.45, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    this.drawInfo(n);
    setHookState({ focus: n.def.id });
  }

  private drawInfo(n: PlanetNode): void {
    this.infoObjs.forEach((o) => o.destroy());
    this.infoObjs = [];
    const { x, y, w } = this.info;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.infoObjs.push(o); return o; };
    const tint = BIOME_TINT[n.def.biome] ?? COLORS.teal;
    add(this.add.rectangle(x + 4, y + 4, 2, this.info.h - 8, tint).setOrigin(0).setDepth(MD.content));
    const name = add(kit.text(this, x + 11, y + 6, upper(n.def.name), { size: 'm', color: n.unlocked ? COLORS.text : COLORS.textDim, depth: MD.content }));
    add(kit.text(this, name.x + name.width + 6, y + 8, BIOME_LABEL[n.def.biome] ?? '', { size: 's', color: tint, depth: MD.content }));
    const prog = !n.unlocked ? 'LOCKED' : n.completed ? 'LIBERATED' : `${n.cleared}/${n.def.levels.length} CLEARED`;
    add(kit.text(this, x + w - 8, y + 8, prog, { size: 's', color: !n.unlocked ? COLORS.bad : n.completed ? COLORS.good : COLORS.teal, originX: 1, depth: MD.content }));
    wrapLines(n.def.desc, Math.floor((w - 20) / 6), 2).forEach((ln, k) => add(kit.text(this, x + 11, y + 21 + k * 9, ln, { size: 's', color: COLORS.textDim, depth: MD.content })));
  }

  // ------------------------------------------------------------ mission panel

  private openPanel(i: number): void {
    const n = this.nodes[i];
    if (!n || this.panelOpen) return;
    this.panelOpen = true;
    this.setFocus(i, false);
    audio.sfx('ui_select');
    const { width: W, height: H } = this.scale.gameSize;
    const save = getSave();
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.panelObjs.push(o); return o; };
    const ph = Math.min(H - HEADER_H - 40, 244);
    const px = 4, pw = W - 8, py = H - 16 - 4 - ph;
    const d = MD.float;

    const shade = add(this.add.rectangle(0, HEADER_H, W, H - HEADER_H, 0x05040a, 0.62).setOrigin(0).setDepth(d).setInteractive());
    shade.on('pointerup', (p: Phaser.Input.Pointer) => { if (p.y < py) this.closePanel(); });
    add(kit.panel(this, px, py, pw, ph, 'raised').setDepth(d));
    const tint = BIOME_TINT[n.def.biome] ?? COLORS.teal;
    add(this.add.rectangle(px + 3, py + 3, pw - 6, 2, tint, 0.8).setOrigin(0).setDepth(d));

    // planet header
    add(this.add.image(px + 36, py + 36, META.glow).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setDisplaySize(84, 84).setDepth(d));
    const globe = add(this.add.image(px + 36, py + 36, planetTexture(this, n.def.biome, Math.round(52 * Math.min(1.2, planetScale(n.def.biome))))).setDepth(d));
    if (!n.unlocked) {
      globe.setTint(0x55526a);
      add(this.add.image(px + 36, py + 36, iconOr(this, 'ui_icon_lock', META.icLock)).setDepth(d).setScale(2));
    }
    const tx = px + 70;
    add(kit.text(this, tx, py + 10, kit.fit(upper(n.def.name), pw - 76, 'l'), { size: 'l', depth: d }));
    const sub = `${BIOME_LABEL[n.def.biome] ?? ''}  ${n.cleared}/${n.def.levels.length} CLEARED`;
    add(kit.text(this, tx, py + 29, sub, { size: 's', color: tint, depth: d }));
    wrapLines(n.def.desc, Math.floor((pw - 76) / 6), 3).forEach((ln, k) => add(kit.text(this, tx, py + 40 + k * 9, ln, { size: 's', color: COLORS.textDim, depth: d })));

    // missions list
    const ly = py + 72;
    add(sectionLabel(this, px + 8, ly, 'MISSIONS', pw - 16, d));
    const rowH = 22;
    const items: kit.MenuItem[] = n.def.levels.map((id, k) => {
      const lv = findLevel(id);
      const open = isUnlocked(id);
      const done = isCompleted(id);
      const best = save.bestScores[id] ?? 0;
      const current = save.currentLevel === id;
      const icon = !open ? iconOr(this, 'ui_icon_lock', META.icLock) : done ? META.tick : META.icLaunch;
      return {
        label: `${k + 1} ${kit.fit(upper(lv?.name ?? id), pw - 140, 'm')}`,
        icon,
        color: current ? COLORS.accentLight : undefined,
        value: !open ? 'LOCKED' : done ? (best > 0 ? fmt(best) : 'CLEARED') : 'NEW',
        valueColor: done ? COLORS.gold : COLORS.teal,
        disabled: !open,
        arrows: false,
        help: !open ? 'CLEAR THE PREVIOUS MISSION FIRST' : done ? 'REPLAY FOR CREDITS - BEST SCORE SHOWN' : 'SET AS NEXT MISSION AND RETURN TO HANGAR',
      };
    });
    items.push({ label: 'CLOSE', icon: META.icDone, color: COLORS.textDim, arrows: false, help: 'BACK TO THE STAR CHART' });
    const start = Math.max(0, n.def.levels.indexOf(save.currentLevel));
    const firstOpen = n.def.levels.findIndex((id) => isUnlocked(id) && !isCompleted(id));
    const by = ly + 12 + items.length * rowH + 6;
    this.panelList = new kit.MenuList(this, {
      x: px + 22, y: ly + 12, width: pw - 30, items, rowHeight: rowH, size: 'm', depth: d + 1,
      startIndex: save.currentLevel && n.def.levels.includes(save.currentLevel) ? start : Math.max(0, firstOpen),
      onFocus: (k, it) => { this.status.setText(it.help ?? ''); this.drawBriefing(n, k, px, by, pw, py + ph - by - 6); },
      onSelect: (k) => this.chooseLevel(n, k),
      onDisabled: () => toast(this, 'LOCKED', COLORS.bad, ly + 40, 'CLEAR THE PREVIOUS MISSION FIRST'),
    });
    this.drawBriefing(n, this.panelList.index, px, by, pw, py + ph - by - 6);
    add(scanlines(this, px + 3, py + 3, pw - 6, ph - 6, 0.25, d));
    add(cornerBrackets(this, px + 2, py + 2, pw - 4, ph - 4, tint, 6, d + 1));

    // entrance
    const objs = [...this.panelObjs, this.panelList.container];
    for (const o of objs) {
      const go = o as unknown as { alpha?: number; setAlpha?: (a: number) => void };
      if (o !== shade && typeof go.setAlpha === 'function') go.setAlpha(0);
    }
    shade.setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: 140 });
    this.tweens.add({ targets: objs.filter((o) => o !== shade), alpha: 1, duration: 160, ease: 'Quad.Out' });
    setHookState({ panel: true, focus: n.def.id });
  }

  private drawBriefing(n: PlanetNode, k: number, x: number, y: number, w: number, h: number): void {
    this.briefObjs.forEach((o) => o.destroy());
    this.briefObjs = [];
    const id = n.def.levels[k];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.briefObjs.push(o); return o; };
    const d = MD.float;
    add(sectionLabel(this, x + 8, y, 'BRIEFING', w - 16, d));
    if (!id) {
      add(kit.text(this, x + 12, y + 12, 'Close the mission list.', { size: 's', color: COLORS.textDim, depth: d }));
      return;
    }
    const lv = findLevel(id);
    const lines = Math.max(1, Math.floor((h - 22) / 9));
    const boss = lv?.boss ? BOSSES.find((b) => b.id === lv.boss) : undefined;
    const open = isUnlocked(id);
    const text = open ? lv?.briefing ?? '' : 'Transmission encrypted. Clear the previous mission to decode it.';
    wrapLines(text, Math.floor((w - 24) / 6), boss ? Math.max(1, lines - 1) : lines)
      .forEach((ln, j) => add(kit.text(this, x + 12, y + 12 + j * 9, ln, { size: 's', color: open ? COLORS.text : COLORS.textDim, depth: d })));
    if (boss && open) {
      add(kit.text(this, x + 12, y + h - 8, `BOSS: ${upper(boss.name)}`, { size: 's', color: COLORS.bad, depth: d }));
    } else if (lv?.midboss && open) {
      add(kit.text(this, x + 12, y + h - 8, 'WARNING: HEAVY ESCORT EXPECTED', { size: 's', color: COLORS.warn, depth: d }));
    }
    for (const o of this.briefObjs) (o as unknown as { setAlpha?: (a: number) => void }).setAlpha?.(this.panelOpen ? 1 : 0);
  }

  private chooseLevel(n: PlanetNode, k: number): void {
    const id = n.def.levels[k];
    if (!id) { this.closePanel(); return; }
    if (!isUnlocked(id)) return;
    const save = getSave();
    save.currentLevel = id;
    saveNow();
    setHangarFocus(0);
    audio.sfx('ui_buy');
    const lv = findLevel(id);
    toast(this, 'MISSION SET', COLORS.good, this.scale.gameSize.height / 2, upper(lv?.name ?? id));
    this.panelList?.setEnabled(false);
    this.time.delayedCall(380, () => kit.goto(this, SCENES.Hangar));
  }

  private closePanel(): void {
    if (!this.panelOpen) return;
    audio.sfx('ui_back');
    this.panelList?.destroy();
    this.panelList = undefined;
    this.tweens.killTweensOf([...this.briefObjs, ...this.panelObjs]);
    this.briefObjs.forEach((o) => o.destroy());
    this.briefObjs = [];
    this.panelObjs.forEach((o) => o.destroy());
    this.panelObjs = [];
    this.panelOpen = false;
    this.status.setText('TAP A PLANET OR USE THE ARROWS - ENTER: MISSIONS');
    setHookState({ panel: false });
  }

  private back(): void {
    if (this.panelOpen) { this.closePanel(); return; }
    audio.sfx('ui_back');
    kit.goto(this, SCENES.Hangar);
  }
}
