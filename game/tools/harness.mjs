// Shared Playwright / Vite harness for tools/smoke.mjs and tools/screens.mjs.
// - Starts its own server: Vite dev server (default) or `vite preview` of the built dist/ (--dist).
// - Reads the level catalogue in node through Vite's SSR loader (falls back to the fixed
//   planet ids of docs/ARCHITECTURE.md while the catalogue is still empty).
// - Collects page errors, console errors and window.__NC__.errors per check.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, preview } from 'vite';
import { chromium } from 'playwright';

export const GAME_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Fixed campaign planet ids (docs/ARCHITECTURE.md), used when the catalogue cannot be read. */
export const FALLBACK_PLANETS = ['kessra', 'verdance', 'thalassa', 'umbra', 'cinder', 'glacia', 'rift', 'axiom'];
const FALLBACK_DURATION = 90;

/** Parses --port <n> (or PORT env, default 4173), --dist, --only <substring>. */
export function parseArgs(argv = process.argv.slice(2)) {
  const opts = { port: Number(process.env.PORT) || 4173, dist: false, only: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port') opts.port = Number(argv[++i]);
    else if (a.startsWith('--port=')) opts.port = Number(a.slice(7));
    else if (a === '--dist') opts.dist = true;
    else if (a === '--only') opts.only = String(argv[++i] ?? '');
    else if (a.startsWith('--only=')) opts.only = a.slice(7);
    else if (a === '--help' || a === '-h') {
      console.log('options: --port <n> (default $PORT or 4173)  --dist (serve built dist/)  --only <substring>');
      process.exit(0);
    }
  }
  if (!Number.isInteger(opts.port) || opts.port <= 0) throw new Error(`invalid --port "${opts.port}"`);
  return opts;
}

/**
 * Starts the server the browser will load the game from.
 * @returns {Promise<{ url: string, mode: string, close: () => Promise<void>, ssr: (id: string) => Promise<any> }>}
 */
export async function startServer({ port, dist }) {
  if (dist) {
    if (!existsSync(path.join(GAME_ROOT, 'dist', 'index.html'))) throw new Error('dist/index.html not found: run `npm run build` first');
    const server = await preview({ root: GAME_ROOT, logLevel: 'warn', preview: { port, strictPort: true, host: '127.0.0.1', open: false } });
    return {
      url: `http://127.0.0.1:${port}/`,
      mode: 'dist',
      close: () => server.close(),
      ssr: async (id) => {
        // The preview server cannot load sources: use a throw-away middleware-mode dev server.
        const loader = await createServer({
          root: GAME_ROOT, logLevel: 'error', appType: 'custom',
          server: { middlewareMode: true, hmr: false, watch: null },
          optimizeDeps: { noDiscovery: true, include: [] },
        });
        try { return await loader.ssrLoadModule(id); } finally { await loader.close(); }
      },
    };
  }
  // hmr off: concurrent source edits must not reload a page in the middle of a check.
  const server = await createServer({ root: GAME_ROOT, logLevel: 'warn', server: { port, strictPort: true, host: '127.0.0.1', hmr: false } });
  await server.listen();
  return { url: `http://127.0.0.1:${port}/`, mode: 'dev', close: () => server.close(), ssr: (id) => server.ssrLoadModule(id) };
}

/**
 * Campaign structure for the checks: [{ id, first, boss, bossDuration }] per planet.
 * `first` = first level id, `boss` = level holding the planet boss (level 3), `bossDuration` = its wave duration (s).
 */
export async function loadCampaign(server) {
  try {
    const data = await server.ssr('/src/data/index.ts');
    const planets = Array.isArray(data.PLANETS) ? data.PLANETS : [];
    const levels = new Map((Array.isArray(data.LEVELS) ? data.LEVELS : []).map((l) => [l.id, l]));
    const out = planets
      .filter((p) => Array.isArray(p.levels) && p.levels.length > 0)
      .map((p) => {
        const bossId = p.levels.find((id) => levels.get(id)?.boss) ?? p.levels[p.levels.length - 1];
        const d = levels.get(bossId)?.duration;
        return { id: p.id, first: p.levels[0], boss: bossId, bossDuration: Number.isFinite(d) ? d : FALLBACK_DURATION, source: 'catalogue' };
      });
    if (out.length > 0) return out;
  } catch (e) {
    console.warn(`[harness] could not read the catalogue (${String(e?.message ?? e).split('\n')[0]}); using fixed planet ids`);
  }
  return FALLBACK_PLANETS.map((id) => ({ id, first: `${id}-1`, boss: `${id}-3`, bossDuration: FALLBACK_DURATION, source: 'fallback' }));
}

