#!/usr/bin/env node
// =====================================================================================
//  PLAYTEST — headless balance runner (owner: balance / content, docs/BALANCE.md §10).
//  Starts its own Vite dev server (--port, default 5211) and plays a list of levels in
//  Chromium (360x640) with `?scene=Game&level=<id>&mute=1&speed=<n>[&bot=1][&god=1]`:
//   - autopilot: the in-game bot (`?bot=1`, src/game/bot.ts) when it exists; its metrics
//     are read from window.__NC__.state (bossTime, bossKillTime, midbossKillTime,
//     damageTaken, hitsTaken, accuracy, creditsEarned, kills, spawned);
//   - fallback (no bot, or --driver): god mode + a built-in aim driver that steers the ship
//     under the boss / mid-boss / nearest enemy by overriding the scene's controls. God mode
//     never hurts the ship, so "damage" then counts the hits it WOULD have taken.
//  Timings always come from an in-page recorder that samples the scene every 50 ms (level
//  clock: boss entry, fight start, boss death, mid-boss spawn / kill / escape), so both
//  modes report the same columns.
//  Loadouts are injected by writing the save (localStorage 'nova-corsair.save.v1', see
//  src/state/save.ts) before the page loads:
//    --loadout start          the campaign start loadout (START_LOADOUT)
//    --loadout ref            the reference player's loadout BEFORE that level
//                             (referenceLoadout() of src/data/progression.ts)
//    --loadout '{"front":"lance_star","frontPower":3}'   JSON patch over START_LOADOUT
//    --set front=prism_shatter,frontPower=4,sidekickL=sk_shard   patch applied last
//  Examples:
//    node tools/playtest.mjs --levels kessra-1,kessra-2,kessra-3 --loadout ref --speed 3
//    node tools/playtest.mjs --levels thalassa-3,rift-3,axiom-3 --loadout ref --god
//    node tools/playtest.mjs --model          (prints the reference progression, no browser)
// =====================================================================================
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAVE_KEY = 'nova-corsair.save.v1';
const PLANET_IDS = ['kessra', 'verdance', 'thalassa', 'umbra', 'cinder', 'glacia', 'rift', 'axiom'];

// ------------------------------------------------------------------------------ options

const HELP = `node tools/playtest.mjs [options]
  --levels <ids>      comma list of level ids or planet ids (planet = its 3 levels); default kessra-1,kessra-2,kessra-3
  --loadout <spec>    start | ref | <JSON patch over the start loadout>           (default ref)
  --set k=v,...       loadout fields patched last (front, frontPower, rear, rearPower, hull, shield, generator, sidekickL, sidekickR)
  --speed <n>         gameplay time scale (default 3)
  --god               god mode (forced when the fallback driver is used)
  --driver            use the built-in aim driver even if the in-game bot exists
  --max               also pass &max=1 (999999 credits, every level unlocked)
  --difficulty <d>    easy | normal | hard (default normal)
  --seed <n>          RNG seed (default: the level seed); --runs <n> repeats with seed+1, seed+2 ...
  --runs <n>          runs per level (default 1)
  --timeout <s>       real seconds per run before giving up (default 900)
  --port <n>          dev server port (default 5211)
  --json <file>       also write the raw results as JSON
  --model             print the reference progression table (src/data/progression.ts) and exit
  --verbose           print progress while a run is going`;

function parseArgs(argv) {
  const o = {
    port: 5211, levels: 'kessra-1,kessra-2,kessra-3', loadout: 'ref', set: '', speed: 3, god: false, driver: false,
    max: false, difficulty: 'normal', seed: null, runs: 1, timeout: 900, json: '', model: false, verbose: false,
  };
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];
    let v = null;
    const eq = a.indexOf('=');
    if (a.startsWith('--') && eq > 0) { v = a.slice(eq + 1); a = a.slice(0, eq); }
    const val = () => (v !== null ? v : argv[++i]);
    switch (a) {
      case '--port': o.port = Number(val()); break;
      case '--levels': o.levels = String(val()); break;
      case '--loadout': o.loadout = String(val()); break;
      case '--set': o.set = String(val()); break;
      case '--speed': o.speed = Number(val()); break;
      case '--god': o.god = true; break;
      case '--driver': o.driver = true; break;
      case '--max': o.max = true; break;
      case '--difficulty': o.difficulty = String(val()); break;
      case '--seed': o.seed = Number(val()); break;
      case '--runs': o.runs = Math.max(1, Number(val()) | 0); break;
      case '--timeout': o.timeout = Number(val()); break;
      case '--json': o.json = String(val()); break;
      case '--model': o.model = true; break;
      case '--verbose': o.verbose = true; break;
      case '--help': case '-h': console.log(HELP); process.exit(0); break;
      default: throw new Error(`unknown option ${a} (see --help)`);
    }
  }
  if (!Number.isInteger(o.port) || o.port <= 0) throw new Error(`invalid --port ${o.port}`);
  if (!(o.speed > 0)) throw new Error(`invalid --speed ${o.speed}`);
  return o;
}

