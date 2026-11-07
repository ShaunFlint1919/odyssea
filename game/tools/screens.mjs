// Screenshots of every menu scene, the first level of each planet and each planet boss.
// Writes screens/<name>.png (360x640 viewport, device scale factor 2 -> 720x1280 PNG).
//
//   node tools/screens.mjs [--port 4173] [--dist] [--only <substring>]
//   e.g. --only shop  (shop, shop-front, shop-shield) · --only boss · --only kessra
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  GAME_ROOT, collectErrors, gameUrl, hookErrors, launchBrowser, loadCampaign, newMobileContext, parseArgs, startServer, waitForScene,
} from './harness.mjs';

const OUT_DIR = path.join(GAME_ROOT, 'screens');
const MENU_WAIT_MS = 900;
const PLAY_WAIT_MS = 2500;
const BOSS_WAIT_MS = 4000;

const opts = parseArgs();
mkdirSync(OUT_DIR, { recursive: true });
const server = await startServer(opts);
let browser;
let failures = 0;
let written = 0;

try {
  const campaign = await loadCampaign(server);
  const menu = (name, scene, extra = {}) => ({ name, scene, wait: MENU_WAIT_MS, query: { scene, ...extra } });
  const shots = [
    menu('title', 'Title'),
    menu('map', 'Map'),
    menu('hangar', 'Hangar'),
    menu('shop', 'Shop'),
    menu('shop-front', 'Shop', { shop: 'front' }),
    menu('shop-shield', 'Shop', { shop: 'shield' }),
    menu('specs', 'Specs'),
    menu('options', 'Options'),
    menu('intel', 'Intel'),
    ...campaign.map((p) => ({ name: `game-${p.first}`, scene: 'Game', wait: PLAY_WAIT_MS, query: { scene: 'Game', level: p.first, t: 25, god: 1 } })),
    ...campaign.map((p) => ({
      name: `boss-${p.boss}`, scene: 'Game', wait: BOSS_WAIT_MS,
      query: { scene: 'Game', level: p.boss, t: Math.ceil(p.bossDuration + 3), god: 1 },
    })),
  ].filter((s) => !opts.only || s.name.toLowerCase().includes(opts.only.toLowerCase()));

  console.log(`Nova Corsair screenshots — ${server.url} (${server.mode}), ${shots.length} shots -> screens/`);
  browser = await launchBrowser();
  const context = await newMobileContext(browser, 2);
  const page = await context.newPage();
  const errors = collectErrors(page);
  let first = true;

  for (const shot of shots) {
    errors.take();
    const file = path.join(OUT_DIR, `${shot.name}.png`);
    try {
      await page.goto(gameUrl(server.url, { ...shot.query, mute: 1 }), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitForScene(page, shot.scene, first ? 60000 : 20000);
      first = false;
      await page.waitForTimeout(shot.wait);
      await page.screenshot({ path: file });
      written++;
      const errs = [...errors.take(), ...(await hookErrors(page)).map((m) => `__NC__.errors: ${m}`)];
      console.log(`  ok    ${shot.name}.png${errs.length ? `  (${errs.length} error(s): ${errs[0]})` : ''}`);
    } catch (e) {
      first = false;
      failures++;
      console.log(`  FAIL  ${shot.name}: ${String(e?.message ?? e).split('\n')[0]}`);
      await page.screenshot({ path: file }).catch(() => {}); // keep whatever is on screen for diagnosis
    }
  }
  await context.close();
} catch (e) {
  failures++;
  console.log(`  FAIL  harness: ${String(e?.stack ?? e)}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  await server.close().catch(() => {});
}

console.log(`\nScreens: ${written} written, ${failures} failed.`);
if (failures) process.exitCode = 1;
