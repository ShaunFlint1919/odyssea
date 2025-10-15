# 📘 Guide d'Installation - Thème WordPress Odyssea Lymphea

Guide complet pour installer et configurer le thème WordPress sur votre site.

## 📦 Étape 1 : Préparation du thème

### 1.1 Préparer les images

1. Créez le dossier `assets/` dans le thème si ce n'est pas déjà fait
2. Copiez toutes les images depuis le projet React (dossier `attached_assets/`)
3. Renommez-les selon le fichier `assets/README.md`
4. Optimisez les images pour le web (utilisez TinyPNG ou similaire)

### 1.2 Créer l'archive du thème

```bash
# Depuis la racine du projet
cd wordpress-theme
zip -r odyssea-lymphea-theme.zip .
```

Ou sur Windows, sélectionnez tous les fichiers du dossier `wordpress-theme` et créez une archive ZIP.

## 🚀 Étape 2 : Installation sur WordPress

### 2.1 Installer le thème

1. Connectez-vous à votre administration WordPress
2. Allez dans **Apparence > Thèmes**
3. Cliquez sur **Ajouter**
4. Cliquez sur **Téléverser un thème**
5. Sélectionnez le fichier `odyssea-lymphea-theme.zip`
6. Cliquez sur **Installer maintenant**
7. Une fois installé, cliquez sur **Activer**

### 2.2 Configurer le logo

1. Allez dans **Apparence > Personnaliser**
2. Cliquez sur **Identité du site**
3. Cliquez sur **Sélectionner un logo**
4. Téléversez votre logo (recommandé : PNG 64x64px avec transparence)
5. Ajustez si nécessaire
6. Cliquez sur **Publier**

## 📄 Étape 3 : Créer les pages

### 3.1 Créer la page d'accueil

1. Allez dans **Pages > Ajouter**
2. Titre : `Accueil`
3. Ne mettez aucun contenu (le template s'en charge)
4. Cliquez sur **Publier**

### 3.2 Créer les pages de services

Répétez pour chaque service :

**Renata Franca**
- Titre : `Renata Franca`
- Slug : `renata-franca` (dans Permalien)
- Template : Sélectionnez "Renata Franca" dans Attributs de page > Modèle
- Publier

**Drainage Lymphatique**
- Titre : `Drainage Lymphatique`
- Slug : `drainage-lymphatique`
- Template : "Drainage Lymphatique"
- Publier

**Soins de Cicatrices**
- Titre : `Soins de Cicatrices`
- Slug : `soins-cicatrices`
- Template : "Soins Cicatrices"
- Publier

**Épilation Laser**
- Titre : `Épilation Laser`
- Slug : `epilation-laser`
- Template : "Épilation Laser"
- Publier

### 3.3 Définir la page d'accueil

1. Allez dans **Réglages > Lecture**
2. Sélectionnez **Une page statique**
3. Page d'accueil : Sélectionnez "Accueil"
4. Page des articles : Laissez vide ou créez une page Blog si nécessaire
5. Enregistrez

## 🎨 Étape 4 : Configurer la navigation

### 4.1 Créer le menu principal

1. Allez dans **Apparence > Menus**
2. Cliquez sur **Créer un nouveau menu**
3. Nom du menu : `Menu Principal`
4. Cliquez sur **Créer le menu**

### 4.2 Ajouter les pages au menu

1. Dans la colonne de gauche, cochez toutes vos pages :
   - Accueil
   - Renata Franca
   - Drainage Lymphatique
   - Soins de Cicatrices
   - Épilation Laser
2. Cliquez sur **Ajouter au menu**

### 4.3 Organiser le menu

Glissez-déposez les éléments dans cet ordre :
1. Accueil
2. Renata Franca
3. Drainage Lymphatique Conventionnel (éditez le libellé si nécessaire)
4. Soins de Cicatrices
5. Épilation Laser

### 4.4 Assigner le menu

1. Dans **Réglages du menu**, cochez **Menu Principal**
2. Cliquez sur **Enregistrer le menu**

## ✅ Étape 5 : Vérifications finales

### 5.1 Vérifier les permaliens

1. Allez dans **Réglages > Permaliens**
2. Sélectionnez **Titre de la publication**
3. Enregistrez

### 5.2 Tester le site

Vérifiez que :
- ✅ La page d'accueil s'affiche correctement
- ✅ Le logo apparaît dans la navigation
- ✅ Le menu fonctionne (desktop et mobile)
- ✅ Toutes les pages de services s'affichent
- ✅ Les images sont visibles
- ✅ Les animations fonctionnent au scroll
- ✅ Les boutons d'appel et email fonctionnent

### 5.3 Responsive design

Testez sur :
- 📱 Mobile (< 640px)
- 📱 Tablette (640px - 1024px)
- 💻 Desktop (> 1024px)

## 🔧 Dépannage

### Les images ne s'affichent pas

1. Vérifiez que les images sont dans `wp-content/themes/odyssea-lymphea-theme/assets/`
2. Vérifiez que les noms correspondent exactement
3. Vérifiez les permissions des fichiers (644 pour les fichiers, 755 pour les dossiers)

### Le menu mobile ne fonctionne pas

1. Videz le cache de votre navigateur
2. Vérifiez que JavaScript est activé
3. Regardez la console du navigateur pour des erreurs

### Les pages affichent un design par défaut

1. Assurez-vous d'avoir sélectionné le bon template dans les Attributs de page
2. Vérifiez que le thème est bien activé
3. Essayez de désactiver puis réactiver le thème

## 📞 Support

Pour toute question :
- Email : odyssea.lymphea@gmail.com
- Téléphone : +32 494 74 17 77

## 🎉 Félicitations !

Votre site WordPress Odyssea Lymphea est maintenant opérationnel ! 🎊

---

**Dernière mise à jour** : Octobre 2025  
**Version du thème** : 1.0.0
