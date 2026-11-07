// =====================================================================================
//  INTEL — "TRANSMISSIONS" inbox of the collected IntelDef (unread first, NEW badge) and a
//  reading view on a recessed CRT screen: sender, title, body typed out (tap / Enter skips).
//  Opening a message marks it read (save.intelRead + saveNow()). Back returns to the caller
//  given as data.from (Hangar by default; any scene that rebuilds itself without data).
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, SCENES, type SceneKey } from '../config';
import { markSceneReady, setHookState } from '../debug';
import type { IntelDef } from '../types';
import { audio } from '../audio';
import { getSave, saveNow } from '../state/save';
import { INTEL } from '../data';
import { button, fadeIn, fit, goto, onBack, panel, statusBar, text, wrapText, type ButtonApi, type MenuItem, type StatusBarApi } from '../ui/kit';
import {
  LAYOUT, MD, ScrollMenu, Typewriter, bottomButton, bottomButtonY, contentRect, neonRule, scanlines, screenBackdrop, screenHeader,
  type ScreenHeaderApi,
} from '../ui/widgets';

const ROW_H = 24;
const READ_COLOR = 0xb4aecb;

/** Scenes Intel may return to (they all rebuild themselves without data). */
const RETURN_TO: readonly string[] = [SCENES.Hangar, SCENES.Map, SCENES.Title, SCENES.Shop, SCENES.Specs];
const RETURN_LABEL: Partial<Record<string, string>> = {
  [SCENES.Hangar]: 'BACK TO HANGAR', [SCENES.Map]: 'BACK TO MAP', [SCENES.Title]: 'BACK TO TITLE',
};

export class IntelScene extends Phaser.Scene {
  private defs: IntelDef[] = [];
  private list: ScrollMenu | null = null;
  private listBox: Phaser.GameObjects.Container | null = null;
  private reader: Phaser.GameObjects.Container | null = null;
  private tw: Typewriter | null = null;
  private status!: StatusBarApi;
  private backBtn: ButtonApi | null = null;
  private readIdx = -1;
  private top = 0;
  private openedFrame = -1;
  private head: ScreenHeaderApi | null = null;
  private from: SceneKey = SCENES.Hangar;

  constructor() {
    super(SCENES.Intel);
  }

