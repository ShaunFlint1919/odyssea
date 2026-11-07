# Nova Corsair — Roadmap (checklist pilotée par la boucle)

Légende : `[x]` fait et vérifié · `[~]` fait mais vérification incomplète (préciser) · `[ ]` à faire.
La boucle de développement (docs/MEGA_PROMPT.md) choisit toujours les items non cochés de
plus fort impact. Chaque item coché doit avoir été vérifié (test, capture ou run CI).
Itération 0 (2026-11-07) : voir docs/PROGRESS.md pour les preuves.

## M0 — Fondation
- [x] Projet Vite + TypeScript + Phaser 3.90 dans `game/` (dépôt dédié au jeu, ancien site supprimé)
- [x] Contrats partagés (`src/types.ts`, `src/art/keys.ts`, `src/game/contracts.ts`, `src/game/arsenal/api.ts`, `src/ui/kit.ts`, `src/debug.ts`)
- [x] Usine de pixel-art procédural (`src/art/pixel.ts`) + galerie de textures (`gallery.html`)
- [x] Projet Android Capacitor 8 (`game/android/`)
- [x] Workflows GitHub Actions `Game CI` et `Android APK` verts sur le jeu complet (runs #3, commit 74b90da)

## M1 — Tranche verticale jouable
- [x] Boucle complète : Titre → Nouvelle partie → Hangar → Refit Bay → Mission → Fin de niveau → Hangar
- [x] Mort → Game Over → Réessayer / Hangar ; Pause → Reprendre / Options / Abandonner
- [x] Sauvegarde locale (crédits, équipement, progression, options, transmissions lues)
- [x] Smoke test Playwright sans aucune erreur console (16/16)

## M2 — Sensations de jeu (game feel)
- [~] Contrôle tactile relatif (le doigt ne cache jamais le vaisseau), clavier, manette — vérifié en émulation tactile, pas sur téléphone réel ; manette non testée sur matériel
- [x] Impacts lisibles : flash, étincelles, hit-stop, secousse dosée (sans faire trembler le HUD), vibration
- [~] Balles ennemies lisibles sur les 8 biomes — vérifié sur captures ; à confirmer sur écran de téléphone
- [x] Rythme élevé : vagues toutes les 1,3-3,5 s, crescendo avant les boss, télégraphe des attaques par le bas
- [x] Courbe de difficulté des planètes 1-2 validée par le pilote automatique `?bot=1` (survie, durées de combat)
- [ ] Playtest humain sur téléphone (ressenti, difficulté réelle — le bot esquive mieux qu'un humain)

## M3 — Arsenal
- [x] 8 armes avant distinctes, 10 niveaux de puissance visiblement différents
- [x] 5 armes arrière avec 2 modes (A/B) basculables en vol
- [x] 6 drones latéraux (pod, twin, orbiteur bloqueur, roquettes, éclats, canon à charge)
- [x] 6 coques, 6 boucliers, 6 générateurs — modèle énergie/bouclier/blindage avec vrais arbitrages
- [x] Aperçu animé des armes dans la Refit Bay

## M4 — Bestiaire & boss
- [x] 109 types d'ennemis (air / sol / mer / dangers), 14 mouvements et 12 patterns de tir
- [x] Unités au sol qui défilent avec le terrain, tourelles orientées vers le joueur, ombres portées
- [x] 8 boss multi-phases avec parties destructibles + 1 mini-boss par planète
- [x] Mort de boss spectaculaire (chaîne d'explosions, ralenti, balles → crédits)

## M5 — Campagne
- [x] 8 planètes × 3 niveaux = 24 niveaux scénarisés
- [x] Carte stellaire (Star Chart) avec routes, verrous, rejouabilité
- [x] Histoire originale via 24 transmissions
- [~] Économie équilibrée (prime de mission comprise) — modèle + bot ; recalibrage boss post-correctifs en cours

## M6 — Visuel (cible : scorecard ≥ 4/5 partout)
- [x] Terrains des 8 biomes riches et sans couture, décor, nuages/brume en parallaxe
- [x] Explosions multi-frames, débris, fumée, ondes de choc
- [x] HUD latéral original lisible
- [x] Menus unifiés (hangar, refit bay, loadout stats, star chart, transmissions, options)
- [x] Logo et écran titre animés
- [ ] Scorecard formelle (15 critères) notée sur captures — à faire à l'itération 1

## M7 — Audio
- [~] SFX procéduraux, mixage sans saturation (mesuré : pic −0,9 dBFS) — jamais écouté par un humain
- [~] Musique chiptune procédurale par biome + boss + menus (13 morceaux) — idem, à écouter sur téléphone

## M8 — Mobile / Android
- [~] Performance : 58-59 fps en headless, ~4 ms JS/frame à CPU ×4 ; pas encore mesuré sur un vrai téléphone
- [~] Plein écran immersif, portrait verrouillé, écran allumé, encoche, splash Android 12+ — compilé en CI, pas testé sur appareil
- [x] Bouton retour Android géré partout, pause automatique en arrière-plan (vérifié avec un pont Capacitor simulé)
- [x] Icône et splash originaux (icône thématique Android 13+)
- [~] APK release signée + AAB + GitHub Release sur tag `v*` — pipeline prêt, nécessite les 4 secrets de signature

## M9 — Finitions
- [ ] Tutoriel intégré au premier niveau (overlay discret)
- [ ] Localisation FR / EN
- [ ] Mode Arcade / survie après la campagne
- [ ] Accessibilité : option balles contrastées, réduction des flashs
- [ ] Phaser allégé (build sur mesure, −550 Ko) — voir docs/REVIEW_PERF.md

## M10 — Release 1.0
- [ ] Tous les items M0-M8 cochés, scorecard ≥ 4/5 sur chaque critère et moyenne ≥ 4,5
- [ ] 2 runs CI consécutifs verts, APK release téléchargeable
- [ ] Tag `v1.0.0`
