# Guide d'Installation - Plugin Odyssea Lymphea

## 🎯 Ce plugin remplace COMPLÈTEMENT votre site WordPress

Le plugin Odyssea Lymphea prend le contrôle total de votre site WordPress et affiche un site professionnel pour votre cabinet de kinésithérapie.

## 📦 Étape 1 : Préparer le Plugin

### Option A : Créer le ZIP manuellement
1. Ouvrez le dossier `wordpress-plugin`
2. Sélectionnez TOUS les fichiers et dossiers à l'intérieur (pas le dossier parent)
3. Faites un clic droit → "Compresser" ou "Créer une archive"
4. Nommez le fichier : `odyssea-lymphea.zip`

### Option B : Renommer puis compresser
1. Renommez le dossier `wordpress-plugin` → `odyssea-lymphea`
2. Compressez ce dossier en ZIP
3. Vous obtenez : `odyssea-lymphea.zip`

## ✅ Structure du ZIP (Important!)

Le fichier ZIP doit contenir directement ces fichiers :
```
odyssea-lymphea.zip
├── odyssea-lymphea.php      ← Le fichier principal
├── includes/
├── templates/
├── assets/
│   ├── css/
│   ├── js/
│   └── images/              ← Les images DOIVENT être là
└── uninstall.php
```

## 🚀 Étape 2 : Installation sur WordPress

1. **Connectez-vous** à votre admin WordPress (votresite.com/wp-admin)

2. **Désactivez** temporairement votre thème actuel (optionnel mais recommandé)

3. **Installez le plugin** :
   - Allez dans **Extensions → Ajouter**
   - Cliquez sur **Téléverser une extension**
   - Choisissez `odyssea-lymphea.zip`
   - Cliquez sur **Installer maintenant**
   - Cliquez sur **Activer**

4. **C'est terminé !** 🎉
   - Le plugin crée automatiquement 5 pages complètes
   - La page d'accueil est configurée automatiquement
   - Le menu de navigation est créé

## ⚙️ Étape 3 : Personnalisation (Optionnel)

Allez dans **Réglages → Odyssea Lymphea** pour modifier :
- Nom du cabinet
- Adresse complète
- Téléphone
- Email
- Horaires d'ouverture
- Liens réseaux sociaux (Facebook, Instagram)

## 🔍 Vérification

Pour vérifier que tout fonctionne :

1. **Visitez votre site** (page d'accueil)
2. **Vérifiez** :
   - ✅ Les images s'affichent correctement
   - ✅ Le menu de navigation fonctionne
   - ✅ Le design est cohérent sur toutes les pages
   - ✅ Les informations de contact sont correctes

## ⚠️ Problèmes Courants

### Les images ne s'affichent pas
- **Solution** : Vérifiez que le dossier `assets/images/` est bien dans le ZIP
- Les images doivent être dans : `assets/images/hero-1.jpg`, etc.

### Le site "revient à la normale"
- **Solution** : Le nouveau plugin prend maintenant le contrôle COMPLET
- Désactivez et réactivez le plugin si nécessaire
- Videz le cache de WordPress (si vous utilisez un plugin de cache)

### "Extension non compatible"
- **Solution** : Vérifiez la structure du ZIP
- Le fichier `odyssea-lymphea.php` doit être à la racine du ZIP

## 🔄 Réinstallation / Mise à jour

Si vous avez déjà installé une ancienne version :

1. Allez dans **Extensions → Extensions installées**
2. **Désactivez** Odyssea Lymphea
3. **Supprimez** l'ancienne version
4. **Installez** la nouvelle version (suivez les étapes ci-dessus)
5. **Activez** le plugin

Les pages et paramètres seront préservés !

## 📱 Pages Créées Automatiquement

Le plugin crée ces pages :

1. **Accueil** - Page d'accueil avec présentation
2. **Renata Franca** - Services Renata Franca
3. **Drainage Lymphatique** - Drainage conventionnel Vodder
4. **Soins de Cicatrices** - Accompagnement pré/post-opératoire
5. **Épilation Laser** - Épilation laser dernière génération

## 💡 Conseils

- Le plugin fonctionne avec **n'importe quel thème WordPress**
- Il prend le **contrôle complet** des pages qu'il crée
- Les styles sont **isolés** et n'affectent pas le reste de votre site
- Vous pouvez **désactiver le plugin** à tout moment pour revenir à votre site original

## 🆘 Support

Si vous rencontrez des problèmes :
1. Vérifiez que vous utilisez WordPress 6.0 ou supérieur
2. Vérifiez que PHP 7.4 ou supérieur est installé
3. Désactivez les autres plugins pour tester les conflits
4. Videz tous les caches (navigateur + WordPress)
