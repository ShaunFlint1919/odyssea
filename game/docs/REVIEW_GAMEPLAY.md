# Review: in-mission gameplay correctness (Nova Corsair)

Reviewer: adversarial gameplay reviewer (read-only for `src/`). Date: 2026-11-07.

Scope:
* `src/scenes/GameScene.ts`;
* `src/game/**`: world, ship, energy, enemies, movement, firePatterns, enemyBullets, director, boss,
  pickups, fx, collisions, background, flow, bot, tex;
* `src/game/arsenal/**`: core, weapons, drones, projectiles, effects, steering, scaling;
* how they interact with `src/ui/Hud.ts` (+ `ui/hud/**`), `PauseScene`, the LevelEnd / GameOver hand-off,
  `src/input/controls.ts` and the app-state / back-button glue in `src/platform/device.ts`.

Line numbers are from the working tree at commit e7800e1. Grep for the quoted code if a line has moved.

Method. Every finding below was reproduced in the real engine:
* Playwright scripts on port 5240 (Vite dev server, HMR off) that drive `?scene=Game&level=…&god=1&bot=1&t=…&speed=…`.
  They read `window.__NC__`, `window.__NC_RUN__` and the live scene objects (`game.scene.getScene('Game')`).
  They press keys, send CDP touch events, fake `visibilitychange` and call the real Android back dispatcher.
* For the collision measurements, the normal loop was frozen (`running = false`). The real `ShotPool`, `Enemies`
  and `Collisions` were then stepped by hand at a fixed step.
* The temporary scripts were deleted afterwards. The screenshot `screens/revgp-kills-gt-spawned.png` is kept as
  evidence.

Severity:
* **blocker**: a crash, a soft-lock or lost progress for every player.
* **major**: wrong gameplay or economy numbers that every player (or every buyer of an item) hits.
* **minor**: an edge case, a wrong number in a corner, or a misleading presentation.

No blocker was found. No crash, soft-lock, double transition or listener leak could be produced.

## 1. Findings (most severe first)

### G1 · major · Player shots tunnel through small and fast enemies (end-of-step point test)
* **Where:**
  * `src/game/collisions.ts:114-165` `shot()` tests only the shot's position at the END of the sub-step
    (`dx*dx + dy*dy >= rr*rr`, line 152). The grid lookup at line 146 uses the same point.
  * `src/scenes/GameScene.ts:43` sets `MAX_STEP_MS = 25`, and `:489-491` builds the sub-steps (one step per frame
    at 40-60 fps).
  * `src/game/arsenal/projectiles.ts:463` moves the shot by `v*dt` in one jump.
* **Scenario:** the player holds fire under a drone, a dart or a diving kamikaze. Measured with the real systems:
  every shot was aimed so that its path crosses the enemy's collision circle. The miss rates were:

  | weapon / target | 60 fps (16.7 ms step) | 40 fps (25 ms step) |
  | --- | --: | --: |
  | Pulse (start gun, 700 px/s) vs k_mite drone | 10.6 % | 32.3 % |
  | Pulse vs k_dart | 9.3 % | — |
  | Pulse vs diving k_diver (360 px/s) | 20.8 % | — |
  | Gatling (840 px/s) vs k_mite | 14.1 % | 43.1 % |
  | Gatling vs diving k_diver | 25.7 % | — |
  | reference: Gatling vs k_mite, 4 ms step | 0 % | |

  The shots visibly pass through the target. The headless test browser itself ran the boss fights at 36-46 fps,
  which is the 25 ms-step column.
* **Root cause:** the relative travel per step is larger than the collision chord. Shot speed (520-1000 px/s)
  plus enemy speed (80-400 px/s) gives 13-23 px per step at 60 fps and up to 31 px at 40 fps. The chord is at
  most 2·(r_enemy + r_shot) = 16-18 px for 12-16 px sprites, and much shorter off-centre. The comment on
  `MAX_STEP_MS` ("keeps fast shots from tunnelling") does not hold for 25 ms or even 16.7 ms steps.
