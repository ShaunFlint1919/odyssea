# Review: persistence and meta-game correctness (Nova Corsair)

Reviewer: adversarial state / persistence reviewer (read-only for `src/`). Date: 2026-11-07.

Scope:
* `src/state/save.ts`, `economy.ts`, `progress.ts`;
* the scenes that use them: LevelEnd, GameOver, Shop, Hangar, Map, Title, Options, Intel, and `src/ui/meta/**`;
* the shared apply-once guard in `src/ui/widgets/results.ts`;
* the debug save handling in `src/scenes/BootScene.ts`;
* the background flush in `src/platform/device.ts`.

Line numbers are from the working tree at review time. Owners were editing the menu scenes and `src/data/**` during the
review, so grep for the quoted code if a line has moved.

Method: every finding below was reproduced. The tools were:
* a temporary vitest suite against the real modules, with a fake `localStorage`;
* Playwright scripts on port 5241 (Vite dev server with HMR off) that drive the real scenes and read
  `localStorage['nova-corsair.save.v1']` and `window.__NC__`;
* for F3, the production bundle built with `vite build` and served with `vite preview`.

The temporary files were deleted afterwards. The screenshots `screens/revst-p3-kessra-3.png` and
`screens/revst-p6-pause.png` are kept as evidence.

Severity:
* **high**: credits or progress are wrong for every player.
* **medium**: permanent loss of data through a plausible input.
* **low**: a wrong flow, wrong text or a stat, or debug and web only.

## 1. Findings (most severe first)

### F1 · high · The mission pay (level-clear bonus) is never credited
* **Where:** `src/state/progress.ts:38`, `const credited = completed ? earned : Math.floor(earned * FAILED_CREDIT_RATIO);`.
* **Scenario:** you clear kessra-1 and collect 1000 credits. You are paid +1000. The content API and the design say
  you should get +1300: `levelClearBonus('kessra-1')` returns 300.
* **Size of the gap:** over a first campaign the player never receives **36,550 credits**. That is about 20 % of the
  income. `docs/BALANCE.md` §3 says "it is paid on completion … adds about 37k".
* **Knock-on effects:**
  * `referenceProgression()` and the balance tables (prices, reference kits, boss fight lengths) assume this income.
  * The **MISSION BONUS** row of LevelEnd is dead code. `LevelEndScene.ts:74` computes `bonus = creditsAfter -
    creditsBefore - creditsEarned`, which is always 0.
* **Root cause:** `levelClearBonus()` was added to `src/data/index.ts:107` (CONTENT, commit 51a8de7). Nothing in the
  runtime calls it. `src/game/**` only adds pickup credits to `stats.credits`.
* **Fix (progress.ts):** compute `const replay = save.completedLevels.includes(id)` *before* marking the level
  completed. Then use `credited = completed ? earned + levelClearBonus(id, result.bossDefeated === true, replay) :
  floor(earned × 0.5)`. LevelEnd then shows the bonus row by itself.
* **Test to update:** `tests/progress.test.ts:38` asserts the old behaviour (`credits + 1234`).
* **Evidence:** vitest. kessra-1 went from 1500 to 2500 (+1000) while the content bonus is 300. The sum over the
  campaign is 36,550. Also visible in the screenshot `revst-p3-kessra-3.png`: there is no bonus row.

### F2 · medium · A double-press of Enter on NEW GAME wipes the campaign
* **Where:**
  * `src/ui/kit.ts:1634`: `setFocus(0)`, so **YES** has the focus by default;
  * `src/ui/kit.ts:1598`: keys are ignored only for the first 120 ms;
  * the call sites are `TitleScene.ts:413` and `OptionsScene.ts` `askReset()`.
* **Scenario:** an existing campaign has 6 levels cleared and 98,765 credits. On the title screen you choose NEW GAME,
  then press Enter twice about 150 ms apart on NORMAL. The second press lands on the confirm dialog and accepts YES.
  `newGame()` writes a fresh save: 1500 credits, 0 levels cleared.
* **Who is affected:**
  * Keyboard users (web, desktop, Android with a keyboard).
  * The RESET CAMPAIGN double confirmation falls to three quick presses in the same way.
  * Touch is not affected: the shade swallows the second tap, and YES never lies under the menu row.
* **Root cause:** the destructive confirm accepts the default answer YES, and `confirm()` does not use the
  mash guard of kit (`inputBlocked`, 200 ms).
