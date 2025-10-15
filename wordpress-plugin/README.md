# Odyssea Lymphea - WordPress Plugin

Plugin WordPress complet pour le cabinet de kinésithérapie Odyssea Lymphea, spécialisé en drainage lymphatique, soins de cicatrices et épilation laser à Waterloo, Belgique.

## 📋 Description

Ce plugin WordPress crée automatiquement un site web complet pour votre cabinet de kinésithérapie avec toutes les pages et fonctionnalités nécessaires. Il s'installe en quelques clics et fonctionne avec n'importe quel thème WordPress.

## 🎨 Fonctionnalités

- **Installation automatique** : Crée automatiquement 5 pages complètes à l'activation
- **Menu de navigation** : Configure automatiquement le menu principal
- **Shortcodes flexibles** : Fonctionnent avec tous les thèmes WordPress
- **Design responsive** : Adapté à tous les appareils (desktop, tablette, mobile)
- **Animations fluides** : Effets de transition au scroll avec Intersection Observer
- **Page d'administration** : Gérez facilement vos informations de contact
- **Styles CSS scopés** : N'interfère pas avec votre thème actuel
- **Performance optimisée** : Code léger et rapide

## 📦 Ce qui est créé automatiquement

À l'activation du plugin, les pages suivantes sont créées :

1. **Accueil** - Page d'accueil avec présentation du cabinet
2. **Renata Franca** - Services Renata Franca (drainage, massages, soins visage)
3. **Drainage Lymphatique** - Drainage lymphatique conventionnel (méthode Vodder)
4. **Soins de Cicatrices** - Accompagnement pré et post-opératoire
5. **Épilation Laser** - Épilation laser dernière génération

Un menu de navigation est également créé et assigné automatiquement.

## 🚀 Installation

### Étape 1 : Télécharger le plugin

1. Téléchargez le dossier `wordpress-plugin`
2. Compressez-le en ZIP : `odyssea-lymphea.zip`

### Étape 2 : Installer sur WordPress

1. Connectez-vous à votre admin WordPress
2. Allez dans **Extensions > Ajouter**
3. Cliquez sur **Téléverser une extension**
4. Sélectionnez le fichier ZIP
5. Cliquez sur **Installer maintenant**
6. **Activez** le plugin

C'est tout ! Votre site est créé automatiquement. ✨

## ⚙️ Configuration

### Page des réglages

Allez dans **Réglages > Odyssea Lymphea** pour personnaliser :

- Nom du cabinet
- Adresse  
- Téléphone
- Email
- Horaires
- Réseaux sociaux (Facebook, Instagram)

Ces informations apparaîtront automatiquement sur toutes les pages.

## 📱 Shortcodes disponibles

Le plugin fournit les shortcodes suivants (déjà utilisés dans les pages créées automatiquement) :

- `[odyssea_home]` - Page d'accueil
- `[odyssea_renata_franca]` - Page Renata Franca
- `[odyssea_drainage]` - Page Drainage Lymphatique
- `[odyssea_cicatrices]` - Page Soins de Cicatrices
- `[odyssea_epilation]` - Page Épilation Laser

Vous pouvez utiliser ces shortcodes dans n'importe quelle page ou article.

## 🖼️ Images

Le plugin inclut des emplacements pour vos images :

```
wordpress-plugin/assets/images/
├── hero-1.jpg                    # Image d'accueil
├── renata-logo.jpg               # Logo Renata Franca
├── renata-products.jpg           # Produits Renata Franca
├── drainage-results.jpg          # Résultats drainage
├── drainage-conventional.jpg     # Drainage conventionnel
├── scar-treatment.jpg            # Soins de cicatrices
└── laser-epilation.jpg           # Épilation laser
```

Ajoutez vos images dans le dossier `assets/images/` du plugin.

## 🎨 Personnalisation du design

Le plugin utilise des classes CSS scopées (préfixées par `odyssea-`) pour éviter les conflits avec votre thème. Les styles sont définis dans :

- `assets/css/odyssea-style.css` - Styles principaux
- `assets/css/admin-style.css` - Styles admin

Vous pouvez personnaliser les couleurs en modifiant les variables CSS dans `odyssea-style.css` :

```css
:root {
  --primary: hsl(38 45% 55%);
  --accent: hsl(40 50% 60%);
  /* ... */
}
```

## 🔧 Structure du plugin

```
wordpress-plugin/
├── odyssea-lymphea.php           # Fichier principal du plugin
├── uninstall.php                 # Nettoyage à la désinstallation
├── includes/                     # Classes PHP
│   ├── class-activator.php       # Activation (création pages/menu)
│   ├── class-deactivator.php     # Désactivation
│   ├── class-assets.php          # Gestion CSS/JS
│   ├── class-blocks.php          # Support Gutenberg
│   ├── class-shortcodes.php      # Shortcodes
│   └── class-settings.php        # Page de réglages
├── templates/                    # Templates PHP
│   ├── page-home.php             # Template page d'accueil
│   ├── page-renata-franca.php    # Template Renata Franca
│   ├── page-drainage.php         # Template drainage
│   ├── page-cicatrices.php       # Template cicatrices
│   └── page-epilation.php        # Template épilation
├── assets/                       # Ressources
│   ├── css/                      # Feuilles de style
│   ├── js/                       # JavaScript
│   └── images/                   # Images du site
└── README.md                     # Ce fichier
```

## ❓ FAQ

### Les pages ne s'affichent pas correctement

1. Vérifiez que le plugin est bien activé
2. Allez dans **Réglages > Permaliens** et cliquez sur "Enregistrer"
3. Videz le cache de votre site si vous utilisez un plugin de cache

### Comment modifier les informations de contact ?

Allez dans **Réglages > Odyssea Lymphea** pour modifier toutes les informations de contact.

### Le plugin fonctionne-t-il avec mon thème ?

Oui ! Le plugin est conçu pour fonctionner avec n'importe quel thème WordPress. Il utilise des styles CSS scopés pour éviter les conflits.

### Comment désinstaller le plugin ?

Lors de la désinstallation, le plugin supprime automatiquement :
- Toutes les pages créées
- Le menu de navigation
- Tous les réglages

Vos autres contenus WordPress ne sont pas affectés.

## 🔐 Compatibilité

- ✅ WordPress 6.0+
- ✅ PHP 7.4+
- ✅ Tous les thèmes WordPress modernes
- ✅ Compatible avec Gutenberg et l'éditeur classique
- ✅ Compatible mobile et tablette
- ✅ Tous les navigateurs modernes

## 📞 Support

**Odyssea Lymphea**
- Adresse : Rue de la station, 70 - 1410 Waterloo
- Téléphone : +32 494 74 17 77
- Email : odyssea.lymphea@gmail.com

## 📄 Licence

Ce plugin est propriété exclusive d'Odyssea Lymphea et ne doit pas être redistribué.

---

**Version** : 1.0.0  
**Auteur** : Odyssea Lymphea  
**Dernière mise à jour** : Octobre 2025
