// =====================================================================================
//  CONTROLS — unified, allocation-free polling of keyboard, touch / mouse and gamepad.
//  - Keyboard: arrows / WASD move, Space / Z fire (held), X / Shift rear-mode toggle (edge),
//    P / Esc pause (edge).
//  - Touch / mouse: RELATIVE drag. A drag may start anywhere inside `dragArea`; the ship
//    moves by the finger delta x sensitivity, so the finger never hides the ship. The first
//    pointer drives; other fingers are ignored until it lifts (then a finger still held
//    inside the drag area takes over without a jump). Coordinates are game pixels
//    (pointer.x / pointer.y are already mapped through the FIT scale).
//  - Gamepad (standard mapping): left stick / d-pad move (radial deadzone), A / RB / RT fire,
//    B / X rear toggle, Start pause.
//  - Android back button -> pausePressed while this instance exists and its scene is running
//    (top of the back stack); while the scene is paused the press falls through to the next
//    handler (e.g. the pause menu).
//  The instance destroys itself when its scene shuts down.
// =====================================================================================
import Phaser from 'phaser';
import { pushBackHandler } from '../platform/device';

export interface ControlsState {
  moveX: number;            // -1..1 keyboard / gamepad axis
  moveY: number;            // -1..1
  dragDX: number;           // touch / mouse relative drag since last update, game px (sensitivity applied)
  dragDY: number;
  touching: boolean;        // a finger / mouse button is dragging
  firing: boolean;          // fire held (or autofire on)
  rearTogglePressed: boolean; // edge-triggered this frame
  pausePressed: boolean;      // edge-triggered this frame (Esc / P / gamepad start / Android back)
}

export interface ControlsOptions {
  dragArea: Phaser.Geom.Rectangle;  // where a drag may START (game coords)
  sensitivity: number;
  autofire: boolean;
}

type Key = Phaser.Input.Keyboard.Key;

/** Gamepad stick radial deadzone (0..1). */
const DEADZONE = 0.22;
const DIAGONAL = Math.SQRT1_2;
// Standard gamepad mapping button indices.
const PAD_A = 0, PAD_B = 1, PAD_X = 2, PAD_RB = 5, PAD_RT = 7, PAD_START = 9;
const PAD_UP = 12, PAD_DOWN = 13, PAD_LEFT = 14, PAD_RIGHT = 15;

/** Edge detector for keys that may be shared with other code: compares Key.timeDown, never consumes JustDown. */
interface EdgeKey { key: Key; seen: number }

function padPressed(pad: Gamepad, index: number): boolean {
  const b = pad.buttons[index];
  return !!b && (b.pressed || b.value > 0.5);
}

export class Controls {
  private readonly scene: Phaser.Scene;
  private dragArea: Phaser.Geom.Rectangle;
  private sensitivity: number;
  private autofire: boolean;

  private readonly state: ControlsState = {
    moveX: 0, moveY: 0, dragDX: 0, dragDY: 0, touching: false, firing: false, rearTogglePressed: false, pausePressed: false,
  };

  private readonly keysLeft: Key[] = [];
  private readonly keysRight: Key[] = [];
  private readonly keysUp: Key[] = [];
  private readonly keysDown: Key[] = [];
  private readonly keysFire: Key[] = [];
  private readonly edgesRear: EdgeKey[] = [];
  private readonly edgesPause: EdgeKey[] = [];

  private driver: Phaser.Input.Pointer | null = null;
  private driverDownTime = 0;
  private lastX = 0;
  private lastY = 0;

  private pendingRear = false;
  private pendingPause = false;

  private padCount = 0;
  private padRearPrev = false;
  private padPausePrev = false;

  private unsubscribeBack: (() => void) | null = null;
  private destroyed = false;

  private readonly onPadConnected = (): void => {
    this.padCount = Math.max(1, this.countPads());
    this.padRearPrev = false;
    this.padPausePrev = false;
  };
  private readonly onPadDisconnected = (): void => { this.padCount = this.countPads(); };

