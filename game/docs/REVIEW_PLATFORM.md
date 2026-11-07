# Platform review (adversarial) — audio, input, device lifecycle, back button, Android, CI

Reviewer: platform reviewer (read-only on `src/` and `android/`). Date: 2026-11-07, tree at `36d31e3`.
Scope: `src/audio/**`, `src/input/controls.ts`, `src/platform/**`, `src/ui/kit.ts` back handling,
back / pause behaviour of `src/scenes/*`, `capacitor.config.ts`, `index.html`, `android/app/src/main/**`,
`android/app/build.gradle`, `.github/workflows/{android-apk,game-ci}.yml`.

Method: full read of the scope plus the Capacitor 8.6 / @capacitor/app 8.1 / @capacitor/haptics 8.0 Android
sources and the Phaser 3.90 input / loop / renderer code they rely on. Reproductions with Playwright Chromium
(port 5243, Vite HMR off) using touch emulation through CDP (`Input.dispatchTouchEvent`, incl. multi-touch and
`touchCancel`), a mocked Capacitor Android bridge (`window.androidBridge` + `Capacitor.PluginHeaders`, so
`App.addListener('backButton' | 'appStateChange')`, `App.minimizeApp`, `Haptics.impact` take the native code
paths and can be fired/recorded), faked page visibility plus CDP page freezing to emulate a real background,
`WEBGL_lose_context`, and offline renders through the real master chain. Node checks of the audio facade on a
WebAudio mock with Android-WebView semantics (contexts start `running`). `MainActivity.java` compiled with
`javac --release 21` against the Android 16 framework (Robolectric `android-all` 16) plus signature stubs for
AndroidX / Capacitor. Items that need a phone or the Android SDK are marked **unverified-by-run**.

Severity scale: HIGH (breaks the game for many players) · MEDIUM (real failure in a common situation, or a
failure that cannot be recovered) · LOW (edge case / polish) · INFO.
No HIGH issue was found.

---

## Findings (most severe first)

### 1. MEDIUM — One uncaught exception freezes the app for good; Back is swallowed and the music keeps playing
- **Where**: Phaser `src/dom/RequestAnimationFrame.js:89` (the next frame is requested only *after* the frame
  callback returned); `src/input/controls.ts:127-131` and `src/ui/kit.ts:1450-1460` (back handlers keep
  answering `true`); `src/platform/device.ts:116-122` (no liveness check); `src/audio/sequencer.ts` scheduler
  runs on `setInterval`, independent of the frame loop.
- **Scenario**: any runtime exception thrown during a frame (gameplay bug, tween callback, scene create) — the
  frame loop stops forever: frozen picture, music continues. Back in a mission: the Controls handler still sees a
  RUNNING scene and consumes the press (`pendingPause` is never read); in most menus the kit handler consumes it
  too (a `goto()` fade or a confirm that is never drawn; only the Title main menu still falls through to
  `minimizeApp`). Only Home + swipe-away recovers.
- **Repro (verified-by-run)**: `scene.events.once('update', () => { throw … })` during a mission → 0 frames in
  the next 1.5 s, 14 music steps scheduled meanwhile, two native Back presses → 0 `minimizeApp` / `exitApp` calls.
- **Fix (platform files)**: in `device.ts` keep a frame heartbeat (e.g. sample `window.__NC__.game.loop.frame`,
  installed in every build by `main.ts`); in the `backButton` listener, if no frame advanced for > 500 ms while visible,
  skip `dispatchBackButton()`, `flushSave()` and `location.reload()` (or `App.minimizeApp()`). Also add a
  `window` `'error'` listener there that calls `audio.suspend()` when the loop is dead, so a crash is silent.

### 2. MEDIUM — The mission never pauses when the notification shade / a system dialog covers the game
- **Where**: `android/.../MainActivity.java:131-137` (`onWindowFocusChanged` only re-applies immersive mode on
  gain); `src/platform/device.ts:94-126` (only `visibilitychange` + `appStateChange`);
  `src/scenes/GameScene.ts:215-217` (pauses only on those).
- **Scenario**: on Android 10+ the shade, quick settings, power menu, Assistant overlay, low-battery / Bluetooth
  dialogs, screen-pinning prompt… only take window focus — no `onPause`/`onStop`, page stays visible. The system
  cancels the finger (ship stops steering, autofire continues) while enemies keep firing behind the shade.
