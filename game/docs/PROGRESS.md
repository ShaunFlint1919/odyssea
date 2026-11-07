# Journal de progression — Nova Corsair

Entrées les plus récentes EN HAUT. Chaque itération de la boucle (docs/MEGA_PROMPT.md) ajoute une
entrée : date, scorecard avant → après, changements, preuves, problèmes connus, prochaine étape.

## Itération 0 — 2026-11-07 — Construction initiale (session de fondation, ~30 agents)

**Organisation.** Le dépôt est dédié au jeu (ancien site supprimé de la branche
`ccr-47cc43a7-n24a5r`). Construction massivement parallèle par agents sur des périmètres de
fichiers disjoints, contrats écrits d'abord (`src/types.ts`, `src/art/keys.ts`,
`src/game/contracts.ts`, `src/game/arsenal/api.ts`, `src/ui/kit.ts`, `src/debug.ts`) :
- Fondation : contenu (catalogues + 24 niveaux + 24 transmissions), art ×5 (polices/UI/planètes,
  vaisseaux/tirs/FX, ennemis, boss, terrains), plateforme (sauvegarde/économie/progression,
  contrôles, Android, CI, outils), audio.
- Jeu : monde (GameScene, ennemis, boss, directeur), armement, kit UI + scènes de flux,
  hangar/refit bay/stats/carte, HUD.
- Vague 2 : ressenti & perf (pilote `?bot=1`, terrain incrémental, barre de chargement),
  équilibrage (outil `tools/playtest.mjs`), rendu des armes, cohérence UI, durcissement
  Android/CI, relecture d'originalité.
- Relectures adverses (rapports `docs/REVIEW_*.md`) puis correctifs : gameplay (collisions
  balayées, splash, abandon après victoire…), état (prime de mission jamais versée, frontière de
  campagne, sauvegarde protégée des URL de debug…), plateforme, performance (variantes de
  palette générées à la demande, textures sans copie ImageData, FX Phaser désactivés).

**État vérifié.**
- `npm run typecheck` 0 erreur · `npm test` 90 tests verts · smoke Playwright 16/16 sans erreur
  console (toutes les scènes + un niveau par planète, 58-59 fps headless).
- CI : `Game CI` #3 et `Android APK` #3 verts sur le jeu complet (commit 74b90da) ; build release
  R8 non signé vert ; artefact `nova-corsair-0.1.0-build3-debug.apk` (5,7 Mo).
- Pilote automatique, équipement de départ : survit à kessra-1/2/3 ; mini-boss kessra-2 abattu en
  ~23 s, Colossus en ~78 s à P2 (bande cible 45-75 s pour un joueur équipé normalement).
- Perf (CPU ×4, build de prod) : ~3,5-4,2 ms JS/frame en moyenne sur les combats lourds ;
  titre atteint en ~1,8 s en dev headless après optimisations.

**Scorecard initiale (estimation sur captures, à re-mesurer à l'itération 1).**
1 balles 4 · 2 densité 4 · 3 terrains 4 · 4 sprites 4 · 5 effets 4 · 6 HUD 4 · 7 menus 4 ·
8 game feel 3 (pas de test sur téléphone) · 9 arsenal 4 · 10 boss 4 · 11 progression 3 (recalibrage
en cours, pas de playtest humain) · 12 audio 3 (jamais écouté) · 13 perf mobile 3 (pas mesuré sur
appareil) · 14 stabilité 4 · 15 originalité 4 (relecture faite, corrections appliquées).

**Problèmes connus / prochaines étapes (itération 1).**
- Tester l'APK sur un vrai téléphone (contrôle tactile, 60 fps, audio, encoche, appels).
- Recalibrage final des boss Cinder → Axiom après la correction du double splash (en cours).
- Écouter musique et SFX, ajuster le mix ; tutoriel discret au premier niveau.
- Reste des rapports `docs/REVIEW_*.md` non traités (H3/H4 gameplay, items INFO plateforme,
  build Phaser sur mesure).
- Secrets de signature pour l'APK release / AAB Play Store (décision et action de Shaun).
