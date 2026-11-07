// =====================================================================================
//  WEAPON PREVIEW — createWeaponPreview(scene, x, y, w, h, loadout) (contract:
//  src/game/contracts.ts). A self-contained "live fire" showcase clipped to the rectangle:
//   - deep-space backdrop with three parallax star layers;
//   - the loadout's hull (banking with its sway) and engine flames near the bottom centre,
//     firing the REAL arsenal (createArsenalWith + a fake host: infinite energy, bounds =
//     the rectangle) at target drones hovering in the upper half;
//   - the drones react: white hit flash and recoil, smoke once damaged, explosion + embers
//     on death, warp-in flash on respawn; they lob slow bullets at the ship, which an
//     orbiter sidekick eats (flash) and the ship's shield absorbs;
//   - labels (bitmap font): front power "P<n>" + 10 pips in the weapon colour (top-right;
//     the shop's own tag sits top-left) and, with a rear gun, its mode REAR A / REAR B
//     (toggled every 3 s, bottom-left) — both pulse white when they change.
//  Everything lives in one masked Layer; destroy() (or the scene shutting down) removes
//  every object, listener and update hook. No allocation per frame.
// =====================================================================================
import Phaser from 'phaser';
import type { Loadout, Palette, ShotColor } from '../types';
import type { CreateWeaponPreview, WeaponPreviewApi } from './contracts';
import { ANIM, FONT, SHOT_RGB, enemyBulletKey, enemyKey, hullKey } from '../art/keys';
import { HULL_MOUNTS } from '../art/player';
import type { ArsenalBlocker, ArsenalHost, PlayerShot } from './arsenal/api';
import { createArsenalWith, type ArsenalImpl } from './arsenal';
import { findWeapon } from './arsenal/defs';
import { emberTex, flashTex, smokeTex, sparkTex } from './arsenal/art';
import { bodyTexture, fxTexture, texInfo, type TexInfo } from './arsenal/textures';

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
const D_SHOTS = 3;      // arsenal shots / impacts use 2.6 .. 3.5
const D_BULLETS = 4;    // enemy bullets above the player's fire (as in game)
const D_ENGINE = 4.8;
const D_SHIP = 5;       // hull + sidekicks (muzzles 5.5)
const D_LABEL = 8;

const DRONE_HP = 70;
const RESPAWN_MS = 650;
const SPAWN_IN_MS = 260;
const FLASH_MS = 60;
const REAR_TOGGLE_MS = 3000;
const BULLET_SPEED = 70;
const MAX_BULLETS = 16;
const SHIELD_R = 13;
const PULSE_MS = 260;
const LABEL_TINT = 0x2ee6c8;
const PIP_OFF = 0x2c2a3c;
/** Target drones: enemy sprite, palette, hit radius (px). */
const DRONE_TYPES: readonly (readonly [string, Palette, number])[] = [
  ['en_drone', 'steel', 7], ['en_dart', 'crimson', 8], ['en_drone', 'violet', 7], ['en_wasp', 'amber', 8],
];

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
  kick = 0;
  smokeT = 0;
  fireT = 0;
  constructor(readonly img: Phaser.GameObjects.Image, readonly boom: Phaser.GameObjects.Sprite, readonly r: number) {}
}

class Bullet {
  alive = false;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  constructor(readonly img: Phaser.GameObjects.Image) {}
}

class WeaponPreviewImpl implements WeaponPreview {
  private readonly layer: Phaser.GameObjects.Layer;
  private readonly maskGfx: Phaser.GameObjects.Graphics;
  private readonly mask: Phaser.Display.Masks.GeometryMask;
  private readonly hull: Phaser.GameObjects.Image;
  private hullFrames = 1;
  private hullFrame = 0;
  private readonly engines: Phaser.GameObjects.Sprite[] = [];
  private engineOffsets: readonly (readonly [number, number])[] = [];
  private readonly stars: Star[] = [];
  private readonly drones: Drone[] = [];
  private readonly bullets: Bullet[] = [];
  private readonly powerText: Phaser.GameObjects.BitmapText | null = null;
  private readonly rearText: Phaser.GameObjects.BitmapText | null = null;
  private readonly pips: Phaser.GameObjects.Graphics;
  private readonly arsenal: ArsenalImpl;
  private readonly target = { x: 0, y: 0 };
  private readonly host: ArsenalHost;
  private readonly fx: { flashS: TexInfo; flashM: TexInfo; flashL: TexInfo; spark: TexInfo; ember: TexInfo; smoke: TexInfo };
  private loadout: Loadout;
  private shipX = 0;
  private shipY = 0;
  private t = 0;
  private dtS = 0;
  private nextId = 1;
  private rearTimer = REAR_TOGGLE_MS;
  private hasRear = false;
  private powerPulse = 0;
  private rearPulse = 0;
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
    this.fx = {
      flashS: flashTex(scene, 1), flashM: flashTex(scene, 2), flashL: flashTex(scene, 3),
      spark: sparkTex(scene, 'white', 1), ember: emberTex(scene), smoke: smokeTex(scene),
    };

