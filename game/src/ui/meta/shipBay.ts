// =====================================================================================
//  SHIP BAY — the framed hangar "screen" showing the equipped ship: hull (frame 0, integer
//  scale, nearest filtering) hovering over a lit landing pad, animated engine flames, a
//  glowing shield arc tinted with the shield colour, the sidekicks on each side (or empty
//  slot markers) and optional armor / shield mini gauges. Rebuilt by setLoadout().
// =====================================================================================
import Phaser from 'phaser';
import { COLORS } from '../../config';
import { ANIM, hullKey, sidekickKey } from '../../art/keys';
import { idleAnimKey } from '../../art/fx';
import { HULL_MOUNTS } from '../../art/player';
import type { Loadout } from '../../types';
import * as kit from '../kit';
import { META, bayBackdrop, ensureMetaArt, shieldArcKey, shieldArcOriginY } from './art';
import { catalogMax, findHull, findShield, findSidekick, shotGlow, upper } from './common';
import { cornerBrackets, scanlines } from './chrome';

export interface ShipBayOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  depth?: number;
  /** Armor / shield side gauges (default true). */
  gauges?: boolean;
  /** Hull name plate at the bottom (default true). */
  nameplate?: boolean;
  /** Hull integer scale (default 3 when h >= 150, else 2). */
  scale?: number;
  /** Small tag in the top-left corner. */
  tag?: string;
  /** Draw the inset frame (default true). */
  frame?: boolean;
  /** Show the sidekicks / empty mounts (default true). */
  sidekicks?: boolean;
  /** Full shield bubble around the hull in the shield colour (default false). */
  bubble?: boolean;
}

const engineCache = new Map<string, { x: number; y: number }[]>();

/**
 * Engine nozzles of a hull texture frame, in unscaled px relative to the sprite centre:
 * x = centre of a run of warm (engine glow) pixels in the lower half — or of the bottom-most
 * opaque pixels when the art has no warm pixels — and y = first transparent row below it.
 */
export function enginePoints(scene: Phaser.Scene, key: string, frame?: string | number): { x: number; y: number }[] {
  const cacheKey = `${key}#${frame ?? ''}`;
  const hit = engineCache.get(cacheKey);
  if (hit) return hit;
  let out: { x: number; y: number }[] = [];
  let w = 32, h = 32;
  try {
    const tex = scene.textures.get(key);
    const fr = frame !== undefined && tex.has(String(frame)) ? tex.get(frame) : tex.get();
    const src = fr.source.image as HTMLCanvasElement | HTMLImageElement;
    w = fr.cutWidth; h = fr.cutHeight;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(src, fr.cutX, fr.cutY, w, h, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const opaque = (x: number, y: number) => data[(y * w + x) * 4 + 3] > 120;
    const warm = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      return data[i + 3] > 120 && data[i] > 190 && data[i + 1] > 60 && data[i + 1] < 235 && data[i + 2] < 100;
    };
    const runs = (xs: number[]): [number, number][] => {
      const sorted = [...new Set(xs)].sort((a, b) => a - b);
      const res: [number, number][] = [];
      for (const x of sorted) {
        const last = res[res.length - 1];
        if (last && x === last[1] + 1) last[1] = x;
        else res.push([x, x]);
      }
      return res;
    };
    const xs: number[] = [];
    for (let y = Math.floor(h * 0.55); y < h; y++) for (let x = 0; x < w; x++) if (warm(x, y)) xs.push(x);
    let rs = runs(xs).filter(([a, b]) => Math.abs((a + b + 1) / 2 - w / 2) < w * 0.36);
    if (rs.length === 0) {
      let yb = h - 1;
      const rowHas = (y: number) => { for (let x = 0; x < w; x++) if (opaque(x, y)) return true; return false; };
      while (yb > 0 && !rowHas(yb)) yb--;
      const bx: number[] = [];
      for (let x = 0; x < w; x++) if (opaque(x, yb) || opaque(x, Math.max(0, yb - 1))) bx.push(x);
      rs = runs(bx).filter(([a, b]) => Math.abs((a + b + 1) / 2 - w / 2) < w * 0.3);
    }
    if (rs.length > 3) rs = [rs[0], rs[rs.length - 1]];
    out = rs.map(([a, b]) => {
      let yb = 0;
      for (let x = a; x <= b; x++) for (let y = h - 1; y >= 0; y--) if (opaque(x, y)) { yb = Math.max(yb, y); break; }
      return { x: (a + b + 1) / 2 - w / 2, y: yb + 1 - h / 2 };
    });
  } catch {
    out = [];
  }
  if (out.length === 0) out = [{ x: 0, y: h / 2 - 2 }];
  engineCache.set(cacheKey, out);
  return out;
}

