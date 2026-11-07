// =====================================================================================
//  META SCREENS — composite widgets built on the UI kit:
//   - TapGuard: makes a MenuList "tap to focus, tap again to select" (shop safety) while
//     keeping keyboard behaviour unchanged;
//   - PowerRow: weapon power control (left/right arrows, MAX_POWER pip gauge, next cost);
//   - compareGrid: N stat cells "LABEL / a > b +d" with green / red deltas.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, MAX_POWER } from '../../config';
import { audio } from '../../audio';
import * as kit from '../kit';
import { MD } from './chrome';
import { dec, fmt } from './common';

// ------------------------------------------------------------------------- tap guard

/**
 * Interactive zones laid over the rows of a MenuList (which never scrolls). A tap / click on
 * an unfocused row only focuses it; a tap on the focused row selects it (no hover focus, so
 * a purchase always takes a deliberate second tap). Keyboard handling stays with the MenuList.
 */
export class TapGuard {
  private zones: Phaser.GameObjects.Zone[] = [];
  private pressed = -1;
  private wasFocused = false;
  private on = true;

  constructor(
    private readonly scene: Phaser.Scene, private readonly list: kit.MenuList,
    private readonly x: number, private readonly y: number, private readonly w: number, private readonly rowH: number,
    count: number, depth: number,
  ) {
    for (let i = 0; i < count; i++) {
      const z = scene.add.zone(x, y + i * rowH, w, rowH).setOrigin(0).setDepth(depth).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        if (!this.enabled()) return;
        audio.unlock();
        this.pressed = i;
        this.wasFocused = this.list.index === i;
        this.list.setIndex(i);
      });
      z.on('pointerup', () => {
        if (!this.enabled() || this.pressed !== i) return;
        this.pressed = -1;
        if (this.wasFocused) this.list.select();
      });
      z.on('pointerout', () => { if (this.pressed === i) this.pressed = -1; });
      this.zones.push(z);
    }
  }

  private enabled(): boolean {
    return this.on && this.list.container.active && this.list.container.visible;
  }

  /** Enable / disable the tap zones (mirror MenuList.setEnabled). */
  setEnabled(on: boolean): void {
    this.on = on;
    if (!on) this.pressed = -1;
  }

  destroy(): void {
    this.zones.forEach((z) => z.destroy());
    this.zones = [];
  }
}

// ------------------------------------------------------------------------- power row

export interface PowerRowState {
  /** Weapon name (null = empty slot). */
  name: string | null;
  power: number;
  /** Cost of the next level (ignored at MAX_POWER). */
  next: number;
  /** Refund of the last level (power > 1). */
  refund: number;
  credits: number;
}

