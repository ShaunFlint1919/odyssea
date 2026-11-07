// =====================================================================================
//  PAUSE — overlay launched over the paused Game scene (see PAUSE_EVENTS in
//  src/game/contracts.ts): RESUME, quick toggles (sound FX, music, shake, vibration) and
//  ABORT MISSION (confirmed). Back / Escape = resume.
//   resume: this.scene.resume(SCENES.Game) then this.scene.stop()
//   abort:  emit PAUSE_EVENTS.abort on the Game scene's events, then this.scene.stop()
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, DEPTH, SCENES } from '../config';
import { DEBUG, markSceneReady } from '../debug';
import type { Settings } from '../types';
import { PAUSE_EVENTS } from '../game/contracts';
import { audio } from '../audio';
import { haptic } from '../platform/haptics';
import { DEFAULT_SETTINGS, getSave, updateSettings } from '../state/save';
import { FAILED_CREDIT_RATIO } from '../state/progress';
import { LEVELS, PLANETS } from '../data';
import { MenuList, confirm, onBack, panel, text, type MenuItem } from '../ui/kit';
import { Toggle, neonRule, scanlines } from '../ui/widgets';

type RowKind = 'resume' | 'sfx' | 'music' | 'shake' | 'vibrate' | 'abort';
const ROWS: { kind: RowKind; label: string }[] = [
  { kind: 'resume', label: 'RESUME' },
  { kind: 'sfx', label: 'SOUND FX' },
  { kind: 'music', label: 'MUSIC' },
  { kind: 'shake', label: 'SCREEN SHAKE' },
  { kind: 'vibrate', label: 'VIBRATION' },
  { kind: 'abort', label: 'ABORT MISSION' },
];
const ROW_H = 26;
const PANEL_W = 232;

/** Volumes remembered while muted from the pause menu (restored when switched back on). */
const lastVolume = { sfx: DEFAULT_SETTINGS.sfx, music: DEFAULT_SETTINGS.music };

export class PauseScene extends Phaser.Scene {
  private leaving = false;
  private list!: MenuList;
  private toggles = new Map<number, Toggle>();

  constructor() {
    super(SCENES.Pause);
  }

  create(data?: { levelId?: string }): void {
    this.leaving = false;
    this.toggles = new Map();
    const { width, height } = this.scale.gameSize;
    // Overlay fade (no camera fade: the frozen game must stay visible underneath).
    const shade = this.add.rectangle(0, 0, width, height, COLORS.bg, 0).setOrigin(0).setInteractive().setDepth(DEPTH.overlay);
    this.tweens.add({ targets: shade, fillAlpha: 0.74, duration: 150 });
    scanlines(this, 0, 0, width, height, 0.16).setDepth(DEPTH.overlay);

    const ph = 58 + ROWS.length * ROW_H + 14;
    const px = Math.round((width - PANEL_W) / 2);
    const py = Math.round((height - ph) / 2 - 10);
    const box = this.add.container(0, 0).setDepth(DEPTH.overlay + 1);
    box.add(panel(this, px, py, PANEL_W, ph, 'raised'));
    box.add(text(this, width / 2, py + 10, 'PAUSED', { size: 'l', originX: 0.5 }));
    box.add(neonRule(this, width / 2, py + 30, PANEL_W - 40, COLORS.accent));
    box.add(text(this, width / 2, py + 37, this.levelLabel(data?.levelId), { size: 's', color: COLORS.teal, originX: 0.5 }));

    const s = getSave().settings;
    if (s.sfx > 0) lastVolume.sfx = s.sfx;
    if (s.music > 0) lastVolume.music = s.music;
    const items: MenuItem[] = ROWS.map((r) => ({
      label: r.label,
      color: r.kind === 'abort' ? COLORS.bad : r.kind === 'resume' ? COLORS.teal : undefined,
      arrows: false,
    }));
    const lx = px + 20;
    const lw = PANEL_W - 32;
    this.list = new MenuList(this, {
      x: lx, y: py + 52, width: lw, items, rowHeight: ROW_H, size: 'm', depth: DEPTH.overlay + 2,
      onSelect: (i) => this.activate(i),
      onFocus: (i) => this.toggles.forEach((t, k) => t.setFocused(k === i)),
      onLeft: (i) => this.toggles.get(i)?.toggle(),
      onRight: (i) => this.toggles.get(i)?.toggle(),
    });
    const values: Partial<Record<RowKind, boolean>> = { sfx: s.sfx > 0, music: s.music > 0, shake: s.shake, vibrate: s.vibrate };
    ROWS.forEach((r, i) => {
      const v = values[r.kind];
      const row = this.list.rowContainer(i);
      if (v === undefined || !row) return;
      const tg = new Toggle(this, 0, Math.round((ROW_H - 22) / 2), v, (on) => this.applyToggle(r.kind, on), {
        onTouch: () => this.list.setIndex(i),
      });
      tg.container.x = lw - tg.width - 4;
      row.add(tg.container);
      this.toggles.set(i, tg);
    });
    this.list.setIndex(0, false);
    box.add(text(this, width / 2, py + ph + 10, 'BACK / ESC TO RESUME', { size: 's', color: COLORS.textDim, originX: 0.5 }));

    box.setAlpha(0);
    box.y = 6;
    this.tweens.add({ targets: box, alpha: 1, y: 0, duration: 160, ease: 'Quad.easeOut' });
    this.list.container.setAlpha(0);
    this.tweens.add({ targets: this.list.container, alpha: 1, duration: 160 });

    audio.sfx('ui_select');
    onBack(this, () => this.resume());
    markSceneReady(SCENES.Pause, { levelId: data?.levelId ?? getSave().currentLevel });
  }

