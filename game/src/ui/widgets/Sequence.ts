// =====================================================================================
//  SEQUENCE — a skippable timeline of steps for result screens. Each step waits `wait` ms
//  after the previous one, then runs with instant=false; skip() runs every remaining step
//  immediately with instant=true (so a step must be able to jump to its final state).
// =====================================================================================
import Phaser from 'phaser';

export interface SequenceStep {
  wait: number;
  run: (instant: boolean) => void;
}

export class Sequence {
  private i = 0;
  private timer: Phaser.Time.TimerEvent | null = null;
  private finished = false;
  private started = false;

  constructor(private readonly scene: Phaser.Scene, private readonly steps: SequenceStep[], private readonly onDone: () => void) {}

  /** True once every step has run. */
  get done(): boolean { return this.finished; }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.next();
  }

  /** Run all remaining steps instantly and finish. */
  skip(): void {
    if (this.finished) return;
    this.timer?.remove(false);
    this.timer = null;
    while (this.i < this.steps.length) this.steps[this.i++].run(true);
    this.finish();
  }

  private next(): void {
    if (this.i >= this.steps.length) { this.finish(); return; }
    const st = this.steps[this.i];
    this.timer = this.scene.time.delayedCall(Math.max(0, st.wait), () => {
      this.timer = null;
      this.i++;
      st.run(false);
      this.next();
    });
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.onDone();
  }
}
