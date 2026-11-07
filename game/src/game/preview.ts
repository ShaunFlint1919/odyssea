// =====================================================================================
//  WEAPON PREVIEW — createWeaponPreview(scene, x, y, w, h, loadout) (contract:
//  src/game/contracts.ts). A self-contained mini simulation clipped to the rectangle:
//  dark starry backdrop, the loadout's hull (frame 0) with its engine flames near the
//  bottom centre, the REAL arsenal (createArsenalWith + a fake host: infinite energy,
//  bounds = the rectangle) firing continuously at a few dummy drones drifting in the upper
//  half (they flash when hit, pop and respawn). With a rear gun, modes A/B alternate every
//  3 s (small label bottom-left). Everything lives in one masked Layer; destroy() (or the
//  scene shutting down) removes every object, listener and update hook.
// =====================================================================================
import Phaser from 'phaser';
import type { Loadout } from '../types';
import type { CreateWeaponPreview, WeaponPreviewApi } from './contracts';
import { ANIM, FONT, enemyKey, hullKey } from '../art/keys';
import { HULL_MOUNTS } from '../art/player';
import type { Arsenal, ArsenalBlocker, ArsenalHost, PlayerShot } from './arsenal/api';
import { createArsenalWith } from './arsenal';
import { findWeapon } from './arsenal/defs';
import { bodyTexture, fxTexture, texInfo } from './arsenal/textures';

/** The preview handle (WeaponPreviewApi + a few conveniences for the shop). */
export interface WeaponPreview extends WeaponPreviewApi {
  /** Depth of the preview layer in the scene display list (default 0). */
  setDepth(depth: number): this;
  /** Hide (and pause) / show the preview. */
  setVisible(visible: boolean): this;
}

const D_BACK = 0;
const D_STARS = 1;
const D_DRONES = 2;
const D_BOOM = 2.5;
const D_SHOTS = 3;
const D_ENGINE = 4.8;
const D_SHIP = 5;
const D_LABEL = 8;

const DRONE_R = 7;
const DRONE_HP = 70;
const RESPAWN_MS = 650;
const SPAWN_IN_MS = 260;
const FLASH_MS = 70;
const REAR_TOGGLE_MS = 3000;
const DRONE_PALETTES = ['steel', 'violet', 'amber', 'cobalt'] as const;

interface Star {
  img: Phaser.GameObjects.Image;
  speed: number;
}

class Drone {
  id = 0;
  x = 0;
  y = 0;
  bx = 0;
  by = 0;
  ax = 0;
  ay = 0;
  wx = 1;
  wy = 1;
  ph = 0;
  hp = DRONE_HP;
  alive = true;
  flash = 0;
  respawn = 0;
  spawnIn = 0;
  constructor(readonly img: Phaser.GameObjects.Image, readonly boom: Phaser.GameObjects.Sprite) {}
}

class WeaponPreviewImpl implements WeaponPreview {
  private readonly layer: Phaser.GameObjects.Layer;
  private readonly maskGfx: Phaser.GameObjects.Graphics;
  private readonly mask: Phaser.Display.Masks.GeometryMask;
  private readonly hull: Phaser.GameObjects.Image;
  private readonly engines: Phaser.GameObjects.Sprite[] = [];
  private engineOffsets: readonly (readonly [number, number])[] = [];
  private readonly stars: Star[] = [];
  private readonly drones: Drone[] = [];
  private readonly label: Phaser.GameObjects.BitmapText | null = null;
  private readonly arsenal: Arsenal;
  private readonly target = { x: 0, y: 0 };
  private readonly host: ArsenalHost;
  private loadout: Loadout;
  private shipX = 0;
  private shipY = 0;
  private t = 0;
  private dtS = 0;
  private nextId = 1;
  private rearTimer = REAR_TOGGLE_MS;
  private hasRear = false;
  private running = true;
  private dead = false;

