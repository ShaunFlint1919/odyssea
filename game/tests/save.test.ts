// Save persistence: fake localStorage, forward-compatible deep merge, sanitising, debounce.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HULLS, START_CREDITS, START_LOADOUT, WEAPONS, levelOrder } from '../src/data';
import { MAX_POWER } from '../src/config';

type SaveModule = typeof import('../src/state/save');

/** Minimal Storage implementation backed by a Map (counts writes). */
class FakeStorage implements Storage {
  private map = new Map<string, string>();
  writes = 0;
  get length(): number { return this.map.size; }
  clear(): void { this.map.clear(); }
  getItem(key: string): string | null { return this.map.has(key) ? (this.map.get(key) as string) : null; }
  key(index: number): string | null { return [...this.map.keys()][index] ?? null; }
  removeItem(key: string): void { this.map.delete(key); }
  setItem(key: string, value: string): void { this.writes++; this.map.set(key, String(value)); }
}

/** A storage whose every access throws (disabled storage / quota exceeded). */
class ThrowingStorage extends FakeStorage {
  override getItem(): string | null { throw new Error('SecurityError'); }
  override setItem(): void { throw new Error('QuotaExceededError'); }
  override removeItem(): void { throw new Error('SecurityError'); }
}

let store: FakeStorage;

/** Fresh copy of the save module (module-level state reset). */
async function freshModule(): Promise<SaveModule> {
  vi.resetModules();
  return import('../src/state/save');
}

