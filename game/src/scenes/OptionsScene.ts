// =====================================================================================
//  OPTIONS — sound volumes, feel (shake / vibration), controls (autofire, touch speed),
//  FPS counter and campaign reset (double confirmation). Every change is applied and saved
//  immediately (updateSettings + audio.setVolumes). Back returns to data.from (Title/Hangar).
//  Below the settings, when the screen has room: a flight-controls guide (touch + keys) and
//  the pilot record (save.stats).
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, SCENES, VERSION, type SceneKey } from '../config';
import { DEBUG, markSceneReady } from '../debug';
import type { Settings } from '../types';
import { audio } from '../audio';
import { haptic } from '../platform/haptics';
import { eraseSave, getSave, hasSaveGame, updateSettings } from '../state/save';
import { levelOrder } from '../data';
import { MenuList, confirm, fadeIn, goto, onBack, panel, statusBar, text, type MenuItem, type StatusBarApi } from '../ui/kit';
import { LAYOUT, MD, Slider, Toggle, contentRect, fmtInt, fmtTime, screenBackdrop, screenHeader, sectionLabel, type Rect } from '../ui/widgets';

type RowKind = 'sfx' | 'music' | 'shake' | 'vibrate' | 'autofire' | 'touch' | 'fps' | 'reset' | 'back';
type BoolKey = 'shake' | 'vibrate' | 'autofire' | 'showFps';

interface RowDef { kind: RowKind; label: string; help: string }

const ROWS: RowDef[] = [
  { kind: 'sfx', label: 'SFX VOLUME', help: 'Sound effects volume. LEFT / RIGHT to adjust.' },
  { kind: 'music', label: 'MUSIC VOLUME', help: 'Soundtrack volume. LEFT / RIGHT to adjust.' },
  { kind: 'shake', label: 'SCREEN SHAKE', help: 'Camera shake on hits and explosions.' },
  { kind: 'vibrate', label: 'VIBRATION', help: 'Haptic feedback on hits (phones only).' },
  { kind: 'autofire', label: 'AUTOFIRE', help: 'Guns fire nonstop. Off: only while you drag.' },
  { kind: 'touch', label: 'TOUCH SPEED', help: 'Ship movement per finger drag (0.8x - 2.0x).' },
  { kind: 'fps', label: 'SHOW FPS', help: 'Frame-rate counter during missions.' },
  { kind: 'reset', label: 'RESET CAMPAIGN', help: 'Erase all campaign progress. Settings are kept.' },
  { kind: 'back', label: 'BACK', help: 'Return to the previous screen.' },
];
/** Rows after which a thin group separator is drawn. */
const SEPARATE_AFTER = new Set<RowKind>(['music', 'vibrate', 'touch', 'fps', 'reset']);

const BOOL_OF: Partial<Record<RowKind, BoolKey>> = { shake: 'shake', vibrate: 'vibrate', autofire: 'autofire', fps: 'showFps' };

/** Flight controls guide: action, icon, touch, keyboard. */
const CONTROLS: [string, string, string, string][] = [
  ['STEER', 'ui_icon_hull', 'DRAG ANYWHERE', 'ARROWS / WASD'],
  ['FIRE', 'ui_icon_front', 'AUTO / WHILE DRAGGING', 'SPACE / Z'],
  ['TAIL MODE', 'ui_icon_rear_mode', 'HUD MODE BUTTON', 'X / SHIFT'],
  ['PAUSE', 'ui_icon_pause', 'HUD PAUSE BUTTON', 'ESC / P'],
];
const CONTROLS_H = 22 + CONTROLS.length * 18 + 4;
const RECORD_H = 22 + 3 * 12 + 6;

/** Scenes Options may return to. */
const RETURN_TO: readonly string[] = [SCENES.Title, SCENES.Hangar, SCENES.Map];

