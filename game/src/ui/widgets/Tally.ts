// =====================================================================================
//  TALLY — animated number counter (ease-out roll-up with tick sounds) for result screens.
//  skip() jumps to the final value. The text keeps its origin, so right-aligned tallies grow
//  to the left.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS } from '../../config';
import { audio } from '../../audio';
import type { SfxKey } from '../../types';
import { text, type FontSize } from '../kit';
import { fmtInt } from './util';

export interface TallyOpts {
  to: number;
  from?: number;             // default 0
  duration?: number;         // ms (default: 350..1100 depending on the magnitude)
  size?: FontSize;           // default 'm'
  color?: number;            // default COLORS.text
  originX?: number;          // default 1 (right-aligned)
  originY?: number;          // default 0.5
  format?: (n: number) => string;   // default thousands separators
  sound?: SfxKey | null;     // tick sound while counting (default ui_move); null = silent
  depth?: number;
  autoStart?: boolean;       // default false: call start()
  onDone?: () => void;
}

export class Tally {
  readonly text: Phaser.GameObjects.BitmapText;
  private cur: number;
  private elapsed = 0;
  private running = false;
  private finished = false;
  private tickAcc = 0;
  private readonly dur: number;
  private readonly onUpdate: (t: number, dt: number) => void;
  private readonly onShutdown = () => this.unbind();

  constructor(private readonly scene: Phaser.Scene, x: number, y: number, private readonly opts: TallyOpts) {
    this.cur = opts.from ?? 0;
    const span = Math.abs(opts.to - this.cur);
    this.dur = opts.duration ?? Phaser.Math.Clamp(350 + Math.log10(span + 1) * 180, 350, 1100);
    this.text = text(scene, x, y, this.fmt(this.cur), {
      size: opts.size ?? 'm', color: opts.color ?? COLORS.text, originX: opts.originX ?? 1, originY: opts.originY ?? 0.5, depth: opts.depth,
    });
    this.onUpdate = (_t, dt) => this.tick(dt);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown);
    if (opts.autoStart) this.start();
  }

  /** True once the final value is displayed. */
  get done(): boolean { return this.finished; }

  /** Currently displayed value. */
  get value(): number { return this.cur; }

  /** Start counting (no-op if already running or done). */
  start(): void {
    if (this.running || this.finished) return;
    if (this.opts.to === this.cur) { this.finish(); return; }
    this.running = true;
  }

  /** Jump to the final value (fires onDone once). */
  skip(): void {
    if (this.finished) return;
    this.finish();
  }

  destroy(): void {
    this.unbind();
    if (this.text.scene) this.text.destroy();
  }

  private unbind(): void {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.onUpdate);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown);
  }

  private fmt(n: number): string {
    return (this.opts.format ?? fmtInt)(Math.round(n));
  }

  private finish(): void {
    this.running = false;
    this.finished = true;
    this.cur = this.opts.to;
    this.text.setText(this.fmt(this.cur));
    this.opts.onDone?.();
  }

  private tick(dt: number): void {
    if (!this.running) return;
    this.elapsed += dt;
    const t = Math.min(1, this.elapsed / this.dur);
    const e = 1 - (1 - t) ** 3;
    const from = this.opts.from ?? 0;
    const next = from + (this.opts.to - from) * e;
    if (Math.round(next) !== Math.round(this.cur)) {
      this.cur = next;
      this.text.setText(this.fmt(next));
      this.tickAcc += dt;
      if (this.opts.sound !== null && this.tickAcc >= 55) {
        this.tickAcc = 0;
        audio.sfx(this.opts.sound ?? 'ui_move', { volume: 0.35, pitch: 1.2 + t * 0.6 });
      }
    }
    if (t >= 1) this.finish();
  }
}