  private levelLabel(levelId?: string): string {
    const id = levelId ?? getSave().currentLevel;
    const lv = LEVELS.find((l) => l.id === id);
    if (!lv) return 'MISSION IN PROGRESS';
    const planet = PLANETS.find((p) => p.id === lv.planet);
    return `${(planet?.name ?? lv.planet).toUpperCase()} ${lv.index} - ${lv.name.toUpperCase()}`;
  }

  private activate(i: number): void {
    const kind = ROWS[i].kind;
    const tg = this.toggles.get(i);
    if (tg) { tg.setValue(!tg.value, true); return; }
    if (kind === 'resume') this.resume();
    else if (kind === 'abort') this.askAbort();
  }

  private applyToggle(kind: RowKind, on: boolean): void {
    const s = getSave().settings;
    const patch: Partial<Settings> = {};
    if (kind === 'sfx') {
      if (!on && s.sfx > 0) lastVolume.sfx = s.sfx;
      patch.sfx = on ? lastVolume.sfx || DEFAULT_SETTINGS.sfx : 0;
    } else if (kind === 'music') {
      if (!on && s.music > 0) lastVolume.music = s.music;
      patch.music = on ? lastVolume.music || DEFAULT_SETTINGS.music : 0;
    } else if (kind === 'shake') {
      patch.shake = on;
    } else if (kind === 'vibrate') {
      patch.vibrate = on;
    }
    updateSettings(patch);
    if (kind === 'sfx' || kind === 'music') {
      const n = getSave().settings;
      audio.setVolumes(DEBUG.mute ? 0 : n.sfx, DEBUG.mute ? 0 : n.music);
    }
    if (kind === 'vibrate' && on) haptic('light');
  }

  private askAbort(): void {
    const pct = Math.round(FAILED_CREDIT_RATIO * 100);
    this.list.setEnabled(false);
    confirm(this, `Abort the mission? You keep ${pct}% of the credits earned in it.`, (yes) => {
      this.list.setEnabled(true);
      if (!yes || this.leaving) return;
      this.leaving = true;
      this.scene.get(SCENES.Game).events.emit(PAUSE_EVENTS.abort);
      this.scene.stop();
    });
  }

  private resume(): void {
    if (this.leaving) return;
    this.leaving = true;
    audio.sfx('ui_back');
    this.scene.resume(SCENES.Game);
    this.scene.stop();
  }
}
