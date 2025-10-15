<?php
/**
 * Homepage Template - EXACT copy of React app
 * Used by [odyssea_home] shortcode
 *
 * @package Odyssea_Lymphea
 * @since 1.0.0
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="odyssea-page">
    <!-- Info Section - Right below navigation -->
    <section class="odyssea-section" style="padding-top: 3rem; padding-bottom: 2rem; border-bottom: 1px solid var(--odyssea-border); background: var(--odyssea-background);">
        <div class="odyssea-container">
            <div class="odyssea-grid odyssea-grid-3" style="text-align: center;">
                <div>
                    <h3 style="font-weight: 500; margin-bottom: 0.75rem;">Emplacement</h3>
                    <p style="color: var(--odyssea-muted-foreground); font-size: 0.875rem;">
                        Rue de la station, 70<br>
                        1410 Waterloo
                    </p>
                </div>
                <div>
                    <h3 style="font-weight: 500; margin-bottom: 0.75rem;">Heures d'ouverture</h3>
                    <p style="color: var(--odyssea-muted-foreground); font-size: 0.875rem;">
                        Lundi - Jeudi : 9h - 19h<br>
                        Vendredi : 9h - 18h<br>
                        Samedi : 9h30 - 13h<br>
                        Dimanche : Fermé
                    </p>
                </div>
                <div>
                    <h3 style="font-weight: 500; margin-bottom: 0.75rem;">Contact</h3>
                    <p style="color: var(--odyssea-muted-foreground); font-size: 0.875rem;">
                        +32 494 74 17 77<br>
                        odyssea.lymphea@gmail.com
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- Hero Section -->
    <section class="odyssea-section" style="position: relative; min-height: 80vh; background: linear-gradient(to bottom right, hsl(45 25% 85%), hsl(45 45% 85%), hsl(35 50% 85%), hsl(45 45% 85%), hsl(45 25% 85%)); display: flex; align-items: center;">
        <div style="position: absolute; inset: 0; background: rgba(0, 0, 0, 0.2);"></div>
        <div class="odyssea-container-lg" style="position: relative; z-index: 10;">
            <div class="odyssea-grid odyssea-grid-2" style="align-items: center; gap: 3rem;">
                <div class="odyssea-fade-in">
                    <h1 style="font-size: clamp(2rem, 5vw, 3.75rem); margin-bottom: 1.5rem; font-weight: 300;">
                        L'art du soin en douceur
                    </h1>
                    <p style="font-size: clamp(1.25rem, 2vw, 1.5rem); margin-bottom: 1.5rem; color: hsl(30 12% 35%);">
                        Entre science et présence
                    </p>
                    <div style="font-size: 1.125rem; color: hsl(30 12% 35%); line-height: 1.8; margin-bottom: 1rem;">
                        <p style="margin-bottom: 1.5rem;">
                            Chez Odyssea Lymphea, le soin commence par l'écoute. Nous vous accompagnons 
                            avec expertise et bienveillance dans votre parcours de bien-être.
                        </p>
                        <p>
                            Spécialisées en drainage lymphatique, soins de cicatrices et épilation laser, 
                            nous combinons techniques avancées et approche humaine.
                        </p>
                    </div>
                </div>
                <div class="odyssea-fade-in">
                    <div style="position: relative;">
                        <img src="<?php echo esc_url(ODYSSEA_PLUGIN_URL . 'assets/images/IMG_0718_1758988530094.jpg'); ?>" 
                             alt="Soins du visage professionnels - Odyssea Lymphea"
                             style="width: 100%; height: 600px; object-fit: cover; border-radius: var(--odyssea-radius); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
                        <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0, 0, 0, 0.2), transparent); border-radius: var(--odyssea-radius);"></div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Section 1 - Notre expertise -->
    <section class="odyssea-section" style="padding: 6rem 0; background: linear-gradient(to bottom right, hsl(45 25% 98%), hsl(45 45% 95%), hsl(35 50% 95%), hsl(45 25% 98%));">
        <div class="odyssea-container-lg">
            <div class="odyssea-grid odyssea-grid-2" style="gap: 4rem; align-items: center;">
                <div class="odyssea-fade-in">
                    <img src="<?php echo esc_url(ODYSSEA_PLUGIN_URL . 'assets/images/IMG_0386_1758988530094.jpg'); ?>" 
                         alt="Soins du visage et bien-être chez Odyssea Lymphea"
                         style="width: 100%; height: 500px; object-fit: cover; border-radius: var(--odyssea-radius); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);">
                </div>
                <div class="odyssea-fade-in">
                    <h2 class="odyssea-primary-text" style="font-size: 2.25rem; font-weight: 300; margin-bottom: 2rem;">
                        Notre expertise à votre service
                    </h2>
                    <div style="font-size: 1.125rem; color: hsl(30 12% 30%); line-height: 1.8;">
                        <p style="margin-bottom: 1.5rem;">
                            Kinésithérapeutes à Bruxelles depuis plus de 5 ans, nous nous sommes 
                            spécialisées dans le traitement des pathologies lymphatiques et les soins de cicatrices.
                        </p>
                        <p style="margin-bottom: 1.5rem;">
                            Formées à la technique Renata Franca, technique brésilienne à effets immédiats, 
                            nous combinons décongestionnement lymphatique, remodelage du corps et bien-être.
                        </p>
                        <p>
                            Nous nous formons régulièrement aux dernières techniques kinésithérapeutiques 
                            et aux soins esthétiques avancés.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Section 2 - Résultats visibles -->
    <section class="odyssea-section" style="padding: 6rem 0; background: linear-gradient(to bottom right, hsl(45 45% 90%), hsl(45 25% 85%), hsl(35 50% 85%), hsl(45 25% 85%), hsl(45 45% 90%));">
        <div class="odyssea-container-lg">
            <div class="odyssea-grid odyssea-grid-2" style="gap: 4rem; align-items: center;">
                <div class="odyssea-fade-in" style="order: 2;">
                    <h2 style="font-size: 2.25rem; font-weight: 300; margin-bottom: 2rem; color: hsl(30 12% 30%);">
                        Résultats visibles et durables
                    </h2>
                    <div style="font-size: 1.125rem; color: hsl(30 12% 35%); line-height: 1.8;">
                        <p style="margin-bottom: 1.5rem;">
                            Nos techniques permettent d'obtenir des résultats remarquables en drainage lymphatique, 
                            avec des effets visibles dès la première séance.
                        </p>
                        <p style="margin-bottom: 1.5rem;">
                            Que ce soit pour réduire la rétention d'eau, améliorer la circulation, 
                            ou accompagner un processus de cicatrisation, nous adaptons chaque soin à vos besoins.
                        </p>
                        <p>
                            L'épilation laser de dernière génération nous permet de traiter tous les phototypes 
                            de peau (I à VI) en toute sécurité.
                        </p>
                    </div>
                </div>
                <div class="odyssea-fade-in" style="order: 1;">
                    <img src="<?php echo esc_url(ODYSSEA_PLUGIN_URL . 'assets/images/Photoroom_20250720_101228_1759340420304.jpg'); ?>" 
                         alt="Résultats drainage lymphatique - Transformation visible des jambes"
                         style="width: 100%; height: 500px; object-fit: cover; border-radius: var(--odyssea-radius); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);">
                </div>
            </div>
        </div>
    </section>

    <!-- Section 3 - Nos spécialités -->
    <section class="odyssea-section" style="padding: 6rem 0; background: linear-gradient(to bottom right, hsl(45 25% 98%), hsl(45 45% 95%), hsl(35 50% 95%), hsl(45 25% 98%)); text-align: center;">
        <div class="odyssea-container-lg">
            <div class="odyssea-fade-in">
                <h2 class="odyssea-primary-text" style="font-size: 2.25rem; font-weight: 300; margin-bottom: 4rem;">
                    Nos spécialités
                </h2>
                <div class="odyssea-grid odyssea-grid-3" style="gap: 3rem;">
                    <div style="background: rgba(255, 255, 255, 0.8); padding: 2rem; border-radius: var(--odyssea-radius); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
                        <h3 class="odyssea-primary-text" style="font-size: 1.25rem; font-weight: 500; margin-bottom: 1.5rem;">
                            Drainage Lymphatique
                        </h3>
                        <p style="color: hsl(30 12% 30%); line-height: 1.6;">
                            Techniques conventionnelles et Renata Franca pour un drainage efficace 
                            et des résultats immédiats.
                        </p>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.8); padding: 2rem; border-radius: var(--odyssea-radius); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
                        <h3 class="odyssea-primary-text" style="font-size: 1.25rem; font-weight: 500; margin-bottom: 1.5rem;">
                            Soins de Cicatrices
                        </h3>
                        <p style="color: hsl(30 12% 30%); line-height: 1.6;">
                            Accompagnement pré et post-opératoire pour optimiser 
                            la cicatrisation et réduire les adhérences.
                        </p>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.8); padding: 2rem; border-radius: var(--odyssea-radius); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
                        <h3 class="odyssea-primary-text" style="font-size: 1.25rem; font-weight: 500; margin-bottom: 1.5rem;">
                            Épilation Laser
                        </h3>
                        <p style="color: hsl(30 12% 30%); line-height: 1.6;">
                            Technologie diode dernière génération adaptée 
                            à tous types de peau pour une épilation définitive.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Section 4 - L'art du soin esthétique -->
    <section class="odyssea-section" style="padding: 6rem 0; background: linear-gradient(to bottom right, hsl(45 25% 85%), hsl(45 45% 85%), hsl(35 50% 85%), hsl(45 45% 85%), hsl(45 25% 85%)); text-align: center;">
        <div class="odyssea-container" style="max-width: 1024px;">
            <div class="odyssea-fade-in">
                <img src="<?php echo esc_url(ODYSSEA_PLUGIN_URL . 'assets/images/WhatsApp_Image_2025-10-01_a_22.06.40_a62b9996_1760096768908.jpg'); ?>" 
                     alt="L'art du soin esthétique - Produits et soins de qualité"
                     style="width: 100%; height: auto; object-fit: contain; border-radius: var(--odyssea-radius); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15); margin-bottom: 3rem;">
            </div>
            <div style="color: hsl(30 12% 30%);">
                <p style="font-size: 1.125rem; max-width: 48rem; margin: 0 auto;">
                    Découvrez nos techniques exclusives qui allient savoir-faire traditionnel et innovations technologiques 
                    pour révéler votre beauté naturelle.
                </p>
            </div>
        </div>
    </section>

    <!-- Section À propos du cabinet -->
    <section class="odyssea-section" style="padding: 6rem 0; background: hsl(45 15% 96%);">
        <div class="odyssea-container-lg">
            <div class="odyssea-grid odyssea-grid-2" style="gap: 4rem; align-items: center;">
                <div class="odyssea-fade-in">
                    <img src="<?php echo esc_url(ODYSSEA_PLUGIN_URL . 'assets/images/IMG_3606_1758988530094.jpg'); ?>" 
                         alt="Salon de soins modernes Odyssea Lymphea - Ambiance zen et relaxante"
                         style="width: 100%; height: auto; border-radius: var(--odyssea-radius); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);">
                </div>
                <div class="odyssea-fade-in">
                    <h2 style="font-size: 2.25rem; font-weight: 300; margin-bottom: 1.5rem;">
                        Cabinet de kinésithérapie <span class="odyssea-primary-text">esthétique</span> à Waterloo
                    </h2>
                    <p style="color: var(--odyssea-muted-foreground); margin-bottom: 1.5rem; line-height: 1.6;">
                        Kinésithérapeutes à Bruxelles depuis plus de 5 ans, nous nous sommes spécialisées dans le traitement 
                        des pathologies lymphatiques et les soins de cicatrices. Nous sommes aussi formées à la technique 
                        Renata Franca, technique brésilienne à effets immédiats.
                    </p>
                    <p style="color: var(--odyssea-muted-foreground); margin-bottom: 1.5rem; line-height: 1.6;">
                        Cette technique combine à la fois la décongestionnement lymphatique, le remodelage du corps mais aussi la détente et le bien-être.
                    </p>
                    <p style="color: var(--odyssea-muted-foreground); margin-bottom: 2rem; line-height: 1.6;">
                        Nous utilisons la dernière génération de machine épilation laser diode qui nous permet de traiter 
                        la totalité des phototypes de peau de 0 à VI (peaux blanches à peaux noires).
                    </p>
                    
                    <div style="margin-top: 2rem;">
                        <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                            <span style="color: var(--odyssea-primary); margin-right: 0.75rem;">✓</span>
                            <span>Formées aux techniques Renata Franca et Vodder</span>
                        </div>
                        <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                            <span style="color: var(--odyssea-primary); margin-right: 0.75rem;">✓</span>
                            <span>Plus de 5 ans d'expérience à Bruxelles</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="color: var(--odyssea-primary); margin-right: 0.75rem;">✓</span>
                            <span>Équipement laser de dernière génération</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Call to Action -->
    <section class="odyssea-section" style="padding: 6rem 0; background: linear-gradient(to bottom right, hsl(45 25% 85%), hsl(45 45% 85%), hsl(35 50% 85%), hsl(45 45% 85%), hsl(45 25% 85%)); text-align: center;">
        <div class="odyssea-container" style="max-width: 896px;">
            <h2 style="font-size: 2.25rem; font-weight: 300; margin-bottom: 2rem;">
                Prêt à commencer votre parcours bien-être ?
            </h2>
            <p style="font-size: 1.25rem; margin-bottom: 3rem; color: hsl(30 12% 30%); line-height: 1.6;">
                Réservez votre consultation personnalisée et découvrez comment nous pouvons vous accompagner.
            </p>
            <div style="display: flex; flex-wrap: wrap; gap: 1.5rem; justify-content: center;">
                <a href="tel:+32494741777" class="odyssea-button-minimal" style="padding: 1rem 2rem; font-size: 1.125rem;">
                    Appeler maintenant
                </a>
                <a href="mailto:odyssea.lymphea@gmail.com" class="odyssea-button-outline" style="padding: 1rem 2rem; font-size: 1.125rem;">
                    Envoyer un email
                </a>
            </div>
        </div>
    </section>
</div>
