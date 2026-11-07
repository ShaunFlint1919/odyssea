// =====================================================================================
//  META SCREENS — chrome helpers specific to the hangar / shop / specs / map screens:
//  feedback toasts and the unread counter badge. The screen frame (header strip, spacing
//  grid, depths, backdrop, credits readout) and the generic decor (section labels, corner
//  brackets, scanlines) come from src/ui/widgets and are re-exported here for convenience.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS } from '../../config';
import * as kit from '../kit';
import { LAYOUT, MD } from '../widgets/screen';
import { META } from './art';

export { MD };
export { cornerBrackets, sectionLabel } from '../widgets/decor';

/** Header strip height (content starts below it). */
export const HEADER_H = LAYOUT.headerH;

// ------------------------------------------------------------------------- feedback

const activeToast = new WeakMap<Phaser.Scene, Phaser.GameObjects.Container>();

/** Short centred feedback banner ("NOT ENOUGH CREDITS", "INSTALLED"...) at height y. */
export function toast(scene: Phaser.Scene, msg: string, color: number, y?: number, sub?: string): void {
  const { width, height } = scene.scale.gameSize;
  activeToast.get(scene)?.destroy();
  const good = color === COLORS.good || color === COLORS.teal;
  const tw = Math.max(kit.measure(scene, msg, 'm'), sub ? kit.measure(scene, sub, 's') : 0);
  const w = Math.min(width - 16, Math.max(170, tw + 52));
  const h = sub ? 38 : 28;
  const cy = Math.round(y ?? height / 2);
  const c = scene.add.container(Math.round(width / 2), cy).setDepth(MD.toast);
  c.add(scene.add.image(0, 0, META.glow).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setDisplaySize(w + 40, h + 30));
  c.add(kit.panel(scene, -w / 2, -h / 2, w, h, 'raised'));
  const g = scene.add.graphics();
  g.lineStyle(1, color, 0.9).strokeRect(-w / 2 + 2.5, -h / 2 + 2.5, w - 5, h - 5);
  g.fillStyle(color, 1).fillRect(-w / 2 + 3, -h / 2 + 3, 4, h - 6);
  c.add(g);
  // status glyph
  const gx = -w / 2 + 18;
  if (good && scene.textures.exists(META.tick)) c.add(scene.add.image(gx, 0, META.tick));
  else c.add(kit.text(scene, gx, 0, '!', { size: 'm', color, originX: 0.5, originY: 0.5 }));
  const tx = 8;
  c.add(kit.text(scene, tx, sub ? -7 : 0, msg, { size: 'm', color, originX: 0.5, originY: 0.5 }));
  if (sub) c.add(kit.text(scene, tx, 8, kit.fit(sub, w - 44, 's'), { size: 's', color: COLORS.text, originX: 0.5, originY: 0.5 }));
  c.setScale(0.7, 0.3).setAlpha(0);
  activeToast.set(scene, c);
  scene.tweens.add({ targets: c, scaleX: 1, scaleY: 1, alpha: 1, duration: 130, ease: 'Back.Out' });
  scene.tweens.add({
    targets: c, alpha: 0, y: cy - 8, delay: 1100, duration: 260,
    onComplete: () => { if (activeToast.get(scene) === c) activeToast.delete(scene); c.destroy(); },
  });
}

/** A small pulsing magenta bubble with a number (unread counters). (x, y) = centre. */
export function countBadge(scene: Phaser.Scene, x: number, y: number, n: number, depth: number = MD.float): Phaser.GameObjects.Container {
  const c = scene.add.container(Math.round(x), Math.round(y)).setDepth(depth);
  const label = n > 99 ? '99+' : String(n);
  const w = Math.max(14, label.length * 6 + 8);
  const g = scene.add.graphics();
  g.fillStyle(0x0a0810, 1).fillRoundedRect(-w / 2 - 1, -7, w + 2, 14, 6);
  g.fillStyle(COLORS.accent, 1).fillRoundedRect(-w / 2, -6, w, 12, 5);
  g.fillStyle(COLORS.accentLight, 0.7).fillRect(-w / 2 + 3, -5, w - 6, 1);
  c.add(g);
  c.add(kit.text(scene, 0, 0, label, { size: 's', color: 0xffffff, originX: 0.5, originY: 0.5 }));
  scene.tweens.add({ targets: c, scale: 1.15, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  return c;
}