function expandLevels(spec) {
  const out = [];
  for (const part of spec.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (PLANET_IDS.includes(part)) out.push(`${part}-1`, `${part}-2`, `${part}-3`);
    else out.push(part);
  }
  return out;
}

/** "front=lance_star,frontPower=3,rear=null" -> partial loadout. */
function parseSet(spec) {
  const patch = {};
  for (const kv of spec.split(',').map((s) => s.trim()).filter(Boolean)) {
    const [k, raw] = kv.split('=');
    if (!k || raw === undefined) throw new Error(`bad --set entry "${kv}"`);
    patch[k] = raw === 'null' || raw === 'none' ? null : /Power$/.test(k) ? Number(raw) : raw;
  }
  return patch;
}

// ------------------------------------------------------------------------------ in-page code

/**
 * Init script (runs before the game): writes the save, then records the Game scene through
 * window.__NC__ (archives the last Game hook state when a result scene replaces it) and a
 * 50 ms sampler of the scene internals (boss / mid-boss timings, ship damage).
 */
function initScript({ saveKey, saveJson }) {
  try {
    if (saveJson) localStorage.setItem(saveKey, saveJson);
  } catch { /* storage blocked: the game falls back to a fresh save */ }
  const rec = {
    lastGame: null, bossEnterT: null, bossFightT: null, bossDeadT: null, bossMaxHp: null,
    midSpawnT: null, midEndT: null, midKilled: null, midHp: null, midMaxHp: null, midName: null,
    damage: 0, hits: 0, lastHull: null, levelTime: 0, phase: '', frontPower: null, deathT: null, driver: false, err: '',
  };
  window.__PT__ = rec;
  let hooks;
  Object.defineProperty(window, '__NC__', {
    configurable: true,
    get() { return hooks; },
    set(h) {
      hooks = h;
      let cur = h.state;
      Object.defineProperty(h, 'state', {
        configurable: true,
        enumerable: true,
        get() { return cur; },
        set(v) {
          if (cur && typeof cur === 'object' && 'levelTime' in cur) rec.lastGame = { ...cur };
          cur = v;
        },
      });
    },
  });
  let midRef = null, midSerial = -1;
  const sample = () => {
    try {
      const h = hooks;
      if (!h || !h.game || h.scene !== 'Game') return;
      const sc = h.game.scene.getScene('Game');
      const w = sc && sc.w;
      if (!w || !sc.ship) return;
      const t = w.time;
      rec.levelTime = t;
      rec.phase = sc.flow ? sc.flow.phase : '';
      if (sc.arsenal) rec.frontPower = sc.arsenal.frontPower;
      const b = w.boss;
      if (b) {
        if (b.state === 'enter' && rec.bossEnterT === null) rec.bossEnterT = t;
        if (b.state === 'fight' && rec.bossFightT === null) { rec.bossFightT = t; rec.bossMaxHp = b.maxHp; }
        if ((b.state === 'dying' || b.state === 'dead') && rec.bossDeadT === null) rec.bossDeadT = t;
      }
      const m = w.enemies ? w.enemies.midboss : null;
      if (m && m.active && midRef === null) {
        midRef = m;
        midSerial = m.serial;
        rec.midSpawnT = t;
        rec.midMaxHp = m.maxHp;
        rec.midName = m.def ? m.def.name : '';
      }
      if (midRef !== null && rec.midEndT === null) {
        if (!midRef.active || midRef.serial !== midSerial) {
          rec.midEndT = t;
          rec.midKilled = midRef.serial !== midSerial ? (rec.midHp !== null && rec.midHp < rec.midMaxHp * 0.12) : midRef.hp <= 0;
        } else {
          rec.midHp = midRef.hp;
        }
      }
      if (!sc.ship.alive && rec.deathT === null) rec.deathT = t;
      if (w.stats) { rec.kills = w.stats.kills; rec.spawned = w.stats.spawned; rec.credits = w.stats.credits; }
      // the gameplay RunMetrics (src/game/world.ts), when this build has them
      if (w.metrics && typeof w.metrics === 'object') rec.metrics = { ...w.metrics };
      // count the hits the ship takes (also "would-be" hits in god mode): wrap Ship.hit once
      if (!sc.ship.__ptWrapped) {
        const ship = sc.ship;
        const orig = ship.hit.bind(ship);
        ship.hit = (amount, hx, hy) => {
          if (ship.hittable && amount > 0) { rec.damage += amount; rec.hits++; }
          orig(amount, hx, hy);
        };
        ship.__ptWrapped = true;
      }
    } catch (e) {
      rec.err = String(e && e.message ? e.message : e);
    }
  };
  setInterval(sample, 50);
}