export class OptionsScene extends Phaser.Scene {
  private from: SceneKey = SCENES.Title;
  private list!: MenuList;
  private status!: StatusBarApi;
  private sliders = new Map<number, Slider>();
  private toggles = new Map<number, Toggle>();
  private rowW = 0;
  private rowH = 28;
  private record: Phaser.GameObjects.Container | null = null;
  private recordBox: Rect | null = null;

  constructor() {
    super(SCENES.Options);
  }

  create(data?: { from?: SceneKey }): void {
    this.from = data?.from && RETURN_TO.includes(data.from) ? data.from : SCENES.Title;
    this.sliders = new Map();
    this.toggles = new Map();
    fadeIn(this);
    screenBackdrop(this, { stars: 0.8, speed: 7 });
    screenHeader(this, 'OPTIONS', { back: () => this.leave(), right: `V${VERSION}` });
    const area = contentRect(this);
    // Fit the settings panel + the optional cards (record dropped first); rows then grow a
    // little on tall screens (bigger touch targets) and the spare height opens the gaps.
    const cards: number[] = [CONTROLS_H, RECORD_H];
    const need = (rh: number) => ROWS.length * rh + 16 + cards.reduce((t, h) => t + h + LAYOUT.gap, 0);
    while (cards.length > 0 && need(26) > area.h) cards.pop();
    let rh = 26;
    while (rh < 32 && need(rh + 1) <= area.h) rh++;
    this.rowH = rh;
    const spare = area.h - need(rh);
    const gap = LAYOUT.gap + Math.min(8, Math.floor(spare / Math.max(1, cards.length + 1)));
    const ROW_H = this.rowH;
    const px = area.x;
    const pw = area.w;
    const top = area.y;
    const ph = ROWS.length * ROW_H + 16;
    panel(this, px, top, pw, ph, 'raised').setDepth(MD.panel);
    let cy = top + ph + gap;
    this.record = null;
    this.recordBox = null;
    if (cards.length > 0) {
      this.controlsCard({ x: px, y: cy, w: pw, h: CONTROLS_H });
      cy += CONTROLS_H + gap;
    }
    if (cards.length > 1) {
      this.recordBox = { x: px, y: cy, w: pw, h: RECORD_H };
      panel(this, px, cy, pw, RECORD_H, 'raised').setDepth(MD.panel);
      this.buildRecord();
    }
    const lx = px + LAYOUT.listInset;
    const lw = pw - LAYOUT.listInset - LAYOUT.pad;
    this.rowW = lw;
    const rows = ROWS.map((r) => this.itemFor(r));
    this.status = statusBar(this, ROWS[0].help);
    this.list = new MenuList(this, {
      x: lx, y: top + 8, width: lw, items: rows, rowHeight: ROW_H, size: 'm', depth: MD.content,
      onSelect: (i) => this.activate(i),
      onFocus: (i, it) => this.focus(i, it),
      onDisabled: (i) => { if (ROWS[i].kind === 'reset') this.status.setText('No campaign in progress.'); },
      onLeft: (i) => this.adjust(i, -1),
      onRight: (i) => this.adjust(i, 1),
    });
    const g = this.add.graphics().setDepth(MD.panel);
    ROWS.forEach((r, i) => {
      if (!SEPARATE_AFTER.has(r.kind)) return;
      const y = top + 8 + (i + 1) * ROW_H;
      g.fillStyle(COLORS.panelLight, 0.55).fillRect(px + 10, y, pw - 20, 1);
    });
    this.attachWidgets(lw);
    this.focus(0, rows[0]);
    onBack(this, () => this.leave());
    markSceneReady(SCENES.Options, { from: this.from });
  }

