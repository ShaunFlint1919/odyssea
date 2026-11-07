// =====================================================================================
//  CONTROLS — unified, allocation-free polling of keyboard, touch / mouse and gamepad.
//  - Keyboard: arrows / WASD move, Space / Z fire (held), X / Shift rear-mode toggle (edge),
//    P / Esc pause (edge).
//  - Touch / mouse: RELATIVE drag. A drag may start anywhere inside `dragArea`; the ship
//    moves by the finger delta x sensitivity, so the finger never hides the ship. The first
//    pointer drives. Once the driver has rested (moved <= STILL_PX for STILL_MS: a palm or
//    grip contact, or a thumb holding still), another finger held in the drag area that moves
//    takes over; when the driver lifts, a finger still held takes over. Every hand-over
//    re-anchors on the new finger, so the ship never jumps. Coordinates are game pixels
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
/** A pointer that moved no more than this (game px, per axis)... */
const STILL_PX = 2;
/** ...for this long (ms) is resting: another finger that moves may take the drag over. */
const STILL_MS = 250;
/** Pointer slots tracked for hand-overs (Phaser pointer ids: mouse 0, at most 10 touches). */
const SLOTS = 11;
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
  /** Per pointer slot: press being tracked (its downTime, -1 = none), movement anchor, last time it moved. */
  private readonly slotPress = new Float64Array(SLOTS).fill(-1);
  private readonly slotX = new Float32Array(SLOTS);
  private readonly slotY = new Float32Array(SLOTS);
  private readonly slotMovedAt = new Float64Array(SLOTS).fill(-Infinity);

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
    const now = performance.now();
    this.trackPointers(now);
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
      if (d) this.drive(d);
    }
    // A resting driver (palm / grip contact that landed first, or a thumb holding still) hands
    // over to another finger that is moving right now.
    if (d && d.id < SLOTS && now - this.slotMovedAt[d.id] >= STILL_MS) {
      const mover = this.movingPointer(d, now);
      if (mover) this.drive(mover);
    }
    s.touching = this.driver !== null;
  }

  /** Makes `p` the driver, anchored on its current position (no jump). */
  private drive(p: Phaser.Input.Pointer): void {
    this.driver = p;
    this.driverDownTime = p.downTime;
    this.lastX = p.x;
    this.lastY = p.y;
  }

  /**
   * Per-slot movement bookkeeping (allocation-free): an anchor that follows a pointer only once it
   * travelled more than STILL_PX, and the time of that last real move.
   */
  private trackPointers(now: number): void {
    const pointers = this.scene.input.manager.pointers;
    for (let i = 0; i < pointers.length; i++) {
      const p = pointers[i];
      const k = p ? p.id : -1;
      if (!p || k < 0 || k >= SLOTS) continue;
      if (!p.primaryDown) {
        this.slotPress[k] = -1;
        continue;
      }
      if (this.slotPress[k] !== p.downTime) {
        // New press: anchored where it went down, so a slide before this frame counts as a move.
        this.slotPress[k] = p.downTime;
        this.slotX[k] = p.downX;
        this.slotY[k] = p.downY;
        this.slotMovedAt[k] = -Infinity;
      }
      if (Math.abs(p.x - this.slotX[k]) > STILL_PX || Math.abs(p.y - this.slotY[k]) > STILL_PX) {
        this.slotX[k] = p.x;
        this.slotY[k] = p.y;
        this.slotMovedAt[k] = now;
      }
    }
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

  /** Latest-pressed pointer other than `driver` that started in the drag area and moved this frame, or null. */
  private movingPointer(driver: Phaser.Input.Pointer, now: number): Phaser.Input.Pointer | null {
    const pointers = this.scene.input.manager.pointers;
    let best: Phaser.Input.Pointer | null = null;
    for (let i = 0; i < pointers.length; i++) {
      const p = pointers[i];
      if (!p || p === driver || !p.primaryDown || p.id >= SLOTS || this.slotMovedAt[p.id] !== now) continue;
      if (!this.dragArea.contains(p.downX, p.downY)) continue;
      if (!best || p.downTime > best.downTime) best = p;
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
    // Fingers held through the pause keep their press but restart their movement history where
    // they are now (moves made under the pause menu are not "moving right now").
    const pointers = this.scene.input.manager.pointers;
    for (let i = 0; i < pointers.length; i++) {
      const p = pointers[i];
      const k = p ? p.id : -1;
      if (!p || k < 0 || k >= SLOTS) continue;
      this.slotPress[k] = p.primaryDown ? p.downTime : -1;
      this.slotX[k] = p.x;
      this.slotY[k] = p.y;
      this.slotMovedAt[k] = -Infinity;
    }
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