- **Repro (JS side verified-by-run)**: drag, CDP `touchCancel`, `window` `blur` → `levelTime` 22.66 → 26.11 in
  4 s, Game RUNNING, Pause never launched. (No-`onPause` for the shade: standard Android behaviour,
  unverified-by-run.)
- **Fix**: `MainActivity.onWindowFocusChanged(false)` → `bridge.triggerWindowJSEvent("ncfocusloss")` (or simply
  `bridge.getApp().fireStatusChange(false)`, and `fireStatusChange(true)` on regain when `resumed && !inPhoneCall`);
  JS: GameScene pauses on it (pause menu; audio may stay on).

### 3. MEDIUM (process) — The current Android project has never been built by CI
- **Evidence**: "Android APK" has 2 runs: #1 failed, #2 green at `9230a40` (11:49). Every later push was headed by
  a `[skip ci]` commit (`334e3a7` "Android/CI hardening", `ed5757a` included), so the rewritten workflow
  (checkout@v7, setup-node@v7, setup-java@v6, setup-android@v4, wrapper-validation@v6, upload-artifact@v7
  `archive: false`, download-artifact@v8), `MainActivity.java` (+223 lines), `proguard-rules.pro`, the signing
  block + `debug.keystore`, `res/raw/keep.xml`, `values-v28/styles.xml`, manifest and the SystemBars config of
  `capacitor.config.ts` have never gone through AGP / aapt2 / R8 / lintVital.
- **Checked locally**: `MainActivity.java` compiles (javac, API 36 framework + stubs; `MODE_CALL_REDIRECT` is
  inlined as `5`, safe on API 31/32); all 18 resource XML files parse and every `@…` reference resolves;
  `debug.keystore` opens with `android` / `androiddebugkey` (PKCS12, valid to 2056); every action major tag exists
  and `upload-artifact@v7` has the `archive` input; both workflow files parse; `playwright install --no-progress`
  is a valid flag. Gradle itself: **unverified-by-run** (no Android SDK; dl.google.com blocked here).
- **Fix**: run the workflow now (`workflow_dispatch` on the branch, or a push whose head commit has no
  `[skip ci]`) before anyone relies on an APK built from this tree.

### 4. LOW-MEDIUM — Phone calls: the pause is undone on return, and Android 7–11 has no call handling at all
- **Where**: `MainActivity.java:112-117` + Capacitor `BridgeActivity.java:94-101` (`onResume` always fires
  `appStateChange(true)`, even while `inPhoneCall`); `MainActivity.java:97-99,178-192` (mode listener on API 31+
  only; the `onCreate` call is dropped because JS is not loaded yet); `device.ts:34-35,106,113` merges
  `visibilitychange` and `appStateChange` last-writer-wins.
- **Scenario**: ringing → paused (good). The player switches back to the game while it still rings or during the
  call → `onResume` / `visibilitychange` report active → music plays over the ring / call. Launching the game
  during a call: same. On API 24-30 (minSdk 24) a ringing heads-up neither pauses the mission nor mutes it
  (WebAudio holds no audio focus; also mixes with alarms / navigation prompts — unverified-by-run).
- **Fix**: `onResume`: after `super.onResume()`, `if (inPhoneCall) bridge.getApp().fireStatusChange(false)`;
  `device.ts`: track `nativeActive` and `pageVisible` separately and `setActive(nativeActive && pageVisible)`;
  for all API levels request audio focus (`AudioFocusRequest`, `USAGE_GAME`) and map
  `AUDIOFOCUS_LOSS*` → `fireStatusChange(false)`, `AUDIOFOCUS_GAIN` → `true` (when resumed).

### 5. MEDIUM on web / LOW on Android phones — The canvas is centred twice
- **Where**: `index.html:20-24` (`#game { display:flex; align-items:center; justify-content:center }`) +
  `src/main.ts:30-31` (`autoCenter: CENTER_BOTH`, Phaser writes `margin-left/top = (parent − canvas) / 2`).
  Flex then centres the margin box, so the canvas sits margin/2 too far right/down.
- **Repro (verified-by-run)**: 1280×720 → canvas left 600 px (centred: 400); 1920×1080 → 900 (600);
  768×1024 portrait tablet → 63.7 (42.6); 412×915 phone → 0 (correct). Unfolded foldables / 4:3 tablets in
  portrait are visibly off-centre; input mapping stays right (Phaser reads `getBoundingClientRect`).
- **Fix**: `index.html`: drop `display:flex; align-items:center; justify-content:center` from `#game`
  (`main.ts` is a contract file).

