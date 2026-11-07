// =====================================================================================
//  SLIDER — segmented value slider for settings rows: [<] ▮▮▮▮▮▯▯▯ 80% [>].
//  Touch: tap the arrows, or tap / drag on the pips. Keyboard: the owning scene calls step().
//  The whole widget is >= 22 px tall so every part is a comfortable touch target.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS } from '../../config';
import { audio } from '../../audio';
import { inputBlocked, text } from '../kit';

export interface SliderOpts {
  x: number;                       // top-left
  y: number;
  width: number;                   // total width (arrows + pips + value label)
  height?: number;                 // default 22
  min: number;
  max: number;
  step: number;
  value: number;
  format?: (v: number) => string;  // value label (default: percentage of the range)
  valueWidth?: number;             // px reserved for the label (default 32)
  depth?: number;
  onChange: (v: number) => void;
  onTouch?: () => void;            // any pointer interaction (e.g. focus the owning menu row)
}

type Glyph = Phaser.GameObjects.Image | Phaser.GameObjects.BitmapText;

export class Slider {
  readonly container: Phaser.GameObjects.Container;
  private v: number;
  private readonly n: number;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.BitmapText;
  private readonly arrowL: Glyph;
  private readonly arrowR: Glyph;
  private readonly barX: number;
  private readonly barW: number;
  private readonly h: number;
  private focused = false;
  private dragging = false;
  private readonly onMove: (p: Phaser.Input.Pointer) => void;
  private readonly onUp: () => void;

