# Odyssea Lymphea - WordPress Theme

Un thème WordPress moderne et réactif pour le cabinet de kinésithérapie Odyssea Lymphea, construit avec React et Tailwind CSS.

## 📋 Description

Ce thème WordPress intègre une application React pour offrir une expérience utilisateur moderne et fluide tout en conservant les avantages de WordPress pour la gestion de contenu.

### Caractéristiques

- ⚛️ **React + WordPress** : Application React intégrée dans WordPress
- 🎨 **Design moderne** : Interface élégante avec Tailwind CSS
- 📱 **Responsive** : Optimisé pour tous les appareils
- ⚡ **Performance** : Build optimisé avec Vite
- ♿ **Accessible** : Composants accessibles avec Radix UI
- 🔍 **SEO-friendly** : Meta tags et Open Graph optimisés

## 📦 Installation

### Méthode 1 : Installation manuelle

1. **Téléchargez le thème**
   - Compressez le dossier `wordpress-theme` en fichier ZIP
   - Renommez-le en `odyssea-lymphea.zip`

2. **Installez dans WordPress**
   ```
   WordPress Admin → Apparence → Thèmes → Ajouter → Téléverser un thème
   ```
   - Sélectionnez le fichier `odyssea-lymphea.zip`
   - Cliquez sur "Installer maintenant"
   - Activez le thème

### Méthode 2 : Installation FTP

1. **Uploadez via FTP**
   ```
   Uploadez le dossier wordpress-theme vers :
   /wp-content/themes/odyssea-lymphea/
   ```

2. **Activez le thème**
   ```
   WordPress Admin → Apparence → Thèmes → Activer "Odyssea Lymphea"
   ```

## 🔧 Configuration requise

- **WordPress** : 5.0 ou supérieur
- **PHP** : 7.4 ou supérieur
- **Serveur** : Apache ou Nginx avec mod_rewrite activé

## 🛠️ Développement

### Prérequis

- Node.js 18+ 
- npm ou yarn

### Build du thème

Pour reconstruire le thème après modifications :

```bash
# Depuis le dossier racine du projet
bash build-wp-theme.sh
```

Ce script va :
1. Compiler l'application React avec Vite
2. Copier TOUS les assets (CSS, JS, images) dans `/wordpress-theme/assets/` avec leurs noms hashés
3. Générer un fichier `asset-manifest.php` pour que WordPress charge les bons fichiers
4. Préparer le thème pour l'installation

### Structure des fichiers

```
wordpress-theme/
├── style.css              # En-tête du thème WordPress (requis)
├── functions.php          # Fonctions et hooks WordPress
├── index.php             # Template principal
├── header.php            # En-tête HTML
├── footer.php            # Pied de page HTML
├── page.php              # Template de page
├── single.php            # Template d'article
├── 404.php               # Page d'erreur 404
├── asset-manifest.php    # Manifest des assets (auto-généré)
├── screenshot.png        # Aperçu du thème (à ajouter - 1200x900px)
├── assets/
│   ├── index-[hash].css  # Styles compilés (nom hashé par Vite)
│   ├── index-[hash].js   # Application React compilée (ES module)
│   └── images/           # Images du site
└── README.md             # Ce fichier
```

## 🎨 Personnalisation

### Modifier les informations de contact

#### Option 1 : Modifier le code source React

Les informations sont dans :
- `client/src/pages/home.tsx` (section d'informations en haut)
- `client/src/components/minimal-footer.tsx` (pied de page)

Après modification, rebuild avec :
```bash
bash build-wp-theme.sh
```

#### Option 2 : Via l'API REST (futur)

Le thème expose un endpoint REST API pour les paramètres :
```
GET /wp-json/odyssea-lymphea/v1/settings
```

Une interface admin WordPress sera ajoutée dans une future version.

### Modifier les couleurs et styles

Les styles sont gérés par Tailwind CSS dans le code React source :
- `client/src/index.css` - Variables CSS globales
- `tailwind.config.ts` - Configuration Tailwind

## 📄 Pages du site

Le thème crée automatiquement un site mono-page avec les sections :

1. **Navigation** - Menu avec liens vers toutes les pages
2. **Informations pratiques** - Adresse, horaires, contact
3. **Hero** - Section d'accueil principale
4. **Services** - Présentation des services
5. **À propos** - Information sur le cabinet
6. **Pied de page** - Informations de contact

### Routing React

Le site utilise `wouter` pour le routing côté client :
- `/` - Page d'accueil
- `/renata-franca` - Drainage lymphatique Renata Franca
- `/drainage-lymphatique` - Drainage conventionnel
- `/soins-cicatrices` - Soins de cicatrices
- `/epilation-laser` - Épilation laser

## 🔗 Intégrations

### Salonkee (Réservation)

Les boutons "Prendre rendez-vous" redirigent vers :
```
https://salonkee.be/salon/odyssea-lymphea
```

## 🐛 Dépannage

### Le thème ne s'affiche pas correctement

1. Vérifiez que les fichiers sont bien dans `/wp-content/themes/odyssea-lymphea/`
2. Vérifiez les permissions des fichiers (644 pour les fichiers, 755 pour les dossiers)
3. Vérifiez la console du navigateur (F12) pour les erreurs JavaScript
4. Vérifiez que le fichier `asset-manifest.php` existe et contient les bons chemins

### Les assets (CSS/JS) ne se chargent pas

1. Vérifiez que le dossier `assets/` contient bien les fichiers compilés
2. Videz le cache WordPress et du navigateur
3. Vérifiez les permissions de lecture sur les fichiers
4. Vérifiez dans `functions.php` que les assets sont correctement chargés avec `type="module"`

### Erreur 404 sur les pages

1. Allez dans `Réglages → Permaliens`
2. Sélectionnez "Nom de l'article" ou "Structure personnalisée"
3. Enregistrez (cela va régénérer le fichier .htaccess)

### Screenshot manquant

Le thème fonctionne sans screenshot.png, mais pour un meilleur affichage dans WordPress Admin :
1. Prenez une capture d'écran de votre page d'accueil
2. Redimensionnez-la à 1200×900 pixels
3. Enregistrez-la comme `screenshot.png` dans le dossier du thème

## 📝 Support

Pour toute question ou problème :
- **Email** : odyssea.lymphea@gmail.com
- **Téléphone** : +32 494 74 17 77

## 📜 Licence

Ce thème est distribué sous licence GPL v2 ou ultérieure.

## 🔄 Mises à jour

### Version 1.0.0 (Octobre 2025)
- Version initiale du thème
- Application React complète
- Design responsive
- Intégration Salonkee
- Support des ES modules
- Manifest automatique des assets

---

**Développé avec ❤️ pour Odyssea Lymphea**