/**
 * Fallback aim driver: overrides the Game scene's controls so the ship stays low on the
 * playfield, keeps firing and slides under the boss, the mid-boss, else the most urgent
 * enemy above it (no dodging: use it with god mode).
 */
function installDriver() {
  const rec = window.__PT__;
  const sc = window.__NC__.game.scene.getScene('Game');
  if (!sc || !sc.controls || !sc.ship || !sc.w) throw new Error('Game scene internals not found');
  const ctl = sc.controls;
  const orig = ctl.update.bind(ctl);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  ctl.update = () => {
    const s = orig();
    const w = sc.w, ship = sc.ship;
    const H = sc.scale ? sc.scale.height : 568;
    let tx = 132;
    const ty = H * 0.8;
    const boss = w.boss;
    const mid = w.enemies.midboss;
    if (boss && (boss.state === 'fight' || boss.state === 'enter')) tx = boss.x;
    else if (mid && mid.active && mid.y > 0) tx = mid.x;
    else {
      let best = null, bestScore = -1e9;
      for (const e of w.enemies.list) {
        if (!e.active || !e.entered || e.y < 4 || e.y > ship.y - 30) continue;
        const score = e.y - Math.abs(e.x - ship.x) * 0.8;
        if (score > bestScore) { bestScore = score; best = e; }
      }
      if (best) tx = best.x;
    }
    s.moveX = clamp((tx - ship.x) / 8, -1, 1);
    s.moveY = clamp((ty - ship.y) / 8, -1, 1);
    s.dragDX = 0;
    s.dragDY = 0;
    s.firing = true;
    return s;
  };
  rec.driver = true;
  return true;
}

/** Snapshot read by node while a run is going. */
function readRun() {
  const h = window.__NC__;
  const rec = window.__PT__ || {};
  const live = h && h.scene === 'Game' ? { ...h.state } : null;
  return { scene: h ? h.scene : '', ready: h ? h.ready : false, live, rec: { ...rec }, errors: h ? h.errors.slice(0, 5) : [] };
}

// ------------------------------------------------------------------------------ runs

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const fmt = (v, d = 1) => (v === null || v === undefined ? '-' : typeof v === 'number' ? v.toFixed(d) : String(v));

async function runOne(browser, baseUrl, levelId, save, o, useBot, seed) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const pageErrors = [];
  try {
    await ctx.addInitScript(initScript, { saveKey: SAVE_KEY, saveJson: save ? JSON.stringify(save) : '' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => pageErrors.push(String(e && e.message ? e.message : e).split('\n')[0]));
    const god = o.god || !useBot;
    const q = new URLSearchParams({ scene: 'Game', level: levelId, mute: '1', speed: String(o.speed) });
    if (useBot) q.set('bot', '1');
    if (god) q.set('god', '1');
    if (o.max) q.set('max', '1');
    if (seed !== null) q.set('seed', String(seed));
    const url = `${baseUrl}?${q.toString()}`;
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__NC__ && window.__NC__.ready && window.__NC__.scene === 'Game', null, { timeout: 120000 });
    if (!useBot) await page.evaluate(installDriver);
    const t0 = Date.now();
    let snap = null;
    let lastLog = 0;
    for (;;) {
      await page.waitForTimeout(500);
      snap = await page.evaluate(readRun);
      const done = snap.scene !== 'Game' || (snap.live && snap.live.done);
      if (done) {
        await page.waitForTimeout(300);
        snap = await page.evaluate(readRun);
        break;
      }
      const el = (Date.now() - t0) / 1000;
      if (o.verbose && el - lastLog >= 15) {
        lastLog = el;
        const r = snap.rec;
        console.log(`  .. ${levelId} t=${fmt(r.levelTime)} phase=${r.phase} power=${r.frontPower} bossHp=${snap.live ? snap.live.bossHp : '-'} (${el.toFixed(0)} s real)`);
      }
      if (el > o.timeout) {
        snap.timedOut = true;
        break;
      }
    }
    return summarize(levelId, snap, useBot, god, seed, pageErrors);
  } finally {
    await ctx.close();
  }
}