beforeEach(() => {
  store = new FakeStorage();
  vi.stubGlobal('localStorage', store);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('save without storage (node)', () => {
  it('works when localStorage does not exist at all', async () => {
    vi.unstubAllGlobals();
    expect((globalThis as { localStorage?: unknown }).localStorage).toBeUndefined();
    const m = await freshModule();
    expect(m.loadSave().credits).toBe(START_CREDITS);
    expect(() => m.saveNow()).not.toThrow();
    expect(m.hasSaveGame()).toBe(false);
    expect(m.storageAvailable()).toBe(false);
    m.newGame('hard');
    expect(m.getSave().difficulty).toBe('hard');
  });

  it('survives a storage that throws on every access', async () => {
    vi.stubGlobal('localStorage', new ThrowingStorage());
    const m = await freshModule();
    expect(() => m.loadSave()).not.toThrow();
    expect(() => m.newGame()).not.toThrow();
    expect(() => m.saveNow()).not.toThrow();
    expect(m.storageAvailable()).toBe(false);
  });
});

describe('new game', () => {
  it('starts with the start credits, start loadout and the first level unlocked', async () => {
    const m = await freshModule();
    const s = m.newGame('easy');
    expect(s.version).toBe(1);
    expect(s.credits).toBe(START_CREDITS);
    expect(s.loadout).toEqual(START_LOADOUT);
    expect(s.difficulty).toBe('easy');
    const first = levelOrder()[0];
    if (first) {
      expect(s.unlockedLevels).toEqual([first]);
      expect(s.currentLevel).toBe(first);
      expect(m.hasSaveGame()).toBe(true);
    } else {
      expect(s.unlockedLevels).toEqual([]);
    }
    // persisted immediately
    expect(store.getItem(m.SAVE_KEY)).not.toBeNull();
  });

  it('keeps the settings and does not share the loadout object with START_LOADOUT', async () => {
    const m = await freshModule();
    m.updateSettings({ music: 0.1, autofire: false });
    const s = m.newGame();
    expect(s.settings.music).toBeCloseTo(0.1);
    expect(s.settings.autofire).toBe(false);
    s.loadout.frontPower = 5;
    expect(START_LOADOUT.frontPower).toBe(1);
  });
});

describe('persistence round trip', () => {
  it('reloads exactly what was saved', async () => {
    const a = await freshModule();
    const s = a.newGame('hard');
    s.credits = 4321;
    s.score = 999;
    s.loadout.frontPower = 4;
    s.bestScores.foo = 1200;
    a.saveNow();

    const b = await freshModule();
    expect(b.getSave().credits).toBe(START_CREDITS); // not loaded yet
    const loaded = b.loadSave();
    expect(loaded.credits).toBe(4321);
    expect(loaded.score).toBe(999);
    expect(loaded.difficulty).toBe('hard');
    expect(loaded.loadout.frontPower).toBe(4);
    expect(b.hasSaveGame()).toBe(levelOrder().length > 0);
  });

  it('hasSaveGame() is false when only settings were stored', async () => {
    const a = await freshModule();
    a.loadSave();
    a.updateSettings({ sfx: 0.3 });
    a.flushSave();
    const b = await freshModule();
    b.loadSave();
    expect(b.hasSaveGame()).toBe(false);
    expect(b.getSave().settings.sfx).toBeCloseTo(0.3);
  });

  it('eraseSave() removes the campaign but keeps settings', async () => {
    const m = await freshModule();
    m.newGame();
    m.updateSettings({ shake: false });
    m.eraseSave();
    expect(m.hasSaveGame()).toBe(false);
    expect(m.getSave().settings.shake).toBe(false);
    const again = await freshModule();
    again.loadSave();
    expect(again.hasSaveGame()).toBe(false);
  });
});

describe('forward-compatible loading', () => {
  it('deep-merges an old / partial save over the defaults and keeps unknown fields', async () => {
    const order = levelOrder();
    const partial = {
      version: 1,
      credits: 777,
      unlockedLevels: order.slice(0, 1),
      currentLevel: order[0] ?? '',
      settings: { music: 0.25 },          // other settings missing
      futureFeature: { enabled: true },   // written by a newer version
    };
    store.setItem('nova-corsair.save.v1', JSON.stringify(partial));
    const m = await freshModule();
    const s = m.loadSave();
    expect(s.credits).toBe(777);
    expect(s.settings.music).toBeCloseTo(0.25);
    expect(s.settings.sfx).toBe(m.DEFAULT_SETTINGS.sfx);
    expect(s.settings.touchSensitivity).toBe(m.DEFAULT_SETTINGS.touchSensitivity);
    expect(s.stats).toEqual({ kills: 0, deaths: 0, playSeconds: 0, creditsEarned: 0 });
    expect(s.loadout).toEqual(START_LOADOUT);
    expect(Array.isArray(s.intel)).toBe(true);
    // unknown data survives a re-save
    m.saveNow();
    const raw = JSON.parse(store.getItem(m.SAVE_KEY) as string);
    expect(raw.futureFeature).toEqual({ enabled: true });
  });

  it('sanitises invalid values', async () => {
    store.setItem('nova-corsair.save.v1', JSON.stringify({
      credits: -50,
      score: 'lots',
      difficulty: 'nightmare',
      loadout: { frontPower: 99, rear: null, rearPower: 7 },
      unlockedLevels: [42, null],
      settings: { sfx: 3, music: -1, touchSensitivity: 9, vibrate: 'yes' },
      stats: { kills: -3, playSeconds: Number.MAX_VALUE },
    }));
    const m = await freshModule();
    const s = m.loadSave();
    expect(s.credits).toBe(0);
    expect(s.score).toBe(0);
    expect(s.difficulty).toBe('normal');
    expect(s.loadout.frontPower).toBe(MAX_POWER);
    expect(s.loadout.rearPower).toBe(1); // no rear weapon -> power 1
    expect(s.unlockedLevels).toEqual([]);
    expect(s.settings.sfx).toBe(1);
    expect(s.settings.music).toBe(0);
    expect(s.settings.touchSensitivity).toBe(2);
    expect(s.settings.vibrate).toBe(m.DEFAULT_SETTINGS.vibrate);
    expect(s.stats.kills).toBe(0);
  });

  it.skipIf(HULLS.length === 0 || WEAPONS.length === 0)('replaces ids the catalogue no longer knows', async () => {
    store.setItem('nova-corsair.save.v1', JSON.stringify({
      loadout: { hull: 'no_such_hull', front: 'no_such_gun', frontPower: 6, rear: 'no_such_rear', rearPower: 4, sidekickL: 'nope', sidekickR: null },
    }));
    const m = await freshModule();
    const l = m.loadSave().loadout;
    expect(l.hull).toBe(START_LOADOUT.hull);
    expect(l.front).toBe(START_LOADOUT.front);
    expect(l.frontPower).toBe(1);
    expect(l.rear).toBeNull();
    expect(l.rearPower).toBe(1);
    expect(l.sidekickL).toBeNull();
  });

  it('falls back to defaults on corrupt JSON and keeps a backup copy', async () => {
    store.setItem('nova-corsair.save.v1', '{not json');
    const m = await freshModule();
    const s = m.loadSave();
    expect(s.credits).toBe(START_CREDITS);
    expect(m.hasSaveGame()).toBe(false);
    expect(store.getItem('nova-corsair.save.v1.corrupt')).toBe('{not json');
  });
});

describe('debounced writes', () => {
  it('coalesces bursts of updateSettings into one write; saveNow / flushSave write immediately', async () => {
    vi.useFakeTimers();
    const m = await freshModule();
    m.loadSave();
    const before = store.writes;
    for (let i = 0; i < 20; i++) m.updateSettings({ sfx: i / 20 });
    expect(store.writes).toBe(before);
    expect(m.hasPendingSave()).toBe(true);
    vi.advanceTimersByTime(m.SAVE_DEBOUNCE_MS + 10);
    expect(store.writes).toBe(before + 1);
    expect(m.hasPendingSave()).toBe(false);
    expect(JSON.parse(store.getItem(m.SAVE_KEY) as string).settings.sfx).toBeCloseTo(19 / 20);

    m.updateSettings({ music: 0.5 });
    m.flushSave();
    expect(store.writes).toBe(before + 2);
    m.flushSave(); // nothing pending -> no write
    expect(store.writes).toBe(before + 2);

    m.scheduleSave();
    m.saveNow(); // cancels the pending timer
    vi.advanceTimersByTime(m.SAVE_DEBOUNCE_MS * 2);
    expect(store.writes).toBe(before + 3);
  });

  it('updateSettings mutates the settings object in place and clamps values', async () => {
    const m = await freshModule();
    const ref = m.getSave().settings;
    m.updateSettings({ touchSensitivity: 0.1, music: 0.4 });
    expect(m.getSave().settings).toBe(ref);
    expect(ref.touchSensitivity).toBe(0.8);
    expect(ref.music).toBeCloseTo(0.4);
  });
});
