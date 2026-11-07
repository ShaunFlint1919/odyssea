// =====================================================================================
//  OPTIONS — sound volumes, feel (shake / vibration), controls (autofire, touch speed),
//  FPS counter and campaign reset (double confirmation). Every change is applied and saved
//  immediately (updateSettings + audio.setVolumes). Back returns to data.from (Title/Hangar).
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, SCENES, VERSION, type SceneKey } from '../config';
import { DEBUG, markSceneReady } from '../debug';
import type { Settings } from '../types';
import { audio } from '../audio';
import { haptic } from '../platform/haptics';
import { eraseSave, getSave, hasSaveGame, updateSettings } from '../state/save';
import { MenuList, confirm, fadeIn, goto, onBack, panel, statusBar, type MenuItem, type StatusBarApi } from '../ui/kit';
import { LAYOUT, MD, Slider, Toggle, contentRect, screenBackdrop, screenHeader } from '../ui/widgets';

type RowKind = 'sfx' | 'music' | 'shake' | 'vibrate' | 'autofire' | 'touch' | 'fps' | 'reset' | 'back';
type BoolKey = 'shake' | 'vibrate' | 'autofire' | 'showFps';

interface RowDef { kind: RowKind; label: string; help: string }

const ROWS: RowDef[] = [
  { kind: 'sfx', label: 'SFX VOLUME', help: 'Sound effects volume. LEFT / RIGHT to adjust.' },
  { kind: 'music', label: 'MUSIC VOLUME', help: 'Soundtrack volume. LEFT / RIGHT to adjust.' },
  { kind: 'shake', label: 'SCREEN SHAKE', help: 'Camera shake on hits and explosions.' },
  { kind: 'vibrate', label: 'VIBRATION', help: 'Haptic feedback on hits (phones only).' },
  { kind: 'autofire', label: 'AUTOFIRE', help: 'Weapons fire on their own while you steer.' },
  { kind: 'touch', label: 'TOUCH SPEED', help: 'Ship movement per finger drag (0.8x - 2.0x).' },
  { kind: 'fps', label: 'SHOW FPS', help: 'Frame-rate counter during missions.' },
  { kind: 'reset', label: 'RESET CAMPAIGN', help: 'Erase all campaign progress. Settings are kept.' },
  { kind: 'back', label: 'BACK', help: 'Return to the previous screen.' },
];
/** Rows after which a thin group separator is drawn. */
const SEPARATE_AFTER = new Set<RowKind>(['music', 'vibrate', 'touch', 'fps', 'reset']);

const BOOL_OF: Partial<Record<RowKind, BoolKey>> = { shake: 'shake', vibrate: 'vibrate', autofire: 'autofire', fps: 'showFps' };

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
    // Rows grow a little on tall screens (bigger touch targets); the panel stays at the top.
    this.rowH = Phaser.Math.Clamp(Math.floor((area.h - 16) / ROWS.length), 26, 30);
    const ROW_H = this.rowH;
    const px = area.x;
    const pw = area.w;
    const top = area.y;
    const ph = ROWS.length * ROW_H + 16;
    panel(this, px, top, pw, ph, 'raised').setDepth(MD.panel);
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