  constructor(private readonly scene: Phaser.Scene, private readonly x: number, private readonly y: number,
    private readonly w: number, private readonly h: number, loadout: Loadout) {
    this.loadout = { ...loadout };
    this.layer = scene.add.layer();
    this.maskGfx = scene.make.graphics({}, false);
    this.maskGfx.fillStyle(0xffffff, 1);
    this.maskGfx.fillRect(x, y, w, h);
    this.mask = this.maskGfx.createGeometryMask();
    this.layer.setMask(this.mask);

    // backdrop
    const back = scene.make.graphics({}, false);
    back.fillGradientStyle(0x0d0b1c, 0x0d0b1c, 0x040309, 0x040309, 1);
    back.fillRect(x, y, w, h);
    back.setDepth(D_BACK);
    this.layer.add(back);
    this.buildStars();
    this.buildDrones();

    // ship
    this.shipX = x + w / 2;
    this.shipY = this.baseShipY();
    const hullTex = bodyTexture(scene, hullKey(loadout.hull), 32, 0x2ee6c8);
    this.hull = scene.make.image({ x: this.shipX, y: this.shipY, key: hullTex, frame: texInfo(scene, hullTex).first }, false);
    this.hull.setDepth(D_SHIP);
    this.layer.add(this.hull);
    this.buildEngines();

    if (scene.cache.bitmapFont.exists(FONT.s)) {
      const lbl = scene.make.bitmapText({ x: x + 4, y: y + h - 11, font: FONT.s, text: 'REAR A' }, false);
      lbl.setTint(0x2ee6c8);
      lbl.setDepth(D_LABEL);
      this.layer.add(lbl);
      this.label = lbl;
    }

    const bounds = { x, y, w, h };
    this.host = {
      scene,
      shipX: () => this.shipX,
      shipY: () => this.shipY,
      canFire: () => true,
      trySpendEnergy: () => true,
      nearestTarget: (px, py, maxDist) => this.nearest(px, py, maxDist),
      sfx: () => {},
      bounds,
    };
    this.arsenal = createArsenalWith(this.host, this.loadout, { shots: D_SHOTS, sidekicks: D_SHIP, shadows: -1 }, {
      layer: this.layer,
      poolSize: 160,
    });
    this.applyLoadoutExtras();
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  // ---------------------------------------------------------------- building

  private buildStars(): void {
    const { scene, x, y, w, h } = this;
    const px = fxTexture(scene, 'fx_pixel');
    const n = Math.max(18, Math.min(70, Math.round((w * h) / 900)));
    const tints = [0xffffff, 0xa8c8ff, 0xd0b8ff];
    for (let i = 0; i < n; i++) {
      const layerIdx = i % 3;
      const img = scene.make.image({ x: x + Math.random() * w, y: y + Math.random() * h, key: px.key }, false);
      img.setDepth(D_STARS);
      img.setTint(tints[(i * 7) % 3]);
      if (layerIdx === 0) img.setScale(0.5).setAlpha(0.35);
      else if (layerIdx === 1) img.setScale(0.5).setAlpha(0.65);
      else img.setScale(0.5, 1.5).setAlpha(0.85);
      this.layer.add(img);
      this.stars.push({ img, speed: layerIdx === 0 ? 10 : layerIdx === 1 ? 24 : 58 });
    }
  }

  private buildDrones(): void {
    const { scene, w } = this;
    const count = w >= 150 ? 4 : 3;
    const boomTex = fxTexture(scene, 'fx_explosion_s');
    for (let i = 0; i < count; i++) {
      const key = bodyTexture(scene, enemyKey('en_drone', DRONE_PALETTES[i % DRONE_PALETTES.length]), 12, 0xff5050);
      const img = scene.make.image({ x: 0, y: 0, key }, false);
      img.setDepth(D_DRONES);
      this.layer.add(img);
      const boom = scene.make.sprite({ x: 0, y: 0, key: boomTex.key, frame: boomTex.first }, false);
      boom.setDepth(D_BOOM);
      boom.setVisible(false);
      this.layer.add(boom);
      boom.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => boom.setVisible(false));
      const d = new Drone(img, boom);
      this.placeDrone(d, i, count);
      d.spawnIn = 0;
      this.drones.push(d);
    }
  }

  private placeDrone(d: Drone, slot: number, count: number): void {
    const { x, y, w, h } = this;
    const lane = (slot + 0.5) / count;
    d.id = this.nextId++;
    d.bx = x + w * (0.12 + 0.76 * lane) + (Math.random() - 0.5) * w * 0.12;
    d.by = y + h * (0.12 + Math.random() * 0.3);
    d.ax = Math.min(22, w * 0.1) * (0.5 + Math.random() * 0.5);
    d.ay = Math.min(14, h * 0.05) * (0.5 + Math.random() * 0.5);
    d.wx = 0.6 + Math.random() * 0.7;
    d.wy = 0.9 + Math.random() * 0.8;
    d.ph = Math.random() * Math.PI * 2;
    d.hp = DRONE_HP;
    d.alive = true;
    d.flash = 0;
    d.spawnIn = SPAWN_IN_MS;
    d.x = d.bx;
    d.y = d.by;
    d.img.setVisible(true);
    d.img.clearTint();
  }

