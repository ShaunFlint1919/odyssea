// =====================================================================================
//  TYPEWRITER — reveals bitmap text character by character (pre-wrapped so words never jump
//  lines), with short pauses on punctuation, a soft blip and a blinking block caret.
//  skip() reveals everything at once (tap / Enter in the owning scene).
// =====================================================================================
import Phaser from 'phaser';
import { COLORS } from '../../config';
import { audio } from '../../audio';
import { text, wrapText, lineHeight, type FontSize } from '../kit';

export interface TypewriterOpts {
  size?: FontSize;          // default 'm'
  color?: number;           // default COLORS.teal
  maxWidth?: number;        // wrap width in px (default: no wrap)
  cps?: number;             // characters per second (default 55)
  lineSpacing?: number;     // extra px between lines (default 3)
  depth?: number;
  sound?: boolean;          // blip every few characters (default true)
  caret?: boolean;          // blinking caret while typing (default true)
  onDone?: () => void;
}

export class Typewriter {
  readonly text: Phaser.GameObjects.BitmapText;
  private full = '';
  private shown = 0;
  private acc = 0;
  private hold = 0;
  private finished = true;
  private blip = 0;
  private readonly caret: Phaser.GameObjects.Rectangle | null;
  private readonly onUpdate: (t: number, dt: number) => void;
  private readonly onShutdown = () => this.destroy();
  private readonly size: FontSize;
  private readonly cell: number;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number, str: string, private readonly opts: TypewriterOpts = {}) {
    this.size = opts.size ?? 'm';
    this.cell = this.size === 's' ? 6 : this.size === 'm' ? 8 : 12;
    this.text = text(scene, x, y, '', { size: this.size, color: opts.color ?? COLORS.teal, depth: opts.depth });
    this.text.setLineSpacing(opts.lineSpacing ?? 3);
    this.caret = opts.caret === false ? null
      : scene.add.rectangle(x, y, Math.max(2, this.cell - 2), lineHeight(this.size) - 2, opts.color ?? COLORS.teal, 0.9).setOrigin(0);
    if (this.caret && opts.depth !== undefined) this.caret.setDepth(opts.depth);
    this.onUpdate = (_t, dt) => this.tick(dt);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown);
    this.start(str);
  }

  /** True once every character is visible. */
  get done(): boolean { return this.finished; }

  /** The complete (wrapped) text. */
  get fullText(): string { return this.full; }

  /** Height in px of the complete text once revealed. */
  get fullHeight(): number {
    const lines = this.full.split('\n').length;
    return lines * lineHeight(this.size) + (lines - 1) * (this.opts.lineSpacing ?? 3);
  }

  /** (Re)start typing `str`. */
  start(str: string): void {
    this.full = this.opts.maxWidth ? wrapText(str, this.opts.maxWidth, this.size) : str;
    this.shown = 0;
    this.acc = 0;
    this.hold = 120;
    this.finished = this.full.length === 0;
    this.text.setText('');
    this.placeCaret();
    if (this.finished) this.opts.onDone?.();
  }

  /** Reveal everything immediately (fires onDone once). */
  skip(): void {
    if (this.finished) return;
    this.shown = this.full.length;
    this.text.setText(this.full);
    this.complete();
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.onUpdate);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown);
    if (this.caret?.scene) this.caret.destroy();
    if (this.text.scene) this.text.destroy();
  }

  private complete(): void {
    this.finished = true;
    this.placeCaret();
    this.opts.onDone?.();
  }

  private tick(dt: number): void {
    if (this.finished) return;
    if (this.caret) this.caret.setVisible(Math.floor(this.scene.time.now / 260) % 2 === 0);
    if (this.hold > 0) { this.hold -= dt; return; }
    this.acc += (dt / 1000) * (this.opts.cps ?? 55);
    let changed = false;
    while (this.acc >= 1 && this.shown < this.full.length) {
      this.acc -= 1;
      const ch = this.full[this.shown++];
      changed = true;
      if (ch === '.' || ch === '!' || ch === '?') { this.hold = 160; this.acc = 0; break; }
      if (ch === ',' || ch === ':' || ch === ';') { this.hold = 70; this.acc = 0; break; }
      if (ch !== ' ' && ch !== '\n' && this.opts.sound !== false && ++this.blip % 3 === 0) {
        audio.sfx('ui_move', { volume: 0.25, pitch: 1.6 + Math.random() * 0.3 });
      }
    }
    if (changed) {
      this.text.setText(this.full.slice(0, this.shown));
      this.placeCaret();
    }
    if (this.shown >= this.full.length) this.complete();
  }

  private placeCaret(): void {
    if (!this.caret) return;
    if (this.finished) { this.caret.setVisible(false).setActive(false); return; }
    const shownText = this.full.slice(0, this.shown);
    const lines = shownText.split('\n');
    const last = lines[lines.length - 1] ?? '';
    const lh = lineHeight(this.size) + (this.opts.lineSpacing ?? 3);
    this.caret.setPosition(this.text.x + last.length * this.cell, this.text.y + (lines.length - 1) * lh + 1);
  }
}