/** "POWER  [<] ##########  [>]  P3   NEXT 900" control for the equipped front / rear gun. */
export class PowerRow {
  readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly pips: Phaser.GameObjects.Graphics;
  private readonly nextPip: Phaser.GameObjects.Rectangle;
  private readonly lvl: Phaser.GameObjects.BitmapText;
  private readonly cost: Phaser.GameObjects.BitmapText;
  private readonly costLabel: Phaser.GameObjects.BitmapText;
  private readonly left: Phaser.GameObjects.Container;
  private readonly right: Phaser.GameObjects.Container;
  private readonly flashG: Phaser.GameObjects.Rectangle;
  private readonly px: number;
  private readonly py: number;
  private readonly pw: number;
  private readonly ph: number;
  private readonly step: number;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number, w: number, h: number, onChange: (delta: 1 | -1) => void) {
    const d = MD.content;
    const p = kit.panel(scene, x, y, w, h, 'inset').setDepth(MD.panel);
    const cy = Math.round(y + h / 2);
    const label = kit.text(scene, x + 8, cy, 'POWER', { size: 's', color: COLORS.accent, originY: 0.5, depth: d });
    const arrowL = scene.textures.exists('ui_arrow_l') ? 'ui_arrow_l' : '';
    const arrowR = scene.textures.exists('ui_arrow_r') ? 'ui_arrow_r' : '';
    this.left = kit.iconButton(scene, x + 54, cy, arrowL, () => onChange(-1), 22, d);
    // pips: MAX_POWER cells between the arrows
    this.step = 10;
    this.pw = 8;
    this.ph = 10;
    this.px = x + 70;
    this.py = cy - this.ph / 2;
    const gw = MAX_POWER * this.step - 2;
    this.pips = scene.add.graphics().setDepth(d);
    this.nextPip = scene.add.rectangle(0, this.py, this.pw, this.ph, COLORS.gold, 0.9).setOrigin(0).setDepth(d).setVisible(false);
    scene.tweens.add({ targets: this.nextPip, alpha: 0.15, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.flashG = scene.add.rectangle(this.px - 2, this.py - 2, gw + 4, this.ph + 4, COLORS.teal, 0).setOrigin(0).setDepth(d).setBlendMode(Phaser.BlendModes.ADD);
    this.right = kit.iconButton(scene, this.px + gw + 15, cy, arrowR, () => onChange(1), 22, d);
    if (!arrowL) this.left.add(kit.text(scene, 0, 0, '<', { size: 'm', color: COLORS.teal, originX: 0.5, originY: 0.5 }));
    if (!arrowR) this.right.add(kit.text(scene, 0, 0, '>', { size: 'm', color: COLORS.teal, originX: 0.5, originY: 0.5 }));
    this.lvl = kit.text(scene, this.px + gw + 32, cy, 'P1', { size: 'm', color: COLORS.teal, originY: 0.5, depth: d });
    this.costLabel = kit.text(scene, x + w - 8, cy - 5, 'NEXT', { size: 's', color: COLORS.textDim, originX: 1, originY: 0.5, depth: d });
    this.cost = kit.text(scene, x + w - 8, cy + 5, '', { size: 's', color: COLORS.gold, originX: 1, originY: 0.5, depth: d });
    this.objects.push(p, label, this.left, this.pips, this.nextPip, this.flashG, this.right, this.lvl, this.costLabel, this.cost);
  }

  private drawPips(power: number, has: boolean): void {
    const g = this.pips;
    g.clear();
    for (let i = 0; i < MAX_POWER; i++) {
      const x = this.px + i * this.step;
      const on = has && i < power;
      g.fillStyle(0x0a0810, 1).fillRect(x - 1, this.py - 1, this.pw + 2, this.ph + 2);
      if (on) {
        const hot = i >= 7;
        g.fillStyle(hot ? COLORS.accent : COLORS.teal, 1).fillRect(x, this.py, this.pw, this.ph);
        g.fillStyle(0xffffff, 0.45).fillRect(x, this.py, this.pw, 2);
        g.fillStyle(hot ? 0x6a1e8a : COLORS.tealDark, 1).fillRect(x, this.py + this.ph - 2, this.pw, 2);
      } else {
        g.fillStyle(0x24202e, 1).fillRect(x, this.py, this.pw, this.ph);
        g.fillStyle(0x3a3550, 1).fillRect(x, this.py, this.pw, 1);
      }
    }
  }

  /** Refresh the display. */
  set(s: PowerRowState): void {
    const has = s.name !== null;
    this.drawPips(s.power, has);
    this.lvl.setText(has ? `P${s.power}` : '--').setTint(has ? COLORS.teal : COLORS.textDim);
    this.left.setAlpha(has && s.power > 1 ? 1 : 0.35);
    const canUp = has && s.power < MAX_POWER;
    this.nextPip.setVisible(canUp);
    if (canUp) this.nextPip.setX(this.px + s.power * this.step).setFillStyle(s.next <= s.credits ? COLORS.gold : COLORS.bad, 0.9);
    if (!has) {
      this.right.setAlpha(0.35);
      this.costLabel.setText('NO GUN');
      this.cost.setText('');
      return;
    }
    if (!canUp) {
      this.right.setAlpha(0.35);
      this.costLabel.setText('POWER');
      this.cost.setText('MAXED').setTint(COLORS.teal);
      return;
    }
    this.right.setAlpha(1);
    this.costLabel.setText('NEXT');
    this.cost.setText(fmt(s.next)).setTint(s.next <= s.credits ? COLORS.gold : COLORS.bad);
  }

  /** Flash the pips after a change. */
  pulse(up: boolean): void {
    this.flashG.setFillStyle(up ? COLORS.teal : COLORS.accent, 0.55);
    this.scene.tweens.add({ targets: this.flashG, fillAlpha: 0, duration: 280 });
  }

  destroy(): void {
    this.scene.tweens.killTweensOf([this.nextPip, this.flashG]);
    this.objects.forEach((o) => o.destroy());
    this.objects.length = 0;
  }
}

// ------------------------------------------------------------------------- compare grid

export interface CompareCell {
  label: string;
  /** Current value (null: no comparison, show only `next`). */
  cur: number | null;
  next: number;
  /** +1: higher is better, -1: lower is better, 0: neutral. */
  better: 1 | -1 | 0;
  digits?: number;
  suffix?: string;
}

/**
 * Row of stat cells: label (dim) above "cur>next" and a coloured delta. Returns the created
 * objects (the caller destroys them).
 */
export function compareGrid(scene: Phaser.Scene, x: number, y: number, w: number, cells: CompareCell[], depth: number = MD.content): Phaser.GameObjects.GameObject[] {
  const out: Phaser.GameObjects.GameObject[] = [];
  if (cells.length === 0) return out;
  const cw = Math.floor(w / cells.length);
  cells.forEach((c, i) => {
    const cx = x + i * cw;
    out.push(kit.text(scene, cx, y, c.label, { size: 's', color: COLORS.textDim, depth }));
    const digits = c.digits ?? 1;
    const nextStr = `${dec(c.next, digits)}${c.suffix ?? ''}`;
    let tx = cx;
    if (c.cur !== null && Math.abs(c.cur - c.next) > 1e-6) {
      const curT = kit.text(scene, tx, y + 10, `${dec(c.cur, digits)}>`, { size: 's', color: COLORS.textDim, depth });
      out.push(curT);
      tx += curT.width;
    }
    const delta = c.cur === null ? 0 : c.next - c.cur;
    const good = c.better === 0 || Math.abs(delta) < 1e-6 ? null : (delta > 0) === (c.better > 0);
    const nT = kit.text(scene, tx, y + 10, nextStr, { size: 's', color: good === null ? COLORS.text : good ? COLORS.good : COLORS.bad, depth });
    out.push(nT);
    if (good !== null) {
      const dT = kit.text(scene, tx + nT.width + 3, y + 10, `${delta > 0 ? '+' : ''}${dec(delta, digits)}`, { size: 's', color: good ? COLORS.good : COLORS.bad, depth });
      if (dT.x + dT.width <= cx + cw - 2) out.push(dT); else dT.destroy();
    }
  });
  return out;
}
