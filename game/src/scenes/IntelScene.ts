// =====================================================================================
//  INTEL — "TRANSMISSIONS" inbox of the collected IntelDef (unread first, NEW badge) and a
//  reading view on a recessed CRT screen: sender, title, body typed out (tap / Enter skips).
//  Opening a message marks it read (save.intelRead + saveNow()). Back -> Hangar.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, SCENES } from '../config';
import { markSceneReady, setHookState } from '../debug';
import type { IntelDef } from '../types';
import { audio } from '../audio';
import { getSave, saveNow } from '../state/save';
import { INTEL } from '../data';
import { button, fadeIn, fit, goto, onBack, panel, starfield, statusBar, text, wrapText, type ButtonApi, type MenuItem, type StatusBarApi } from '../ui/kit';
import { ScrollMenu, Typewriter, header, neonRule, scanlines } from '../ui/widgets';

const ROW_H = 24;
const READ_COLOR = 0xb4aecb;

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
  private subText: Phaser.GameObjects.BitmapText | null = null;

  constructor() {
    super(SCENES.Intel);
  }

  create(): void {
    this.list = null;
    this.listBox = null;
    this.reader = null;
    this.tw = null;
    this.backBtn = null;
    this.readIdx = -1;
    fadeIn(this);
    const { width, height } = this.scale.gameSize;
    starfield(this, { density: 0.8, speed: 6 });

    const save = getSave();
    const known = save.intel.map((id) => INTEL.find((d) => d.id === id)).filter((d): d is IntelDef => !!d);
    const unread = known.filter((d) => !save.intelRead.includes(d.id));
    const read = known.filter((d) => save.intelRead.includes(d.id));
    this.defs = [...unread, ...read];

    const head = header(this, 'TRANSMISSIONS', { y: 12, sub: this.subLine(), icon: 'ui_icon_intel' });
    this.subText = (head.getData('subText') as Phaser.GameObjects.BitmapText | undefined) ?? null;
    this.top = (head.getData('bottom') as number) + 10;
    this.status = statusBar(this, '');

    if (this.defs.length === 0) this.buildEmpty(width, height);
    else this.buildList(width, height);

    this.backBtn = button(this, 10, height - 16 - 32, 84, 26, 'BACK', () => this.back(), { size: 'm', color: COLORS.teal });
    onBack(this, () => this.back());
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.readerKeys(e));
    markSceneReady(SCENES.Intel, { count: this.defs.length, unread: unread.length });
  }

  // ---------------------------------------------------------------------------- list

  /** Header sub line: unread count. */
  private subLine(): string {
    const read = getSave().intelRead;
    const total = this.defs.length;
    const unread = this.defs.filter((d) => !read.includes(d.id)).length;
    if (total === 0) return 'NO MESSAGES';
    return unread > 0 ? `${unread} UNREAD OF ${total}` : `${total} MESSAGES - ALL READ`;
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

  private buildList(width: number, height: number): void {
    const avail = height - this.top - 16 - 32 - 12 - 16;
    const rows = Math.max(3, Math.min(this.defs.length, Math.floor(avail / ROW_H)));
    const box = this.add.container(0, 0);
    box.add(panel(this, 10, this.top, width - 20, rows * ROW_H + 16, 'raised'));
    this.list = new ScrollMenu(this, {
      x: 26, y: this.top + 8, width: width - 44, items: this.items(), visibleRows: rows, rowHeight: ROW_H, size: 'm',
      onSelect: (i) => this.open(i),
      onFocus: (_i, it) => this.status.setText(it.help ?? ''),
    });
    box.add(this.list.container);
    this.listBox = box;
    const first = this.defs[0];
    if (first) this.status.setText(`FROM: ${first.from.toUpperCase()}`);
  }

  private buildEmpty(width: number, height: number): void {
    const h = Math.min(170, height - this.top - 80);
    panel(this, 10, this.top, width - 20, h, 'inset');
    scanlines(this, 12, this.top + 2, width - 24, h - 4, 0.18);
    const cy = this.top + 26;
    if (this.textures.exists('ui_icon_intel')) this.add.image(width / 2, cy, 'ui_icon_intel').setScale(2).setAlpha(0.6);
    text(this, width / 2, cy + 22, 'NO TRANSMISSIONS YET', { size: 'm', color: COLORS.teal, originX: 0.5 });
    text(this, width / 2, cy + 42, wrapText('Some missions hide encrypted data caches. Shoot down the courier ships that carry them to intercept enemy transmissions.', width - 56, 's'), {
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
      this.subText?.setText(this.subLine());
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
    const { width, height } = this.scale.gameSize;
    const x = 10;
    const y = this.top;
    const w = width - 20;
    const h = height - y - 16 - 46;
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
    c.add(scanlines(this, x + 2, y + 2, w - 4, h - 4, 0.2));
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

    const by = height - 16 - 34;
    const bw = 92;
    const prev = button(this, x, by, bw, 26, '< PREV', () => this.step(-1), { size: 'm', color: COLORS.teal });
    const list = button(this, Math.round((width - bw) / 2), by, bw, 26, 'INBOX', () => this.closeReader(), { size: 'm', color: COLORS.accentLight });
    const next = button(this, x + w - bw, by, bw, 26, 'NEXT >', () => this.step(1), { size: 'm', color: COLORS.teal });
    prev.setEnabled(this.readIdx > 0);
    next.setEnabled(this.readIdx < this.defs.length - 1);
    c.add([prev.container, list.container, next.container]);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 160 });
    this.reader = c;
    this.status.setText('TAP THE SCREEN TO SKIP - LEFT / RIGHT TO BROWSE');
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
    goto(this, SCENES.Hangar);
  }
}