    // backdrop
    const back = scene.make.graphics({}, false);
    back.fillGradientStyle(0x0e0c20, 0x0e0c20, 0x040309, 0x040309, 1);
    back.fillRect(x, y, w, h);
    back.setDepth(D_BACK);
    this.layer.add(back);
    this.buildStars();
    this.buildDrones();
    this.buildBullets();

    // ship
    this.shipX = x + w / 2;
    this.shipY = this.baseShipY();
    const hullTex = bodyTexture(scene, hullKey(loadout.hull), 32, 0x2ee6c8);
    const hi = texInfo(scene, hullTex);
    this.hullFrames = hi.frames;
    this.hull = scene.make.image({ x: this.shipX, y: this.shipY, key: hullTex, frame: hi.first }, false);
    this.hull.setDepth(D_SHIP);
    this.layer.add(this.hull);
    this.buildEngines();

    // labels
    this.pips = scene.make.graphics({}, false);
    this.pips.setDepth(D_LABEL);
    this.layer.add(this.pips);
    if (scene.cache.bitmapFont.exists(FONT.s)) {
      const pt = scene.make.bitmapText({ x: 0, y: y + 6, font: FONT.s, text: 'P1' }, false);
      pt.setOrigin(1, 0);
      pt.setTint(LABEL_TINT);
      pt.setDepth(D_LABEL);
      this.layer.add(pt);
      this.powerText = pt;
      const rt = scene.make.bitmapText({ x: x + 9, y: y + h - 13, font: FONT.s, text: 'REAR A' }, false);
      rt.setTint(LABEL_TINT);
      rt.setDepth(D_LABEL);
      this.layer.add(rt);
      this.rearText = rt;
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
      poolSize: 180,
      prewarm: false,
    });
    this.applyLoadoutExtras(false);
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
      const [sprite, pal, r] = DRONE_TYPES[i % DRONE_TYPES.length];
      const key = bodyTexture(scene, enemyKey(sprite, pal), 12, 0xff5050);
      const img = scene.make.image({ x: 0, y: 0, key }, false);
      img.setDepth(D_DRONES);
      this.layer.add(img);
      const boom = scene.make.sprite({ x: 0, y: 0, key: boomTex.key, frame: boomTex.first }, false);
      boom.setDepth(D_BOOM);
      boom.setVisible(false);
      this.layer.add(boom);
      boom.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => boom.setVisible(false));
      const d = new Drone(img, boom, r);
      this.placeDrone(d, i, count, false);
      this.drones.push(d);
    }
  }

  private buildBullets(): void {
    const key = bodyTexture(this.scene, enemyBulletKey('eb_orb', 'orange'), 8, 0xff8020);
    for (let i = 0; i < MAX_BULLETS; i++) {
      const img = this.scene.make.image({ x: 0, y: 0, key }, false);
      img.setDepth(D_BULLETS);
      img.setVisible(false);
      this.layer.add(img);
      this.bullets.push(new Bullet(img));
    }
  }

  private placeDrone(d: Drone, slot: number, count: number, warp: boolean): void {
    const { x, y, w, h } = this;
    const lane = (slot + 0.5) / count;
    d.id = this.nextId++;
    d.bx = x + w * (0.12 + 0.76 * lane) + (Math.random() - 0.5) * w * 0.1;
    d.by = y + h * (0.13 + Math.random() * 0.28);
    d.ax = Math.min(22, w * 0.1) * (0.5 + Math.random() * 0.5);
    d.ay = Math.min(14, h * 0.05) * (0.5 + Math.random() * 0.5);
    d.wx = 0.6 + Math.random() * 0.7;
    d.wy = 0.9 + Math.random() * 0.8;
    d.ph = Math.random() * Math.PI * 2;
    d.hp = DRONE_HP;
    d.alive = true;
    d.flash = 0;
    d.kick = 0;
    d.smokeT = 0;
    d.fireT = 900 + Math.random() * 1600;
    d.spawnIn = warp ? SPAWN_IN_MS : 0;
    d.x = d.bx;
    d.y = d.by;
    d.img.setPosition(d.x, d.y);
    d.img.setVisible(true);
    d.img.clearTint();
    d.img.setScale(warp ? 0.4 : 1);
    d.img.setAlpha(warp ? 0 : 1);
    d.boom.setVisible(false);
    if (warp) this.arsenal.fx.play(this.fx.flashS, d.x, d.y, 220, 0xb07cff, 0.8);
  }

  private buildEngines(): void {
    for (let i = 0; i < this.engines.length; i++) this.engines[i].destroy();
    this.engines.length = 0;
    const mount = HULL_MOUNTS[this.loadout.hull];
    this.engineOffsets = mount ? mount.engines : [[0, 13]];
    const eng = fxTexture(this.scene, 'fx_engine');
    const hasAnim = this.scene.anims.exists(ANIM.engine);
    for (let i = 0; i < this.engineOffsets.length; i++) {
      const o = this.engineOffsets[i];
      const s = this.scene.make.sprite({ x: this.shipX + o[0], y: this.shipY + o[1] - 1, key: eng.key, frame: eng.first }, false);
      s.setOrigin(0.5, 0);
      s.setDepth(D_ENGINE);
      this.layer.add(s);
      if (hasAnim) s.play({ key: ANIM.engine, startFrame: i % Math.max(1, eng.frames) });
      this.engines.push(s);
    }
  }

  /** Labels and rear showcase for the current loadout; `pulse` flashes what changed. */
  private applyLoadoutExtras(pulse: boolean): void {
    const rear = findWeapon(this.loadout.rear);
    this.hasRear = !!rear && rear.slot === 'rear';
    this.rearTimer = REAR_TOGGLE_MS;
    if (this.arsenal.rearMode !== 0) this.arsenal.toggleRearMode();
    const front = findWeapon(this.loadout.front);
    const color: ShotColor = front && SHOT_RGB[front.color] ? front.color : 'cyan';
    this.drawPower(this.arsenal.frontPower, SHOT_RGB[color].glow);
    if (this.rearText) {
      this.rearText.setVisible(this.hasRear);
      this.rearText.setText(`REAR A  P${this.arsenal.rearPower}`);
    }
    if (pulse) {
      this.powerPulse = PULSE_MS;
      this.rearPulse = this.hasRear ? PULSE_MS : 0;
      this.arsenal.fx.play(this.fx.flashL, this.shipX, this.shipY, 260, SHOT_RGB[color].glow, 0.75);
    }
  }

  /** "P<n>" + 10 power pips, right-aligned at the top-right corner. */
  private drawPower(power: number, lit: number): void {
    const g = this.pips;
    g.clear();
    const right = this.x + this.w - 9;
    const top = this.y + 7;
    const pipsW = this.w >= 120 ? 10 * 4 - 1 : 0;
    if (pipsW > 0) {
      const x0 = right - pipsW;
      for (let i = 0; i < 10; i++) {
        g.fillStyle(0x08070e, 0.9);
        g.fillRect(x0 + i * 4 - 1, top - 1, 5, 7);
        g.fillStyle(i < power ? lit : PIP_OFF, 1);
        g.fillRect(x0 + i * 4, top, 3, 5);
        if (i < power) {
          g.fillStyle(0xffffff, 0.55);
          g.fillRect(x0 + i * 4, top, 3, 1);
        }
      }
    }
    if (this.powerText) {
      this.powerText.setText(`P${power}`);
      this.powerText.x = right - pipsW - (pipsW > 0 ? 4 : 0);
      this.powerText.y = top - 1;
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
    if (d.flash <= 0) {
      d.flash = FLASH_MS;
      d.img.setTintFill(0xffffff);
    }
    d.kick = Math.min(4, d.kick + 0.8 + amount * 0.04);
    if (d.hp <= 0) {
      d.alive = false;
      d.respawn = RESPAWN_MS;
      d.img.setVisible(false);
      d.boom.setPosition(d.x, d.y);
      d.boom.setVisible(true);
      if (this.scene.anims.exists(ANIM.explosion_s)) d.boom.play(ANIM.explosion_s);
      else d.respawn = RESPAWN_MS * 0.5;
      this.arsenal.fx.play(this.fx.flashM, d.x, d.y, 200, 0xffb050, 0.85);
      this.arsenal.fx.burst(this.fx.ember, d.x, d.y, 6, 110, 0xffc060);
    }
  }

  /** World emulation: circle collisions of the arsenal's shots against the drones. */
  private readonly onShot = (shot: PlayerShot): void => {
    const drones = this.drones;
    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      if (!d.alive || d.spawnIn > 0) continue;
      const dx = shot.x - d.x, dy = shot.y - d.y, rr = shot.radius + d.r;
      if (dx * dx + dy * dy > rr * rr) continue;
      if (shot.pierce) {
        if (!shot.registerHit(d.id)) this.damage(d, shot.damage);
        continue;
      }
      shot.registerHit(d.id);
      this.damage(d, shot.damage);
      if (shot.splash > 0) {
        for (let j = 0; j < drones.length; j++) {
          const o = drones[j];
          if (o === d || !o.alive) continue;
          const ox = o.x - shot.x, oy = o.y - shot.y, sr = shot.splash + o.r;
          if (ox * ox + oy * oy <= sr * sr) this.damage(o, shot.damage);
        }
      }
      shot.impact(shot.x, shot.y);
      return;
    }
  };

  /** Orbiters: eat the drones' bullets (flash) and grind drones they touch. */
  private readonly onBlocker = (b: ArsenalBlocker): void => {
    const bullets = this.bullets;
    for (let i = 0; i < bullets.length; i++) {
      const u = bullets[i];
      if (!u.alive) continue;
      const dx = u.x - b.x, dy = u.y - b.y, rr = b.radius + 4;
      if (dx * dx + dy * dy > rr * rr) continue;
      this.killBullet(u);
      this.arsenal.fx.play(this.fx.flashS, u.x, u.y, 140, 0x60a0ff, 0.9);
      this.arsenal.fx.play(this.fx.spark, u.x, u.y, 130);
    }
    if (b.contactDps <= 0) return;
    const drones = this.drones;
    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      if (!d.alive || d.spawnIn > 0) continue;
      const dx = b.x - d.x, dy = b.y - d.y, rr = b.radius + d.r;
      if (dx * dx + dy * dy <= rr * rr) this.damage(d, b.contactDps * this.dtS);
    }
  };

  private fireBullet(d: Drone): void {
    for (let i = 0; i < this.bullets.length; i++) {
      const u = this.bullets[i];
      if (u.alive) continue;
      const dx = this.shipX - d.x, dy = this.shipY - d.y;
      const inv = 1 / Math.max(1, Math.sqrt(dx * dx + dy * dy));
      u.alive = true;
      u.x = d.x;
      u.y = d.y + 6;
      u.vx = dx * inv * BULLET_SPEED;
      u.vy = dy * inv * BULLET_SPEED;
      u.img.setPosition(u.x, u.y);
      u.img.setVisible(true);
      return;
    }
  }

  private killBullet(u: Bullet): void {
    u.alive = false;
    u.img.setVisible(false);
  }

  // ---------------------------------------------------------------- frame

  private tick(_time: number, delta: number): void {
    if (this.dead || !this.running) return;
    const dtMs = delta > 50 ? 50 : delta;
    const dt = dtMs / 1000;
    this.dtS = dt;
    this.t += dt;
    const { x, y, w, h } = this;

    // ship sway (banking frames) + engines
    const sway = Math.min(26, w * 0.16);
    this.shipX = x + w / 2 + Math.sin(this.t * 1.3) * sway;
    this.shipY = this.baseShipY() + Math.sin(this.t * 2.1) * 2;
    this.hull.x = this.shipX;
    this.hull.y = this.shipY;
    if (this.hullFrames >= 3) {
      const vx = Math.cos(this.t * 1.3);
      const f = vx < -0.55 ? 1 : vx > 0.55 ? 2 : 0;
      if (f !== this.hullFrame) {
        this.hullFrame = f;
        this.hull.setFrame(f);
      }
    }
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

    this.updateDrones(dtMs);
    this.updateBullets(dt);
    this.updateLabels(dtMs);

    this.arsenal.update(dtMs, true);
    this.arsenal.forEachShot(this.onShot);
    this.arsenal.forEachBlocker(this.onBlocker);
  }

  private updateDrones(dtMs: number): void {
    const n = this.drones.length;
    for (let i = 0; i < n; i++) {
      const d = this.drones[i];
      if (!d.alive) {
        d.respawn -= dtMs;
        if (d.respawn <= 0) this.placeDrone(d, i, n, true);
        continue;
      }
      d.kick *= dtMs < 50 ? 1 - dtMs * 0.012 : 0.4;
      d.x = d.bx + Math.sin(this.t * d.wx + d.ph) * d.ax;
      d.y = d.by + Math.sin(this.t * d.wy + d.ph * 1.7) * d.ay - d.kick;
      d.img.x = d.x;
      d.img.y = d.y;
      if (d.spawnIn > 0) {
        d.spawnIn -= dtMs;
        const k = 1 - Math.max(0, d.spawnIn) / SPAWN_IN_MS;
        d.img.setScale(k < 1 ? 0.4 + 0.6 * k : 1);
        d.img.setAlpha(k);
        continue;
      }
      if (d.flash > 0) {
        d.flash -= dtMs;
        if (d.flash <= 0) d.img.clearTint();
      }
      if (d.hp < DRONE_HP * 0.4) {
        d.smokeT -= dtMs;
        if (d.smokeT <= 0) {
          d.smokeT = 110;
          this.arsenal.smoke.play(this.fx.smoke, d.x + (Math.random() - 0.5) * 6, d.y - 2, 380);
        }
      }
      d.fireT -= dtMs;
      if (d.fireT <= 0) {
        d.fireT = 1800 + Math.random() * 1200;
        this.fireBullet(d);
      }
    }
  }

  private updateBullets(dt: number): void {
    const { x, y, w, h } = this;
    for (let i = 0; i < this.bullets.length; i++) {
      const u = this.bullets[i];
      if (!u.alive) continue;
      u.x += u.vx * dt;
      u.y += u.vy * dt;
      u.img.x = u.x;
      u.img.y = u.y;
      const dx = u.x - this.shipX, dy = u.y - this.shipY;
      if (dx * dx + dy * dy < SHIELD_R * SHIELD_R) {
        this.killBullet(u);
        this.arsenal.fx.play(this.fx.flashM, u.x, u.y, 170, 0x40a0ff, 0.85);
      } else if (u.x < x - 8 || u.x > x + w + 8 || u.y < y - 8 || u.y > y + h + 8) {
        this.killBullet(u);
      }
    }
  }

  private updateLabels(dtMs: number): void {
    if (this.hasRear) {
      this.rearTimer -= dtMs;
      if (this.rearTimer <= 0) {
        this.rearTimer += REAR_TOGGLE_MS;
        const m = this.arsenal.toggleRearMode();
        if (this.rearText) this.rearText.setText(`REAR ${m === 0 ? 'A' : 'B'}  P${this.arsenal.rearPower}`);
        this.rearPulse = PULSE_MS;
      }
    }
    if (this.powerPulse > 0) {
      this.powerPulse -= dtMs;
      if (this.powerText) this.powerText.setTint(this.powerPulse > 0 && ((this.powerPulse / 65) | 0) % 2 === 0 ? 0xffffff : LABEL_TINT);
    }
    if (this.rearPulse > 0) {
      this.rearPulse -= dtMs;
      if (this.rearText) this.rearText.setTint(this.rearPulse > 0 && ((this.rearPulse / 65) | 0) % 2 === 0 ? 0xffffff : LABEL_TINT);
    }
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
      const hi = texInfo(this.scene, key);
      this.hullFrames = hi.frames;
      this.hullFrame = 0;
      this.hull.setTexture(key, hi.first);
      this.buildEngines();
    }
    this.applyLoadoutExtras(true);
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
    this.bullets.length = 0;
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
