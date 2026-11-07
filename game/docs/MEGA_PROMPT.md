# MEGA PROMPT — boucle de développement « Nova Corsair »

## Mode d'emploi (pour toi, Shaun)

1. Ouvre une **nouvelle session Claude Code** sur le dépôt du jeu (`ShaunFlint1919/odyssea`, ou
   son nouveau nom si tu l'as renommé, ex. `nova-corsair`, ou le dépôt de sauvegarde).
2. Copie **tout le bloc** entre `===== DÉBUT DU PROMPT =====` et `===== FIN DU PROMPT =====`.
3. Colle-le dans le message, puis **ajoute tes images de référence** dans ce même message
   (captures d'écran de jeu, de menus, de boutique…).
4. Choisis le mode :
   - **Boucle autonome** : commence le message par `/loop` (sans intervalle). Claude fait une
     itération complète, pousse sur GitHub, puis programme lui-même l'itération suivante, jusqu'à
     ce que la « Definition of Done » soit atteinte.
   - **Mode intensif multi-agents** : le prompt demande déjà à Claude de déployer le maximum
     d'agents en parallèle ; ajoute en plus le mot `ultracode` pour qu'il orchestre des workflows
     à chaque itération (plus rapide, plus coûteux).
   - Les deux se combinent : `/loop ultracode` + le prompt.
5. Pour récupérer l'APK : onglet **Actions** du dépôt GitHub → workflow **Android APK** → dernier
   run vert → section **Artifacts** → `nova-corsair-debug-apk`.

---

```
===== DÉBUT DU PROMPT =====

<mission>
Tu es le lead développeur et directeur artistique de « Nova Corsair », un shoot'em up spatial
ORIGINAL à défilement vertical, très nerveux, pour Android (portrait), multi-planètes et
multi-niveaux, avec une boutique d'amélioration entre les missions (coque, arme avant, arme
arrière, bouclier, générateur, sidekicks gauche/droite). Le projet existe déjà : tu l'améliores
en BOUCLE, itération après itération, jusqu'à ce que le rendu et les sensations atteignent le
niveau des images de référence jointes à ce message et le concept décrit ci-dessous.
Tu travailles en autonomie : tu ne t'arrêtes pas pour demander une validation, sauf pour une
décision qui m'appartient vraiment (argent, publication sur un store, suppression de données).
Réponds-moi en français.
</mission>

<contexte_projet>
- Dépôt : ShaunFlint1919/odyssea (il a pu être renommé, ex. `nova-corsair` ; une copie de
  sauvegarde peut exister dans un autre dépôt). Le dépôt est entièrement dédié au jeu : l'ancien
  site web a été supprimé. Le jeu est dans le dossier `game/`, les workflows CI dans
  `.github/workflows/`.
- Si `game/` n'existe pas sur ta branche, récupère-le d'abord :
  `git fetch origin ccr-47cc43a7-n24a5r && git merge --no-edit origin/ccr-47cc43a7-n24a5r`
  (ou depuis `main` si cette branche y a été fusionnée).
- Stack : Phaser 3.90 + TypeScript strict + Vite 6 ; Android via Capacitor 8 (`game/android/`) ;
  tests Vitest ; Playwright 1.63 (Chromium préinstallé) pour smoke tests et captures.
- Tout l'art, les polices, les terrains, les sons et la musique sont générés PROCÉDURALEMENT en
  code (aucun fichier binaire d'asset) : ça garantit l'originalité et un APK léger. Garde ce
  principe (exception tolérée : icônes/splash Android générés par script).
- Lis d'abord, dans cet ordre : `game/docs/PROGRESS.md` (journal des itérations — reprends là où
  la précédente s'est arrêtée), `game/docs/ROADMAP.md` (checklist), `game/docs/ARCHITECTURE.md`
  (contrats, dossiers, règles), `game/docs/BALANCE.md`, puis `game/README.md`.
- Contrats à respecter : `src/types.ts`, `src/art/keys.ts`, `src/game/contracts.ts`, `src/debug.ts`.
  Tu peux les faire évoluer, mais de façon cohérente dans tout le code et documentée.
- Outils de vérification (depuis `game/`) :
  `npm run typecheck` · `npm test` · `npm run build` · `npm run smoke` (Playwright : toutes les
  scènes + une partie en god mode, échoue sur toute erreur console) · `npm run screens` (captures
  dans `game/screens/`) · `node tools/gallery-shot.mjs screens/x.png "filter=en_&scale=3"` (galerie
  de textures ; aussi `terrain=<biome>&chunks=3`, `font=1`).
- Paramètres d'URL de debug : `?scene=Game&level=kessra-1&god=1&t=40&max=1&mute=1&speed=2&fps=1`
  (`scene` = Title, Map, Hangar, Shop, Specs, Options, Intel, Game…). `window.__NC__` expose
  l'état (scène prête, erreurs, `state.levelTime`, `state.fps`…) pour les scripts Playwright.
- Tu peux regarder les PNG avec l'outil Read : c'est ainsi que tu compares ton rendu aux références.
</contexte_projet>

<images_de_reference>
Les images jointes à ce message sont la CIBLE de rendu et de « feeling ». Au début de chaque
session, analyse-les et écris (ou mets à jour) `game/docs/VISUAL_TARGETS.md` : pour chaque image,
liste les qualités mesurables à atteindre (densité d'ennemis/projectiles, lisibilité, palette,
niveau de détail du terrain, taille et durée des explosions, disposition du HUD, structure des
menus, typographie, hiérarchie visuelle, animation). S'il n'y a pas d'image dans le message,
utilise la cible décrite ci-dessous et le fichier VISUAL_TARGETS.md existant.

RÈGLE D'ORIGINALITÉ (non négociable) : on s'inspire du GENRE, de la densité, de la lisibilité et
de l'ergonomie des références, mais on ne copie JAMAIS leurs sprites, noms (jeu, vaisseaux,
armes, sociétés, planètes), ornements d'interface, niveaux, textes ou musiques. Tout ce qui est
produit doit être une création originale. Direction artistique propre à Nova Corsair : panneaux
« gunmetal » indigo, néons turquoise, accents magenta, or pour les crédits.

Cible décrite (si pas d'images) — ce que doit montrer le jeu fini :
- ÉCRAN DE JEU : aire de jeu à gauche (~82 % de la largeur), panneau HUD vertical à droite avec
  grandes jauges verticales (énergie du générateur en dégradé jaune→rouge, bouclier bleu,
  blindage orange), cases « écran LCD » pour arme avant / arme arrière + barres de puissance,
  mode de tir arrière, sidekicks, nom du niveau ; score en bas à gauche de l'aire de jeu.
- Terrains 16 bits vus de dessus, détaillés et variés : désert (dunes, palmiers, ruines), jungle
  (canopée, rivière), océan (archipels, écume), cavernes rocheuses (parois), espace (nébuleuses,
  plateformes d'astéroïdes), lave, glace, base technologique. Le décor ne doit jamais gêner la
  lecture des balles.
- Densité « bullet-heavy » : aux moments forts 15+ ennemis et 60+ projectiles ennemis à l'écran,
  grosses explosions multi-frames (boules de feu orange avec cœur blanc puis fumée), tourelles au
  sol, gros vaisseaux, ombres portées des unités aériennes sur le sol, sidekicks à côté du
  vaisseau, plusieurs flux de tirs du joueur de couleurs différentes.
- MENUS : écran « hangar » avec un grand cadre montrant le vaisseau équipé (coque + sidekicks +
  arc de bouclier) et ses crédits, une liste de menu en grosse police à droite/dessous, une ligne
  d'aide contextuelle en bas ; boutique par catégorie (coque, avant, arrière, bouclier,
  générateur, sidekick G/D) avec icône + nom + prix, fenêtre d'aperçu animée de l'arme qui tire,
  réglage du niveau de puissance avec flèches gauche/droite.
</images_de_reference>

<concept_du_jeu>
- Pitch : pilote corsaire indépendant contre la « Directive Axiome », une IA minière qui ravage
  les Mondes Extérieurs. 8 planètes × 3 niveaux (le 3e avec le boss de la planète, le 2e avec un
  mini-boss) : Kessra (désert), Verdance (jungle), Thalassa (océan), Umbra Deep (caverne), Cinder
  (lave), Glacia (glace), The Rift (espace), Axiom Citadel (techno, final).
- Rythme : missions de 70 à 120 s, une vague toutes les 1,5-3,5 s, jamais d'écran vide,
  crescendo avant chaque boss, alerte « WARNING » + musique de boss.
- Équipement : 6 coques (blindage, vitesse, emplacements de sidekicks), ≥5 boucliers (capacité,
  régénération, coût énergétique), ≥5 générateurs (capacité, production), 8 armes avant à 10
  niveaux de puissance, 5 armes arrière à 2 modes, 6 sidekicks. Le générateur alimente les tirs
  ET la régénération du bouclier : choisir son build est un vrai arbitrage.
- Économie : crédits lâchés par les ennemis (gemmes aimantées), reprise à 100 % de l'objet
  remplacé, 50 % des crédits gardés en cas d'échec ; on peut rejouer les niveaux finis.
- Ennemis : ≥36 types (air, sol, mer, dangers) avec patterns de mouvement (sinus, piqué, swoop,
  zigzag, stationnaire, strafe, cercle, poursuite, sol fixe/mobile, dérive, attaque par le bas) et
  de tir (visé, rafale, éventail 3/5, anneau 8/16, spirale, laser télégraphié, flak, missiles).
- Contrôles mobile : glisser relatif n'importe où (le doigt ne masque jamais le vaisseau),
  tir automatique, bouton pause et bouton mode arrière sur le HUD, vibrations ; clavier et
  manette sur ordinateur ; bouton retour Android.
- Difficultés : facile / normal / difficile (PV ennemis, vitesse et cadence des balles, crédits).
</concept_du_jeu>

<boucle>
Répète ce cycle. Si tu tournes sous /loop, fais UNE itération complète par tour puis programme
la suivante (ScheduleWakeup, délai court ~60-120 s si tu as du travail prêt, plus long si tu
attends la CI). Sinon enchaîne les itérations tant que tu as du contexte ; avant d'en manquer,
mets à jour PROGRESS.md pour qu'une nouvelle session reprenne exactement là.

1. SYNCHRONISER : `git pull` sur ta branche ; lis la dernière entrée de PROGRESS.md et la ROADMAP.
   `cd game && npm ci` si node_modules manque.
2. MESURER (état réel, pas supposé) :
   - `npm run typecheck && npm test && npm run build && npm run smoke` ;
   - `npm run screens` puis REGARDE chaque capture avec Read, à côté des images de référence ;
   - statut des derniers runs GitHub Actions (outils MCP GitHub : `actions_list` /
     `actions_get` / `get_job_logs`) pour `Game CI` et `Android APK`.
   - Remplis la SCORECARD ci-dessous (note 0-5 + une phrase de justification par critère).
3. CHOISIR 1 à 3 chantiers au plus fort ratio impact/effort, dans cet ordre de priorité :
   (a) build/CI/APK cassés, crash, erreur console ; (b) boucle de jeu bloquée ; (c) critère de
   scorecard le plus bas ; (d) items non cochés de la ROADMAP (milestone le plus bas d'abord) ;
   (e) polish. Écris le plan de l'itération (3-6 lignes) avant de coder.
4. IMPLÉMENTER : changements ciblés et propres, code TypeScript strict, pas de TODO laissés, pas
   d'allocation dans les boucles chaudes, pools pour tout ce qui est fréquent.
   DÉPLOIE LE MAXIMUM D'AGENTS : je t'autorise explicitement à orchestrer des workflows
   multi-agents et des sous-agents en arrière-plan à chaque itération. Découpe le travail en
   périmètres de FICHIERS DISJOINTS (ex. un agent par planète pour les niveaux, un par boss, un
   par biome de terrain, un par scène de menu, un pour l'audio, un pour Android/CI, un relecteur
   adverse par domaine), donne à chacun les contrats à respecter, son port de serveur de dev et
   l'interdiction de toucher aux fichiers des autres et de lancer des commandes git qui modifient
   l'état. Le nombre d'agents simultanés d'un workflow est plafonné par les CPU de la machine
   (CPU - 2) : pour aller au-delà, lance plusieurs sous-agents en arrière-plan en parallèle.
   Toi, tu restes l'intégrateur : tu fusionnes, vérifies et commites.
5. VÉRIFIER : relance typecheck, tests, build, smoke, captures ; compare AVANT/APRÈS sur les
   captures ; joue au moins un niveau complet en Playwright (god=0 et god=1). Fais une relecture
   critique adverse de ton diff (bugs, perf mobile, lisibilité, originalité). Une itération qui
   casse quelque chose n'est pas terminée.
6. LIVRER : commit(s) clairs en anglais (`feat:`, `fix:`, `perf:`, `art:`, `content:`…), push sur
   ta branche de session (jamais sur main, jamais de force-push). Vérifie que `Game CI` et
   `Android APK` passent ; s'ils échouent, corrige en priorité à l'itération suivante (ou tout de
   suite si c'est rapide). Ne crée pas de pull request sauf si je le demande.
7. JOURNALISER : ajoute en tête de `game/docs/PROGRESS.md` une entrée : n° d'itération, date,
   scorecard (avant → après), ce qui a changé, preuves (commandes, captures regardées, run CI),
   problèmes connus, prochain chantier prévu. Coche dans ROADMAP.md uniquement ce qui est vérifié.
8. RAPPORTER : 5 à 10 lignes en français pour moi (ce qui a changé, ce que je peux tester, lien
   vers l'APK si un run est vert, prochaine étape). Puis itération suivante.
</boucle>

<scorecard>
Note chaque critère de 0 à 5 (5 = au niveau des références, voire mieux) :
 1. Lisibilité des balles ennemies sur les 8 biomes (cœur clair, contour sombre, jamais confondues
    avec le décor ou les tirs du joueur).
 2. Densité & rythme (ennemis/projectiles à l'écran aux pics, écran jamais vide, crescendo).
 3. Qualité des terrains (détail 16 bits, profondeur, variété, aucune couture entre chunks).
 4. Sprites (vaisseaux, ennemis, boss : silhouettes distinctes, ombrage, contour, détails).
 5. Effets (explosions multi-frames, débris, étincelles, flash d'impact, secousse, ondes de choc).
 6. HUD latéral (lisibilité, hiérarchie, jauges, réactivité aux événements).
 7. Menus hangar / boutique / carte (mise en page, typographie pixel, aperçu d'arme, ergonomie
    tactile et clavier, cohérence de la direction artistique).
 8. Game feel (contrôle tactile précis, réponse immédiate, impacts, hit-stop, vibrations).
 9. Arsenal (armes distinctes, montée en puissance visible et satisfaisante, sidekicks utiles).
10. Boss (taille, phases, parties destructibles, patterns lisibles, mort spectaculaire).
11. Progression & économie (1-2 achats marquants par niveau, courbe de difficulté juste).
12. Audio (SFX punchy sans saturation, musique par biome).
13. Performance mobile (60 fps, pas de saccade à la génération des chunks, mémoire stable).
14. Stabilité (0 erreur console, CI verte, APK construit).
15. Originalité (aucun élément copié d'un jeu existant).
</scorecard>

<definition_of_done>
Tu considères le projet terminé (et tu arrêtes la boucle : ScheduleWakeup stop) quand TOUT est vrai :
- Chaque critère de la scorecard ≥ 4/5 et moyenne ≥ 4,5, justifiés par des captures regardées.
- Milestones M0 à M8 de ROADMAP.md entièrement cochés.
- Les 24 niveaux sont jouables du début à la fin (run Playwright god=1 de chaque niveau sans
  erreur) et la campagne est terminable avec un équipement acheté normalement.
- `Game CI` et `Android APK` verts sur 2 runs consécutifs ; l'APK debug est téléchargeable.
- Rapport final : résumé, lien des artifacts APK, ce qu'il reste en option (M9-M10).
</definition_of_done>

<regles>
- Originalité absolue (voir plus haut). Aucun asset téléchargé d'Internet.
- Ne pousse jamais directement sur la branche main (travaille sur ta branche de session).
- Ne mets jamais de secret dans le code ou la CI ; la signature release passe par les secrets
  GitHub ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD.
- Petits commits fréquents ; jamais de force-push ; jamais de test désactivé pour « passer au vert ».
- Si un chantier bloque plus de 2 itérations, documente le blocage dans PROGRESS.md, passe au
  suivant et signale-le-moi.
- Ne réécris pas tout « parce que ce serait plus propre » : améliore l'existant, sauf si une
  réécriture ciblée est clairement justifiée dans PROGRESS.md.
- Performance d'abord sur mobile : pense téléphone Android milieu de gamme, pas PC de bureau.
</regles>

===== FIN DU PROMPT =====
```
