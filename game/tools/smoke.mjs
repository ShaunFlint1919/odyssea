// Smoke test: boots every scene, then plays the first level of each planet in god mode.
// Fails (exit code 1) on any page error, console error, window.__NC__.errors entry, scene
// that never becomes ready, or a running level whose clock does not advance.
//
//   node tools/smoke.mjs [--port 4173] [--dist] [--only <substring>]
//   (--dist serves the production build from dist/ instead of the Vite dev server)
import {
  collectErrors, gameUrl, hookErrors, hooks, launchBrowser, loadCampaign, newMobileContext, parseArgs, startServer, waitForScene,
} from './harness.mjs';

const MENU_SCENES = ['Title', 'Map', 'Hangar', 'Shop', 'Specs', 'Options', 'Intel'];
const PLAY_MS = 6000;
const COLD_START_TIMEOUT = 60000;
const SCENE_TIMEOUT = 20000;

const opts = parseArgs();
const server = await startServer(opts);
const results = [];
let browser;

const pad = (s, n) => String(s).padEnd(n);
const fmt = (v) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(1) : '?');

try {
  const campaign = await loadCampaign(server);
  browser = await launchBrowser();
  const context = await newMobileContext(browser, 1);
  const page = await context.newPage();
  const errors = collectErrors(page);

  const checks = [
    ...MENU_SCENES.map((scene) => ({ name: scene, scene, query: { scene, mute: 1 } })),
    { name: `Game ${campaign[0].first}`, scene: 'Game', query: { scene: 'Game', level: campaign[0].first, god: 1, mute: 1 } },
    ...campaign.map((p) => ({
      name: `Play ${p.first}`, scene: 'Game', play: true,
      query: { scene: 'Game', level: p.first, god: 1, mute: 1, speed: 3 },
    })),
  ].filter((c) => !opts.only || c.name.toLowerCase().includes(opts.only.toLowerCase()));

  console.log(`Nova Corsair smoke test — ${server.url} (${server.mode}), ${checks.length} checks, levels from ${campaign[0].source}`);

  let first = true;
  for (const check of checks) {
    const t0 = Date.now();
    const res = { name: check.name, ok: true, warn: '', detail: '', errors: [] };
    errors.take();
    try {
      await page.goto(gameUrl(server.url, check.query), { waitUntil: 'domcontentloaded', timeout: COLD_START_TIMEOUT });
      await waitForScene(page, check.scene, first ? COLD_START_TIMEOUT : SCENE_TIMEOUT);
      first = false;
      res.detail = `ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`;
      if (check.play) {
        const a = await hooks(page);
        await page.waitForTimeout(PLAY_MS);
        const b = await hooks(page);
        const t1 = a?.state?.levelTime;
        const t2 = b?.state?.levelTime;
        const fps = b?.state?.fps;
        if (b && b.scene !== 'Game') {
          res.warn = `left the Game scene after ${PLAY_MS / 1000} s (now "${b.scene}")`;
        } else if (typeof t1 !== 'number' && typeof t2 !== 'number') {
          res.warn = 'no state.levelTime exposed (Game scene still a stub?)';
        } else if (!(typeof t1 === 'number' && typeof t2 === 'number' && t2 > t1)) {
          res.ok = false;
          res.detail = `levelTime did not advance (${fmt(t1)} -> ${fmt(t2)})`;
        } else {
          res.detail += `, levelTime ${fmt(t1)} -> ${fmt(t2)} s${typeof fps === 'number' ? `, ${fps.toFixed(0)} fps` : ''}`;
        }
      } else {
        await page.waitForTimeout(600); // run a few dozen frames: catches errors thrown by update()
      }
    } catch (e) {
      res.ok = false;
      res.detail = String(e?.message ?? e).split('\n')[0];
      first = false;
    }
    res.errors = [...errors.take(), ...(await hookErrors(page)).map((m) => `__NC__.errors: ${m}`)];
    if (res.errors.length) res.ok = false;
    results.push(res);
    const tag = !res.ok ? 'FAIL' : res.warn ? 'WARN' : 'PASS';
    console.log(`  ${pad(tag, 5)} ${pad(res.name, 22)} ${res.detail}${res.warn ? ` — ${res.warn}` : ''}`);
    for (const err of res.errors.slice(0, 8)) console.log(`        ${err}`);
    if (res.errors.length > 8) console.log(`        … ${res.errors.length - 8} more`);
  }
  await context.close();
} catch (e) {
  results.push({ name: 'harness', ok: false, warn: '', detail: String(e?.stack ?? e), errors: [] });
  console.log(`  FAIL  harness: ${String(e?.stack ?? e)}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  await server.close().catch(() => {});
}

const failed = results.filter((r) => !r.ok);
const warned = results.filter((r) => r.ok && r.warn);
console.log(`\nSmoke: ${results.length - failed.length}/${results.length} passed, ${failed.length} failed, ${warned.length} warnings.`);
if (failed.length) {
  console.log(`FAILED: ${failed.map((r) => r.name).join(', ')}`);
  process.exitCode = 1;
}
