<?php
/**
 * Homepage Template
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
    <!-- Info Bar -->
    <section class="odyssea-section" style="padding-top: 3rem; padding-bottom: 2rem; border-bottom: 1px solid var(--border); background: var(--background);">
        <div class="odyssea-container">
            <div class="odyssea-grid odyssea-grid-3" style="text-align: center;">
                <div>
                    <h3 style="font-weight: 500; margin-bottom: 0.75rem;">📍 Emplacement</h3>
                    <p style="color: var(--muted-foreground); font-size: 0.875rem;"><?php echo esc_html($settings['address']); ?></p>
                </div>
                <div>
                    <h3 style="font-weight: 500; margin-bottom: 0.75rem;">🕒 Heures</h3>
                    <p style="color: var(--muted-foreground); font-size: 0.875rem; white-space: pre-line;"><?php echo esc_html($settings['hours']); ?></p>
                </div>
                <div>
                    <h3 style="font-weight: 500; margin-bottom: 0.75rem;">📞 Contact</h3>
                    <p style="color: var(--muted-foreground); font-size: 0.875rem;">
                        <a href="tel:<?php echo esc_attr($settings['phone']); ?>"><?php echo esc_html($settings['phone']); ?></a><br>
                        <a href="mailto:<?php echo esc_attr($settings['email']); ?>"><?php echo esc_html($settings['email']); ?></a>
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- Hero Section -->
    <section class="odyssea-section odyssea-section-gradient-3" style="min-height: 70vh; display: flex; align-items: center;">
        <div class="odyssea-container-lg">
            <div class="odyssea-grid odyssea-grid-2" style="align-items: center;">
                <div class="odyssea-fade-in">
                    <h1 style="font-size: clamp(1.875rem, 5vw, 3.75rem); margin-bottom: 1.5rem;">
                        L'art du soin en douceur
                    </h1>
                    <p style="font-size: clamp(1.125rem, 2vw, 1.5rem); margin-bottom: 1.5rem; color: hsl(30 12% 35%);">
                        Entre science et présence
                    </p>
                    <div style="font-size: 1.125rem; color: hsl(30 12% 35%); line-height: 1.8;">
                        <p>Chez <?php echo esc_html($settings['clinic_name']); ?>, le soin commence par l'écoute. Nous vous accompagnons avec expertise et bienveillance dans votre parcours de bien-être.</p>
                    </div>
                </div>
                <div class="odyssea-fade-in">
                    <img src="<?php echo esc_url(ODYSSEA_PLUGIN_URL . 'assets/images/hero-1.jpg'); ?>" 
                         alt="Soins professionnels Odyssea Lymphea"
                         style="width: 100%; height: auto; max-height: 500px; object-fit: cover; border-radius: var(--radius); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);">
                </div>
            </div>
        </div>
    </section>

    <!-- Services -->
    <section class="odyssea-section odyssea-section-gradient-1">
        <div class="odyssea-container-lg odyssea-text-center">
            <h2 class="odyssea-primary-text" style="margin-bottom: 3rem;">Nos spécialités</h2>
            <div class="odyssea-grid odyssea-grid-3">
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Drainage Lymphatique</h3>
                    <p>Techniques conventionnelles et Renata Franca pour un drainage efficace et des résultats immédiats.</p>
                </div>
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Soins de Cicatrices</h3>
                    <p>Accompagnement pré et post-opératoire pour optimiser la cicatrisation et réduire les adhérences.</p>
                </div>
                <div class="odyssea-service-card odyssea-fade-in">
                    <h3 class="odyssea-primary-text" style="margin-bottom: 1rem;">Épilation Laser</h3>
                    <p>Technologie diode dernière génération adaptée à tous types de peau pour une épilation définitive.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Call to Action -->
    <section class="odyssea-section odyssea-section-gradient-3 odyssea-text-center">
        <div class="odyssea-container">
            <h2 style="margin-bottom: 1.5rem;">Prêt à commencer votre parcours bien-être ?</h2>
            <p style="font-size: 1.25rem; margin-bottom: 2rem; color: hsl(30 12% 30%);">
                Réservez votre consultation personnalisée et découvrez comment nous pouvons vous accompagner.
            </p>
            <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center;">
                <a href="tel:<?php echo esc_attr($settings['phone']); ?>" class="odyssea-button-minimal">
                    Appeler maintenant
                </a>
                <a href="mailto:<?php echo esc_attr($settings['email']); ?>" class="odyssea-button-outline">
                    Envoyer un email
                </a>
            </div>
        </div>
    </section>
</div>
