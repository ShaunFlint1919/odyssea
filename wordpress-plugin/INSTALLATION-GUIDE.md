# 📘 Guide d'Installation - Plugin WordPress Odyssea Lymphea

Guide complet, étape par étape, pour installer et configurer le plugin WordPress.

## 📦 Étape 1 : Préparer le plugin

### 1.1 Préparer les images

1. Créez le dossier `assets/images/` dans le plugin si non existant
2. Copiez vos images dans ce dossier
3. Renommez-les selon cette liste :

| Fichier requis | Description |
|----------------|-------------|
| `hero-1.jpg` | Image principale page d'accueil |
| `renata-logo.jpg` | Logo Renata Franca horizontal |
| `renata-products.jpg` | Produits Renata Franca |
| `drainage-results.jpg` | Résultats drainage (avant/après) |
| `drainage-conventional.jpg` | Drainage conventionnel Vodder |
| `scar-treatment.jpg` | Soins de cicatrices |
| `laser-epilation.jpg` | Équipement épilation laser |

4. Optimisez les images pour le web (TinyPNG ou similaire)

### 1.2 Créer l'archive du plugin

**Sur Mac/Linux :**
```bash
cd wordpress-plugin
zip -r odyssea-lymphea.zip . -x "*.DS_Store" -x "__MACOSX"
```

**Sur Windows :**
1. Ouvrez le dossier `wordpress-plugin`
2. Sélectionnez tous les fichiers et dossiers à l'intérieur
3. Clic droit > Envoyer vers > Dossier compressé
4. Renommez en `odyssea-lymphea.zip`

⚠️ **Important** : Le ZIP doit contenir directement les fichiers du plugin, PAS le dossier parent `wordpress-plugin`.

## 🚀 Étape 2 : Installation sur WordPress

### 2.1 Installer le plugin

1. Connectez-vous à votre administration WordPress
2. Allez dans **Extensions > Ajouter**
3. Cliquez sur **Téléverser une extension**
4. Cliquez sur **Choisir un fichier**
5. Sélectionnez `odyssea-lymphea.zip`
6. Cliquez sur **Installer maintenant**
7. Attendez la fin de l'installation
8. Cliquez sur **Activer l'extension**

✨ **C'est fait !** Le plugin crée automatiquement :
- 5 pages complètes
- Un menu de navigation
- La configuration initiale

### 2.2 Vérifier la création des pages