/** One result row from the recorder (+ the bot's own metrics when it provides them). */
function summarize(levelId, snap, useBot, god, seed, pageErrors) {
  const rec = snap.rec || {};
  const st = snap.live || rec.lastGame || {};
  const pick = (...keys) => {
    for (const k of keys) {
      const v = num(st[k]);
      if (v !== null) return v;
    }
    return null;
  };
  const m = rec.metrics || null;
  const mv = (k) => (m && num(m[k]) !== null && m[k] >= 0 ? m[k] : null);
  // boss fight = from the end of its (invulnerable) entrance to its death
  const bossKill = rec.bossFightT !== null && rec.bossDeadT !== null ? rec.bossDeadT - rec.bossFightT : null;
  const midKill = rec.midSpawnT !== null && rec.midEndT !== null && rec.midKilled ? rec.midEndT - rec.midSpawnT : null;
  const mMid = mv('midbossStartT') !== null && mv('midbossKillT') !== null ? m.midbossKillT - m.midbossStartT : null;
  const row = {
    level: levelId,
    mode: useBot ? (god ? 'bot+god' : 'bot') : 'driver+god',
    seed,
    completed: st.completed === true || rec.phase === 'clear' || rec.phase === 'done',
    timedOut: !!snap.timedOut,
    died: rec.deathT !== null,
    wouldDie: m && num(m.wouldDie) !== null ? m.wouldDie : null,
    time: num(rec.levelTime),
    bossAt: rec.bossFightT,
    bossKill: bossKill ?? pick('bossKillTime'),
    bossHp: rec.bossMaxHp,
    midKill: midKill ?? mMid ?? pick('midbossKillTime'),
    midEscaped: (rec.midEndT !== null && rec.midKilled === false) || !!(m && m.midbossEscaped && mv('midbossKillT') === null),
    midHp: rec.midMaxHp,
    kills: num(rec.kills) ?? pick('kills'),
    spawned: num(rec.spawned) ?? pick('spawned'),
    credits: pick('creditsEarned') ?? num(rec.credits) ?? pick('credits'),
    damage: m && num(m.damageTaken) !== null ? m.damageTaken : pick('damageTaken') ?? rec.damage,
    armorDamage: m && num(m.armorDamage) !== null ? m.armorDamage : null,
    hits: m && num(m.hitsTaken) !== null ? m.hitsTaken : pick('hitsTaken') ?? rec.hits,
    accuracy: pick('accuracy'),
    dealt: m && num(m.damageDealt) !== null ? m.damageDealt : null,
    frontPower: rec.frontPower,
    errors: [...(snap.errors || []), ...pageErrors, ...(rec.err ? [`recorder: ${rec.err}`] : [])],
  };
  return row;
}

function printTable(rows) {
  const head = ['level', 'mode', 'result', 'time', 'boss@', 'bossKill', 'midKill', 'kills/spawned', 'credits', 'dmg', 'armor', 'hits', 'wouldDie', 'acc', 'pow'];
  const lines = rows.map((r) => [
    r.level,
    r.mode,
    r.timedOut ? 'TIMEOUT' : r.died ? 'DEATH' : r.completed ? 'clear' : 'fail',
    fmt(r.time),
    fmt(r.bossAt),
    r.bossKill !== null ? `${fmt(r.bossKill)} s` : '-',
    r.midKill !== null ? `${fmt(r.midKill)} s` : r.midEscaped ? 'escaped' : '-',
    r.kills !== null && r.spawned !== null ? `${r.kills}/${r.spawned} (${Math.round((100 * r.kills) / Math.max(1, r.spawned))}%)` : '-',
    fmt(r.credits, 0),
    fmt(r.damage, 0),
    fmt(r.armorDamage, 0),
    fmt(r.hits, 0),
    fmt(r.wouldDie, 0),
    r.accuracy !== null ? `${Math.round(r.accuracy * (r.accuracy <= 1 ? 100 : 1))}%` : '-',
    fmt(r.frontPower, 0),
  ]);
  const widths = head.map((h, i) => Math.max(h.length, ...lines.map((l) => String(l[i]).length)));
  const line = (cells) => cells.map((c, i) => String(c).padEnd(widths[i])).join('  ');
  console.log(line(head));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const l of lines) console.log(line(l));
  for (const r of rows) for (const e of r.errors) console.log(`  ! ${r.level}: ${e}`);
}

// ------------------------------------------------------------------------------ model table