  constructor(private readonly scene: Phaser.Scene, private readonly opts: SliderOpts) {
    this.h = Math.max(22, opts.height ?? 22);
    this.n = Math.max(1, Math.round((opts.max - opts.min) / opts.step));
    this.v = this.snap(opts.value);
    const w = Math.round(opts.width);
    const valueW = opts.valueWidth ?? 32;
    const midY = Math.round(this.h / 2);
    this.container = scene.add.container(Math.round(opts.x), Math.round(opts.y));
    if (opts.depth !== undefined) this.container.setDepth(opts.depth);

    const mk = (tex: string, ch: string, x: number): Glyph => (scene.textures.exists(tex)
      ? scene.add.image(x, midY, tex).setOrigin(0.5)
      : text(scene, x, midY, ch, { size: 'm', color: COLORS.teal, originX: 0.5, originY: 0.5 }));
    this.arrowL = mk('ui_arrow_l', '<', 6);
    this.arrowR = mk('ui_arrow_r', '>', w - 6);
    this.barX = 16;
    this.barW = Math.max(this.n * 3, w - 16 - 16 - valueW - 4);
    this.g = scene.add.graphics();
    this.label = text(scene, w - 16, midY, '', { size: 's', color: COLORS.text, originX: 1, originY: 0.5 });
    this.container.add([this.g, this.arrowL, this.arrowR, this.label]);

    const zl = scene.add.zone(-4, 0, 22, this.h).setOrigin(0).setInteractive({ useHandCursor: true });
    const zr = scene.add.zone(w - 18, 0, 22, this.h).setOrigin(0).setInteractive({ useHandCursor: true });
    const zb = scene.add.zone(this.barX - 2, 0, this.barW + 4, this.h).setOrigin(0).setInteractive({ useHandCursor: true });
    zl.on('pointerdown', () => { if (inputBlocked(scene)) return; audio.unlock(); opts.onTouch?.(); this.step(-1); });
    zr.on('pointerdown', () => { if (inputBlocked(scene)) return; audio.unlock(); opts.onTouch?.(); this.step(1); });
    zb.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (inputBlocked(scene)) return;
      audio.unlock();
      opts.onTouch?.();
      this.dragging = true;
      this.fromPointer(p);
    });
    this.container.add([zl, zr, zb]);
    this.onMove = (p: Phaser.Input.Pointer) => { if (this.dragging && p.isDown) this.fromPointer(p); };
    this.onUp = () => { this.dragging = false; };
    scene.input.on('pointermove', this.onMove);
    scene.input.on('pointerup', this.onUp);
    scene.input.on('pointerupoutside', this.onUp);
    this.container.once(Phaser.GameObjects.Events.DESTROY, () => this.unbind());
    this.redraw();
  }

  /** Current value (snapped to the step). */
  get value(): number { return this.v; }

  /** Set the value (snapped and clamped); calls onChange only when `emit`. */
  setValue(v: number, emit = false): void {
    const nv = this.snap(v);
    if (nv === this.v) return;
    this.v = nv;
    this.redraw();
    if (emit) this.opts.onChange(nv);
  }

  /** One step left (-1) or right (+1) with sound + onChange; error blip at the limits. */
  step(dir: -1 | 1): void {
    const before = this.v;
    this.setValue(this.v + dir * this.opts.step, true);
    const a = dir < 0 ? this.arrowL : this.arrowR;
    const x0 = dir < 0 ? 6 : Math.round(this.opts.width) - 6;
    this.scene.tweens.killTweensOf(a);
    a.x = x0 + dir * 2;
    this.scene.tweens.add({ targets: a, x: x0, duration: 110, ease: 'Quad.easeOut' });
    audio.sfx(this.v === before ? 'ui_error' : 'ui_move');
  }

  /** Brighter rendering when the owning row has the focus. */
  setFocused(f: boolean): void {
    if (f === this.focused) return;
    this.focused = f;
    this.redraw();
  }

  destroy(): void {
    this.unbind();
    if (this.container.scene) this.container.destroy();
  }

  private unbind(): void {
    this.scene.input.off('pointermove', this.onMove);
    this.scene.input.off('pointerup', this.onUp);
    this.scene.input.off('pointerupoutside', this.onUp);
  }

  private snap(v: number): number {
    const { min, max, step } = this.opts;
    const k = Math.round((Phaser.Math.Clamp(v, min, max) - min) / step);
    return Math.round((min + k * step) * 1000) / 1000;
  }

  private fromPointer(p: Phaser.Input.Pointer): void {
    const local = p.x - this.worldX() - this.barX;
    const t = Phaser.Math.Clamp(local / this.barW, 0, 1);
    const before = this.v;
    this.setValue(this.opts.min + Math.round(t * this.n) * this.opts.step, true);
    if (this.v !== before) audio.sfx('ui_move');
  }

  private worldX(): number {
    let x = this.container.x;
    let parent = this.container.parentContainer;
    while (parent) { x += parent.x; parent = parent.parentContainer; }
    return x;
  }

  private redraw(): void {
    const g = this.g;
    g.clear();
    const n = this.n;
    const gap = 1;
    const pw = Math.max(2, Math.floor((this.barW - gap * (n - 1)) / n));
    const used = pw * n + gap * (n - 1);
    const x0 = this.barX + Math.floor((this.barW - used) / 2);
    const ph = 8;
    const y0 = Math.round(this.h / 2) - ph / 2;
    const filled = Math.round((this.v - this.opts.min) / this.opts.step);
    const lit = this.focused ? 1 : 0.8;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (pw + gap);
      if (i < filled) {
        const t = n <= 1 ? 1 : i / (n - 1);
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.IntegerToColor(COLORS.tealDark), Phaser.Display.Color.IntegerToColor(COLORS.teal), 100, Math.round(35 + t * 65),
        );
        const col = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
        g.fillStyle(i === filled - 1 ? (this.focused ? 0xc8fff4 : COLORS.teal) : col, lit);
        g.fillRect(x, y0, pw, ph);
        g.fillStyle(0xffffff, 0.25 * lit);
        g.fillRect(x, y0, pw, 1);
      } else {
        g.fillStyle(COLORS.panelDark, 1);
        g.fillRect(x, y0, pw, ph);
        g.lineStyle(1, COLORS.panelLight, this.focused ? 0.9 : 0.6);
        g.strokeRect(x + 0.5, y0 + 0.5, pw - 1, ph - 1);
      }
    }
    const fmt = this.opts.format ?? ((v: number) => `${Math.round(((v - this.opts.min) / (this.opts.max - this.opts.min)) * 100)}%`);
    this.label.setText(fmt(this.v));
    this.label.setTint(this.focused ? 0xffffff : COLORS.text);
    this.arrowL.setAlpha(this.focused ? 1 : 0.5);
    this.arrowR.setAlpha(this.focused ? 1 : 0.5);
  }
}