  private buildEngines(): void {
    for (let i = 0; i < this.engines.length; i++) this.engines[i].destroy();
    this.engines.length = 0;
    const mount = HULL_MOUNTS[this.loadout.hull];
    this.engineOffsets = mount ? mount.engines : [[0, 13]];
    const eng = fxTexture(this.scene, 'fx_engine');
    const hasAnim = this.scene.anims.exists(ANIM.engine);
    for (let i = 0; i < this.engineOffsets.length; i++) {
      const s = this.scene.make.sprite({ x: 0, y: 0, key: eng.key, frame: eng.first }, false);
      s.setOrigin(0.5, 0);
      s.setDepth(D_ENGINE);
      if (this.engineOffsets.length > 2) s.setScale(0.8);
      this.layer.add(s);
      if (hasAnim) s.play({ key: ANIM.engine, startFrame: i % Math.max(1, eng.frames) });
      this.engines.push(s);
    }
  }

  private applyLoadoutExtras(): void {
    const rear = findWeapon(this.loadout.rear);
    this.hasRear = !!rear;
    this.rearTimer = REAR_TOGGLE_MS;
    if (this.arsenal.rearMode !== 0) this.arsenal.toggleRearMode();
    if (this.label) {
      this.label.setVisible(this.hasRear);
      this.label.setText('REAR A');
    }
  }

  /** Ship rest height: near the bottom, higher when a rear gun needs room behind it. */
  private baseShipY(): number {
    const { y, h } = this;
    return this.loadout.rear ? y + h * 0.66 : y + h - Math.min(34, h * 0.2);
  }

  // ---------------------------------------------------------------- fake host