* **Fix (WORLD):** a swept test in `Collisions.shot()`:
  * Use the segment from the previous position (x − vx·dt, y − vy·dt) to the current one, against each candidate
    circle (closest point on the segment). For non-piercing shots, keep the earliest hit along the segment.
  * Query the grid cells covered by the segment, or insert the enemies with `SHOT_MARGIN` + the maximum travel
    per step.
  * `PlayerShot` (frozen `api.ts`) has no velocity. Either read the runtime `Shot.vx/vy` through a local cast, or
    let ARSENAL record `prevX/prevY` in `ShotPool.update()`. Report the latter as a contract addition.
* **Stop-gap with no contract change:** run `arsenal.update` + `collisions.update` (only these two) in sub-steps of
  at most 5-6 ms inside `GameScene.step()`.

### G2 · major (balance) · Splash weapons hit the struck target twice: direct damage plus splash
* **Where:**
  * `src/game/collisions.ts:159-160`: `w.enemies.damage(e, s.damage)` is followed by
    `this.splash(x, y, s.splash, s.damage)`.
  * `src/game/collisions.ts:132-133`: the same pattern for the boss.
  * `splash()` (`:168-177`) damages every candidate in the radius, including `e`. `Boss.splash()`
    (`src/game/boss.ts:381-394`) damages the body or part that was just hit directly.
* **Scenario:** one Thunderhead Mortar shell at power 1 (`damage` 58.5, splash 22) hits an isolated enemy. The enemy
  loses **117 hp**. A body hit on the colossus also removes **117 hp**. That is exactly ×2.00. From the code, a hit on
  a weak-point core gives ×2.5 (1.5 + 1).
* **Affected weapons:** from the code, the same applies to `mine_caltrop` (rear) and the `sk_rocket` drone. They
  have `splash > 0` and go through the same path.
* **Why it matters:**
  * The front-gun header and `src/game/arsenal/scaling.ts` define "total DPS = damage × fireRate × N1 × M(p)".
  * `weaponFireStats()` (shop and specs numbers) and `referenceProgression()` rely on that model.
  * So the real single-target DPS of every splash weapon is double what the shop shows and what the balance model
    assumes. The mortar is the 30,000-credit top front gun.
* **Fix (WORLD):**
  * Give the struck target to `splash()` and skip it: `splash(x, y, r, dmg, skipEnemy)`.
  * In `Boss.splash()`, skip the part or body index that `damageAt()` already hit.
  * If the double hit is intended, the balance owner must change `weaponFireStats()` and `docs/BALANCE.md`
    instead. Either way the code and the model must agree.

### G3 · minor (high impact when triggered) · The mission can still be paused and ABORTED after it is won
* **Where:**
  * `src/scenes/GameScene.ts:385-391` `pauseGame()` only checks `paused`, `finished` and `isActive()`.
  * `:400-405` `onAbort()` always calls `finish(false, true)`.
  * `finished` stays false through the flow phases `bossDown` (1.6 s) and `clear` (up to 4.2 s: ALL CLEAR banner +
    fly-out), see `src/game/flow.ts`.
* **Scenario:** you defeat the kessra-3 boss. During the victory fly-out you press Android back, or P / Esc / the
  HUD pause button. `dispatchBackButton()` → the Controls handler consumes it → the Pause menu opens. You choose
  ABORT MISSION → YES. The result is `completed=false, aborted=true`.
* **Save after the abort:**
  * kessra-3 is not completed and verdance-1 is not unlocked;
  * deaths go 0 → 1;
  * no mission pay (640 credits on kessra-3);
  * only 50 % of the collected credits. The boss gems still in flight are lost.
* **Other cases:**
  * Same on a no-boss level (kessra-1, `t=75`, phase `clear`).
  * Aborting while the ship is exploding (phase `dead`) labels the GameOver "MISSION ABORTED" instead of "SHIP
    DESTROYED".
* **Fix (WORLD):**
  * In `pauseGame()`, ignore pause requests once the outcome is decided: `this.w.ended || this.w.boss.defeated`.
    The Controls back handler still consumes the press, so the app does not minimise.
  * As a safety net in `onAbort()`, map `bossDown` / `clear` to `finish(true)` and `dead` to `finish(false)`
    (not aborted).