export class ShipBay {
  readonly container: Phaser.GameObjects.Container;
  private readonly ship: Phaser.GameObjects.Container;
  private readonly dynamic: Phaser.GameObjects.GameObject[] = [];
  private readonly sideL: Phaser.GameObjects.Container;
  private readonly sideR: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly pad: Phaser.GameObjects.Image;
  private readonly name?: Phaser.GameObjects.BitmapText;
  private readonly gaugeA?: kit.Gauge;
  private readonly gaugeS?: kit.Gauge;
  private readonly valA?: Phaser.GameObjects.BitmapText;
  private readonly valS?: Phaser.GameObjects.BitmapText;
  private readonly scale: number;
  private readonly cx: number;
  private readonly cy: number;
  private readonly tweens: Phaser.Tweens.Tween[] = [];
  private readonly dynTweens: Phaser.Tweens.Tween[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly opts: ShipBayOpts, loadout: Loadout) {
    ensureMetaArt(scene);
    const { x, y, w, h } = opts;
    this.scale = opts.scale ?? (h >= 150 ? 3 : 2);
    const c = scene.add.container(Math.round(x), Math.round(y));
    this.container = c;
    if (opts.depth !== undefined) c.setDepth(opts.depth);
    if (opts.frame !== false) c.add(kit.panel(scene, 0, 0, w, h, 'inset'));
    const ix = 3, iy = 3, iw = w - 6, ih = h - 6;
    c.add(scene.add.image(ix, iy, bayBackdrop(scene, iw, ih)).setOrigin(0));

    const nameplate = opts.nameplate !== false;
    this.cx = Math.round(w / 2);
    this.cy = Math.round(iy + ih * (nameplate ? 0.47 : 0.52));
    const floorY = iy + Math.round(ih * 0.6);
    const hullPx = 32 * this.scale;

    // landing pad: soft teal glow + ring on the floor, ship hover shadow
    this.pad = scene.add.image(this.cx, Math.max(this.cy + hullPx * 0.45, floorY + 8), META.glow)
      .setTint(COLORS.teal).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.32)
      .setDisplaySize(hullPx * 1.9, hullPx * 0.42);
    c.add(this.pad);
    const ring = scene.add.graphics();
    ring.lineStyle(1, COLORS.teal, 0.45).strokeEllipse(this.cx, this.pad.y, hullPx * 1.35, hullPx * 0.28);
    ring.lineStyle(1, COLORS.accent, 0.3).strokeEllipse(this.cx, this.pad.y, hullPx * 1.7, hullPx * 0.36);
    c.add(ring);
    this.shadow = scene.add.image(this.cx, this.pad.y, META.shadow).setDisplaySize(hullPx * 0.9, hullPx * 0.2).setAlpha(0.6);
    c.add(this.shadow);
    this.tweens.push(scene.tweens.add({ targets: ring, alpha: 0.55, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));

    this.sideL = scene.add.container(0, 0);
    this.sideR = scene.add.container(0, 0);
    this.ship = scene.add.container(this.cx, this.cy);
    c.add([this.sideL, this.sideR, this.ship]);

    // hover bob (ship) + shadow breathing in sync
    this.tweens.push(scene.tweens.add({ targets: this.ship, y: this.cy - 3, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
    this.tweens.push(scene.tweens.add({
      targets: this.shadow, scaleX: this.shadow.scaleX * 0.86, scaleY: this.shadow.scaleY * 0.86, alpha: 0.42,
      duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    }));

    if (opts.gauges !== false) {
      const gh = Math.max(30, ih - (nameplate ? 46 : 34));
      const gy = iy + 16;
      this.gaugeA = new kit.Gauge(scene, ix + 6, gy, 8, gh, { colorA: 0x8a2a10, colorB: COLORS.armor, segments: Math.min(12, Math.floor(gh / 6)) });
      this.gaugeS = new kit.Gauge(scene, ix + iw - 14, gy, 8, gh, { colorA: 0x16307a, colorB: COLORS.shield, segments: Math.min(12, Math.floor(gh / 6)) });
      c.add([this.gaugeA.container, this.gaugeS.container]);
      c.add(kit.text(scene, ix + 10, gy + gh + 3, 'ARM', { size: 's', color: COLORS.armor, originX: 0.5 }));
      c.add(kit.text(scene, ix + iw - 10, gy + gh + 3, 'SHD', { size: 's', color: COLORS.shield, originX: 0.5 }));
      this.valA = kit.text(scene, ix + 10, gy - 10, '0', { size: 's', color: COLORS.text, originX: 0.5 });
      this.valS = kit.text(scene, ix + iw - 10, gy - 10, '0', { size: 's', color: COLORS.text, originX: 0.5 });
      c.add([this.valA, this.valS]);
    }
    if (nameplate) {
      this.name = kit.text(scene, this.cx, iy + ih - 12, '', { size: 'm', color: COLORS.teal, originX: 0.5 });
      c.add(this.name);
    }
    if (opts.tag) {
      c.add(kit.text(scene, ix + (opts.gauges !== false ? 20 : 5), iy + 4, opts.tag, { size: 's', color: COLORS.textDim }));
    }

    // scan beam sweeping down the screen
    const beam = scene.add.container(ix, iy);
    beam.add(scene.add.image(0, 0, META.glow).setOrigin(0, 0.5).setDisplaySize(iw, 10).setTint(COLORS.teal).setAlpha(0.12).setBlendMode(Phaser.BlendModes.ADD));
    beam.add(scene.add.rectangle(0, 0, iw, 1, COLORS.teal, 0.22).setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD));
    c.add(beam);
    this.tweens.push(scene.tweens.add({ targets: beam, y: iy + ih, duration: 2600, repeat: -1, repeatDelay: 1800, ease: 'Sine.In' }));

    c.add(scanlines(scene, ix, iy, iw, ih, 0, 0.6));
    c.add(cornerBrackets(scene, ix + 1, iy + 1, iw - 2, ih - 2, COLORS.teal, 6, 0));

    this.setLoadout(loadout);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  /** Rebuild the ship display for a loadout (hull, flames, shield arc, sidekicks, gauges). */
  setLoadout(l: Loadout): void {
    const s = this.scene;
    for (const t of this.dynTweens) t.remove();
    this.dynTweens.length = 0;
    for (const o of this.dynamic) o.destroy();
    this.dynamic.length = 0;
    this.sideL.removeAll(true);
    this.sideR.removeAll(true);
    const sc = this.scale;
    const hull = findHull(l.hull);
    const hk = hullKey(l.hull);
    const hasHull = s.textures.exists(hk);
    const frame = hasHull && s.textures.get(hk).has('0') ? 0 : undefined;

    // engine flames (behind the hull)
    if (hasHull) {
      const flameKey = s.textures.exists('fx_engine') ? 'fx_engine' : META.flame;
      const mounts = HULL_MOUNTS[l.hull]?.engines;
      const pts = mounts && mounts.length ? mounts.map(([x, y]) => ({ x, y })) : enginePoints(s, hk, frame);
      const fsx = pts.length > 1 ? sc * 0.75 : sc;
      for (const p of pts) {
        const glow = s.add.image(p.x * sc, (p.y + 3) * sc, META.glow).setTint(0xff7a20).setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.55).setDisplaySize(10 * fsx, 12 * sc);
        const fl = s.add.sprite(p.x * sc, (p.y - 1) * sc, flameKey, 0).setOrigin(0.5, 0).setScale(fsx, sc);
        if (flameKey === 'fx_engine' && s.anims.exists(ANIM.engine)) fl.play({ key: ANIM.engine, startFrame: Math.floor(Math.random() * 4) });
        else this.dynTweens.push(s.tweens.add({ targets: fl, scaleY: sc * 0.7, duration: 70, yoyo: true, repeat: -1 }));
        this.dynTweens.push(s.tweens.add({ targets: glow, alpha: 0.3, duration: 90, yoyo: true, repeat: -1 }));
        this.ship.add([glow, fl]);
        this.dynamic.push(glow, fl);
      }
      const img = s.add.image(0, 0, hk, frame).setScale(sc);
      this.ship.add(img);
      this.dynamic.push(img);
    } else {
      const g = s.add.graphics();
      g.fillStyle(COLORS.panelLight, 1).fillTriangle(0, -14 * sc, -12 * sc, 12 * sc, 12 * sc, 12 * sc);
      g.lineStyle(1, COLORS.teal, 1).strokeTriangle(0, -14 * sc, -12 * sc, 12 * sc, 12 * sc, 12 * sc);
      this.ship.add(g);
      this.dynamic.push(g);
    }

    // shield arc above the ship
    const shield = findShield(l.shield);
    const r = Math.round(16 * sc + 9);
    const arc = s.add.image(0, 3 * sc, shieldArcKey(s, r)).setOrigin(0.5, shieldArcOriginY(r))
      .setTint(shotGlow(shield?.color)).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9);
    const arcGlow = s.add.image(0, -r + 3 * sc, META.glow).setTint(shotGlow(shield?.color)).setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.22).setDisplaySize(r * 2.2, r * 0.7);
    this.ship.add([arcGlow, arc]);
    this.dynamic.push(arcGlow, arc);
    this.dynTweens.push(s.tweens.add({ targets: arc, alpha: 0.5, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));

    if (this.opts.bubble && s.textures.exists('fx_shield_bubble')) {
      const bub = s.add.image(0, 0, 'fx_shield_bubble').setTint(shotGlow(shield?.color)).setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.55).setScale((22 * sc) / 20);
      this.ship.add(bub);
      this.dynamic.push(bub);
      this.dynTweens.push(s.tweens.add({ targets: bub, alpha: 0.25, scale: bub.scale * 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
    }

    // sidekicks
    if (this.opts.sidekicks !== false) {
      const slots = hull?.sidekickSlots ?? 2;
      const dx = Math.round(16 * sc + 12 * Math.max(1, sc - 1) + 10);
      this.placeSidekick(this.sideL, -dx, l.sidekickL, slots >= 1, 0);
      this.placeSidekick(this.sideR, dx, l.sidekickR, slots >= 2, 500);
    }

    // gauges + name
    const max = catalogMax();
    if (this.gaugeA && this.valA) {
      this.gaugeA.setValue(hull ? hull.armor / max.armor : 0);
      this.valA.setText(hull ? String(hull.armor) : '-');
    }
    if (this.gaugeS && this.valS) {
      this.gaugeS.setValue(shield ? shield.capacity / max.shield : 0);
      this.valS.setText(shield ? String(shield.capacity) : '-');
    }
    this.name?.setText(upper(hull?.name ?? l.hull));
  }

  private placeSidekick(side: Phaser.GameObjects.Container, dx: number, id: string | null, hasSlot: boolean, phase: number): void {
    const s = this.scene;
    const ssc = this.scale >= 3 ? 2 : 1;
    side.setPosition(this.cx + dx, this.cy + 6 * this.scale);
    if (!hasSlot) return;
    if (id && s.textures.exists(sidekickKey(id))) {
      const key = sidekickKey(id);
      const glow = s.add.image(0, 0, META.glow).setTint(shotGlow(findSidekick(id)?.color)).setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.28).setDisplaySize(30 * ssc, 30 * ssc);
      const spr = s.add.sprite(0, 0, key, 0).setScale(ssc);
      const anim = idleAnimKey(key);
      if (s.anims.exists(anim)) spr.play({ key: anim, startFrame: phase ? 1 : 0 });
      side.add([glow, spr]);
    } else {
      const slot = s.add.image(0, 0, META.icEmpty).setScale(ssc).setAlpha(0.8);
      const label = kit.text(s, 0, 10 * ssc, 'EMPTY', { size: 's', color: COLORS.textDim, originX: 0.5 });
      side.add([slot, label]);
    }
    const baseY = side.y;
    this.dynTweens.push(s.tweens.add({ targets: side, y: baseY - 2 * ssc, duration: 1200 + phase / 2, delay: phase, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    for (const t of this.tweens) t.remove();
    for (const t of this.dynTweens) t.remove();
    this.tweens.length = 0;
    this.dynTweens.length = 0;
    if (this.container.scene) this.container.destroy();
  }
}