  private nearest(px: number, py: number, maxDist: number): Readonly<{ x: number; y: number }> | null {
    let best = maxDist * maxDist;
    let found: Drone | null = null;
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (!d.alive || d.spawnIn > 0) continue;
      const dx = d.x - px, dy = d.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) {
        best = d2;
        found = d;
      }
    }
    if (!found) return null;
    this.target.x = found.x;
    this.target.y = found.y;
    return this.target;
  }

  private damage(d: Drone, amount: number): void {
    if (!d.alive) return;
    d.hp -= amount;
    d.flash = FLASH_MS;
    d.img.setTintFill(0xffffff);
    if (d.hp <= 0) {
      d.alive = false;
      d.respawn = RESPAWN_MS;
      d.img.setVisible(false);
      d.boom.setPosition(d.x, d.y);
      d.boom.setVisible(true);
      if (this.scene.anims.exists(ANIM.explosion_s)) d.boom.play(ANIM.explosion_s);
      else d.respawn = RESPAWN_MS * 0.5;
    }
  }

  /** World emulation: circle collisions of the arsenal's shots against the drones. */
  private readonly onShot = (shot: PlayerShot): void => {
    const drones = this.drones;
    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      if (!d.alive || d.spawnIn > 0) continue;
      const dx = shot.x - d.x, dy = shot.y - d.y, rr = shot.radius + DRONE_R;
      if (dx * dx + dy * dy > rr * rr) continue;
      if (shot.pierce) {
        if (!shot.registerHit(d.id)) this.damage(d, shot.damage);
        continue;
      }
      shot.registerHit(d.id);
      this.damage(d, shot.damage);
      if (shot.splash > 0) {
        const s2 = shot.splash * shot.splash;
        for (let j = 0; j < drones.length; j++) {
          const o = drones[j];
          if (o === d || !o.alive) continue;
          const ox = o.x - shot.x, oy = o.y - shot.y;
          if (ox * ox + oy * oy <= s2) this.damage(o, shot.damage);
        }
      }
      shot.impact(shot.x, shot.y);
      return;
    }
  };

  private readonly onBlocker = (b: ArsenalBlocker): void => {
    const drones = this.drones;
    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      if (!d.alive || d.spawnIn > 0) continue;
      const dx = b.x - d.x, dy = b.y - d.y, rr = b.radius + DRONE_R;
      if (dx * dx + dy * dy <= rr * rr) this.damage(d, b.contactDps * this.dtS);
    }
  };

  // ---------------------------------------------------------------- frame

  private tick(_time: number, delta: number): void {
    if (this.dead || !this.running) return;
    const dtMs = delta > 50 ? 50 : delta;
    const dt = dtMs / 1000;
    this.dtS = dt;
    this.t += dt;
    const { x, y, w, h } = this;

    // ship sway + engines
    const sway = Math.min(26, w * 0.16);
    this.shipX = x + w / 2 + Math.sin(this.t * 1.3) * sway;
    this.shipY = this.baseShipY() + Math.sin(this.t * 2.1) * 2;
    this.hull.x = this.shipX;
    this.hull.y = this.shipY;
    for (let i = 0; i < this.engines.length; i++) {
      const e = this.engines[i];
      const o = this.engineOffsets[i];
      e.x = this.shipX + o[0];
      e.y = this.shipY + o[1] - 1;
    }

    // stars
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.img.y += s.speed * dt;
      if (s.img.y > y + h + 2) {
        s.img.y = y - 2;
        s.img.x = x + Math.random() * w;
      }
    }

    // drones
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (!d.alive) {
        d.respawn -= dtMs;
        if (d.respawn <= 0) this.placeDrone(d, i, this.drones.length);
        continue;
      }
      d.x = d.bx + Math.sin(this.t * d.wx + d.ph) * d.ax;
      d.y = d.by + Math.sin(this.t * d.wy + d.ph * 1.7) * d.ay;
      d.img.x = d.x;
      d.img.y = d.y;
      if (d.spawnIn > 0) {
        d.spawnIn -= dtMs;
        const k = 1 - Math.max(0, d.spawnIn) / SPAWN_IN_MS;
        d.img.setScale(0.4 + 0.6 * k);
        d.img.setAlpha(k);
      } else if (d.img.alpha < 1) {
        d.img.setScale(1);
        d.img.setAlpha(1);
      }
      if (d.flash > 0) {
        d.flash -= dtMs;
        if (d.flash <= 0) d.img.clearTint();
      }
    }

    // rear mode showcase
    if (this.hasRear) {
      this.rearTimer -= dtMs;
      if (this.rearTimer <= 0) {
        this.rearTimer += REAR_TOGGLE_MS;
        const m = this.arsenal.toggleRearMode();
        if (this.label) this.label.setText(m === 0 ? 'REAR A' : 'REAR B');
      }
    }

    this.arsenal.update(dtMs, true);
    this.arsenal.forEachShot(this.onShot);
    this.arsenal.forEachBlocker(this.onBlocker);
  }

  // ---------------------------------------------------------------- API

  setLoadout(loadout: Loadout): void {
    if (this.dead) return;
    const hullChanged = loadout.hull !== this.loadout.hull;
    this.loadout = { ...loadout };
    this.arsenal.clearShots();
    this.arsenal.setLoadout(this.loadout);
    if (hullChanged) {
      const key = bodyTexture(this.scene, hullKey(loadout.hull), 32, 0x2ee6c8);
      this.hull.setTexture(key, texInfo(this.scene, key).first);
      this.buildEngines();
    }
    this.applyLoadoutExtras();
  }

  setDepth(depth: number): this {
    if (!this.dead) this.layer.setDepth(depth);
    return this;
  }

  setVisible(visible: boolean): this {
    if (this.dead) return this;
    this.running = visible;
    this.layer.setVisible(visible);
    return this;
  }

  destroy(): void {
    if (this.dead) return;
    this.dead = true;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.arsenal.destroy();
    for (let i = 0; i < this.drones.length; i++) this.drones[i].boom.removeAllListeners();
    this.layer.clearMask(false);
    this.layer.destroy();
    this.mask.destroy();
    this.maskGfx.destroy();
    this.drones.length = 0;
    this.stars.length = 0;
    this.engines.length = 0;
  }
}

/** Creates the shop's live weapon demo inside (x, y, w, h). See the file header. */
export function createWeaponPreview(scene: Phaser.Scene, x: number, y: number, w: number, h: number, loadout: Loadout): WeaponPreview {
  return new WeaponPreviewImpl(scene, x, y, w, h, loadout);
}

// Compile-time check against the contract signature.
const contractCheck: CreateWeaponPreview = createWeaponPreview;
void contractCheck;
