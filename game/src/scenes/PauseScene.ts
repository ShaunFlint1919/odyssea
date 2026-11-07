// =====================================================================================
//  PAUSE — overlay launched over the paused Game scene (see PAUSE_EVENTS in
//  src/game/contracts.ts): the shared screen frame (header strip whose back arrow resumes,
//  status bar with the focused row's help) over the dimmed game, and a centred panel with
//  RESUME, quick toggles (sound FX, music, shake, vibration) and ABORT MISSION (confirmed).
//  Back / Escape = resume.
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
import { MenuList, confirm, onBack, panel, statusBar, type MenuItem, type StatusBarApi } from '../ui/kit';
import { LAYOUT, Toggle, contentRect, scanlines, screenHeader, sectionLabel } from '../ui/widgets';

type RowKind = 'resume' | 'sfx' | 'music' | 'shake' | 'vibrate' | 'abort';
const ROWS: { kind: RowKind; label: string; help: string }[] = [
  { kind: 'resume', label: 'RESUME', help: 'Back to the mission. Back / Esc also resumes.' },
  { kind: 'sfx', label: 'SOUND FX', help: 'Sound effects on / off.' },
  { kind: 'music', label: 'MUSIC', help: 'Soundtrack on / off.' },
  { kind: 'shake', label: 'SCREEN SHAKE', help: 'Camera shake on hits and explosions.' },
  { kind: 'vibrate', label: 'VIBRATION', help: 'Haptic feedback on hits (phones only).' },
  { kind: 'abort', label: 'ABORT MISSION', help: '' },
];
const ROW_H = 26;
const PANEL_W = 240;

/** Volumes remembered while muted from the pause menu (restored when switched back on). */
const lastVolume = { sfx: DEFAULT_SETTINGS.sfx, music: DEFAULT_SETTINGS.music };

export class PauseScene extends Phaser.Scene {
  private leaving = false;
  private list!: MenuList;
  private status!: StatusBarApi;
  private toggles = new Map<number, Toggle>();

  constructor() {
    super(SCENES.Pause);
  }

  create(data?: { levelId?: string }): void {
    this.leaving = false;
    this.toggles = new Map();
    const { width, height } = this.scale.gameSize;
    const base = DEPTH.overlay;
    // Overlay fade (no camera fade: the frozen game must stay visible underneath).
    const shade = this.add.rectangle(0, 0, width, height, COLORS.bg, 0).setOrigin(0).setInteractive().setDepth(base);
    this.tweens.add({ targets: shade, fillAlpha: 0.74, duration: 150 });
    scanlines(this, 0, 0, width, height, 0.5, base);

    const lv = this.level(data?.levelId);
    const head = screenHeader(this, 'PAUSED', { back: () => this.resume(), right: lv.tag, rightColor: COLORS.teal, depth: base + 3 });
    const pct = Math.round(FAILED_CREDIT_RATIO * 100);
    const help = (i: number) => (ROWS[i].kind === 'abort' ? `Leave the mission. You keep ${pct}% of its credits.` : ROWS[i].help);
    this.status = statusBar(this, help(0), { depth: base + 3 });

    // centred panel: level name, then the menu
    const area = contentRect(this, head.bottom + LAYOUT.gap);
    const ph = 26 + ROWS.length * ROW_H + 12;
    const px = Math.round((width - PANEL_W) / 2);
    const py = Math.round(area.y + Math.max(0, (area.h - ph) / 2) - Math.min(16, area.h * 0.04));
    const box = this.add.container(0, 0).setDepth(base + 1);
    box.add(panel(this, px, py, PANEL_W, ph, 'raised'));
    box.add(sectionLabel(this, px + LAYOUT.pad, py + 9, lv.label, PANEL_W - 2 * LAYOUT.pad, undefined, COLORS.teal));

    const s = getSave().settings;
    if (s.sfx > 0) lastVolume.sfx = s.sfx;
    if (s.music > 0) lastVolume.music = s.music;
    const items: MenuItem[] = ROWS.map((r) => ({
      label: r.label,
      color: r.kind === 'abort' ? COLORS.bad : r.kind === 'resume' ? COLORS.teal : undefined,
      arrows: false,
    }));
    const lx = px + LAYOUT.listInset;
    const lw = PANEL_W - LAYOUT.listInset - LAYOUT.pad;
    this.list = new MenuList(this, {
      x: lx, y: py + 26, width: lw, items, rowHeight: ROW_H, size: 'm', depth: base + 2,
      onSelect: (i) => this.activate(i),
      onFocus: (i) => {
        this.toggles.forEach((t, k) => t.setFocused(k === i));
        this.status.setText(help(i));
      },
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

    // entrance: the panel drops in, header / status bar fade in
    box.setAlpha(0);
    box.y = 6;
    this.tweens.add({ targets: box, alpha: 1, y: 0, duration: 160, ease: 'Quad.easeOut' });
    this.list.container.setAlpha(0);
    this.tweens.add({ targets: this.list.container, alpha: 1, duration: 160 });
    head.container.setAlpha(0);
    this.status.object.setAlpha(0);
    this.tweens.add({ targets: [head.container, this.status.object], alpha: 1, duration: 160 });

    audio.sfx('ui_select');
    onBack(this, () => this.resume());
    markSceneReady(SCENES.Pause, { levelId: data?.levelId ?? getSave().currentLevel });
  }

  /** Long label ("KESSRA 1 - DUSTFALL APPROACH") and short tag ("KESSRA 1") of the level. */
  private level(levelId?: string): { label: string; tag: string } {
    const id = levelId ?? getSave().currentLevel;
    const lv = LEVELS.find((l) => l.id === id);
    if (!lv) return { label: 'MISSION IN PROGRESS', tag: '' };
    const planet = (PLANETS.find((p) => p.id === lv.planet)?.name ?? lv.planet).toUpperCase();
    const label = `${planet} ${lv.index} - ${lv.name.toUpperCase()}`;
    return { label: label.length > 36 ? `${label.slice(0, 35)}.` : label, tag: `${planet} ${lv.index}` };
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