1. Allez dans **Pages > Toutes les pages**
2. Vous devriez voir :
   - Accueil (définie comme page d'accueil)
   - Renata Franca
   - Drainage Lymphatique
   - Soins de Cicatrices
   - Épilation Laser

### 2.3 Vérifier le menu

1. Allez dans **Apparence > Menus**
2. Vous devriez voir le menu "Odyssea Lymphea Menu"
3. Le menu contient les 5 pages dans l'ordre

## ⚙️ Étape 3 : Configuration

### 3.1 Personnaliser les informations du cabinet

1. Allez dans **Réglages > Odyssea Lymphea**
2. Remplissez le formulaire :

**Informations générales :**
- Nom du cabinet : `Odyssea Lymphea` (modifiable)
- Adresse : `Rue de la station, 70 - 1410 Waterloo`
- Téléphone : `+32 494 74 17 77`
- Email : `odyssea.lymphea@gmail.com`
- Horaires : Vos horaires d'ouverture

**Réseaux sociaux (optionnel) :**
- Facebook URL
- Instagram URL

3. Cliquez sur **Enregistrer les paramètres**

Ces informations apparaîtront automatiquement sur toutes les pages du site.

### 3.2 Configurer les permaliens

1. Allez dans **Réglages > Permaliens**
2. Sélectionnez **Titre de la publication**
3. Cliquez sur **Enregistrer les modifications**

Cela garantit de beaux URL comme `/renata-franca/` au lieu de `/?p=123`.

### 3.3 Assigner le menu (si nécessaire)

Si votre thème le requiert :

1. Allez dans **Apparence > Menus**
2. Sélectionnez "Odyssea Lymphea Menu"
3. En bas, sous "Emplacement du thème", cochez la case appropriée
4. Cliquez sur **Enregistrer le menu**

## ✅ Étape 4 : Vérifications finales

### 4.1 Tester les pages

Visitez chaque page pour vérifier qu'elle s'affiche correctement :

- ✅ Accueil - `/`
- ✅ Renata Franca - `/renata-franca/`
- ✅ Drainage Lymphatique - `/drainage-lymphatique/`
- ✅ Soins de Cicatrices - `/soins-cicatrices/`
- ✅ Épilation Laser - `/epilation-laser/`

### 4.2 Vérifier les informations de contact

Sur chaque page, vérifiez que :
- ✅ Le numéro de téléphone est cliquable
- ✅ L'adresse email est cliquable  
- ✅ Les informations correspondent à ce que vous avez saisi

### 4.3 Tester la navigation

- ✅ Le menu s'affiche correctement
- ✅ Tous les liens du menu fonctionnent
- ✅ Le menu mobile fonctionne (sur smartphone)

### 4.4 Tester les animations

- ✅ Les éléments apparaissent progressivement au scroll
- ✅ Les boutons ont des effets au survol
- ✅ Les transitions sont fluides

### 4.5 Responsive design

Testez sur différentes tailles d'écran :
- 📱 Mobile (< 640px)
- 📱 Tablette (640px - 1024px)
- 💻 Desktop (> 1024px)

Dans WordPress, utilisez l'aperçu responsive ou testez sur vos appareils.

## 🔧 Dépannage

### Les pages affichent "Erreur 404"

**Solution :**
1. Allez dans **Réglages > Permaliens**
2. Cliquez sur **Enregistrer les modifications** (sans rien changer)
3. Testez à nouveau

### Les images ne s'affichent pas

**Solution :**
1. Vérifiez que les images sont dans `wp-content/plugins/odyssea-lymphea/assets/images/`
2. Vérifiez que les noms de fichiers correspondent exactement
3. Vérifiez les permissions (644 pour les fichiers)

### Le menu ne s'affiche pas

**Solution :**
1. Allez dans **Apparence > Menus**
2. Assignez "Odyssea Lymphea Menu" à l'emplacement de votre thème
3. Si le problème persiste, ajoutez manuellement les pages dans votre menu thème

### Les styles ne s'appliquent pas correctement

**Solution :**
1. Videz le cache du navigateur (Ctrl+F5 / Cmd+Shift+R)
2. Si vous utilisez un plugin de cache, videz-le
3. Désactivez puis réactivez le plugin

### Les informations de contact ne se mettent pas à jour

**Solution :**
1. Vérifiez que vous avez bien cliqué sur "Enregistrer les paramètres"
2. Videz le cache
3. Actualisez la page

## 🎨 Personnalisation avancée

### Modifier les couleurs

Éditez `wp-content/plugins/odyssea-lymphea/assets/css/odyssea-style.css` :

```css
:root {
  --primary: hsl(38 45% 55%);      /* Couleur principale */
  --accent: hsl(40 50% 60%);       /* Couleur d'accentuation */
  --background: hsl(45 25% 96%);   /* Couleur de fond */
}
```

### Ajouter du contenu personnalisé

Vous pouvez modifier les pages créées dans **Pages > Toutes les pages**. Le shortcode est automatiquement inséré, mais vous pouvez ajouter du contenu avant ou après.

## 📊 Utilisation avancée

### Utiliser les shortcodes dans d'autres pages

Vous pouvez créer de nouvelles pages et y insérer les shortcodes :

```
[odyssea_home]
[odyssea_renata_franca]
[odyssea_drainage]
[odyssea_cicatrices]
[odyssea_epilation]
```

### Widgets et sidebars

Les shortcodes fonctionnent également dans les widgets si votre thème les supporte.

## 🗑️ Désinstallation

Si vous souhaitez désinstaller le plugin :

1. Allez dans **Extensions > Extensions installées**
2. Désactivez "Odyssea Lymphea"
3. Cliquez sur **Supprimer**

**Attention** : La désinstallation supprime :
- ✗ Toutes les pages créées par le plugin
- ✗ Le menu de navigation
- ✗ Tous les réglages

Vos autres contenus WordPress ne sont pas affectés.

## 📞 Besoin d'aide ?

Pour toute question :
- Email : odyssea.lymphea@gmail.com
- Téléphone : +32 494 74 17 77

## 🎉 Félicitations !

Votre site WordPress Odyssea Lymphea est maintenant opérationnel ! 🎊

---

**Dernière mise à jour** : Octobre 2025  
**Version du plugin** : 1.0.0
