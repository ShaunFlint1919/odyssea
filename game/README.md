# Nova Corsair

*[English version below](#english)*

## Français

**Nova Corsair** est un shoot'em up spatial **original** à défilement vertical, très nerveux,
pensé pour le mobile en mode portrait (Android) et jouable dans le navigateur. Pilote corsaire
indépendant, vous affrontez le « Directorat Axiome » sur 8 planètes × 3 niveaux (un mini-boss au
niveau 2, le boss de la planète au niveau 3). Entre deux missions, le hangar et la boutique
permettent d'acheter et d'améliorer coque, arme avant (10 niveaux de puissance), arme arrière
(2 modes), bouclier, générateur et drones gauche/droite — avec reprise à 100 % de l'objet
remplacé. Tout l'art, les polices, les terrains, les sons et la musique sont **générés en code** :
aucun fichier d'asset binaire.

Pile technique : Phaser 3.90 · TypeScript strict · Vite 6 · Capacitor 8 (Android 7 à 16) · Vitest · Playwright.

### Lancer le jeu

Prérequis : Node.js 22.

```bash
cd game
npm ci
npm run dev          # http://localhost:5173/
```

Contrôles : glisser le doigt **n'importe où** sur l'aire de jeu (déplacement relatif : le doigt ne
cache jamais le vaisseau), tir automatique (option). Clavier : flèches / WASD, Espace / Z pour
tirer, X / Maj pour le mode de l'arme arrière, P / Échap pour la pause. Manette : stick / croix,
A pour tirer, B / X mode arrière, Start pause. Android : bouton Retour = pause.

### Paramètres d'URL de debug

| Paramètre | Effet |
|---|---|
| `?scene=Game&level=kessra-1` | démarre directement dans une scène (`Title`, `Map`, `Hangar`, `Shop`, `Specs`, `Options`, `Intel`, `Game`…) ; `Game` utilise `level` |
| `&god=1` | le joueur ne peut pas mourir |
| `&t=40` | avance le niveau jusqu'à 40 s |
| `&max=1` | équipement maximal + crédits, tous les niveaux débloqués |
| `&credits=50000` | fixe les crédits |
| `&seed=123` | force la graine aléatoire |
| `&mute=1` | coupe le son |
| `&fps=1` | affiche les FPS |
| `&speed=2` | accélère le temps de jeu |
| `&shop=front` | ouvre la boutique sur une catégorie (avec `scene=Shop`) |

Exemple : `http://localhost:5173/?scene=Game&level=kessra-1&god=1&t=40&mute=1`.
`window.__NC__` expose l'état du jeu (`ready`, `scene`, `errors`, `state.levelTime`…) pour les scripts.

### Tests et vérifications

```bash
npm run typecheck    # tsc --noEmit
npm test             # Vitest : sauvegarde, économie, progression, validation du contenu…
npm run build        # typecheck + bundle de production dans dist/
npm run smoke        # Playwright : toutes les scènes + 1 niveau par planète en god mode ; échoue sur toute erreur console
npm run screens      # Playwright : captures dans screens/ (menus, gameplay par planète, boss)
node tools/smoke.mjs --dist            # même smoke test sur le build de production (dist/)
node tools/screens.mjs --only boss     # seulement les captures dont le nom contient « boss »
node tools/icons.mjs                   # régénère icônes, icône monochrome (Android 13+) et splash (+ screens/icons-preview.png)
```

Les outils Playwright démarrent leur propre serveur Vite (port `--port <n>`, variable `PORT`,
4173 par défaut) et l'arrêtent à la fin.

### Installer l'APK sur un téléphone Android

Chaque push sur `main` ou une branche `ccr-**` qui modifie le jeu construit l'APK sur GitHub
Actions (workflow **Android APK**, quelques minutes). Pour le récupérer :

1. Sur le téléphone (ou l'ordinateur), connecté à GitHub : onglet **Actions** du dépôt →
   **Android APK** → le dernier run **vert**. Le résumé du run donne la version, la taille, l'empreinte
   SHA-256 et des liens directs.
2. Section **Artifacts** :
   - **`nova-corsair-<version>-build<N>-debug.apk`** : l'APK lui-même, rien à décompresser (le plus simple sur le téléphone) ;
   - **`nova-corsair-debug-apk`** : un zip contenant le même APK. Le décompresser (appli *Fichiers* : appui long → *Extraire*, ou sur ordinateur).
3. Ouvrir l'APK sur le téléphone. La première fois, Android demande d'autoriser **l'installation
   d'applications inconnues** pour l'appli qui ouvre le fichier (Chrome ou Fichiers) : *Paramètres* →
   autoriser, puis revenir et **Installer**. Android 7 : *Paramètres → Sécurité → Sources inconnues*.
   Si Play Protect avertit d'une appli non reconnue : *Plus de détails → Installer quand même*.

Alternative depuis un ordinateur (options pour les développeurs → débogage USB activé) :

```bash
adb install -r nova-corsair-0.1.0-build42-debug.apk    # -r : met à jour en gardant la sauvegarde
```

Bon à savoir :
- La version de test s'appelle **Nova Corsair Dev** (paquet `com.shaunflint.novacorsair.debug`) : elle
  s'installe à côté de la version release/Play Store, avec sa propre sauvegarde.
- Toutes les APK de test sont signées avec la même clé de debug (`android/app/debug.keystore`,
  mots de passe publics `android`) : chaque nouvelle build **se met à jour par-dessus la précédente**
  et garde la sauvegarde. Les toutes premières APK (`app-debug.apk`, paquet `com.shaunflint.novacorsair`)
  étaient signées avec une clé aléatoire : les désinstaller une fois.
- « Application non installée » = une version signée avec une autre clé est déjà présente : la désinstaller.
- Les builds de test autorisent le débogage du WebView : téléphone en USB, ouvrir `chrome://inspect`
  dans Chrome sur l'ordinateur pour voir la console du jeu.

Construction locale (SDK Android + JDK 21) : `npm run android:debug` →
`android/app/build/outputs/apk/debug/app-debug.apk`.

### APK release signée et Google Play (AAB)

Sans secrets, la CI ne produit que l'APK de test (et vérifie à chaque run que le build release
minifié par R8 passe, sans le publier). Avec une clé de signature, elle produit aussi l'APK release
signée et l'**Android App Bundle (`.aab`)** à envoyer sur Google Play.

1. Créer la clé une seule fois (JDK requis ; **la sauvegarder hors du dépôt avec ses mots de passe** :
   toutes les mises à jour devront être signées avec elle) :

   ```bash
   keytool -genkeypair -v -keystore nova-corsair-release.jks -alias novacorsair \
     -keyalg RSA -keysize 4096 -validity 10000
   ```

   keytool crée un keystore PKCS12 : la clé a le même mot de passe que le keystore.
2. L'encoder en base64 :
   - Linux : `base64 -w0 nova-corsair-release.jks > keystore.b64`
   - macOS : `base64 -i nova-corsair-release.jks -o keystore.b64`
   - Windows (PowerShell) : `[Convert]::ToBase64String([IO.File]::ReadAllBytes("nova-corsair-release.jks")) | Set-Content keystore.b64`
3. Dans GitHub : **Settings → Secrets and variables → Actions → New repository secret**, ajouter
   les 4 secrets :

   | Secret | Valeur |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | le contenu de `keystore.b64` |
   | `ANDROID_KEYSTORE_PASSWORD` | le mot de passe du keystore |
   | `ANDROID_KEY_ALIAS` | l'alias (`novacorsair` ci-dessus) |
   | `ANDROID_KEY_PASSWORD` | le mot de passe de la clé (le même que celui du keystore en PKCS12) |

   Ou avec le CLI GitHub : `gh secret set ANDROID_KEYSTORE_BASE64 < keystore.b64`, puis
   `gh secret set ANDROID_KEYSTORE_PASSWORD` (etc., la valeur est demandée).
4. Les runs suivants publient en plus les artifacts **`nova-corsair-release-apk`** (APK signée),
   **`nova-corsair-release-aab`** (bundle Play Store) et **`nova-corsair-r8-mapping`**
   (`mapping.txt`, pour relire les traces de crash). La CI vérifie le mot de passe et l'alias avant de
   construire et s'arrête avec un message clair s'ils sont faux.

Google Play : créer l'application dans la Play Console, activer *Play App Signing* et envoyer le
`.aab` (la clé ci-dessus devient la « clé d'importation »). Le `versionCode` augmente à chaque run.

Ne jamais committer le keystore release (`*.jks` et `*.keystore` sont ignorés par git, sauf la clé de
debug partagée). Localement, `android/app/build.gradle` lit les mêmes variables d'environnement
`ANDROID_KEYSTORE_PATH` (chemin du `.jks`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD` : `cd android && ./gradlew assembleRelease bundleRelease`.

### Publier une version (tag)

- `versionName` = champ `version` de `game/package.json` (source unique) ; les builds de test
  ajoutent `-dev.<N>`. `versionCode` = numéro de run du workflow (`GITHUB_RUN_NUMBER`, toujours
  croissant), 1 en local, ou `ANDROID_VERSION_CODE` s'il est défini.

1. Mettre `version` de `game/package.json` à la nouvelle version (ex. `0.2.0`), ainsi que `VERSION`
   dans `src/config.ts` (affichée dans le jeu). Committer et pousser.
2. Créer et pousser le tag correspondant :

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

3. Le workflow **Android APK** lance les tests (bloquants pour une release), construit et publie une
   **GitHub Release** `v0.2.0` avec notes générées automatiquement : APK release signée, `.aab`,
   `mapping.txt` (si les secrets existent), APK de test et `SHA256SUMS.txt`. Un tag avec un tiret
   (`v0.2.0-beta.1`) donne une pré-release. Si le tag ne correspond pas à `package.json`, le run
   échoue immédiatement.

### Intégration continue

- **Game CI** (`.github/workflows/game-ci.yml`) : à chaque push qui modifie `game/` (hors docs) et
  sur les pull requests venant de forks. Typecheck → tests → build → smoke tests Playwright
  (serveur de dev puis `dist/`) → captures, publiées dans l'artifact **`nova-corsair-screens`**
  (14 jours). Les étapes rapides passent d'abord : un commit cassé échoue en ~1 min.
- **Android APK** (`.github/workflows/android-apk.yml`) : push sur `main` / `ccr-**` (hors docs,
  tests, outils), tags `v*`, ou lancement manuel (**Run workflow**). Indépendant de Game CI ; caches
  npm et Gradle ; artifacts de test gardés 14 jours, release 30 jours ; résumé du run avec tailles,
  SHA-256 et procédure d'installation.

### Structure du projet

```
game/
  index.html, src/main.ts        point d'entrée (Phaser, échelle FIT, portrait, zone sûre / encoche)
  src/config.ts types.ts debug.ts  constantes, contrats de données, hooks de debug
  src/art/                       génération procédurale des textures (sprites, terrains, polices, UI)
  src/data/                      catalogue : coques, armes, ennemis, boss, planètes, niveaux, transmissions
  src/game/                      gameplay (monde, armes, ennemis, collisions, aperçu boutique)
  src/scenes/  src/ui/           scènes Phaser (titre, carte, hangar, boutique, jeu…) et HUD
  src/state/                     sauvegarde (localStorage), économie de la boutique, progression
  src/input/                     contrôles (tactile relatif, clavier, manette, bouton Retour)
  src/audio/                     effets sonores et musique procéduraux (WebAudio)
  src/platform/                  Capacitor : cycle de vie de l'app, bouton Retour, vibrations
  tests/                         tests Vitest
  tools/                         smoke.mjs, screens.mjs, icons.mjs, gallery-shot.mjs (Playwright)
  android/                       projet Android Capacitor : MainActivity (plein écran immersif, écran
                                 allumé, splash, WebView), portrait, icônes, signature, règles R8
  docs/                          architecture, feuille de route, journal, cibles visuelles
../.github/workflows/            Game CI (tests + smoke + captures) et Android APK (APK, AAB, releases)
```

---

<a id="english"></a>

## English

**Nova Corsair** is an **original**, fast-paced vertical scrolling space shooter for mobile
portrait play (Android) that also runs in the browser. As an independent corsair pilot you fight
the "Axiom Directorate" across 8 planets × 3 levels (a mid-boss in level 2, the planet boss in
level 3). Between missions, the hangar and shop let you buy and upgrade hull, front gun (10 power
levels), rear gun (2 modes), shield, generator and left/right drones, with a 100 % trade-in of
the replaced item. All art, fonts, terrain, sound effects and music are **generated in code**:
there are no binary assets.

Stack: Phaser 3.90 · strict TypeScript · Vite 6 · Capacitor 8 (Android 7 to 16) · Vitest · Playwright.

### Run the game

Requirements: Node.js 22.

```bash
cd game
npm ci
npm run dev          # http://localhost:5173/
```

Controls: drag **anywhere** on the playfield (relative movement: your finger never hides the
ship), optional autofire. Keyboard: arrows / WASD, Space / Z fire, X / Shift rear-gun mode,
P / Esc pause. Gamepad: stick / d-pad, A fire, B / X rear mode, Start pause. Android back = pause.

### Debug URL parameters

| Parameter | Effect |
|---|---|
| `?scene=Game&level=kessra-1` | start directly in a scene (`Title`, `Map`, `Hangar`, `Shop`, `Specs`, `Options`, `Intel`, `Game`…); `Game` uses `level` |
| `&god=1` | the player cannot die |
| `&t=40` | fast-forward the level to 40 s |
| `&max=1` | max loadout + credits, every level unlocked |
| `&credits=50000` | set the credits |
| `&seed=123` | force the RNG seed |
| `&mute=1` | no audio |
| `&fps=1` | show FPS |
| `&speed=2` | gameplay time scale |
| `&shop=front` | open the shop on a category (with `scene=Shop`) |

Example: `http://localhost:5173/?scene=Game&level=kessra-1&god=1&t=40&mute=1`.
`window.__NC__` exposes game state (`ready`, `scene`, `errors`, `state.levelTime`…) to scripts.

### Tests and checks

```bash
npm run typecheck    # tsc --noEmit
npm test             # Vitest: save, economy, progress, content validation…
npm run build        # typecheck + production bundle in dist/
npm run smoke        # Playwright: every scene + 1 level per planet in god mode; fails on any console error
npm run screens      # Playwright: screenshots in screens/ (menus, gameplay per planet, bosses)
node tools/smoke.mjs --dist            # same smoke test against the production build (dist/)
node tools/screens.mjs --only boss     # only the screenshots whose name contains "boss"
node tools/icons.mjs                   # regenerate icons, monochrome icon (Android 13+) and splash (+ screens/icons-preview.png)
```

The Playwright tools start their own Vite server (`--port <n>`, `PORT` env, default 4173) and
stop it when done.

### Install the APK on an Android phone

Every push to `main` or a `ccr-**` branch that changes the game builds the APK on GitHub Actions
(**Android APK** workflow, a few minutes). To get it:

1. On the phone (or a computer), signed in to GitHub: repository **Actions** tab → **Android APK**
   → the latest **green** run. The run summary lists the version, size, SHA-256 and direct links.
2. **Artifacts** section:
   - **`nova-corsair-<version>-build<N>-debug.apk`**: the APK itself, nothing to unzip (easiest on the phone);
   - **`nova-corsair-debug-apk`**: a zip holding the same APK. Extract it (*Files* app: long press → *Extract*, or on a computer).
3. Open the APK on the phone. The first time, Android asks you to allow **installing unknown apps**
   for the app that opens the file (Chrome or Files): *Settings* → allow, go back and **Install**.
   Android 7: *Settings → Security → Unknown sources*. If Play Protect warns about an unrecognised
   app: *More details → Install anyway*.

From a computer instead (Developer options → USB debugging on):

```bash
adb install -r nova-corsair-0.1.0-build42-debug.apk    # -r: update in place, keep the save
```

Good to know:
- The test build is **Nova Corsair Dev** (package `com.shaunflint.novacorsair.debug`): it installs next
  to the release / Play Store build, with its own save.
- Every test APK is signed with the same debug key (`android/app/debug.keystore`, public `android`
  passwords), so each new build **updates the previous one in place** and keeps the save. The very
  first APKs (`app-debug.apk`, package `com.shaunflint.novacorsair`) used a random key: uninstall them once.
- "App not installed" means a build signed with another key is already there: uninstall it.
- Test builds allow WebView debugging: with the phone on USB, open `chrome://inspect` in desktop
  Chrome to see the game's console.

Local build (Android SDK + JDK 21): `npm run android:debug` →
`android/app/build/outputs/apk/debug/app-debug.apk`.

### Signed release APK and Google Play (AAB)

Without secrets, CI only produces the test APK (and checks on every run, without publishing it,
that the R8-minified release build still works). With a signing key it also produces the signed
release APK and the **Android App Bundle (`.aab`)** to upload to Google Play.

1. Create the key once (needs a JDK; **back it up outside the repository together with its
   passwords**: every future update must be signed with it):

   ```bash
   keytool -genkeypair -v -keystore nova-corsair-release.jks -alias novacorsair \
     -keyalg RSA -keysize 4096 -validity 10000
   ```

   keytool creates a PKCS12 keystore: the key has the same password as the keystore.
2. Base64-encode it:
   - Linux: `base64 -w0 nova-corsair-release.jks > keystore.b64`
   - macOS: `base64 -i nova-corsair-release.jks -o keystore.b64`
   - Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("nova-corsair-release.jks")) | Set-Content keystore.b64`
3. On GitHub: **Settings → Secrets and variables → Actions → New repository secret**, add the
   4 secrets:

   | Secret | Value |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | the content of `keystore.b64` |
   | `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
   | `ANDROID_KEY_ALIAS` | the alias (`novacorsair` above) |
   | `ANDROID_KEY_PASSWORD` | the key password (the keystore password for PKCS12) |

   Or with the GitHub CLI: `gh secret set ANDROID_KEYSTORE_BASE64 < keystore.b64`, then
   `gh secret set ANDROID_KEYSTORE_PASSWORD` (etc., it prompts for the value).
4. Following runs also publish the **`nova-corsair-release-apk`** (signed APK),
   **`nova-corsair-release-aab`** (Play Store bundle) and **`nova-corsair-r8-mapping`**
   (`mapping.txt`, to read crash stack traces) artifacts. CI checks the password and alias before
   building and stops with a clear message when they are wrong.

Google Play: create the app in Play Console, enable *Play App Signing* and upload the `.aab` (the key
above becomes the "upload key"). The `versionCode` grows with every run.

Never commit the release keystore (`*.jks` and `*.keystore` are git-ignored, except the shared debug
key). Locally, `android/app/build.gradle` reads the same `ANDROID_KEYSTORE_PATH` (path to the `.jks`),
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` environment variables:
`cd android && ./gradlew assembleRelease bundleRelease`.

### Publish a version (tag)

- `versionName` = the `version` field of `game/package.json` (single source of truth); test builds
  append `-dev.<N>`. `versionCode` = the workflow run number (`GITHUB_RUN_NUMBER`, always
  increasing), 1 locally, or `ANDROID_VERSION_CODE` when set.

1. Set `version` in `game/package.json` to the new version (e.g. `0.2.0`), and `VERSION` in
   `src/config.ts` (shown in game). Commit and push.
2. Create and push the matching tag:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

3. The **Android APK** workflow runs the tests (blocking for a release), builds and publishes a
   **GitHub Release** `v0.2.0` with auto-generated notes: signed release APK, `.aab`, `mapping.txt`
   (when the secrets exist), the test APK and `SHA256SUMS.txt`. A tag with a hyphen
   (`v0.2.0-beta.1`) makes a pre-release. If the tag does not match `package.json`, the run fails
   right away.

### Continuous integration

- **Game CI** (`.github/workflows/game-ci.yml`): every push that changes `game/` (docs excluded) and
  pull requests from forks. Typecheck → tests → build → Playwright smoke tests (dev server, then
  `dist/`) → screenshots, published as the **`nova-corsair-screens`** artifact (14 days). The quick
  steps run first: a broken commit fails in about a minute.
- **Android APK** (`.github/workflows/android-apk.yml`): pushes to `main` / `ccr-**` (docs, tests and
  tools excluded), `v*` tags, or a manual **Run workflow**. Independent from Game CI; npm and Gradle
  caches; test artifacts kept 14 days, release ones 30 days; the run summary shows sizes, SHA-256 and
  the install steps.

### Project structure

```
game/
  index.html, src/main.ts        entry point (Phaser, FIT scaling, portrait, safe area / notch)
  src/config.ts types.ts debug.ts  constants, data contracts, debug hooks
  src/art/                       procedural texture generation (sprites, terrain, fonts, UI)
  src/data/                      catalogue: hulls, weapons, enemies, bosses, planets, levels, transmissions
  src/game/                      gameplay (world, weapons, enemies, collisions, shop preview)
  src/scenes/  src/ui/           Phaser scenes (title, map, hangar, shop, game…) and HUD
  src/state/                     save (localStorage), shop economy, campaign progress
  src/input/                     controls (relative touch, keyboard, gamepad, back button)
  src/audio/                     procedural sound effects and music (WebAudio)
  src/platform/                  Capacitor: app lifecycle, back button, haptics
  tests/                         Vitest suites
  tools/                         smoke.mjs, screens.mjs, icons.mjs, gallery-shot.mjs (Playwright)
  android/                       Capacitor Android project: MainActivity (immersive fullscreen, screen
                                 kept on, splash, WebView tuning), portrait, icons, signing, R8 rules
  docs/                          architecture, roadmap, progress log, visual targets
../.github/workflows/            Game CI (tests + smoke + screenshots) and Android APK (APK, AAB, releases)
```