* **Fix (kit internals, the API is unchanged):** focus **NO** first (`setFocus(1)`), and ignore keys for about
  350 ms after the dialog opens, or apply the `inputBlocked()` mash rule.
* **Evidence:** Playwright P5. Before: credits 98765, 6 levels cleared. After the double press: credits 1500,
  0 levels cleared, scene Hangar.

### F3 · low (web or debug only) · Debug URL parameters rewrite the player's real save, in production builds too
* **Where:**
  * `src/scenes/BootScene.ts:232-247` (`applyDebugSave()` ends with `saveNow()`);
  * `src/debug.ts:13`, which parses the URL with no DEV gate.
* **Scenario:** one visit to `/?max=1` stores:
  * credits 999,999;
  * all 24 levels unlocked **and completed**, which also unlocks every shop item.

  It stays after a plain reload. Other parameters do the same:
  * `?credits=-50` stores and uses negative credits;
  * `?scene=X&level=Y` stores a `currentLevel` that may be locked;
  * `?scene=X` on an empty save creates a campaign.
* **Confirmed against the production bundle:** `vite build` + `vite preview`. After `?max=1` and a plain reload the
  save had credits 999999, 24 levels completed, 24 unlocked.
* **Android release:** not reachable. The launcher intent never carries a query string.
* **Fix (contract files, so the integrator applies it):** in a `PROD` build, ignore `max`, `credits` and `level`.
  Better: make a debug session volatile, for example a `save.ts` switch that makes `writeRaw` a no-op once any
  save-mutating debug parameter is present. That way smoke and screenshot runs never touch a real save.

### F4 · low · After the campaign is complete, every mission end routes to the star chart and boss replays say "CAMPAIGN COMPLETE"
* **Where:** `src/scenes/LevelEndScene.ts:56`, `campaignDone = real && result.completed && isCampaignComplete()`.
  It is used at `:58` (the target), `:108` (the flourish) and `:161-162` (the title and subtitle).
* **Scenario:** you finished the campaign and replay kessra-3 to farm credits. The band reads
  "CAMPAIGN COMPLETE / THE OUTER MARCHES ARE FREE" where it should read "PLANET LIBERATED / KESSRA". A replay of
  kessra-1 shows a STAR CHART button and the line "New routes are open on the star chart.", which is false. It
  should show CONTINUE and go to the hangar.
* **Root cause:** `isCampaignComplete()` stays true forever after the first win.
* **Fix:** `campaignDone = real && result.completed && !applied.completedBefore && isCampaignComplete()`.
* **Evidence:** Playwright P3, with the target and the texts captured, and `screens/revst-p3-kessra-3.png`.

### F5 · low · Replaying a cleared level moves "next mission" to an old level instead of the frontier
* **Where:** `src/state/progress.ts:61-67`. `save.currentLevel = next` also runs for a replay.
* **Scenario:** the frontier is verdance-3. You pick kessra-1 on the star chart and clear it. `currentLevel` becomes
  **kessra-2**, which is already cleared. The hangar's LAUNCH MISSION and NEXT MISSION show "KESSRA 2 … REPLAY", and
  LevelEnd's UP NEXT card shows Bonefield Mesa. That is neither the farmed level nor the campaign frontier, so the
  player has to reselect on the map every time.
* **Fix:** when the level was already completed before this result, set `currentLevel` to the frontier
  (`levelOrder().find(l => isUnlocked(l) && !isCompleted(l)) ?? id`), or keep the replayed level.
* **Evidence:** vitest R2. After the replay, `currentLevel` and `nextMissionId()` were kessra-2 (completed); the
  frontier is verdance-3.

### F6 · low · The apply-once guard drops a new result identical to the previous one
* **Where:** `src/ui/widgets/results.ts:57,76-79`. The guard compares a `JSON.stringify(result)` signature.
* **Scenario:** you launch kessra-1, pause and ABORT at once. GameOver is applied and deaths becomes 1. You choose
  RETRY MISSION and abort again within the first second. The result is byte-identical: `timeSeconds` is rounded and
  kills, spawned and credits are all 0. GameOver reports `applied=false`, so deaths stays at 1 and play time is not
  added.
* **Impact:** any genuinely new run whose rounded result matches the previous one would also lose its credits. It is
  rare with credits > 0, but the guard is wrong by design.
* **Fix:** dedupe on the object's identity, not its content: `const done = new WeakSet<object>()`. A scene restart
  reuses the same `settings.data` object, so it is still blocked. `GameScene.result()` builds a new object for every
  run.
