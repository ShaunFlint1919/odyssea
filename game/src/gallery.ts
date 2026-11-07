// DEV TOOL — texture gallery (not part of the production bundle).
// http://localhost:5173/gallery.html?filter=en_&scale=3&bg=303040&cols=0
//   filter: substring (comma separated = OR) of texture keys to show (default: all)
//   scale:  integer zoom (default 2)       bg: background hex (default 22202c)
//   frames: 1 = show every frame of sprite sheets separately
//   terrain=desert&chunks=3 : render terrain chunks of a biome instead of textures
//   font=1 : render sample text with every bitmap font
//   only=fonts,ui,planets : run only these art generators (isolates you from modules other
//          people are editing). Modules: fonts player projectiles pickups fx ui planets enemies
//          bosses doodads. Every module is loaded dynamically: a broken module is reported on
//          the canvas (and as a console warning) instead of breaking the whole gallery.
import Phaser from 'phaser';
import { FONT } from './art/keys';
import { PLAY_W, CHUNK_H } from './config';
import type { Biome } from './types';

const q = new URLSearchParams(location.search);
const filters = (q.get('filter') ?? '').split(',').filter(Boolean);
const scale = Number(q.get('scale') ?? 2);
const bg = parseInt(q.get('bg') ?? '22202c', 16);
const showFrames = q.get('frames') === '1';
const terrain = q.get('terrain') as Biome | null;
const chunks = Number(q.get('chunks') ?? 3);
const font = q.get('font') === '1';
const width = Number(q.get('w') ?? 1280);
const only = (q.get('only') ?? '').split(',').filter(Boolean);

type Gen = (scene: Phaser.Scene) => void;
const ART_MODULES: Record<string, [() => Promise<Record<string, unknown>>, string]> = {
  fonts: [() => import('./art/fonts'), 'generateFonts'],
  player: [() => import('./art/player'), 'generatePlayerArt'],
  projectiles: [() => import('./art/projectiles'), 'generateProjectileArt'],
  pickups: [() => import('./art/pickups'), 'generatePickupArt'],
  fx: [() => import('./art/fx'), 'generateFxArt'],
  ui: [() => import('./art/ui'), 'generateUiArt'],
  planets: [() => import('./art/planets'), 'generatePlanetArt'],
  enemies: [() => import('./art/enemies'), 'generateEnemyArt'],
  bosses: [() => import('./art/bosses'), 'generateBossArt'],
  doodads: [() => import('./art/doodads'), 'generateDoodadArt'],
};

/** Runs the selected art generators; returns human-readable failures. */
async function generateSelected(scene: Phaser.Scene): Promise<string[]> {
  const failures: string[] = [];
  const names = Object.keys(ART_MODULES).filter((n) => only.length === 0 || only.includes(n));
  for (const name of names) {
    const [load, fn] = ART_MODULES[name];
    try {
      const mod = await load();
      (mod[fn] as Gen)(scene);
    } catch (e) {
      const msg = `[gallery] art module '${name}' failed (maybe being edited by someone else): ${String(e)}`;
      console.warn(msg);
      failures.push(msg);
    }
  }
  if (only.length === 0 || only.includes('fx')) {
    try {
      const fx = await import('./art/fx');
      fx.registerAnimations(scene);
    } catch (e) {
      failures.push(`[gallery] registerAnimations failed: ${String(e)}`);
    }
  }
  return failures;
}

class GalleryScene extends Phaser.Scene {
  constructor() { super('Gallery'); }
  create(): void {
    this.cameras.main.setBackgroundColor(bg);
    void this.build();
  }

  private async build(): Promise<void> {
    const failures = await generateSelected(this);
    const label = (x: number, y: number, t: string) => this.add.text(x, y, t, { fontFamily: 'monospace', fontSize: '10px', color: '#9a96aa' });
    failures.forEach((f, i) => this.add.text(8, 4 + i * 12, f.slice(0, 200), { fontFamily: 'monospace', fontSize: '10px', color: '#ff6060' }).setDepth(1000));
    if (terrain) {
      const { TerrainGenerator } = await import('./art/terrain');
      const gen = new TerrainGenerator(terrain, 1234, PLAY_W);
      for (let i = 0; i < chunks; i++) {
        const c = gen.chunk(i);
        const key = `__chunk${i}`;
        this.textures.addCanvas(key, c.canvas);
        const y = (chunks - 1 - i) * CHUNK_H * scale;
        this.add.image(0, y, key).setOrigin(0).setScale(scale);
        for (const d of c.doodads) {
          if (this.textures.exists(d.key)) this.add.image(d.x * scale, y + d.y * scale, d.key).setScale(scale * (d.scale ?? 1)).setFlipX(!!d.flipX);
        }
      }
      this.scale.resize(PLAY_W * scale, chunks * CHUNK_H * scale);
      (window as unknown as { __galleryReady: boolean }).__galleryReady = true;
      return;
    }
    if (font) {
      const sample = 'NOVA CORSAIR 0123456789\nThe quick brown fox jumps over the lazy dog.\n!?.,:;+-*/=%()[]<>#$&@\'"';
      let y = 8;
      for (const k of [FONT.s, FONT.m, FONT.l]) {
        if (!this.cache.bitmapFont.exists(k)) { label(8, y, `missing font ${k}`); y += 16; continue; }
        label(8, y, k); y += 12;
        this.add.bitmapText(8, y, k, sample).setScale(scale); y += 70 * scale;
        this.add.bitmapText(8, y, k, 'TINTED TEXT 1234').setScale(scale).setTint(0x2ee6c8); y += 24 * scale;
      }
      this.scale.resize(width, y + 20);
      (window as unknown as { __galleryReady: boolean }).__galleryReady = true;
      return;
    }
    const keys = this.textures.getTextureKeys().filter((k) => !k.startsWith('__') && (filters.length === 0 || filters.some((f) => k.includes(f)))).sort();
    let x = 8, y = 8, rowH = 0;
    for (const key of keys) {
      const tex = this.textures.get(key);
      const frameNames = tex.getFrameNames();
      const frames = showFrames && frameNames.length > 0 ? frameNames : [undefined];
      for (const fr of frames) {
        const f = tex.get(fr as string | undefined);
        const w = Math.max(f.width * scale, 60), h = f.height * scale + 14;
        if (x + w > width - 8) { x = 8; y += rowH + 8; rowH = 0; }
        this.add.image(x, y, key, fr as string | undefined).setOrigin(0).setScale(scale);
        label(x, y + f.height * scale + 2, `${key}${fr !== undefined ? '#' + fr : ''}`.slice(0, Math.floor(w / 6)));
        x += w + 8; rowH = Math.max(rowH, h);
      }
    }
    label(8, y + rowH + 8, `${keys.length} textures`);
    this.scale.resize(width, y + rowH + 30);
    (window as unknown as { __galleryReady: boolean }).__galleryReady = true;
  }
}

new Phaser.Game({
  type: Phaser.AUTO, parent: 'gallery', width, height: 800, pixelArt: true, backgroundColor: bg,
  scale: { mode: Phaser.Scale.NONE }, scene: [GalleryScene],
});
