// Platform glue (web / node side): back-button handler stack, app-state events, haptics opt-out.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const audioMock = vi.hoisted(() => ({
  unlock: vi.fn(), sfx: vi.fn(), music: vi.fn(), setVolumes: vi.fn(), suspend: vi.fn(), resume: vi.fn(),
}));
vi.mock('../src/audio', () => ({ audio: audioMock }));

type Device = typeof import('../src/platform/device');

/** Minimal document with visibility events. */
class FakeDocument {
  visibilityState: 'visible' | 'hidden' = 'visible';
  private listeners = new Map<string, (() => void)[]>();
  addEventListener(type: string, cb: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), cb]);
  }
  removeEventListener(): void {}
  setVisible(visible: boolean): void {
    this.visibilityState = visible ? 'visible' : 'hidden';
    for (const cb of this.listeners.get('visibilitychange') ?? []) cb();
  }
}

async function freshDevice(): Promise<Device> {
  vi.resetModules();
  return import('../src/platform/device');
}

beforeEach(() => {
  audioMock.suspend.mockClear();
  audioMock.resume.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('back button stack', () => {
  it('is not native in node and nothing consumes the press by default', async () => {
    const d = await freshDevice();
    expect(d.isNative()).toBe(false);
    expect(d.dispatchBackButton()).toBe(false);
  });

  it('asks the latest handler first, falls through on false, and unsubscribes', async () => {
    const d = await freshDevice();
    const calls: string[] = [];
    const offA = d.pushBackHandler(() => { calls.push('A'); return true; });
    const offB = d.pushBackHandler(() => { calls.push('B'); return false; });
    const offC = d.pushBackHandler(() => { calls.push('C'); return true; });
    expect(d.dispatchBackButton()).toBe(true);
    expect(calls).toEqual(['C']);
    offC();
    calls.length = 0;
    expect(d.dispatchBackButton()).toBe(true);
    expect(calls).toEqual(['B', 'A']);
    offA();
    offB();
    offB(); // idempotent
    expect(d.dispatchBackButton()).toBe(false);
  });

  it('survives a throwing handler', async () => {
    const d = await freshDevice();
    d.onBackButton(() => true);
    d.pushBackHandler(() => { throw new Error('boom'); });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(d.dispatchBackButton()).toBe(true);
    warn.mockRestore();
  });
});

describe('app state', () => {
  it('reports background / foreground once per change and drives audio', async () => {
    const doc = new FakeDocument();
    vi.stubGlobal('document', doc);
    const d = await freshDevice();
    const seen: boolean[] = [];
    const off = d.addAppStateListener((active) => seen.push(active));
    d.onAppStateChange(() => undefined);
    d.initPlatform();
    d.initPlatform(); // idempotent: listeners registered once
    doc.setVisible(false);
    doc.setVisible(false); // duplicate notification (e.g. native + web): ignored
    expect(d.isAppActive()).toBe(false);
    doc.setVisible(true);
    expect(seen).toEqual([false, true]);
    expect(audioMock.suspend).toHaveBeenCalledTimes(1);
    expect(audioMock.resume).toHaveBeenCalledTimes(1);
    off();
    doc.setVisible(false);
    expect(seen).toEqual([false, true]);
  });

  it('flushes a pending debounced save when the app goes to the background', async () => {
    const doc = new FakeDocument();
    vi.stubGlobal('document', doc);
    const writes: string[] = [];
    vi.stubGlobal('localStorage', {
      getItem: () => null, setItem: (k: string) => { writes.push(k); }, removeItem: () => undefined,
    });
    const d = await freshDevice();
    const save = await import('../src/state/save');
    d.initPlatform();
    save.updateSettings({ music: 0.2 });
    expect(save.hasPendingSave()).toBe(true);
    doc.setVisible(false);
    expect(save.hasPendingSave()).toBe(false);
    expect(writes).toContain(save.SAVE_KEY);
  });
});

describe('haptics', () => {
  it('never throws and respects settings.vibrate', async () => {
    vi.resetModules();
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate, userActivation: { hasBeenActive: true } });
    const save = await import('../src/state/save');
    const { haptic } = await import('../src/platform/haptics');
    save.getSave().settings.vibrate = false;
    haptic('heavy');
    expect(vibrate).not.toHaveBeenCalled();
    save.getSave().settings.vibrate = true;
    haptic('light');
    expect(vibrate).toHaveBeenCalledTimes(1);
    haptic('light'); // rate-limited: same strength within the cooldown
    expect(vibrate).toHaveBeenCalledTimes(1);
    haptic('heavy'); // a stronger pulse is allowed through
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it('does not vibrate before the first user gesture', async () => {
    vi.resetModules();
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate, userActivation: { hasBeenActive: false } });
    const { haptic } = await import('../src/platform/haptics');
    expect(() => haptic('medium')).not.toThrow();
    expect(vibrate).not.toHaveBeenCalled();
  });
});