### 6. LOW — Resume pressed and app backgrounded in the same frame → mission runs with no pause menu
- **Where**: `src/scenes/PauseScene.ts:190-196` (`scene.resume(Game)` + `scene.stop()` are queued until the
  next SceneManager update); `GameScene.ts:385-386` (`pauseGame()` bails while `this.paused` is still true);
  `GameScene.ts:393-398` (`onResume` ignores the app state).
- **Repro (verified-by-run)**: `Pause.resume()` then `appStateChange(false)` + hidden, page frozen 300 ms,
  foreground → Game RUNNING, Pause SHUTDOWN. Window is one frame (Home / power / the ringing event).
- **Fix**: `GameScene.onResume()`: `if (!isAppActive()) { this.paused = false; this.pauseGame(); }`.

### 7. LOW — The first finger steers until it lifts: a resting palm / grip blocks control
- **Where**: `src/input/controls.ts:237-271` (driver kept until released; `pickPointer` takes the *earliest* press).
- **Repro (verified-by-run)**: finger 0 held still, finger 1 drags 30 css px → ship x 132 → 132; after finger 0
  lifts, finger 1 takes over without a jump (132 → 160). On curved-edge phones a grip contact that lands first
  makes the thumb dead.
- **Fix**: hand over to a newer pointer when the current driver has not moved > ~2 px for ~250 ms (or prefer the
  most recent press), keeping the no-jump re-anchoring.

### 8. LOW — Audio facade: context created while the app is inactive plays; `suspend()` skips non-running contexts
- **Where**: `src/audio/index.ts:64-100,138-157` and `199-209`.
- **Repro (WebAudio mock, WebView semantics)**: `suspend()` (e.g. ringing before the first tap) → `unlock()` →
  context `running`, `suspended:true`, 3 music steps scheduled. Context `interrupted` when the app goes to
  background → `ctx.suspend()` not called; when the UA ends the interruption it runs in background (audio device
  kept open — battery). (`interrupted` reachability on Android Chromium: unverified.)
- **Fix**: in `create()` (or right after it in `unlock()`), `if (st.userSuspended) { quiet(ctx.suspend()); music.pause(); }`;
  in `suspend()`, call `quiet(l.ctx.suspend())` whenever `state !== 'closed'`.

### 9. LOW — Screen never sleeps, even on the title / pause / menu screens
- **Where**: `MainActivity.java:74` (`FLAG_KEEP_SCREEN_ON` for the whole activity life).
- **Scenario**: phone left on the pause menu or title → screen on until the battery dies; static HUD / menu on
  OLED. **Fix**: keep the flag only while a mission runs unpaused (JS → small native call or `triggerJSEvent`
  bridge), or clear it after a few idle minutes in menus.

### 10. LOW — Back at the root is always intercepted (no predictive back-to-home)
- **Where**: `@capacitor/app` `AppPlugin.java:46` (callback always enabled once a `backButton` listener exists),
  `device.ts:116-122` (`minimizeApp` = `moveTaskToBack`). With targetSdk 36 the system back-to-home animation never
  plays on the title screen. **Fix**: on the Title main menu `App.toggleBackButtonHandler({ enabled: false })`,
  re-enable when leaving it / opening the difficulty list (unverified-by-run).

### 11. LOW — Edge drags compete with system gestures
- The drag area is the whole screen (`GameScene.ts:56-60,204-208`). With gesture navigation, a drag starting near
  the left/right edge is taken by the system (back gesture, or transient bars in immersive mode) → `touchcancel`
  → ship stops. **Fix**: `webView.setSystemGestureExclusionRects()` (API 29+, ≤ 200 dp per edge) over the lower
  playfield where thumbs rest (unverified-by-run).

### 12. LOW — Logical height measured once at module load
- `src/config.ts:13-26` (contract) reads `#game` once. If the WebView ≥ 140 receives its safe-area insets after
  that read, or the app starts in split-screen / pop-up view, `H` is wrong for the whole session (thin side bars,
  or 320×480 letterboxed on a tall phone). Integrator: consider re-reading on the first `resize` before Boot ends
  (unverified-by-run).

### 13. LOW — Broken mission traps Back
- `GameScene.ts:204` builds Controls (back handler) before `this.running = true` (`:229`); if `create()` throws in
  between, `update()` bails (`:463`) and every Back press is consumed. **Fix**: Controls' handler should return
  false unless the scene says it is playable (callback), or create Controls last.