### G4 · minor · A level-2 mid-boss that is still fighting is blown up with no reward by the forced stage clear
* **Where:**
  * `src/game/flow.ts:75` forces `toClear()` at `duration + NO_BOSS_GRACE` (6 s), whatever enemy is alive.
  * `src/scenes/GameScene.ts:421` `stageClear()` → `w.enemies.killAll(false)`.
  * `src/game/movement.ts:17` `MIDBOSS_HOVER_TIME = 45`, with the "retreats upward" branch at `:187-190`.
* **Scenario:** kessra-2. The mid-boss spawns at 44.3 s with 45 s of hover planned. At 78.0 s (72 + 6) the level
  force-clears. `killAll(false)` plays the full large explosion (shake, 80 ms hit-stop, white flash) but grants no
  credits (220), no score and no drops (power / armor / shield). Then `midbossEscaped=true` and the LevelResult is
  `completed=true`.
* **Effect:** the player sees the mid-boss "die" under ALL CLEAR and is not paid. The intended "not destroyed in
  time → it retreats" path can never run on 6 of the 8 level-2s. The fight window left before the forced clear is:
  * kessra-2 ≈ 32 s, verdance-2 34 s, thalassa-2 ≈ 38 s, umbra-2 39 s, cinder-2 41 s, glacia-2 44 s;
  * the hover is 45 s. Only rift-2 and axiom-2 reach the retreat.
* **Fix (WORLD):** choose one.
  * While `w.enemies.midboss` is alive, do not force the clear. Its own hover and retreat bound the wait.
  * Or let `stageClear()` send a live mid-boss into its retreat (`ms = 2`) instead of `kill(…, false)`.
  * Or cap the hover so the retreat starts before `duration + 6`.

### G5 · minor · The boss counts as a kill but never as a spawn, so kills can exceed spawned
* **Where:**
  * `src/game/boss.ts:475` `w.stats.kills++` in `finishDeath()`.
  * `Boss.start()` (`:167-225`) never increments `w.stats.spawned`. Only `Enemies.spawn()` does (`src/game/enemies.ts:269`).
  * `src/game/bot.ts` documents `killRatio` as "spawned (incl. boss)".
* **Scenario:** full boss runs with the autopilot, which killed every minion. The results were:
  * verdance-3 5 / 4, thalassa-3 5 / 4, cinder-3 15 / 14;
  * glacia-3 19 / 18, rift-3 22 / 21;
  * kessra-3 from `t=74` 1 / 0.
* **Display:** LevelEnd shows "ENEMIES DESTROYED 22 / 21". It clamps the ratio to 100 % and awards rank S
  "FLAWLESS SWEEP" (`screens/revgp-kills-gt-spawned.png`, showing 1 / 0). The extra kill also lifts real runs over
  the rank thresholds.
* **Fix (WORLD):** `w.stats.spawned++` in `Boss.start()`.

## 2. Hardening (latent; not reachable with today's data)
* **H1. Drops are lost silently when the pickup pool (360) is full.** The intel can be lost too:
  * `w.intelDropped = true` is set **before** `spawnDrop()` (`enemies.ts:403-406`, `:413-415`, `boss.ts:478-480`).
  * `spawnDrop()` returns without a word when `take()` fails (`pickups.ts:143-144`).
  * Gems fall back to direct credit, but drops do not.
  * Measured peaks: ≤ 117 enemy bullets (rift-3, axiom-3 phase 3 ≤ 103, so `convertToGems()` stays far below the
    pool) and ≤ 28 live pickups.
  * Fix: set `intelDropped` only when the drop was really spawned, or reserve pool slots for drops.
* **H2. `EnergyModel.damage(NaN)` turns the shield and armor into NaN for good.** The ship becomes immortal and
  the HUD shows NaN. `Ship.hit()` only rejects `amount <= 0` (`ship.ts:151`). Today every damage source is finite.
  Guard with `if (!(amount > 0)) return;`.
* **H3. Missiles beyond `MAX_MISSILES` = 48 cannot be shot down.** They are not in the `missiles` list
  (`enemyBullets.ts:180`). Today ≤ 10 are alive at once.
* **H4. Debug instrumentation runs in release.** `hookState()` builds a 45-field object and `publishRun()` stores
  it, 4× per second, also in release builds (`GameScene.ts:502-508`). It is cheap but it allocates in the main
  loop. Gate it behind `DEBUG_ACTIVE`.