function printModel(data) {
  if (typeof data.referenceProgression !== 'function') {
    console.log('src/data has no referenceProgression() yet');
    return;
  }
  const steps = data.referenceProgression();
  const head = ['level', 'value', 'income', 'hull', 'front', 'side L/R', 'rear', 'gen', 'shield', 'DPS', 'fight', 'e/s use/out', 'boss hp', 'boss TTK', 'mid hp', 'mid TTK'];
  const rows = steps.map((s) => [
    s.levelId,
    String(Math.round(s.value)),
    String(Math.round(s.income)),
    s.loadout.hull,
    `${s.loadout.front} p${s.loadout.frontPower}`,
    `${s.loadout.sidekickL ?? '-'}/${s.loadout.sidekickR ?? '-'}`,
    s.loadout.rear ? `${s.loadout.rear} p${s.loadout.rearPower}` : '-',
    s.loadout.generator,
    s.loadout.shield,
    s.dps.toFixed(0),
    s.fightDps.toFixed(0),
    `${s.energyUse.toFixed(1)}/${s.energyOut.toFixed(0)}`,
    s.bossHp ? String(s.bossHp) : '',
    s.bossTtk ? `${s.bossTtk.toFixed(0)} s` : '',
    s.midbossHp ? String(s.midbossHp) : '',
    s.midbossTtk ? `${s.midbossTtk.toFixed(0)} s` : '',
  ]);
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (c) => c.map((x, i) => x.padEnd(widths[i])).join('  ');
  console.log(line(head));
  for (const r of rows) console.log(line(r));
}

// ------------------------------------------------------------------------------ main

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const server = await createServer({
    root: ROOT, logLevel: 'warn', clearScreen: false,
    server: { port: o.port, strictPort: true, host: '127.0.0.1', hmr: false },
  });
  let browser = null;
  try {
    const data = await server.ssrLoadModule('/src/data/index.ts');
    if (o.model) {
      printModel(data);
      return;
    }
    await server.listen();
    const baseUrl = `http://127.0.0.1:${o.port}/`;
    const levels = expandLevels(o.levels);
    const known = new Set((data.LEVELS ?? []).map((l) => l.id));
    for (const id of levels) if (!known.has(id)) throw new Error(`unknown level ${id}`);
    const botFile = existsSync(path.join(ROOT, 'src/game/bot.ts'));
    const useBot = botFile && !o.driver;
    if (!useBot) {
      console.log(botFile
        ? 'driver: built-in aim driver (--driver), god mode forced'
        : 'driver: src/game/bot.ts not found -> built-in aim driver, god mode forced (no dodging: damage = hits it would have taken)');
    }
    const order = typeof data.levelOrder === 'function' ? data.levelOrder() : [...known];
    const patch = o.set ? parseSet(o.set) : {};
    browser = await chromium.launch({
      args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required',
        '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
    });
    const rows = [];
    for (const levelId of levels) {
      let loadout = { ...data.START_LOADOUT };
      if (o.loadout === 'ref') {
        if (typeof data.referenceLoadout !== 'function') throw new Error('src/data has no referenceLoadout()');
        loadout = { ...data.referenceLoadout(levelId) };
      } else if (o.loadout !== 'start') {
        loadout = { ...loadout, ...JSON.parse(o.loadout) };
      }
      loadout = { ...loadout, ...patch };
      const idx = order.indexOf(levelId);
      const done = order.slice(0, Math.max(0, idx));
      const save = {
        version: 1, createdAt: Date.now(), credits: 0, score: 0, difficulty: o.difficulty, loadout,
        unlockedLevels: order.slice(0, idx + 1), completedLevels: done, bestScores: {}, intel: [], intelRead: [],
        currentLevel: levelId, stats: { kills: 0, deaths: 0, playSeconds: 0, creditsEarned: 0 },
        settings: { sfx: 0, music: 0, shake: false, vibrate: false, autofire: true, touchSensitivity: 1.2, showFps: false },
      };
      for (let k = 0; k < o.runs; k++) {
        const seed = o.seed !== null ? o.seed + k : k > 0 ? k : null;
        const lo = loadout;
        console.log(`> ${levelId}${seed !== null ? ` seed ${seed}` : ''}: ${lo.hull} | ${lo.front} p${lo.frontPower} | rear ${lo.rear ?? '-'}${lo.rear ? ` p${lo.rearPower}` : ''} | ${lo.sidekickL ?? '-'} / ${lo.sidekickR ?? '-'} | ${lo.shield} | ${lo.generator}`);
        const row = await runOne(browser, baseUrl, levelId, save, o, useBot, seed);
        row.loadout = lo;
        rows.push(row);
      }
    }
    console.log('');
    printTable(rows);
    if (o.json) writeFileSync(o.json, JSON.stringify(rows, null, 2));
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

main().catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