### 14. INFO
- `touchcancel` logs a console **error** in Chrome ("Ignored attempt to cancel a touchcancel event with
  cancelable=false…", Phaser `TouchManager.js:307-318` calls `preventDefault` unconditionally). Harmless on device;
  any smoke check that exercises a cancel would fail on it — whitelist that message in the harness.
- HUD rear button = drag dead zone without a rear gun (start loadout): `hudButtonAt` excludes it while
  `onRearDown` does nothing. UI/HUD owners.
- Local builds get versionCode 1 and cannot install over a CI debug build (same key) → `adb install -r -d` or set
  `ANDROID_VERSION_CODE`.
- `MainActivity.Api31` lacks `@RequiresApi(Build.VERSION_CODES.S)`: a full `./gradlew lint` reports NewApi errors
  (lintVital in release builds only checks fatal issues, so builds pass).
- Renderer loss: the dead WebView stays attached until the posted `recreate()` runs (Android docs ask to remove it
  first); Capacitor lifecycle events hit it meanwhile. Probably harmless (unverified-by-run).
- WebGL context loss in the foreground: the simulation keeps running while nothing is drawn (34.5 s → 37.1 s
  during a 1.5 s loss). Optional: pause the mission on `LOSE_WEBGL`.
- `latencyHint: 'interactive'` (`index.ts:69`) selects the smallest Android output buffer; on low-end phones
  under load `'balanced'` (~40 ms) is less prone to crackles. Tuning only.

---

## Verified OK (no action)

- **Audio unlock**: Chrome default autoplay policy + touch → context `running` after the first tap (window
  capture listeners include `pointerup` / `touchend`, the activating events). Capacitor sets
  `setMediaPlaybackRequiresUserGesture(false)` (`Bridge.java:592`), so WebView never blocks it.
- **Background / foreground**: `appStateChange(false)` / hidden → context `suspended`, scheduler timer stopped,
  mission paused (pause menu on return); foreground → `running`. Quick hide/show is fine (Chromium `suspend()`
  flips the state synchronously).
- **Music**: 3 s frozen background → 0 late steps, 0 re-anchors, context clock froze; no drift.
- **Clipping**: offline worst case (boss track + 60 SFX at volume 2 within 0.15 s, 48 kHz) → peak −0.9 dBFS,
  0 clipped samples, 23 voices; music alone −14 LUFS.
- **Touch**: drag OK; `touchcancel` drops the driver; multi-touch hand-over without a jump; finger held across
  pause/resume is re-acquired without a jump; a HUD pause tap never starts a drag and pauses; 4th finger ignored
  (3 slots) and every slot freed on release. Drag deltas are game px (FIT `displayScale`): independent of DPR.
- **Back**: Title press/main → `minimizeApp`; difficulty → main menu; Game → Pause; Pause → resume; confirm
  dialogs close before their scene (modal levels); Map panel / Shop category close first; Hangar asks first.
  No handler leaks (all entries removed on SHUTDOWN / DESTROY), no double handling (kit Escape/Backspace keys are
  never installed on the Game scene).
- **WebGL context loss + restore** mid-mission: renderer recovers, every texture intact (canvas-backed; no
  DynamicTexture in `src/`) — screenshot `screens/revpl-ctx-after.png`.
- **Haptics**: 1 bridge call in 6 s of play (rate limits work); VIBRATE declared (app + plugin manifest).
- **Android config**: portrait + `configChanges` (no reload on rotation/fold/multi-window), `appCategory=game`
  keeps the portrait lock on Android 16 large screens, immersive re-applied on resume / focus gain, cutout mode
  short-edges, SystemBars `css` insets (WebView ≥ 140: `env()`, older: decor padding), splash bounded to 4 s,
  renderer-loss recreate with crash-loop guard.
- **Gradle / CI logic**: versionName from `package.json` (semver checked), versionCode from run number;
  release signing only when all four secrets are set (keystore checked with keytool first, `apksigner verify`
  after); without secrets the R8 release build runs unsigned and non-blocking; R8 keeps `com.getcapacitor.**`,
  `com.capacitorjs.plugins.**` (@capacitor/app, @capacitor/haptics), Cordova and the app package, on top of
  Capacitor's consumer rules; JDK 21 matches `capacitor.build.gradle`; tag builds gate on tests and on the
  tag/version match; `contents: write` only on the release job; tags are not cancelled by concurrency.