* **H5. Tooling.**
  * Debug parameters (`t`, `god`, `speed`, `seed`, `bot`) apply to every later Game start of the session (RETRY,
    map launches). Debug only.
  * After RESUME, `window.__NC__.scene` stays `"Pause"` because the Game does not re-mark itself ready. A script
    that waits for `scene === 'Game'` after a resume will hang.

## 3. Checked and found correct
* **RETRY leaks:**
  * Runs tested: 12 × (death → GameOver → RETRY) and 8 × (pause → ABORT → GameOver → RETRY).
  * Stable across the runs:
    * the listener counts on the Game and Pause emitters and on `game.events`;
    * the window / document listeners (keys, touch, pointer, gamepad, visibility);
    * the keyboard keys and the display list (2479 objects);
    * the textures: the per-run `world_chunk_*` and `__hud<n>_*` are removed.
  * No errors.
* **Pause and resume:**
  * P / Esc and the Android back dispatcher both work. RESUME also works after Options (Pause → Options → back →
    Pause → resume).
  * Backgrounding (`visibilitychange`) during play opens the pause menu, and backgrounding while paused is
    harmless.
  * The world clock is frozen while paused. The Controls edges are reset on RESUME. There are no double
    transitions (`finish()` is guarded, terminal flow phase `done`).
* **Boss path:**
  * All 8 planet bosses straight to the fight (bot + god + strong kit) reach every phase, then the death chain,
    `bossDown`, `clear`, the fly-out and LevelEnd, with no error. Phases seen: 0-2 or 0-3.
  * A ship destroyed in the same step as the boss → GameOver, no soft-lock.
  * Nothing can hurt the ship during the boss death sequence: bullets are converted to gems, lasers are ended,
    enemies are killed (0 threats measured).
* **Difficulty:**
  * Applied exactly once to enemy, boss and part hp, fire rate (initial cooldown + cadence), bullet speed (flak
    fragments inherit), missile hp and credits.
  * Enemy damage follows the hp factor, as documented in `GameScene.ts:140`.
  * `applyLevelResult` does not scale the credits again.
* **Energy:** energy never goes negative. Shield regeneration is limited by the energy it can afford and only runs
  while alive. The god-mode shadow model never touches the real cell (shield regeneration only reads a copy of it).
* **Time bases:**
  * Gameplay and the HUD use no Phaser timers or tweens, so hit-stop and slow-motion cannot desync them.
  * Hit-stop / slow-motion durations, shake, haptic gaps, the HUD and terrain work run on real time.
  * FX, enemies, the boss, flow delays and invulnerability run on world time.
  * `MAX_FRAME_MS` clamps hitches.
* **Pools under pressure:**
  * rift-2 / rift-3 at speed 2: minimum free air enemies 30 of 84, maximum bullets 117 of 640, maximum pickups 28
    of 360.
  * Every pool degrades without crashing. Gems credit directly when the pool is full.
* **Collision grid:** every shot radius is ≤ `SHOT_MARGIN` 10 (mines 10, flames 9.6, mortar 9), so the centre-cell
  lookup finds every overlap. The only gap is G1.
* **Touch input (CDP touch events):**
  * The drag is relative (+40 px → +48 px at sensitivity 1.2).
  * A drag that starts on the HUD panel steers. A second finger is ignored.
  * A press on the pause button pauses and never steers, even when held through RESUME.
  * The hand-over to a remaining finger was code-reviewed (`controls.ts:243-257`).
* **LevelResult:** `kills`, `creditsEarned` (collected gems only), `score`, `intelFound`, `timeSeconds` (world
  time minus the `t` fast-forward) and `bossDefeated` are correct, apart from G5.
* **Mission pay:** it was missing when the review started (REVIEW_STATE F1). Commit ed5757a fixed it. Re-verified:
  the first clear of kessra-1 pays +300, and kessra-3 shows MISSION BONUS 640.

## 4. Cross-references
Found by the state reviewer and not repeated here (`docs/REVIEW_STATE.md`):
* F6, the apply-once JSON guard, also drops a second identical abort.
* F8, the stale Pause level id. It is fixed in `GameScene.ts:390` and `PauseScene.ts`.