/** Headless Chromium with software WebGL allowed (CI runners have no GPU). */
export function launchBrowser() {
  return chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
}

/** Mobile portrait context (360x640, touch). */
export function newMobileContext(browser, deviceScaleFactor) {
  return browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor, hasTouch: true, isMobile: true });
}

const IGNORED_CONSOLE = [
  /favicon\.ico/i,
  // Chrome intervention logged when Phaser's TouchManager calls preventDefault() on a touchcancel
  // (never cancelable): harmless, and any check that cancels a touch would otherwise fail on it.
  /^Ignored attempt to cancel a touchcancel event with cancelable=false, for example because scrolling is in progress and cannot be interrupted\.$/,
];

/** Attaches error collectors to a page. `take()` returns and clears the errors collected so far. */
export function collectErrors(page) {
  let errors = [];
  page.on('pageerror', (e) => {
    const stack = typeof e?.stack === 'string' ? e.stack.split('\n').slice(0, 3).join(' | ') : '';
    const msg = typeof e?.message === 'string' ? e.message : '';
    errors.push(`pageerror: ${stack || msg || String(e) || '(error without message — usually a module that failed to load)'}`);
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (IGNORED_CONSOLE.some((r) => r.test(text))) return;
    const loc = m.location();
    errors.push(`console.error: ${text}${loc?.url ? ` (${loc.url.replace(/^https?:\/\/[^/]+/, '')}:${loc.lineNumber})` : ''}`);
  });
  page.on('crash', () => errors.push('page crashed'));
  return {
    take() {
      const out = errors;
      errors = [];
      return out;
    },
  };
}

/** Errors recorded by the game itself (window.__NC__.errors). */
export async function hookErrors(page) {
  try {
    return await page.evaluate(() => (window.__NC__ && Array.isArray(window.__NC__.errors) ? window.__NC__.errors.slice() : []));
  } catch {
    return [];
  }
}

/** Current window.__NC__ snapshot ({ ready, scene, state }) or null. */
export async function hooks(page) {
  try {
    return await page.evaluate(() => {
      const h = window.__NC__;
      if (!h) return null;
      let state = {};
      try { state = JSON.parse(JSON.stringify(h.state ?? {})); } catch { state = {}; }
      return { ready: !!h.ready, scene: String(h.scene ?? ''), state };
    });
  } catch {
    return null;
  }
}

/**
 * Waits until window.__NC__.ready && window.__NC__.scene === scene. Survives page reloads
 * (e.g. Vite re-optimising dependencies on a cold start). Throws a descriptive error on timeout.
 */
export async function waitForScene(page, scene, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const left = deadline - Date.now();
    if (left <= 0) break;
    try {
      await page.waitForFunction((s) => !!window.__NC__ && window.__NC__.ready === true && window.__NC__.scene === s, scene, { timeout: left, polling: 100 });
      return;
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (/Timeout/i.test(msg)) break;
      if (/context was destroyed|navigation|Target closed/i.test(msg)) { await page.waitForTimeout(200).catch(() => {}); continue; }
      throw e;
    }
  }
  const h = await hooks(page);
  throw new Error(`timeout after ${timeoutMs} ms waiting for scene "${scene}" (current: ${h ? `"${h.scene}", ready=${h.ready}` : 'window.__NC__ missing'})`);
}

/** Builds a game URL from a query object (null / undefined values are skipped). */
export function gameUrl(base, query) {
  const qs = Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v === true ? '1' : String(v))}`).join('&');
  return qs ? `${base}?${qs}` : base;
}