  constructor(scene: Phaser.Scene, opts: ControlsOptions) {
    this.scene = scene;
    this.dragArea = opts.dragArea;
    this.sensitivity = opts.sensitivity;
    this.autofire = opts.autofire;

    const kb = scene.input.keyboard;
    if (kb) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      const add = (list: Key[], ...codes: number[]) => { for (const c of codes) list.push(kb.addKey(c, true, false)); };
      const addEdge = (list: EdgeKey[], ...codes: number[]) => {
        for (const c of codes) {
          const key = kb.addKey(c, true, false);
          list.push({ key, seen: key.timeDown });
        }
      };
      add(this.keysLeft, K.LEFT, K.A);
      add(this.keysRight, K.RIGHT, K.D);
      add(this.keysUp, K.UP, K.W);
      add(this.keysDown, K.DOWN, K.S);
      add(this.keysFire, K.SPACE, K.Z);
      addEdge(this.edgesRear, K.X, K.SHIFT);
      addEdge(this.edgesPause, K.P, K.ESC);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('gamepadconnected', this.onPadConnected);
      window.addEventListener('gamepaddisconnected', this.onPadDisconnected);
      this.padCount = this.countPads();
    }

    // Back = pause while the scene runs. While it is paused / asleep (pause menu open) the press
    // is NOT consumed, so the overlay's own back handler (lower in the stack) can resume.
    this.unsubscribeBack = pushBackHandler(() => {
      if (this.destroyed || !this.scene.sys.isActive()) return false;
      this.pendingPause = true;
      return true;
    });

