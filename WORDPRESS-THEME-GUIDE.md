# Guide de Construction du Thème WordPress

## 🎯 Objectif

Ce guide explique comment transformer votre application React Odyssea Lymphea en thème WordPress.

## 📁 Structure créée

Le thème WordPress complet se trouve dans le dossier `wordpress-theme/` avec la structure suivante :

```
wordpress-theme/
├── style.css              # En-tête du thème WordPress (REQUIS)
├── functions.php          # Fonctions PHP et hooks WordPress
├── index.php             # Template principal (REQUIS)
├── header.php            # En-tête HTML
├── footer.php            # Pied de page HTML
├── page.php              # Template de page WordPress
├── single.php            # Template d'article WordPress
├── 404.php               # Page d'erreur 404
├── .htaccess             # Configuration Apache
├── assets/               # Assets compilés
│   ├── css/
│   │   └── main.css     # Styles Tailwind compilés
│   ├── js/
│   │   └── main.js      # Application React compilée
│   └── images/          # Images du site
├── README.md             # Documentation complète
└── INSTALLATION.md       # Guide d'installation rapide
```

## 🔨 Comment construire le thème

### Méthode simple (recommandée)

```bash
bash build-wp-theme.sh
```

Ce script fait automatiquement :
1. ✅ Compile l'application React avec Vite
2. ✅ Copie les CSS compilés vers `wordpress-theme/assets/css/`
3. ✅ Copie le JavaScript compilé vers `wordpress-theme/assets/js/`
4. ✅ Copie toutes les images vers `wordpress-theme/assets/images/`

### Méthode manuelle

Si vous préférez faire les étapes une par une :

```bash
# 1. Construire l'app React
vite build

# 2. Créer les dossiers assets
mkdir -p wordpress-theme/assets/{css,js,images}

# 3. Copier les assets
cp dist/public/assets/*.css wordpress-theme/assets/css/main.css
cp dist/public/assets/*.js wordpress-theme/assets/js/main.js
cp -r attached_assets/* wordpress-theme/assets/images/
```

## 📦 Installation dans WordPress

### Option 1 : Via l'admin WordPress (Recommandé)

1. **Compresser le thème**
   ```bash
   zip -r odyssea-lymphea.zip wordpress-theme/
   ```

2. **Installer dans WordPress**
   - Connectez-vous à WordPress Admin
   - Apparence → Thèmes → Ajouter → Téléverser un thème
   - Sélectionnez `odyssea-lymphea.zip`
   - Cliquez sur "Installer maintenant"
   - Activez le thème

### Option 2 : Via FTP

1. **Uploader le dossier**
   ```
   Uploadez wordpress-theme/ vers :
   /wp-content/themes/odyssea-lymphea/
   ```

2. **Activer**
   - WordPress Admin → Apparence → Thèmes
   - Cliquez sur "Activer" sous Odyssea Lymphea

## 🔧 Fonctionnement technique

### Comment React s'intègre à WordPress

1. **Template WordPress (index.php)**
   ```php
   <!DOCTYPE html>
   <html>
   <head>
       <?php wp_head(); ?>
   </head>
   <body>
       <div id="root"></div>
       <?php wp_footer(); ?>
   </body>
   </html>
   ```

2. **Chargement des assets (functions.php)**
   ```php
   wp_enqueue_style('odyssea-main', '/assets/css/main.css');
   wp_enqueue_script('odyssea-app', '/assets/js/main.js');
   ```

3. **React prend le contrôle**
   - Le JavaScript chargé monte l'app React dans `<div id="root">`
   - React gère toute l'interface et le routing
   - WordPress reste en arrière-plan pour la structure

### Avantages de cette approche

- ✅ **Moderne** : Interface React fluide et réactive
- ✅ **Performance** : Build optimisé avec Vite
- ✅ **Compatible** : Fonctionne avec l'écosystème WordPress
- ✅ **Flexible** : Facile à mettre à jour ou modifier
- ✅ **SEO** : WordPress gère les meta tags de base

## 🎨 Personnalisation

### Modifier le contenu

Le contenu est géré dans les fichiers React source :

- **Page d'accueil** : `client/src/pages/home.tsx`
- **Services** : `client/src/pages/drainage-lymphatique.tsx`, etc.
- **Pied de page** : `client/src/components/minimal-footer.tsx`
- **Navigation** : `client/src/components/navigation.tsx`

Après modification :
```bash
bash build-wp-theme.sh  # Rebuilder le thème
```

### Modifier les styles

Les styles sont dans :
- `client/src/index.css` - Variables CSS globales
- `tailwind.config.ts` - Configuration Tailwind

### Ajouter des images

1. Placez vos images dans `attached_assets/`
2. Rebuilder avec `bash build-wp-theme.sh`
3. Les images seront copiées automatiquement

## 📝 Fichiers importants

### style.css
Header WordPress obligatoire avec les métadonnées du thème.

### functions.php
- Enqueue des scripts et styles
- Configuration WordPress
- API REST pour les paramètres (futur)

### index.php
Template principal qui charge l'app React.

## 🚀 Déploiement

1. **Construire le thème**
   ```bash
   bash build-wp-theme.sh
   ```

2. **Tester localement** (optionnel)
   - Installez WordPress en local (MAMP, XAMPP, Local by Flywheel)
   - Installez le thème
   - Testez toutes les fonctionnalités

3. **Déployer en production**
   - Compressez le dossier `wordpress-theme/`
   - Uploadez vers votre WordPress de production
   - Activez le thème

## ⚠️ Important

- **Toujours rebuild** après modification du code React
- **Testez** le thème avant de l'activer en production
- **Sauvegardez** votre WordPress avant d'installer un nouveau thème
- **Vérifiez les permissions** des fichiers après upload FTP

## 📖 Documentation complète

Pour plus de détails, consultez :
- `wordpress-theme/README.md` - Documentation technique complète
- `wordpress-theme/INSTALLATION.md` - Guide d'installation rapide

## 🆘 Support

**Email** : odyssea.lymphea@gmail.com  
**Téléphone** : +32 494 74 17 77

---

**Note** : Ce thème utilise React pour l'interface utilisateur. Il est différent d'un thème WordPress traditionnel mais reste 100% compatible avec l'écosystème WordPress.
