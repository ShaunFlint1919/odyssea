# Odyssea Lymphea - Thème WordPress

Thème WordPress sur mesure pour le cabinet de kinésithérapie Odyssea Lymphea, spécialisé en drainage lymphatique, soins de cicatrices et épilation laser à Waterloo.

## 📋 Description

Ce thème WordPress moderne et responsive a été développé spécifiquement pour Odyssea Lymphea. Il offre une expérience utilisateur optimale avec des animations fluides, une navigation intuitive et un design épuré aux couleurs chaleureuses beiges et dorées.

## 🎨 Fonctionnalités

- **Design responsive** : Adapté à tous les appareils (desktop, tablette, mobile)
- **Navigation personnalisée** : Menu principal avec version mobile
- **Animations au scroll** : Effets de transition fluides avec Intersection Observer
- **Pages de services** : Templates dédiés pour chaque service
- **SEO optimisé** : Balises meta et structure sémantique
- **Performance** : Code optimisé et images responsives

## 📁 Structure du thème

```
wordpress-theme/
├── style.css                          # Feuille de style principale avec métadonnées du thème
├── functions.php                      # Fonctions et configuration du thème
├── header.php                         # En-tête du site avec navigation
├── footer.php                         # Pied de page avec informations de contact
├── index.php                          # Template principal par défaut
├── front-page.php                     # Template de la page d'accueil
├── page-renata-franca.php            # Template pour la page Renata Franca
├── page-drainage-lymphatique.php     # Template pour le drainage lymphatique
├── page-soins-cicatrices.php         # Template pour les soins de cicatrices
├── page-epilation-laser.php          # Template pour l'épilation laser
├── js/
│   ├── navigation.js                  # Script de navigation mobile
│   └── animations.js                  # Animations au scroll
├── assets/                            # Images du site (à créer)
│   ├── logo.png
│   ├── hero-image-1.jpg
│   ├── hero-image-2.jpg
│   └── ...
└── README.md                          # Ce fichier
```

## 🚀 Installation

### Prérequis

- WordPress 6.0 ou supérieur
- PHP 7.4 ou supérieur
- Serveur web (Apache, Nginx, etc.)

### Étapes d'installation

1. **Télécharger le thème**
   ```bash
   # Compresser le dossier wordpress-theme en ZIP
   zip -r odyssea-lymphea-theme.zip wordpress-theme/
   ```

2. **Installer sur WordPress**
   - Connectez-vous à votre administration WordPress
   - Allez dans **Apparence > Thèmes**
   - Cliquez sur **Ajouter** puis **Téléverser un thème**
   - Sélectionnez le fichier ZIP et cliquez sur **Installer maintenant**
   - Activez le thème une fois l'installation terminée

3. **Configuration du logo**
   - Allez dans **Apparence > Personnaliser > Identité du site**
   - Téléversez votre logo (recommandé : 64x64px, format PNG avec transparence)

4. **Créer les pages**
   Créez les pages suivantes avec les slugs exacts :
   
   - **Page d'accueil** : Définie comme page d'accueil dans Réglages > Lecture
   - **Renata Franca** : slug = `renata-franca`
   - **Drainage Lymphatique** : slug = `drainage-lymphatique`
   - **Soins de Cicatrices** : slug = `soins-cicatrices`
   - **Épilation Laser** : slug = `epilation-laser`

5. **Attribuer les templates**
   Pour chaque page (sauf l'accueil) :
   - Éditez la page
   - Dans le panneau de droite, section **Attributs de page**
   - Sélectionnez le template correspondant dans **Modèle**

6. **Configurer le menu**
   - Allez dans **Apparence > Menus**
   - Créez un nouveau menu nommé "Menu Principal"
   - Ajoutez les pages dans l'ordre souhaité :
     1. Accueil
     2. Renata Franca
     3. Drainage Lymphatique
     4. Soins de Cicatrices
     5. Épilation Laser
   - Assignez le menu à l'emplacement **Menu Principal**

7. **Ajouter les images**
   - Créez un dossier `assets/` dans le thème
   - Ajoutez toutes les images nécessaires avec les noms correspondants :
     - `logo.png` : Logo du cabinet
     - `hero-image-1.jpg` : Image hero principale
     - `hero-image-2.jpg` : Image expertise
     - `results-image.jpg` : Image résultats
     - `cabinet-image.jpg` : Photo du cabinet
     - `art-soin-image.jpg` : Image art du soin
     - Et toutes les images des pages de services

## 🎨 Personnalisation

### Couleurs

Les couleurs du thème sont définies dans `style.css` avec des variables CSS :

```css
:root {
  --background: hsl(45 25% 96%);
  --foreground: hsl(30 15% 25%);
  --primary: hsl(38 45% 55%);
  --accent: hsl(40 50% 60%);
  /* ... */
}
```

### Polices

Le thème utilise Google Fonts :
- **Titres** : Optima, Avenir Next, Cormorant
- **Corps de texte** : EB Garamond, Garamond, Georgia

### Menu de navigation

Le menu est géré via l'interface WordPress (Apparence > Menus).
La navigation mobile s'active automatiquement en dessous de 768px.

## 📱 Responsive Design

Le thème est entièrement responsive avec des breakpoints :
- **Mobile** : < 640px
- **Tablette** : 640px - 1024px  
- **Desktop** : > 1024px

## 🔧 Support et Maintenance

### Mise à jour

Pour mettre à jour le thème :
1. Sauvegardez l'ancien thème
2. Téléversez la nouvelle version
3. Vérifiez que toutes les pages fonctionnent correctement

### Compatibilité

- ✅ WordPress 6.0+
- ✅ PHP 7.4+
- ✅ Tous les navigateurs modernes (Chrome, Firefox, Safari, Edge)
- ✅ Compatible mobile et tablette

## 📞 Contact

Pour toute question concernant le thème :

**Odyssea Lymphea**
- Adresse : Rue de la station, 70 - 1410 Waterloo
- Téléphone : +32 494 74 17 77
- Email : odyssea.lymphea@gmail.com

## 📄 Licence

Ce thème est propriété exclusive d'Odyssea Lymphea et ne doit pas être redistribué.

---

**Version** : 1.0.0  
**Auteur** : Odyssea Lymphea  
**Dernière mise à jour** : Octobre 2025