* **Evidence:** Playwright P2. Run 1: `applied=true`, deaths 1. Run 2: `applied=false`, deaths 1, identical JSON.

### F7 · low · The shop's error shake ignores SCREEN SHAKE = OFF
* **Where:** `src/scenes/ShopScene.ts:583`, `this.cameras.main.shake(90, 0.003)` in `fail()`. There is no
  `settings.shake` check. LevelEnd (`:291`, `:328`) and GameScene do check it.
* **Fix:** `if (getSave().settings.shake) this.cameras.main.shake(90, 0.003);`.
* **Evidence:** Playwright P4. With `settings.shake=false`, 2 camera shakes fired over 2 failed purchases (power up
  with 0 credits, buy Fanfire).

### F8 · low (outside this scope, display only) · The pause menu names the previous mission after an Options round trip
* **Where:** `GameScene.ts:390` calls `this.scene.launch(SCENES.Pause)` with no data. `PauseScene.ts:54` reads
  `data?.levelId`.
* **Root cause:** Phaser's `Systems.start(data)` keeps the old `settings.data` when the new data is undefined. After
  Pause → OPTIONS → back (`OptionsScene.ts:302` restarts Pause with `{ levelId }`), every later pause shows that old
  mission.
* **Evidence:** Playwright P6. During kessra-2 the pause header showed "KESSRA 1 - DUSTFALL APPROACH"
  (`screens/revst-p6-pause.png`).
* **Fix:** `this.scene.launch(SCENES.Pause, { levelId: this.level.id })`.

## 2. Hardening (latent; not a bug today)
* **H1. Unknown ids on load are replaced by the starter parts with no refund**
  (`save.ts:128-145` `sanitizeLoadout`). A hull, gun, shield or drone whose id disappears from the catalogue silently
  loses its value. The vitest example lost about 25k: hull, P6 gun, P4 rear, shield and drone became start parts, and
  credits did not change.
  * **Today's state:** checked with `git log` from the first commit to the working tree. No hull, weapon, shield,
    generator, sidekick, intel or planet id has ever changed. The current rename pass only touches `name` and
    `title`, so the saves are safe.
  * **Rule for content:** never rename ids. If one ever has to change, add an alias map in `save.ts`.
* **H2. A failed write is silent.** `writeRaw()` returns false and `saveNow()` ignores it. `storageAvailable()` is
  exported but never used. A web player with blocked or full storage loses everything on reload with no warning.
  Android WebView is not affected.

## 3. Checked and found correct
* **Economy:** buy, sell, trade-in and power up/down cycles are credit-neutral (vitest R4).
  * A hull downgrade auto-sells the right drone at full value.
  * Locked items cannot be bought.
  * Prices round to whole credits.
  * The power stays within 1..10 and the last upgrade is refunded.
  * Selling the start parts at catalogue value matches the balance model, which counts the start loadout in the
    ship value.
* **Progress:**
  * A failure keeps floor(50 %) and does not move `currentLevel`.
  * The planet boundary unlocks the next planet.
  * The last level keeps `currentLevel` on it and unlocks nothing.
  * Intel is kept even when a mission fails.
  * The sanitizer keeps completed ⊆ unlocked and `currentLevel` ∈ unlocked.
* **Apply-once:** LevelEnd and GameOver apply in `create()` before any input. Back, skip or backgrounding during the
  tally cannot apply twice or skip the apply. RETRY starts a new run.
* **Save loading:**
  * Corrupt JSON keeps a `.corrupt` copy and continues on defaults.
  * A partial or old save is merged over the defaults.
  * Garbage values are clamped.
  * Storage that throws is survivable.
* **Settings:**
  * They apply at boot: with sfx 0.3 and music 0 stored, the audio started at 0.3 / 0.
  * They are written with a 400 ms debounce and flushed at once on `visibilitychange(hidden)`, `pagehide` and the
    Android back exit (Playwright P7).
  * Vibration, shake (except F7), autofire, touch speed and the FPS counter are read live or at mission start.
* **Intel:** a message is marked read on open, with `saveNow()`. `intelRead` ⊆ `intel` after loading.
* **Difficulty:** it is stored by `newGame()`, validated on load and read live by `difficultyScale()`.
* **Debug demo screens:** `?scene=LevelEnd` or `?scene=GameOver` without data never touch the save.