    const ev = scene.events;
    ev.on(Phaser.Scenes.Events.RESUME, this.resetEdges, this);
    ev.on(Phaser.Scenes.Events.WAKE, this.resetEdges, this);
    ev.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    ev.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
  }

  /** Update live options (e.g. after the settings changed in the pause menu). */
  configure(opts: Partial<ControlsOptions>): void {
    if (opts.dragArea) this.dragArea = opts.dragArea;
    if (typeof opts.sensitivity === 'number') this.sensitivity = opts.sensitivity;
    if (typeof opts.autofire === 'boolean') this.autofire = opts.autofire;
  }

  /** Poll once per frame. The returned object is reused: read it, do not keep it. */
  update(): ControlsState {
    const s = this.state;
    if (this.destroyed) {
      s.moveX = s.moveY = s.dragDX = s.dragDY = 0;
      s.touching = s.firing = s.rearTogglePressed = s.pausePressed = false;
      return s;
    }

    // --- keyboard
    let mx = 0;
    let my = 0;
    if (Controls.anyDown(this.keysLeft)) mx -= 1;
    if (Controls.anyDown(this.keysRight)) mx += 1;
    if (Controls.anyDown(this.keysUp)) my -= 1;
    if (Controls.anyDown(this.keysDown)) my += 1;
    if (mx !== 0 && my !== 0) { mx *= DIAGONAL; my *= DIAGONAL; }
    let fireHeld = Controls.anyDown(this.keysFire);
    if (Controls.edge(this.edgesRear)) this.pendingRear = true;
    if (Controls.edge(this.edgesPause)) this.pendingPause = true;

    // --- gamepads (only polled once one has been seen: getGamepads() allocates)
    if (this.padCount > 0 && typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
      let rear = false;
      let pause = false;
      const pads = navigator.getGamepads();
      for (let i = 0; i < pads.length; i++) {
        const pad = pads[i];
        if (!pad || !pad.connected) continue;
        const ax = pad.axes[0] ?? 0;
        const ay = pad.axes[1] ?? 0;
        const mag = Math.sqrt(ax * ax + ay * ay);
        if (mag > DEADZONE) {
          const k = Math.min(1, (mag - DEADZONE) / (1 - DEADZONE)) / mag;
          mx += ax * k;
          my += ay * k;
        }
        if (padPressed(pad, PAD_LEFT)) mx -= 1;
        if (padPressed(pad, PAD_RIGHT)) mx += 1;
        if (padPressed(pad, PAD_UP)) my -= 1;
        if (padPressed(pad, PAD_DOWN)) my += 1;
        if (padPressed(pad, PAD_A) || padPressed(pad, PAD_RB) || padPressed(pad, PAD_RT)) fireHeld = true;
        if (padPressed(pad, PAD_B) || padPressed(pad, PAD_X)) rear = true;
        if (padPressed(pad, PAD_START)) pause = true;
      }
      if (rear && !this.padRearPrev) this.pendingRear = true;
      if (pause && !this.padPausePrev) this.pendingPause = true;
      this.padRearPrev = rear;
      this.padPausePrev = pause;
    }
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 1) { mx /= len; my /= len; }

    // --- touch / mouse relative drag
    this.updateDrag();

    s.moveX = mx;
    s.moveY = my;
    s.firing = this.autofire || fireHeld || s.touching;
    s.rearTogglePressed = this.pendingRear;
    s.pausePressed = this.pendingPause;
    this.pendingRear = false;
    this.pendingPause = false;
    return s;
  }

  /** Removes every listener (window, scene events, back-button handler). Idempotent. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener('gamepadconnected', this.onPadConnected);
      window.removeEventListener('gamepaddisconnected', this.onPadDisconnected);
    }
    if (this.unsubscribeBack) {
      this.unsubscribeBack();
      this.unsubscribeBack = null;
    }
    const ev = this.scene.events;
    ev.off(Phaser.Scenes.Events.RESUME, this.resetEdges, this);
    ev.off(Phaser.Scenes.Events.WAKE, this.resetEdges, this);
    ev.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    ev.off(Phaser.Scenes.Events.DESTROY, this.destroy, this);
    this.driver = null;
    this.keysLeft.length = this.keysRight.length = this.keysUp.length = this.keysDown.length = this.keysFire.length = 0;
    this.edgesRear.length = this.edgesPause.length = 0;
  }

  // ----------------------------------------------------------------------- internals

  private updateDrag(): void {
    const s = this.state;
    s.dragDX = 0;
    s.dragDY = 0;
    let d = this.driver;
    // Released, or lifted and pressed again between two frames: drop it (re-acquired below without a jump).
    if (d && (!d.primaryDown || d.downTime !== this.driverDownTime)) d = this.driver = null;
    if (d) {
      s.dragDX = (d.x - this.lastX) * this.sensitivity;
      s.dragDY = (d.y - this.lastY) * this.sensitivity;
      this.lastX = d.x;
      this.lastY = d.y;
    } else {
      d = this.pickPointer();
      if (d) {
        this.driver = d;
        this.driverDownTime = d.downTime;
        this.lastX = d.x;
        this.lastY = d.y;
      }
    }
    s.touching = this.driver !== null;
  }

  /** Earliest-pressed pointer whose press started inside the drag area, or null. */
  private pickPointer(): Phaser.Input.Pointer | null {
    const pointers = this.scene.input.manager.pointers;
    let best: Phaser.Input.Pointer | null = null;
    for (let i = 0; i < pointers.length; i++) {
      const p = pointers[i];
      if (!p || !p.primaryDown || !this.dragArea.contains(p.downX, p.downY)) continue;
      if (!best || p.downTime < best.downTime) best = p;
    }
    return best;
  }

  /** Forget presses that happened while the scene was paused / asleep (no stale pause / toggle on resume). */
  private resetEdges(): void {
    this.pendingRear = false;
    this.pendingPause = false;
    for (const e of this.edgesRear) e.seen = e.key.timeDown;
    for (const e of this.edgesPause) e.seen = e.key.timeDown;
    // A pad button still held on resume must be released before it counts again.
    this.padRearPrev = this.padCount > 0;
    this.padPausePrev = this.padCount > 0;
    this.driver = null;
  }

  private countPads(): number {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return 0;
    try {
      let n = 0;
      for (const p of navigator.getGamepads()) if (p && p.connected) n++;
      return n;
    } catch {
      return 0;
    }
  }

  private static anyDown(keys: Key[]): boolean {
    for (let i = 0; i < keys.length; i++) if (keys[i].isDown) return true;
    return false;
  }

  /** True if any key of the group was freshly pressed since the last poll. */
  private static edge(keys: EdgeKey[]): boolean {
    let hit = false;
    for (let i = 0; i < keys.length; i++) {
      const e = keys[i];
      if (e.key.timeDown > e.seen) {
        e.seen = e.key.timeDown;
        hit = true;
      }
    }
    return hit;
  }
}
