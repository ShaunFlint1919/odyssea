// =====================================================================================
//  TOGGLE — ON/OFF switch for settings rows: a recessed track with a sliding neon knob and
//  an ON/OFF caption. The hit area is 22 px tall (touch friendly).
// =====================================================================================
import Phaser from 'phaser';
import { COLORS } from '../../config';
import { audio } from '../../audio';
import { inputBlocked, text } from '../kit';

export interface ToggleOpts {
  depth?: number;
  labels?: [string, string];   // [off, on] captions (default OFF / ON)
  onTouch?: () => void;        // any pointer interaction (e.g. focus the owning menu row)
}

/** Track 30x12 + caption; (x, y) = top-left of the 22 px tall hit area. */
export class Toggle {
  readonly container: Phaser.GameObjects.Container;
  /** Total width of the widget in px (track + caption). */
  readonly width: number;
  private v: boolean;
  private focused = false;
  private readonly track: Phaser.GameObjects.Graphics;
  private readonly knob: Phaser.GameObjects.Graphics;
  private readonly caption: Phaser.GameObjects.BitmapText;
  private readonly labels: [string, string];
  private static readonly TW = 30;
  private static readonly TH = 12;

  constructor(
    private readonly scene: Phaser.Scene, x: number, y: number, value: boolean,
    private readonly onChange: (v: boolean) => void, opts: ToggleOpts = {},
  ) {
    this.v = value;
    this.labels = opts.labels ?? ['OFF', 'ON'];
    this.container = scene.add.container(Math.round(x), Math.round(y));
    if (opts.depth !== undefined) this.container.setDepth(opts.depth);
    const ty = 11 - Toggle.TH / 2;
    this.track = scene.add.graphics({ x: 0, y: ty });
    this.knob = scene.add.graphics({ x: this.knobX(value), y: ty });
    const capW = Math.max(this.labels[0].length, this.labels[1].length) * 6;
    this.caption = text(scene, Toggle.TW + 5, 11, '', { size: 's', originY: 0.5 });
    this.width = Toggle.TW + 5 + capW;
    const zone = scene.add.zone(-4, 0, this.width + 8, 22).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      if (inputBlocked(scene)) return;
      audio.unlock();
      opts.onTouch?.();
      this.toggle();
    });
    this.container.add([this.track, this.knob, this.caption, zone]);
    this.container.setSize(this.width, 22);
    this.redraw();
  }

  get value(): boolean { return this.v; }

  /** Set the state (animated knob); calls onChange only when `emit`. */
  setValue(v: boolean, emit = false): void {
    if (v === this.v) return;
    this.v = v;
    this.scene.tweens.killTweensOf(this.knob);
    this.scene.tweens.add({ targets: this.knob, x: this.knobX(v), duration: 110, ease: 'Quad.easeOut' });
    this.redraw();
    if (emit) this.onChange(v);
  }

  /** Flip the state with sound + onChange. */
  toggle(): void {
    this.setValue(!this.v, true);
    audio.sfx('ui_select');
  }

  /** Brighter rendering when the owning row has the focus. */
  setFocused(f: boolean): void {
    if (f === this.focused) return;
    this.focused = f;
    this.redraw();
  }

  destroy(): void {
    if (this.container.scene) this.container.destroy();
  }

  private knobX(v: boolean): number {
    return v ? Toggle.TW - 13 : 1;
  }

  private redraw(): void {
    const { TW, TH } = Toggle;
    const on = this.v;
    const t = this.track;
    t.clear();
    t.fillStyle(0x0a0810, 1).fillRect(1, 0, TW - 2, TH).fillRect(0, 1, TW, TH - 2);
    t.fillStyle(on ? 0x0b3a36 : COLORS.panelDark, 1).fillRect(1, 1, TW - 2, TH - 2);
    if (on) {
      t.fillStyle(COLORS.tealDark, 1).fillRect(3, 3, TW - 17, TH - 6);
    }
    t.lineStyle(1, on ? COLORS.teal : COLORS.panelLight, this.focused ? 1 : 0.7);
    t.strokeRect(0.5, 0.5, TW - 1, TH - 1);
    const k = this.knob;
    k.clear();
    const kc = on ? COLORS.teal : 0x8a84a0;
    k.fillStyle(0x0a0810, 1).fillRect(0, 1, 12, TH - 2);
    k.fillStyle(kc, 1).fillRect(1, 2, 10, TH - 4);
    k.fillStyle(0xffffff, on ? 0.6 : 0.3).fillRect(1, 2, 10, 1);
    k.fillStyle(0x000000, 0.25).fillRect(5, 4, 1, TH - 8).fillRect(7, 4, 1, TH - 8);
    this.caption.setText(on ? this.labels[1] : this.labels[0]);
    this.caption.setTint(on ? (this.focused ? 0xc8fff4 : COLORS.teal) : this.focused ? COLORS.text : COLORS.textDim);
  }
}