  /** Static guide of the flight controls (touch column + keyboard column). */
  private controlsCard(r: Rect): void {
    const d = MD.content;
    panel(this, r.x, r.y, r.w, r.h, 'raised').setDepth(MD.panel);
    sectionLabel(this, r.x + LAYOUT.pad, r.y + 8, 'FLIGHT CONTROLS', 100, d);
    const touchX = r.x + 104;
    const keysX = r.x + r.w - 10;
    text(this, touchX, r.y + 8, 'TOUCH', { size: 's', color: COLORS.accentLight, depth: d });
    text(this, keysX, r.y + 8, 'KEYBOARD', { size: 's', color: COLORS.accentLight, originX: 1, depth: d });
    CONTROLS.forEach(([label, icon, touch, keys], i) => {
      const y = r.y + 22 + i * 18 + 9;
      if (this.textures.exists(icon)) this.add.image(r.x + 18, y, icon).setDepth(d);
      text(this, r.x + 32, y, label, { size: 's', color: COLORS.text, originY: 0.5, depth: d });
      text(this, touchX, y, touch, { size: 's', color: COLORS.teal, originY: 0.5, depth: d });
      text(this, keysX, y, keys, { size: 's', color: COLORS.textDim, originX: 1, originY: 0.5, depth: d });
    });
  }

  /** Pilot record card content (rebuilt after a campaign reset). */
  private buildRecord(): void {
    this.record?.destroy();
    const r = this.recordBox;
    if (!r) return;
    const c = this.add.container(0, 0).setDepth(MD.content);
    this.record = c;
    c.add(sectionLabel(this, r.x + LAYOUT.pad, r.y + 8, 'PILOT RECORD', r.w - 2 * LAYOUT.pad));
    if (!hasSaveGame()) {
      c.add(text(this, r.x + r.w / 2, r.y + 22 + 12, 'NO CAMPAIGN IN PROGRESS', { size: 's', color: COLORS.textDim, originX: 0.5 }));
      return;
    }
    const save = getSave();
    const order = levelOrder();
    const done = save.completedLevels.filter((id) => order.includes(id)).length;
    const diffColor = save.difficulty === 'easy' ? COLORS.good : save.difficulty === 'hard' ? COLORS.warn : COLORS.text;
    const cells: [string, string, number][] = [
      ['DIFFICULTY', save.difficulty.toUpperCase(), diffColor],
      ['MISSIONS', `${done}/${order.length}`, COLORS.teal],
      ['FLIGHT TIME', fmtTime(save.stats.playSeconds), COLORS.text],
      ['KILLS', fmtInt(save.stats.kills), COLORS.text],
      ['CREDITS EARNED', fmtInt(save.stats.creditsEarned), COLORS.gold],
      ['SHIPS LOST', fmtInt(save.stats.deaths), save.stats.deaths > 0 ? COLORS.bad : COLORS.text],
    ];
    const half = Math.floor(r.w / 2);
    cells.forEach(([label, value, color], i) => {
      const col = i % 2;
      const x0 = r.x + (col === 0 ? 12 : half + 6);
      const x1 = r.x + (col === 0 ? half - 6 : r.w - 10);
      const y = r.y + 22 + Math.floor(i / 2) * 12;
      c.add(text(this, x0, y, label, { size: 's', color: COLORS.textDim }));
      c.add(text(this, x1, y, value, { size: 's', color, originX: 1 }));
    });
    c.add(this.add.rectangle(r.x + half, r.y + 21, 1, 34, COLORS.panelLight, 0.6).setOrigin(0));
  }

  private itemFor(r: RowDef): MenuItem {
    if (r.kind === 'reset') return { label: r.label, help: r.help, color: COLORS.bad, disabled: !hasSaveGame() };
    if (r.kind === 'back') return { label: r.label, help: r.help, color: COLORS.teal };
    return { label: r.label, help: r.help, arrows: false };
  }