  create(data?: { from?: SceneKey }): void {
    this.from = data?.from && RETURN_TO.includes(data.from) ? data.from : SCENES.Hangar;
    this.list = null;
    this.listBox = null;
    this.reader = null;
    this.tw = null;
    this.backBtn = null;
    this.readIdx = -1;
    fadeIn(this);
    const { width } = this.scale.gameSize;
    screenBackdrop(this, { stars: 0.8, speed: 6 });

    const save = getSave();
    const known = save.intel.map((id) => INTEL.find((d) => d.id === id)).filter((d): d is IntelDef => !!d);
    const unread = known.filter((d) => !save.intelRead.includes(d.id));
    const read = known.filter((d) => save.intelRead.includes(d.id));
    this.defs = [...unread, ...read];

    this.head = screenHeader(this, 'TRANSMISSIONS', { back: () => this.back(), icon: 'ui_icon_intel', right: this.subLine(), rightColor: this.subColor() });
    this.top = this.head.bottom + LAYOUT.gap;
    this.status = statusBar(this, '');

    if (this.defs.length === 0) this.buildEmpty(width);
    else this.buildList();

    this.backBtn = bottomButton(this, RETURN_LABEL[this.from] ?? 'BACK', () => this.back());
    onBack(this, () => this.back());
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.readerKeys(e));
    markSceneReady(SCENES.Intel, { count: this.defs.length, unread: unread.length, from: this.from });
  }

  // ---------------------------------------------------------------------------- list

  /** Header status text: unread count. */
  private subLine(): string {
    const read = getSave().intelRead;
    const total = this.defs.length;
    const unread = this.defs.filter((d) => !read.includes(d.id)).length;
    if (total === 0) return 'EMPTY';
    return unread > 0 ? `${unread} NEW` : 'ALL READ';
  }

  private subColor(): number {
    const read = getSave().intelRead;
    return this.defs.some((d) => !read.includes(d.id)) ? COLORS.accentLight : COLORS.textDim;
  }

  private items(): MenuItem[] {
    const readIds = getSave().intelRead;
    return this.defs.map((d) => {
      const isRead = readIds.includes(d.id);
      return {
        label: fit(d.title.toUpperCase(), 228, 'm'),
        icon: 'ui_icon_intel',
        value: isRead ? undefined : 'NEW',
        valueColor: COLORS.accent,
        color: isRead ? READ_COLOR : COLORS.text,
        help: `FROM: ${d.from.toUpperCase()}`,
        arrows: false,
      };
    });
  }

  private buildList(): void {
    const area = contentRect(this, this.top);
    const avail = bottomButtonY(this) - LAYOUT.gap - this.top - 16;
    const rows = Math.max(3, Math.min(this.defs.length, Math.floor(avail / ROW_H)));
    const box = this.add.container(0, 0);
    box.add(panel(this, area.x, this.top, area.w, rows * ROW_H + 16, 'raised').setDepth(MD.panel));
    this.list = new ScrollMenu(this, {
      x: area.x + LAYOUT.listInset, y: this.top + 8, width: area.w - LAYOUT.listInset - LAYOUT.pad, items: this.items(),
      visibleRows: rows, rowHeight: ROW_H, size: 'm',
      onSelect: (i) => this.open(i),
      onFocus: (_i, it) => this.status.setText(it.help ?? ''),
    });
    box.add(this.list.container);
    this.listBox = box;
    const first = this.defs[0];
    if (first) this.status.setText(`FROM: ${first.from.toUpperCase()}`);
  }

  private buildEmpty(width: number): void {
    const area = contentRect(this, this.top);
    const h = Math.min(170, bottomButtonY(this) - LAYOUT.gap - this.top);
    panel(this, area.x, this.top, area.w, h, 'inset');
    scanlines(this, area.x + 2, this.top + 2, area.w - 4, h - 4, 0.55);
    const cy = this.top + 26;
    if (this.textures.exists('ui_icon_intel')) this.add.image(width / 2, cy, 'ui_icon_intel').setScale(2).setAlpha(0.6);
    text(this, width / 2, cy + 22, 'NO TRANSMISSIONS YET', { size: 'm', color: COLORS.teal, originX: 0.5 });
    text(this, width / 2, cy + 42, wrapText('Some missions hide encrypted data caches. Shoot down the courier ships that carry them to intercept enemy transmissions.', area.w - 2 * 14, 's'), {
      size: 's', color: COLORS.textDim, originX: 0.5, align: 'center',
    }).setLineSpacing(3);
    this.status.setText('Recovered intel appears here.');
  }

  // ---------------------------------------------------------------------------- reader

  private open(i: number): void {
    const def = this.defs[i];
    if (!def) return;
    this.readIdx = i;
    this.openedFrame = this.game.getFrame();
    const save = getSave();
    if (!save.intelRead.includes(def.id)) {
      save.intelRead.push(def.id);
      saveNow();
      this.list?.setItems(this.items(), true);
      this.head?.setRight(this.subLine(), this.subColor());
    }
    this.listBox?.setVisible(false);
    this.list?.setEnabled(false);
    this.backBtn?.container.setVisible(false);
    this.buildReader(def);
    setHookState({ reading: def.id });
  }

  private buildReader(def: IntelDef): void {
    this.reader?.destroy();
    this.tw?.destroy();
    const area = contentRect(this, this.top);
    const x = area.x;
    const y = this.top;
    const w = area.w;
    const by = bottomButtonY(this);
    const h = by - LAYOUT.gap - y;
    const c = this.add.container(0, 0);
    c.add(panel(this, x, y, w, h, 'inset'));
    c.add(text(this, x + 12, y + 10, `FROM: ${def.from.toUpperCase()}`, { size: 's', color: COLORS.teal }));
    c.add(text(this, x + w - 12, y + 10, `${this.readIdx + 1}/${this.defs.length}`, { size: 's', color: COLORS.textDim, originX: 1 }));
    const title = text(this, x + 12, y + 24, wrapText(def.title.toUpperCase(), w - 24, 'm'), { size: 'm', color: COLORS.accentLight });
    title.setLineSpacing(3);
    c.add(title);
    const ruleY = y + 24 + title.height + 6;
    c.add(neonRule(this, x + w / 2, ruleY, w - 24, COLORS.accent));
    const bodyY = ruleY + 9;
    const footY = y + h - 16;
    const end = text(this, x + w / 2, bodyY, '-- END OF TRANSMISSION --', { size: 's', color: COLORS.textDim, originX: 0.5 }).setVisible(false);
    this.tw = new Typewriter(this, x + 12, bodyY, def.body, {
      size: 'm', color: COLORS.teal, maxWidth: w - 24, cps: 62, lineSpacing: 4,
      onDone: () => {
        if (this.tw) end.setY(Math.min(footY - 16, bodyY + this.tw.fullHeight + 12)).setVisible(true);
        setHookState({ typed: true });
      },
    });
    c.add([this.tw.text, end]);
    // CRT footer: signal meter + decrypt status
    c.add(this.add.rectangle(x + 10, footY - 5, w - 20, 1, COLORS.tealDark, 1).setOrigin(0));
    c.add(text(this, x + 12, footY, 'SIGNAL', { size: 's', color: COLORS.tealDark }));
    const bars = this.add.graphics();
    c.add(bars);
    const drawBars = () => {
      bars.clear();
      const lvl = 3 + Math.floor(Math.random() * 3);
      for (let b = 0; b < 5; b++) {
        bars.fillStyle(b < lvl ? COLORS.teal : COLORS.panelLight, b < lvl ? 0.9 : 0.6);
        bars.fillRect(x + 52 + b * 5, footY + 7 - (b + 1) * 2 + 1, 3, (b + 1) * 2);
      }
    };
    drawBars();
    const barTimer = this.time.addEvent({ delay: 700, loop: true, callback: drawBars });
    const dec = text(this, x + w - 12, footY, 'DECRYPTED', { size: 's', color: COLORS.tealDark, originX: 1 });
    c.add(dec);
    this.tweens.add({ targets: dec, alpha: 0.4, duration: 600, yoyo: true, repeat: -1, ease: 'Stepped' });
    c.add(scanlines(this, x + 2, y + 2, w - 4, h - 4, 0.6));
    const sweep = this.add.rectangle(x + 2, y + 2, w - 4, 3, 0xffffff, 0.05).setOrigin(0);
    c.add(sweep);
    this.tweens.add({ targets: sweep, y: y + h - 6, duration: 2600, repeat: -1, ease: 'Linear' });
    c.once(Phaser.GameObjects.Events.DESTROY, () => {
      barTimer.remove(false);
      this.tweens.killTweensOf([dec, sweep]);
    });
    const tapZone = this.add.zone(x, y, w, h).setOrigin(0).setInteractive();
    tapZone.on('pointerdown', () => this.tw?.skip());
    c.add(tapZone);

    const bh = LAYOUT.buttonH;
    const bw = Math.floor((w - 2 * LAYOUT.gap) / 3);
    const prev = button(this, x, by, bw, bh, '< PREV', () => this.step(-1), { size: 'm', color: COLORS.teal });
    const list = button(this, x + bw + LAYOUT.gap, by, w - 2 * (bw + LAYOUT.gap), bh, 'INBOX', () => this.closeReader(), { size: 'm', color: COLORS.accentLight });
    const next = button(this, x + w - bw, by, bw, bh, 'NEXT >', () => this.step(1), { size: 'm', color: COLORS.teal });
    prev.setEnabled(this.readIdx > 0);
    next.setEnabled(this.readIdx < this.defs.length - 1);
    c.add([prev.container, list.container, next.container]);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 160 });
    this.reader = c;
    this.status.setText('Tap the screen to skip - left / right to browse');
    audio.sfx('pickup_intel', { volume: 0.6 });
  }

  private step(dir: -1 | 1): void {
    const n = this.readIdx + dir;
    if (n < 0 || n >= this.defs.length) { audio.sfx('ui_error'); return; }
    this.list?.setIndex(n, false);
    this.open(n);
  }

  private closeReader(): void {
    if (!this.reader) return;
    this.tw?.destroy();
    this.tw = null;
    this.reader.destroy();
    this.reader = null;
    this.readIdx = -1;
    this.listBox?.setVisible(true);
    this.list?.setEnabled(true);
    this.backBtn?.container.setVisible(true);
    const it = this.list?.item;
    this.status.setText(it?.help ?? '');
    setHookState({ reading: null });
  }

  private readerKeys(e: KeyboardEvent): void {
    if (!this.reader || e.repeat || this.game.getFrame() === this.openedFrame) return;
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': this.step(-1); break;
      case 'ArrowRight': case 'KeyD': this.step(1); break;
      case 'Enter': case 'Space': case 'NumpadEnter':
        if (this.tw && !this.tw.done) this.tw.skip();
        else this.step(1);
        break;
      default: break;
    }
  }

  private back(): void {
    audio.sfx('ui_back');
    if (this.reader) { this.closeReader(); return; }
    goto(this, this.from);
  }
}