  private attachWidgets(rowW: number): void {
    const s = getSave().settings;
    const sliderX = 112;
    const sliderW = rowW - sliderX - 2;
    const sy = Math.round((this.rowH - 22) / 2);
    ROWS.forEach((r, i) => {
      const row = this.list.rowContainer(i);
      if (!row) return;
      const touch = () => this.list.setIndex(i);
      if (r.kind === 'sfx' || r.kind === 'music') {
        const sl = new Slider(this, {
          x: sliderX, y: sy, width: sliderW, min: 0, max: 1, step: 0.1, value: r.kind === 'sfx' ? s.sfx : s.music,
          onTouch: touch,
          onChange: (v) => this.applyVolume(r.kind === 'sfx' ? { sfx: v } : { music: v }),
        });
        row.add(sl.container);
        this.sliders.set(i, sl);
      } else if (r.kind === 'touch') {
        const sl = new Slider(this, {
          x: sliderX, y: sy, width: sliderW, min: 0.8, max: 2, step: 0.1, value: s.touchSensitivity,
          format: (v) => `${v.toFixed(1)}x`, onTouch: touch,
          onChange: (v) => updateSettings({ touchSensitivity: v }),
        });
        row.add(sl.container);
        this.sliders.set(i, sl);
      } else {
        const key = BOOL_OF[r.kind];
        if (!key) return;
        const tg = new Toggle(this, 0, sy, s[key], (v) => this.applyBool(key, v), { onTouch: touch });
        tg.container.x = rowW - tg.width - 4;
        row.add(tg.container);
        this.toggles.set(i, tg);
      }
    });
  }

  private focus(i: number, it: MenuItem): void {
    this.status.setText(it.disabled && ROWS[i].kind === 'reset' ? 'No campaign in progress.' : it.help ?? '');
    this.sliders.forEach((sl, k) => sl.setFocused(k === i));
    this.toggles.forEach((tg, k) => tg.setFocused(k === i));
  }

  private adjust(i: number, dir: -1 | 1): void {
    const sl = this.sliders.get(i);
    if (sl) { sl.step(dir); return; }
    const tg = this.toggles.get(i);
    if (tg) tg.toggle();
  }

  private activate(i: number): void {
    const kind = ROWS[i].kind;
    const tg = this.toggles.get(i);
    if (tg) { tg.setValue(!tg.value, true); return; }
    if (kind === 'reset') this.askReset();
    else if (kind === 'back') this.leave();
  }

  private applyVolume(patch: Partial<Settings>): void {
    updateSettings(patch);
    const s = getSave().settings;
    audio.setVolumes(DEBUG.mute ? 0 : s.sfx, DEBUG.mute ? 0 : s.music);
  }

  private applyBool(key: BoolKey, v: boolean): void {
    updateSettings({ [key]: v } as Partial<Settings>);
    if (key === 'vibrate' && v) haptic('medium');
    if (key === 'shake' && v) this.cameras.main.shake(140, 0.006);
  }

  private askReset(): void {
    this.list.setEnabled(false);
    confirm(this, 'Erase the campaign? Credits, ship and mission progress will be lost.', (yes) => {
      if (!yes) { this.list.setEnabled(true); return; }
      confirm(this, 'Are you absolutely sure? This cannot be undone.', (sure) => {
        this.list.setEnabled(true);
        if (!sure) return;
        eraseSave();
        audio.sfx('ui_sell');
        this.cameras.main.flash(160, 255, 64, 64);
        const i = ROWS.findIndex((r) => r.kind === 'reset');
        this.sliders.clear();
        this.toggles.clear();
        this.list.setItems(ROWS.map((r) => this.itemFor(r)), true);
        this.attachWidgets(this.rowW);
        this.list.setIndex(i, false);
        this.buildRecord();
        this.status.setText('Campaign erased.');
        if (this.from === SCENES.Hangar || this.from === SCENES.Map) {
          this.from = SCENES.Title;
          this.time.delayedCall(700, () => goto(this, SCENES.Title));
        }
      });
    });
  }

  private leave(): void {
    audio.sfx('ui_back');
    goto(this, this.from);
  }
}
